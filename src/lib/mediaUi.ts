import type { MediaKind } from "@/lib/attach";

/**
 * How attached media looks and behaves, in one place. Every composer's
 * picture row, slot and thumbnail, the add-media window and the prompt's
 * `@` tags read from here (or from the components built on it), so a change
 * made here is a change everywhere:
 *
 *   - ThumbTools / ThumbRow / MediaThumb   the pictures over a prompt
 *   - MediaPicker                          the "+" window and its tiles
 *   - refTags (lib/refTags.ts)             the `@` tags and what they point at
 *   - `.ref-tag` in globals.css            the tag's colour and its struck-through state
 */
export const MEDIA_UI = {
  /** An attached picture's box, and the box that holds it in a row. */
  thumb: "h-16 w-16 rounded-chip",
  thumbWrap: "w-16",
  rowGap: "gap-2",
  /** The "+" that sits at the head of a row. */
  addTile:
    "grid h-16 w-16 shrink-0 place-items-center rounded-chip bg-t1/[0.05] text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.09] hover:text-t1",
  /** The two marks on a picture: shown on hover, always on touch. */
  toolsShow:
    "opacity-0 transition-[opacity,background-color] duration-[120ms] [:hover>&]:opacity-100 max-md:opacity-100 [@media(hover:none)]:opacity-100",
  expandTool:
    "absolute left-1/2 top-1/2 z-10 grid h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg bg-black/60 text-white/90 backdrop-blur-sm hover:bg-black/75 hover:text-white",
  closeTool: "absolute right-1 top-1 z-10 grid h-4 w-4 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80",
  expandGlyph: 12,
  closeGlyph: 8,
} as const;

/** What a picker may still add of a kind, and what to tell when it is full ("Nano Banana 2 takes up to 10 images."). */
export function limitOf(name: string, kind: MediaKind, cap: number, have: number): { room: number; note: string } {
  const noun = kind === "audio" ? "audio file" : kind;
  return { room: Math.max(cap - have, 0), note: `${name} takes up to ${cap} ${noun}${cap === 1 ? "" : "s"}.${have > 0 ? ` ${have} already added.` : ""}` };
}
