/**
 * Where each Remix mode sends its request. Motion transfer and Swap are
 * Higgsfield's Genjutsu endpoints, the feature itself rather than a choice.
 * Restyle runs on Genjutsu's own Restyle until another model is picked:
 * Genjutsu's motion transfer with a style reference, or any model that can
 * edit a video (KIE's and Higgsfield's alike).
 */
import { mapParams } from "@/lib/recipes/paramMap";
import {
  ALL_MODELS,
  activeFields,
  getModel,
  modesFor,
  providerOf,
  type Field,
  type ModelDef,
  type Values,
} from "@/lib/registry";
import { getSpec } from "@/lib/registry/hf/auto";
import { targetKey, type RemixMode, type RemixState, type RemixTarget } from "./types";

export const GENJUTSU = "hf-genjutsu";
export const MOTION: RemixTarget = { modelId: GENJUTSU, mode: "motion-transfer" };
export const SWAP: RemixTarget = { modelId: GENJUTSU, mode: "object-swap" };
export const RESTYLE: RemixTarget = { modelId: GENJUTSU, mode: "restyle" };

export const MODE_LABEL: Record<RemixMode, string> = { motion: "Motion transfer", swap: "Swap", restyle: "Restyle" };

/** Every model Restyle can run on, Genjutsu's own two first. */
export function restyleTargets(): Array<RemixTarget & { model: ModelDef; label: string }> {
  const genjutsu = getModel(GENJUTSU);
  const own = genjutsu
    ? [
        { ...RESTYLE, model: genjutsu, label: "Genjutsu Restyle" },
        { ...MOTION, model: genjutsu, label: "Genjutsu Motion transfer" },
      ]
    : [];
  const editors = ALL_MODELS.filter((m) => m.id !== GENJUTSU && modesFor(m, "video-edit").length > 0).map((model) => ({
    modelId: model.id,
    mode: modesFor(model, "video-edit")[0],
    model,
    label: model.name,
  }));
  return [...own, ...editors];
}

/** The model and mode a Remix mode sends to now. */
export function targetOf(remix: RemixState, mode: RemixMode = remix.mode): RemixTarget {
  if (mode === "motion") return MOTION;
  if (mode === "swap") return SWAP;
  const picked = remix.restyle;
  if (picked && restyleTargets().some((t) => targetKey(t) === targetKey(picked))) return picked;
  return RESTYLE;
}

export function isNativeRestyle(target: RemixTarget): boolean {
  return targetKey(target) === targetKey(RESTYLE);
}

/** The values a target starts from: its defaults in its mode, and what was set here before. */
export function baseValues(model: ModelDef, target: RemixTarget, remix: RemixState): Values {
  const start = mapParams(model, target.mode, {}).values;
  return { ...start, ...(remix.settings[targetKey(target)] ?? {}), ...(target.mode ? { __mode: target.mode } : {}) };
}

function takes(field: Field, kind: "image" | "video"): boolean {
  return (field.kind === "images" || field.kind === "media") && (field.accept ?? "image") === kind && !/mask/.test(field.key);
}

/** The field the source clip goes in: the one the model cannot go without. */
export function sourceField(model: ModelDef, values: Values): Field | undefined {
  const fields = activeFields(model, values).filter((f) => f.placement === "input" && takes(f, "video"));
  return fields.sort((a, b) => Number(!!b.required) - Number(!!a.required))[0];
}

/** The field references go in, and how many it takes. */
export function referenceField(model: ModelDef, values: Values): Field | undefined {
  const fields = activeFields(model, values).filter((f) => f.placement === "input" && takes(f, "image"));
  return fields.sort((a, b) => Number(b.kind === "images") - Number(a.kind === "images"))[0];
}

export function referenceRoom(model: ModelDef, values: Values): number {
  const field = referenceField(model, values);
  if (!field) return 0;
  return field.kind === "images" ? (field.maxItems ?? 8) : 1;
}

/**
 * The settings Remix shows under its own boxes: everything the form has
 * that is not the source, the references, the prompt or the style.
 */
export function settingFields(model: ModelDef, values: Values): Field[] {
  const source = sourceField(model, values);
  const refs = referenceField(model, values);
  return activeFields(model, values).filter(
    (f) =>
      f.key !== source?.key &&
      f.key !== refs?.key &&
      f.key !== "preset_id" &&
      f.placement !== "prompt" &&
      !((f.kind === "images" || f.kind === "media") && f.placement === "input") &&
      f.kind !== "elements",
  );
}

