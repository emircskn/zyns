"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Slides the tiles that are still there into their new places.
 *
 * Taking one tile out of a grid moves every tile after it, and the browser
 * does that between two frames: the media that fills the gap appears in it
 * with no travel at all. This remembers where each tile stood, and after the
 * layout changes it puts each one back where it was with a transform and
 * lets it move from there, which is the old FLIP trick and costs nothing but
 * a read of the positions.
 *
 * Positions are read from the offsets rather than the viewport, so scrolling
 * between two renders cannot be mistaken for the grid moving. Tiles are
 * matched by a `data-flip` key on each of them, and anything the browser has
 * not laid out yet, or that was not there last time, is left to its own
 * entrance.
 */
export function useReflow(container: RefObject<HTMLElement | null>, duration = 300) {
  const places = useRef(new Map<string, [number, number]>());

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, [number, number]>();

    for (const tile of root.querySelectorAll<HTMLElement>("[data-flip]")) {
      const key = tile.dataset.flip;
      if (!key) continue;
      const at: [number, number] = [tile.offsetLeft, tile.offsetTop];
      next.set(key, at);
      const was = places.current.get(key);
      if (!was || reduce) continue;
      const dx = was[0] - at[0];
      const dy = was[1] - at[1];
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      // A tile still shrinking out of the grid is running its own animation
      // on the same property; moving it as well would fight that.
      if (tile.classList.contains("tile-leave")) continue;
      tile.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration, easing: "cubic-bezier(0.22, 0.61, 0.24, 1)" },
      );
    }

    places.current = next;
  });

  // A window resize relays the grid without a render, so the remembered
  // places would be wrong the next time one happens.
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    function remeasure() {
      const fresh = new Map<string, [number, number]>();
      for (const tile of root!.querySelectorAll<HTMLElement>("[data-flip]")) {
        if (tile.dataset.flip) fresh.set(tile.dataset.flip, [tile.offsetLeft, tile.offsetTop]);
      }
      places.current = fresh;
    }
    window.addEventListener("resize", remeasure);
    return () => window.removeEventListener("resize", remeasure);
  }, [container]);
}
