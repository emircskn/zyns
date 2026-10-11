import type { ReactElement, SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

export type IconName =
  | "image"
  | "video"
  | "audio"
  | "tool"
  | "sliders"
  | "plus"
  | "minus"
  | "close"
  | "chevron"
  | "search"
  | "key"
  | "spark"
  | "arrow-up"
  | "download"
  | "upload"
  | "copy"
  | "trash"
  | "check"
  | "alert"
  | "refresh"
  | "play"
  | "history"
  | "grid"
  | "link"
  | "sun"
  | "moon"
  | "clock"
  | "monitor"
  | "layers"
  | "folder"
  | "mic"
  | "palette"
  | "camera"
  | "lens"
  | "aperture"
  | "frame"
  | "sort"
  | "expand"
  | "shrink"
  | "hash"
  | "heart"
  | "home"
  | "square"
  | "sidebar"
  | "more"
  | "at"
  | "ai-brain"
  | "coin"
  | "pause"
  | "list"
  | "user"
  | "gem"
  | "bolt"
  | "switch"
  | "backdrop"
  | "orient"
  | "photos"
  | "globe"
  | "lock"
  | "pencil"
  | "smile"
  | "landscape"
  | "shapes"
  | "pin"
  | "undo"
  | "folder-plus"
  | "transfer"
  | "zoom"
  | "film"
  | "wand"
  | "music"
  | "tag"
  | "move"
  | "shirt"
  | "box"
  | "ratio-auto";

const PATHS: Record<IconName, ReactElement> = {
  // The options' own glyphs, one per kind of setting so no two read alike.
  gem: (
    <>
      <path d="M6.5 4.5h11L21 9.5l-9 10-9-10z" />
      <path d="M3 9.5h18M12 19.5 8.5 9.5l1.8-5M12 19.5l3.5-10-1.8-5" />
    </>
  ),
  bolt: <path d="M13.5 3 5 13.5h6.5L10.5 21 19 10.5h-6.5z" />,
  switch: (
    <>
      <rect x="2.5" y="7" width="19" height="10" rx="5" />
      <circle cx="16.5" cy="12" r="2.6" />
    </>
  ),
  backdrop: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <rect x="5" y="5" width="7" height="7" fill="currentColor" stroke="none" opacity="0.45" />
      <rect x="12" y="12" width="7" height="7" fill="currentColor" stroke="none" opacity="0.45" />
    </>
  ),
  orient: (
    <>
      <circle cx="12" cy="7" r="2.6" />
      <path d="M8.5 20v-4.5a3.5 3.5 0 0 1 7 0V20M4.5 12.5 2.5 15l2 2.5M19.5 12.5l2 2.5-2 2.5" />
    </>
  ),
  photos: (
    <>
      <rect x="3" y="7" width="14" height="13" rx="2.5" />
      <path d="M7 4h11.5A2.5 2.5 0 0 1 21 6.5V16M3 17l4-4 3 3 2-2 5 5" />
    </>
  ),
  pin: <path d="M9 4h6l-1 5 3.5 3.5v1.5h-11v-1.5L10 9 9 4zM12 14v6" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
      <circle cx="9" cy="9.75" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.75" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  landscape: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 16.5 5-5 4 4 2.5-2.5 5.5 5.5" />
      <circle cx="16" cy="9" r="1.5" />
    </>
  ),
  shapes: (
    <>
      <circle cx="7" cy="7" r="3.2" />
      <rect x="14" y="4" width="6.5" height="6.5" rx="1.5" />
      <path d="M12 14.5 16 21H8z" />
    </>
  ),
  pencil: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />,
  "folder-plus": (
    <>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M12 10v6M9 13h6" />
    </>
  ),
  transfer: <path d="M4 8h15m0 0-3.5-3.5M19 8l-3.5 3.5M20 16H5m0 0 3.5-3.5M5 16l3.5 3.5" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  zoom: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4M11 8v6M8 11h6" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7.5 4v16M16.5 4v16M3 9.5h4.5M3 14.5h4.5M16.5 9.5H21M16.5 14.5H21" />
    </>
  ),
  wand: (
    <>
      <path d="M4 20 14.5 9.5" />
      <path d="M15 3.5v3M13.5 5h3M19.5 8v3M18 9.5h3M18.5 14.5v2M17.5 15.5h2" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12V5A1.5 1.5 0 0 1 5 3.5h7l8.5 8.5-8.5 8.5z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  move: <path d="M12 3v18M3 12h18M9.5 5.5 12 3l2.5 2.5M9.5 18.5 12 21l2.5-2.5M5.5 9.5 3 12l2.5 2.5M18.5 9.5 21 12l-2.5 2.5" />,
  "ratio-auto": <rect x="4" y="6" width="16" height="12" rx="2.5" strokeDasharray="3 2.6" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 16l-5-5-5.5 5.5L8 14l-5 5" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="5" width="14" height="14" rx="3" />
      <path d="M16.5 10l5-3v10l-5-3z" />
    </>
  ),
  audio: (
    <>
      <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
    </>
  ),
  tool: (
    <>
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.1-2.1z" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M17 12v4M20 12v3" />
    </>
  ),
  spark: <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />,
  "arrow-up": <path d="M12 19V5M5 12l7-7 7 7" />,
  download: <path d="M12 4v11m0 0l-4-4m4 4l4-4M4 19h16" />,
  upload: <path d="M12 15V4m0 0l-4 4m4-4l4 4M4 19h16" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 012-2h9" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 10-2.3 6.3" />
      <path d="M20 5v6h-6" />
    </>
  ),
  play: <path d="M8 5l12 7-12 7z" />,
  history: (
    <>
      <path d="M3 12a9 9 0 109-9 9 9 0 00-7.6 4.2" />
      <path d="M3 4v4h4M12 7v5l3.5 2" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 007.5.5l2-2a5 5 0 00-7-7l-1 1" />
      <path d="M14 11a5 5 0 00-7.5-.5l-2 2a5 5 0 007 7l1-1" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  // A brain with "AI" set in it: what picks a model means here.
  "ai-brain": (
    <>
      <path d="M4 16.5a3 3 0 0 0 3 3a2.5 2.5 0 0 0 5 0a2.5 2.5 0 1 0 5 0a3 3 0 0 0 2.567-4.554a3.001 3.001 0 0 0 0-5.893A3 3 0 0 0 17 4.5a2.5 2.5 0 1 0-5 0a2.5 2.5 0 0 0-5 0a3 3 0 0 0-2.567 4.553a3.001 3.001 0 0 0 0 5.893A3 3 0 0 0 4 16.5" />
      <path d="m7.5 14.5l1.842-5.526a.694.694 0 0 1 1.316 0L12.5 14.5m3-6v6m-7-2h3" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  // Lucide's folder, as the AnimateIcons component draws it.
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" />
    </>
  ),
  lens: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  aperture: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.3 3.3 9.6 11.4M20.6 9.5h-9.3M17.8 18.2 13.1 10M9.7 20.7l4.7-8.1M3.4 14.5h9.3M6.2 5.8l4.6 8" />
    </>
  ),
  frame: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  sort: <path d="M4 7h11M4 12h7M4 17h4M17 6v12M14.5 15.5 17 18l2.5-2.5" />,
  camera: (
    <>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.4-2h6.6l1.4 2h1.8A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.6" />
    </>
  ),
  palette: (
    <>
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
      <circle cx="13.5" cy="6.5" r=".9" />
      <circle cx="17.5" cy="10.5" r=".9" />
      <circle cx="6.5" cy="12.5" r=".9" />
      <circle cx="8.5" cy="7.5" r=".9" />
    </>
  ),
  expand: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
  shrink: <path d="M14 10l6-6M14 10V5.5M14 10h4.5M10 14l-6 6M10 14v4.5M10 14H5.5" />,
  hash: <path d="M9 4L7 20M17 4l-2 16M4 9h17M3 15h17" />,
  square: <rect x="4" y="4" width="16" height="16" rx="3" />,
  sidebar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9 4.5v15" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z" />
    </>
  ),
  // Drawn closed, so the same path reads as an outline or, filled, as kept.
  heart: (
    <path d="M12 20.3l-1.3-1.2C6.1 15 3 12.2 3 8.8 3 6.1 5.1 4 7.8 4c1.5 0 3 .7 4.2 2 1.2-1.3 2.7-2 4.2-2C18.9 4 21 6.1 21 8.8c0 3.4-3.1 6.2-7.7 10.4L12 20.3z" />
  ),
  list: (
    <>
      <rect x="3.5" y="4.5" width="17" height="6" rx="1.5" />
      <rect x="3.5" y="13.5" width="17" height="6" rx="1.5" />
    </>
  ),
  pause: (
    <>
      <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
      <rect x="14" y="5" width="3.5" height="14" rx="1" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5l3.2 4.5-3.2 4.5-3.2-4.5z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c.9-3.6 3.9-5.8 7.5-5.8s6.6 2.2 7.5 5.8" />
    </>
  ),
  shirt: <path d="M9 4.5 4 7l1.8 4 2.2-1V19.5h8V10l2.2 1L20 7l-5-2.5a3 3 0 0 1-6 0z" />,
  box: (
    <>
      <path d="M12 3.5 19.5 7.5v9L12 20.5 4.5 16.5v-9z" />
      <path d="M4.5 7.5 12 11.5l7.5-4M12 11.5v9" />
    </>
  ),
  at: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1" />
    </>
  ),
};

