"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { useStudio } from "@/store/studio";

/**
 * The bar that appears once something is picked: what it can do to all of
 * them at once, floating clear of the prompt bar it shares the bottom with.
 */
export function SelectionBar({
  count,
  favorited,
  onFavorite,
  onDownload,
  onDelete,
  onClose,
}: {
  count: number;
  /** True when every pick is already kept, so the button says what it does. */
  favorited: boolean;
  onFavorite: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const page = useStudio((s) => s.page);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setConfirming(false);
  }, [count]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (count === 0 || typeof document === "undefined") return null;

  // On a page that composes, the prompt bar owns the bottom of the screen and
  // this sits above it; elsewhere it keeps its own margin.
  const composing = page !== "assets" && page !== "favorites" && page !== "home";

  // A phone has no room for three labels beside the count, so there the
  // buttons keep their icons and give up their words.
  const button =
    "flex shrink-0 items-center gap-2 rounded-full px-2.5 py-2 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.1] hover:text-t1 sm:px-3.5";

  return createPortal(
    <div
      data-select-bar=""
      className="anim-pop pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3"
      style={{
        // Clear of the prompt bar rather than resting on it: --bar-h covers
        // the bar and its mode strip, and the rest is breathing room.
        bottom: composing
          ? "calc(var(--bar-h, 280px) + 56px + env(safe-area-inset-bottom))"
          : "max(20px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="surface-pop pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1.5 pl-3">
        <span className="mr-0.5 flex shrink-0 items-center gap-2 whitespace-nowrap text-[12.5px] text-t1 sm:mr-1">
          <span className="grid h-6 w-6 place-items-center rounded-chip bg-t1 text-canvas">
            <Icon name="check" size={13} strokeWidth={2.2} />
          </span>
          {count} selected
        </span>
        {confirming ? (
          <>
            <span className="whitespace-nowrap px-2 text-[12.5px]" style={{ color: "var(--danger)" }}>
              Delete {count}?
            </span>
            <button type="button" onClick={() => setConfirming(false)} className={button}>
              No
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex shrink-0 items-center gap-2 rounded-full bg-[#ff6b6b]/85 px-3.5 py-2 text-[12.5px] font-medium text-white transition-colors duration-[120ms] hover:bg-[#ff6b6b]"
            >
              Yes, delete
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onDownload} aria-label="Download" className={button}>
              <Icon name="download" size={14} />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onFavorite}
              aria-label={favorited ? "Unfavorite" : "Favorite"}
              className={button}
            >
              <Icon name="heart" size={14} fill={favorited ? "currentColor" : "none"} />
              <span className="hidden sm:inline">{favorited ? "Unfavorite" : "Favorite"}</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Delete"
              className={button}
              style={{ color: "var(--danger)" }}
            >
              <Icon name="trash" size={14} />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Clear selection"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.1] hover:text-t1"
        >
          <Icon name="close" size={15} />
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** The tick a tile carries while picking, filled once it is picked. */
export function SelectMark({ on }: { on: boolean }) {
  return (
    <span
      className={`grid h-[22px] w-[22px] place-items-center rounded-[7px] border-[1.5px] transition-all duration-[120ms] ${
        on ? "border-transparent bg-t1 text-canvas" : "border-white/70 bg-black/35 text-transparent backdrop-blur-sm"
      }`}
    >
      <Icon name="check" size={13} strokeWidth={2.4} />
    </span>
  );
}
