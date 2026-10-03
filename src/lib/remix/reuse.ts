"use client";

import { useStudio, type Run } from "@/store/studio";
import type { RemixRunInfo, RemixState } from "./types";

/**
 * Puts a remix back in the composer: its mode, its source and, unless asked
 * for fresh ones, its references, its style and (in Restyle) its model.
 */
export function restoreRemix(run: Run, { keepRefs = true }: { keepRefs?: boolean } = {}): void {
  const store = useStudio.getState();
  const info = run.remix ?? fromValues(run);
  if (!info) {
    if (store.page !== "remix") store.setPage("remix");
    return;
  }
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

/** A Genjutsu run made on the Video page before Remix kept its own record: read off its values. */
function fromValues(run: Run): RemixRunInfo | undefined {
  const source = typeof run.values.video_url === "string" ? run.values.video_url : undefined;
  if (!source) return undefined;
  const refs = Array.isArray(run.values.image_urls) ? run.values.image_urls.filter((u): u is string => typeof u === "string") : [];
  const mode = run.mode === "object-swap" ? "swap" : run.mode === "restyle" ? "restyle" : "motion";
  return { mode, source, refs, presetId: typeof run.values.preset_id === "string" ? run.values.preset_id : undefined };
}
