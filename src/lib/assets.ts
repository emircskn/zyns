"use client";

import { getModel, type Category } from "@/lib/registry";
import { mediaKind } from "@/lib/upload";
import { useStudio, type Run, type Upload } from "@/store/studio";

/** Anything the studio can show or reuse: a finished output, or an upload. */
export interface Asset {
  id: string;
  url: string;
  kind: "image" | "video" | "audio";
  /** Where it came from: a model run, or a file the person uploaded. */
  source: "run" | "upload";
  /** The model's category for a run; uploads belong to no category. */
  category?: Category;
  label: string;
  prompt?: string;
  createdAt: number;
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
