/**
 * Zyns's own styles, for Restyle on the models that have no style list of
 * their own (Genjutsu's Restyle has Higgsfield's). A style is a name, a
 * line of prompt, and pictures to give the model as a style reference.
 *
 * The built-in ones carry only their words for now; their reference
 * pictures and previews are made with Zyns and added later. Your own are
 * Elements of the Style kind, whose pictures and notes are used the same way.
 */
import type { LibraryElement } from "@/lib/elements";
import { mediaSrc } from "@/lib/storage/client";
import type { StyleInput } from "./targets";

export interface ZynsStyle {
  id: string;
  name: string;
  prompt: string;
  /** Style reference pictures, given after your own references. */
  images: string[];
  /** A picture of the style, where there is one. */
  preview?: string;
  /** Two colours for the tile while a style has no preview. */
  tint: [string, string];
  /** Made by you, as a Style element. */
  own?: boolean;
}

export const BUILT_IN_STYLES: ZynsStyle[] = [
  {
    id: "zyns-anime",
    name: "Anime",
    prompt: "Restyle the whole clip as 2D cel-shaded anime: clean line art, flat colour, soft shading",
    images: [],
    tint: ["#ff7ab6", "#5b6cff"],
  },
  {
    id: "zyns-clay",
    name: "Claymation",
    prompt: "Restyle the whole clip as stop-motion claymation: hand-made clay figures, fingerprints in the clay, a miniature set",
    images: [],
    tint: ["#f4a259", "#bc4b51"],
  },
  {
    id: "zyns-3d",
    name: "3D animated",
    prompt: "Restyle the whole clip as a polished 3D animated film: stylised proportions, soft global illumination, rich materials",
    images: [],
    tint: ["#5bc0eb", "#9bc53d"],
  },
  {
    id: "zyns-watercolor",
    name: "Watercolour",
    prompt: "Restyle the whole clip as a watercolour painting: soft washes, paper texture, colour bleeding at the edges",
    images: [],
    tint: ["#a0c4ff", "#ffc6ff"],
  },
  {
    id: "zyns-comic",
    name: "Comic book",
    prompt: "Restyle the whole clip as a comic book: bold ink outlines, halftone dots, punchy flat colour",
    images: [],
    tint: ["#ffd60a", "#ef233c"],
  },
  {
    id: "zyns-noir",
    name: "Film noir",
    prompt: "Restyle the whole clip as 1940s film noir: black and white, hard shadows, high contrast, film grain",
    images: [],
    tint: ["#e5e5e5", "#1f1f1f"],
  },
  {
    id: "zyns-neon",
    name: "Neon night",
    prompt: "Restyle the whole clip as a neon-lit night city: magenta and cyan light, wet reflections, haze",
    images: [],
    tint: ["#ff00a8", "#00e5ff"],
  },
  {
    id: "zyns-sketch",
    name: "Pencil sketch",
    prompt: "Restyle the whole clip as a pencil sketch: graphite lines, cross-hatching, off-white paper",
    images: [],
    tint: ["#d6d6d6", "#7a7a7a"],
  },
  {
    id: "zyns-16mm",
    name: "16 mm film",
    prompt: "Restyle the whole clip as 16 mm film: warm faded colour, heavy grain, gentle gate weave and halation",
    images: [],
    tint: ["#e9c46a", "#7f5539"],
  },
];

/** A Style element, as a Remix style. */
export function elementStyle(element: LibraryElement): ZynsStyle {
  return {
    id: element.id,
    name: element.name,
    prompt: element.notes?.trim() || `In the style of the reference pictures (${element.name})`,
    images: element.images.map((ref) => ref.storageUrl),
    preview: element.images[0] ? mediaSrc(element.images[0].storageUrl) : undefined,
    tint: ["#444", "#222"],
    own: true,
  };
}

export function zynsStyles(elements: LibraryElement[]): ZynsStyle[] {
  return [...elements.filter((e) => e.kind === "style").map(elementStyle), ...BUILT_IN_STYLES];
}

export function styleInput(style: ZynsStyle | undefined): StyleInput | undefined {
  return style ? { prompt: style.prompt, images: style.images } : undefined;
}
