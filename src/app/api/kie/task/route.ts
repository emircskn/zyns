import { NextResponse } from "next/server";
import { KieError, getTask, normaliseTask, veo1080p, type PollKind } from "@/lib/kie/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_KINDS: PollKind[] = ["jobs", "veo", "suno", "mj", "flux", "aleph"];

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-kie-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key." }, { status: 401 });
  }

  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId");
  const poll = url.searchParams.get("poll") as PollKind | null;

  if (!taskId) return NextResponse.json({ error: "Missing taskId." }, { status: 400 });
  if (!poll || !POLL_KINDS.includes(poll)) {
    return NextResponse.json({ error: `Unknown poll kind: ${poll}` }, { status: 400 });
  }

  try {
    if (url.searchParams.get("upgrade") === "1080p") {
      const index = url.searchParams.get("index");
      const envelope = await veo1080p(apiKey, taskId, index ? Number(index) : undefined);
      return NextResponse.json(normaliseTask(envelope));
    }
    const envelope = await getTask(apiKey, taskId, poll);
    return NextResponse.json(normaliseTask(envelope));
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
