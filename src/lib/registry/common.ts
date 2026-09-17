import type { Choice, Field, Values } from "./types";

/** Aspect-ratio label set shared by the ratio picker. */
export function ratios(...list: string[]): Choice[] {
  return list.map((value) => ({ value, label: value }));
}

export function choices(pairs: Array<[string, string] | [string, string, string]>): Choice[] {
  return pairs.map(([value, label, hint]) => ({ value, label, hint }));
}

export const RES_1K_2K_4K = choices([
  ["1K", "1K", "Fast, cheapest"],
  ["2K", "2K", "Balanced"],
  ["4K", "4K", "Maximum detail"],
]);

export const RES_720_1080 = choices([
  ["720p", "720p", "Faster, cheaper"],
  ["1080p", "1080p", "Full HD"],
]);

export const PNG_JPEG = choices([
  ["png", "PNG", "Lossless"],
  ["jpeg", "JPEG", "Smaller files"],
]);

/** The prompt textarea every generative model shares. */
export function promptField(over: Partial<Field> = {}): Field {
  return {
    key: "prompt",
    label: "Prompt",
    kind: "textarea",
    placement: "prompt",
    required: true,
    placeholder: "Describe what you want to see…",
    ...over,
  };
}

export function seedField(
  over: Partial<Field> = {},
): Field {
  return {
    key: "seed",
    label: "Seed",
    kind: "number",
    placement: "panel",
    group: "Reproducibility",
    min: 0,
    max: 2147483647,
    help: "Same seed + same prompt reproduces a run. Leave empty for random.",
    ...over,
  };
}

export function negativePromptField(max = 500): Field {
  return {
    key: "negative_prompt",
    label: "Negative prompt",
    kind: "text",
    placement: "panel",
    group: "Prompting",
    placeholder: "blurry, distorted hands, watermark…",
    help: `Content to steer away from (max ${max} characters).`,
  };
}

/** `when` helper: current mode is one of the given ids. */
export function inMode(...ids: string[]) {
  return (v: Values) => ids.includes(v.__mode);
}

/** Numeric value or undefined — number inputs hand back strings. */
export function num(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function int(value: unknown): number | undefined {
  const n = num(value);
  return n === undefined ? undefined : Math.round(n);
}

export function bool(value: unknown): boolean {
  return value === true || value === "true";
}

export function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function first(value: unknown): string | undefined {
  const l = list(value);
  return l.length > 0 ? l[0] : undefined;
}
