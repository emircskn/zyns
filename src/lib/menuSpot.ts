"use client";

/** Where a floating list sits: fixed, from the left and the top or the bottom of the screen. */
export interface MenuSpot {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight?: number;
}

/**
 * On a phone, the `@` list docks just above the keyboard, the full width
 * of the screen. Following the caret there went wrong: with the keyboard
 * up, the page and the visible part of it no longer line up, and the list
 * ended half off the top. Measured against the visible part (the visual
 * viewport), so it sits on the keyboard whatever the page did. Null on a
 * desktop, which keeps the list at the caret.
 */
export function dockedSpot(): MenuSpot | null {
  if (typeof window === "undefined" || window.innerWidth >= 768) return null;
  const view = window.visualViewport;
  const viewTop = view?.offsetTop ?? 0;
  const viewHeight = view?.height ?? window.innerHeight;
  const viewWidth = view?.width ?? window.innerWidth;
  // The page's own height, which the keyboard does not change.
  const pageHeight = document.documentElement.clientHeight;
  const gutter = 16;
  return {
    left: (view?.offsetLeft ?? 0) + gutter,
    width: viewWidth - 2 * gutter,
    bottom: Math.max(0, pageHeight - (viewTop + viewHeight)) + 8,
    maxHeight: Math.round(Math.min(320, viewHeight * 0.45)),
  };
}
