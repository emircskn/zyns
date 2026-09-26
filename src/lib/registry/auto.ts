/**
 * Turns a curated family (a product line with its modes) plus the generated
 * catalogue (the request schemas scraped from docs.kie.ai) into a ModelDef
 * the studio can render. Nothing here knows about any particular model —
 * every control, default and limit comes from the docs, and every grouping
 * decision comes from curation.ts.
 */
import catalog from "./generated/catalog.json";
import type { Category, Choice, Field, FieldKind, ItemField, ModelDef, Placement, Values } from "./types";
import { compact } from "./types";
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
  model: string | null;
  endpoint: string;
  doc: string;
  title: string;
  crumb: string;
  input: Record<string, SpecProp> | null;
  variants: Array<{ title: string; keys: string[]; required: string[] }> | null;
  top: Record<string, SpecProp> | null;
}

const SPECS: Record<string, Spec> = {};
for (const spec of (catalog as unknown as { specs: Spec[] }).specs) {
  SPECS[spec.model ?? spec.doc.split("/").pop()!] = spec;
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
  /** KIE model id (or catalogue key for model-less endpoints). */
  model: string;
  hint?: string;
  /** Title of the docs' oneOf variant this mode represents. */
  variant?: string;
  /** Borrow the request schema from another catalogue entry. */
  schemaFrom?: string;
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
  text: "Text",
  negative_prompt: "Negative prompt",
  negative_tags: "Exclude styles",
  aspect_ratio: "Aspect ratio",
  ratio: "Aspect ratio",
  image_size: "Image size",
  size: "Size",
  resolution: "Resolution",
  image_resolution: "Resolution",
  output_resolution: "Resolution",
  quality: "Quality",
  duration: "Duration",
  duration_seconds: "Duration",
  mode: "Mode",
  model: "Version",
  output_format: "Output format",
  seed: "Seed",
  seeds: "Seed",
  nsfw_checker: "NSFW filter",
  enable_safety_checker: "Safety checker",
  safety_tolerance: "Safety tolerance",
  generate_audio: "Native audio",
  generate_audio_switch: "Native audio",
  audio: "Native audio",
  sound: "Native audio",
  instrumental: "Instrumental",
  custom_mode: "Custom mode",
  style: "Style",
  title: "Title",
  tags: "Style tags",
  vocal_gender: "Vocal gender",
  style_weight: "Style adherence",
  weirdness_constraint: "Experimentation",
  audio_weight: "Audio weight",
  persona_id: "Persona ID",
  persona_model: "Persona type",
  voice: "Voice",
  stability: "Stability",
  similarity_boost: "Similarity",
  speed: "Speed",
  timestamps: "Word timestamps",
  language_code: "Language code",
  previous_text: "Preceding text",
  next_text: "Following text",
  image_urls: "Images",
  image_url: "Image",
  input_urls: "Reference images",
  image_input: "Reference images",
  reference_image_urls: "Reference images",
  reference_video_urls: "Reference videos",
  reference_audio_urls: "Reference audio",
  reference_image: "Reference images",
  reference_video: "Reference videos",
  reference_voice: "Voice reference",
  reference_file_urls: "Reference file",
  reference_link_urls: "Reference link",
  first_frame_url: "First frame",
  last_frame_url: "Last frame",
  first_frame: "First frame",
  first_frame_image_url: "First frame",
  last_frame_image_url: "Last frame",
  end_image_url: "Last frame",
  tail_image_url: "Last frame",
  first_clip_url: "First clip",
  driving_audio_url: "Driving audio",
  audio_url: "Audio",
  video_url: "Video",
  video_urls: "Videos",
  upload_url: "Audio file",
  upload_url_list: "Audio files",
  mask_url: "Mask",
  task_id: "Task ID",
  taskId: "Task ID",
  audio_id: "Audio ID",
  audio_ids: "Voices",
  character_ids: "Characters",
  extension_task_id: "Continue from task",
  generation_type: "Generation type",
  multi_prompt: "Shots",
  multi_shots: "Multi-shot",
  customize_multi_shots: "Custom shots",
  prefer_multi_shots: "Prefer multi-shot",
  elements: "Elements",
  kling_elements: "Elements",
  video_list: "Video",
  image_references: "References",
  color_palette: "Colour palette",
  bbox_list: "Bounding boxes",
  template_id: "Effect template",
  upscale_factor: "Factor",
  rendering_speed: "Rendering",
  expand_prompt: "Expand prompt",
  prompt_extend: "Prompt rewriting",
  enable_prompt_expansion: "Prompt expansion",
  prompt_optimizer: "Prompt optimiser",
  prompt_upsampling: "Prompt upsampling",
  enable_translation: "Auto-translate prompt",
  enable_fallback: "Content-policy fallback",
  num_images: "Images",
  max_images: "Batch size",
  n: "Images",
  num_inference_steps: "Steps",
  guidance_scale: "Guidance (CFG)",
  cfg_scale: "Guidance (CFG)",
  strength: "Strength",
  acceleration: "Acceleration",
  camera_fixed: "Lock camera",
  fixed_lens: "Lock camera",
  watermark: "Watermark",
  web_search: "Web search grounding",
  google_search: "Google Search grounding",
  thinking_mode: "Thinking mode",
  enable_sequential: "Sequential set",
  return_last_frame: "Return last frame",
  pe_fast_mode: "Fast mode",
  sync_mode: "Sync mode",
  background: "Background",
  character_orientation: "Character orientation",
  background_source: "Background source",
  extend_at: "Extend from (s)",
  extend_times: "Extend by (s)",
  continue_at: "Continue from (s)",
  default_param_flag: "Custom parameters",
  content: "Style description",
  dialogue: "Dialogue",
  speakers: "Speakers",
  dialogue_turns: "Dialogue turns",
  temperature: "Temperature",
  scene: "Scene",
  sample_context: "Context",
  files_url: "Reference images",
  file_url: "Reference image",
  input_image: "Input image",
  sound_loop: "Loop",
  sound_tempo: "Tempo (BPM)",
  sound_key: "Key",
  grab_lyrics: "Capture lyrics",
  stem_name: "Stem",
  type: "Type",
  separate_vocal: "Separate vocals",
  open_scenedet: "Scene detection",
  align_audio: "Align audio",
  align_audio_reverse: "Align in reverse",
  templ_start_seconds: "Template start (s)",
  verify_url: "Verification audio",
  voice_url: "Voice sample",
  vocal_start_s: "Vocal start (s)",
  vocal_end_s: "Vocal end (s)",
  infill_start_s: "Section start (s)",
  infill_end_s: "Section end (s)",
  full_lyrics: "Full lyrics",
  descriptions: "Character description",
  character_name: "Character name",
  name: "Name",
  voice_description: "Voice description",
  example_dialogue: "Example line",
  author: "Author",
  domain_name: "Watermark domain",
  index: "Image index",
  mask_indexs: "Mask indexes",
  enable_pro: "Pro quality",
  upload_cn: "Route uploads via China",
  num_frames: "Frames",
  frames_per_second: "FPS",
  shift: "Shift",
};

