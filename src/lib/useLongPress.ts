"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from "react";

/**
 * Press and hold to start picking, the way a phone's photo grid does — a
 * touch screen has no hover to put a checkbox under. A mouse is left alone:
 * there the checkbox is already on the tile.
 */
export function useLongPress(fire: () => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

  function cancel() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }

  return {
    onPointerDown: (event: ReactPointerEvent) => {
      if (event.pointerType === "mouse") return;
      fired.current = false;
      cancel();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        fire();
      }, ms);
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerMove: cancel,
    // The press already did something, so the tap it ends with must not also
    // open the media.
    onClickCapture: (event: ReactMouseEvent) => {
      if (!fired.current) return;
      fired.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
