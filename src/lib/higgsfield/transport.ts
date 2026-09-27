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

export async function createTask(apiKey: string, endpoint: string, payload: unknown): Promise<{ taskId: string }> {
  if (isDirect()) return { taskId: await hf.submit(apiKey, endpoint, payload) };
  const body = await route<{ taskId?: string }>(apiKey, "/api/higgsfield/create", {
    method: "POST",
    body: JSON.stringify({ endpoint, payload }),
  });
  if (!body.taskId) throw new Error("Higgsfield accepted the request but returned no request ID.");
  return { taskId: body.taskId };
}

export async function getTask(apiKey: string, taskId: string): Promise<NormalisedTask> {
  if (isDirect()) return hf.status(apiKey, taskId);
  return route<NormalisedTask>(apiKey, `/api/higgsfield/status?id=${encodeURIComponent(taskId)}`);
}

export async function cancelTask(apiKey: string, taskId: string): Promise<void> {
  if (isDirect()) return hf.cancel(apiKey, taskId);
  await route(apiKey, `/api/higgsfield/status?id=${encodeURIComponent(taskId)}`, { method: "DELETE" });
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
