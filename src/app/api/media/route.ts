import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Hands a piece of generated media back from this app's own origin, for the
 * rare host that does not let a page fetch its files. Saving a file needs
 * its bytes in the page (to share it to the photo library, or download it
 * under its own name); a link alone only opens it in a new tab.
 *
 * It fetches public https media and nothing else: no addresses on this
 * machine or a private network, and only image, video or audio responses.
 */
const MEDIA = /^(image|video|audio)\//i;
const MAX_HOPS = 3;

function privateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a === "::1" || a === "::") return true;
    if (a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80")) return true;
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? privateAddress(mapped[1]) : false;
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

async function allowed(url: URL): Promise<boolean> {
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) || /(^|\.)(localhost|local|internal)$/i.test(host)) return false;
  try {
    const addresses = await lookup(host, { all: true });
    return addresses.length > 0 && addresses.every((entry) => !privateAddress(entry.address));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  let target: URL;
  try {
    target = new URL(raw ?? "");
  } catch {
    return new Response("Expected a media URL.", { status: 400 });
  }

  // Redirects are followed by hand so every hop is checked the same way.
  let upstream: Response | null = null;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (!(await allowed(target))) return new Response("That address is not allowed.", { status: 403 });
    upstream = await fetch(target, { redirect: "manual" }).catch(() => null);
    if (!upstream) return new Response("The media host did not answer.", { status: 502 });
    const next = upstream.status >= 300 && upstream.status < 400 ? upstream.headers.get("location") : null;
    if (!next) break;
    target = new URL(next, target);
    upstream = null;
  }
  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response("The media host refused the file.", { status: 502 });
  }
  const type = upstream.headers.get("content-type") ?? "";
  if (!MEDIA.test(type)) return new Response("That is not an image, video or audio file.", { status: 415 });

  const headers = new Headers({ "content-type": type, "cache-control": "private, max-age=3600" });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("content-length", length);
  return new Response(upstream.body, { headers });
}
