/**
 * The Higgsfield REST API, as this studio uses it.
 *
 * Shared by the server routes (src/app/api/higgsfield/*) and by the browser
 * transport's direct mode: nothing here touches the DOM or Node APIs. The key
 * is the one the user typed ("KEY_ID:KEY_SECRET"); it is sent in the
 * Authorization header and never written anywhere.
 *
 * Docs: https://docs.higgsfield.ai/docs
 */
import catalog from "@/lib/registry/hf/generated/catalog.json";

export const HF_BASE = "https://api.higgsfield.ai";

export type TaskState = "pending" | "running" | "success" | "failed";

export interface NormalisedTask {
  state: TaskState;
  urls: string[];
  error?: string;
  progress?: string;
}

export interface Estimate {
  credits: number | null;
  usd: number | null;
}

/** A queued request, with the URLs Higgsfield gave for following it up. */
export interface Submitted {
  requestId: string;
  statusUrl?: string;
  cancelUrl?: string;
}

export interface UploadTicket {
  publicUrl: string;
  uploadUrl: string;
  headers: Record<string, string>;
}

export class HiggsfieldError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Every generation endpoint the shipped catalogue lists. The browser names the
 * endpoint it wants, so the proxy only relays catalogued ones (these, or the
 * live catalogue's; see catalogServer) rather than any path on the API.
 */
export const ENDPOINTS: ReadonlySet<string> = new Set(
  (catalog as unknown as { specs: Array<{ endpoint: string }> }).specs.map((s) => s.endpoint),
);

/** Only the file types Higgsfield's upload storage accepts. */
export const UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/wav",
  "audio/x-wav",
  "video/mp4",
]);

/** A model path on the API, and nothing that could step outside it. */
const ENDPOINT = /^\/[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/i;

function checkEndpoint(endpoint: string): void {
  if (!ENDPOINT.test(endpoint) || endpoint.includes("..")) {
    throw new HiggsfieldError(`Unsupported endpoint: ${endpoint}`, 400);
  }
}

const REQUEST_ID = /^[0-9a-f-]{8,64}$/i;

export function isRequestId(id: string): boolean {
  return REQUEST_ID.test(id);
}

/** A client-made key that lets a resent submission reach Higgsfield only once. */
const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{8,64}$/;

export function isIdempotencyKey(key: string): boolean {
  return IDEMPOTENCY_KEY.test(key);
}

/**
 * The path of a follow-up URL Higgsfield handed back, if it is one of its own
 * API's: the key goes wherever this points, so nothing else is followed.
 */
export function apiPath(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== HF_BASE) return undefined;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return undefined;
  }
}

/** The account's ceiling on requests in flight, from the error that reports it. */
export function concurrencyLimit(message: string): number | null {
  const match = /maximum number of concurrent requests\D*(\d+)/i.exec(message);
  return match ? Number(match[1]) : null;
}

export function authHeader(apiKey: string): string {
  return `Key ${apiKey.trim()}`;
}

/** Reasons Higgsfield gives as bare codes, as a person would say them. */
const CODES: Record<string, string> = {
  not_enough_credits: "Not enough credits on your Higgsfield account. Top up and try again.",
  insufficient_credits: "Not enough credits on your Higgsfield account. Top up and try again.",
};

/** A bare code ("rate_limit_exceeded") read out as a sentence. */
function readable(detail: string): string {
  if (CODES[detail]) return CODES[detail];
  if (!/^[a-z0-9]+(_[a-z0-9]+)+$/.test(detail)) return detail;
  const words = detail.replace(/_/g, " ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}.`;
}

/** FastAPI puts the reason in `detail`: a string, or a list for validation errors. */
export function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string" && detail) return readable(detail);
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((d) => {
        const item = d as { loc?: unknown[]; msg?: string };
        const where = Array.isArray(item.loc) ? item.loc.filter((p) => p !== "body").join(".") : "";
        return where ? `${where}: ${item.msg ?? "invalid"}` : item.msg ?? "Invalid request.";
      })
      .join("; ");
  }
  if (status === 401) return "Higgsfield did not accept this key. Check the key ID and secret.";
  if (status === 403) return "Not enough credits on this Higgsfield account.";
  if (status === 423) return "This model is temporarily blocked. Try again later.";
  if (status === 503) return "This model is not available right now.";
  return `Higgsfield rejected the request (HTTP ${status}).`;
}

async function request(apiKey: string, path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${HF_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(apiKey),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  // Cancellation answers 202 with an empty body.
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new HiggsfieldError(`Higgsfield returned a non-JSON response (HTTP ${res.status}).`, res.status);
    }
  }
  if (!res.ok) throw new HiggsfieldError(errorMessage(body, res.status), res.status);
  return body;
}

/**
 * Submits a generation. With an idempotency key, sending the same submission
 * again (after a timeout, or from a reloaded page) returns the request it
 * already made instead of starting a second, paid one.
 */
