"use client";

import { ratioNumber } from "@/lib/aspect";
import { noteRatio, ratioOf } from "@/lib/mediaRatio";
import { activeFields, type ModelDef, type Values } from "@/lib/registry";

/**
 * The studio's own "Auto" aspect ratio (see `autoFrom` on a field), turned
 * into a value the API accepts: the listed ratio closest to the shape of the
 * first reference picture or clip. If that shape cannot be read, the ratio
 * is left out and the model uses its own default, or, where the API insists
 * on one, the field's documented default is sent.
 */
export async function resolveAutoRatio(model: ModelDef, values: Values): Promise<Values> {
  const fields = activeFields(model, values);
  const autos = fields.filter((f) => f.autoFrom === "input" && values[f.key] === "auto");
  if (autos.length === 0) return values;

  const url = firstReference(fields, values);
  const shape = url ? ratioOf(url) ?? (await measure(url)) : undefined;
  const next: Values = { ...values };
  for (const field of autos) {
    const best = shape === undefined ? undefined : nearest(field.choices?.map((c) => c.value) ?? [], shape);
    const fallback = field.required ? fallbackRatio(field) : undefined;
    if (best ?? fallback) next[field.key] = best ?? fallback;
    else delete next[field.key];
  }
  return next;
}

/** A ratio the API will take when the reference's shape is unknown. */
function fallbackRatio(field: ReturnType<typeof activeFields>[number]): string | undefined {
  const fallback = typeof field.default === "string" && field.default !== "auto" ? field.default : undefined;
  return fallback ?? field.choices?.find((c) => c.value !== "auto")?.value;
}

function firstReference(fields: ReturnType<typeof activeFields>, values: Values): string | undefined {
  for (const field of fields) {
    if (field.placement !== "input" || /mask/.test(field.key) || field.accept === "audio") continue;
    const value = values[field.key];
    const first = Array.isArray(value) ? value.find((v) => typeof v === "string" && v) : value;
    if (typeof first === "string" && first) return first;
  }
  return undefined;
}

/** Nearest on a log scale, so 2:1 and 1:2 are as far from 1:1 as each other. */
function nearest(choices: string[], shape: number): string | undefined {
  let best: string | undefined;
  let distance = Infinity;
  for (const choice of choices) {
    const ratio = ratioNumber(choice);
    if (ratio === undefined) continue;
    const d = Math.abs(Math.log(ratio / shape));
    if (d < distance) {
      best = choice;
      distance = d;
    }
  }
  return best;
}

/** Load just enough of a picture or clip to know its shape. */
function measure(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const done = (w?: number, h?: number) => {
      window.clearTimeout(timer);
      if (w && h) {
        noteRatio(url, w, h);
        resolve(w / h);
      } else resolve(undefined);
    };
    const timer = window.setTimeout(() => done(), 6000);
    if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.onloadedmetadata = () => done(video.videoWidth, video.videoHeight);
      video.onerror = () => done();
      video.src = url;
    } else {
      const image = new Image();
      image.onload = () => done(image.naturalWidth, image.naturalHeight);
      image.onerror = () => done();
      image.src = url;
    }
  });
}
