"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { usePresence } from "@/lib/usePresence";

/**
 * A question before something is deleted, with its title and close at the
 * top, what will happen under it, an optional box to tick for more (as
 * "also delete everywhere"), and Cancel and the red action at the foot.
 */
export function ChoiceDialog({
  open,
  title,
  message,
  check,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  check?: { label: string; hint: string };
  confirmLabel: string;
  onConfirm: (checked: boolean) => void;
  onClose: () => void;
}) {
  const { mounted, exiting } = usePresence(open, 180);
  const [checked, setChecked] = useState(false);
  // The words are kept while it fades out, and the box starts unticked each time.
  const [shown, setShown] = useState({ title, message, check, confirmLabel });
  useEffect(() => {
    if (!open) return;
    setShown({ title, message, check, confirmLabel });
    setChecked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={shown.title}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/60 backdrop-blur-sm ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        className={`relative w-full max-w-[400px] rounded-panel border border-line bg-elevated p-4 sm:p-5 ${exiting ? "anim-pop-out" : "anim-pop"}`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="pt-1 text-[16px] font-semibold leading-snug text-t1">{shown.title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-t3">{shown.message}</p>
        {shown.check && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-card bg-t1/[0.05] px-3.5 py-3">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="peer sr-only" />
            <span
              aria-hidden
              className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors duration-[120ms] peer-focus-visible:ring-2 peer-focus-visible:ring-t1/40 ${
                checked ? "border-t1 bg-t1 text-canvas" : "border-t3"
              }`}
            >
              {checked && <Icon name="check" size={12} strokeWidth={2.6} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium text-t1">{shown.check.label}</span>
              <span className="block text-[12px] text-t3">{shown.check.hint}</span>
            </span>
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line-strong px-4 py-2 text-[13.5px] font-medium text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.06]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(checked)}
            className="rounded-full px-4 py-2 text-[13.5px] font-semibold text-white transition-[filter] duration-[120ms] hover:brightness-110"
            style={{ background: "#e5484d" }}
          >
            {shown.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
