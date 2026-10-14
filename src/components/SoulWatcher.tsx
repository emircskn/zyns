"use client";

import { useEffect } from "react";
import { getSoul } from "@/lib/higgsfield/transport";
import { useStudio } from "@/store/studio";

const EVERY_MS = 20_000;
const WAITING = new Set(["not_ready", "queued", "in_progress"]);

/**
 * Follows Soul ID characters still in training until Higgsfield calls them
 * completed or failed, so the library and the pickers show where each stands.
 */
export function SoulWatcher() {
  const hfKey = useStudio((s) => s.hfKey);
  const waiting = useStudio((s) => s.elements.some((e) => e.soul && WAITING.has(e.soul.state)));

  useEffect(() => {
    if (!hfKey || !waiting) return;
    let stopped = false;
    async function check() {
      const { elements, saveElement } = useStudio.getState();
      for (const element of elements) {
        if (stopped || !element.soul || !WAITING.has(element.soul.state)) continue;
        try {
          const soul = await getSoul(hfKey, element.soul.id);
          if (soul.state !== element.soul.state || soul.error !== element.soul.error) {
            const now = useStudio.getState().elements.find((e) => e.id === element.id);
            if (now?.soul) saveElement({ ...now, soul: { ...now.soul, state: soul.state, error: soul.error } });
          }
        } catch {
          // Asked again on the next round.
        }
      }
    }
    void check();
    const timer = window.setInterval(() => void check(), EVERY_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [hfKey, waiting]);

  return null;
}
