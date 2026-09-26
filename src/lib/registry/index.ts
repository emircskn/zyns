import { familyToModel, allSpecs } from "./auto";
import { FAMILIES } from "./curation";
import type { Category, Field, ModelDef, Values } from "./types";

export * from "./types";
export { FAMILIES } from "./curation";
export { getSpec } from "./auto";

/** Every family, rendered into a ModelDef from the documented schemas. */
export const MODELS: ModelDef[] = FAMILIES.map(familyToModel);

/** Documented endpoints, for reporting what the studio covers. */
export const SPEC_COUNT = allSpecs().length;

export const CATEGORIES: Array<{ id: Category; label: string; blurb: string }> = [
  { id: "image", label: "Image", blurb: "Generate and edit stills" },
  { id: "video", label: "Video", blurb: "Motion, avatars and editing" },
  { id: "audio", label: "Audio", blurb: "Music, speech and effects" },
  { id: "tool", label: "Tools", blurb: "Upscale, isolate, cut out" },
];

export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

export function modelsByCategory(category: Category): ModelDef[] {
  return MODELS.filter((m) => m.category === category);
}

export function searchModels(query: string): ModelDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return MODELS;
  const terms = q.split(/\s+/);
  return MODELS.filter((m) => {
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
  return track ? fields.filter((f) => !(f.kind === "source" && f.source?.of === "task")) : fields;
}
