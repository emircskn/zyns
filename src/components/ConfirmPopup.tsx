"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { usePresence } from "@/lib/usePresence";

/**
 * A yes-or-no question as a small window over everything, for a step that
 * cannot be taken back. Cancelled with its button, a tap outside or Escape.
 */
export function ConfirmPopup({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { mounted, exiting } = usePresence(open, 180);
  // The words are kept while it fades out.
  const [shown, setShown] = useState({ title, message, confirmLabel });
  useEffect(() => {
    if (open) setShown({ title, message, confirmLabel });
  }, [open, title, message, confirmLabel]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Only this closes: the window under it stays open.
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-6"
      role="alertdialog"
      aria-modal="true"
      aria-label={shown.title}
      // Its own: a menu it was opened from (a project's) must not read a
      // press in here as a press outside and close under it.
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/60 backdrop-blur-sm ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        className={`relative w-full max-w-[340px] rounded-panel border border-line bg-elevated p-5 text-center ${
          exiting ? "anim-pop-out" : "anim-pop"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-[#ff6b6b]/12 text-[#ff8f8f]">
          <Icon name="trash" size={18} />
        </span>
        <p className="mb-1 text-[15.5px] font-medium text-t1">{shown.title}</p>
        {shown.message && <p className="text-[13.5px] leading-relaxed text-t3">{shown.message}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-t1/[0.07] py-2.5 text-[14px] font-medium text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.12]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-[#ff6b6b]/90 py-2.5 text-[14px] font-medium text-white transition-colors duration-[120ms] hover:bg-[#ff6b6b]"
          >
            {shown.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
