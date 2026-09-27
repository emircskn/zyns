import { NextResponse } from "next/server";
import { verify } from "@/lib/higgsfield/client";
import { failure, keyFrom, missingKey } from "@/lib/higgsfield/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Checks a key ID and secret without spending credits. */
export async function GET(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();
  try {
    await verify(apiKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
