import { NextResponse } from "next/server";
import { soulStyles } from "@/lib/higgsfield/client";
import { failure, keyFrom, missingKey } from "@/lib/higgsfield/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Soul 2.0's styles, read with the caller's own key. */
export async function GET(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();
  try {
    return NextResponse.json({ items: await soulStyles(apiKey) });
  } catch (error) {
    return failure(error);
  }
}
