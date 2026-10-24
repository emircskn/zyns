"use client";

import { getModel, type Category } from "@/lib/registry";
import { mediaKind } from "@/lib/upload";
import { segmentsOf } from "@/lib/sources";
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
  /** The project it was saved to, if any. */
  projectId?: string;
  folderId?: string;
  /** The service that made it (runs only). */
  provider?: "kie" | "higgsfield";
  /** A segment map's parts: how many on its first part, and `inGroup` on the rest, which Assets folds away. */
  parts?: number;
  inGroup?: boolean;
}

export function runAssets(run: Run): Asset[] {
  if (run.state !== "success") return [];
  const category = getModel(run.modelId)?.category;
  const grouped = run.urls.length > 1 && !!segmentsOf(run);
  return run.urls.map((url, index) => ({
    ...(grouped && (index === 0 ? { parts: run.urls.length } : { inGroup: true })),
    id: `${run.id}-${index}`,
    url,
    kind: mediaKind(url),
    source: "run" as const,
    category,
    label: run.modelName,
    prompt: run.prompt,
    createdAt: run.createdAt,
    // In a project's Trash it is out of that project, but still here.
    projectId: run.trashedAt ? undefined : run.projectId,
    folderId: run.trashedAt ? undefined : run.folderId,
    provider: run.provider ?? "kie",
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
    projectId: run.trashedAt ? undefined : run.projectId,
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
    projectId: upload.trashedAt ? undefined : upload.projectId,
    folderId: upload.trashedAt ? undefined : upload.folderId,
  };
}

/** Every output and upload, newest first. */
export function useAssets(): Asset[] {
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  // What sits in a Trash is out of sight until it is restored.
  return [...runs.filter((r) => !r.trashedAt).flatMap(runAssets), ...uploads.filter((u) => !u.trashedAt).map(uploadAsset)].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}
