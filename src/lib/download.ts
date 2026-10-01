"use client";

import { useCallback, useState } from "react";
import { storageUrl } from "@/lib/storage/client";
import { useStudio } from "@/store/studio";

/**
 * Saving media.
 *
 * A link to a file on another host cannot be renamed or forced to download,
 * so a plain link only opened the picture in a new tab, and on a phone the
 * browser's own Save there wrote it to Files rather than to Photos. Instead
 * the file itself is fetched (the model hosts allow it) and:
 *
 * - on a touch screen it goes to the system share sheet, whose Save Image /
 *   Save Video puts it in the photo library, as native apps do;
 * - elsewhere it is saved as a real download under its own name.
 *
 * Only when the file cannot be fetched does it fall back to opening the link.
 *
 * A share sheet must open from the tap itself. Fetching a large file can take
 * longer than the browser lets a tap count, so a file fetched too late is kept
 * here and the caller asks for one more tap, which then opens the sheet at
 * once. Pictures in the enlarged view are fetched ahead (`prefetchMedia`) so
 * the first tap usually suffices.
 */

export type SaveResult = "saved" | "cancelled" | "retry" | "opened";

const READY_LIMIT = 8;
const ready = new Map<string, File>();
const pending = new Map<string, Promise<File | null>>();

function remember(url: string, file: File) {
  ready.delete(url);
  ready.set(url, file);
  while (ready.size > READY_LIMIT) ready.delete(ready.keys().next().value as string);
}

function fileName(url: string, type: string, index: number): string {
  let name = "";
  try {
    name = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
  } catch {
    // Not a URL we can read a name from; a made-up one follows.
  }
  if (/\.[a-z0-9]{2,5}$/i.test(name)) return name;
  const ext = type.split("/")[1]?.split(/[+;]/)[0] || "bin";
  return `${name || `zyns-${Date.now()}-${index + 1}`}.${ext === "jpeg" ? "jpg" : ext}`;
}

/**
 * The bytes behind a URL, or null.
 *
 * `no-store` matters: the gallery's <img> already loaded this file without
 * an Origin, and the media hosts answer that without their CORS header and
 * let it be cached for a year. Reading through that cached copy fails the
 * CORS check, which is why pictures already on screen used to fall back to
 * a new tab. Skipping the cache sends a fresh request that gets the header.
 */
async function readBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" });
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

/**
 * The file behind a URL, fetched once and kept for a moment: straight from
 * its host, or failing that through this app's own /api/media (absent in
 * the standalone build, where it simply fails and the link opens instead).
 */
function fetchFile(url: string, index = 0): Promise<File | null> {
  const known = ready.get(url);
  if (known) return Promise.resolve(known);
  const inFlight = pending.get(url);
  if (inFlight) return inFlight;
  const job = (async () => {
    // A kept copy comes through this origin; anything else from its host,
    // then through /api/media.
    const kept = useStudio.getState().copies[url];
    const blob = kept
      ? await readBlob(`${storageUrl(kept.key)}?download=1`)
      : (await readBlob(url)) ?? (await readBlob(`/api/media?url=${encodeURIComponent(url)}`));
    if (!blob) return null;
    const file = new File([blob], fileName(url, blob.type, index), { type: blob.type || "application/octet-stream" });
    remember(url, file);
    return file;
  })().finally(() => pending.delete(url));
  pending.set(url, job);
  return job;
}

/** Start fetching a file a tap is likely to ask for. */
export function prefetchMedia(url: string | undefined | null) {
  if (url && touchScreen()) void fetchFile(url);
}

function touchScreen(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
}

function canShareFiles(files: File[]): boolean {
  try {
    return typeof navigator.share === "function" && !!navigator.canShare?.({ files });
  } catch {
    return false;
  }
}

function openLinks(urls: string[]) {
  urls.forEach((url, index) => {
    window.setTimeout(() => {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }, index * 220);
  });
}

function downloadFiles(files: File[]) {
  // Spaced apart: browsers rate-limit a burst of downloads from one gesture.
  files.forEach((file, index) => {
    window.setTimeout(() => {
      const href = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = href;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
    }, index * 220);
  });
}

async function share(files: File[], urls: string[]): Promise<SaveResult> {
  try {
    await navigator.share({ files });
    return "saved";
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "AbortError") return "cancelled";
    // The tap no longer counts: the files are kept, one more tap shares them.
    if (name === "NotAllowedError") return "retry";
    openLinks(urls);
    return "opened";
  }
}

/**
 * Save one or more pieces of media. "retry" means the files are ready but
 * the browser wants a fresh tap before it opens the share sheet.
 */
export async function saveMedia(urls: string[]): Promise<SaveResult> {
  if (urls.length === 0) return "cancelled";

  // Everything already in hand: share straight from the tap, nothing awaited
  // first, so the browser still counts it as the user's own.
  const cached = urls.map((url) => ready.get(url));
  if (touchScreen() && cached.every(Boolean) && canShareFiles(cached as File[])) {
    return share(cached as File[], urls);
  }

  const files = await Promise.all(urls.map((url, index) => fetchFile(url, index)));
  if (files.some((file) => !file)) {
    openLinks(urls);
    return "opened";
  }
  const got = files as File[];
  if (touchScreen() && canShareFiles(got)) return share(got, urls);
  downloadFiles(got);
  return "saved";
}

export type SaveState = "idle" | "busy" | "retry" | "done";

/**
 * A save button's state: working, waiting for the one more tap, or done.
 * Done stays until the button is reset (the viewer resets it when it moves
 * to another piece of media), so it answers "did I already save this?".
 */
export function useSave() {
  const [state, setState] = useState<SaveState>("idle");
  const save = useCallback(async (urls: string[]) => {
    setState("busy");
    const result = await saveMedia(urls);
    setState(result === "retry" ? "retry" : result === "saved" ? "done" : "idle");
  }, []);
  const reset = useCallback(() => setState("idle"), []);
  return { state, save, reset, label: saveLabel(state) };
}

export function saveLabel(state: SaveState): string {
  return state === "busy" ? "Preparing…" : state === "retry" ? "Tap to save" : state === "done" ? "Saved" : "Download";
}
