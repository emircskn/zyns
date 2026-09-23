/**
 * Thin server-side wrapper around the KIE AI REST API.
 *
 * The browser never talks to api.kie.ai directly: requests go through this
 * app's own /api/kie/* routes, which forward the key the user typed. Nothing
 * is written to disk or kept between requests.
 */

import { englishError } from "./errors";

export const KIE_BASE = "https://api.kie.ai";
export const KIE_UPLOAD_BASE = "https://kieai.redpandaai.co";

export type PollKind = "jobs" | "veo" | "suno" | "mj" | "flux" | "aleph";

export type TaskState = "pending" | "running" | "success" | "failed";

export interface NormalisedTask {
  state: TaskState;
  urls: string[];
  error?: string;
  progress?: string;
  /** What KIE charged for the task, once it says (jobs/* tasks report it). */
  credits?: number;
  raw: unknown;
}

export class KieError extends Error {
  status: number;
  code?: number;
  constructor(message: string, status: number, code?: number) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface KieEnvelope {
  code?: number;
  msg?: string;
  message?: string;
  data?: unknown;
}

async function request(
  apiKey: string,
  path: string,
  init: RequestInit,
): Promise<KieEnvelope> {
  const res = await fetch(`${KIE_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });

  let body: KieEnvelope;
  try {
    body = (await res.json()) as KieEnvelope;
  } catch {
    throw new KieError(`KIE returned a non-JSON response (HTTP ${res.status}).`, res.status);
  }

  const message = englishError(body.msg || body.message);
  if (!res.ok) {
    throw new KieError(message || `KIE rejected the request (HTTP ${res.status}).`, res.status, body.code);
  }
  if (typeof body.code === "number" && body.code !== 200) {
    throw new KieError(message || `KIE returned code ${body.code}.`, 400, body.code);
  }
  return body;
}

export function createTask(apiKey: string, endpoint: string, payload: unknown) {
  return request(apiKey, endpoint, { method: "POST", body: JSON.stringify(payload) });
}

export function getCredits(apiKey: string) {
  return request(apiKey, "/api/v1/chat/credit", { method: "GET" });
}

const POLL_PATHS: Record<PollKind, (taskId: string) => string> = {
  jobs: (id) => `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(id)}`,
  veo: (id) => `/api/v1/veo/record-info?taskId=${encodeURIComponent(id)}`,
  suno: (id) => `/api/v1/generate/record-info?taskId=${encodeURIComponent(id)}`,
  mj: (id) => `/api/v1/mj/record-info?taskId=${encodeURIComponent(id)}`,
  flux: (id) => `/api/v1/flux/kontext/record-info?taskId=${encodeURIComponent(id)}`,
  aleph: (id) => `/api/v1/aleph/record-info?taskId=${encodeURIComponent(id)}`,
};

export async function getTask(apiKey: string, taskId: string, poll: PollKind) {
  return request(apiKey, POLL_PATHS[poll](taskId), { method: "GET" });
}

export function veo1080p(apiKey: string, taskId: string, index?: number) {
  const params = new URLSearchParams({ taskId });
  if (index !== undefined) params.set("index", String(index));
  return request(apiKey, `/api/v1/veo/get-1080p-video?${params}`, { method: "GET" });
}

/* ------------------------------------------------------------------ *
 * Result normalisation
 *
 * Each API family reports progress differently (`state`, `successFlag`,
 * `status`) and buries result URLs at a different depth, sometimes inside a
 * JSON string. Rather than hard-code six shapes, derive the state from the
 * fields that exist and collect media URLs from anywhere in the payload.
 * ------------------------------------------------------------------ */

const MEDIA_EXT = /\.(png|jpe?g|webp|gif|bmp|svg|mp4|mov|webm|m4v|mp3|wav|ogg|m4a|flac|aac)(\?|$)/i;
const URL_KEY = /(url|uri)s?$/i;

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function collectUrls(node: unknown, key: string, out: string[], depth = 0): void {
  if (depth > 8 || node === null || node === undefined) return;
  const value = parseMaybeJson(node);

  if (typeof value === "string") {
    if (!/^https?:\/\//i.test(value)) return;
    if (MEDIA_EXT.test(value) || URL_KEY.test(key)) {
      if (!out.includes(value)) out.push(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, key, out, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      collectUrls(v, k, out, depth + 1);
    }
  }
}

const FAILED_SUNO = /FAILED|ERROR|SENSITIVE/i;

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") return obj[key];
  }
  return undefined;
}

/**
 * Fields that echo the request back rather than report a result. jobs/*
 * returns the whole create body as `param`, ahead of `resultJson`, so an
 * image-to-image task listed its reference image as its first "result": the
 * pending tile showed the upload instead of the loader, and a finished one
 * could open on the upload instead of the output.
 */
const REQUEST_ECHO = /^(param|paramJson|params|request|requestParam|input|callBackUrl)$/i;

export function normaliseTask(envelope: KieEnvelope): NormalisedTask {
  const data = (envelope.data ?? {}) as Record<string, unknown>;
  const urls: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (!REQUEST_ECHO.test(key)) collectUrls(value, key, urls);
  }

  const error = englishError(pick(data, "failMsg", "errorMessage", "error_message", "msg") as string | undefined);
  const failCode = pick(data, "failCode", "errorCode");
  const spent = Number(data.creditsConsumed);
  const credits = data.creditsConsumed !== undefined && data.creditsConsumed !== null && Number.isFinite(spent) ? spent : undefined;

  // jobs/* uses a `state` string.
  const state = data.state as string | undefined;
  if (state) {
    if (state === "success") return { state: "success", urls, credits, raw: envelope };
    if (state === "fail") return { state: "failed", urls, error: error || `Failed (${failCode ?? "unknown"})`, raw: envelope };
    return { state: state === "waiting" || state === "queuing" ? "pending" : "running", urls, progress: state, raw: envelope };
  }

  // Suno reports a lifecycle string.
  const status = data.status as string | undefined;
  if (status) {
    if (status === "SUCCESS") return { state: "success", urls, raw: envelope };
    if (FAILED_SUNO.test(status)) return { state: "failed", urls, error: error || status, raw: envelope };
    // FIRST_SUCCESS / TEXT_SUCCESS already carry partial results.
    return { state: urls.length > 0 ? "running" : "pending", urls, progress: status, raw: envelope };
  }

  // veo / mj / flux / aleph use a numeric successFlag.
  const flag = pick(data, "successFlag", "success_flag");
  if (flag !== undefined) {
    const n = Number(flag);
    if (n === 1) return { state: "success", urls, raw: envelope };
    if (n >= 2) return { state: "failed", urls, error: error || `Failed (flag ${n})`, raw: envelope };
    return { state: urls.length > 0 ? "running" : "pending", urls, raw: envelope };
  }

  if (urls.length > 0) return { state: "success", urls, raw: envelope };
  if (error) return { state: "failed", urls, error, raw: envelope };
  return { state: "pending", urls, raw: envelope };
}

export function extractTaskId(envelope: KieEnvelope): string | undefined {
  const data = envelope.data as Record<string, unknown> | undefined;
  if (!data) return undefined;
  const id = pick(data, "taskId", "task_id", "id", "recordId");
  return typeof id === "string" ? id : undefined;
}
