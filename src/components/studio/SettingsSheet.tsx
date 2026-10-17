"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";
import { usePresence } from "@/lib/usePresence";

export interface SettingRow {
  key: string;
  label: string;
  /** The control that changes it: its chip, which opens its own menu. */
  node: ReactNode;
}

/**
 * A phone's settings in one place, as Higgsfield has them: a round button
 * beside the model that opens a sheet with a row per setting, in place of a
 * wrapping line of chips. Desktops keep the chips and never show this.
 */
export function SettingsSheet({ rows }: { rows: SettingRow[] }) {
  const [open, setOpen] = useState(false);
  const { mounted, exiting } = usePresence(open, 240);
  const sheet = useRef<HTMLDivElement>(null);
  const swipe = useSwipeDismiss(sheet, () => setOpen(false));
  if (rows.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Settings"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-t1/[0.05] text-t1 ring-1 ring-inset ring-edge hover:bg-t1/[0.1] md:hidden"
      >
        <Icon name="sliders" size={16} />
      </button>
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[115] flex items-end md:hidden">
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className={`absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`} />
            <div
              ref={sheet}
              role="dialog"
              aria-label="Settings"
              className={`relative flex w-full flex-col gap-1 rounded-t-panel border-t border-line bg-[var(--popover)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] ${exiting ? "anim-sheet-out" : "anim-sheet"}`}
            >
              <header {...swipe} className="relative flex items-center justify-center pb-2 pt-4">
                <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-t1/20" />
                <p className="text-[16px] font-semibold text-t1">Settings</p>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute right-0 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-t1/[0.06] text-t2 hover:bg-t1/[0.12]">
                  <Icon name="close" size={16} />
                </button>
              </header>
              {rows.map((row) => (
                <div key={row.key} className="flex min-h-[52px] items-center justify-between gap-3">
                  <span className="text-[15px] text-t1">{row.label}</span>
                  {row.node}
                </div>
              ))}
              <button type="button" onClick={() => setOpen(false)} className="mt-2 h-12 w-full cta rounded-card text-[15px]">
                Apply
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
