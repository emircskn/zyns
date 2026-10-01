"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { usePresence } from "@/lib/usePresence";

/**
 * Why a run could not be sent, as a small window over everything rather
 * than a strip at the foot of the composer, where it was easy to miss.
 * Closed with OK, a tap outside or Escape.
 */
export function ErrorPopup({ message, onClose }: { message: string | null; onClose: () => void }) {
  const { mounted, exiting } = usePresence(!!message, 180);
  // Kept while it fades out.
  const [shown, setShown] = useState(message);
  useEffect(() => {
    if (message) setShown(message);
  }, [message]);
  useEffect(() => {
    if (!message) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [message, onClose]);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-6" role="alertdialog" aria-modal="true" aria-label="Could not send">
      <button
        type="button"
        aria-label="Close"
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
          <Icon name="alert" size={19} />
        </span>
        <p className="mb-1 text-[15.5px] font-medium text-t1">Couldn&apos;t send</p>
        <p className="mb-5 text-[13.5px] leading-relaxed text-t3">{shown}</p>
        <button type="button" onClick={onClose} autoFocus className="cta w-full rounded-full py-2.5 text-[14px] font-medium">
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
