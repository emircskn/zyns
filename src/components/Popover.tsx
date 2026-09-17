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

export function Popover({ trigger, children, align = "start", width = 260, title }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

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

  const alignment =
    align === "center" ? "left-1/2 -translate-x-1/2" : align === "end" ? "right-0" : "left-0";

  return (
    <div className="relative" ref={root}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="block">
        {trigger(open)}
      </button>
      {open && (
        <div
          className={`glass animate-rise absolute bottom-[calc(100%+8px)] z-50 rounded-2xl p-1.5 shadow-2xl shadow-black/60 ${alignment}`}
          style={{ width }}
        >
          {title && (
            <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-ink-400">
              {title}
            </div>
          )}
          <div className="max-h-[min(60vh,420px)] overflow-y-auto">
            {typeof children === "function" ? children(() => setOpen(false)) : children}
          </div>
        </div>
      )}
    </div>
  );
}
