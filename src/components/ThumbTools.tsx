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
          className={`absolute left-1/2 top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg bg-black/60 text-white/90 backdrop-blur-sm opacity-0 transition-[opacity,background-color] duration-[120ms] hover:bg-black/75 hover:text-white [:hover>&]:opacity-100 max-md:opacity-100 ${large ? "h-9 w-9" : "h-[22px] w-[22px]"}`}
        >
          <svg viewBox="0 0 16 16" width={large ? 18 : 12} height={large ? 18 : 12} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        className={`absolute z-10 grid place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm opacity-0 transition-[opacity,background-color] duration-[120ms] hover:bg-black/80 [:hover>&]:opacity-100 max-md:opacity-100 ${large ? "right-1.5 top-1.5 h-7 w-7" : "right-1 top-1 h-4 w-4"}`}
      >
        <svg viewBox="0 0 16 16" width={large ? 14 : 8} height={large ? 14 : 8} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
        </svg>
      </button>
      <MediaPreview url={looking ? url : null} onClose={() => setLooking(false)} />
    </>
  );
}
