"use client";

import { useEffect } from "react";
import { useStudio } from "@/store/studio";

/**
 * Mirrors the stored theme onto <html data-theme>, which is what the token
 * layer switches on. Runs after hydration, so the first paint uses the dark
 * default rather than flashing the wrong palette mid-load.
 */
export function ThemeSync() {
  const theme = useStudio((s) => s.theme);
  const hydrated = useStudio((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (root.dataset.theme === theme) return;
    const apply = () => {
      root.dataset.theme = theme;
    };
    // First paint sets the theme silently; later switches cross-fade. A
    // phone skips the cross-fade: snapshotting the whole page twice costs it
    // about half a second of dropped frames.
    const roomy = window.matchMedia("(min-width: 768px)").matches;
    if (!root.dataset.theme || !roomy || !("startViewTransition" in document)) return apply();
    (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(apply);
  }, [theme, hydrated]);

  return null;
}
