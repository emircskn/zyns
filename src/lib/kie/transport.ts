"use client";

/**
 * The browser's one door to KIE.
 *
 * In the Next app every call goes through this app's own /api/kie/* routes.
 * The standalone single-file build has no server, so it talks to api.kie.ai
 * directly — KIE allows cross-origin calls with an Authorization header —
 * and reuses the same normalisation code the routes use.
 */
import { englishError } from "@/lib/kie/errors";
import {
  KIE_BASE,
  KIE_UPLOAD_BASE,
  extractTaskId,
  normaliseTask,
  type NormalisedTask,
  type PollKind,
} from "./client";

declare global {
  interface Window {
    __KIE_DIRECT__?: boolean;
  }
}

export function isDirect(): boolean {
  return typeof window !== "undefined" && window.__KIE_DIRECT__ === true;
}

async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    if (res.status === 413) throw new Error("That file is too large to upload.");
    throw new Error(`KIE returned a non-JSON response (HTTP ${res.status}).`);
  }
}

interface Envelope {
  code?: number;
  msg?: string;
  data?: unknown;
}

async function direct(apiKey: string, url: string, init: RequestInit = {}): Promise<Envelope> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  });
  const body = await readJson<Envelope>(res);
  if (!res.ok || (typeof body.code === "number" && body.code !== 200)) {
    throw new Error(englishError(body.msg || `KIE rejected the request (HTTP ${res.status}).`));
  }
  return body;
}

export async function createTask(
  apiKey: string,
  endpoint: string,
  payload: unknown,
): Promise<{ taskId: string }> {
  if (isDirect()) {
    const envelope = await direct(apiKey, `${KIE_BASE}${endpoint}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const taskId = extractTaskId(envelope);
    if (!taskId) throw new Error(englishError(envelope.msg || "KIE accepted the request but returned no task ID."));
    return { taskId };
  }
  const res = await fetch("/api/kie/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-kie-key": apiKey },
    body: JSON.stringify({ endpoint, payload }),
  });
  const body = await readJson<{ taskId?: string; error?: string }>(res);
  if (!res.ok || !body.taskId) throw new Error(englishError(body.error ?? `Request failed (HTTP ${res.status}).`));
  return { taskId: body.taskId };
}

const POLL_PATHS: Record<PollKind, (id: string) => string> = {
  jobs: (id) => `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(id)}`,
  veo: (id) => `/api/v1/veo/record-info?taskId=${encodeURIComponent(id)}`,
  suno: (id) => `/api/v1/generate/record-info?taskId=${encodeURIComponent(id)}`,
  mj: (id) => `/api/v1/mj/record-info?taskId=${encodeURIComponent(id)}`,
  flux: (id) => `/api/v1/flux/kontext/record-info?taskId=${encodeURIComponent(id)}`,
  aleph: (id) => `/api/v1/aleph/record-info?taskId=${encodeURIComponent(id)}`,
};

export async function getTask(apiKey: string, taskId: string, poll: PollKind): Promise<NormalisedTask> {
  if (isDirect()) {
    const envelope = await direct(apiKey, `${KIE_BASE}${POLL_PATHS[poll](taskId)}`, { method: "GET" });
    return normaliseTask(envelope);
  }
  const res = await fetch(`/api/kie/task?taskId=${encodeURIComponent(taskId)}&poll=${poll}`, {
    headers: { "x-kie-key": apiKey },
  });
  const body = await readJson<NormalisedTask & { error?: string }>(res);
  if (!res.ok) throw new Error(englishError(body.error ?? `HTTP ${res.status}`));
  return body;
}

export async function getCredits(apiKey: string): Promise<number | null> {
  if (isDirect()) {
    const envelope = await direct(apiKey, `${KIE_BASE}/api/v1/chat/credit`, { method: "GET" });
    return typeof envelope.data === "number" ? envelope.data : null;
  }
  const res = await fetch("/api/kie/credits", { headers: { "x-kie-key": apiKey } });
  const body = await readJson<{ credits?: number | null; error?: string }>(res);
  if (!res.ok) throw new Error(englishError(body.error ?? `HTTP ${res.status}`));
  return typeof body.credits === "number" ? body.credits : null;
}

/** What this app's own server route can pass on: Vercel refuses bodies over 4.5 MB. */
const SERVER_UPLOAD_LIMIT = 4 * 1024 * 1024;

async function uploadDirect(apiKey: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("uploadPath", "images/user-uploads");
  form.append("fileName", file.name);
  const envelope = (await direct(apiKey, `${KIE_UPLOAD_BASE}/api/file-stream-upload`, {
    method: "POST",
    body: form,
  })) as Envelope & { data?: { downloadUrl?: string; fileUrl?: string } };
  const url = envelope.data?.downloadUrl ?? envelope.data?.fileUrl;
  if (!url) throw new Error("Upload succeeded but returned no URL.");
  return url;
}

/**
 * Sends a file to KIE's upload host and returns its public URL.
 *
 * Straight from the browser, always: the host allows it, and the app's own
 * /api/kie/upload runs as a Vercel function, which turns away any request
 * over 4.5 MB before it starts. A phone photo is often bigger, and failed
 * as "HTTP 413". The route stays only as a second try for a small file,
 * should the direct request be blocked outright (a network or CORS error).
 */
export async function uploadFile(apiKey: string, file: File): Promise<string> {
  try {
    return await uploadDirect(apiKey, file);
  } catch (error) {
    const blocked = error instanceof TypeError;
    if (!blocked || isDirect() || file.size > SERVER_UPLOAD_LIMIT) throw error;
  }
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/kie/upload", {
    method: "POST",
    headers: { "x-kie-key": apiKey },
    body: form,
  });
  const body = await readJson<{ url?: string; error?: string }>(res);
  if (!res.ok || !body.url) throw new Error(englishError(body.error ?? "Upload failed."));
  return body.url;
}
