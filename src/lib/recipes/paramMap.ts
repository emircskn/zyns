/**
 * Recipe parameters travel under common names — prompt, images, video,
 * audio, aspect_ratio, resolution, duration — and each model takes them under
 * its own (KIE's Kling motion control wants `input_urls` and `video_urls`,
 * Higgsfield's `image_urls` and `video_url`). This finds each model's own
 * field for each common name from its form, in the mode the step runs.
 * Anything a model cannot take is left out and reported, never forced.
 */
import { ratioNumber } from "@/lib/aspect";
import { activeFields, defaultValues, type Field, type ModelDef, type Values } from "@/lib/registry";

export interface CommonParams {
  prompt?: string;
  images?: string[];
  video?: string;
  audio?: string;
  aspect_ratio?: string;
  resolution?: string;
  duration?: number;
  /** Anything else is passed under its own name when the model has a field of that name. */
  [key: string]: unknown;
}

/**
 * Where a model's form disagrees with what the common names find, the field
 * to use instead, by model id then common name. Empty while the automatic
 * matching gets every model right.
 */
export const PARAM_MAP: Record<string, Partial<Record<keyof CommonParams, string>>> = {};

const RATIO_KEY = /^(aspect_ratio|aspectRatio|ratio|image_size|size)$/;
const DURATION_KEY = /^duration(_seconds)?$/;

function accepts(field: Field, kind: "image" | "video" | "audio"): boolean {
  if (field.kind !== "images" && field.kind !== "media") return false;
  if (/mask/.test(field.key)) return false;
  return (field.accept ?? "image") === kind;
}

function nearestChoice(field: Field, wanted: string): string | undefined {
  const choices = (field.choices ?? []).map((c) => c.value).filter((v) => v !== "" && v !== "auto");
  const exact = choices.find((v) => v.toLowerCase() === wanted.toLowerCase());
  if (exact) return exact;
  const target = ratioNumber(wanted);
  if (target === undefined) return undefined;
  let best: string | undefined;
  let gap = Infinity;
  for (const value of choices) {
    const r = ratioNumber(value);
    if (r !== undefined && Math.abs(Math.log(r / target)) < gap) {
      gap = Math.abs(Math.log(r / target));
      best = value;
    }
  }
  return best;
}

function nearestNumber(field: Field, wanted: number): number | string | undefined {
  if (field.kind === "slider" || field.kind === "number") {
    const lo = field.min ?? -Infinity;
    const hi = field.max ?? Infinity;
    return Math.min(hi, Math.max(lo, wanted));
  }
  const values = (field.choices ?? []).map((c) => c.value).filter((v) => v !== "" && Number.isFinite(Number(v)));
  if (values.length === 0) return undefined;
  return values.reduce((best, v) => (Math.abs(Number(v) - wanted) < Math.abs(Number(best) - wanted) ? v : best));
}

/** The model's values for one step: its defaults in `mode`, with the step's parameters put where the model takes them. */
export function mapParams(
  model: ModelDef,
  mode: string | undefined,
  params: CommonParams,
): { values: Values; warnings: string[]; mapped: string[] } {
  const values: Values = { ...defaultValues(model), ...(mode ? { __mode: mode } : {}) };
  // Defaults of fields that only exist in the chosen mode.
  for (const field of activeFields(model, values)) {
    if (field.default !== undefined && values[field.key] === undefined) values[field.key] = field.default;
  }
  const fields = activeFields(model, values);
  const start = { ...values };
  const override = PARAM_MAP[model.id] ?? {};
  const warnings: string[] = [];
  const byKey = (key: string | undefined) => (key ? fields.find((f) => f.key === key) : undefined);
  const skip = (name: string) => warnings.push(`${model.name} has no ${name.replace("_", " ")} here; left out.`);

  if (params.prompt) {
    const field = byKey(override.prompt) ?? fields.find((f) => f.placement === "prompt");
    if (field) values[field.key] = params.prompt;
    else skip("prompt");
  }

  const media = (kind: "image" | "video" | "audio", urls: string[], name: string) => {
    if (urls.length === 0) return;
    const forced = byKey(override[name]);
    // What the model cannot go without is filled first: a source clip before
    // reference clips, a first frame before a last one.
    const slots = forced
      ? [forced]
      : fields
          .filter((f) => f.placement === "input" && accepts(f, kind))
          .sort((a, b) => Number(!!b.required) - Number(!!a.required));
    if (slots.length === 0) return skip(name);
    let rest = [...urls];
    for (const field of slots) {
      if (rest.length === 0) break;
      if (field.kind === "images") {
        const room = field.maxItems ?? rest.length;
        values[field.key] = rest.slice(0, room);
        rest = rest.slice(room);
      } else {
        values[field.key] = rest[0];
        rest = rest.slice(1);
      }
    }
    if (rest.length > 0) warnings.push(`${model.name} takes fewer ${name} here; ${rest.length} left out.`);
  };
  media("image", params.images ?? [], "images");
  media("video", params.video ? [params.video] : [], "video");
  media("audio", params.audio ? [params.audio] : [], "audio");

  if (params.aspect_ratio) {
    const field = byKey(override.aspect_ratio) ?? fields.find((f) => RATIO_KEY.test(f.key) && f.choices?.length);
    const value = field && nearestChoice(field, params.aspect_ratio);
    if (field && value) {
      values[field.key] = value;
      if (value !== params.aspect_ratio) warnings.push(`${model.name} has no ${params.aspect_ratio}; used ${value}.`);
    } else skip("aspect_ratio");
  }
  if (params.resolution) {
    const field = byKey(override.resolution) ?? fields.find((f) => f.key === "resolution");
    const value = field && nearestChoice(field, params.resolution);
    if (field && value) values[field.key] = value;
    else skip("resolution");
  }
  if (params.duration !== undefined) {
    const field = byKey(override.duration) ?? fields.find((f) => DURATION_KEY.test(f.key));
    const value = field && nearestNumber(field, Number(params.duration));
    if (field && value !== undefined) {
      values[field.key] = value;
      if (Number(value) !== Number(params.duration)) warnings.push(`${model.name} cannot do ${params.duration}s; used ${value}s.`);
    } else skip("duration");
  }

  const common = new Set(["prompt", "images", "video", "audio", "aspect_ratio", "resolution", "duration"]);
  for (const [name, value] of Object.entries(params)) {
    if (common.has(name) || value === undefined) continue;
    if (fields.some((f) => f.key === name)) values[name] = value;
    else skip(name);
  }
  const mapped = Object.keys(values).filter((key) => key !== "__mode" && values[key] !== start[key]);
  return { values, warnings, mapped };
}
