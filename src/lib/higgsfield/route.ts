/**
 * Shared plumbing for the /api/higgsfield/* proxy routes.
 *
 * The routes never log, store or echo the key: it is read from the request
 * header, used for the one upstream call and dropped with the request.
 */
import { NextResponse } from "next/server";
import { HiggsfieldError } from "./client";

export function keyFrom(request: Request): string | null {
  const key = request.headers.get("x-hf-key")?.trim();
  // "KEY_ID:KEY_SECRET", as Higgsfield Console issues them.
  return key && key.includes(":") ? key : null;
}

export function missingKey() {
  return NextResponse.json({ error: "Add your Higgsfield key ID and secret first." }, { status: 401 });
}

export function failure(error: unknown) {
  if (error instanceof HiggsfieldError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const timeout = error instanceof Error && error.name === "TimeoutError";
  return NextResponse.json(
    { error: timeout ? "Higgsfield took too long to answer." : "Could not reach Higgsfield." },
    { status: timeout ? 504 : 502 },
  );
}

export async function jsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
