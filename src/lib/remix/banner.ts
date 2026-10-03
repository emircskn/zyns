import { getModel } from "@/lib/registry";
import { getSpec } from "@/lib/registry/hf/auto";
import { MOTION, SWAP } from "./targets";
import type { RemixMode } from "./types";

/**
 * Higgsfield's own cover for Genjutsu Restyle, a public file on its static
 * host (the catalogue lists none for Restyle). One clip for the whole mode;
 * the styles themselves come with a still each.
 */
export const RESTYLE_COVER = "https://static.higgsfield.ai/genjutsu/restyle-cover-20260927/COVER.mp4";

/** The catalogue's moving banner for a Genjutsu mode, from Higgsfield's live catalogue. */
export function bannerOf(mode: RemixMode): { video?: string; poster?: string; image?: string } | undefined {
  if (mode === "restyle") return { video: RESTYLE_COVER };
  const genjutsu = getModel(MOTION.modelId);
  if (!genjutsu) return undefined;
  const endpoint = mode === "swap" ? SWAP : MOTION;
  try {
    const id = genjutsu.build({ __mode: endpoint.mode }).endpoint.replace(/^\//, "");
    const spec = getSpec(id);
    return spec?.banner ?? spec?.preview;
  } catch {
    return undefined;
  }
}

export const BLURB: Record<RemixMode, string> = {
  motion: "Your characters, moving the way a clip moves",
  swap: "Something in a clip, replaced by what you give it",
  restyle: "The same clip, in another look",
};
