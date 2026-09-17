"use client";

import { useEffect, useState } from "react";

/**
 * Keeps an overlay mounted for the length of its exit animation so it can
 * leave the way it arrived instead of vanishing on the next frame.
 */
export function usePresence(open: boolean, duration = 240) {
  const [mounted, setMounted] = useState(open);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      return;
    }
    if (!mounted) return;
    setExiting(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setExiting(false);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [open, mounted, duration]);

  return { mounted, exiting };
}
