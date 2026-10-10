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
    // First paint sets the theme silently; later switches ease over, so the
    // screen never jumps from dark to bright in one frame.
    if (!root.dataset.theme || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
    const roomy = window.matchMedia("(min-width: 768px)").matches;
    if (roomy && "startViewTransition" in document) {
      (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(apply);
      return;
    }
    // A phone skips the view transition (snapshotting the whole page twice
    // costs it about half a second of dropped frames). It lays one sheet of
    // the old background over the page instead and fades that away: a
    // single layer's opacity, which costs it nothing.
    const veil = document.createElement("div");
    veil.setAttribute("aria-hidden", "true");
    veil.style.cssText = `position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:${getComputedStyle(document.body).backgroundColor}`;
    document.body.appendChild(veil);
    apply();
    veil
      .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: "cubic-bezier(0.32, 0.72, 0, 1)" })
      .finished.finally(() => veil.remove());
  }, [theme, hydrated]);

  // Safari on a phone shows :active (the press) only once the page listens
  // for touches; an empty listener is enough.
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  return null;
}
