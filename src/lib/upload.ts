"use client";

import { uploadFile as kieUpload } from "@/lib/kie/transport";
import { uploadFile as hfUpload } from "@/lib/higgsfield/transport";
import type { Provider } from "@/lib/registry";
import { prepareImage } from "@/lib/prepareImage";
import { isWav, toWav } from "@/lib/wav";

/**
 * Uploads a browser file to the chosen service's file host (KIE's, or
 * Higgsfield's storage) and returns its public URL. Either URL is public, so
 * a file uploaded for one service can still be used with the other.
 * Pictures are first checked and, where needed, converted or scaled so every
 * model can read them (see prepareImage).
 */
export async function uploadFile(file: File, apiKey: string, provider: Provider = "kie"): Promise<string> {
  if (provider === "higgsfield" && looksLikeAudio(file) && !isWav(file.type)) {
    // Higgsfield's storage takes sound only as WAV.
    return hfUpload(apiKey, await toWav(file, file.name));
  }
  const ready = looksLikeImage(file) ? await prepareImage(file).catch(() => file) : file;
  return provider === "higgsfield" ? hfUpload(apiKey, ready) : kieUpload(apiKey, ready);
}

function looksLikeAudio(file: File): boolean {
  return file.type ? file.type.startsWith("audio/") : /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name);
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
