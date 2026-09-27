/**
 * Turns a curated family (a product line with its modes and tiers) plus the
 * generated catalogue (the request schemas scraped from docs.higgsfield.ai)
 * into a ModelDef the studio can render. Nothing here knows about any
 * particular model — every control, default and limit comes from the docs,
 * and every grouping decision comes from curation.ts.
 */
import catalog from "./generated/catalog.json";
import type { Category, Choice, Field, FieldKind, ItemField, ModelDef, Placement, Values } from "../types";
import { TIER_KEY, compact } from "../types";
import { ratioNumber } from "@/lib/aspect";
import { clipProblem, type Clip } from "@/lib/clips";

/** The keys an aspect ratio travels under. */
const RATIO_KEY = /^(aspect_ratio|aspectRatio|ratio|image_size|size)$/;

/* ------------------------------------------------------------------ *
 * Catalogue types
 * ------------------------------------------------------------------ */

export interface SpecProp {
  type?: string;
  enum?: Array<string | number | boolean>;
  enumLabels?: Record<string, string>;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  format?: string;
  items?: { type?: string; enum?: unknown[]; format?: string; properties?: Record<string, SpecProp> };
  desc: string;
  required: boolean;
}

export interface Spec {
  /** Higgsfield endpoint ID, e.g. `bytedance/seedance-2.0/text-to-video`. */
  model: string;
  endpoint: string;
  doc: string;
  title: string;
  /** The docs family the endpoint is filed under ("Seedance 2.0"). */
  crumb: string;
  family: string;
  output: "image" | "video" | "audio";
  /** The request body's properties; Higgsfield bodies are flat. */
  top: Record<string, SpecProp>;
  /** The page's usage notes, for whoever curates the family. */
  notes: string[];
}

const SPECS: Record<string, Spec> = {};
for (const spec of (catalog as unknown as { specs: Spec[] }).specs) {
  SPECS[spec.model] = spec;
}

export function getSpec(id: string): Spec | undefined {
  return SPECS[id];
}

export function allSpecs(): Spec[] {
  return Object.values(SPECS);
}

/* ------------------------------------------------------------------ *
 * Curation types
 * ------------------------------------------------------------------ */

export interface ModeSpec {
  id: string;
  label: string;
  /** Higgsfield endpoint ID; with `tiers`, the endpoint of the first tier. */
  model: string;
  /**
   * When each quality tier is its own endpoint: tier value → endpoint ID.
   * The tier picker offers these, in this order.
   */
  tiers?: Record<string, string>;
  hint?: string;
  /** Keep only these keys. */
  only?: string[];
  /** Drop these keys. */
  hide?: string[];
  /** Additionally required in this mode. */
  require?: string[];
  /** Values the mode pins; hidden from the UI and injected at build time. */
  fixed?: Record<string, unknown>;
}

export interface Family {
  id: string;
  name: string;
  vendor: string;
  category: Category;
  output: "image" | "video" | "audio";
  tagline: string;
  badge?: string;
  tags?: string[];
  modes: ModeSpec[];
  /** How the tier picker reads, for families whose modes carry `tiers`. */
  tier?: { label: string; choices: Choice[] };
  /** Per-key presentation overrides. */
  fields?: Record<string, Partial<Field>>;
  creditHint?: ModelDef["creditHint"];
  /** A family's own rule on top of the documented ones. */
  validate?: ModelDef["validate"];
  /** Shown on the home showcase. */
  featured?: boolean;
  /** One-tap starting prompts for the showcase and the empty bar. */
  prompts?: string[];
}

/* ------------------------------------------------------------------ *
 * Heuristics: what a parameter looks like, and where it lives
 * ------------------------------------------------------------------ */

