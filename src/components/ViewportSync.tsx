"use client";

import { useEffect } from "react";
import { useStudio } from "@/store/studio";

/** The width a phone lays the page out at in desktop view. */
export const DESKTOP_WIDTH = 1280;
const PHONE = "width=device-width, initial-scale=1, viewport-fit=cover";

/**
 * Desktop view on a phone: the page is laid out at a desktop's width and
 * the phone shows it shrunk to fit, so every desktop layout (side menus,
 * the composer across the page) can be seen there. Off, the phone's own
 * layout comes back.
 */
export function ViewportSync() {
  const on = useStudio((s) => s.desktopView);
  const hydrated = useStudio((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) return;
    const next = on ? `width=${DESKTOP_WIDTH}, viewport-fit=cover` : PHONE;
    if (meta.content === next) return;
    meta.content = next;
  }, [on, hydrated]);

  return null;
}

/** Whether this screen is narrow enough for desktop view to mean anything. */
export function smallScreen(): boolean {
  return typeof window !== "undefined" && Math.min(window.screen.width, window.screen.height) < 820;
}
