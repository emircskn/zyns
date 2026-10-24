"use client";

import { activeFields, type ModelDef, type Values } from "@/lib/registry";
import { readMediaMeta } from "@/lib/mediaMeta";
import { mediaSrc } from "@/lib/storage/client";

/** One drawn box as fractions of its picture: [x1, y1, x2, y2], each 0–1. */
export type Box = [number, number, number, number];
export type BoxMap = Record<string, Box[]>;

/** The reference pictures boxes are drawn on: the model's first picture slot. */
export function boxRefs(model: ModelDef, values: Values): string[] {
  const field = activeFields(model, values).find((f) => f.kind === "images" && f.placement === "input" && f.accept !== "video" && f.accept !== "audio");
  const value = field ? values[field.key] : undefined;
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/**
 * The API wants one list per reference, in order, of pixel boxes. The studio
 * keeps them by URL as fractions, so a reordered or removed picture keeps its
 * own boxes; here they become what the API reads.
 */
export async function boxesToPixels(model: ModelDef, values: Values): Promise<Values> {
  const fields = activeFields(model, values).filter((f) => f.kind === "boxes");
  if (fields.length === 0) return values;
  const refs = boxRefs(model, values);
  const next: Values = { ...values };
  for (const field of fields) {
    const map = (values[field.key] ?? {}) as BoxMap;
    if (!refs.some((url) => map[url]?.length)) {
      delete next[field.key];
      continue;
    }
    next[field.key] = await Promise.all(
      refs.map(async (url) => {
        const boxes = map[url] ?? [];
        if (boxes.length === 0) return [];
        // The kept copy first: the service's own link can have expired while the picture still shows.
        const { width, height } = await readMediaMeta(mediaSrc(url), "image").catch(() => readMediaMeta(url, "image"));
        if (!width || !height) throw new Error("A reference could not be measured for its boxes.");
        return boxes.map(([x1, y1, x2, y2]) => [Math.round(x1 * width), Math.round(y1 * height), Math.round(x2 * width), Math.round(y2 * height)]);
      }),
    );
  }
  return next;
}
