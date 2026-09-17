"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  /** Rendered as the trigger; receives whether the panel is open. */
  trigger: (open: boolean) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "center" | "end";
  /** Panel width in pixels; defaults to a comfortable option list. */
  width?: number;
  title?: string;
}

export function Popover({ trigger, children, align = "start", width = 264, title }: Props) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
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

  // Nudge the panel back inside the viewport when a chip sits near an edge.
  useEffect(() => {
    if (!open || !panel.current) {
      setShift(0);
      return;
    }
    const rect = panel.current.getBoundingClientRect();
    const margin = 12;
    if (rect.left < margin) setShift(margin - rect.left);
    else if (rect.right > window.innerWidth - margin) {
      setShift(window.innerWidth - margin - rect.right);
    }
  }, [open]);

  const alignment =
    align === "center" ? "left-1/2 -translate-x-1/2" : align === "end" ? "right-0" : "left-0";

  return (
    <div className="relative" ref={root}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="block">
        {trigger(open)}
      </button>
      {open && (
        <div
          ref={panel}
          className={`surface-pop anim-pop absolute bottom-[calc(100%+10px)] z-50 rounded-panel p-1.5 ${alignment}`}
          style={{ width: `min(${width}px, calc(100vw - 24px))`, marginLeft: shift }}
        >
          {title && (
            <div className="px-2.5 pb-2 pt-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-t4">
              {title}
            </div>
          )}
          <div className="max-h-[min(58vh,420px)] overflow-y-auto">
            {typeof children === "function" ? children(() => setOpen(false)) : children}
          </div>
        </div>
      )}
    </div>
  );
}
