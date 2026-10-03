/**
 * Cloudflare R2, the studio's own store for media worth keeping, through its
 * S3-compatible API. Server only: the credentials live in the environment
 * (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET) and
 * never reach a browser. The bucket stays private; files are read through
 * short-lived signed URLs.
 */
import { createHash, createHmac } from "node:crypto";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export class StorageError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new StorageError("Storage is not set up: the R2 settings are missing on the server.", 503);
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function storageConfigured(): boolean {
  try {
    config();
    return true;
  } catch {
    return false;
  }
}

/** Object names the studio makes: a folder, a random id and the file's extension. */
const KEY = /^(media|test)\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

export function isStorageKey(key: string): boolean {
  return KEY.test(key);
}

const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data).digest();
const sha256 = (data: string) => createHash("sha256").update(data).digest("hex");
/** RFC 3986, as SigV4 wants it: encodeURIComponent leaves !'()* alone. */
const encode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * A presigned URL for one object: GET to read it, PUT to write it, valid for
 * `seconds` (at most a week). Signed with AWS Signature Version 4, which R2
 * speaks under the region "auto".
 */
export function presign(method: "GET" | "PUT" | "HEAD" | "DELETE", key: string, seconds: number): string {
  const { accountId, accessKeyId, secretAccessKey, bucket } = config();
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const path = `/${encode(bucket)}/${key.split("/").map(encode).join("/")}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(Math.max(1, Math.min(604_800, Math.round(seconds)))),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encode(k)}=${encode(query[k])}`)
    .join("&");
  const canonical = [method, path, canonicalQuery, `host:${host}`, "", "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, day), "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(toSign).digest("hex");
  return `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Writes bytes under `key`. R2 needs the length up front, so a body of unknown size is read whole first. */
export async function putObject(
  key: string,
  body: ReadableStream<Uint8Array> | ArrayBuffer,
  contentType: string,
  length?: number,
): Promise<void> {
  const sized = body instanceof ArrayBuffer || length === undefined ? await new Response(body).arrayBuffer() : body;
  const size = sized instanceof ArrayBuffer ? sized.byteLength : length!;
  const res = await fetch(presign("PUT", key, 600), {
    method: "PUT",
    headers: { "content-type": contentType, "content-length": String(size) },
    body: sized,
    // Node needs to be told a streamed body goes out as it is read.
    ...(sized instanceof ArrayBuffer ? {} : { duplex: "half" }),
    signal: AbortSignal.timeout(55_000),
  } as RequestInit);
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).match(/<Code>([^<]+)<\/Code>/)?.[1];
    throw new StorageError(`Storage refused the file${detail ? ` (${detail})` : ""} (HTTP ${res.status}).`, 502);
  }
}

export async function deleteObject(key: string): Promise<void> {
  const res = await fetch(presign("DELETE", key, 60), { method: "DELETE", signal: AbortSignal.timeout(15_000) });
  // Gone already is as good as deleted.
  if (!res.ok && res.status !== 404) throw new StorageError(`Storage would not delete the file (HTTP ${res.status}).`, 502);
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
};

export function newKey(contentType: string, folder: "media" | "test" = "media"): string {
  const type = contentType.split(";")[0].trim().toLowerCase();
  const ext = EXT[type] ?? (type.split("/")[1]?.replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin");
  return `${folder}/${crypto.randomUUID()}.${ext}`;
}
