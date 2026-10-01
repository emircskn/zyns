import { NextResponse } from "next/server";
import { MediaFetchError, fetchPublicMedia } from "@/lib/publicMedia";
import { refuseUnlessTrusted } from "@/lib/storage/guard";
import { StorageError, newKey, putObject } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Larger files are not worth keeping a copy of on the free tier. */
const MAX_BYTES = 300 * 1024 * 1024;

/**
 * Keeps a lasting copy of a piece of media that lives somewhere temporary
 * (an upload on KIE, a result on Higgsfield): the server fetches it and
 * writes it to the studio's storage, and hands back where it now lives.
 */
export async function POST(request: Request) {
  const refused = await refuseUnlessTrusted(request);
  if (refused) return refused;

  let source: string | undefined;
  try {
    source = ((await request.json()) as { url?: string }).url;
  } catch {
    // handled below
  }
  if (!source) return NextResponse.json({ error: "Expected the media URL to keep." }, { status: 400 });

  try {
    const upstream = await fetchPublicMedia(source, { signal: AbortSignal.timeout(40_000) });
    const type = (upstream.headers.get("content-type") ?? "application/octet-stream").split(";")[0];
    const length = Number(upstream.headers.get("content-length")) || undefined;
    if (length && length > MAX_BYTES) {
      return NextResponse.json({ error: "That file is too large to keep a copy of." }, { status: 413 });
    }
    const key = newKey(type);
    await putObject(key, upstream.body!, type, length);
    return NextResponse.json({ key, url: `/api/storage/file/${key}`, contentType: type, size: length ?? null });
  } catch (error) {
    if (error instanceof MediaFetchError || error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const timeout = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { error: timeout ? "The file took too long to copy." : "Could not keep a copy of that file." },
      { status: timeout ? 504 : 502 },
    );
  }
}
