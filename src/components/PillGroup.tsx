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
  const [edges, setEdges] = useState({ left: false, right: false });

  // Which edges have more pills behind them, so only those get an arrow.
  useEffect(() => {
    const node = root.current;
    if (!node || fill) return;
    const update = () => {
      const slack = node.scrollWidth - node.clientWidth;
      setEdges({ left: node.scrollLeft > 2, right: node.scrollLeft < slack - 2 });
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

  const arrow = `absolute top-1/2 z-20 grid -translate-y-1/2 place-items-center rounded-full bg-elevated text-t2 shadow-[0_2px_10px_rgb(0_0_0/0.35)] ring-1 ring-line transition-colors duration-[120ms] hover:text-t1 ${
    size === "lg" ? "h-7 w-7" : "h-6 w-6"
  }`;

  // The pills would otherwise read through from under the arrow, so the strip
  // fades into its own background beneath it: the track's colour where the
  // strip has one, the page's where it does not.
  const scrim = bare ? "var(--canvas)" : "var(--elevated)";
  const scrimWidth = size === "lg" ? "w-14" : "w-12";
  const veil = (side: "left" | "right") => (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 z-10 ${scrimWidth} ${
        side === "left" ? "left-0 rounded-l-full" : "right-0 rounded-r-full"
      }`}
      style={{
        background: `linear-gradient(to ${side === "left" ? "right" : "left"}, ${scrim}, ${scrim} 58%, transparent)`,
      }}
    />
  );

  const strip = (
    <div
      ref={root}
      className={`relative flex ${fill ? "" : "no-bar max-w-full overflow-x-auto"} ${
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

  // The strip scrolls; the arrows sit outside it so they stay put, and each
  // one appears only while there are more pills on that side.
  return (
    <div className="relative min-w-0 max-w-full">
      {strip}
      {edges.left && (
        <>
          {veil("left")}
          <button
            type="button"
            aria-label="Earlier options"
            onClick={() => step(-1)}
            className={`${arrow} left-1`}
          >
            <Icon name="chevron" size={size === "lg" ? 14 : 12} className="rotate-90" />
          </button>
        </>
      )}
      {edges.right && (
        <>
          {veil("right")}
          <button
            type="button"
            aria-label="More options"
            onClick={() => step(1)}
            className={`${arrow} right-1`}
          >
            <Icon name="chevron" size={size === "lg" ? 14 : 12} className="-rotate-90" />
          </button>
        </>
      )}
    </div>
  );
}
