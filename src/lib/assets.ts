"use client";

import { getModel, type Category } from "@/lib/registry";
import { mediaKind } from "@/lib/upload";
import { useStudio, type Run, type Upload } from "@/store/studio";

/** Anything the studio can show or reuse: a finished output, or an upload. */
export interface Asset {
  id: string;
  url: string;
  kind: "image" | "video" | "audio";
  /**
   * Where it came from: a model run, a file the person uploaded, or a run
   * still being made (no URL yet; Assets shows it with its loader).
   */
  source: "run" | "upload" | "pending";
  /** The model's category for a run; uploads belong to no category. */
  category?: Category;
  label: string;
  prompt?: string;
  createdAt: number;
  /** The run behind a pending asset. */
  run?: Run;
}

export function runAssets(run: Run): Asset[] {
  if (run.state !== "success") return [];
  const category = getModel(run.modelId)?.category;
  return run.urls.map((url, index) => ({
    id: `${run.id}-${index}`,
    url,
    kind: mediaKind(url),
    source: "run" as const,
    category,
    label: run.modelName,
    prompt: run.prompt,
    createdAt: run.createdAt,
  }));
}

/** Sent and not finished: queued, submitted, or rendering. */
export function inFlight(run: Run): boolean {
  return run.state === "queued" || run.state === "pending" || run.state === "running";
}

/**
 * A run still being made, as an asset. It takes the id its first output
 * will have, so when the run lands the tile stays in its place instead of
 * one shrinking away while another arrives.
 */
export function pendingAsset(run: Run): Asset {
  return {
    id: `${run.id}-0`,
    url: "",
    kind: run.output,
    source: "pending",
    category: getModel(run.modelId)?.category,
    label: run.modelName,
    prompt: run.prompt,
    createdAt: run.createdAt,
    run,
  };
}

export function uploadAsset(upload: Upload): Asset {
  return {
    id: upload.id,
    url: upload.url,
    kind: upload.kind,
    source: "upload",
    label: upload.name ?? "Upload",
    createdAt: upload.createdAt,
  };
}

/** Every output and upload, newest first. */
export function useAssets(): Asset[] {
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  return [...runs.flatMap(runAssets), ...uploads.map(uploadAsset)].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}
