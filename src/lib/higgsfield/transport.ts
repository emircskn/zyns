"use client";

/**
 * The browser's one door to Higgsfield.
 *
 * In the Next app every call goes through this app's own /api/higgsfield/*
 * routes, which forward the key and keep nothing. The standalone single-file
 * build has no server, so it talks to api.higgsfield.ai directly (the API
 * answers cross-origin requests) with the same client code the routes use.
 */
import * as hf from "./client";
import type { Estimate, NormalisedTask, UploadTicket } from "./client";

declare global {
  interface Window {
    __HF_DIRECT__?: boolean;
  }
}

export function isDirect(): boolean {
  return typeof window !== "undefined" && window.__HF_DIRECT__ === true;
}

const KEY_HEADER = "x-hf-key";

async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error(`Unexpected response (HTTP ${res.status}).`);
  }
}

async function route<T>(apiKey: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      [KEY_HEADER]: apiKey,
      ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = await readJson<T & { error?: string }>(res);
  if (!res.ok) throw new Error(body.error ?? `Request failed (HTTP ${res.status}).`);
  return body;
}

export interface CreatedTask {
  taskId: string;
  statusUrl?: string;
  cancelUrl?: string;
}

async function createOnce(
  apiKey: string,
  endpoint: string,
  payload: unknown,
  idempotencyKey?: string,
): Promise<CreatedTask> {
  if (isDirect()) {
    const sent = await hf.submit(apiKey, endpoint, payload, idempotencyKey);
    return { taskId: sent.requestId, statusUrl: sent.statusUrl, cancelUrl: sent.cancelUrl };
  }
  const body = await route<Partial<CreatedTask>>(apiKey, "/api/higgsfield/create", {
    method: "POST",
    body: JSON.stringify({ endpoint, payload, idempotencyKey }),
  });
  if (!body.taskId) throw new Error("Higgsfield accepted the request but returned no request ID.");
  return { taskId: body.taskId, statusUrl: body.statusUrl, cancelUrl: body.cancelUrl };
}

/** A failure that says nothing about the request itself: the answer never came back. */
function lostInTransit(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  return error instanceof Error && /took too long|could not reach|timed? ?out/i.test(error.message);
}

const RESEND_DELAYS_MS = [2_000, 4_000];

/**
 * Submits a generation. When the answer is lost on the way back the same
 * submission is sent again under the same idempotency key, so Higgsfield
 * hands back the request it already made instead of starting a second one.
 */
export async function createTask(
  apiKey: string,
  endpoint: string,
  payload: unknown,
  idempotencyKey?: string,
): Promise<CreatedTask> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await createOnce(apiKey, endpoint, payload, idempotencyKey);
    } catch (error) {
      if (!idempotencyKey || attempt >= RESEND_DELAYS_MS.length || !lostInTransit(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, RESEND_DELAYS_MS[attempt]));
    }
  }
}

function followUp(taskId: string, url?: string): string {
  const query = new URLSearchParams({ id: taskId });
  if (url) query.set("url", url);
  return `/api/higgsfield/status?${query}`;
}

export async function getTask(apiKey: string, taskId: string, statusUrl?: string): Promise<NormalisedTask> {
  if (isDirect()) return hf.status(apiKey, taskId, statusUrl);
  return route<NormalisedTask>(apiKey, followUp(taskId, statusUrl));
}

export async function cancelTask(apiKey: string, taskId: string, cancelUrl?: string): Promise<void> {
  if (isDirect()) return hf.cancel(apiKey, taskId, cancelUrl);
  await route(apiKey, followUp(taskId, cancelUrl), { method: "DELETE" });
}

export async function getEstimate(apiKey: string, endpoint: string, payload: unknown): Promise<Estimate> {
  if (isDirect()) return hf.estimate(apiKey, endpoint, payload);
  return route<Estimate>(apiKey, "/api/higgsfield/estimate", {
    method: "POST",
    body: JSON.stringify({ endpoint, payload }),
  });
}

export async function verifyKey(apiKey: string): Promise<void> {
  if (isDirect()) return hf.verify(apiKey);
  await route(apiKey, "/api/higgsfield/verify");
}

/**
 * Uploads go browser → storage: the route (or the direct client) asks
 * Higgsfield for a presigned URL, and the file is PUT there without any
 * credentials. If the storage host refuses the browser's cross-origin PUT,
 * the file is streamed through the upload route instead.
 */
export async function uploadFile(apiKey: string, file: File): Promise<string> {
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!hf.UPLOAD_TYPES.has(type)) throw new Error(hf.unsupportedType(file.type));

  const ticket = isDirect()
    ? await hf.uploadTicket(apiKey, type)
    : await route<UploadTicket>(apiKey, "/api/higgsfield/upload", {
        method: "POST",
        body: JSON.stringify({ contentType: type }),
      });

  try {
    const res = await fetch(ticket.uploadUrl, { method: "PUT", headers: ticket.headers, body: file });
    if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status}).`);
    return ticket.publicUrl;
  } catch (error) {
    // A TypeError is the browser refusing the request (CORS or network). An
    // HTTP error from storage is real and worth showing as is.
    if (isDirect() || !(error instanceof TypeError)) throw error;
  }

  const form = new FormData();
  form.append("file", file, file.name);
  const body = await route<{ url?: string }>(apiKey, "/api/higgsfield/upload", { method: "PUT", body: form });
  if (!body.url) throw new Error("Upload succeeded but returned no URL.");
  return body.url;
}
