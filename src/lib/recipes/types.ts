/**
 * Recipes: chains of generations (an effect, a product shot, a UGC clip)
 * whose steps say what they need done, not which model does it. Each step's
 * model is chosen in the composer when it runs, among the models with that
 * capability, unless the step is a feature with an endpoint of its own.
 */
import type { Capability } from "@/lib/registry";
import type { ElementKind } from "@/lib/elements";

/** `{{slots.x}}`, `{{choices.y}}`, `{{steps.frame.output.url}}`, alone or inside text. */
export type Template = string;

export type Slot =
  | { key: string; type: "image"; label: string; required: boolean; min?: number; max?: number; elementKind?: ElementKind }
  | { key: string; type: "video"; label: string; required: boolean }
  | { key: string; type: "audio"; label: string; required: boolean }
  | { key: string; type: "text"; label: string; required: boolean; placeholder?: string; hiddenByDefault?: boolean };

/** A setting the person picks for the whole recipe ("RecipeChoice": the registry has a Choice of its own). */
export interface RecipeChoice {
  key: string;
  label: string;
  options: string[];
  default: string;
}

export interface Step {
  /** "frame", "motion" */
  id: string;
  /** How the composer names the step ("Frame", "Motion"). */
  label?: string;
  capability: Capability;
  /** Only for a step that is a feature's own endpoint; otherwise the model is chosen per run. */
  fixedModel?: string;
  /**
   * Parameters under their common names (prompt, images, video, audio,
   * aspect_ratio, resolution, duration), translated to each model's own
   * field names when the step runs; see paramMap.
   */
  params: Record<string, Template | Template[] | number | boolean>;
  /** Skipped when this resolves to nothing. */
  when?: Template;
}

export interface Recipe {
  id: string;
  name: string;
  category: "effect" | "product-motion" | "ugc";
  description: string;
  preview?: { thumbUrl: string; videoUrl?: string };
  output: "image" | "video";
  slots: Slot[];
  choices: RecipeChoice[];
  steps: Step[];
}

export interface RecipeInputs {
  slots: Record<string, unknown>;
  choices: Record<string, string>;
}

export type StepStatus = "idle" | "running" | "done" | "failed" | "skipped";

export interface StepState {
  stepId: string;
  status: StepStatus;
  /** The model this step ran (or runs) on. */
  modelId?: string;
  /** The studio run carrying the step, as in the gallery. */
  runId?: string;
  output?: { urls: string[] };
  error?: string;
  /** Parameters the model could not take, and what was done instead. */
  warnings?: string[];
}

export interface RecipeRun {
  id: string;
  recipeId: string;
  inputs: RecipeInputs;
  /** The model chosen for each step, by step id. */
  models: Record<string, string>;
  /** Each step's own settings on its model (resolution, voice…), by step id. */
  settings?: Record<string, Record<string, unknown>>;
  stepStates: StepState[];
  state: "running" | "done" | "failed";
  createdAt: number;
}
