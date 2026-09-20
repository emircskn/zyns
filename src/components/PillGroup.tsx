"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { GLIDE_TRANSITION, useGlide } from "@/lib/useGlide";

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
  const previous = useRef(value);
  const [jump, setJump] = useState(false);

  // A pill outside the scrolled window would make the indicator glide across
  // ground nobody can see, so it is placed there outright and the strip
  // scrolls it into view instead. Declared before useGlide so it decides
  // before the indicator is measured.
  useLayoutEffect(() => {
    const node = root.current;
    if (!node || fill || previous.current === value) return;
    previous.current = value;
    const target = node.querySelector<HTMLElement>(`[data-pill="${CSS.escape(value)}"]`);
    if (!target) return;
    const visible =
      target.offsetLeft >= node.scrollLeft &&
      target.offsetLeft + target.offsetWidth <= node.scrollLeft + node.clientWidth;
    if (!visible) setJump(true);
  }, [value, fill]);

  useEffect(() => {
    if (!jump) return;
    const timer = window.setTimeout(() => setJump(false), 60);
    return () => window.clearTimeout(timer);
  }, [jump]);

  const { box, settled } = useGlide(root, value, [items.length]);
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
  }, [fill, items.length]);

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

  // One step lands the next pills in view without jumping past them.
  function step(direction: 1 | -1) {
    const node = root.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(140, node.clientWidth * 0.7), behavior: "smooth" });
  }

  const pad =
    size === "lg" ? "px-4 py-2 text-[14px] font-medium" : "px-3.5 py-1.5 text-[12.5px] font-medium";

  const arrow = `grid shrink-0 place-items-center rounded-full bg-t1/[0.07] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1 disabled:opacity-25 disabled:hover:bg-t1/[0.07] disabled:hover:text-t2 ${
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

  const strip = (
    <div
      ref={root}
      className={`relative flex ${fill ? "" : "no-bar min-w-0 max-w-full overflow-x-auto"} ${
        bare ? "gap-1" : "gap-0.5 rounded-full bg-t1/[0.07] p-1"
      } ${className}`}
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

  // The row is always this shape, arrows or not: swapping the tree around
  // the strip would tear it down mid-scroll and lose its observers. Both
  // arrows stay while it overflows, and the one with nothing behind it
  // greys out rather than vanishing, so the row never jumps.
  return (
    <div className="flex min-w-0 max-w-full items-center gap-1.5">
      {edges.over && stepButton("left")}
      {strip}
      {edges.over && stepButton("right")}
    </div>
  );
}
