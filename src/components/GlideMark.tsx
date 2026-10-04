"use client";

import { useMemo, useRef } from "react";
import { GLIDE_TRANSITION, useGlide } from "@/lib/useGlide";

/**
 * The one highlight that slides to the chosen item (marked `data-pill`), as
 * the page tabs and mode strips do, rather than each item swapping its own
 * background. It measures inside the element it sits in, which must be
 * positioned. Its own node is always there, so it can find that element on
 * the very first paint (a ref on the menu itself is attached only after a
 * child's effects run, and the first measurement came up empty).
 */
export function GlideMark({ value, className, deps = [] }: { value: string; className: string; deps?: unknown[] }) {
  const self = useRef<HTMLSpanElement>(null);
  const root = useMemo(
    () => ({
      get current() {
        return self.current?.parentElement ?? null;
      },
    }),
    [],
  );
  const { box, settled } = useGlide(root, value, deps);
  return (
    <span
      ref={self}
      aria-hidden
      className={`pointer-events-none absolute left-0 top-0 ${box ? "" : "hidden"} ${className}`}
      style={
        box
          ? {
              width: box.w,
              height: box.h,
              transform: `translate(${box.x}px, ${box.y}px)`,
              transition: settled ? GLIDE_TRANSITION : "none",
            }
          : undefined
      }
    />
  );
}
