"use client";

/**
 * Runs recipes step by step. Each step becomes an ordinary studio run on the
 * model chosen for it (so it shows in the gallery and Assets, and is polled
 * like any other); when it lands, its output is kept for good and the next
 * step starts from it. The whole state lives in the store, so a reload picks
 * up where it was: RecipeDriver calls `advance` whenever runs change.
 */
import { submitModelRun } from "@/lib/generate";
import { getModel, hasCapability, modesFor, ALL_MODELS, type Capability, type ModelDef } from "@/lib/registry";
import { estimateCredits, formatCredits } from "@/lib/registry/pricing";
import { keepCopy } from "@/lib/storage/client";
import { getRecipe } from "@/recipes";
import { useStudio } from "@/store/studio";
import { mapParams, type CommonParams } from "./paramMap";
import { holds, resolveTemplate, type TemplateContext } from "./template";
import type { Recipe, RecipeInputs, RecipeRun, Step, StepState } from "./types";

/** The models that can run a step, KIE's and Higgsfield's together. */
export function modelsForStep(step: Step): ModelDef[] {
  if (step.fixedModel) {
    const fixed = getModel(step.fixedModel);
    return fixed ? [fixed] : [];
  }
  return ALL_MODELS.filter((m) => hasCapability(m, step.capability));
}

/** The keys a step's choice is remembered under, the recipe's own first. */
export function stepMemoryKeys(recipe: Recipe, step: Step): string[] {
  const area = recipe.category === "effect" ? "effects" : recipe.category;
  return [`${area}.${recipe.id}.${step.id}`, `${area}.${step.id}`];
}

/**
 * The model a step starts on: the one last chosen for it in this recipe,
 * else for this kind of step anywhere. Never a guess: with nothing
 * remembered, there is none, and the composer asks.
 */
export function rememberedModel(recipe: Recipe, step: Step): string | undefined {
  if (step.fixedModel) return step.fixedModel;
  const memory = useStudio.getState().lastModelByStep;
  const allowed = new Set(modelsForStep(step).map((m) => m.id));
  return stepMemoryKeys(recipe, step)
    .map((key) => memory[key])
    .find((id) => id && allowed.has(id));
}

export function chooseStepModel(recipe: Recipe, step: Step, modelId: string): void {
  useStudio.getState().rememberStepModel(stepMemoryKeys(recipe, step), modelId);
}

/** What is wrong with the inputs, as one message, or null. */
export function checkSlots(recipe: Recipe, inputs: RecipeInputs): string | null {
  for (const slot of recipe.slots) {
    const value = inputs.slots[slot.key];
    const list = Array.isArray(value) ? value : value === undefined || value === null || value === "" ? [] : [value];
    if (slot.required && list.length === 0) return `Add ${slot.label.toLowerCase()} to continue.`;
    if (slot.type === "image" && slot.min && list.length < slot.min) return `Add at least ${slot.min} ${slot.label.toLowerCase()}.`;
    if (slot.type === "image" && slot.max && list.length > slot.max) return `${slot.label} takes at most ${slot.max}.`;
  }
  return null;
}

function context(run: RecipeRun): TemplateContext {
  const steps: TemplateContext["steps"] = {};
  for (const state of run.stepStates) {
    if (state.output) steps[state.stepId] = { output: { url: state.output.urls[0], urls: state.output.urls } };
  }
  return { ...run.inputs, steps };
}

/** The values a step would be sent with on `model`, and what it had to leave out. */
export function stepValues(step: Step, model: ModelDef, run: Pick<RecipeRun, "inputs" | "stepStates" | "settings">) {
  const ctx = context(run as RecipeRun);
  const params = Object.fromEntries(
    Object.entries(step.params).map(([name, value]) => [name, resolveTemplate(value, ctx)]),
  ) as CommonParams;
  if (typeof params.prompt === "string") params.prompt = params.prompt.replace(/\s*\.\s*$/, "").replace(/\.\s+\./g, ".").trim();
  const mode = modesFor(model, step.capability)[0];
  const result = mapParams(model, mode, params);
  // The step's own settings go over the defaults, never over what the
  // recipe put in (its prompt, its pictures).
  const own = run.settings?.[step.id] ?? {};
  for (const [key, value] of Object.entries(own)) {
    if (!result.mapped.includes(key) && key !== "__mode") result.values[key] = value;
  }
  return result;
}

/** A step's cost as each service states it: KIE's estimate in credits, Higgsfield's catalogue price. */
export function stepCost(model: ModelDef, values: Record<string, unknown>): string | undefined {
  if (model.provider === "higgsfield") return model.price;
  const credits = estimateCredits(model, values);
  return credits === null || credits === undefined ? undefined : formatCredits(credits);
}