const LABELS: Record<string, string> = {
  prompt: "Prompt",
  negative_prompt: "Negative prompt",
  aspect_ratio: "Aspect ratio",
  resolution: "Resolution",
  quality: "Quality",
  duration: "Duration",
  mode: "Quality",
  output_format: "Output format",
  seed: "Seed",
  generate_audio: "Native audio",
  sound: "Native audio",
  keep_original_sound: "Keep original sound",
  image_urls: "Images",
  image_url: "Image",
  image_reference_url: "Image reference",
  first_frame_url: "First frame",
  last_frame_url: "Last frame",
  end_image_url: "Last frame",
  last_image_url: "Last frame",
  audio_url: "Audio",
  audio_urls: "Reference audio",
  video_url: "Video",
  video_urls: "Videos",
  file_url: "Reference file",
  link_url: "Reference link",
  multi_prompt: "Shots",
  multi_shots: "Multi-shot",
  shot_type: "Shot planning",
  elements: "Element IDs",
  color_palette: "Colour palette",
  colors: "Colours",
  background_color: "Background colour",
  rendering_speed: "Rendering",
  image_weight: "Image weight",
  prompt_extend: "Prompt rewriting",
  prompt_extend_mode: "Rewriting mode",
  prompt_optimizer: "Prompt optimiser",
  enhance_prompt: "Enhance prompt",
  enable_thinking: "Thinking mode",
  batch_size: "Images",
  cfg_scale: "Guidance (CFG)",
  character_orientation: "Character orientation",
  bitrate_mode: "Bitrate",
  camera_movement: "Camera move",
  camera_lens: "Lens",
  camera_model: "Camera",
  camera_aperture: "Aperture",
  era: "Era",
  genre: "Genre",
  light: "Lighting",
  pacing: "Pacing",
  fps: "Frame rate",
  aigc_watermark: "AI watermark",
  moderation: "Moderation",
  style_id: "Style ID",
  style_strength: "Style strength",
  custom_reference_id: "Soul ID",
  custom_reference_strength: "Soul ID strength",
  preset_id: "Preset ID",
};

const PROMPT_KEYS = new Set(["prompt"]);
const BAR_KEYS = new Set([
  "aspect_ratio", "resolution", "quality", "duration", "mode", "batch_size", "rendering_speed",
  "character_orientation", "fps", "camera_movement", "genre",
]);
const BAR_TOGGLES = new Set(["generate_audio", "sound", "multi_shots", "keep_original_sound", "enhance_prompt"]);
const GROUPS: Array<[RegExp, string]> = [
  [/seed/, "Reproducibility"],
  [/moderation|watermark/, "Safety"],
  [/prompt|thinking/, "Prompting"],
  [/format|bitrate|fps/, "Output"],
  [/cfg|weight|strength/, "Sampler"],
  [/camera|era|genre|light|pacing|palette/, "Direction"],
  [/color|style|preset|reference_id/, "Style"],
  [/elements|shot/, "Shots"],
];

/** An enum that is a switch in disguise: `sound: "on" | "off"`. */
function switchPair(values: unknown[]): [string, string] | undefined {
  const set = values.map(String).sort().join("/");
  if (set === "off/on") return ["on", "off"];
  if (set === "no/yes") return ["yes", "no"];
  return undefined;
}

function isDurationKey(key: string): boolean {
  return /^duration(_seconds)?$|extend_times/.test(key);
}

/** "4-30 seconds", "between 2 and 15", "3 to 15s" → [min, max]. */
function rangeFromText(desc: string): [number, number] | undefined {
  const m =
    desc.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:s\b|sec|seconds)/i) ??
    desc.match(/between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)/i) ??
    desc.match(/range(?: is)?:?\s*(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)/i);
  if (!m) return undefined;
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  return Number.isFinite(lo) && Number.isFinite(hi) && hi > lo ? [lo, hi] : undefined;
}

