import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { fromHtml, fromShopifyJson } from "@/lib/marketing/productPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT = 8_000;
const MAX_BYTES = 3_000_000;
const MAX_HOPS = 3;

/** A few looks a minute per caller is plenty for pasting product links. */
const WINDOW = 60_000;
const LIMIT = 20;
const seen = new Map<string, number[]>();

function limited(request: Request): boolean {
  const who = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (seen.get(who) ?? []).filter((t) => now - t < WINDOW);
  recent.push(now);
  seen.set(who, recent);
  if (seen.size > 5000) seen.clear();
  return recent.length > LIMIT;
}

/** Addresses only reachable from inside a network, which this route must never be made to fetch. */
function privateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  if (mapped) return privateAddress(mapped[1]);
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v6);
}

async function safeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Problem("That is not a link.", 400);
  }
  if (!/^https?:$/.test(url.protocol)) throw new Problem("Only http and https links can be read.", 400);
  if (url.username || url.password) throw new Problem("Links with a user name or password are not read.", 400);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^localhost$|\.local$|\.internal$/i.test(host)) throw new Problem("That address is not on the public internet.", 400);
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new Problem("That site could not be found.", 400);
  if (addresses.some((a) => privateAddress(a.address))) throw new Problem("That address is not on the public internet.", 400);
  return url;
}

class Problem extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** GET with every redirect checked like the first address, a time limit and a size limit. */
async function fetchPublic(raw: string, accept: string): Promise<{ url: string; status: number; type: string; text: string }> {
  let url = await safeUrl(raw);
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { Accept: accept, "User-Agent": "Mozilla/5.0 (compatible; ZYNS product reader)" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await safeUrl(new URL(res.headers.get("location")!, url).href);
      continue;
    }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    return { url: url.href, status: res.status, type: res.headers.get("content-type") ?? "", text };
  }
  throw new Problem("That link redirects too many times.", 400);
}

/**
 * Reads a product page for Marketing Studio's Product Link: its name,
 * pictures, description and price. Shopify's `.json` first, then the page.
 */
export async function GET(request: Request) {
  if (limited(request)) return NextResponse.json({ error: "Too many links at once. Wait a minute and try again." }, { status: 429 });
  const raw = new URL(request.url).searchParams.get("url")?.trim();
  if (!raw) return NextResponse.json({ error: "Paste a product link." }, { status: 400 });
  let page: URL;
  try {
    page = new URL(raw);
  } catch {
    return NextResponse.json({ error: "That is not a link." }, { status: 400 });
  }
  try {
    // A Shopify store gives its product as JSON at the same address plus .json.
    if (/\/products\/[^/]+\/?$/.test(page.pathname)) {
      const json = new URL(page.href);
      json.pathname = `${json.pathname.replace(/\/$/, "")}.json`;
      json.search = "";
      const got = await fetchPublic(json.href, "application/json").catch(() => null);
      if (got && got.status === 200 && /json/.test(got.type)) {
        try {
          const product = fromShopifyJson(JSON.parse(got.text), raw);
          if (product && product.images.length > 0) return NextResponse.json(product);
        } catch {
          // Not JSON after all: read the page instead.
        }
      }
    }
    const got = await fetchPublic(raw, "text/html,application/xhtml+xml");
    if (got.status >= 400) return NextResponse.json({ error: `The site answered ${got.status}.` }, { status: 502 });
    const product = fromHtml(got.text, got.url);
    if (!product) return NextResponse.json({ error: "No product found on that page." }, { status: 422 });
    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Problem) return NextResponse.json({ error: error.message }, { status: error.status });
    const timeout = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json({ error: timeout ? "That site took too long to answer." : "That page could not be read." }, { status: timeout ? 504 : 502 });
  }
}