export function startRecipe(
  recipe: Recipe,
  inputs: RecipeInputs,
  models: Record<string, string>,
  settings: Record<string, Record<string, unknown>> = {},
): string | null {
  const problem = checkSlots(recipe, inputs);
  if (problem) throw new Error(problem);
  for (const step of recipe.steps) {
    if (!step.fixedModel && !models[step.id]) throw new Error(`Choose a model for ${step.label ?? step.id}.`);
  }
  const run: RecipeRun = {
    id: `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    recipeId: recipe.id,
    inputs,
    models: Object.fromEntries(recipe.steps.map((s) => [s.id, s.fixedModel ?? models[s.id]])),
    settings,
    stepStates: recipe.steps.map((s) => ({ stepId: s.id, status: "idle" })),
    state: "running",
    createdAt: Date.now(),
  };
  useStudio.getState().addRecipeRun(run);
  void advance(run.id);
  return run.id;
}

/** Same inputs, same models, a new run. */
export function runAgain(previous: RecipeRun): string | null {
  const recipe = getRecipe(previous.recipeId);
  return recipe ? startRecipe(recipe, previous.inputs, previous.models, previous.settings) : null;
}

/**
 * Runs one step again, on another model if given, and everything after it;
 * the steps before keep their outputs.
 */
export function retryStep(recipeRunId: string, stepId: string, modelId?: string): void {
  useStudio.getState().patchRecipeRun(recipeRunId, (run) => {
    const at = run.stepStates.findIndex((s) => s.stepId === stepId);
    if (at < 0) return run;
    return {
      ...run,
      state: "running",
      models: modelId ? { ...run.models, [stepId]: modelId } : run.models,
      // Settings belong to a model; another model starts from its own defaults.
      settings: modelId && modelId !== run.models[stepId] ? { ...run.settings, [stepId]: {} } : run.settings,
      stepStates: run.stepStates.map((s, i): StepState => (i >= at ? { stepId: s.stepId, status: "idle" } : s)),
    };
  });
  void advance(recipeRunId);
}

function patchStep(recipeRunId: string, stepId: string, patch: Partial<StepState>, runPatch: Partial<RecipeRun> = {}) {
  useStudio.getState().patchRecipeRun(recipeRunId, (run) => ({
    ...run,
    ...runPatch,
    stepStates: run.stepStates.map((s) => (s.stepId === stepId ? { ...s, ...patch } : s)),
  }));
}

const advancing = new Set<string>();

/** Moves a recipe run forward as far as it can go right now. */
export async function advance(recipeRunId: string): Promise<void> {
  if (advancing.has(recipeRunId)) return;
  advancing.add(recipeRunId);
  try {
    for (;;) {
      const state = useStudio.getState();
      const run = state.recipeRuns.find((r) => r.id === recipeRunId);
      const recipe = run && getRecipe(run.recipeId);
      if (!run || !recipe || run.state !== "running") return;
      const index = run.stepStates.findIndex((s) => s.status !== "done" && s.status !== "skipped");
      if (index < 0) {
        state.patchRecipeRun(recipeRunId, (r) => ({ ...r, state: "done" }));
        return;
      }
      const step = recipe.steps[index];
      const current = run.stepStates[index];

      if (current.status === "failed") {
        state.patchRecipeRun(recipeRunId, (r) => ({ ...r, state: "failed" }));
        return;
      }

      if (current.status === "running" && current.runId) {
        const studioRun = state.runs.find((r) => r.id === current.runId);
        if (!studioRun) {
          patchStep(recipeRunId, step.id, { status: "failed", error: "This step's run is gone." }, { state: "failed" });
          return;
        }
        if (studioRun.state === "success") {
          // Kept for good: the next step and Assets both rely on it.
          for (const url of studioRun.urls) void keepCopy(url, studioRun.output);
          patchStep(recipeRunId, step.id, { status: "done", output: { urls: studioRun.urls } });
          continue;
        }
        if (studioRun.state === "failed") {
          patchStep(recipeRunId, step.id, { status: "failed", error: studioRun.error ?? "This step failed." }, { state: "failed" });
          return;
        }
        return; // still working; the driver comes back when it lands
      }

      // Idle, or "running" without a run (a page that closed while sending): start it.
      if (!holds(step.when, context(run))) {
        patchStep(recipeRunId, step.id, { status: "skipped" });
        continue;
      }
      const model = getModel(run.models[step.id] ?? "");
      if (!model) {
        patchStep(recipeRunId, step.id, { status: "failed", error: "Choose a model for this step." }, { state: "failed" });
        return;
      }
      const { values, warnings } = stepValues(step, model, run);
      patchStep(recipeRunId, step.id, { status: "running", modelId: model.id, warnings: warnings.length ? warnings : undefined });
      const sent = await submitModelRun(model, values, { recipeRunId, recipeStep: step.id });
      if (!sent.ok) {
        patchStep(recipeRunId, step.id, { status: "failed", runId: sent.runId, error: sent.error }, { state: "failed" });
        return;
      }
      patchStep(recipeRunId, step.id, { runId: sent.runId });
      // Loop: a run that finished at once (a made character) moves straight on.
    }
  } finally {
    advancing.delete(recipeRunId);
  }
}

export type { Capability };
