"use client";

import { Icon } from "@/components/Icon";
import { useEffect, useState } from "react";
import { useStudio } from "@/store/studio";

/**
 * The tile of the media opened last: dimmed a little and marked, so the way back into a long wall is easy to find.
 * It comes in after the enlarged view has opened, fading, rather than flashing on the tile as it is pressed.
 */
export function LastViewedMark({ url, small }: { url: string; small?: boolean }) {
  const last = useStudio((s) => s.viewed[0] === url);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!last) return setShown(false);
    const timer = window.setTimeout(() => setShown(true), 450);
    return () => window.clearTimeout(timer);
  }, [last]);
  if (!last) return null;
  return (
    <span
      className={`pointer-events-none absolute inset-0 z-[5] grid place-items-center rounded-[inherit] bg-black/45 transition-opacity duration-[500ms] ease-out ${shown ? "opacity-100" : "opacity-0"}`}
    >
      <span className={`flex items-center gap-1.5 font-semibold text-white ${small ? "text-[11px]" : "text-[13px]"}`}>
        <Icon name="eye" size={small ? 14 : 16} strokeWidth={2} />
        Last viewed
      </span>
    </span>
  );
}
