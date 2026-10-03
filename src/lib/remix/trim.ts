"use client";

/**
 * Cuts a stretch out of a clip in the browser. Genjutsu has no start or end
 * of its own (it takes a clip from its first frame), so a different stretch
 * is a new file: the clip is played through that stretch once and recorded,
 * picture through a canvas and sound through an audio graph, which works the
 * same in Chrome and Safari. It takes as long as the stretch lasts.
 */
import { keepCopy, storageKeyOf, storageUrl } from "@/lib/storage/client";
import { useStudio } from "@/store/studio";

/** Recorders this browser has, the one every service reads first. */
const TYPES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function trimType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * The clip at an address this page may read the pixels of: the kept copy,
 * streamed from this site. A canvas refuses to record another site's video.
 */
async function readable(url: string): Promise<string> {
  const key = storageKeyOf(url) ?? useStudio.getState().copies[url]?.key ?? (await keepCopy(url, "video"))?.key;
  if (key) return `${storageUrl(key)}?download=1`;
  // No storage (the standalone page): the file itself, if its host lets us.
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) throw new Error("This clip could not be opened for trimming.");
  return URL.createObjectURL(await res.blob());
}

function once(target: EventTarget, event: string, ms = 20_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("The clip took too long to load.")), ms);
    target.addEventListener(
      event,
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export interface TrimResult {
  file: File;
  /** Recorded without sound: the browser would not play it aloud unasked. */
  silent: boolean;
}

export async function trimClip(
  url: string,
  start: number,
  end: number,
  onProgress?: (share: number) => void,
): Promise<TrimResult> {
  const type = trimType();
  if (!type) throw new Error("This browser cannot trim video. Trim the clip before uploading it.");
  const src = await readable(url);
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.preload = "auto";
  video.src = src;
  await once(video, "loadedmetadata");

  const long = Math.max(video.videoWidth, video.videoHeight) || 1280;
  const scale = Math.min(1, 1920 / long);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((video.videoWidth || 1280) * scale / 2) * 2;
  canvas.height = Math.round((video.videoHeight || 720) * scale / 2) * 2;
  const paint = canvas.getContext("2d")!;
  const stream = canvas.captureStream(30);

  // The sound goes to the recording, not the speakers.
  let audio: AudioContext | null = null;
  try {
    audio = new AudioContext();
    const source = audio.createMediaElementSource(video);
    const out = audio.createMediaStreamDestination();
    source.connect(out);
    for (const track of out.stream.getAudioTracks()) stream.addTrack(track);
  } catch {
    audio = null;
  }

  video.currentTime = start;
  await once(video, "seeked");

  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

  let silent = false;
  try {
    await audio?.resume();
    await video.play();
  } catch {
    // Played aloud only after a tap; muted, it plays at once, without sound.
    silent = true;
    video.muted = true;
    await video.play();
  }
  recorder.start(500);

  await new Promise<void>((resolve) => {
    const draw = () => {
      paint.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress?.(Math.min(1, Math.max(0, (video.currentTime - start) / (end - start))));
      if (video.currentTime >= end || video.ended) return resolve();
      requestAnimationFrame(draw);
    };
    draw();
  });
  video.pause();
  recorder.stop();
  await stopped;
  await audio?.close().catch(() => {});
  if (src.startsWith("blob:")) URL.revokeObjectURL(src);

  const mime = type.split(";")[0];
  const ext = mime === "video/mp4" ? "mp4" : "webm";
  return { file: new File(chunks, `trim-${Math.round(start)}-${Math.round(end)}.${ext}`, { type: mime }), silent };
}
