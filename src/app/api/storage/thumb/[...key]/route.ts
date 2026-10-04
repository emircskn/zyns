import { NextResponse } from "next/server";
import sharp from "sharp";
import { StorageError, THUMB_WIDTHS, isStorageKey, presign, putObject, thumbKey as thumbKeyOf } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PICTURE = /\.(jpe?g|png|webp|gif)$/i;
/** Kept files never change (each has its own random name), so neither does a picture of one. */
const FOREVER = "public, max-age=31536000, s-maxage=31536000, immutable";

/**
 * A small picture of a kept image, for the grids and pickers that show many
 * at once: decoding every full-size original (4K renders, phone photos) is
 * what made them stutter. Made once with sharp, kept beside the original in
 * storage under thumbs/, and cached for good by the browser and the CDN.
 * Anything it cannot make a picture of is sent on to the original.
 */
export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const key = (await context.params).key.join("/");
  const original = new URL(`/api/storage/file/${key}`, request.url);
  if (!isStorageKey(key) || !PICTURE.test(key)) return NextResponse.redirect(original, 302);
  const asked = Number(new URL(request.url).searchParams.get("w")) || 384;
  // Any other width is rounded up to one of these, so each image has only a few.
  const width = THUMB_WIDTHS.find((w) => w >= asked) ?? THUMB_WIDTHS[THUMB_WIDTHS.length - 1];
  const thumbKey = thumbKeyOf(key, width);

  try {
    // Made before: straight from storage.
    const kept = await fetch(presign("GET", thumbKey, 300), { signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (kept?.ok && kept.body) {
      return new NextResponse(kept.body, { headers: { "content-type": "image/webp", "cache-control": FOREVER } });
    }
    const source = await fetch(presign("GET", key, 300), { signal: AbortSignal.timeout(30_000) });
    if (!source.ok) return NextResponse.redirect(original, 302);
    const bytes = await sharp(Buffer.from(await source.arrayBuffer()), { animated: false, limitInputPixels: 120_000_000 })
      .rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 74 })
      .toBuffer();
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    // Kept for next time; a failure here only means it is made again.
    await putObject(thumbKey, body.slice(0), "image/webp").catch(() => undefined);
    return new NextResponse(body, { headers: { "content-type": "image/webp", "cache-control": FOREVER } });
  } catch (error) {
    // No storage here (a local build), or a file sharp cannot read: the original still shows.
    if (error instanceof StorageError || error instanceof Error) return NextResponse.redirect(original, 302);
    throw error;
  }
}
