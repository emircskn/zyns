"use client";

import { uploadFile as transportUpload } from "@/lib/kie/transport";

/** Uploads a browser file to KIE's file host and returns its public URL. */
export async function uploadFile(file: File, apiKey: string): Promise<string> {
  return transportUpload(apiKey, file);
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