/** The endpoint a target posts to, for its catalogue entry (Higgsfield's only). */
function endpointOf(model: ModelDef, values: Values): string | undefined {
  if (providerOf(model) !== "higgsfield") return undefined;
  try {
    return model.build(values).endpoint.replace(/^\//, "");
  } catch {
    return undefined;
  }
}

/**
 * What the source clip may be, from the model's own documentation: how
 * short, how long, whether a longer one is cut down for you, and how many
 * pixels a frame needs. Read from the catalogue's notes, so a change there
 * changes the check.
 */
export interface SourceLimits {
  min?: number;
  max?: number;
  /** A clip over `max` is trimmed by the service rather than refused. */
  trims: boolean;
  minPixels?: number;
}

export function sourceLimits(model: ModelDef, values: Values): SourceLimits {
  const endpoint = endpointOf(model, values);
  const spec = endpoint ? getSpec(endpoint) : undefined;
  const text = [...(spec?.notes ?? []), ...Object.values(spec?.top ?? {}).map((p) => p.desc ?? "")].join(" ");
  const limits: SourceLimits = { trims: false };
  const range = /(?:from\s*)?([\d.]+)\s*(?:–|-|to)\s*([\d.]+)\s*seconds/i.exec(text);
  if (range) {
    limits.min = Number(range[1]);
    limits.max = Number(range[2]);
  }
  const least = /at least\s*([\d.]+)\s*seconds/i.exec(text);
  if (least) limits.min = Number(least[1]);
  const longer = /longer than\s*([\d.]+)\s*seconds\s*(?:are|is)\s*(?:automatically\s*)?trimmed/i.exec(text);
  if (longer) {
    limits.max = Number(longer[1]);
    limits.trims = true;
  } else if (/trimmed to\s*([\d.]+)\s*seconds/i.test(text)) limits.trims = true;
  const pixels = /at least\s*([\d,]+)\s*pixels per frame/i.exec(text);
  if (pixels) limits.minPixels = Number(pixels[1].replace(/,/g, ""));
  return limits;
}

/**
 * A price per second of source clip at each resolution, where the
 * catalogue gives one ("$0.681 at 720p"): Genjutsu charges by the source's
 * length, rounded up to a whole second.
 */
export function perSecondRates(model: ModelDef, values: Values): Record<string, number> | null {
  const endpoint = endpointOf(model, values);
  const pricing = (endpoint ? (getSpec(endpoint) as { pricing?: string } | undefined)?.pricing : undefined) ?? "";
  if (!/per[- ]second|each second|per second/i.test(pricing) || /token/i.test(pricing)) return null;
  const rates: Record<string, number> = {};
  for (const match of pricing.matchAll(/\$([\d.]+)\s*(?:per second\s*)?at\s*(\d{3,4}p)/gi)) rates[match[2]] = Number(match[1]);
  return Object.keys(rates).length > 0 ? rates : null;
}

/** "≈ $5.45" for a clip `seconds` long at the chosen resolution, or null. */
export function remixPrice(model: ModelDef, values: Values, seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  const rates = perSecondRates(model, values);
  if (!rates) return null;
  const resolution = String(values.resolution ?? Object.keys(rates)[0]);
  const rate = rates[resolution];
  if (rate === undefined) return null;
  const limits = sourceLimits(model, values);
  const billed = Math.ceil(limits.trims && limits.max ? Math.min(seconds, limits.max) : seconds);
  return `≈ $${(billed * rate).toFixed(2)}`;
}

/** A style for the models that take one as a reference and a line of prompt. */
export interface StyleInput {
  prompt?: string;
  images?: string[];
}

/**
 * The values to send: the target's settings, with the source, the
 * references and the prompt put where the model takes them.
 */
export function remixValues(
  model: ModelDef,
  target: RemixTarget,
  remix: RemixState,
  style?: StyleInput,
): { values: Values; warnings: string[] } {
  const own = baseValues(model, target, remix);
  const typed = (remix.prompts[remix.mode] ?? "").trim();
  const prompt = [typed, style?.prompt?.trim()].filter(Boolean).join(". ");
  const images = [...remix.refs, ...(style?.images ?? [])];
  const room = referenceRoom(model, own);
  const { values: placed, warnings } = mapParams(model, target.mode, {
    prompt: prompt || undefined,
    images: images.slice(0, room || images.length),
    video: remix.source ?? undefined,
  });
  if (room && images.length > room) warnings.push(`${model.name} takes ${room} pictures here; ${images.length - room} left out.`);
  const values: Values = { ...own };
  // Only the media and the prompt come from the mapping; every setting is the one chosen here.
  for (const key of Object.keys(placed)) {
    if (key in own && own[key] !== placed[key] && !isMediaOrPrompt(model, own, key)) continue;
    values[key] = placed[key];
  }
  // A source a model takes as a list (Kling's video edit) goes in as one.
  const source = sourceField(model, values);
  if (source && remix.source && source.kind === "images") values[source.key] = [remix.source];
  if (isNativeRestyle(target) && remix.presetId) values.preset_id = remix.presetId;
  return { values, warnings };
}

function isMediaOrPrompt(model: ModelDef, values: Values, key: string): boolean {
  const field = activeFields(model, values).find((f) => f.key === key);
  return !!field && (field.placement === "prompt" || field.kind === "images" || field.kind === "media");
}
