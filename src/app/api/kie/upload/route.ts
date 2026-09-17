import { NextResponse } from "next/server";
import { KIE_UPLOAD_BASE } from "@/lib/kie/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Streams a browser file through to KIE's upload host and hands back the
 * public URL that the generation endpoints expect.
 */
export async function POST(request: Request) {
  const apiKey = request.headers.get("x-kie-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file in the request." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 25 MB.` },
      { status: 413 },
    );
  }

  const outbound = new FormData();
  outbound.append("file", file, file.name);
  outbound.append("uploadPath", "images/user-uploads");
  outbound.append("fileName", file.name);

  try {
    const res = await fetch(`${KIE_UPLOAD_BASE}/api/file-stream-upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outbound,
      signal: AbortSignal.timeout(120_000),
    });
    const body = (await res.json()) as {
      code?: number;
      msg?: string;
      data?: { downloadUrl?: string; fileUrl?: string };
    };
    if (!res.ok || (typeof body.code === "number" && body.code !== 200)) {
      return NextResponse.json(
        { error: body.msg || `Upload failed (HTTP ${res.status}).` },
        { status: res.ok ? 400 : res.status },
      );
    }
    const fileUrl = body.data?.downloadUrl ?? body.data?.fileUrl;
    if (!fileUrl) {
      return NextResponse.json({ error: "Upload succeeded but returned no URL." }, { status: 502 });
    }
    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 502 },
    );
  }
}
