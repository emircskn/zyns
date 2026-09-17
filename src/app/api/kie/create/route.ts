import { NextResponse } from "next/server";
import { KieError, createTask, extractTaskId } from "@/lib/kie/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Only the endpoints the registry actually targets may be proxied — the
 * endpoint arrives from the browser, so an open list would turn this route
 * into a general relay for the caller's API key.
 */
const ALLOWED_ENDPOINTS = new Set([
  "/api/v1/jobs/createTask",
  "/api/v1/veo/generate",
  "/api/v1/generate",
  "/api/v1/mj/generate",
  "/api/v1/flux/kontext/generate",
  "/api/v1/aleph/generate",
  "/api/v1/omni/audio/create",
  "/api/v1/omni/character/create",
]);

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-kie-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key." }, { status: 401 });
  }

  let body: { endpoint?: string; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { endpoint, payload } = body;
  if (!endpoint || !ALLOWED_ENDPOINTS.has(endpoint)) {
    return NextResponse.json({ error: `Unsupported endpoint: ${endpoint}` }, { status: 400 });
  }

  try {
    const envelope = await createTask(apiKey, endpoint, payload ?? {});
    const taskId = extractTaskId(envelope);
    if (!taskId) {
      return NextResponse.json(
        { error: envelope.msg || "KIE accepted the request but returned no task ID.", raw: envelope },
        { status: 502 },
      );
    }
    return NextResponse.json({ taskId, raw: envelope });
  } catch (error) {
    if (error instanceof KieError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 502 },
    );
  }
}
