/**
 * The studio's library as one document in its own storage, so every device
 * that holds the owner's key sees the same runs, uploads, projects and
 * elements. Read and written only by someone holding a working key; the
 * document is named after a hash of that key and never served by the file
 * route.
 */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { callerKeys, refuseUnlessTrusted } from "@/lib/storage/guard";
import { presign, storageConfigured } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel turns away request bodies past 4.5 MB; stop short of it with a clear word. */
const MAX_BYTES = 4_000_000;

/** One library per key: the KIE key where there is one, else the Higgsfield key. */
function libraryKey(request: Request): string {
  const { kie, higgsfield } = callerKeys(request);
  const who = kie ? `kie:${kie}` : `higgsfield:${higgsfield}`;
  return `library/${createHash("sha256").update(`zyns-library:${who}`).digest("hex")}.json`;
}

export async function GET(request: Request) {
  if (!storageConfigured()) return NextResponse.json({ error: "Storage is not set up." }, { status: 503 });
  const refusal = await refuseUnlessTrusted(request);
  if (refusal) return refusal;
  const res = await fetch(presign("GET", libraryKey(request), 60), { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (res.status === 404) return NextResponse.json({ doc: null, etag: null }, { headers: { "Cache-Control": "no-store" } });
  if (!res.ok) return NextResponse.json({ error: `Storage answered ${res.status}.` }, { status: 502 });
  const doc = await res.json().catch(() => null);
  return NextResponse.json({ doc, etag: res.headers.get("etag") }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!storageConfigured()) return NextResponse.json({ error: "Storage is not set up." }, { status: 503 });
  const refusal = await refuseUnlessTrusted(request);
  if (refusal) return refusal;
  const body = await request.text();
  if (body.length > MAX_BYTES) return NextResponse.json({ error: "The library is too large to keep in one piece." }, { status: 413 });
  try {
    JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Not a library." }, { status: 400 });
  }
  // Written only over the version the device last read, so two devices
  // saving at once cannot drop each other's changes: the second is told to
  // read again and merge.
  const etag = request.headers.get("x-if-match");
  const res = await fetch(presign("PUT", libraryKey(request), 60), {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...(etag ? { "if-match": etag } : { "if-none-match": "*" }),
    },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 412) return NextResponse.json({ conflict: true }, { status: 409 });
  if (!res.ok) return NextResponse.json({ error: `Storage answered ${res.status}.` }, { status: 502 });
  return NextResponse.json({ etag: res.headers.get("etag") });
}
