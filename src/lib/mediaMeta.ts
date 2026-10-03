"use client";

/** What a piece of media measures: its frame (pictures and clips) and its length (clips and sound). */
export interface MediaMeta {
  width?: number;
  height?: number;
  durationSec?: number;
}

const TIMEOUT_MS = 15_000;

/**
 * Reads a file's or URL's size and length in the browser, the way a page
 * shows it: an <img> for pictures, a <video> or <audio> for the rest. A model's
 * limits (a 4–30 second clip) are then checked against these.
 */
export function readMediaMeta(source: Blob | string, kind: "image" | "video" | "audio"): Promise<MediaMeta> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  const done = () => {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  };
  return new Promise<MediaMeta>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      done();
      reject(new Error("The file took too long to read."));
    }, TIMEOUT_MS);
    const finish = (meta: MediaMeta | null) => {
      window.clearTimeout(timer);
      done();
      if (meta) resolve(meta);
      else reject(new Error("This file could not be read."));
    };
    if (kind === "image") {
      const img = new Image();
      img.onload = () => finish({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => finish(null);
      img.src = url;
      return;
    }
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.muted = true;
    const report = () => {
      const video = el as HTMLVideoElement;
      finish({
        durationSec: Number.isFinite(el.duration) && el.duration > 0 ? el.duration : undefined,
        ...(kind === "video" ? { width: video.videoWidth || undefined, height: video.videoHeight || undefined } : {}),
      });
    };
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) return report();
      // A recording without a length in its header (a browser's own WebM)
      // finds it out by seeking past the end.
      el.ondurationchange = () => Number.isFinite(el.duration) && el.duration > 0 && report();
      el.currentTime = Number.MAX_SAFE_INTEGER;
    };
    el.onerror = () => finish(null);
    el.src = url;
  });
}
