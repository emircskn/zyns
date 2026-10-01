/**
 * Fetching media from an address someone else supplied, for the server: public
 * https hosts only (no addresses on this machine or a private network), with
 * redirects followed by hand so every hop is checked the same way, and only
 * image, video or audio answers accepted.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MEDIA = /^(image|video|audio)\//i;
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

export async function allowed(url: URL): Promise<boolean> {
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


export class MediaFetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** The media at a public address, or a MediaFetchError saying why not. */
export async function fetchPublicMedia(raw: string, init: RequestInit = {}): Promise<Response> {
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    throw new MediaFetchError("Expected a media URL.", 400);
  }
  let upstream: Response | null = null;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (!(await allowed(target))) throw new MediaFetchError("That address is not allowed.", 403);
    upstream = await fetch(target, { ...init, redirect: "manual" }).catch(() => null);
    if (!upstream) throw new MediaFetchError("The media host did not answer.", 502);
    const next = upstream.status >= 300 && upstream.status < 400 ? upstream.headers.get("location") : null;
    if (!next) break;
    target = new URL(next, target);
    upstream = null;
  }
  if (!upstream || !upstream.ok || !upstream.body) throw new MediaFetchError("The media host refused the file.", 502);
  if (!MEDIA.test(upstream.headers.get("content-type") ?? "")) {
    throw new MediaFetchError("That is not an image, video or audio file.", 415);
  }
  return upstream;
}
