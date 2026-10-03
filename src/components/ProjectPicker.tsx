"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { ProjectList } from "@/components/ProjectMenu";
import { usePresence } from "@/lib/usePresence";

/**
 * Choosing the project something already made belongs to: a small window
 * over everything (the enlarged view included, which a menu would open
 * behind), listing the projects and a way to start a new one.
 */
export function ProjectPicker({
  open,
  current,
  count,
  onPick,
  onClose,
}: {
  open: boolean;
  /** The project it is in now, when it is one piece; null for none. */
  current: string | null;
  /** How many are being filed, for the heading. */
  count: number;
  onPick: (projectId: string | null) => void;
  onClose: () => void;
}) {
  const { mounted, exiting } = usePresence(open, 180);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Only this closes: the view under it stays open.
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Add to project">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/60 backdrop-blur-sm ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        className={`relative w-full max-w-[360px] rounded-panel border border-line bg-elevated pb-[max(6px,env(safe-area-inset-bottom))] ${
          exiting ? "anim-pop-out" : "anim-pop"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
          <p className="text-[15px] font-medium text-t1">
            {count > 1 ? `Add ${count} to a project` : "Add to a project"}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.08] hover:text-t1"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <ProjectList current={current} noneLabel="No project" onPick={onPick} close={onClose} />
      </div>
    </div>,
    document.body,
  );
}
