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
    document.documentElement.dataset.theme = theme;
  }, [theme, hydrated]);

  return null;
}
