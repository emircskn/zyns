"use client";

import { useEffect, useState } from "react";
import { ErrorPopup } from "@/components/ErrorPopup";
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
/** The last refusal the person was told about, so a retry of the same one stays quiet. */
let told = "";

/** The storage's own reason when it refused a delete; nothing for a hiccup that will pass. */
async function sweep(): Promise<string | null> {
  if (working) return null;
  const { purge } = useStudio.getState();
  if (purge.length === 0) return null;
  working = true;
  let refusal: string | null = null;
  try {
    const headers = keyHeaders();
    if (Object.keys(headers).length === 0) return null;
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
      if (!res) continue;
      if (!res.ok && res.status !== 404) {
        refusal ??= ((await res.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${res.status}`;
        continue;
      }
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
  if (!refusal || refusal === told) return null;
  told = refusal;
  return refusal;
}

export function StorageJanitor() {
  const [failure, setFailure] = useState<string | null>(null);
  const hydrated = useStudio((s) => s.hydrated);
  const purge = useStudio((s) => s.purge);
  // Looked at again whenever something is deleted, since that may be what
  // was still holding on to a queued file.
  const deleted = useStudio((s) => s.deleted);
  useEffect(() => {
    if (!hydrated || !storageAvailable() || purge.length === 0) return;
    // A moment after the delete, so an undo-like change of mind (or the
    // tile's shrink) is not raced.
    const timer = window.setTimeout(() => void sweep().then((refusal) => refusal && setFailure(refusal)), 1500);
    return () => window.clearTimeout(timer);
  }, [hydrated, purge, deleted]);
  return (
    <ErrorPopup
      message={failure}
      onClose={() => setFailure(null)}
      title="Couldn't delete the stored file"
      hint="It was removed from your studio, but the copy in storage is still there. It is tried again when something else is deleted or the page is opened."
    />
  );
}
