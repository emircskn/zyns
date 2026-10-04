"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Whether this screen has a pointer that hovers; a phone's finger does not. */
export function canHover() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * A menu row's own panel beside the menu, as a desktop menu opens one on
 * hover. Drawn over everything, and marked so the menu it came from does
 * not read a press in it as a press outside.
 */
export function SidePanel({
  anchor,
  children,
  onEnter,
  onLeave,
  width = 200,
  layer = "z-[95]",
}: {
  anchor: HTMLElement;
  children: ReactNode;
  onEnter: () => void;
  onLeave: () => void;
  width?: number;
  /** Above the menu it belongs to. */
  layer?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  useLayoutEffect(() => {
    const row = anchor.getBoundingClientRect();
    // The menu's own edge, so the panel sits beside the whole menu and not over it.
    const menu = (anchor.closest(".surface-pop") as HTMLElement | null)?.getBoundingClientRect() ?? row;
    const height = panel.current?.offsetHeight ?? 0;
    const room = window.innerWidth - menu.right;
    const left = room >= width + 12 ? menu.right + 6 : Math.max(8, menu.left - width - 6);
    const view = window.visualViewport?.height ?? window.innerHeight;
    const top = Math.max(8, Math.min(row.top - 6, view - height - 8));
    setPlace({ left, top, maxHeight: view - 16 });
  }, [anchor, width]);
  return createPortal(
    <div
      ref={panel}
      data-popover-keep=""
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`surface-pop anim-rise no-bar fixed ${layer} overflow-y-auto rounded-panel p-1.5`}
      style={place ? { left: place.left, top: place.top, maxHeight: place.maxHeight, width } : { left: -9999, top: 0, width }}
    >
      {children}
    </div>,
    document.body,
  );
}
