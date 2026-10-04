/**
 * Remix: Higgsfield's Genjutsu, as the studio offers it. A clip you bring
 * (the source) and the pictures you give it (references) make a new clip:
 * the source's motion on your characters, something in it swapped for
 * something else, or all of it in another style.
 */
import type { Values } from "@/lib/registry/types";

export type RemixMode = "motion" | "swap" | "restyle";

/** A model and the mode it runs in, the way Remix names what it sends to. */
export interface RemixTarget {
  modelId: string;
  mode?: string;
}

/** What the Remix composer holds between visits; this device's own. */
export interface RemixState {
  mode: RemixMode;
  /** The clip whose motion (or scene) the result keeps. */
  source: string | null;
  /** References in the order the model gets them. */
  refs: string[];
  prompts: Partial<Record<RemixMode, string>>;
  /** Each model's own settings (resolution and the like), by `targetKey`. */
  settings: Record<string, Values>;
  /** Restyle's model, last chosen; Genjutsu's own Restyle until another is picked. */
  restyle?: RemixTarget;
  /** Higgsfield's style for Genjutsu Restyle (an id from its preset list). */
  presetId?: string;
  /** A Zyns style for the other Restyle models: a built-in one's id, or a style element's. */
  styleId?: string;
  /** The prompt's switch, off until turned on: off, what is written stays but is not sent. */
  promptOn?: boolean;
}

/** Whether the prompt goes with the run. */
export function promptIsOn(remix: RemixState): boolean {
  return remix.promptOn === true;
}

/** What a run made in Remix remembers, so its card can compare and try again. */
export interface RemixRunInfo {
  mode: RemixMode;
  source: string;
  refs: string[];
  presetId?: string;
  presetName?: string;
  styleId?: string;
}

/** A clip kept for its motion, to start a remix from. */
export interface MotionClip {
  id: string;
  title: string;
  url: string;
  durationSec?: number;
  tags: string[];
  createdAt: number;
}

export const EMPTY_REMIX: RemixState = { mode: "motion", source: null, refs: [], prompts: {}, settings: {} };

export function targetKey(target: RemixTarget): string {
  return target.mode ? `${target.modelId}:${target.mode}` : target.modelId;
}
