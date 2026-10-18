/**
 * Declarative model registry.
 *
 * Every KIE model describes its own inputs here — which controls exist, what
 * values they accept, when they are relevant — and the studio renders exactly
 * that. Adding a model means adding a `ModelDef`, never touching the UI.
 *
 * Field/enum values mirror the KIE API contract (schemas cross-checked against
 * the official `@felores/kie-ai-core` tool definitions and docs.kie.ai).
 */

export type Category = "image" | "video" | "audio" | "tool";

export type FieldKind =
  | "textarea"
  | "text"
  | "select"
  | "segmented"
  | "ratio"
  | "slider"
  | "number"
  | "toggle"
  | "images"
  | "media"
  | "shots"
  | "elements"
  | "clips"
  | "records"
  | "list"
  | "json"
  | "source"
  /** A Soul ID character from the library, sent by its id (`soul` says for which Soul model). */
  | "soul";

/**
 * Where a control lives in the studio chrome:
 *  - `prompt` : the big prompt / lyrics textarea
 *  - `input`  : the reference-media strip above the prompt
 *  - `bar`    : a chip in the prompt bar (the options you touch every run)
 *  - `panel`  : the advanced settings drawer
 */
export type Placement = "prompt" | "input" | "bar" | "panel";

export interface Choice {
  value: string;
  label: string;
  hint?: string;
  badge?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Values = Record<string, any>;

export interface Field {
  /** Keeps a slot of its own instead of joining the shared "add media" box (a video's start and end frames). */
  ownSlot?: boolean;
  /** A word in the corner of its empty slot ("Optional"). */
  tag?: string;
  key: string;
  label: string;
  kind: FieldKind;
  placement: Placement;
  choices?: Choice[];
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  /** For `images` / `clips`: how many items may be attached. */
  maxItems?: number;
  minItems?: number;
  /** For `media` / `images`: which file type the picker accepts. */
  accept?: "image" | "video" | "audio";
  placeholder?: string;
  help?: string;
  /** A plain-words note behind a small "?" next to a toggle chip, shown on hover. */
  explain?: string;
  required?: boolean;
  /** Short icon/glyph for the chip. */
  icon?: string;
  /** Render only when this predicate passes (values include `__mode`). */
  when?: (v: Values) => boolean;
  /** Custom chip caption; defaults to the selected choice label. */
  chip?: (value: unknown, v: Values) => string;
  /** Group heading inside the advanced panel. */
  group?: string;
  /**
   * An aspect ratio's "Auto" that the API itself lacks: when sending, the
   * studio swaps it for the choice nearest the first reference's shape.
   */
  autoFrom?: "input";
  /** For `records`: the simple columns each row has. */
  itemFields?: ItemField[];
  /** For `source`: which earlier result the field points at. */
  source?: SourceSpec;
  /** For `soul`: the Soul model its characters are trained for. */
  soul?: "v1" | "v2" | "cinema";
}

/**
 * Something an earlier run made that a field refers to by ID rather than by
 * file: the run itself (to extend or upscale it), one of a song's tracks,
 * or a character or voice made for reuse.
 */
export interface SourceSpec {
  of: "task" | "track" | "character" | "voice";
  /** Models whose runs qualify; the field's own model when left out. */
  models?: string[];
  /** How many may be picked; one when left out. */
  max?: number;
}

/** One column of a `records` editor (array-of-objects parameters). */
export interface ItemField {
  key: string;
  label: string;
  kind: "text" | "number" | "select" | "toggle" | "media" | "images";
  choices?: Choice[];
  /** What a new row starts with: the docs' default, or a required choice's first option. */
  default?: unknown;
  accept?: "image" | "video" | "audio";
  required?: boolean;
  min?: number;
  max?: number;
  help?: string;
}

export interface Mode {
  id: string;
  label: string;
  hint?: string;
  /** Which media the mode expects, used for the mode strip icons. */
  icon?: string;
  /** Folded into another tab (see AutoMode): sent, but not offered. */
  hidden?: boolean;
  /**
   * Works on an earlier result (Extend, Upscale, Stems): offered on that
   * result rather than as a tab, and names the field that points at it.
   */
  action?: string;
}

/**
 * A model's "from text" and "from a picture" modes shown as one. Nano Banana's
 * Generate and Edit, or a video model's Text to video and Image to video, are
 * the same request with or without a picture. So the studio shows one tab and
 * the picture slot in it, and which of the two is sent depends on whether a
 * picture is in the slot.
 */
export interface AutoMode {
  /** The mode sent when the slot is empty; also the one the strip shows. */
  text: string;
  /** The mode sent once the slot holds a picture. */
  image: string;
  /** The slot: the image mode's picture field. */
  field: string;
  /**
   * A video model's Reference mode folded in too, as Higgsfield's Create
   * Video does: references (images, clips, audio) or frames (start, end),
   * one tab, chosen by `__inputs`. The mode follows what is filled.
   */
  refs?: { mode: string; fields: string[]; frames: string[] };
  /** Every mode the tab stands for, when it is more than the three above (a hand-made fold). */
  members?: string[];
  /** Which of them these values send in, when a hand-made fold decides it. */
  pick?: (values: Values) => string;
}

/** Which polling endpoint family a task belongs to. */
export type PollKind = "jobs" | "veo" | "suno" | "mj" | "flux" | "aleph";

export interface BuildResult {
  /** Path relative to the provider's API: https://api.kie.ai or https://api.higgsfield.ai */
  endpoint: string;
  payload: Record<string, unknown>;
  /** KIE only: which status endpoint reports on the task. */
  poll?: PollKind;
}

/** Where a model runs, and whose key pays for it. */
export type Provider = "kie" | "higgsfield";

export interface ModelDef {
  id: string;
  /** KIE when left out. */
  provider?: Provider;
  name: string;
  vendor: string;
  category: Category;
  /** Media the model returns — drives result rendering. */
  output: "image" | "video" | "audio";
  tagline: string;
  tags: string[];
  badge?: string;
  docs?: string;
  modes?: Mode[];
  defaultMode?: string;
  /** Set where two modes differ only by a picture; see AutoMode. */
  autoMode?: AutoMode;
  fields: Field[];
  build: (v: Values) => BuildResult;
  /** Returns a human message when the current values cannot be submitted. */
  validate?: (v: Values) => string | null;
  /** Optional cost hint shown next to the generate button. */
  creditHint?: (v: Values) => string | undefined;
  featured?: boolean;
  prompts?: string[];
  /** Higgsfield: the catalogue's preview of what the model makes. */
  preview?: { video?: string; poster?: string; image?: string };
  /** Higgsfield: its catalogue price, as people read it ("from $0.14/s"). */
  price?: string;
  /** A one-click app that lives on its own page (Apps, Effects), not in the model picker. */
  app?: AppPage;
  /** The select shown as a grid of cards (AI Influencer's character type); each choice's badge is its picture. */
  gridField?: string;
  /** The model that really carries the request, for the app's page to name. */
  runsOn?: (v: Values) => string;
  /** The first picture is painted over to mark the area to change; the mask goes in as `mask`. */
  draw?: boolean;
}

/** The menu pages that hold one-click apps. */
export type AppPage = "apps" | "effects" | "influencer" | "katana" | "ads";

export const MODE_KEY = "__mode";

export function modeOf(v: Values): string {
  return (v[MODE_KEY] as string) ?? "";
}

/**
 * A list of records with each row's missing columns filled from their
 * defaults: a row made before the defaults existed (ElevenLabs Dialogue's
 * lines without a voice) still goes out whole.
 */
export function withItemDefaults(field: Field | undefined, value: unknown): unknown {
  if (!field || field.kind !== "records" || !Array.isArray(value) || !field.itemFields) return value;
  return value.map((row) => {
    if (!row || typeof row !== "object") return row;
    const out = { ...(row as Record<string, unknown>) };
    for (const column of field.itemFields!) {
      if ((out[column.key] === undefined || out[column.key] === "") && column.default !== undefined) out[column.key] = column.default;
    }
    return out;
  });
}

/** Drop undefined / empty-string / empty-array entries before sending. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === "string" && val.trim() === "") continue;
    if (Array.isArray(val) && val.length === 0) continue;
    out[k] = val;
  }
  return out;
}

export function has(v: unknown): boolean {
  return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "";
}

/** A model's quality tier, when each tier is its own endpoint (Kling 3.0 Standard / Pro / 4K). */
export const TIER_KEY = "__tier";
