"use client";

import { useId } from "react";

/**
 * The setting cards' pictures while nothing is chosen, drawn as small
 * objects the way Higgsfield's are: a strip of film, a lens, a painter's
 * palette, a ring light, a row of faders.
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
        <linearGradient id={`${id}wood`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#efe2c8" />
          <stop offset="1" stopColor="#b8956a" />
        </linearGradient>
        <radialGradient id={`${id}warm`} cx="0.5" cy="0.42" r="0.5">
          <stop offset="0" stopColor="#fff0d0" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}ringlit`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#fff1d6" />
          <stop offset="1" stopColor="#f2c27a" />
        </linearGradient>
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
        // A painter's palette in pale wood, its thumb hole, and four dabs of paint.
        <g>
          <path
            d="M18.4 6.2c6.6 0 11.4 4 11.4 9.4 0 3.6-2.8 5.4-5.6 5-1.9-.3-3.2.7-2.7 2.6.6 2.4-.9 4.6-4.1 4.6-6.1 0-11.2-4.2-11.2-10.6 0-6.4 5.2-11 12.2-11z"
            fill={`url(#${id}wood)`}
          />
          <ellipse cx="13.6" cy="21.8" rx="2.1" ry="1.8" fill="#16171a" />
          <circle cx="12.4" cy="14" r="2.3" fill="#e5484d" />
          <circle cx="17.6" cy="10.6" r="2.3" fill="#f2c94c" />
          <circle cx="23.2" cy="11.8" r="2.3" fill="#3fb37f" />
          <circle cx="25.4" cy="16.6" r="2.1" fill="#4c7bf0" />
          <circle cx="11.8" cy="13.3" r="0.7" fill="#fff" fillOpacity="0.6" />
          <circle cx="17" cy="9.9" r="0.7" fill="#fff" fillOpacity="0.6" />
          <circle cx="22.6" cy="11.1" r="0.7" fill="#fff" fillOpacity="0.6" />
          <circle cx="24.8" cy="15.9" r="0.6" fill="#fff" fillOpacity="0.6" />
        </g>
      )}
      {kind === "light" && (
        // A ring light on its stand: a glowing white circle with the dark middle a camera looks through.
        <g>
          <circle cx="18" cy="15" r="14" fill={`url(#${id}warm)`} />
          <path d="M18 25.5v5.2M14 31.5h8" stroke="#8a8e96" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="18" cy="15" r="9.6" fill="none" stroke="#2a2c31" strokeWidth="5.2" />
          <circle cx="18" cy="15" r="9.6" fill="none" stroke={`url(#${id}ringlit)`} strokeWidth="3.4" />
          <circle cx="18" cy="15" r="4.2" fill="#0d0e11" />
          <circle cx="18" cy="15" r="1.4" fill="#3a4a66" />
          <path d="M11.6 9.6a8.6 8.6 0 0 1 5-3" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" fill="none" />
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
