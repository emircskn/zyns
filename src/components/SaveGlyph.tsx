"use client";

import { Icon } from "@/components/Icon";
import type { SaveState } from "@/lib/download";

/**
 * What a Download button shows for where its save has got to: the arrow,
 * a turning ring while the file is fetched, and a tick once it is saved.
 */
export function SaveGlyph({ state, size }: { state: SaveState; size: number }) {
  if (state === "busy") {
    return <span aria-hidden className="save-spin" style={{ width: size - 2, height: size - 2 }} />;
  }
  if (state === "done") {
    return <Icon name="check" size={size} strokeWidth={2.2} className="shrink-0" />;
  }
  return <Icon name="download" size={size} />;
}
