"use client";

/** Uploads a browser file to KIE's file host and returns its public URL. */
export async function uploadFile(file: File, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/kie/upload", {
    method: "POST",
    headers: { "x-kie-key": apiKey },
    body: form,
  });
  const body = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !body.url) throw new Error(body.error ?? "Upload failed.");
  return body.url;
}

export function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

export function isAudioUrl(url: string) {
  return /\.(mp3|wav|ogg|m4a|flac|aac)(\?|$)/i.test(url);
}

export function mediaKind(url: string): "image" | "video" | "audio" {
  if (isVideoUrl(url)) return "video";
  if (isAudioUrl(url)) return "audio";
  return "image";
}
