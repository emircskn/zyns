import { NextResponse } from "next/server";
import { createSoul, listSouls, soulStatus, type SoulVersion } from "@/lib/higgsfield/client";
import { failure, jsonBody, keyFrom, missingKey } from "@/lib/higgsfield/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One Soul ID's training state (?id=), or the account's Soul IDs. */
export async function GET(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();
  const id = new URL(request.url).searchParams.get("id");
  try {
    return NextResponse.json(id ? await soulStatus(apiKey, id) : { items: await listSouls(apiKey) });
  } catch (error) {
    return failure(error);
  }
}

/** Starts training a Soul ID from pictures already at public URLs. */
export async function POST(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();
  const body = await jsonBody<{ name?: string; version?: SoulVersion; images?: string[] }>(request);
  if (!body || !Array.isArray(body.images) || !body.version) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  try {
    return NextResponse.json(await createSoul(apiKey, body.name ?? "", body.version, body.images));
  } catch (error) {
    return failure(error);
  }
}
