import { NextResponse } from "next/server";
import { cancel, status } from "@/lib/higgsfield/client";
import { failure, keyFrom, missingKey } from "@/lib/higgsfield/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function idFrom(request: Request): string | null {
  return new URL(request.url).searchParams.get("id");
}

/** Where a request is: queued, running, done (with its output) or failed. */
export async function GET(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();
  const id = idFrom(request);
  if (!id) return NextResponse.json({ error: "Missing request ID." }, { status: 400 });
  try {
    return NextResponse.json(await status(apiKey, id));
  } catch (error) {
    return failure(error);
  }
}

/** Cancels a request that is still queued. */
export async function DELETE(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();
  const id = idFrom(request);
  if (!id) return NextResponse.json({ error: "Missing request ID." }, { status: 400 });
  try {
    await cancel(apiKey, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
