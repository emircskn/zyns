"use client";

import { useEffect } from "react";

/** A full-screen layer on top of the page: a window, a sheet, the viewer. The decorative backdrop is aria-hidden. */
const LAYER = '.fixed.inset-0:not([aria-hidden="true"])';

/**
 * Keeps the page still while any window or panel is open over it. Setting
 * `overflow: hidden` on the body does not stop iOS scrolling the page under a
 * layer, so the body is pinned in place instead and put back where it was.
 */
export function ScrollLock() {
  useEffect(() => {
    const body = document.body;
    let top: number | null = null;
    let queued = 0;

    const sync = () => {
      queued = 0;
      const open = !!document.querySelector(LAYER);
      if (open && top === null) {
        top = window.scrollY;
        body.style.position = "fixed";
        body.style.top = `-${top}px`;
        body.style.left = "0";
        body.style.right = "0";
      } else if (!open && top !== null) {
        body.style.position = body.style.top = body.style.left = body.style.right = "";
        window.scrollTo({ top, behavior: "instant" });
        top = null;
      }
    };
    const watch = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(sync);
    });
    watch.observe(body, { childList: true, subtree: true });
    sync();
    return () => {
      watch.disconnect();
      cancelAnimationFrame(queued);
      if (top !== null) {
        body.style.position = body.style.top = body.style.left = body.style.right = "";
        window.scrollTo({ top, behavior: "instant" });
      }
    };
  }, []);

  return null;
}
