"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
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
      {/* In the middle: full size. Top right: take it out of the prompt. Both on hover, always on a phone. */}
      {mediaKind(url) !== "audio" && (
        <button
          type="button"
          aria-label="View full screen"
          onClick={(event) => {
            event.stopPropagation();
            setLooking(true);
          }}
          className={`absolute left-1/2 top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity duration-[120ms] hover:bg-black/80 [:hover>&]:opacity-100 max-md:opacity-100 ${large ? "h-8 w-8" : "h-[22px] w-[22px]"}`}
        >
          <Icon name="expand" size={large ? 15 : 11} />
        </button>
      )}
      <button
        type="button"
        aria-label="Remove"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className={`absolute z-10 grid place-items-center rounded-full bg-black/65 text-white opacity-0 transition-opacity duration-[120ms] hover:bg-black/85 [:hover>&]:opacity-100 max-md:opacity-100 ${large ? "right-1.5 top-1.5 h-7 w-7" : "right-0.5 top-0.5 h-[18px] w-[18px]"}`}
      >
        <Icon name="close" size={large ? 15 : 11} />
      </button>
      <MediaPreview url={looking ? url : null} onClose={() => setLooking(false)} />
    </>
  );
}
