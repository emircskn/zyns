"use client";

import { useState } from "react";
import { ProviderTag } from "@/components/ModelPicker";
import { chooseStepModel, retryStep, runAgain } from "@/lib/recipes/engine";
import type { Recipe, RecipeRun, Step } from "@/lib/recipes/types";
import { getModel } from "@/lib/registry";
import { mediaSrc } from "@/lib/storage/client";
import { mediaKind } from "@/lib/upload";
import { useStudio } from "@/store/studio";
import { StepModelPicker } from "./StepModelPicker";

const STATUS: Record<string, string> = {
  idle: "Waiting",
  running: "Working",
  done: "Done",
  failed: "Failed",
  skipped: "Skipped",
};

/**
 * A recipe's runs, newest first, step by step: the model each step ran on,
 * what it made, and what to do next — try one step on another model, or
 * run the whole recipe again with the same settings.
 */
export function RecipeRuns({ recipe }: { recipe: Recipe }) {
  const runs = useStudio((s) => s.recipeRuns).filter((r) => r.recipeId === recipe.id);
  const [retrying, setRetrying] = useState<{ run: RecipeRun; step: Step } | null>(null);
  if (runs.length === 0) return <p className="text-[13px] text-t4">Runs show up here.</p>;

  return (
    <div className="flex flex-col gap-3">
      {runs.map((run) => (
        <section key={run.id} data-recipe-run={run.id} className="rounded-card bg-t1/[0.04] p-3.5 ring-1 ring-inset ring-line">
          <header className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-[12.5px] text-t3">
              {new Date(run.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} ·{" "}
              <span className={run.state === "failed" ? "text-[#ff8f8f]" : run.state === "done" ? "text-t1" : "text-t2"}>
                {run.state === "running" ? "Running" : run.state === "done" ? "Done" : "Stopped"}
              </span>
            </p>
            <button
              type="button"
              onClick={() => runAgain(run)}
              className="rounded-full bg-t1/[0.07] px-3 py-1 text-[12px] text-t2 hover:text-t1"
            >
              Run again
            </button>
          </header>
          <div className="flex flex-col gap-2">
            {recipe.steps.map((step) => {
              const state = run.stepStates.find((s) => s.stepId === step.id);
              const model = getModel(state?.modelId ?? run.models[step.id] ?? "");
              return (
                <div key={step.id} data-step={step.id} data-status={state?.status} className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-chip bg-t1/[0.06]">
                    {state?.output?.urls[0] &&
                      (mediaKind(state.output.urls[0]) === "video" ? (
                        <video src={mediaSrc(state.output.urls[0])} muted playsInline className="h-full w-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaSrc(state.output.urls[0])} alt="" className="h-full w-full object-cover" />
                      ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[13.5px] text-t1">
                      {step.label ?? step.id}
                      <span className="text-[11.5px] text-t3">· {STATUS[state?.status ?? "idle"]}</span>
                    </p>
                    {model && (
                      <p className="flex items-center gap-1.5 text-[12px] text-t3">
                        {model.name} <ProviderTag model={model} />
                      </p>
                    )}
                    {state?.error && <p className="text-[12px] text-[#ff8f8f]">{state.error}</p>}
                    {state?.warnings?.map((w) => (
                      <p key={w} className="text-[11.5px] text-t4">
                        {w}
                      </p>
                    ))}
                  </div>
                  {(state?.status === "done" || state?.status === "failed") && !step.fixedModel && (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={() => setRetrying({ run, step })}
                        className="rounded-full bg-t1/[0.07] px-2.5 py-1 text-[11.5px] text-t2 hover:text-t1"
                      >
                        Try another model
                      </button>
                      <button
                        type="button"
                        onClick={() => retryStep(run.id, step.id)}
                        className="px-2.5 text-[11.5px] text-t3 hover:text-t1"
                      >
                        Retry from here
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <StepModelPicker
        step={retrying?.step ?? null}
        open={!!retrying}
        current={retrying ? retrying.run.models[retrying.step.id] : undefined}
        onPick={(modelId) => {
          if (!retrying) return;
          chooseStepModel(recipe, retrying.step, modelId);
          retryStep(retrying.run.id, retrying.step.id, modelId);
        }}
        onClose={() => setRetrying(null)}
      />
    </div>
  );
}
