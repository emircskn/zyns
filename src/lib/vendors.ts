import type { Brand } from "@/lib/brandIcons";

/**
 * Which maker's mark a model wears. Chosen by the model line rather than by
 * the vendor field, because the two part ways: Qwen, Wan and HappyHorse all
 * come from Alibaba, yet Qwen and Wan carry Qwen's mark and HappyHorse
 * Alibaba's. First match wins, so the order only matters where one prefix
 * starts another.
 */
const BRAND_BY_LINE: Array<[RegExp, Brand]> = [
  [/^(nano-banana|imagen|veo|gemini)/, "google"],
  [/^(seedream|seedance)/, "bytedance"],
  [/^(gpt-image|4o-image)/, "openai"],
  [/^flux/, "flux"],
  [/^grok/, "xai"],
  [/^ideogram/, "ideogram"],
  [/^(qwen|wan|z-image)/, "qwen"],
  [/^kling/, "kling"],
  [/^(hailuo|minimax)/, "minimax"],
  [/^happyhorse/, "alibaba"],
  [/^pixverse/, "pixverse"],
  [/^runway/, "runway"],
  [/^suno/, "suno"],
  [/^elevenlabs/, "elevenlabs"],
  [/^topaz/, "topazlabs"],
  [/^recraft/, "recraft"],
];

export function brandOf(modelId: string): Brand | undefined {
  return BRAND_BY_LINE.find(([line]) => line.test(modelId))?.[1];
}

/**
 * The monogram a model falls back to when no maker's mark is on file for it:
 * two letters on the same tile, so an unmapped model still fits the row.
 */
export const VENDORS: Record<string, string> = {
  Google: "G",
  "Google DeepMind": "DM",
  ByteDance: "BD",
  OpenAI: "AI",
  "Black Forest Labs": "BF",
  xAI: "X",
  Ideogram: "Id",
  Alibaba: "Al",
  "Tongyi-MAI": "Ty",
  Recraft: "Rc",
  "Topaz Labs": "Tz",
  ElevenLabs: "11",
  Suno: "Su",
  Kuaishou: "Kl",
  MiniMax: "Mx",
  Runway: "Rw",
  PixVerse: "Px",
};

export function vendorMark(vendor: string): string {
  return VENDORS[vendor] ?? vendor.slice(0, 2);
}

/** Deterministic hue offset so every family gets its own cover, not the category's. */
export function familyHue(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
