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
    } else if (mounted) {
      setExiting(true);
    }
  }, [open, mounted]);

  // The clock starts only once the exit class is on screen, so a slow
  // first frame never cuts the animation short.
  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => {
      setMounted(false);
      setExiting(false);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [exiting, duration]);

  return { mounted, exiting };
}
