"use client";

import { useEffect } from "react";
import { pollRun, refreshCredits } from "@/lib/generate";
import { useStudio } from "@/store/studio";

const INTERVAL_MS = 3500;

/** Keeps unfinished runs up to date; mounted once by the studio shell. */
export function RunPoller() {
  const runs = useStudio((s) => s.runs);
  const apiKey = useStudio((s) => s.apiKey);

  const pending = runs.filter(
    (run) => run.taskId && (run.state === "pending" || run.state === "running"),
  );
  const signature = pending.map((run) => run.taskId).join(",");

  useEffect(() => {
    if (!apiKey || !signature) return;
    let cancelled = false;

    async function tick() {
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
  }, [apiKey, signature]);

  useEffect(() => {
    if (apiKey) void refreshCredits();
  }, [apiKey]);

  return null;
}
