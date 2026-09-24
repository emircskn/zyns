"use client";

import { useCallback, useState } from "react";

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

/** The file behind a URL, fetched once and kept for a moment. */
function fetchFile(url: string, index = 0): Promise<File | null> {
  const known = ready.get(url);
  if (known) return Promise.resolve(known);
  const inFlight = pending.get(url);
  if (inFlight) return inFlight;
  const job = fetch(url, { mode: "cors", credentials: "omit" })
    .then(async (res) => {
      if (!res.ok) return null;
      const blob = await res.blob();
      const file = new File([blob], fileName(url, blob.type, index), { type: blob.type || "application/octet-stream" });
      remember(url, file);
      return file;
    })
    .catch(() => null)
    .finally(() => pending.delete(url));
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

export type SaveState = "idle" | "busy" | "retry";

/** A save button's state: working, or waiting for the one more tap. */
export function useSave() {
  const [state, setState] = useState<SaveState>("idle");
  const save = useCallback(async (urls: string[]) => {
    setState("busy");
    const result = await saveMedia(urls);
    setState(result === "retry" ? "retry" : "idle");
  }, []);
  const reset = useCallback(() => setState("idle"), []);
  const label = state === "busy" ? "Preparing…" : state === "retry" ? "Tap to save" : "Download";
  return { state, save, reset, label };
}
