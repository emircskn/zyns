import { NextResponse } from "next/server";
import { ENDPOINTS, submit } from "@/lib/higgsfield/client";
import { failure, jsonBody, keyFrom, missingKey } from "@/lib/higgsfield/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Submits one generation and hands back its request ID. */
export async function POST(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();

  const body = await jsonBody<{ endpoint?: string; payload?: unknown }>(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  if (!body.endpoint || !ENDPOINTS.has(body.endpoint)) {
    return NextResponse.json({ error: `Unsupported endpoint: ${body.endpoint}` }, { status: 400 });
  }

  try {
    const taskId = await submit(apiKey, body.endpoint, body.payload ?? {});
    return NextResponse.json({ taskId });
  } catch (error) {
    return failure(error);
  }
}
