"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { MediaPreview } from "@/components/MediaViewer";
import { mediaKind } from "@/lib/upload";

/**
 * What every attached thumbnail carries in its top-right corner on hover:
 * full size and take-out. It sits directly in the thumb, which is the
 * relative box it hovers over (always shown where there is no hover).
 */
export function ThumbTools({ url, onRemove, large }: { url: string; onRemove: () => void; large?: boolean }) {
  const [looking, setLooking] = useState(false);
  const size = large ? "h-7 w-7" : "h-[18px] w-[18px]";
  const icon = large ? 14 : 10;
  const btn = `grid ${size} place-items-center rounded-full bg-black/65 text-white transition-colors duration-[120ms] hover:bg-black/85`;
  return (
    <>
      <span
        className={`absolute z-10 flex flex-col gap-1 opacity-0 transition-opacity duration-[120ms] [:hover>&]:opacity-100 max-md:opacity-100 ${large ? "right-1.5 top-1.5" : "right-0.5 top-0.5"}`}
        onClick={(event) => event.stopPropagation()}
      >
        {mediaKind(url) !== "audio" && (
          <button type="button" aria-label="View full screen" onClick={() => setLooking(true)} className={btn}>
            <Icon name="expand" size={icon} />
          </button>
        )}
        <button type="button" aria-label="Remove" onClick={onRemove} className={btn}>
          <Icon name="trash" size={icon} />
        </button>
      </span>
      <MediaPreview url={looking ? url : null} onClose={() => setLooking(false)} />
    </>
  );
}
