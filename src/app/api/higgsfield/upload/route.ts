import { NextResponse } from "next/server";
import { UPLOAD_TYPES, unsupportedType, uploadTicket } from "@/lib/higgsfield/client";
import { failure, jsonBody, keyFrom, missingKey } from "@/lib/higgsfield/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: a presigned storage URL for the browser to PUT the file to. The file
 * itself never passes through this server on that path.
 */
export async function POST(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();
  const body = await jsonBody<{ contentType?: string }>(request);
  if (!body?.contentType) return NextResponse.json({ error: "Missing content type." }, { status: 400 });
  try {
    return NextResponse.json(await uploadTicket(apiKey, body.contentType));
  } catch (error) {
    return failure(error);
  }
}

// Serverless hosts cap request bodies (Vercel at 4.5 MB), which is why the
// direct PUT above is the normal path and this one only the fallback.
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * PUT: the fallback when storage refuses the browser's cross-origin PUT. The
 * file comes here and is forwarded to the presigned URL.
 */
export async function PUT(request: Request) {
  const apiKey = keyFrom(request);
  if (!apiKey) return missingKey();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file in the request." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 25 MB.` },
      { status: 413 },
    );
  }
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!UPLOAD_TYPES.has(type)) return NextResponse.json({ error: unsupportedType(file.type) }, { status: 415 });

  try {
    const ticket = await uploadTicket(apiKey, type);
    const res = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: ticket.headers,
      body: Buffer.from(await file.arrayBuffer()),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) return NextResponse.json({ error: `Upload failed (HTTP ${res.status}).` }, { status: 502 });
    return NextResponse.json({ url: ticket.publicUrl });
  } catch (error) {
    return failure(error);
  }
}
