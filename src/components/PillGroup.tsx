"use client";

import { useLayoutEffect, useRef, useState } from "react";

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
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [settled, setSettled] = useState(false);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const measure = () => {
      const active = node.querySelector<HTMLElement>(`[data-pill="${CSS.escape(value)}"]`);
      if (!active) return setBox(null);
      setBox({ x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight });
      // The first measurement lands without motion; every later one glides.
      requestAnimationFrame(() => setSettled(true));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, items]);

  const pad =
    size === "lg" ? "px-5 py-2.5 text-[17px] font-medium" : "px-3.5 py-1.5 text-[12.5px] font-medium";

  return (
    <div
      ref={root}
      className={`relative flex ${fill ? "" : "max-w-full overflow-x-auto [scrollbar-width:none]"} ${
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
            transition: settled
              ? "transform var(--d-slow) var(--ease-spring), width var(--d-slow) var(--ease-spring), height var(--d-slow) var(--ease-spring)"
              : "none",
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
}
