"use client";

import { useId, type ReactNode } from "react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { Article } from "@phosphor-icons/react/dist/ssr/Article";
import { At } from "@phosphor-icons/react/dist/ssr/At";
import { Compass } from "@phosphor-icons/react/dist/ssr/Compass";
import { FilmStrip } from "@phosphor-icons/react/dist/ssr/FilmStrip";
import { Folder } from "@phosphor-icons/react/dist/ssr/Folder";
import { FolderPlus } from "@phosphor-icons/react/dist/ssr/FolderPlus";
import { Folders } from "@phosphor-icons/react/dist/ssr/Folders";
import { Globe } from "@phosphor-icons/react/dist/ssr/Globe";
import { Heart } from "@phosphor-icons/react/dist/ssr/Heart";
import { House } from "@phosphor-icons/react/dist/ssr/House";
import { Image } from "@phosphor-icons/react/dist/ssr/Image";
import { MagicWand } from "@phosphor-icons/react/dist/ssr/MagicWand";
import { MapPin } from "@phosphor-icons/react/dist/ssr/MapPin";
import { Package } from "@phosphor-icons/react/dist/ssr/Package";
import { Palette } from "@phosphor-icons/react/dist/ssr/Palette";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { Sparkle } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { SquaresFour } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { UploadSimple } from "@phosphor-icons/react/dist/ssr/UploadSimple";
import { User } from "@phosphor-icons/react/dist/ssr/User";
import { VideoCamera } from "@phosphor-icons/react/dist/ssr/VideoCamera";
import { Waveform } from "@phosphor-icons/react/dist/ssr/Waveform";
import { Wrench } from "@phosphor-icons/react/dist/ssr/Wrench";

/**
 * Higgsfield's menu marks: a small tile lit from above in its own colour,
 * a soft shine along its top edge, and a white glyph from the studio's icon
 * set (Phosphor, solid) in its middle.
 */
export type AppTone = "grey" | "cyan" | "blue" | "pink" | "lime" | "orange" | "purple" | "green" | "red" | "amber" | "slate";

const TONES: Record<AppTone, [string, string]> = {
  grey: ["#8a8d92", "#3f4246"],
  slate: ["#5d6672", "#272c33"],
  cyan: ["#5fe0e6", "#1f8fb0"],
  blue: ["#6ea4ff", "#2a54c4"],
  pink: ["#ff8fc0", "#c8336f"],
  // The brand accent (ZYNS orange), kept under its old name.
  lime: ["#ffcf99", "#f98f24"],
  orange: ["#ffb163", "#d9581c"],
  purple: ["#b99bff", "#6a3fd1"],
  green: ["#7fe39a", "#239a4c"],
  red: ["#ff8d84", "#c7362d"],
  amber: ["#ffd76a", "#d58d10"],
};

export type AppGlyph =
  | "home"
  | "spark"
  | "at"
  | "heart"
  | "trash"
  | "folder"
  | "folders"
  | "folder-plus"
  | "plus"
  | "brief"
  | "sliders"
  | "back"
  | "user"
  | "box"
  | "place"
  | "palette"
  | "image"
  | "video"
  | "audio"
  | "globe"
  | "upload"
  | "grid"
  | "wand"
  | "film"
  | "compass"
  | "tool";

/** The white glyph on each tile: Phosphor's solid set, as every other icon in the studio. */
const GLYPHS: Record<AppGlyph, PhosphorIcon> = {
  home: House,
  spark: Sparkle,
  at: At,
  heart: Heart,
  trash: Trash,
  folder: Folder,
  folders: Folders,
  "folder-plus": FolderPlus,
  plus: Plus,
  brief: Article,
  sliders: SlidersHorizontal,
  back: ArrowLeft,
  user: User,
  box: Package,
  place: MapPin,
  palette: Palette,
  image: Image,
  video: VideoCamera,
  audio: Waveform,
  globe: Globe,
  upload: UploadSimple,
  grid: SquaresFour,
  wand: MagicWand,
  film: FilmStrip,
  compass: Compass,
  tool: Wrench,
};

export function AppIcon({
  glyph,
  tone = "grey",
  size = 24,
  className = "",
  color,
}: {
  glyph: AppGlyph;
  tone?: AppTone;
  size?: number;
  className?: string;
  /** A colour of the person's own (a folder's), in place of a tone. */
  color?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [top, foot] = color ? [mix(color, -0.12), mix(color, -0.58)] : TONES[tone];
  const Glyph = GLYPHS[glyph];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={foot} />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}d`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="0.5" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x="0.5" y="0.5" width="23" height="23" rx="6.6" fill={`url(#${id}t)`} />
      <rect x="0.5" y="0.5" width="23" height="23" rx="6.6" fill="none" stroke={`url(#${id}s)`} strokeWidth="1" />
      {/* The glyph sits in the tile's middle, a little over half its size. */}
      <g filter={`url(#${id}d)`}>
        <Glyph x={5.4} y={5.6} size={13.2} weight="fill" color="#fff" />
      </g>
    </svg>
  );
}

/** A hex colour lightened (amount > 0) or darkened. */
function mix(hex: string, amount: number): string {
  const n = hex.replace("#", "");
  const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const to = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  const out = [r, g, b].map((c) => Math.round(c + (to - c) * k).toString(16).padStart(2, "0"));
  return `#${out.join("")}`;
}

/** Each place's mark and colour, so a page is known by the same tile everywhere. */
export const PLACE_ICON: Record<string, { glyph: AppGlyph; tone: AppTone }> = {
  home: { glyph: "home", tone: "grey" },
  generations: { glyph: "spark", tone: "cyan" },
  elements: { glyph: "at", tone: "blue" },
  favorites: { glyph: "heart", tone: "pink" },
  projects: { glyph: "folders", tone: "amber" },
  trash: { glyph: "trash", tone: "slate" },
  newProject: { glyph: "folder-plus", tone: "grey" },
  brief: { glyph: "brief", tone: "orange" },
  settings: { glyph: "sliders", tone: "purple" },
  back: { glyph: "back", tone: "grey" },
  all: { glyph: "spark", tone: "lime" },
  folder: { glyph: "folder", tone: "amber" },
  add: { glyph: "plus", tone: "grey" },
  assets: { glyph: "grid", tone: "cyan" },
  community: { glyph: "globe", tone: "grey" },
  upload: { glyph: "upload", tone: "grey" },
  image: { glyph: "image", tone: "green" },
  video: { glyph: "video", tone: "red" },
  audio: { glyph: "audio", tone: "purple" },
  character: { glyph: "user", tone: "blue" },
  product: { glyph: "box", tone: "orange" },
  place: { glyph: "place", tone: "green" },
  genjutsu: { glyph: "wand", tone: "pink" },
  adReference: { glyph: "image", tone: "pink" },
  productLink: { glyph: "globe", tone: "blue" },
  products: { glyph: "box", tone: "orange" },
  cinema: { glyph: "film", tone: "lime" },
  marketing: { glyph: "box", tone: "orange" },
  explore: { glyph: "compass", tone: "grey" },
  tool: { glyph: "tool", tone: "slate" },
};

export function PlaceIcon({ place, size, className }: { place: keyof typeof PLACE_ICON; size?: number; className?: string }): ReactNode {
  const p = PLACE_ICON[place];
  return <AppIcon glyph={p.glyph} tone={p.tone} size={size} className={className} />;
}

