"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export interface GlideBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Measures the element marked `data-pill={value}` inside `root` so one
 * indicator can glide to it. The first measurement lands without motion;
 * every later one is allowed to animate.
 */
export function useGlide(root: RefObject<HTMLElement | null>, value: string, deps: unknown[] = []) {
  const [box, setBox] = useState<GlideBox | null>(null);
  const [settled, setSettled] = useState(false);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const measure = () => {
      const active = node.querySelector<HTMLElement>(`[data-pill="${CSS.escape(value)}"]`);
      if (!active) return setBox(null);
      setBox({ x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight });
      requestAnimationFrame(() => setSettled(true));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, value, ...deps]);

  return { box, settled };
}

/**
 * No spring here on purpose: an overshoot past the first or last pill lands
 * outside the strip, which clips it.
 */
export const GLIDE_TRANSITION =
  "transform var(--d-slow) var(--ease), width var(--d-slow) var(--ease), height var(--d-slow) var(--ease)";
