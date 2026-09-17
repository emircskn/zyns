import type { ReactElement, SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

export type IconName =
  | "image"
  | "video"
  | "audio"
  | "tool"
  | "sliders"
  | "plus"
  | "close"
  | "chevron"
  | "search"
  | "key"
  | "spark"
  | "arrow-up"
  | "download"
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
  | "mic"
  | "wand"
  | "hash";

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
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" />
    </>
  ),
  wand: (
    <>
      <path d="M4 20l10-10M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.3L21 14l-1.3.7L19 16l-.7-1.3L17 14l1.3-.7z" />
    </>
  ),
  hash: <path d="M9 4L7 20M17 4l-2 16M4 9h17M3 15h17" />,
};

export function Icon({ name, size = 18, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
