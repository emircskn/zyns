"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { GLIDE_TRANSITION, useGlide } from "@/lib/useGlide";

/** Width of the strip's edge fade, in step with --fade-l / --fade-r. */
const FADE = 26;

export interface PillItem<T extends string> {
  id: T;
  label: string;
  hint?: string;
  /** How many things are behind this pill, set beside the label. */
  count?: number;
}

/**
 * A row of pills with one cream indicator that glides to the selection
 * instead of each pill repainting on its own.
 */
export function PillGroup<T extends string>({
  items,
  value,
  onChange,
  size = "sm",
  fill = false,
  bare = false,
  plain = false,
  className = "",
}: {
  items: PillItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** sm: chips and segments; lg: page-level tabs. */
  size?: "sm" | "lg";
  /** Stretch pills to share the row (segmented controls). */
  fill?: boolean;
  /** No track behind the pills (page tabs). */
  bare?: boolean;
  /**
   * Tabs and nothing else: no track, no counts, just the
   * words and the one pill under the chosen one. The strip still scrolls
   * under a thumb or a trackpad when it runs past its edge.
   */
  plain?: boolean;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const itemsKey = items.map((item) => item.id).join("|");
  const previous = useRef(value);
  const previousItems = useRef(itemsKey);
  const [jump, setJump] = useState(false);

  // The indicator is placed outright rather than glided in two cases: the
  // pill is outside the scrolled window, where the glide would cross ground
  // nobody can see, and the whole set of pills has changed, where the old
  // position means nothing and the marker would drift across empty track.
  // Declared before useGlide so it decides before the indicator is measured.
  useLayoutEffect(() => {
    const node = root.current;
    if (!node || fill) return;
    const swapped = previousItems.current !== itemsKey;
    if (!swapped && previous.current === value) return;
    previous.current = value;
    previousItems.current = itemsKey;
    if (swapped) return setJump(true);
    const target = node.querySelector<HTMLElement>(`[data-pill="${CSS.escape(value)}"]`);
    if (!target) return;
    const visible =
      target.offsetLeft >= node.scrollLeft &&
      target.offsetLeft + target.offsetWidth <= node.scrollLeft + node.clientWidth;
    if (!visible) setJump(true);
  }, [value, fill, itemsKey]);

  useEffect(() => {
    if (!jump) return;
    const timer = window.setTimeout(() => setJump(false), 60);
    return () => window.clearTimeout(timer);
  }, [jump]);

  const { box, settled } = useGlide(root, value, [itemsKey]);
  const [edges, setEdges] = useState({ left: false, right: false });

  // Which edges have more pills behind them, so only those fade out.
  useEffect(() => {
    const node = root.current;
    if (!node || fill) return;
    const update = () => {
      const slack = node.scrollWidth - node.clientWidth;
      const next = { left: node.scrollLeft > 2, right: node.scrollLeft < slack - 2 };
      // Same numbers, same object: a fresh one every scroll event would
      // re-render the strip for nothing.
      setEdges((prev) =>
        prev.left === next.left && prev.right === next.right ? prev : next,
      );
    };
    update();
    node.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [fill, itemsKey]);

  // A selection made with the keyboard, or one that starts off-screen, pulls
  // itself into view rather than sitting under a faded edge.
  useEffect(() => {
    const node = root.current;
    if (!node || fill) return;
    const active = node.querySelector<HTMLElement>(`[data-pill="${CSS.escape(value)}"]`);
    if (!active) return;
    const margin = 34;
    if (active.offsetLeft < node.scrollLeft + margin) {
      node.scrollTo({ left: Math.max(0, active.offsetLeft - margin), behavior: "smooth" });
    } else if (active.offsetLeft + active.offsetWidth > node.scrollLeft + node.clientWidth - margin) {
      node.scrollTo({
        left: active.offsetLeft + active.offsetWidth - node.clientWidth + margin,
        behavior: "smooth",
      });
    }
  }, [value, fill]);

  // The fade is kind to a half-shown label and unkind to the cream pill: a
  // solid shape dissolving into the track reads as a smudge, not a hint that
  // there is more behind it. So once scrolling settles the selected pill is
  // never left straddling an edge — it comes all the way in if most of it is
  // already showing, and otherwise goes all the way out.
  useEffect(() => {
    const node = root.current;
    if (!node || fill) return;
    let timer = 0;
    const settle = () => {
      const active = node.querySelector<HTMLElement>(`[data-pill="${CSS.escape(value)}"]`);
      if (!active) return;
      const start = active.offsetLeft;
      const end = start + active.offsetWidth;
      const viewStart = node.scrollLeft;
      const viewEnd = viewStart + node.clientWidth;
      // Off-screen entirely, or wider than the window: nothing worth nudging.
      if (end <= viewStart || start >= viewEnd) return;
      if (active.offsetWidth > node.clientWidth) return;
      const slack = node.scrollWidth - node.clientWidth;
      const fadeLeft = viewStart > 2 ? FADE : 0;
      const fadeRight = viewStart < slack - 2 ? FADE : 0;
      if (start >= viewStart + fadeLeft && end <= viewEnd - fadeRight) return;
      const shown = Math.min(end, viewEnd) - Math.max(start, viewStart);
      let left: number;
      if (shown >= active.offsetWidth / 2) {
        left =
          start < viewStart + fadeLeft
            ? start - fadeLeft
            : end + fadeRight - node.clientWidth;
      } else {
        // Barely showing: the scroll was heading past it, so let it go.
        left = start < viewStart + node.clientWidth / 2 ? end : start - node.clientWidth;
      }
      left = Math.max(0, Math.min(slack, left));
      if (Math.abs(left - viewStart) < 1) return;
      node.scrollTo({ left, behavior: "smooth" });
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 140);
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      node.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [value, fill, itemsKey]);

  const flat = bare || plain;
  const pad = plain
    ? "px-4 py-2 text-[14px] font-semibold"
    : size === "lg"
      ? "px-4 py-2 text-[14px] font-medium"
      : "px-3.5 py-1.5 text-[13px] font-medium";

  // In fill mode the row is not a scroller, so it still wears the track
  // itself. Everywhere else the track moves to a wrapper, leaving the
  // scroller free to fade its own contents out without taking the
  // background and the ring with them.
  const scroller = fill
    // Segments wrap rather than run off the end of whatever holds them: three
    // words like Transparent / Opaque / Auto do not fit a chip's popover on
    // one line, and a row that overflows put a scrollbar through the control.
    ? `relative flex flex-wrap gap-0.5 ${flat ? "" : "rounded-2xl bg-t1/[0.07] p-1"} ${className}`
    : `pill-fade no-bar relative flex min-w-0 max-w-full overflow-x-auto ${
        // The scroller does the clipping, so it needs the track's own radius:
        // a square clip lets a pill's corner sit outside the capsule's end.
        flat ? "gap-1" : "gap-0.5 rounded-full p-1"
      }`;

  const strip = (
    <div
      ref={root}
      className={scroller}
      style={
        fill
          ? undefined
          : ({
              "--fade-l": edges.left ? `${FADE}px` : "0px",
              "--fade-r": edges.right ? `${FADE}px` : "0px",
            } as CSSProperties)
      }
    >
      {box && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-full bg-t1"
          style={{
            width: box.w,
            height: box.h,
            transform: `translate(${box.x}px, ${box.y}px)`,
            transition: settled && !jump ? GLIDE_TRANSITION : "none",
          }}
        />
      )}
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            data-pill={item.id}
            title={item.hint}
            onClick={() => onChange(item.id)}
            className={`relative z-10 shrink-0 whitespace-nowrap rounded-full tracking-[-0.01em] transition-colors duration-[200ms] ${
              fill ? "grow text-center" : ""
            } ${pad} ${
              fill ? "flex-1 text-center" : ""
            } ${active ? "text-canvas" : "text-t3 hover:text-t1"}`}
          >
            {item.label}
            {item.count !== undefined && !plain && (
              <span
                className={`ml-1.5 font-mono text-[0.86em] tabular-nums ${
                  active ? "opacity-55" : "text-t4"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  if (fill) return strip;

  const tracked = (
    <div
      className={`relative min-w-0 max-w-full ${flat ? "" : "rounded-full bg-t1/[0.07]"} ${className}`}
    >
      {strip}
    </div>
  );

  // No step arrows: a strip that runs long scrolls under a thumb or a
  // trackpad, and its fading edge is what says there is more past it.
  return tracked;
}
