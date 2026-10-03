"use client";

import { useEffect } from "react";
import { isDirect } from "@/lib/kie/transport";
import { useStudio } from "@/store/studio";

/**
 * Picks up a new release in a tab left open: a phone keeps a page alive for
 * days, and went on running the old code after a fix had shipped. When the
 * tab comes back into view and a newer build is live, it reloads, but only
 * with nothing open over the page, so nothing in hand is lost (prompts and
 * runs are kept in storage and come back as they were).
 */
export function UpdateWatcher() {
  useEffect(() => {
    const mine = process.env.NEXT_PUBLIC_BUILD_ID;
    // The single-file build has no server to ask.
    if (!mine || isDirect()) return;
    let checking = false;
    async function check() {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { build } = (await res.json()) as { build: string | null };
        const s = useStudio.getState();
        const busy = s.composer || s.pickerOpen || s.createOpen || s.settingsOpen;
        if (build && build !== mine && !busy) window.location.reload();
      } catch {
        // Offline or between deploys: try again next time.
      } finally {
        checking = false;
      }
    }
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 10 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, []);
  return null;
}
