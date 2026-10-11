"use client";

import { useEffect } from "react";

/** The studio is dark only; this keeps <html data-theme> so, and wires up the phone's press state. */
export function ThemeSync() {
  // One theme only: dark. Whatever an older visit saved is not read.
  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  // Safari on a phone shows :active (the press) only once the page listens
  // for touches; an empty listener is enough.
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  return null;
}
