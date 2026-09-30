import { familyToModel, allSpecs } from "./auto";
import { FAMILIES } from "./curation";
import { familyToModel as hfFamilyToModel } from "./hf/auto";
import { FAMILIES as HF_FAMILIES } from "./hf/curation";
import { withAutoMode } from "./autoMode";
import type { Category, Field, ModelDef, Provider, Values } from "./types";

export * from "./types";
export { FAMILIES } from "./curation";
export { getSpec } from "./auto";
export { hasPicture, tabOf } from "./autoMode";

/** Every KIE family, rendered into a ModelDef from the documented schemas. */
export const KIE_MODELS: ModelDef[] = FAMILIES.map(familyToModel)
  .map(withAutoMode)
  .map((m) => ({ ...m, provider: "kie" as const }));

/**
 * Every Higgsfield family, from Higgsfield's own schemas. Both catalogues
 * name some models alike (Kling 3.0, Wan 3.0), so these ids carry a prefix
 * and a model's values, gallery and memory never mix with its KIE twin.
 */
export const HF_PREFIX = "hf-";
export const HF_MODELS: ModelDef[] = HF_FAMILIES.map(hfFamilyToModel)
  .map(withAutoMode)
  .map((m) => ({
  ...m,
  id: HF_PREFIX + m.id,
  provider: "higgsfield" as const,
}));

/** Both catalogues; a model is found by id whichever provider is chosen. */
export const ALL_MODELS: ModelDef[] = [...KIE_MODELS, ...HF_MODELS];

/** The chosen provider's models. */
export function modelsFor(provider: Provider): ModelDef[] {
  return provider === "higgsfield" ? HF_MODELS : KIE_MODELS;
}

/** KIE's, for code that has no provider in hand. */
export const MODELS: ModelDef[] = KIE_MODELS;

/** Documented endpoints, for reporting what the studio covers. */
export const SPEC_COUNT = allSpecs().length;

export type CategoryInfo = { id: Category; label: string; blurb: string };

export const CATEGORIES: CategoryInfo[] = [
  { id: "image", label: "Image", blurb: "Generate and edit stills" },
  { id: "video", label: "Video", blurb: "Motion, avatars and editing" },
  { id: "audio", label: "Audio", blurb: "Music, speech and effects" },
  { id: "tool", label: "Tools", blurb: "Upscale, isolate, cut out" },
];

/** The sections a provider has models for: Higgsfield has no audio. */
export function categoriesFor(provider: Provider): CategoryInfo[] {
  const models = modelsFor(provider);
  return CATEGORIES.filter((c) => models.some((m) => m.category === c.id));
}

export function getModel(id: string): ModelDef | undefined {
  return ALL_MODELS.find((m) => m.id === id);
}

export function providerOf(model: ModelDef | undefined): Provider {
  return model?.provider ?? "kie";
}

export function modelsByCategory(category: Category, provider: Provider = "kie"): ModelDef[] {
  return modelsFor(provider).filter((m) => m.category === category);
}

export function searchModels(query: string, provider: Provider = "kie"): ModelDef[] {
  const models = modelsFor(provider);
  const q = query.trim().toLowerCase();
  if (!q) return models;
  const terms = q.split(/\s+/);
  return models.filter((m) => {
    const haystack = [m.name, m.vendor, m.tagline, ...m.tags, ...(m.modes ?? []).map((x) => x.label)]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}

/** Fields that apply to the current values (mode-aware). */
export function activeFields(model: ModelDef, values: Values): Field[] {
  return model.fields.filter((f) => !f.when || f.when(values));
}

/**
 * Seed a fresh value object from the defaults of the fields that apply to the
 * model's starting mode. A key can be declared by more than one field (the
 * same option with different bounds per mode) — the active one wins.
 */
export function defaultValues(model: ModelDef): Values {
  const values: Values = { __mode: model.defaultMode ?? model.modes?.[0]?.id ?? "" };
  for (const field of model.fields) {
    if (field.when && !field.when(values)) continue;
    if (field.default !== undefined && values[field.key] === undefined) {
      values[field.key] = field.default;
    }
  }
  return values;
}

/** Everything that stops a run, as one message (or null when ready). */
export function validateValues(model: ModelDef, values: Values): string | null {
  for (const field of activeFields(model, values)) {
    if (!field.required) continue;
    const val = values[field.key];
    const empty = Array.isArray(val) ? val.length === 0 : val === undefined || val === null || val === "";
    if (empty) return `Add ${field.label.toLowerCase()} to continue.`;
    if (field.minItems && Array.isArray(val) && val.length < field.minItems) {
      return `Add at least ${field.minItems} ${field.label.toLowerCase()}.`;
    }
  }
  for (const field of activeFields(model, values)) {
    const val = values[field.key];
    if (field.maxItems && Array.isArray(val) && val.length > field.maxItems) {
      return `${field.label} accepts at most ${field.maxItems}.`;
    }
  }
  return model.validate?.(values) ?? null;
}

/**
 * The input fields the bar shows. A Suno track picker settles its song's
 * task too, so the task field it would duplicate stays out of sight (and
 * still goes out with the request).
 */
export function shownInputs(fields: Field[]): Field[] {
  const track = fields.some((f) => f.kind === "source" && f.source?.of === "track");
  const shown = track ? fields.filter((f) => !(f.kind === "source" && f.source?.of === "task")) : fields;
  // Files first, so pictures and clips sit side by side; lists and pickers
  // of earlier results follow on rows of their own.
  const file = (f: Field) => (f.kind === "images" || f.kind === "media" || f.kind === "clips" ? 0 : 1);
  return [...shown].sort((a, b) => file(a) - file(b));
}
