"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload";
import { useStudio } from "@/store/studio";

export const ACCEPT: Record<string, string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
};

type Kind = "image" | "video" | "audio";

/**
 * Sends files to KIE's file host and remembers each one, so an upload can be
 * picked again later as a reference instead of being uploaded twice.
 */
export function useUploader(accept: Kind | undefined) {
  const apiKey = useStudio((s) => s.apiKey);
  const addUpload = useStudio((s) => s.addUpload);
  // How many files are on their way up, so each can hold a place of its own
  // while it goes; busy while any are.
  const [pending, setPending] = useState(0);
  const busy = pending > 0;
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function send(files: FileList | File[], onDone: (urls: string[]) => void) {
    if (!apiKey) {
      setError("Add your API key first. Uploads go through your KIE account.");
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
          const url = await uploadFile(file, apiKey);
          addUpload({
            id: `up-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            url,
            kind: accept ?? "image",
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

  return { busy, pending, error, setError, input, send, accept: ACCEPT[accept ?? "image"] };
}
