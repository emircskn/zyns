"use client";

import { useEffect, useRef, useState } from "react";
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
  const { box, settled } = useGlide(root, value, [items.length]);
  const [edges, setEdges] = useState({ left: false, right: false });

  // Which edges have more pills behind them, so only those are faded.
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
  // itself into view rather than sitting under a faded edge.
  useEffect(() => {
    const node = root.current;
    if (!node || fill) return;
    const active = node.querySelector<HTMLElement>(`[data-pill="${CSS.escape(value)}"]`);
    if (!active) return;
    const margin = 16;
    if (active.offsetLeft < node.scrollLeft + margin) {
      node.scrollTo({ left: Math.max(0, active.offsetLeft - margin), behavior: "smooth" });
    } else if (active.offsetLeft + active.offsetWidth > node.scrollLeft + node.clientWidth - margin) {
      node.scrollTo({
        left: active.offsetLeft + active.offsetWidth - node.clientWidth + margin,
        behavior: "smooth",
      });
    }
  }, [value, fill]);

  const fade =
    edges.left || edges.right
      ? `linear-gradient(90deg, transparent 0, #000 ${edges.left ? 26 : 0}px, #000 calc(100% - ${
          edges.right ? 26 : 0
        }px), transparent 100%)`
      : undefined;

  const pad =
    size === "lg" ? "px-4 py-2 text-[14px] font-medium" : "px-3.5 py-1.5 text-[12.5px] font-medium";

  return (
    <div
      ref={root}
      style={fade ? { maskImage: fade, WebkitMaskImage: fade } : undefined}
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
            transition: settled ? GLIDE_TRANSITION : "none",
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
