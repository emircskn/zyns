"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

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
/** The transitions that move things about, as against a colour fading. */
const LAYOUT = new Set(["grid-template-rows", "height", "max-height", "width"]);

export function useGlide(root: RefObject<HTMLElement | null>, value: string, deps: unknown[] = []) {
  const [box, setBox] = useState<GlideBox | null>(null);
  const [settled, setSettled] = useState(false);
  const last = useRef(value);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    let frame = 0;
    const measure = (follow = false) => {
      const active = node.querySelector<HTMLElement>(`[data-pill="${CSS.escape(value)}"]`);
      if (!active) return setBox(null);
      // A container being resized (a side menu folding) carries the item
      // with it: the highlight goes along at once rather than gliding after.
      if (follow) setSettled(false);
      setBox({ x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight });
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSettled(true));
    };
    // A new choice glides to it; the same one re-measured (its menu changed shape) goes along at once.
    measure(last.current === value);
    last.current = value;
    const observer = new ResizeObserver(() => measure(true));
    observer.observe(node);
    const active = node.querySelector<HTMLElement>(`[data-pill="${CSS.escape(value)}"]`);
    if (active) observer.observe(active);
    // Something above the item that animates its height (a menu opening in
    // place) moves it without resizing anything: follow it frame by frame.
    let tracking = 0;
    const shaping = (event: Event) =>
      LAYOUT.has((event as TransitionEvent).propertyName) && !(event.target as HTMLElement).closest("[data-glide]");
    const follow = (event: Event) => {
      if (!shaping(event)) return;
      cancelAnimationFrame(tracking);
      const step = () => {
        measure(true);
        tracking = requestAnimationFrame(step);
      };
      step();
    };
    const stop = (event: Event) => {
      if (!shaping(event)) return;
      cancelAnimationFrame(tracking);
      measure(true);
    };
    node.addEventListener("transitionstart", follow);
    node.addEventListener("transitionend", stop);
    return () => {
      node.removeEventListener("transitionstart", follow);
      node.removeEventListener("transitionend", stop);
      cancelAnimationFrame(tracking);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, value, ...deps]);

  return { box, settled };
}

/**
 * No spring here on purpose: an overshoot past the first or last pill lands
 * outside the strip, which clips it.
 */
/**
 * The highlight slides to the chosen item, critically damped (Apple's
 * default: no overshoot, about a third of a second). A CSS transition
 * starts from where the highlight is on screen, so a second press mid-way
 * redirects it rather than waiting for it to land.
 */
export const GLIDE_TRANSITION =
  "transform var(--d-slow) var(--ease), width var(--d-slow) var(--ease), height var(--d-slow) var(--ease)";
