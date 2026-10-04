"use client";

/**
 * The studio's lasting storage, from the browser: keeping a copy of a piece
 * of media, showing the copy, and handing it back to a service when a model
 * needs it. Copies are made by the server (/api/storage/*); the standalone
 * build has no server and keeps nothing.
 */
import { isDirect as hfDirect, uploadFile as hfUpload } from "@/lib/higgsfield/transport";
import { mediaKind } from "@/lib/upload";
import type { Provider } from "@/lib/registry";
import { useStudio, type RemoteUrl, type StoredCopy } from "@/store/studio";
import { isWav, toWav } from "@/lib/wav";

export const STORAGE_PATH = "/api/storage/file/";

/** Whether this build can keep copies at all. */
export function storageAvailable(): boolean {
  return typeof window !== "undefined" && !hfDirect();
}

/** The key of a lasting address, if it is one. */
export function storageKeyOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const at = url.indexOf(STORAGE_PATH);
  return at >= 0 ? url.slice(at + STORAGE_PATH.length).split("?")[0] : undefined;
}

export function storageUrl(key: string): string {
  return `${STORAGE_PATH}${key}`;
}

/** What to put in a picture or player: the kept copy once there is one, so it outlives the service's file. */
export function mediaSrc(url: string): string;
export function mediaSrc(url: string | undefined): string | undefined;
export function mediaSrc(url: string | undefined): string | undefined {
  if (!url) return url;
  const copy = useStudio.getState().copies[url];
  return copy ? storageUrl(copy.key) : url;
}

/**
 * A small picture of an image for a grid tile, `width` pixels at most: the
 * kept copy's thumbnail where there is one (made once by the server), the
 * image itself otherwise. Decoding dozens of full-size originals at once is
 * what made the pickers stutter.
 */
export function thumbSrc(url: string, width = 384): string {
  const src = mediaSrc(url);
  const key = storageKeyOf(src);
  if (!key || !storageAvailable() || !/\.(jpe?g|png|webp|gif)$/i.test(key)) return src;
  return `/api/storage/thumb/${key}?w=${width}`;
}

function keyHeaders(): Record<string, string> {
  const { apiKey, hfKey } = useStudio.getState();
  return { ...(apiKey ? { "x-kie-key": apiKey } : {}), ...(hfKey ? { "x-hf-key": hfKey } : {}) };
}

const copying = new Map<string, Promise<StoredCopy | null>>();
/** Sources that could not be copied this visit (gone already, too large), not tried again until reload. */
const failed = new Set<string>();

/**
 * Keeps a lasting copy of `url`, once. Resolves to the copy, or null when
 * there is nothing to copy with (no key, no server) or the copy failed.
 */
export function keepCopy(url: string, kind?: StoredCopy["kind"]): Promise<StoredCopy | null> {
  const existing = useStudio.getState().copies[url];
  if (existing) return Promise.resolve(existing);
  if (storageKeyOf(url)) return Promise.resolve(null);
  if (!storageAvailable() || failed.has(url) || !/^https:\/\//i.test(url)) return Promise.resolve(null);
  const headers = keyHeaders();
  if (Object.keys(headers).length === 0) return Promise.resolve(null);
  const running = copying.get(url);
  if (running) return running;
  const job = (async () => {
    try {
      const res = await fetch("/api/storage/copy", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = (await res.json().catch(() => ({}))) as { key?: string; contentType?: string; error?: string };
      if (!res.ok || !body.key) throw new Error(body.error ?? `HTTP ${res.status}`);
      const type = body.contentType ?? "";
      const copy: StoredCopy = {
        key: body.key,
        kind: kind ?? (type.startsWith("video/") ? "video" : type.startsWith("audio/") ? "audio" : mediaKind(url)),
        at: Date.now(),
      };
      useStudio.getState().setCopy(url, copy);
      return copy;
    } catch {
      failed.add(url);
      return null;
    } finally {
      copying.delete(url);
    }
  })();
  copying.set(url, job);
  return job;
}

/** A copy on a service is used until an hour before it is expected to go. */
const MARGIN_MS = 60 * 60_000;

function fresh(remote: RemoteUrl | undefined): remote is RemoteUrl {
  return !!remote && (remote.expiresAt === undefined || remote.expiresAt - Date.now() > MARGIN_MS);
}

/**
 * A URL `provider`'s models can read for this media, valid for a while yet.
 * A kept file is handed over (KIE fetches it; Higgsfield is given the bytes,
 * as WAV for sound) and the result remembered per service until it nears
 * expiry. Media without a kept copy is passed through as it is.
 */
export async function ensureRemoteUrl(url: string, provider: Provider): Promise<string> {
  const state = useStudio.getState();
  const key = storageKeyOf(url) ?? state.copies[url]?.key;
  if (!key) return url;
  const known = state.remotes[key]?.[provider];
  if (fresh(known)) return known.url;

  const kind = state.copies[url]?.kind ?? mediaKind(url);
  let remote: RemoteUrl;
  if (provider === "higgsfield" && kind === "audio") {
    // Re-encoded here, since only the browser can decode sound for free.
    const res = await fetch(`${storageUrl(key)}?download=1`);
    if (!res.ok) throw new Error("A kept sound could not be read.");
    const blob = await res.blob();
    const file = isWav(blob.type) ? new File([blob], "audio.wav", { type: "audio/wav" }) : await toWav(blob);
    remote = { url: await hfUpload(state.hfKey, file), expiresAt: Date.now() + 20 * 60 * 60_000 };
  } else {
    const res = await fetch("/api/storage/remote", {
      method: "POST",
      headers: { ...keyHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ key, provider }),
    });
    const body = (await res.json().catch(() => ({}))) as { url?: string; expiresAt?: number; error?: string };
    if (!res.ok || !body.url) throw new Error(body.error ?? "A kept file could not be handed to the model.");
    remote = { url: body.url, expiresAt: body.expiresAt };
  }
  useStudio.getState().setRemote(key, provider, remote);
  return remote.url;
}
