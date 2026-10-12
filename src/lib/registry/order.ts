import type { ModelDef } from "./types";

/**
 * The order models are offered in, every list alike (picker, Explore,
 * Create): the families most people reach for first, and within a family
 * its flagship, then its variants and tools (a Motion Control beside the
 * Kling it belongs to), then older generations. Drawn from the public
 * leaderboards and blind-vote arenas of October 2026, which agree on the
 * leaders more than on the exact order; revisit as they move.
 *
 * A model missing here keeps its place after the listed ones, in the
 * catalogue's own order, so a new one is never lost.
 */
const ORDER: string[] = [
  /* KIE · image */
  "nano-banana-2", "nano-banana-pro", "nano-banana-2-1", "nano-banana-2-lite", "nano-banana",
  "gpt-image-2", "gpt-image-2-5-flare", "gpt-image-2-5-sunburst", "gpt-image-1-5",
  "seedream-5-pro", "seedream-5-flash", "seedream-5-lite", "seedream-4-5", "seedream-4",
  "flux-2-pro", "flux-2-flex",
  "grok-imagine-image-2", "grok-imagine-image",
  "qwen3-image", "qwen3-image-pro", "qwen2-1-image",
  "wan-2-7-image", "wan-2-7-image-pro",
  "ideogram-v3", "ideogram-character",
  "z-image",
  /* KIE · video */
  "seedance-2-5", "seedance-2", "seedance-2-fast", "seedance-2-mini", "seedance-1-5-pro", "seedance-1-pro", "seedance-1-pro-fast", "seedance-1-lite",
  "veo-3-1",
  "kling-3", "kling-3-omni", "kling-3-motion-control", "kling-v3-turbo", "kling-2-6", "kling-2-6-motion-control", "kling-2-5-turbo",
  "kling-2-1-master", "kling-2-1-pro", "kling-2-1-standard", "kling-avatar-pro", "kling-avatar",
  "wan-3", "wan-3-prime", "wan-2-7", "wan-animate", "wan-2-6", "wan-2-6-flash", "wan-2-5", "wan-2-2",
  "happyhorse-1-1", "happyhorse-1",
  "minimax-h3", "hailuo-2-3-pro", "hailuo-2-3", "hailuo-02-pro", "hailuo-02",
  "gemini-omni-flash-1-1", "gemini-omni",
  "grok-imagine-video-1-5", "grok-imagine-video",
  "pixverse-v6",
  "runway", "runway-gen4-aleph",
  /* KIE · audio and tools */
  "suno-music", "suno-studio", "suno-voice",
  "elevenlabs-speech", "elevenlabs-dialogue", "elevenlabs-multilingual-v2",
  "gemini-tts-pro", "gemini-tts-3-8", "gemini-tts",
  "topaz", "recraft", "elevenlabs-isolation",
  /* Higgsfield · image */
  "hf-soul-2", "hf-soul-cinema", "hf-soul",
  "hf-marketing-studio-flare", "hf-marketing-studio-sunburst", "hf-marketing-studio-2", "hf-auto-higgsfield-ads-studio-v1-0",
  "hf-ai-influencer",
  "hf-grok-image-2", "hf-qwen-image-3", "hf-ideogram-4",
  "hf-recraft-v4-1-pro", "hf-recraft-v4-1", "hf-recraft-v4-1-utility-pro", "hf-recraft-v4-1-utility",
  "hf-z-image-turbo",
  /* Higgsfield · video */
  "hf-cinema-studio-4", "hf-genjutsu",
  "hf-seedance-2-5", "hf-seedance-2",
  "hf-kling-3", "hf-kling-3-motion-control", "hf-kling-o3", "hf-kling-omni", "hf-kling-2-6", "hf-kling-2-6-motion-control", "hf-kling-2-5-turbo",
  "hf-wan-3", "hf-wan-3-prime", "hf-wan-2-7", "hf-wan-2-6",
  "hf-happy-horse-1-1", "hf-happy-horse-1",
  "hf-minimax-h3", "hf-hailuo-2-3",
  "hf-grok-video-1-5",
  "hf-ltx-2-5",
  "hf-pixverse-v6",
];

const RANK = new Map(ORDER.map((id, i) => [id, i]));

/** The models in offering order; a stable sort, so the unlisted keep theirs. */
export function inOrder(models: ModelDef[]): ModelDef[] {
  return models
    .map((m, i) => ({ m, i }))
    .sort((a, b) => (RANK.get(a.m.id) ?? ORDER.length + a.i) - (RANK.get(b.m.id) ?? ORDER.length + b.i))
    .map(({ m }) => m);
}
