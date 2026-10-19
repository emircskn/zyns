"use client";

import { useState } from "react";
import { MediaPreview } from "@/components/MediaViewer";
import { mediaKind } from "@/lib/upload";

/**
 * What every attached thumbnail carries in its top-right corner on hover:
 * full size in the middle, and a cross to take it out at the top right. It sits directly in the thumb, which is the
 * relative box it hovers over (always shown where there is no hover).
 */
export function ThumbTools({ url, onRemove, large }: { url: string; onRemove: () => void; large?: boolean }) {
  const [looking, setLooking] = useState(false);
  return (
    <>
      {/* In the middle: full size. Top right: take it out of the prompt. Plain glyphs, on hover (always on a phone). */}
      {mediaKind(url) !== "audio" && (
        <button
          type="button"
          aria-label="View full screen"
          onClick={(event) => {
            event.stopPropagation();
            setLooking(true);
          }}
          className={`absolute left-1/2 top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center text-white/85 opacity-0 transition-opacity duration-[120ms] hover:text-white [:hover>&]:opacity-100 max-md:opacity-100 ${large ? "h-9 w-9" : "h-6 w-6"}`}
        >
          <svg viewBox="0 0 16 16" width={large ? 18 : 12} height={large ? 18 : 12} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.7))" }}>
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
        className={`absolute z-10 grid place-items-center text-white opacity-0 transition-opacity duration-[120ms] [:hover>&]:opacity-100 max-md:opacity-100 ${large ? "right-1 top-1 h-8 w-8" : "right-0 top-0 h-6 w-6"}`}
      >
        <svg viewBox="0 0 16 16" width={large ? 16 : 11} height={large ? 16 : 11} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.8))" }}>
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
        </svg>
      </button>
      <MediaPreview url={looking ? url : null} onClose={() => setLooking(false)} />
    </>
  );
}
