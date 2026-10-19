"use client";

import { useState } from "react";
import { MediaPreview } from "@/components/MediaViewer";
import { MEDIA_UI } from "@/lib/mediaUi";
import { mediaKind } from "@/lib/upload";

/**
 * What every attached thumbnail carries in its top-right corner on hover:
 * full size in the middle, and a cross to take it out at the top right. It sits directly in the thumb, which is the
 * relative box it hovers over (always shown where there is no hover).
 */
export function ThumbTools({ url, onRemove, tapOpens = true }: { url: string; onRemove: () => void; /** A press anywhere on the picture opens it full screen (not on a tile whose press already does something). */ tapOpens?: boolean }) {
  const [looking, setLooking] = useState(false);
  return (
    <>
      {/* A span, not a button, so a held press on it can still start moving the picture. */}
      {tapOpens && mediaKind(url) !== "audio" && (
        <span
          aria-hidden
          className="absolute inset-0 z-[5] cursor-zoom-in"
          onClick={(event) => {
            event.stopPropagation();
            setLooking(true);
          }}
        />
      )}
      {/* In the middle: full size. Top right: take it out of the prompt. Plain glyphs, on hover (always on a phone). */}
      {mediaKind(url) !== "audio" && (
        <button
          type="button"
          aria-label="View full screen"
          onClick={(event) => {
            event.stopPropagation();
            setLooking(true);
          }}
          className={`${MEDIA_UI.expandTool} ${MEDIA_UI.toolsShow}`}
        >
          <svg viewBox="0 0 16 16" width={MEDIA_UI.expandGlyph} height={MEDIA_UI.expandGlyph} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
          </svg>
        </button>
      )}
      <button
        type="button"
        aria-label="Remove"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className={`${MEDIA_UI.closeTool} ${MEDIA_UI.toolsShow}`}
      >
        <svg viewBox="0 0 16 16" width={MEDIA_UI.closeGlyph} height={MEDIA_UI.closeGlyph} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
        </svg>
      </button>
      <MediaPreview url={looking ? url : null} onClose={() => setLooking(false)} />
    </>
  );
}
