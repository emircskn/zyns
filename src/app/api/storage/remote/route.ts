import { NextResponse } from "next/server";
import { HiggsfieldError, UPLOAD_TYPES, unsupportedType, uploadTicket } from "@/lib/higgsfield/client";
import { KIE_UPLOAD_BASE } from "@/lib/kie/client";
import { callerKeys } from "@/lib/storage/guard";
import { StorageError, isStorageKey, presign } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * How long a copy on each service is trusted. KIE deletes its uploads after
 * a day to three days; Higgsfield does not say, so it gets the same day.
 */
const KEEP_MS = { kie: 20 * 60 * 60_000, higgsfield: 20 * 60 * 60_000 };

/**
 * Puts a kept file where a service's models can read it: KIE fetches it
 * from a signed link itself, Higgsfield is handed the bytes through its own
 * upload flow. The caller's key for that service does the uploading.
 */
export async function POST(request: Request) {
  let body: { key?: string; provider?: string } = {};
  try {
    body = await request.json();
  } catch {
    // handled below
  }
  const key = body.key ?? "";
  const provider = body.provider === "higgsfield" ? "higgsfield" : body.provider === "kie" ? "kie" : null;
  if (!isStorageKey(key) || !provider) return NextResponse.json({ error: "Expected a kept file and a service." }, { status: 400 });
  const apiKey = callerKeys(request)[provider];
  if (!apiKey) return NextResponse.json({ error: `Add your ${provider === "kie" ? "KIE" : "Higgsfield"} key first.` }, { status: 401 });

  try {
    const signed = presign("GET", key, 15 * 60);
    if (provider === "kie") {
      const res = await fetch(`${KIE_UPLOAD_BASE}/api/file-url-upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: signed, uploadPath: "images/zyns", fileName: key.split("/").pop() }),
        signal: AbortSignal.timeout(50_000),
      });
      const out = (await res.json().catch(() => ({}))) as { code?: number; msg?: string; data?: { downloadUrl?: string; fileUrl?: string } };
      const url = out.data?.downloadUrl ?? out.data?.fileUrl;
      if (!res.ok || (typeof out.code === "number" && out.code !== 200) || !url) {
        return NextResponse.json({ error: out.msg || `KIE did not take the file (HTTP ${res.status}).` }, { status: 502 });
      }
      return NextResponse.json({ url, expiresAt: Date.now() + KEEP_MS.kie });
    }

    const source = await fetch(signed, { signal: AbortSignal.timeout(40_000) });
    if (!source.ok || !source.body) return NextResponse.json({ error: "That kept file could not be read." }, { status: 502 });
    const type = (source.headers.get("content-type") ?? "").split(";")[0];
    if (!UPLOAD_TYPES.has(type)) return NextResponse.json({ error: unsupportedType(type) }, { status: 415 });
    const ticket = await uploadTicket(apiKey, type);
    const length = source.headers.get("content-length");
    const put = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { ...ticket.headers, ...(length ? { "content-length": length } : {}) },
      body: length ? source.body : await source.arrayBuffer(),
      ...(length ? { duplex: "half" } : {}),
      signal: AbortSignal.timeout(50_000),
    } as RequestInit);
    if (!put.ok) return NextResponse.json({ error: `Higgsfield did not take the file (HTTP ${put.status}).` }, { status: 502 });
    return NextResponse.json({ url: ticket.publicUrl, expiresAt: Date.now() + KEEP_MS.higgsfield });
  } catch (error) {
    if (error instanceof StorageError || error instanceof HiggsfieldError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not hand the file over." }, { status: 502 });
  }
}
