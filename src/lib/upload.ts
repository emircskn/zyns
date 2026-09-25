"use client";

import { uploadFile as transportUpload } from "@/lib/kie/transport";
import { prepareImage } from "@/lib/prepareImage";

/**
 * Uploads a browser file to KIE's file host and returns its public URL.
 * Pictures are first checked and, where needed, converted or scaled so every
 * model can read them (see prepareImage).
 */
export async function uploadFile(file: File, apiKey: string): Promise<string> {
  const ready = looksLikeImage(file) ? await prepareImage(file).catch(() => file) : file;
  return transportUpload(apiKey, ready);
}

/** A picture by its type, or, when a phone gives no type, by its name. */
function looksLikeImage(file: File): boolean {
  if (file.type) return file.type.startsWith("image/");
  return !/\.(mp4|mov|webm|m4v|mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name);
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
