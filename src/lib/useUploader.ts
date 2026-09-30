"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload";
import { PROVIDER_NAME } from "@/lib/generate";
import { activeKey, useStudio } from "@/store/studio";

export const ACCEPT: Record<string, string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
};

type Kind = "image" | "video" | "audio";

function kindOfFile(file: File, fallback: Kind): Kind {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  return fallback;
}

/**
 * Sends files to the chosen service's file host and remembers each one, so an upload can be
 * picked again later as a reference instead of being uploaded twice.
 */
export function useUploader(accept: Kind | Kind[] | undefined) {
  const kinds: Kind[] = Array.isArray(accept) ? accept : [accept ?? "image"];
  const apiKey = useStudio(activeKey);
  const provider = useStudio((s) => s.provider);
  const addUpload = useStudio((s) => s.addUpload);
  // How many files are on their way up, so each can hold a place of its own
  // while it goes; busy while any are.
  const [pending, setPending] = useState(0);
  const busy = pending > 0;
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function send(files: FileList | File[], onDone: (urls: string[]) => void) {
    if (!apiKey) {
      setError(`Add your API key first. Uploads go through your ${PROVIDER_NAME[provider]} account.`);
      return;
    }
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);
    setPending((n) => n + list.length);
    // Each file lands on its own, so a quick one does not wait for a slow one.
    const results = await Promise.all(
      list.map(async (file, index) => {
        try {
          const url = await uploadFile(file, apiKey, provider);
          addUpload({
            id: `up-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            url,
            // A picker that takes several kinds files each by what it is.
            kind: kinds.length === 1 ? kinds[0] : kindOfFile(file, kinds[0]),
            name: file.name,
            createdAt: Date.now(),
          });
          return url;
        } catch (err) {
          setError(err instanceof Error ? err.message : "Upload failed.");
          return null;
        } finally {
          setPending((n) => Math.max(0, n - 1));
        }
      }),
    );
    const urls = results.filter((url): url is string => !!url);
    if (urls.length > 0) onDone(urls);
  }

  return { busy, pending, error, setError, input, send, accept: kinds.map((k) => ACCEPT[k]).join(",") };
}
