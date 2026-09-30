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
  | "expand"
  | "hash"
  | "heart"
  | "home"
  | "square"
  | "more"
  | "at"
  | "ai-brain"
  | "coin"
  | "pause"
  | "list"
  | "user";

const PATHS: Record<IconName, ReactElement> = {
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
  hash: <path d="M9 4L7 20M17 4l-2 16M4 9h17M3 15h17" />,
  square: <rect x="4" y="4" width="16" height="16" rx="3" />,
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