export async function submit(
  apiKey: string,
  endpoint: string,
  payload: unknown,
  idempotencyKey?: string,
): Promise<Submitted> {
  checkEndpoint(endpoint);
  const body = (await request(apiKey, endpoint, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
    headers: idempotencyKey && isIdempotencyKey(idempotencyKey) ? { "Idempotency-Key": idempotencyKey } : {},
  })) as { request_id?: string; status_url?: string; cancel_url?: string };
  if (!body?.request_id) throw new HiggsfieldError("Higgsfield accepted the request but returned no request ID.", 502);
  return {
    requestId: body.request_id,
    statusUrl: apiPath(body.status_url) ? body.status_url : undefined,
    cancelUrl: apiPath(body.cancel_url) ? body.cancel_url : undefined,
  };
}

/** Follows a request up at the URL Higgsfield gave for it; runs from before that are found by id. */
export async function status(apiKey: string, requestId: string, statusUrl?: string): Promise<NormalisedTask> {
  if (!isRequestId(requestId)) throw new HiggsfieldError("Invalid request ID.", 400);
  const path = apiPath(statusUrl) ?? `/requests/${encodeURIComponent(requestId)}/status`;
  return normalise(await request(apiKey, path));
}

export async function cancel(apiKey: string, requestId: string, cancelUrl?: string): Promise<void> {
  if (!isRequestId(requestId)) throw new HiggsfieldError("Invalid request ID.", 400);
  const path = apiPath(cancelUrl) ?? `/requests/${encodeURIComponent(requestId)}/cancel`;
  await request(apiKey, path, { method: "POST" });
}

/** What a run would cost, from the same parameters it would be sent with. */
export async function estimate(apiKey: string, endpoint: string, payload: unknown): Promise<Estimate> {
  checkEndpoint(endpoint);
  const body = (await request(apiKey, `/estimate${endpoint}`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  })) as { credits?: string | number; usd?: string | number };
  const num = (v: unknown) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  return { credits: num(body?.credits), usd: num(body?.usd) };
}

/**
 * Checks a key without spending anything: the status of a request that cannot
 * exist answers 401 for a bad key and 404 for a good one.
 */
export async function verify(apiKey: string): Promise<void> {
  try {
    await request(apiKey, "/requests/00000000-0000-0000-0000-000000000000/status");
  } catch (error) {
    if (error instanceof HiggsfieldError && (error.status === 401 || error.status === 403)) throw error;
    if (error instanceof HiggsfieldError && error.status === 404) return;
    throw error;
  }
}

/** Step one of an upload: a presigned URL to PUT the file to. */
export async function uploadTicket(apiKey: string, contentType: string): Promise<UploadTicket> {
  const type = contentType === "image/jpg" ? "image/jpeg" : contentType;
  if (!UPLOAD_TYPES.has(type)) throw new HiggsfieldError(unsupportedType(contentType), 415);
  const body = (await request(apiKey, "/files/generate-upload-url", {
    method: "POST",
    body: JSON.stringify({ content_type: type }),
  })) as { public_url?: string; upload_url?: string; upload_headers?: Record<string, string> };
  if (!body?.public_url || !body.upload_url) {
    throw new HiggsfieldError("Higgsfield returned no upload URL.", 502);
  }
  return {
    publicUrl: body.public_url,
    uploadUrl: body.upload_url,
    headers: body.upload_headers ?? { "Content-Type": type },
  };
}

export function unsupportedType(type: string): string {
  return `${type || "This file type"} can't be uploaded. Use JPEG, PNG, WebP or GIF images, MP4 video or WAV audio.`;
}

/* ------------------------------------------------------------------ *
 * Status normalisation
 * ------------------------------------------------------------------ */

function urlOf(node: unknown): string | undefined {
  const url = (node as { url?: unknown } | null)?.url;
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : undefined;
}

/**
 * The completed output sits under `images`, `video`, `audio`/`audios`
 * depending on what the model makes; some operations add other artifacts.
 */
function collectUrls(body: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (url: string | undefined) => {
    if (url && !out.includes(url)) out.push(url);
  };
  for (const key of ["images", "videos", "audios"]) {
    const list = body[key];
    if (Array.isArray(list)) list.forEach((item) => push(urlOf(item)));
  }
  for (const key of ["image", "video", "audio"]) push(urlOf(body[key]));
  return out;
}

export function normalise(raw: unknown): NormalisedTask {
  const body = (raw ?? {}) as Record<string, unknown>;
  const state = String(body.status ?? "");
  const urls = collectUrls(body);
  const error = typeof body.error === "string" ? body.error : undefined;
  switch (state) {
    case "completed":
      return urls.length > 0
        ? { state: "success", urls }
        : { state: "failed", urls, error: "Finished without any output." };
    case "failed":
      return { state: "failed", urls, error: error || "Generation failed. Nothing was charged." };
    case "nsfw":
      return { state: "failed", urls, error: "Blocked by content moderation. Nothing was charged." };
    case "canceled":
      return { state: "failed", urls, error: "Canceled before it started." };
    case "in_progress":
      return { state: "running", urls, progress: state };
    default:
      return { state: "pending", urls, progress: state || undefined };
  }
}
