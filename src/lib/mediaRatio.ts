"use client";

import { useSyncExternalStore } from "react";

/**
 * The real shape of each piece of media, once it has loaded.
 *
 * A run only knows the shape it asked for ("16 / 9", or nothing at all for
 * "Auto"), and an upload knows none. The galleries lay media out in rows by
 * shape, so each <img> and <video> reports its natural size here when it
 * loads, and the rows settle on the true proportions. What was measured is
 * remembered in this browser, so a gallery opens in its final layout the
 * next time instead of settling again.
 */
const KEY = "zyns-media-ratios";
const LIMIT = 800;

const ratios = new Map<string, number>();
const listeners = new Set<() => void>();
let version = 0;

try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Array<[string, number]>;
  for (const [url, ratio] of saved) if (url && ratio > 0) ratios.set(url, ratio);
} catch {
  // No storage (private mode, a preview): measure afresh each visit.
}

let saving = 0;
function save() {
  if (saving) return;
  saving = window.setTimeout(() => {
    saving = 0;
    try {
      const entries = [...ratios].slice(-LIMIT);
      localStorage.setItem(KEY, JSON.stringify(entries));
    } catch {
      // Storage full or blocked: the in-memory copy still serves this visit.
    }
  }, 400);
}

/** Record what a loaded image or video measured. */
export function noteRatio(url: string | undefined, width: number, height: number) {
  if (!url || !(width > 0) || !(height > 0)) return;
  const ratio = width / height;
  const known = ratios.get(url);
  if (known && Math.abs(known - ratio) < 0.005) return;
  ratios.delete(url);
  ratios.set(url, ratio);
  version++;
  save();
  listeners.forEach((listener) => listener());
}

export function ratioOf(url: string | undefined): number | undefined {
  return url ? ratios.get(url) : undefined;
}

/** Re-renders the caller whenever a new shape is measured. */
export function useMediaRatios(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
    () => 0,
  );
}

/** "16 / 9" → 1.777…; anything unreadable → undefined. */
export function parseRatio(css: string | undefined): number | undefined {
  const match = css?.match(/^\s*([\d.]+)\s*\/\s*([\d.]+)\s*$/);
  if (!match) return undefined;
  const ratio = Number(match[1]) / Number(match[2]);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined;
}
