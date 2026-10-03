"use client";

import { useEffect } from "react";
import { storageAvailable, storageKeyOf } from "@/lib/storage/client";
import { useStudio } from "@/store/studio";

/**
 * Removes the kept copy of something deleted here, so storage does not fill
 * with files nothing points at. A file still used anywhere — another run's
 * reference, an element's picture, an upload, what sits in a composer — is
 * left alone: deleting one run must not break another.
 */

function keyHeaders(): Record<string, string> {
  const { apiKey, hfKey } = useStudio.getState();
  return { ...(apiKey ? { "x-kie-key": apiKey } : {}), ...(hfKey?.includes(":") ? { "x-hf-key": hfKey } : {}) };
}

/** Everything in the studio that could still point at a file, as one text to search. */
function stillUsed(): string {
  const s = useStudio.getState();
  return JSON.stringify([s.runs, s.uploads, s.elements, s.recipeRuns, s.valuesByModel, s.refsByCategory, s.motionClips, s.remix]);
}

let working = false;

async function sweep() {
  if (working) return;
  const { purge } = useStudio.getState();
  if (purge.length === 0) return;
  working = true;
  try {
    const headers = keyHeaders();
    if (Object.keys(headers).length === 0) return;
    for (const url of purge) {
      const s = useStudio.getState();
      const key = s.copies[url]?.key ?? storageKeyOf(url);
      const used = stillUsed();
      // Nothing kept for it: nothing to do.
      if (!key) {
        s.dropFromPurge([url]);
        continue;
      }
      // Something else still needs it: it waits in the queue, and goes once
      // that is deleted too (the next sweep looks again).
      if (used.includes(url) || used.includes(key)) continue;
      const res = await fetch(`/api/storage/file/${key}`, { method: "DELETE", headers }).catch(() => null);
      // Not now (offline, a hiccup): it stays queued for the next sweep.
      if (!res || (!res.ok && res.status !== 404)) continue;
      useStudio.setState((state) => {
        const copies = { ...state.copies };
        delete copies[url];
        const remotes = { ...state.remotes };
        delete remotes[key];
        return {
          copies,
          remotes,
          favorites: state.favorites.filter((u) => u !== url),
          purge: state.purge.filter((u) => u !== url),
        };
      });
    }
  } finally {
    working = false;
  }
}

export function StorageJanitor() {
  const hydrated = useStudio((s) => s.hydrated);
  const purge = useStudio((s) => s.purge);
  // Looked at again whenever something is deleted, since that may be what
  // was still holding on to a queued file.
  const deleted = useStudio((s) => s.deleted);
  useEffect(() => {
    if (!hydrated || !storageAvailable() || purge.length === 0) return;
    // A moment after the delete, so an undo-like change of mind (or the
    // tile's shrink) is not raced.
    const timer = window.setTimeout(() => void sweep(), 1500);
    return () => window.clearTimeout(timer);
  }, [hydrated, purge, deleted]);
  return null;
}
