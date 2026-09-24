"use client";

import { Icon } from "@/components/Icon";
import type { SaveState } from "@/lib/download";

/**
 * What a Download button shows for where its save has got to: the arrow,
 * a turning ring while the file is fetched, and a tick that draws itself in
 * once it is saved.
 */
export function SaveGlyph({ state, size }: { state: SaveState; size: number }) {
  if (state === "busy") {
    return <span aria-hidden className="save-spin" style={{ width: size - 2, height: size - 2 }} />;
  }
  if (state === "done") {
    return (
      <svg
        aria-hidden
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="save-done shrink-0"
      >
        <path d="M5 13l4 4L19 7" pathLength={1} />
      </svg>
    );
  }
  return <Icon name="download" size={size} />;
}
