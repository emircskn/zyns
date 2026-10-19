"use client";

import { Icon } from "@/components/Icon";
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
          className={`${MEDIA_UI.expandTool} ${MEDIA_UI.toolsShow} max-md:hidden`}
        >
          <Icon name="expand" size={MEDIA_UI.expandGlyph + 2} strokeWidth={2} />
        </button>
      )}
      <button
        type="button"
        aria-label="Remove"
        data-round
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className={`${MEDIA_UI.closeTool} ${MEDIA_UI.toolsShow}`}
      >
        <Icon name="close" size={MEDIA_UI.closeGlyph + 2} strokeWidth={2.4} />
      </button>
      <MediaPreview url={looking ? url : null} onClose={() => setLooking(false)} />
    </>
  );
}
