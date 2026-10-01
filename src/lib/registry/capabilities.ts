/**
 * What each model can do, for the recipe engine's per-step model picker: a
 * step that needs "image-to-video" offers every model listed for it, and is
 * run in the mode named here (the first, where there are several).
 *
 * Approved by Emir on 2026-09-30 (docs/capabilities-draft.md). Models whose
 * capabilities were left open there carry none here; add one only once it
 * is confirmed.
 */
import type { ModelDef } from "./types";

export type Capability =
  | "text-to-image"
  | "image-edit-multi"
  | "image-to-video"
  | "reference-to-video"
  | "video-edit"
  | "motion-transfer"
  | "object-swap"
  | "lipsync-from-audio"
  | "text-to-speech";

/** Model id → capability → the modes that provide it, preferred first. */
export const CAPABILITIES: Record<string, Partial<Record<Capability, string[]>>> = {
  "nano-banana-2": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "nano-banana-2-lite": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "nano-banana-pro": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "nano-banana": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "imagen-4": { "text-to-image": ["generate"] },
  "imagen-4-fast": { "text-to-image": ["generate"] },
  "imagen-4-ultra": { "text-to-image": ["generate"] },
  "seedream-5-pro": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "seedream-5-flash": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "seedream-5-lite": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "seedream-4-5": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "seedream-4": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "seedream-3": { "text-to-image": ["generate"] },
  "gpt-image-2": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "gpt-image-2-5-flare": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "gpt-image-2-5-sunburst": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "gpt-image-1-5": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "4o-image": { "text-to-image": ["generate"] },
  "flux-2-pro": { "text-to-image": ["generate"], "image-edit-multi": ["reference"] },
  "flux-2-flex": { "text-to-image": ["generate"], "image-edit-multi": ["reference"] },
  "flux-kontext": { "text-to-image": ["generate"] },
  "grok-imagine-image-2": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "grok-imagine-image": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "ideogram-v3": { "text-to-image": ["generate"] },
  "qwen-image": { "text-to-image": ["generate"] },
  "qwen3-image": { "text-to-image": ["generate"], "image-edit-multi": ["image-to-image"] },
  "qwen3-image-pro": { "text-to-image": ["generate"], "image-edit-multi": ["image-to-image"] },
  "qwen2-1-image": { "text-to-image": ["generate"], "image-edit-multi": ["image-to-image"] },
  "wan-2-7-image": { "text-to-image": ["generate"] },
  "wan-2-7-image-pro": { "text-to-image": ["generate"] },
  "z-image": { "text-to-image": ["generate"] },
  "veo-3-1": { "image-to-video": ["frames-to-video"], "reference-to-video": ["reference-to-video"] },
  "seedance-2-5": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "seedance-2": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "seedance-2-fast": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "seedance-2-mini": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "seedance-1-5-pro": { "image-to-video": ["image-to-video"] },
  "seedance-1-pro": { "image-to-video": ["image-to-video"] },
  "seedance-1-pro-fast": { "image-to-video": ["image-to-video"] },
  "seedance-1-lite": { "image-to-video": ["image-to-video"] },
  "kling-3": { "image-to-video": ["image-to-video"] },
  "kling-3-omni": { "image-to-video": ["first-frame", "first-last"], "reference-to-video": ["ref-images"], "video-edit": ["transform-video", "transform-mixed"] },
  "kling-v3-turbo": { "image-to-video": ["image-to-video"] },
  "kling-2-6": { "image-to-video": ["image-to-video"] },
  "kling-2-1-standard": { "image-to-video": ["image-to-video"] },
  "kling-2-1-pro": { "image-to-video": ["image-to-video"] },
  "kling-2-1-master": { "image-to-video": ["image-to-video"] },
  "kling-3-motion-control": { "motion-transfer": ["generate"] },
  "kling-2-6-motion-control": { "motion-transfer": ["generate"] },
  "kling-avatar": { "lipsync-from-audio": ["generate"] },
  "kling-avatar-pro": { "lipsync-from-audio": ["generate"] },
  "minimax-h3": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "hailuo-2-3": { "image-to-video": ["image-to-video"] },
  "hailuo-2-3-pro": { "image-to-video": ["image-to-video"] },
  "hailuo-02": { "image-to-video": ["image-to-video"] },
  "hailuo-02-pro": { "image-to-video": ["image-to-video"] },
  "wan-3": { "image-to-video": ["frames"], "reference-to-video": ["video"] },
  "wan-3-prime": { "image-to-video": ["frames"], "reference-to-video": ["video"] },
  "wan-2-7": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"], "video-edit": ["video-edit"] },
  "wan-2-6": { "image-to-video": ["image-to-video"] },
  "wan-2-6-flash": { "image-to-video": ["image-to-video"] },
  "wan-2-5": { "image-to-video": ["image-to-video"] },
  "wan-2-2": { "image-to-video": ["image-to-video"], "lipsync-from-audio": ["speech-to-video"] },
  "happyhorse-1-1": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "happyhorse-1": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"], "video-edit": ["video-edit"] },
  "pixverse-v6": { "image-to-video": ["image-to-video", "transition"] },
  "grok-imagine-video": { "image-to-video": ["image-to-video"] },
  "gemini-omni": { "reference-to-video": ["video"] },
  "gemini-omni-flash-1-1": { "image-to-video": ["frames"], "reference-to-video": ["video"] },
  "runway-gen4-aleph": { "video-edit": ["generate"] },
  "elevenlabs-speech": { "text-to-speech": ["speak"] },
  "elevenlabs-multilingual-v2": { "text-to-speech": ["speak"] },
  "gemini-tts-3-8": { "text-to-speech": ["flash", "lite"] },
  "gemini-tts": { "text-to-speech": ["speak"] },
  "gemini-tts-pro": { "text-to-speech": ["speak"] },
  "hf-soul-2": { "text-to-image": ["generate"] },
  "hf-soul-cinema": { "text-to-image": ["generate"] },
  "hf-soul": { "text-to-image": ["generate"] },
  "hf-marketing-studio-flare": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "hf-marketing-studio-sunburst": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "hf-marketing-studio-2": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "hf-grok-image-2": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "hf-ideogram-4": { "text-to-image": ["generate"] },
  "hf-qwen-image-3": { "text-to-image": ["generate"], "image-edit-multi": ["edit"] },
  "hf-recraft-v4-1-pro": { "text-to-image": ["generate"] },
  "hf-recraft-v4-1": { "text-to-image": ["generate"] },
  "hf-recraft-v4-1-utility-pro": { "text-to-image": ["generate"] },
  "hf-recraft-v4-1-utility": { "text-to-image": ["generate"] },
  "hf-z-image-turbo": { "text-to-image": ["generate"] },
  "hf-seedance-2-5": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"], "video-edit": ["video-edit"] },
  "hf-seedance-2": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "hf-kling-3": { "image-to-video": ["image-to-video"] },
  "hf-kling-o3": { "image-to-video": ["first-last-frame"], "reference-to-video": ["image-reference"], "video-edit": ["video-edit"] },
  "hf-kling-omni": { "image-to-video": ["first-last-frame"], "reference-to-video": ["image-reference"], "video-edit": ["video-edit"] },
  "hf-kling-2-6": { "image-to-video": ["image-to-video"] },
  "hf-kling-2-5-turbo": { "image-to-video": ["image-to-video"] },
  "hf-wan-3-prime": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "hf-wan-3": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "hf-wan-2-7": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "hf-wan-2-6": { "image-to-video": ["image-to-video"] },
  "hf-happy-horse-1-1": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "hf-happy-horse-1": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "hf-minimax-h3": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "hf-hailuo-2-3": { "image-to-video": ["image-to-video"] },
  "hf-ltx-2-5": { "image-to-video": ["image-to-video"] },
  "hf-pixverse-v6": { "image-to-video": ["image-to-video"] },
  "hf-grok-video-1-5": { "image-to-video": ["image-to-video"], "reference-to-video": ["reference-to-video"] },
  "hf-genjutsu": { "motion-transfer": ["motion-transfer"], "object-swap": ["object-swap"] },
  "hf-kling-3-motion-control": { "motion-transfer": ["motion-control"] },
  "hf-kling-2-6-motion-control": { "motion-transfer": ["motion-control"] },
};

/** The modes of `model` that provide `capability`, preferred first; none when it lacks it. */
export function modesFor(model: ModelDef, capability: Capability): string[] {
  return CAPABILITIES[model.id]?.[capability] ?? [];
}

export function hasCapability(model: ModelDef, capability: Capability): boolean {
  return modesFor(model, capability).length > 0;
}
