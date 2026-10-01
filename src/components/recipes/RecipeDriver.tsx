"use client";

import { useEffect } from "react";
import { advance } from "@/lib/recipes/engine";
import { useStudio } from "@/store/studio";

/**
 * Keeps recipes moving: whenever a run changes (a step's output lands) or a
 * recipe run is started, each recipe still running is advanced. A reloaded
 * page carries on from the store. Mounted once.
 */
export function RecipeDriver() {
  const runs = useStudio((s) => s.runs);
  const recipeRuns = useStudio((s) => s.recipeRuns);
  const hydrated = useStudio((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    for (const run of recipeRuns) if (run.state === "running") void advance(run.id);
  }, [runs, recipeRuns, hydrated]);

  return null;
}
