/**
 * Fills a recipe's templates from what the run has: its slots, its choices
 * and the outputs of the steps before. A template that is nothing but one
 * reference keeps the value's own shape (a list of pictures stays a list);
 * inside text it is written out.
 */
import type { RecipeInputs } from "./types";

export interface TemplateContext extends RecipeInputs {
  steps: Record<string, { output: { url?: string; urls: string[] } }>;
}

// `{{a || b}}`: the first of them that holds something.
const WHOLE = /^\s*\{\{\s*([\w.-]+(?:\s*\|\|\s*[\w.-]+)*)\s*\}\}\s*$/;
const ANY = /\{\{\s*([\w.-]+(?:\s*\|\|\s*[\w.-]+)*)\s*\}\}/g;

function lookup(context: TemplateContext, expression: string): unknown {
  const paths = expression.split("||").map((p) => p.trim());
  if (paths.length > 1) {
    for (const path of paths) {
      const found = lookup(context, path);
      if (found !== undefined && found !== null && found !== "" && !(Array.isArray(found) && found.length === 0)) return found;
    }
    return undefined;
  }
  const path = paths[0];
  let node: unknown = context;
  for (const part of path.split(".")) {
    if (node === null || node === undefined || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

export function resolveTemplate(value: unknown, context: TemplateContext): unknown {
  if (typeof value === "string") {
    const whole = WHOLE.exec(value);
    if (whole) return lookup(context, whole[1]);
    return value.replace(ANY, (_m, path: string) => {
      const found = lookup(context, path);
      return found === undefined || found === null ? "" : Array.isArray(found) ? found.join(", ") : String(found);
    });
  }
  if (Array.isArray(value)) {
    // A list of references flattens: ["{{slots.product}}", "{{steps.frame.output.url}}"].
    return value
      .map((item) => resolveTemplate(item, context))
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .filter((item) => item !== undefined && item !== null && item !== "");
  }
  return value;
}

/** Whether a step runs: its `when` holds and its `unless` does not. */
export function stepRuns(step: { when?: string; unless?: string }, context: TemplateContext): boolean {
  return holds(step.when, context) && !(step.unless && holds(step.unless, context));
}

/** Whether a step's `when` lets it run. */
export function holds(when: string | undefined, context: TemplateContext): boolean {
  if (!when) return true;
  const value = resolveTemplate(when, context);
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== "" && value !== false && value !== "false";
}
