import { NextResponse } from "next/server";
import { submit } from "@/lib/higgsfield/client";
import { isKnownEndpoint } from "@/lib/higgsfield/catalogServer";
import { failure, jsonBody, keyFrom, missingKey } from "@/lib/higgsfield/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Submits one generation and hands back its request ID and follow-up URLs. */
export async function POST(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();

  const body = await jsonBody<{ endpoint?: string; payload?: unknown; idempotencyKey?: string }>(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  if (!body.endpoint || !(await isKnownEndpoint(body.endpoint))) {
    return NextResponse.json({ error: `Unsupported endpoint: ${body.endpoint}` }, { status: 400 });
  }

  try {
    const sent = await submit(apiKey, body.endpoint, body.payload ?? {}, body.idempotencyKey);
    return NextResponse.json({ taskId: sent.requestId, statusUrl: sent.statusUrl, cancelUrl: sent.cancelUrl });
  } catch (error) {
    return failure(error);
  }
}
