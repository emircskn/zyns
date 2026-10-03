import { getModel } from "@/lib/registry";
import { getSpec } from "@/lib/registry/hf/auto";
import { MOTION, SWAP } from "./targets";
import type { RemixMode } from "./types";

/** The catalogue's moving banner for a Genjutsu mode, from Higgsfield's live catalogue. */
export function bannerOf(mode: RemixMode): { video?: string; poster?: string; image?: string } | undefined {
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
