"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePresence } from "@/lib/usePresence";

interface Props {
  /** Rendered as the trigger; receives whether the panel is open. */
  trigger: (open: boolean) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "center" | "end";
  /** Panel width in pixels; defaults to a comfortable option list. */
  width?: number;
  title?: string;
}

interface Placement {
  left: number;
  bottom: number;
  width: number;
}

export function Popover({ trigger, children, align = "start", width = 264, title }: Props) {
  const [open, setOpen] = useState(false);
  const { mounted, exiting } = usePresence(open, 140);
  const [place, setPlace] = useState<Placement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      // The panel lives in a portal now, so it is not inside the trigger.
      if (root.current?.contains(target) || panel.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Measured off the trigger, since the panel no longer shares its offset
  // parent. Runs before paint, so the panel never shows at the wrong spot.
  useLayoutEffect(() => {
    if (!mounted) {
      setPlace(null);
      return;
    }
    const measure = () => {
      const node = button.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const margin = 12;
      const w = Math.min(width, window.innerWidth - 2 * margin);
      const left =
        align === "center"
          ? rect.left + rect.width / 2 - w / 2
          : align === "end"
            ? rect.right - w
            : rect.left;
      setPlace({
        // Nudged back inside when a chip sits near an edge.
        left: Math.max(margin, Math.min(left, window.innerWidth - margin - w)),
        bottom: window.innerHeight - rect.top + 10,
        width: w,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [mounted, align, width]);

  return (
    <div className="relative" ref={root}>
      <button ref={button} type="button" onClick={() => setOpen((v) => !v)} className="block">
        {trigger(open)}
      </button>
      {mounted &&
        place &&
        createPortal(
          <div
            ref={panel}
            className={`surface-pop fixed z-50 rounded-panel p-1.5 ${
              exiting ? "anim-rise-out pointer-events-none" : "anim-rise"
            }`}
            style={{ left: place.left, bottom: place.bottom, width: place.width }}
          >
            {title && (
              <div className="px-2.5 pb-2 pt-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-t4">
                {title}
              </div>
            )}
            <div className="max-h-[min(58vh,420px)] overflow-y-auto">
              {typeof children === "function" ? children(() => setOpen(false)) : children}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
