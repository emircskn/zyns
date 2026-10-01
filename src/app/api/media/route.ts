import { MediaFetchError, fetchPublicMedia } from "@/lib/publicMedia";

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
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") ?? "";
  let upstream: Response;
  try {
    upstream = await fetchPublicMedia(raw);
  } catch (error) {
    if (error instanceof MediaFetchError) return new Response(error.message, { status: error.status });
    throw error;
  }
  const headers = new Headers({
    "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "cache-control": "private, max-age=3600",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("content-length", length);
  return new Response(upstream.body, { headers });
}
