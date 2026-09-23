"use client";

import { aspectFromValues } from "@/lib/aspect";
import { createTask, getCredits, getTask } from "@/lib/kie/transport";
import type { PollKind } from "@/lib/kie/client";
import { getModel, validateValues, type Values } from "@/lib/registry";
import { useStudio, type Run } from "@/store/studio";

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

/**
 * Builds the model's payload, creates the task and drops a placeholder tile
 * into the gallery. Polling is handled separately by `RunPoller`.
 */
export async function submitRun(): Promise<SubmitResult> {
  const state = useStudio.getState();
  const model = getModel(state.modelId);
  if (!model) return { ok: false, error: "Pick a model first." };
  if (!state.apiKey) return { ok: false, error: "Add your KIE API key first." };

  const values: Values = state.valuesByModel[state.modelId] ?? {};
  const problem = validateValues(model, values);
  if (problem) return { ok: false, error: problem };

  const { endpoint, payload, poll } = model.build(values);

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const run: Run = {
    id,
    modelId: model.id,
    modelName: model.name,
    mode: values.__mode,
    poll,
    prompt: (values.prompt as string) || (values.text as string) || (values.descriptions as string) || "",
    ratio: aspectFromValues(values, model.output === "audio" ? "3 / 1" : "16 / 9"),
    output: model.output,
    state: "queued",
    urls: [],
    createdAt: Date.now(),
    values: { ...values },
  };
  state.addRun(run);

  try {
    const { taskId } = await createTask(state.apiKey, endpoint, payload);
    useStudio.getState().patchRun(id, { taskId, state: "pending" });
    void refreshCredits();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    useStudio.getState().patchRun(id, { state: "failed", error: message });
    return { ok: false, error: message };
  }
}

export async function refreshCredits(): Promise<void> {
  const { apiKey, setCredits } = useStudio.getState();
  if (!apiKey) return;
  try {
    const credits = await getCredits(apiKey);
    if (credits !== null) setCredits(credits);
  } catch {
    // A failed balance check should never interrupt generation.
  }
}

export async function pollRun(run: Run): Promise<void> {
  const { apiKey, patchRun } = useStudio.getState();
  if (!apiKey || !run.taskId) return;
  try {
    const task = await getTask(apiKey, run.taskId, run.poll as PollKind);
    patchRun(run.id, {
      state: task.state,
      urls: task.urls ?? run.urls,
      error: task.error,
      credits: task.credits ?? run.credits,
    });
    if (task.state === "success" || task.state === "failed") void refreshCredits();
  } catch (error) {
    // A definitive rejection (bad key, unknown task) should surface; a
    // transient network error is simply retried on the next tick.
    if (error instanceof Error && /unauthori|not found|invalid/i.test(error.message)) {
      patchRun(run.id, { state: "failed", error: error.message });
    }
  }
}
