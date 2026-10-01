import { NextResponse } from "next/server";
import { StorageError, isStorageKey, presign } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How long the signed address a reader is sent to stays good. */
const READ_SECONDS = 60 * 60;

/**
 * A kept file at a lasting address. Pictures, players and links are sent on
 * to a short-lived signed URL on the private bucket; with `?download=1` the
 * bytes come through this origin instead, for code that needs them in the
 * page (re-encoding sound, saving a file).
 */
export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const key = (await context.params).key.join("/");
  if (!isStorageKey(key)) return NextResponse.json({ error: "No such file." }, { status: 404 });

  let signed: string;
  try {
    signed = presign("GET", key, READ_SECONDS);
  } catch (error) {
    const status = error instanceof StorageError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Storage failed." }, { status });
  }

  if (new URL(request.url).searchParams.get("download") !== "1") {
    return new NextResponse(null, {
      status: 302,
      // Cached for a little less than the signature lasts.
      headers: { location: signed, "cache-control": `private, max-age=${READ_SECONDS - 300}` },
    });
  }

  const range = request.headers.get("range");
  const upstream = await fetch(signed, { headers: range ? { range } : {} }).catch(() => null);
  if (!upstream || !upstream.body || (upstream.status !== 200 && upstream.status !== 206)) {
    return NextResponse.json({ error: "That file could not be read." }, { status: upstream?.status === 404 ? 404 : 502 });
  }
  const headers = new Headers({ "cache-control": "private, max-age=3600" });
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "etag"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
