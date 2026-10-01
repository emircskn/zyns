"use client";

/**
 * A piece of media the studio holds on to for good: a lasting copy in its
 * own storage, plus what is known about it. Elements, recipe inputs and
 * motion clips are made of these. Where it was handed to each service
 * (`remoteUrls`) is remembered per storage key, so every holder of the same
 * file shares it; see ensureRemoteUrl.
 */
import { readMediaMeta, type MediaMeta } from "@/lib/mediaMeta";
import { ensureRemoteUrl, keepCopy, storageKeyOf, storageUrl } from "@/lib/storage/client";
import { mediaKind } from "@/lib/upload";
import type { Provider } from "@/lib/registry";
import { useStudio, type RemoteUrls } from "@/store/studio";

export interface MediaRef extends MediaMeta {
  id: string;
  kind: "image" | "video" | "audio";
  /** The lasting copy (`/api/storage/file/…`), or the original URL where none could be kept. */
  storageUrl: string;
  /** Where it came from. */
  source?: string;
  remoteUrls?: RemoteUrls;
}

/** Keeps a copy of `url` and measures it. Without storage the original URL stands in. */
export async function makeMediaRef(url: string, kind: MediaRef["kind"] = mediaKind(url)): Promise<MediaRef> {
  const copy = storageKeyOf(url) ? null : await keepCopy(url, kind);
  const stored = copy ? storageUrl(copy.key) : url;
  const meta = await readMediaMeta(url, kind).catch(() => ({}));
  return { id: crypto.randomUUID(), kind, storageUrl: stored, source: url, ...meta };
}

/** The services this file has been handed to, as remembered. */
export function remoteUrlsOf(ref: MediaRef): RemoteUrls {
  const key = storageKeyOf(ref.storageUrl);
  return (key && useStudio.getState().remotes[key]) || ref.remoteUrls || {};
}

/** A URL `provider` can read this media at; see ensureRemoteUrl. */
export function remoteUrlFor(ref: MediaRef, provider: Provider): Promise<string> {
  return ensureRemoteUrl(ref.storageUrl, provider);
}
