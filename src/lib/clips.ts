/**
 * Source clips: a video plus the stretch of it a model should use. Gemini
 * Omni takes at most ten seconds of a clip, so a new clip starts trimmed to
 * its opening ten seconds (or all of it, when shorter).
 */
export const CLIP_MAX_SECONDS = 10;

export interface Clip {
  url: string;
  start: number;
  ends: number;
}

/** A video's length in seconds, read from its metadata; null if unreadable. */
export function videoDuration(url: string, timeout = 10_000): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const done = (value: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };
    const timer = window.setTimeout(() => done(null), timeout);
    video.preload = "metadata";
    video.muted = true;
    const known = () => Number.isFinite(video.duration) && video.duration > 0;
    video.onloadedmetadata = () => {
      if (known()) return done(video.duration);
      // A recording without a length in its header (a browser's own WebM,
      // say) finds it out by seeking past the end.
      video.ondurationchange = () => known() && done(video.duration);
      video.currentTime = Number.MAX_SAFE_INTEGER;
    };
    video.onerror = () => done(null);
    video.src = url;
  });
}

/** The opening stretch of a clip `seconds` long, within the model's cap. */
export function openingClip(url: string, seconds: number | null): Clip {
  const ends = seconds ? Math.min(Math.floor(seconds * 10) / 10, CLIP_MAX_SECONDS) : CLIP_MAX_SECONDS;
  return { url, start: 0, ends };
}

/** What stops a clip being sent, or null. */
export function clipProblem(clip: Partial<Clip> | undefined): string | null {
  if (!clip?.url) return "Add a video to the clip, or remove it.";
  const start = Number(clip.start ?? 0);
  const ends = Number(clip.ends ?? 0);
  if (!(ends > start)) return "The clip's end must come after its start.";
  if (ends - start > CLIP_MAX_SECONDS + 1e-6) return `Trim the clip to ${CLIP_MAX_SECONDS} seconds or less.`;
  return null;
}
