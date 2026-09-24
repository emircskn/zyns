import type { Values } from "@/lib/registry";

const NAMED: Record<string, string> = {
  square: "1 / 1",
  square_hd: "1 / 1",
  portrait_4_3: "3 / 4",
  portrait_3_2: "2 / 3",
  portrait_16_9: "9 / 16",
  landscape_4_3: "4 / 3",
  landscape_3_2: "3 / 2",
  landscape_16_9: "16 / 9",
  landscape_21_9: "21 / 9",
};

const RATIO_KEYS = ["aspect_ratio", "aspectRatio", "ratio", "image_size", "size"];

/** Width over height for a ratio choice ("16:9", "portrait_4_3"), if it is one. */
export function ratioNumber(value: string): number | undefined {
  const named = NAMED[value];
  const match = (named ?? value).match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
  if (!match) return undefined;
  const ratio = Number(match[1]) / Number(match[2]);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined;
}

/**
 * Best guess at the shape a run will come back in, so gallery tiles reserve
 * the right space instead of jumping when the media loads.
 */
export function aspectFromValues(values: Values, fallback = "16 / 9"): string {
  for (const key of RATIO_KEYS) {
    const value = values[key];
    if (typeof value !== "string" || !value) continue;
    if (NAMED[value]) return NAMED[value];
    const match = value.match(/^(\d+):(\d+)$/);
    if (match) return `${match[1]} / ${match[2]}`;
  }
  return fallback;
}
