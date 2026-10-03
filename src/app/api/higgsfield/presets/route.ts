import { NextResponse } from "next/server";
import { restylePresets } from "@/lib/higgsfield/client";
import { failure, keyFrom, missingKey } from "@/lib/higgsfield/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Genjutsu Restyle's styles, read with the caller's own key. */
export async function GET(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();
  try {
    return NextResponse.json({ items: await restylePresets(apiKey) });
  } catch (error) {
    return failure(error);
  }
}
