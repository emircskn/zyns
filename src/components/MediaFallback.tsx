"use client";

import { useEffect } from "react";
import { STORAGE_PATH, storageKeyOf } from "@/lib/storage/client";
import { useStudio } from "@/store/studio";

/**
 * A picture or clip whose kept copy does not load is tried again another
 * way rather than left broken: first the same copy through the studio's own
 * address (no hop to the storage's), then the service's original link while
 * it still lives. Listens once for every media element on the page.
 */
export function MediaFallback() {
  useEffect(() => {
    function onError(event: Event) {
      const el = event.target;
      if (!(el instanceof HTMLImageElement || el instanceof HTMLVideoElement || el instanceof HTMLSourceElement)) return;
      const src = el.getAttribute("src") ?? "";
      const key = storageKeyOf(src);
      if (!key) return;
      const tried = el.dataset.fallback ?? "";
      let next: string | undefined;
      if (!tried) {
        next = `${STORAGE_PATH}${key}?download=1`;
        el.dataset.fallback = "direct";
      } else if (tried === "direct") {
        const copies = useStudio.getState().copies;
        next = Object.entries(copies).find(([, copy]) => copy.key === key)?.[0];
        el.dataset.fallback = "original";
      }
      if (!next) return;
      el.setAttribute("src", next);
      if (el instanceof HTMLVideoElement) el.load();
    }
    // Media errors do not bubble; caught on the way down instead.
    window.addEventListener("error", onError, true);
    return () => window.removeEventListener("error", onError, true);
  }, []);
  return null;
}
