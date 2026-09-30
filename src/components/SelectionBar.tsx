"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { useStudio } from "@/store/studio";
import { saveLabel, type SaveResult, type SaveState } from "@/lib/download";
import { SaveGlyph } from "@/components/SaveGlyph";

/**
 * The bar that appears once something is picked: what it can do to all of
 * them at once, floating clear of the prompt bar it shares the bottom with.
 */
export function SelectionBar({
  open = false,
  count,
  total,
  onSelectAll,
  favorited,
  onFavorite,
  onDownload,
  onDelete,
  onClose,
}: {
  /** Up with nothing picked yet: a phone's Select button was pressed. */
  open?: boolean;
  count: number;
  /** How many the page shows, so Select all can say whether it has anything left to add. */
  total: number;
  /** Picks everything on this page (and only this page). */
  onSelectAll: () => void;
  /** True when every pick is already kept, so the button says what it does. */
  favorited: boolean;
  onFavorite: () => void;
  /** Resolves "retry" when the phone needs one more tap to open its share sheet. */
  onDownload: () => Promise<SaveResult> | void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const setSelecting = useStudio((s) => s.setSelecting);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState<SaveState>("idle");

  useEffect(() => {
    setConfirming(false);
    setSaving("idle");
  }, [count]);

  async function download() {
    setSaving("busy");
    const result = await onDownload();
    setSaving(result === "retry" ? "retry" : result === "saved" ? "done" : "idle");
  }

  // The prompt bar steps aside for this one rather than stacking above it, so
  // it has to know how many are picked. Leaving the page clears the count.
  useEffect(() => {
    setSelecting(count);
    return () => setSelecting(0);
  }, [count, setSelecting]);

  // Only while something is picked. Listening with nothing picked meant every
  // Escape in the studio set the selection to a fresh empty array, which
  // re-rendered the page under the enlarged view and pulled its own Escape
  // listener off the document mid-dispatch, so the view never closed.
  useEffect(() => {
    if (count === 0 && !open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [count, open, onClose]);

  if ((count === 0 && !open) || typeof document === "undefined") return null;

  // A phone has no room for three labels beside the count, so there the
  // buttons keep their icons and give up their words.
  const button =
    "flex shrink-0 items-center gap-2 rounded-full px-2.5 py-2 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.1] hover:text-t1 sm:px-3.5";

  return createPortal(
    // Where the prompt bar stands: it slides out of the way as this rises
    // into its place, so the bottom of the screen is about the picture you
    // picked rather than about the next one you might make.
    <div
      data-select-bar=""
      className="bar-rise pointer-events-none fixed bottom-[var(--nav-h)] left-0 right-0 z-50 flex justify-center px-3 pb-3 md:pb-5 md:pl-4 md:pr-4"
    >
      <div className="surface-pop pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1.5 pl-3">
        <span className="mr-0.5 flex shrink-0 items-center gap-2 whitespace-nowrap text-[12.5px] text-t1 sm:mr-1">
          <span className="grid h-6 w-6 place-items-center rounded-chip bg-t1 text-canvas">
            <Icon name="check" size={15} strokeWidth={2.2} />
          </span>
          {count === 0 ? "Tap to select" : `${count} selected`}
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
            {count < total && (
              <button type="button" onClick={onSelectAll} aria-label={`Select all ${total}`} className={button}>
                <Icon name="grid" size={16} />
                <span className="hidden sm:inline">Select all</span>
              </button>
            )}
            {count > 0 && (
            <>
            <button
              type="button"
              onClick={download}
              disabled={saving === "busy"}
              aria-label={saveLabel(saving)}
              className={`${button} ${saving === "done" || saving === "retry" ? "bg-t1/[0.1] text-t1" : ""}`}
            >
              <SaveGlyph state={saving} size={16} />
              {/* The one more tap a phone may ask for has to say so, even
                  where the other buttons keep to their icons. */}
              <span className={saving === "retry" ? "inline" : "hidden sm:inline"}>{saveLabel(saving)}</span>
            </button>
            <button
              type="button"
              onClick={onFavorite}
              aria-label={favorited ? "Unfavorite" : "Favorite"}
              className={button}
            >
              <Icon name="heart" size={16} fill={favorited ? "currentColor" : "none"} />
              <span className="hidden sm:inline">{favorited ? "Unfavorite" : "Favorite"}</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Delete"
              className={button}
              style={{ color: "var(--danger)" }}
            >
              <Icon name="trash" size={16} />
              <span className="hidden sm:inline">Delete</span>
            </button>
            </>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Clear selection"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.1] hover:text-t1"
        >
          <Icon name="close" size={17} />
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
      <Icon name="check" size={15} strokeWidth={2.4} />
    </span>
  );
}
