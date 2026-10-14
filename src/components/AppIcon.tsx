"use client";

import { useId, type ReactNode } from "react";

/**
 * Higgsfield's menu marks: a small tile lit from above in its own colour,
 * a soft shine along its top edge, and a white glyph that fades a little
 * toward its foot. Drawn here, glyphs and all, in a 24-unit box.
 */
export type AppTone = "grey" | "cyan" | "blue" | "pink" | "lime" | "orange" | "purple" | "green" | "red" | "amber" | "slate";

const TONES: Record<AppTone, [string, string]> = {
  grey: ["#8a8d92", "#3f4246"],
  slate: ["#5d6672", "#272c33"],
  cyan: ["#5fe0e6", "#1f8fb0"],
  blue: ["#6ea4ff", "#2a54c4"],
  pink: ["#ff8fc0", "#c8336f"],
  lime: ["#e4ff6a", "#8cb80a"],
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

/** Filled shapes, and lines drawn with the same white. */
const GLYPHS: Record<AppGlyph, { fill?: string[]; line?: string[]; dim?: string[] }> = {
  home: { fill: ["M3.5 10.6 12 3.4l8.5 7.2V19.6a1.4 1.4 0 0 1-1.4 1.4H14.6v-5.6H9.4V21H4.9a1.4 1.4 0 0 1-1.4-1.4z"] },
  spark: {
    fill: [
      "M14.5 5c.75 4.7 2.55 6.5 7.25 7.25-4.7.75-6.5 2.55-7.25 7.25-.75-4.7-2.55-6.5-7.25-7.25C11.95 11.5 13.75 9.7 14.5 5z",
      "M6.5 2.5c.32 1.95 1.08 2.7 3 3-1.92.32-2.68 1.08-3 3-.32-1.92-1.08-2.68-3-3 1.92-.3 2.68-1.05 3-3z",
    ],
  },
  at: { line: ["M15.6 8.4v4.8a2.6 2.6 0 0 0 5.2 0V12a8.8 8.8 0 1 0-3.6 7.1", "M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z"] },
  heart: { fill: ["M12 20.6S3.4 15.3 3.4 9.4A4.6 4.6 0 0 1 12 7.1a4.6 4.6 0 0 1 8.6 2.3c0 5.9-8.6 11.2-8.6 11.2z"] },
  trash: { fill: ["M9.2 3h5.6l.9 1.8h3.9a1 1 0 0 1 0 2H4.4a1 1 0 0 1 0-2h3.9z", "M5.6 8.4h12.8l-.95 11.3A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.45-1.3z"] },
  folder: { fill: ["M2.8 6.4A1.9 1.9 0 0 1 4.7 4.5h4.2c.5 0 .95.2 1.3.55l1.5 1.55h7.6a1.9 1.9 0 0 1 1.9 1.9v9.6a1.9 1.9 0 0 1-1.9 1.9H4.7a1.9 1.9 0 0 1-1.9-1.9z"] },
  // A folder with another behind it: what holds folders of its own.
  folders: {
    dim: ["M6 4.4A1.6 1.6 0 0 1 7.6 2.8h3.3c.42 0 .8.17 1.1.46l1.2 1.24h6.2a1.6 1.6 0 0 1 1.6 1.6v8.2a1.6 1.6 0 0 1-1.6 1.6H6z"],
    fill: ["M2.6 9A1.7 1.7 0 0 1 4.3 7.3h3.7c.45 0 .87.18 1.18.5l1.3 1.35h6.6a1.7 1.7 0 0 1 1.7 1.7v8.25a1.7 1.7 0 0 1-1.7 1.7H4.3a1.7 1.7 0 0 1-1.7-1.7z"],
  },
  "folder-plus": {
    fill: ["M2.8 6.4A1.9 1.9 0 0 1 4.7 4.5h4.2c.5 0 .95.2 1.3.55l1.5 1.55h7.6a1.9 1.9 0 0 1 1.9 1.9v9.6a1.9 1.9 0 0 1-1.9 1.9H4.7a1.9 1.9 0 0 1-1.9-1.9z"],
    line: [],
  },
  plus: { line: ["M12 5v14", "M5 12h14"] },
  brief: { fill: ["M6.2 2.8h7.6l4.9 4.9v12a1.5 1.5 0 0 1-1.5 1.5H6.2a1.5 1.5 0 0 1-1.5-1.5V4.3a1.5 1.5 0 0 1 1.5-1.5z"] },
  sliders: { line: ["M4 7.5h9", "M18 7.5h2", "M4 16.5h3", "M12 16.5h8"], fill: ["M15.5 4.8a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4z", "M9.5 13.8a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4z"] },
  back: { line: ["M14.5 5.5 8 12l6.5 6.5"] },
  user: { fill: ["M12 3.2a4.3 4.3 0 1 1 0 8.6 4.3 4.3 0 0 1 0-8.6z", "M3.8 20.2c.6-4.2 4-6.6 8.2-6.6s7.6 2.4 8.2 6.6a.8.8 0 0 1-.8.9H4.6a.8.8 0 0 1-.8-.9z"] },
  box: { fill: ["M12 2.6 20.4 7v10L12 21.4 3.6 17V7z"], dim: [] },
  place: { fill: ["M12 2.6a7 7 0 0 1 7 7c0 5.3-7 11.8-7 11.8S5 14.9 5 9.6a7 7 0 0 1 7-7z"] },
  palette: { fill: ["M12 3a9 9 0 0 0 0 18c1.3 0 1.9-.9 1.9-1.8 0-1.2-1-1.6-1-2.6 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"] },
  image: { fill: ["M5 3.6h14A1.6 1.6 0 0 1 20.6 5.2v13.6a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6V5.2A1.6 1.6 0 0 1 5 3.6z"] },
  video: { fill: ["M4.6 5.4h9.6A1.8 1.8 0 0 1 16 7.2v9.6a1.8 1.8 0 0 1-1.8 1.8H4.6a1.8 1.8 0 0 1-1.8-1.8V7.2a1.8 1.8 0 0 1 1.8-1.8z", "M17.2 10.2 21.2 7.6v8.8l-4-2.6z"] },
  audio: { fill: ["M9.2 4.6 18.8 2.8v13.4a3 3 0 1 1-1.8-2.75V7.3l-6 1.15v9.75a3 3 0 1 1-1.8-2.75z"] },
  globe: { line: ["M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6z", "M3.4 12h17.2", "M12 3.2c2.4 2.4 3.6 5.3 3.6 8.8s-1.2 6.4-3.6 8.8c-2.4-2.4-3.6-5.3-3.6-8.8S9.6 5.6 12 3.2z"] },
  upload: { line: ["M12 15.5V4.5", "M7.5 9 12 4.5 16.5 9", "M4.5 15.5v2.8a1.7 1.7 0 0 0 1.7 1.7h11.6a1.7 1.7 0 0 0 1.7-1.7v-2.8"] },
  wand: {
    line: ["M4.5 19.5 14 10"],
    fill: [
      "M16.5 3c.4 2.4 1.3 3.3 3.7 3.7-2.4.4-3.3 1.3-3.7 3.7-.4-2.4-1.3-3.3-3.7-3.7 2.4-.4 3.3-1.3 3.7-3.7z",
      "M8 3.5c.2 1.2.65 1.65 1.85 1.85C8.65 5.55 8.2 6 8 7.2 7.8 6 7.35 5.55 6.15 5.35 7.35 5.15 7.8 4.7 8 3.5z",
      "M19 13.5c.2 1.2.65 1.65 1.85 1.85-1.2.2-1.65.65-1.85 1.85-.2-1.2-.65-1.65-1.85-1.85 1.2-.2 1.65-.65 1.85-1.85z",
    ],
  },
  film: { fill: ["M4.8 3.4h14.4a1.6 1.6 0 0 1 1.6 1.6v14a1.6 1.6 0 0 1-1.6 1.6H4.8A1.6 1.6 0 0 1 3.2 19V5a1.6 1.6 0 0 1 1.6-1.6z"] },
  compass: { fill: ["M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z"] },
  tool: { fill: ["M14.8 3.4a5 5 0 0 0-4.6 6.9l-6.4 6.4a1.9 1.9 0 0 0 2.7 2.7l6.4-6.4a5 5 0 0 0 6.9-4.6l-2.9 2.9-2.9-.6-.6-2.9z"] },
  grid: {
    fill: [
      "M4.6 3.4h4.8a1.2 1.2 0 0 1 1.2 1.2v4.8a1.2 1.2 0 0 1-1.2 1.2H4.6a1.2 1.2 0 0 1-1.2-1.2V4.6a1.2 1.2 0 0 1 1.2-1.2z",
      "M14.6 3.4h4.8a1.2 1.2 0 0 1 1.2 1.2v4.8a1.2 1.2 0 0 1-1.2 1.2h-4.8a1.2 1.2 0 0 1-1.2-1.2V4.6a1.2 1.2 0 0 1 1.2-1.2z",
      "M4.6 13.4h4.8a1.2 1.2 0 0 1 1.2 1.2v4.8a1.2 1.2 0 0 1-1.2 1.2H4.6a1.2 1.2 0 0 1-1.2-1.2v-4.8a1.2 1.2 0 0 1 1.2-1.2z",
      "M14.6 13.4h4.8a1.2 1.2 0 0 1 1.2 1.2v4.8a1.2 1.2 0 0 1-1.2 1.2h-4.8a1.2 1.2 0 0 1-1.2-1.2v-4.8a1.2 1.2 0 0 1 1.2-1.2z",
    ],
  },
};

/** What sits cut into a glyph: the brief's lines, the folder's plus, the picture's hill. */
const CUTS: Partial<Record<AppGlyph, string[]>> = {
  brief: ["M8.3 12h7.4", "M8.3 15.6h5"],
  "folder-plus": ["M12 10.2v6.4", "M8.8 13.4h6.4"],
  image: ["M3.8 17.2 8.6 12.4l3.6 3.6 2.4-2.4 5.6 5.6", "M15.6 7.4a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2z"],
  box: ["M3.8 7.1 12 11.4l8.2-4.3", "M12 11.4v9.8"],
  place: ["M12 7.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z"],
  palette: ["M7.6 11.2h.01", "M10 7.4h.01", "M14.4 7.4h.01"],
  film: ["M7.2 3.6v16.8", "M16.8 3.6v16.8", "M3.6 8.2h3.4", "M3.6 15.8h3.4", "M17 8.2h3.4", "M17 15.8h3.4"],
  compass: ["M15.6 8.4 13.4 13.4 8.4 15.6l2.2-5z"],
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
  const g = GLYPHS[glyph];
  const cuts = CUTS[glyph] ?? [];
  // The glyph sits in the tile's middle, a little over half its size.
  const place = "translate(12 12.2) scale(0.56) translate(-12 -12)";
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
        {/* In the glyph's own units: a straight line has no height to stretch a gradient over, and drew nothing. */}
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1="0" y1="3" x2="0" y2="21">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.78" />
        </linearGradient>
        <filter id={`${id}d`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="0.5" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x="0.5" y="0.5" width="23" height="23" rx="6.6" fill={`url(#${id}t)`} />
      <rect x="0.5" y="0.5" width="23" height="23" rx="6.6" fill="none" stroke={`url(#${id}s)`} strokeWidth="1" />
      <g transform={place} filter={`url(#${id}d)`}>
        {g.dim?.map((d) => <path key={d} d={d} fill="#fff" fillOpacity="0.5" />)}
        {g.fill?.map((d) => <path key={d} d={d} fill={`url(#${id}g)`} />)}
        {g.line?.map((d) => (
          <path key={d} d={d} fill="none" stroke={`url(#${id}g)`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {cuts.map((d) => (
          <path key={d} d={d} fill="none" stroke={foot} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        ))}
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
  cinema: { glyph: "film", tone: "lime" },
  marketing: { glyph: "box", tone: "orange" },
  explore: { glyph: "compass", tone: "grey" },
  tool: { glyph: "tool", tone: "slate" },
};

export function PlaceIcon({ place, size, className }: { place: keyof typeof PLACE_ICON; size?: number; className?: string }): ReactNode {
  const p = PLACE_ICON[place];
  return <AppIcon glyph={p.glyph} tone={p.tone} size={size} className={className} />;
}

/**
 * The setting cards' pictures while nothing is chosen, drawn as small
 * objects the way Higgsfield's are: a strip of film, a lens, paint, a
 * softbox, a row of faders.
 */
export type CardArtKind = "film" | "camera" | "palette" | "light" | "more";

export function CardArt({ kind, size = 36, className = "" }: { kind: CardArtKind; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2e33" />
          <stop offset="1" stopColor="#141518" />
        </linearGradient>
        <linearGradient id={`${id}film`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f1ec" />
          <stop offset="1" stopColor="#a9aaa3" />
        </linearGradient>
        <radialGradient id={`${id}lens`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#6fa8ff" />
          <stop offset="0.35" stopColor="#2346a8" />
          <stop offset="0.75" stopColor="#0c1636" />
          <stop offset="1" stopColor="#05070e" />
        </radialGradient>
        <linearGradient id={`${id}ring`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5c6068" />
          <stop offset="1" stopColor="#1b1c20" />
        </linearGradient>
        <linearGradient id={`${id}box`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fc2ff" />
          <stop offset="0.55" stopColor="#3b7bea" />
          <stop offset="1" stopColor="#1b3f9a" />
        </linearGradient>
        <radialGradient id={`${id}glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7fb4ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7fb4ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="10" fill={`url(#${id}bg)`} />
      {kind === "film" && (
        <g>
          <rect x="7" y="5" width="22" height="26" rx="4" fill={`url(#${id}film)`} />
          {[8.5, 13.5, 18.5, 23.5].map((y) => (
            <g key={y}>
              <rect x="9" y={y} width="3" height="3" rx="0.8" fill="#3a3b3e" />
              <rect x="24" y={y} width="3" height="3" rx="0.8" fill="#3a3b3e" />
            </g>
          ))}
          <rect x="14" y="8" width="8" height="9" rx="1.2" fill="#55575c" />
          <rect x="14" y="19" width="8" height="9" rx="1.2" fill="#55575c" />
        </g>
      )}
      {kind === "camera" && (
        <g>
          <circle cx="18" cy="18" r="12.5" fill={`url(#${id}ring)`} />
          <circle cx="18" cy="18" r="10.4" fill="#0b0c0f" />
          <circle cx="18" cy="18" r="8.6" fill={`url(#${id}lens)`} />
          <circle cx="18" cy="18" r="4.4" fill="none" stroke="#9cc3ff" strokeOpacity="0.35" strokeWidth="0.8" />
          <ellipse cx="14.6" cy="14.2" rx="2.6" ry="1.6" fill="#fff" fillOpacity="0.55" transform="rotate(-35 14.6 14.2)" />
          <circle cx="21.6" cy="21.4" r="1" fill="#fff" fillOpacity="0.3" />
        </g>
      )}
      {kind === "palette" && (
        <g>
          <rect x="6" y="6" width="11" height="11" rx="3" fill="#e9b949" />
          <rect x="19" y="6" width="11" height="11" rx="3" fill="#d9573b" />
          <rect x="6" y="19" width="11" height="11" rx="3" fill="#3f8c6e" />
          <rect x="19" y="19" width="11" height="11" rx="3" fill="#3b5bbf" />
        </g>
      )}
      {kind === "light" && (
        <g>
          <circle cx="18" cy="16" r="15" fill={`url(#${id}glow)`} />
          <path d="M8 9.5 27 7.5l1.6 14.2-19 2.2z" fill={`url(#${id}box)`} stroke="#c9e0ff" strokeOpacity="0.6" strokeWidth="0.7" />
          <path d="M18.5 23.2 19.4 31M15 31h8.6" stroke="#9aa0a8" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )}
      {kind === "more" && (
        <g stroke="#e8e8ea" strokeLinecap="round">
          {[
            [10, 0.55],
            [18, 0.35],
            [26, 0.7],
          ].map(([x, at]) => (
            <g key={x}>
              <path d={`M${x} 8v20`} strokeOpacity="0.25" strokeWidth="2" />
              <rect x={x - 3} y={8 + 20 * (1 - at) - 2} width="6" height="4" rx="1.4" fill="#e8e8ea" stroke="none" />
            </g>
          ))}
        </g>
      )}
      <rect width="36" height="36" rx="10" fill={`url(#${id}shine)`} />
    </svg>
  );
}
