import { familyToModel, allSpecs } from "./auto";
import { FAMILIES } from "./curation";
import { familyToModel as hfFamilyToModel, loadCatalogSpecs, uncuratedFamilies } from "./hf/auto";
import snapshot from "./hf/generated/catalog.json";
import type { HfCatalog } from "@/lib/higgsfield/catalogSource";
import { FAMILIES as HF_FAMILIES } from "./hf/curation";
import { withAutoMode, withFold, type FoldSpec } from "./autoMode";
import { inOrder } from "./order";
import { withActions } from "./actions";
import type { Category, Field, ModelDef, Provider, Values } from "./types";

export * from "./types";
export { FAMILIES } from "./curation";
export { getSpec } from "./auto";
export { hasPicture, inFold, inputsOf, modeFor, tabOf } from "./autoMode";

/**
 * KIE's catalogue carries no pictures, so these models wear covers of our
 * own, kept in public/covers by model id. The single-file build has no
 * server of its own and reads them from the site.
 */
const COVERS = new Set([
  "nano-banana-2", "nano-banana-2-1", "nano-banana-2-lite", "nano-banana-pro",
  "seedream-5-pro", "seedream-5-flash", "seedream-5-lite", "seedream-4-5",
  "gpt-image-2", "gpt-image-2-5-flare", "gpt-image-2-5-sunburst",
  "flux-2-pro", "flux-2-flex", "grok-imagine-image-2",
  "ideogram-v3", "ideogram-character", "qwen3-image", "qwen3-image-pro", "qwen2-1-image",
  "wan-2-7-image", "wan-2-7-image-pro", "z-image",
]);
const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE ?? "";
/** Covers that move: a short silent loop beside its still (`<id>.mp4` and `<id>.webp`). */
const VIDEO_COVERS = new Set(["vidu-q4"]);
const withCover = (m: ModelDef): ModelDef =>
  m.preview
    ? m
    : VIDEO_COVERS.has(m.id)
      ? { ...m, preview: { video: `${ASSET_BASE}/covers/${m.id}.mp4`, poster: `${ASSET_BASE}/covers/${m.id}.webp` } }
      : COVERS.has(m.id)
        ? { ...m, preview: { image: `${ASSET_BASE}/covers/${m.id}.webp` } }
        : m;

/**
 * Models whose frames and references share a field, folded by hand: one
 * Generate tab, References or Frames, the request picked by what is in it.
 */
const FOLDS: Record<string, FoldSpec> = {
  "veo-3-1": {
    text: "text-to-video",
    frames: { one: "frames-to-video", two: "frames-to-video", start: "image_urls", end: "image_urls", array: true },
    inputs: ["image_urls"],
    refs: [{ mode: "reference-to-video", carries: ["image_urls"] }],
    max: { image_urls: 3 },
  },
  "kling-3-omni": {
    text: "text-to-video",
    frames: { one: "first-frame", two: "first-last", start: "image_urls", end: "image_urls", array: true },
    inputs: ["image_urls", "video_urls"],
    refs: [
      { mode: "ref-images", carries: ["image_urls"] },
      { mode: "ref-video", carries: ["video_urls"] },
      { mode: "ref-mixed", carries: ["image_urls", "video_urls"] },
    ],
  },
  // No mode of its own for text: the image reference, empty, is one.
  "hf-kling-o3": {
    text: "image-reference",
    frames: { one: "first-last-frame", two: "first-last-frame", start: "first_frame_url", end: "last_frame_url" },
    inputs: ["image_urls", "video_urls"],
    refs: [
      { mode: "image-reference", carries: ["image_urls"] },
      { mode: "video-reference", carries: ["image_urls", "video_urls"] },
    ],
  },
  "hf-kling-omni": {
    text: "image-reference",
    frames: { one: "first-last-frame", two: "first-last-frame", start: "first_frame_url", end: "last_frame_url" },
    inputs: ["image_urls", "video_urls"],
    refs: [
      { mode: "image-reference", carries: ["image_urls"] },
      { mode: "video-reference", carries: ["image_urls", "video_urls"] },
    ],
  },
  // References and text are one mode; the frames are the other.
  "wan-3": {
    text: "video",
    frames: { one: "frames", two: "frames", start: "first_frame_url", end: "last_frame_url" },
    inputs: ["reference_image_urls", "reference_video_urls", "reference_audio_urls"],
    refs: [{ mode: "video", carries: ["reference_image_urls", "reference_video_urls", "reference_audio_urls"] }],
  },
  "wan-3-prime": {
    text: "video",
    frames: { one: "frames", two: "frames", start: "first_frame_url", end: "last_frame_url" },
    inputs: ["reference_image_urls", "reference_video_urls", "reference_audio_urls"],
    refs: [{ mode: "video", carries: ["reference_image_urls", "reference_video_urls", "reference_audio_urls"] }],
  },
  // No mode of its own for text: the references, empty, are one.
  "vidu-q4": {
    text: "reference-to-video",
    frames: { one: "image-to-video", two: "image-to-video", start: "image_url" },
    inputs: ["reference_image_urls", "reference_audio_urls"],
    refs: [{ mode: "reference-to-video", carries: ["reference_image_urls", "reference_audio_urls"] }],
  },
  "gemini-omni-flash-1-1": {
    text: "video",
    frames: { one: "frames", two: "frames", start: "first_frame_url", end: "last_frame_url" },
    inputs: ["image_urls", "video_list", "audio_ids", "character_ids"],
    refs: [{ mode: "video", carries: ["image_urls", "video_list", "audio_ids", "character_ids"] }],
  },
};
const withFolds = (m: ModelDef): ModelDef => (FOLDS[m.id] ? withFold(m, FOLDS[m.id]) : m);

