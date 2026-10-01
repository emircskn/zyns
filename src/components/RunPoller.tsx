"use client";

import { useEffect } from "react";
import { pollRun, refreshCredits } from "@/lib/generate";
import { drainHiggsfield, waiting } from "@/lib/higgsfield/queue";
import { useStudio } from "@/store/studio";

const INTERVAL_MS = 3500;

/** Keeps unfinished runs up to date; mounted once by the studio shell. */
export function RunPoller() {
  const runs = useStudio((s) => s.runs);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);
  // Each run is followed up with its own service's key; either one will do
  // to start the loop, and pollRun skips a run whose key is missing.
  const anyKey = apiKey || hfKey;

  // Higgsfield runs waiting their turn keep the loop going too: each tick
  // sends whichever of them now has room.
  const pending = runs.filter(
    (run) => (run.taskId && (run.state === "pending" || run.state === "running")) || waiting(run),
  );
  const signature = pending.map((run) => run.taskId ?? run.id).join(",");

  useEffect(() => {
    if (!anyKey || !signature) return;
    let cancelled = false;

    async function tick() {
      drainHiggsfield();
      const current = useStudio
        .getState()
        .runs.filter((run) => run.taskId && (run.state === "pending" || run.state === "running"));
      await Promise.all(current.map((run) => pollRun(run)));
    }

    void tick();
    const timer = setInterval(() => {
      if (!cancelled) void tick();
    }, INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [anyKey, signature]);

  useEffect(() => {
    if (apiKey) void refreshCredits();
  }, [apiKey]);

  return null;
}