const PROMPT_KEYS = new Set(["prompt", "text", "lyrics", "descriptions", "content", "full_lyrics", "voice_description"]);
const BAR_KEYS = new Set([
  "aspect_ratio", "ratio", "image_size", "size", "resolution", "image_resolution", "output_resolution",
  "quality", "duration", "duration_seconds", "mode", "model", "style", "rendering_speed", "upscale_factor",
  "num_images", "max_images", "n", "generation_type", "voice", "speed", "type", "stem_name", "template_id",
  "character_orientation", "background_source", "persona_model", "vocal_gender", "language_code",
  "extend_times", "sound_key", "background", "strength",
]);
const BAR_TOGGLES = new Set([
  "generate_audio", "generate_audio_switch", "audio", "sound", "instrumental", "custom_mode",
  "multi_shots", "customize_multi_shots", "enable_pro", "sound_loop", "loop", "camera_fixed", "fixed_lens",
]);
const GROUPS: Array<[RegExp, string]> = [
  [/seed/, "Reproducibility"],
  [/nsfw|safety|tolerance/, "Safety"],
  [/prompt|translation|expand|extend|optimi|thinking|search/, "Prompting"],
  [/watermark|format|return_last|sync_mode|timestamps|grab_lyrics/, "Output"],
  [/steps|guidance|cfg|acceleration|strength|shift|frames|fps|temperature/, "Sampler"],
  [/weight|weirdness|stability|similarity|style/, "Style"],
  [/persona|voice|vocal|speaker|dialogue/, "Voice"],
  [/task_id|taskId|audio_id|_ids$/, "References"],
];

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
const ENUM_CAPS = new Set(["hd", "sd", "uhd", "hq", "4k", "2k", "8k", "ai", "3d", "hdr", "mp3", "wav"]);

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
  const words = parts.map((word) =>
    ENUM_CAPS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1),
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
      else if (keys.includes("element_input_urls") && keys.every((k) => elementKeys.includes(k))) kind = "elements";
      else if (keys.includes("url") && keys.includes("start")) kind = "clips";
      else {
        kind = "records";
        extra.itemFields = itemFieldsFor(itemProps);
      }
      // A clip is a video like any other input: it sits with the pictures.
      placement = kind === "clips" ? "input" : "panel";
      if (kind === "clips") extra.accept = "video";
    } else if (prop.items?.type === "object" && isMediaKey(key) && !/link/.test(key)) {
      // Wan 3.0 documents its URL lists as lists of objects; its own
      // examples send plain URLs.
      kind = "images";
      placement = "input";
      extra.accept = acceptFor(key);
    } else if (prop.items?.type === "array" || prop.items?.type === "object") {
      kind = "json";
    } else if (key === "character_ids") {
      kind = "source";
      placement = "input";
      extra.source = { of: "character", max: 3 };
    } else if (key === "audio_ids") {
      kind = "source";
      placement = "input";
      extra.source = { of: "voice", max: 3 };
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
      const labels = enumValues.map((v) => enumLabel(String(v)));
      const room = labels.reduce((sum, l) => sum + l.length, 0) <= 34 && labels.every((l) => l.length <= 12);
      kind = enumValues.length <= 6 && room ? "segmented" : "select";
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
    } else if (key === "task_id" || key === "taskId") {
      // An earlier run, picked from the ones made here rather than typed.
      kind = "source";
      placement = "input";
      extra.source = { of: "task" };
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
  if ((kind === "slider" || kind === "segmented") && /^(n|num_images|max_images)$/.test(key)) extra.chip = (v) => `${v}×`;

  const group = placement === "panel" ? GROUPS.find(([re]) => re.test(key))?.[1] ?? "Options" : undefined;

  const field: Field = {
    key,
    label: humanize(key),
    kind,
    placement,
    choices: enumValues.length > 0 && kind !== "slider" ? enumChoices(prop) : undefined,
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

interface ResolvedMode extends ModeSpec {
  spec: Spec;
  keys: string[];
  required: Set<string>;
  props: Record<string, SpecProp>;
}

function resolveMode(mode: ModeSpec, familyId: string): ResolvedMode {
  const spec = SPECS[mode.schemaFrom ?? mode.model] ?? SPECS[mode.model];
  if (!spec) throw new Error(`[registry] ${familyId}/${mode.id}: no catalogue entry for ${mode.model}`);
  const props = spec.input ?? spec.top ?? {};
  let keys = Object.keys(props);
  let required = new Set(keys.filter((k) => props[k].required));
  if (mode.variant) {
    const variant = spec.variants?.find((v) => v.title === mode.variant);
    if (!variant) throw new Error(`[registry] ${familyId}/${mode.id}: no variant "${mode.variant}" on ${mode.model}`);
    keys = variant.keys;
    required = new Set(variant.required);
  }
  if (mode.only) keys = keys.filter((k) => mode.only!.includes(k));
  if (mode.hide) keys = keys.filter((k) => !mode.hide!.includes(k));
  if (mode.fixed) keys = keys.filter((k) => !(k in mode.fixed!));
  for (const k of mode.require ?? []) required.add(k);
  for (const k of [...required]) if (!keys.includes(k)) required.delete(k);
  return { ...mode, spec, keys, required, props };
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
  const modes = family.modes.map((m) => resolveMode(m, family.id));

  // The same key can mean different things per mode: Qwen 2.1 takes an
  // "auto" aspect ratio when editing a picture but not when generating from
  // text. One field per distinct definition, each shown only in the modes
  // it belongs to; taking the first mode's definition for all of them hid
  // options (and defaults) the other modes have.
  //
  // An aspect ratio is also split by whether its mode takes a reference
  // picture: there the studio can offer an "Auto" the API lacks (see below).
  const variants = new Map<string, { key: string; prop: SpecProp; modes: Set<string>; required: boolean; fromInput: boolean }>();
  for (const mode of modes) {
    for (const key of mode.keys) {
      const prop = mode.props[key];
      const { required: _required, ...shape } = prop ?? ({} as SpecProp);
      const fromInput =
        RATIO_KEY.test(key) &&
        mode.keys.some((k) => k !== key && isMediaKey(k) && !/mask/.test(k) && acceptFor(k) !== "audio");
      const sig = `${key}::${fromInput ? "input" : ""}::${JSON.stringify(shape)}`;
      const entry = variants.get(sig) ?? { key, prop, modes: new Set<string>(), required: true, fromInput };
      entry.modes.add(mode.id);
      entry.required = entry.required && mode.required.has(key);
      variants.set(sig, entry);
    }
  }

  const fields: Field[] = [];
  for (const { key, prop, modes: inModes, required, fromInput } of variants.values()) {
    const field = fieldFor(key, prop, family.fields?.[key]);
    // A mode that edits or animates a picture, whose API has no "auto"
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
    if (inModes.size < modes.length) {
      const allowed = new Set(inModes);
      const previous = field.when;
      field.when = (v: Values) => allowed.has(v.__mode) && (!previous || previous(v));
    }
    field.required = required;
    // What a run cannot go without belongs in view, not in the drawer.
    if (required && field.placement === "panel" && field.default === undefined && !family.fields?.[key]?.placement) {
      field.placement = "input";
      field.group = undefined;
    }
    fields.push(field);
  }
  // Prompt first, then media, then everything else in documented order: by
  // where each key first appears, so a key split per mode keeps its place.
  const firstSeen = new Map<string, number>();
  for (const f of fields) if (!firstSeen.has(f.key)) firstSeen.set(f.key, firstSeen.size);
  const rank = (f: Field) => (f.placement === "prompt" ? 0 : f.placement === "input" ? 1 : f.placement === "bar" ? 2 : 3);
  fields.sort((a, b) => rank(a) - rank(b) || firstSeen.get(a.key)! - firstSeen.get(b.key)!);

  const tags = family.tags ?? [...new Set(modes.map((m) => m.label.toLowerCase()))];

  return {
    id: family.id,
    name: family.name,
    vendor: family.vendor,
    category: family.category,
    output: family.output,
    tagline: family.tagline,
    tags,
    badge: family.badge,
    docs: modes[0]?.spec.doc,
    modes: modes.map(({ id, label, hint }) => ({ id, label, hint })),
    defaultMode: modes[0]?.id,
    fields,
    creditHint: family.creditHint,
    featured: family.featured,
    prompts: family.prompts,
    validate(v) {
      const mode = modes.find((m) => m.id === v.__mode) ?? modes[0];
      for (const key of mode.required) {
        const val = v[key];
        const empty = Array.isArray(val) ? val.length === 0 : val === undefined || val === null || val === "";
        if (empty) return `Add ${humanize(key).toLowerCase()} to continue.`;
      }
      for (const field of fields) {
        if (field.kind !== "clips" || !mode.keys.includes(field.key)) continue;
        const clips = Array.isArray(v[field.key]) ? (v[field.key] as Partial<Clip>[]) : [];
        for (const clip of clips) {
          const problem = clipProblem(clip);
          if (problem) return problem;
        }
      }
      return family.validate?.(v) ?? null;
    },
    build(v) {
      const mode = modes.find((m) => m.id === v.__mode) ?? modes[0];
      const input: Record<string, unknown> = {};
      for (const key of mode.keys) {
        const field = fields.find((f) => f.key === key && (!f.when || f.when(v))) ?? fields.find((f) => f.key === key)!;
        const val = coerce(v[key], mode.props[key], field.kind);
        if (val === undefined) continue;
        if (Array.isArray(val) && val.length === 0) continue;
        input[key] = val;
      }
      Object.assign(input, mode.fixed ?? {});
      const payload = mode.spec.top ? compact(input) : { model: mode.model, input };
      return { endpoint: mode.spec.endpoint, poll: "jobs", payload };
    },
  };
}
