/**
 * Who may write to the studio's storage: someone holding a working KIE or
 * Higgsfield key, checked against that service once and remembered for a
 * while. The site has no accounts, and without this anyone who found the
 * route could fill the bucket at the owner's expense.
 */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verify as verifyHiggsfield } from "@/lib/higgsfield/client";
import { getCredits } from "@/lib/kie/client";

const TRUST_MS = 30 * 60_000;
const trusted = new Map<string, number>();

const fingerprint = (provider: string, key: string) => createHash("sha256").update(`${provider}:${key}`).digest("hex");

export function callerKeys(request: Request): { kie?: string; higgsfield?: string } {
  const kie = request.headers.get("x-kie-key")?.trim() || undefined;
  const higgsfield = request.headers.get("x-hf-key")?.trim() || undefined;
  return { kie, higgsfield: higgsfield?.includes(":") ? higgsfield : undefined };
}

async function check(provider: "kie" | "higgsfield", key: string): Promise<boolean> {
  const id = fingerprint(provider, key);
  const until = trusted.get(id);
  if (until && until > Date.now()) return true;
  try {
    if (provider === "kie") await getCredits(key);
    else await verifyHiggsfield(key);
  } catch {
    return false;
  }
  trusted.set(id, Date.now() + TRUST_MS);
  return true;
}

/** Null when the caller may write; otherwise the response turning them away. */
export async function refuseUnlessTrusted(request: Request): Promise<NextResponse | null> {
  const { kie, higgsfield } = callerKeys(request);
  if (!kie && !higgsfield) {
    return NextResponse.json({ error: "Add your KIE or Higgsfield key first." }, { status: 401 });
  }
  if ((kie && (await check("kie", kie))) || (higgsfield && (await check("higgsfield", higgsfield)))) return null;
  return NextResponse.json({ error: "That key was not accepted." }, { status: 401 });
}
