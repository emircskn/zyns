"use client";

import { useStudio, type Run } from "@/store/studio";
import type { RemixState } from "./types";

/**
 * Puts a remix back in the composer: its mode, its source and, unless asked
 * for fresh ones, its references, its style and (in Restyle) its model.
 */
export function restoreRemix(run: Run, { keepRefs = true }: { keepRefs?: boolean } = {}): void {
  const info = run.remix;
  if (!info) return;
  const store = useStudio.getState();
  const patch: Partial<RemixState> = {
    mode: info.mode,
    source: info.source,
    refs: keepRefs ? info.refs : [],
  };
  if (info.mode === "restyle") {
    patch.restyle = { modelId: run.modelId, mode: run.mode };
    if (info.presetId) patch.presetId = info.presetId;
    patch.styleId = info.styleId;
  }
  store.patchRemix(patch);
  if (store.page !== "remix") store.setPage("remix");
}
