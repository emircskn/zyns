"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { GLIDE_TRANSITION, useGlide } from "@/lib/useGlide";

/** Width of the strip's edge fade, in step with --fade-l / --fade-r. */
const FADE = 26;

export interface PillItem<T extends string> {
  id: T;
  label: string;
  hint?: string;
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
  const [edges, setEdges] = useState({ left: false, right: false, over: false });

  // Which edges have more pills behind them, so only those get an arrow.
  useEffect(() => {
    const node = root.current;
    if (!node || fill) return;
    const update = () => {
      const slack = node.scrollWidth - node.clientWidth;
      const next = { left: node.scrollLeft > 2, right: node.scrollLeft < slack - 2, over: slack > 2 };
      // Same numbers, same object: a fresh one every scroll event would
      // re-render the strip for nothing.
      setEdges((prev) =>
        prev.left === next.left && prev.right === next.right && prev.over === next.over ? prev : next,
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
  // itself into view rather than sitting under an arrow.
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

  // A step lands on a pill edge rather than an arbitrary offset, so the
  // strip never comes to rest with a pill half shown or a gap at its end.
  function step(direction: 1 | -1) {
    const node = root.current;
    if (!node) return;
    const pills = [...node.querySelectorAll<HTMLElement>("[data-pill]")];
    const pad = 4;
    if (direction === 1) {
      const edge = node.scrollLeft + node.clientWidth;
      const next = pills.find((el) => el.offsetLeft + el.offsetWidth > edge + 1);
      node.scrollTo({ left: next ? next.offsetLeft - pad : node.scrollWidth, behavior: "smooth" });
    } else {
      const previous = [...pills].reverse().find((el) => el.offsetLeft < node.scrollLeft - 1);
      const left = previous
        ? previous.offsetLeft + previous.offsetWidth + pad - node.clientWidth
        : 0;
      node.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
  }

  const pad =
    size === "lg" ? "px-4 py-2 text-[14px] font-medium" : "px-3.5 py-1.5 text-[12.5px] font-medium";

  const arrow = `grid shrink-0 place-items-center rounded-full bg-elevated/90 text-t2 ring-1 ring-inset ring-line backdrop-blur-xl transition-colors duration-[120ms] hover:text-t1 disabled:opacity-40 disabled:hover:text-t2 ${
    size === "lg" ? "h-8 w-8" : "h-7 w-7"
  }`;

  // A plain function, not a component: a component declared in here would be
  // a new type on every render, and React would tear the buttons down and
  // rebuild them each time the strip scrolls.
  const stepButton = (side: "left" | "right") => (
    <button
      type="button"
      disabled={side === "left" ? !edges.left : !edges.right}
      aria-label={side === "left" ? "Earlier options" : "More options"}
      onClick={() => step(side === "left" ? -1 : 1)}
      className={arrow}
    >
      <Icon
        name="chevron"
        size={size === "lg" ? 15 : 13}
        className={side === "left" ? "rotate-90" : "-rotate-90"}
      />
    </button>
  );

  // In fill mode the row is not a scroller, so it still wears the track
  // itself. Everywhere else the track moves to a wrapper, leaving the
  // scroller free to fade its own contents out without taking the
  // background and the ring with them.
  const scroller = fill
    ? `relative flex gap-0.5 ${bare ? "" : "rounded-full bg-t1/[0.07] p-1"} ${className}`
    : `pill-fade no-bar relative flex min-w-0 max-w-full overflow-x-auto ${
        bare ? "gap-1" : "gap-0.5 p-1"
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
            className={`relative z-10 shrink-0 whitespace-nowrap rounded-full tracking-[-0.01em] transition-colors duration-[200ms] ${pad} ${
              fill ? "flex-1 text-center" : ""
            } ${active ? "text-canvas" : "text-t3 hover:text-t1"}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );

  if (fill) return strip;

  const tracked = (
    <div
      className={`relative min-w-0 max-w-full ${bare ? "" : "rounded-full bg-t1/[0.07]"} ${className}`}
    >
      {strip}
    </div>
  );

  // The row is always this shape, arrows or not: swapping the tree around
  // the strip would tear it down mid-scroll and lose its observers. Both
  // arrows stay while it overflows, and the one with nothing behind it
  // greys out rather than vanishing, so the row never jumps.
  return (
    <div className="flex min-w-0 max-w-full items-center gap-1.5">
      {edges.over && stepButton("left")}
      {tracked}
      {edges.over && stepButton("right")}
    </div>
  );
}
