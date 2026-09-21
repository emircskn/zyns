"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Keeps an item in a list for the length of its exit animation, in the place
 * it was in, so a deleted tile can shrink out of the grid instead of the
 * grid closing over it between two frames.
 *
 * Give it the list and how to key it; it hands back the list to render and
 * the keys that are on their way out.
 */
export function useLeaving<T>(
  items: T[],
  key: (item: T) => string,
  duration = 260,
): { items: T[]; leaving: Set<string> } {
  const [shown, setShown] = useState(items);
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const live = new Set(items.map(key));
    const gone = shown.filter((item) => !live.has(key(item)) && !leaving.has(key(item)));

    // Whatever is still here keeps its place; what has just gone is spliced
    // back where it was and marked, and anything new lands at the front.
    if (gone.length > 0) {
      const merged = [...items];
      for (const item of gone) {
        const at = shown.indexOf(item);
        merged.splice(Math.min(at, merged.length), 0, item);
      }
      setShown(merged);
      setLeaving((current) => {
        const next = new Set(current);
        for (const item of gone) next.add(key(item));
        return next;
      });
      for (const item of gone) {
        const id = key(item);
        timers.current.set(
          id,
          window.setTimeout(() => {
            timers.current.delete(id);
            setLeaving((current) => {
              const next = new Set(current);
              next.delete(id);
              return next;
            });
            setShown((current) => current.filter((one) => key(one) !== id));
          }, duration),
        );
      }
      return;
    }

    // Nothing left this round: follow the list, but hold on to the ones
    // still animating out.
    const held = shown.filter((item) => leaving.has(key(item)));
    if (held.length === 0) {
      setShown((current) =>
        current.length === items.length && current.every((one, i) => one === items[i])
          ? current
          : items,
      );
      return;
    }
    const merged = [...items];
    for (const item of held) {
      const at = shown.indexOf(item);
      merged.splice(Math.min(at, merged.length), 0, item);
    }
    setShown((current) =>
      current.length === merged.length && current.every((one, i) => one === merged[i])
        ? current
        : merged,
    );
    // `leaving` is read, not tracked: adding it would re-run this on every
    // exit and re-splice a tile that is already on its way out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, duration]);

  // A tile that goes while the page is away should not be held for ever.
  useEffect(() => {
    return () => {
      for (const timer of timers.current.values()) window.clearTimeout(timer);
      timers.current.clear();
    };
  }, []);

  return { items: shown, leaving };
}
