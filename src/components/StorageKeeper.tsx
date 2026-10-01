"use client";

import { useEffect } from "react";
import { keepCopy, storageAvailable } from "@/lib/storage/client";
import { useStudio } from "@/store/studio";

/** How many copies go at once, so a long list of likes does not flood the server. */
const AT_ONCE = 2;

/**
 * Keeps lasting copies of what is worth keeping: every file uploaded and
 * everything liked. The services delete their files after days, and these
 * are the ones that would be missed. Mounted once by the studio shell.
 */
export function StorageKeeper() {
  const uploads = useStudio((s) => s.uploads);
  const favorites = useStudio((s) => s.favorites);
  const copies = useStudio((s) => s.copies);
  const hasKey = useStudio((s) => !!(s.apiKey || s.hfKey));

  useEffect(() => {
    if (!hasKey || !storageAvailable()) return;
    const kinds = new Map<string, "image" | "video" | "audio">(uploads.map((u) => [u.url, u.kind]));
    const wanted = [...new Set([...uploads.map((u) => u.url), ...favorites])].filter(
      (url) => !copies[url] && !url.startsWith("demo") && /^https:\/\//i.test(url),
    );
    if (wanted.length === 0) return;
    let stopped = false;
    void (async () => {
      for (let i = 0; i < wanted.length && !stopped; i += AT_ONCE) {
        await Promise.all(wanted.slice(i, i + AT_ONCE).map((url) => keepCopy(url, kinds.get(url))));
      }
    })();
    return () => {
      stopped = true;
    };
  }, [uploads, favorites, copies, hasKey]);

  return null;
}
