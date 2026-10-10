import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { marketingPresets } from "@/lib/higgsfield/client";
import { failure, keyFrom, missingKey } from "@/lib/higgsfield/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pages already read, by account and cursor, for ten minutes: the presets change in Higgsfield's CMS, not by the minute. */
const TTL = 10 * 60_000;
const cache = new Map<string, { at: number; body: Awaited<ReturnType<typeof marketingPresets>> }>();

/** Marketing Studio's presets, a page at a time, read with the caller's own key. */
export async function GET(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const size = Number(url.searchParams.get("size")) || 50;
  // The key itself is never kept: only a hash of it, to keep one account's pages from another's.
  const id = `${createHash("sha256").update(apiKey).digest("hex").slice(0, 24)}:${cursor ?? ""}:${size}`;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.body);
  try {
    const body = await marketingPresets(apiKey, cursor, size);
    if (cache.size > 200) cache.clear();
    cache.set(id, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (error) {
    return failure(error);
  }
}
