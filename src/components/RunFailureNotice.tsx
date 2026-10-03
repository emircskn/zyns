"use client";

import { useEffect, useState } from "react";
import { ErrorPopup } from "@/components/ErrorPopup";
import { failureHint } from "@/lib/runErrors";
import { useStudio, type Run } from "@/store/studio";

interface Failure {
  model: string;
  error: string;
  /** Others that failed at the same moment, from the same send. */
  more: number;
}

/**
 * Says so when a run the service had accepted fails while it is being made:
 * a model's safety filter, a rejected input, a time-out. Its tile says so
 * too, but the tile may be on a page nobody is looking at (or, from Home,
 * on none), and a loader that simply stops being there reads as nothing
 * having happened. A run turned down before it was accepted is already
 * told by the composer, so only runs with a task are counted.
 */
export function RunFailureNotice() {
  const hydrated = useStudio((s) => s.hydrated);
  const [failure, setFailure] = useState<Failure | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let before = new Map(useStudio.getState().runs.map((run) => [run.id, run.state]));
    return useStudio.subscribe((state) => {
      const fresh: Run[] = [];
      for (const run of state.runs) {
        const was = before.get(run.id);
        if (run.state === "failed" && was && was !== "failed" && run.taskId) fresh.push(run);
      }
      before = new Map(state.runs.map((run) => [run.id, run.state]));
      if (fresh.length === 0) return;
      setFailure((now) => {
        // One window for a batch that failed together, not one each.
        if (now) return { ...now, more: now.more + fresh.length };
        const [first, ...rest] = fresh;
        return { model: first.modelName, error: first.error ?? "The service did not say why.", more: rest.length };
      });
    });
  }, [hydrated]);

  const message = failure
    ? failure.error + (failure.more > 0 ? ` (${failure.more} more ${failure.more === 1 ? "run" : "runs"} failed too.)` : "")
    : null;

  return (
    <ErrorPopup
      message={message}
      title={failure ? `${failure.model} couldn't make it` : ""}
      hint={failureHint(failure?.error)}
      onClose={() => setFailure(null)}
    />
  );
}