/**
 * Some glyphs are drawn off-centre inside the 24x24 box: the wrench sits
 * low and left, the star high, the stack high, the play triangle right.
 * These offsets put each one's ink back on the centre of the box, measured
 * from its rendered bounding box, so an icon looks centred in a round
 * button instead of leaning. The play triangle keeps a small rightward
 * bias, which is how a triangle reads as centred.
 */
const NUDGE: Partial<Record<IconName, [number, number]>> = {
  tool: [1.42, -1.42],
  layers: [0, 1.5],
  spark: [0, 1],
  play: [-1.5, 0],
  key: [-0.5, 0],
  copy: [-0.5, 0],
  download: [0, 0.5],
  upload: [0, 0.5],
};

/**
 * Icons whose artwork is drawn to a different ink box than the rest of the
 * set: scaled about their own centre so they sit at the same weight and size
 * as their neighbours rather than looming over them.
 */
const FIT: Partial<Record<IconName, { k: number; cx: number; cy: number }>> = {
  palette: { k: 0.8, cx: 12, cy: 12 },
};

export function Icon({ name, size = 18, strokeWidth = 1.6, ...rest }: Props) {
  const nudge = NUDGE[name];
  const fit = FIT[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {fit ? (
        // Scaling the path scales its stroke with it, so the group carries a
        // matching counter-weight and the line lands back at the set's own.
        <g
          transform={`translate(12 12) scale(${fit.k}) translate(${-fit.cx} ${-fit.cy})`}
          strokeWidth={Number(strokeWidth) / fit.k}
        >
          {PATHS[name]}
        </g>
      ) : nudge ? (
        <g transform={`translate(${nudge[0]} ${nudge[1]})`}>{PATHS[name]}</g>
      ) : (
        PATHS[name]
      )}
    </svg>
  );
}