function humanize(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isRatioEnum(values: unknown[]): boolean {
  return values.every((v) => /^\d+:\d+$|^auto$|^adaptive$/i.test(String(v)));
}

function isMediaKey(key: string): boolean {
  return /url|image|video|audio|file|frame|mask|voice_sample|upload/.test(key) && !/_id(s)?$|taskId/.test(key);
}

function acceptFor(key: string): "image" | "video" | "audio" {
  if (/video|clip/.test(key)) return "video";
  if (/audio|voice|upload_url|speech|verify_url/.test(key)) return "audio";
  return "image";
}

function sentence(desc: string): string | undefined {
  if (!desc) return undefined;
  // The docs write bullet lists inline (" - ") and wrap identifiers in
  // backticks; neither reads well as a one-line hint.
  const flat = desc.replace(/`/g, "").replace(/^\((Optional|Required)[^)]*\)\s*/i, "");
  const cut = flat.split(/\s+-\s+/)[0].split(/(?<=[.!?])\s+(?=[A-Z])/)[0].trim();
  return cut.length > 150 ? `${cut.slice(0, 149)}…` : cut;
}

/** Tokens that look wrong title-cased: these stay as the industry writes them. */
const ENUM_CAPS = new Set(["hd", "sd", "uhd", "hq", "4k", "2k", "1k", "8k", "ai", "3d", "hdr", "mp3", "mp4", "mov", "wav", "jpg", "png", "pov"]);
/** Abbreviations the API uses that read better spelled out. */
const ENUM_WORDS: Record<string, string> = { std: "Standard", xhigh: "Extra high", f14: "f/1.4", f4: "f/4", f11: "f/11" };

/**
 * An enum value as a person would read it. Only identifiers get rewritten —
 * anything already carrying punctuation (`16:9`, `v2.1`, `1080p`) is left
 * exactly as the API writes it, since that is the name people look for.
 *
 * A trailing pair of numbers is a ratio spelled without its colon, so
 * `portrait_4_3` comes back as "Portrait 4:3" rather than "Portrait 4 3".
 */
function enumLabel(value: string): string {
  if (!/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(value)) return value;
  const parts = value.split(/[_-]/);
  const ratio: string[] = [];
  while (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
    ratio.unshift(parts.pop()!);
  }
  const words = parts.map((word, i) =>
    ENUM_WORDS[word] ??
    (ENUM_CAPS.has(word) ? word.toUpperCase() : i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word),
  );
  if (ratio.length > 1) words.push(ratio.join(":"));
  else if (ratio.length === 1) words.push(ratio[0]);
  return words.join(" ");
}

function enumChoices(prop: SpecProp): Choice[] {
  return (prop.enum ?? []).map((value) => ({
    value: String(value),
    label: prop.enumLabels?.[String(value)]?.split(" - ")[0] ?? enumLabel(String(value)),
    hint: prop.enumLabels?.[String(value)]?.split(" - ").slice(1).join(" · ") || undefined,
  }));
}

function itemFieldsFor(props: Record<string, SpecProp>): ItemField[] {
  return Object.entries(props).map(([key, p]) => {
    let kind: ItemField["kind"] = "text";
    if (p.enum) kind = "select";
    else if (p.type === "boolean") kind = "toggle";
    else if (p.type === "integer" || p.type === "number") kind = "number";
    else if (p.type === "array") kind = "images";
    else if (isMediaKey(key)) kind = "media";
    return {
      key,
      label: humanize(key),
      kind,
      choices: p.enum ? enumChoices(p) : undefined,
      accept: kind === "media" || kind === "images" ? acceptFor(key) : undefined,
      required: p.required,
      min: p.minimum,
      max: p.maximum,
      help: sentence(p.desc),
    };
  });
}

/** Decide kind + placement + bounds for one documented parameter. */
function fieldFor(key: string, prop: SpecProp, override?: Partial<Field>): Field {
  let kind: FieldKind = "text";
  let placement: Placement = "panel";
  const extra: Partial<Field> = {};
  const enumValues = prop.enum ?? [];

  if (prop.type === "array") {
    const itemProps = prop.items?.properties;
    if (itemProps) {
      const keys = Object.keys(itemProps);
      const elementKeys = ["name", "description", "element_input_urls", "element_input_video_urls"];
      if (keys.includes("prompt") && keys.includes("duration") && keys.length === 2) kind = "shots";
      // Nested arrays (Recraft's `colors: [{ rgb: [r, g, b] }]`) have no
      // row editor that fits; raw JSON is honest about the shape.
      else if (Object.values(itemProps).some((p) => p.type === "array" || p.type === "object")) kind = "json";
      else if (keys.includes("element_input_urls") && keys.every((k) => elementKeys.includes(k))) kind = "elements";
      else if (keys.includes("url") && keys.includes("start")) kind = "clips";
      else {
        kind = "records";
        extra.itemFields = itemFieldsFor(itemProps);
      }
      // A clip is a video like any other input: it sits with the pictures.
      placement = kind === "clips" ? "input" : "panel";
      if (kind === "clips") extra.accept = "video";
    } else if (prop.items?.type === "array" || prop.items?.type === "object") {
      kind = "json";
    } else if (/_ids$|_id_list$|mask_indexs/.test(key)) {
      kind = "list";
    } else if (isMediaKey(key) || prop.items?.format === "uri") {
      kind = "images";
      placement = "input";
      extra.accept = acceptFor(key);
    } else {
      kind = "list";
    }
    extra.maxItems = prop.maxItems;
    extra.minItems = prop.minItems;
  } else if (prop.type === "boolean") {
    kind = "toggle";
    placement = BAR_TOGGLES.has(key) ? "bar" : "panel";
    // A required flag with no documented default still has to be sent; off is
    // the only honest starting point.
    if (prop.required && prop.default === undefined) extra.default = false;
  } else if (enumValues.length > 0 && switchPair(enumValues)) {
    const [on] = switchPair(enumValues)!;
    kind = "toggle";
    placement = BAR_TOGGLES.has(key) ? "bar" : "panel";
    extra.default = prop.default === undefined ? undefined : String(prop.default) === on;
  } else if (enumValues.length > 0) {
    const numeric = enumValues.every((v) => typeof v === "number" || /^\d+$/.test(String(v)));
    const contiguous =
      numeric &&
      enumValues.length >= 5 &&
      enumValues.every((v, i) => i === 0 || Number(v) - Number(enumValues[i - 1]) === 1);
    if (contiguous) {
      kind = "slider";
      extra.min = Number(enumValues[0]);
      extra.max = Number(enumValues[enumValues.length - 1]);
      extra.step = 1;
    } else if ((key === "aspect_ratio" || key === "ratio" || key === "image_size" || key === "size") && isRatioEnum(enumValues)) {
      kind = "ratio";
    } else {
      // A segmented row divides one line between its options, so it only
      // works while the labels are short. Six of them reading "landscape_16_9"
      // squeeze to nothing and spill out of the popover — those want the list.
      // The "Auto" an optional choice gets (below) takes a place in the row too.
      const labels = enumValues.map((v) => enumLabel(String(v)));
      if (!prop.required && prop.default === undefined) labels.unshift("Auto");
      const room = labels.reduce((sum, l) => sum + l.length, 0) <= 26 && labels.every((l) => l.length <= 12);
      kind = labels.length <= 5 && room ? "segmented" : "select";
    }
    placement = BAR_KEYS.has(key) ? "bar" : "panel";
  } else if (prop.type === "integer" || prop.type === "number") {
    // Bounds are often only in prose ("4-30 seconds", "between 2 and 15").
    const [lo, hi] = [prop.minimum, prop.maximum].every((v) => v !== undefined)
      ? [prop.minimum!, prop.maximum!]
      : rangeFromText(prop.desc) ?? (isDurationKey(key) ? [1, 15] : [undefined, undefined]);
    if (lo !== undefined && hi !== undefined && !/seed/.test(key)) {
      kind = "slider";
      extra.min = lo;
      extra.max = hi;
      const span = hi - lo;
      extra.step = prop.type === "integer" ? 1 : span <= 2 ? 0.01 : span <= 30 ? 0.1 : 1;
    } else {
      kind = "number";
      extra.min = prop.minimum;
      extra.max = prop.maximum;
    }
    placement = key === "duration" || key === "duration_seconds" || key === "extend_times" || key === "n" ? "bar" : "panel";
  } else if (prop.type === "object") {
    // Wan 3.0 documents single URLs as objects; treat them as media.
    kind = isMediaKey(key) ? "media" : "json";
    placement = kind === "media" ? "input" : "panel";
    if (kind === "media") extra.accept = acceptFor(key);
  } else {
    if (PROMPT_KEYS.has(key)) {
      kind = "textarea";
      placement = "prompt";
    } else if (isDurationKey(key)) {
      const [lo, hi] = rangeFromText(prop.desc) ?? [1, 15];
      kind = "slider";
      placement = "bar";
      extra.min = lo;
      extra.max = hi;
      extra.step = 1;
    } else if (prop.format === "uri" || (isMediaKey(key) && !/name|description|_id/.test(key))) {
      kind = "media";
      placement = "input";
      extra.accept = acceptFor(key);
    } else {
      kind = "text";
      placement = BAR_KEYS.has(key) ? "bar" : "panel";
    }
  }

  if ((kind === "slider" || kind === "segmented") && /^duration(_seconds)?$/.test(key)) {
    extra.chip = (v) => (v === undefined || v === "" ? "Duration" : `${v}s`);
  }
  if ((kind === "slider" || kind === "segmented") && /^(n|num_images|max_images|batch_size)$/.test(key)) extra.chip = (v) => `${v}×`;

  const group = placement === "panel" ? GROUPS.find(([re]) => re.test(key))?.[1] ?? "Options" : undefined;

  let choices = enumValues.length > 0 && kind !== "slider" && kind !== "toggle" ? enumChoices(prop) : undefined;
  // An optional choice with no documented default is the model's to make
  // when left out, so leaving it out has to stay possible.
  if (choices && !prop.required && prop.default === undefined) {
    choices = [{ value: "", label: "Auto", hint: "Let the model decide" }, ...choices];
  }

  const field: Field = {
    key,
    label: humanize(key),
    kind,
    placement,
    choices,
    default: prop.default,
    help: sentence(prop.desc),
    group,
    ...extra,
    ...override,
  };
  if (field.kind === "textarea" && !field.placeholder) {
    field.placeholder = key === "prompt" ? "Describe what you want to see…" : `${field.label}…`;
  }
  return field;
}

/* ------------------------------------------------------------------ *
 * Family → ModelDef
 * ------------------------------------------------------------------ */

/**
 * One endpoint a family can send to: a mode, at one tier. Families without
 * tiers have one unit per mode.
 */
interface Unit {
  mode: ModeSpec;
  /** "" for a mode without tiers. */
  tier: string;
  spec: Spec;
  keys: string[];
  required: Set<string>;
  props: Record<string, SpecProp>;
}

const unitId = (mode: string, tier: string) => `${mode}|${tier}`;

function resolveUnit(mode: ModeSpec, tier: string, endpointId: string, familyId: string): Unit {
  const spec = SPECS[endpointId];
  if (!spec) throw new Error(`[registry] ${familyId}/${mode.id}: no catalogue entry for ${endpointId}`);
  const props = spec.top;
  let keys = Object.keys(props);
  const required = new Set(keys.filter((k) => props[k].required));
  if (mode.only) keys = keys.filter((k) => mode.only!.includes(k));
  if (mode.hide) keys = keys.filter((k) => !mode.hide!.includes(k));
  if (mode.fixed) keys = keys.filter((k) => !(k in mode.fixed!));
  for (const k of mode.require ?? []) required.add(k);
  for (const k of [...required]) if (!keys.includes(k)) required.delete(k);
  return { mode, tier, spec, keys, required, props };
}

function coerce(value: unknown, prop: SpecProp | undefined, kind: FieldKind): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (kind === "json") {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (!prop) return value;
  const pair = prop.enum ? switchPair(prop.enum) : undefined;
  if (pair && typeof value === "boolean") return value ? pair[0] : pair[1];
  const numericEnum = prop.enum?.length ? prop.enum.every((v) => typeof v === "number") : false;
  if (prop.type === "integer" || prop.type === "number" || numericEnum) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  if (prop.type === "boolean") return value === true || value === "true";
  if (prop.type === "string" && typeof value === "number") return String(value);
  return value;
}

export function familyToModel(family: Family): ModelDef {
  const units: Unit[] = [];
  for (const mode of family.modes) {
    const tiers = mode.tiers ? Object.entries(mode.tiers) : [["", mode.model] as [string, string]];
    for (const [tier, endpoint] of tiers) units.push(resolveUnit(mode, tier, endpoint, family.id));
  }
  const firstMode = family.modes[0];

  /** The unit the current values point at; an unknown tier falls back to the mode's first. */
  function unitFor(v: Values): Unit {
    const mode = family.modes.find((m) => m.id === v.__mode) ?? firstMode;
    const tiers = mode.tiers ? Object.keys(mode.tiers) : [""];
    const tier = tiers.includes(v[TIER_KEY]) ? (v[TIER_KEY] as string) : tiers[0];
    return units.find((u) => u.mode.id === mode.id && u.tier === tier)!;
  }
  const currentUnit = (v: Values) => {
    const u = unitFor(v);
    return unitId(u.mode.id, u.tier);
  };

  // The same key can mean slightly different things per endpoint (LTX Fast
  // offers 4K, Pro stops at 1080p). One field per distinct definition, each
  // shown only where it applies. An aspect ratio is also split by whether
  // its endpoint takes a reference picture: there the studio can offer an
  // "Auto" the API lacks (see below).
  const fields: Field[] = [];
  const variants = new Map<string, { key: string; prop: SpecProp; units: Set<string>; required: boolean; fromInput: boolean }>();
  for (const unit of units) {
    for (const key of unit.keys) {
      const prop = unit.props[key];
      const { required: _ignored, ...shape } = prop;
      const fromInput =
        RATIO_KEY.test(key) &&
        unit.keys.some((k) => k !== key && isMediaKey(k) && !/mask/.test(k) && acceptFor(k) !== "audio");
      const sig = `${key}::${fromInput ? "input" : ""}::${JSON.stringify(shape)}`;
      const entry = variants.get(sig) ?? { key, prop, units: new Set<string>(), required: true, fromInput };
      entry.units.add(unitId(unit.mode.id, unit.tier));
      entry.required = entry.required && unit.required.has(key);
      variants.set(sig, entry);
    }
  }
  for (const { key, prop, units: inUnits, required, fromInput } of variants.values()) {
    const field = fieldFor(key, prop, family.fields?.[key]);
    // An endpoint that edits or animates a picture, whose API has no "auto"
    // ratio: offer one anyway. It is resolved when sending, to whichever
    // listed ratio sits closest to the first reference's shape.
    const choices = field.choices ?? [];
    if (
      fromInput &&
      choices.length > 1 &&
      !choices.some((c) => /^(auto|adaptive)$/i.test(c.value)) &&
      choices.every((c) => ratioNumber(c.value) !== undefined)
    ) {
      field.choices = [{ value: "auto", label: "Auto", hint: "Matches the reference" }, ...choices];
      field.autoFrom = "input";
    }
    if (inUnits.size < units.length) {
      const previous = field.when;
      field.when = (v: Values) => inUnits.has(currentUnit(v)) && (!previous || previous(v));
    }
    field.required = required;
    // What a run cannot go without belongs in view, not in the drawer.
    if (required && field.placement === "panel" && field.default === undefined && !family.fields?.[key]?.placement) {
      field.placement = "input";
      field.group = undefined;
    }
    fields.push(field);
  }

  // A tier picker for each distinct set of tiers the modes offer.
  const tierFields: Field[] = [];
  const tierSets = new Map<string, Set<string>>();
  for (const mode of family.modes) {
    const tiers = Object.keys(mode.tiers ?? {});
    if (tiers.length < 2) continue;
    const sig = tiers.join(",");
    if (!tierSets.has(sig)) tierSets.set(sig, new Set());
    tierSets.get(sig)!.add(mode.id);
  }
  for (const [sig, modeIds] of tierSets) {
    const tiers = sig.split(",");
    const allModes = modeIds.size === family.modes.length;
    tierFields.push({
      key: TIER_KEY,
      label: family.tier?.label ?? "Tier",
      // Four labels no longer share one row in the chip's popover.
      kind: tiers.length > 3 ? "select" : "segmented",
      placement: "bar",
      default: tiers[0],
      choices: tiers.map(
        (t) => family.tier?.choices.find((c) => c.value === t) ?? { value: t, label: enumLabel(t) },
      ),
      when: allModes ? undefined : (v: Values) => modeIds.has((v.__mode as string) ?? firstMode.id),
    });
  }

  // Prompt first, then media, then the tier, then everything else in
  // documented order — by key, so a chip keeps its place across modes and
  // tiers even when its definition differs between them.
  const order = new Map<string, number>();
  for (const unit of units) for (const key of unit.keys) if (!order.has(key)) order.set(key, order.size);
  const rank = (f: Field) => (f.placement === "prompt" ? 0 : f.placement === "input" ? 1 : f.placement === "bar" ? 2 : 3);
  fields.sort((a, b) => rank(a) - rank(b) || order.get(a.key)! - order.get(b.key)!);
  const firstBar = fields.findIndex((f) => rank(f) >= 2);
  fields.splice(firstBar < 0 ? fields.length : firstBar, 0, ...tierFields);

  const tags = family.tags ?? [...new Set(family.modes.map((m) => m.label.toLowerCase()))];
  const isActive = (field: Field, v: Values) => !field.when || field.when(v);

  return {
    id: family.id,
    name: family.name,
    vendor: family.vendor,
    category: family.category,
    output: family.output,
    tagline: family.tagline,
    tags,
    badge: family.badge,
    docs: units[0]?.spec.doc,
    modes: family.modes.map(({ id, label, hint }) => ({ id, label, hint })),
    defaultMode: firstMode?.id,
    fields,
    creditHint: family.creditHint,
    featured: family.featured,
    prompts: family.prompts,
    validate(v) {
      const unit = unitFor(v);
      for (const key of unit.required) {
        const val = v[key];
        const empty = Array.isArray(val) ? val.length === 0 : val === undefined || val === null || val === "";
        if (empty) return `Add ${(fields.find((f) => f.key === key)?.label ?? humanize(key)).toLowerCase()} to continue.`;
      }
      for (const field of fields) {
        if (field.kind !== "clips" || !unit.keys.includes(field.key)) continue;
        const clips = Array.isArray(v[field.key]) ? (v[field.key] as Partial<Clip>[]) : [];
        for (const clip of clips) {
          const problem = clipProblem(clip);
          if (problem) return problem;
        }
      }
      return family.validate?.(v) ?? null;
    },
    build(v) {
      const unit = unitFor(v);
      const input: Record<string, unknown> = {};
      for (const key of unit.keys) {
        // Only what is on screen goes out: shots typed before multi-shot was
        // switched off stay in the values but not in the request.
        const field = fields.find((f) => f.key === key && isActive(f, v));
        if (!field) continue;
        const val = coerce(v[key], unit.props[key], field.kind);
        if (val === undefined) continue;
        if (Array.isArray(val) && val.length === 0) continue;
        input[key] = val;
      }
      Object.assign(input, unit.mode.fixed ?? {});
      return { endpoint: unit.spec.endpoint, payload: compact(input) };
    },
  };
}
