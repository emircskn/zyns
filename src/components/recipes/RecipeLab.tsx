"use client";

import { useState } from "react";
import { RunPoller } from "@/components/RunPoller";
import { ThemeSync } from "@/components/ThemeSync";
import { RECIPES } from "@/recipes";
import { useStudio } from "@/store/studio";
import { RecipeComposer } from "./RecipeComposer";
import { RecipeDriver } from "./RecipeDriver";
import { RecipeRuns } from "./RecipeRuns";

/**
 * A plain page for trying recipes before they have pages of their own
 * (/lab, not linked from the studio). Runs here are ordinary studio runs
 * and show in the gallery and Assets too.
 */
export function RecipeLab() {
  const [id, setId] = useState(RECIPES[0]?.id);
  const recipe = RECIPES.find((r) => r.id === id);
  // Everything here reads the saved store (remembered models, past runs),
  // which only exists in the browser.
  const hydrated = useStudio((s) => s.hydrated);

  return (
    <div className="min-h-dvh bg-canvas px-4 py-6 text-t1 md:px-8">
      <div className="mx-auto grid max-w-[1100px] gap-8 md:grid-cols-[minmax(0,420px)_1fr]">
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-t4">Recipe lab</p>
          <h1 className="mb-1 text-[24px] tracking-[-0.02em]">{recipe?.name ?? "No recipes"}</h1>
          {recipe && <p className="mb-6 text-[13px] text-t3">{recipe.description}</p>}
          {RECIPES.length > 1 && (
            <select value={id} onChange={(e) => setId(e.target.value)} className="mb-6 rounded-chip bg-t1/[0.05] px-3 py-2 text-[13px]">
              {RECIPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          {recipe && hydrated && <RecipeComposer key={recipe.id} recipe={recipe} />}
        </div>
        <div>
          <p className="mb-3 text-[12px] font-medium text-t3">Runs</p>
          {recipe && hydrated && <RecipeRuns recipe={recipe} />}
        </div>
      </div>
      <RunPoller />
      <RecipeDriver />
      <ThemeSync />
    </div>
  );
}
