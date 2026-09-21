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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function send(files: FileList | File[], onDone: (urls: string[]) => void) {
    if (!apiKey) {
      setError("Add your API key first. Uploads go through your KIE account.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const list = Array.from(files);
      const urls = await Promise.all(list.map((file) => uploadFile(file, apiKey)));
      urls.forEach((url, index) =>
        addUpload({
          id: `up-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          url,
          kind: accept ?? "image",
          name: list[index]?.name,
          createdAt: Date.now(),
        }),
      );
      onDone(urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setError, input, send, accept: ACCEPT[accept ?? "image"] };
}
