import { NextResponse } from "next/server";
import { KieError, getCredits } from "@/lib/kie/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-kie-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key." }, { status: 401 });
  }
  try {
    const envelope = await getCredits(apiKey);
    return NextResponse.json({ credits: envelope.data ?? null });
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