/** Every KIE family, rendered into a ModelDef from the documented schemas. */
export const KIE_MODELS: ModelDef[] = inOrder(FAMILIES.map(familyToModel)
  .map(withFolds)
  .map(withAutoMode)
  .map(withActions)
  .map(withCover)
  .map((m) => ({ ...m, provider: "kie" as const })));

/**
 * Every Higgsfield family, from Higgsfield's own schemas. Both catalogues
 * name some models alike (Kling 3.0, Wan 3.0), so these ids carry a prefix
 * and a model's values, gallery and memory never mix with its KIE twin.
 */
export const HF_PREFIX = "hf-";

function buildHiggsfield(): ModelDef[] {
  return inOrder([...HF_FAMILIES, ...uncuratedFamilies(HF_FAMILIES)]
    .map(hfFamilyToModel)
    .map((m) => (FOLDS[HF_PREFIX + m.id] ? withFold(m, FOLDS[HF_PREFIX + m.id]) : m))
    .map(withAutoMode)
    .map(withActions)
    .map((m) => ({
      ...m,
      id: HF_PREFIX + m.id,
      provider: "higgsfield" as const,
    })));
}

export const HF_MODELS: ModelDef[] = buildHiggsfield();

/** Both catalogues; a model is found by id whichever provider is chosen. */
export const ALL_MODELS: ModelDef[] = [...KIE_MODELS, ...HF_MODELS];

let catalogSignature = JSON.stringify((snapshot as unknown as HfCatalog).specs);
let catalogInUse = snapshot as unknown as HfCatalog;

/**
 * Rebuilds the Higgsfield models from a newer catalogue (the live one from
 * /api/hf-catalog), in place, so every list that holds them sees the change.
 * Returns whether anything changed; a catalogue the curation cannot be laid
 * over is refused and the models stay as they were.
 */
export function applyHiggsfieldCatalog(next: HfCatalog): boolean {
  if (!Array.isArray(next?.specs) || next.specs.length === 0) return false;
  const signature = JSON.stringify(next.specs);
  if (signature === catalogSignature) return false;
  loadCatalogSpecs(next);
  let models: ModelDef[];
  try {
    models = buildHiggsfield();
  } catch (error) {
    console.warn("[registry] live Higgsfield catalogue not applied:", error);
    loadCatalogSpecs(catalogInUse);
    return false;
  }
  catalogSignature = signature;
  catalogInUse = next;
  HF_MODELS.splice(0, HF_MODELS.length, ...models);
  ALL_MODELS.splice(KIE_MODELS.length, ALL_MODELS.length - KIE_MODELS.length, ...models);
  return true;
}

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

/** How many option chips the bar shows; the rest join the drawer. */
export const BAR_CHIPS = 5;

/**
 * The bar's chips and the drawer's options for these fields. A model with
 * more chips than fit on a line sends the last ones to the drawer, the
 * way the rarely touched options already live there.
 */
export function barAndPanel(fields: Field[]): { bar: Field[]; panel: Field[] } {
  const bar = fields.filter((f) => f.placement === "bar");
  return {
    bar: bar.slice(0, BAR_CHIPS),
    panel: [...bar.slice(BAR_CHIPS), ...fields.filter((f) => f.placement === "panel")],
  };
}

/** A bitrate choice: given a row of its own in the composer (as Higgsfield's), so kept out of Advanced. */
export function isBitrate(field: Field): boolean {
  return /bitrate/i.test(field.key) && (field.choices?.length ?? 0) > 1;
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
export * from "./capabilities";
