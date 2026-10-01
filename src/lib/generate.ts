"use client";

import { aspectFromValues } from "@/lib/aspect";
import { resolveAutoRatio } from "@/lib/autoRatio";
import { withImageMentions } from "@/lib/mentions";
import { createTask, getCredits, getTask } from "@/lib/kie/transport";
import * as hf from "@/lib/higgsfield/transport";
import { enqueue } from "@/lib/higgsfield/queue";
import type { PollKind } from "@/lib/kie/client";
import { getModel, providerOf, validateValues, type ModelDef, type Provider, type Values } from "@/lib/registry";
import { keyFor, useStudio, type Run } from "@/store/studio";
import { withoutInputs } from "@/lib/runInputs";
import { englishError } from "@/lib/kie/errors";
import { withLibraryElements } from "@/lib/elements";
import { readyMedia } from "@/lib/sendMedia";

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
  return submitModelRun(model, state.valuesByModel[state.modelId] ?? {});
}

/**
 * Sends one run of `model` with `values`, from the composer or from a step of
 * a recipe (`extra` marks which), and resolves once it is on its way.
 */
export async function submitModelRun(
  model: ModelDef,
  values: Values,
  extra: Partial<Run> = {},
): Promise<SubmitResult & { runId?: string }> {
  const state = useStudio.getState();
  // A model runs on its own service, with that service's key.
  const provider = providerOf(model);
  const key = keyFor(state, provider);
  if (!key) return { ok: false, error: `Add your ${PROVIDER_NAME[provider]} API key first.` };

  const problem = validateValues(model, values);
  if (problem) return { ok: false, error: problem };

  // The studio's own "Auto" ratio becomes a real one here; the run keeps
  // "auto" in its values so Recreate brings Auto back.
  // `@Image N` in the prompt is ours too: the model reads it spelled out.
  const sent = await resolveAutoRatio(model, values);
  // Library elements called with `@name` are spelled out, and kept media
  // (their pictures among it) is handed to the service first.
  let ready: Awaited<ReturnType<typeof readyMedia>>;
  try {
    ready = await readyMedia(withLibraryElements(model, sent, state.elements), provider);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "A picture could not be prepared." };
  }
  const { endpoint, payload, poll } = model.build(withImageMentions(model, ready.values));

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const run: Run = {
    id,
    modelId: model.id,
    modelName: model.name,
    mode: values.__mode,
    poll,
    provider,
    prompt: (values.prompt as string) || (values.text as string) || (values.descriptions as string) || "",
    ratio: aspectFromValues(sent, model.output === "audio" ? "1 / 1" : "16 / 9"),
    output: model.output,
    state: "queued",
    urls: [],
    createdAt: Date.now(),
    values: { ...values },
    sent: ready.sent.length > 0 ? ready.sent : undefined,
    ...extra,
  };

  // Higgsfield runs go out through its queue, which holds them while the
  // account is at its ceiling of requests in flight.
  if (provider === "higgsfield") {
    state.addRun({ ...run, request: { endpoint, payload }, idempotencyKey: newIdempotencyKey() });
    await enqueue(id);
    const sent = useStudio.getState().runs.find((r) => r.id === id);
    if (sent?.state === "failed") return { ok: false, error: sent.error, runId: id };
    return { ok: true, runId: id };
  }

  state.addRun(run);
  try {
    const { taskId, made }: { taskId?: string; made?: Run["made"] } = await createTask(key, endpoint, payload);
    // A character or voice is ready the moment it is made; there is nothing
    // to poll.
    if (made) useStudio.getState().patchRun(id, { state: "success", made, urls: made.image ? [made.image] : [] });
    else useStudio.getState().patchRun(id, { taskId, state: "pending" });
    void refreshCredits();
    return { ok: true, runId: id };
  } catch (error) {
    const message = englishError(error instanceof Error ? error.message : "Request failed.");
    useStudio.getState().patchRun(id, { state: "failed", error: message });
    return { ok: false, error: message, runId: id };
  }
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export const PROVIDER_NAME: Record<Provider, string> = { kie: "KIE", higgsfield: "Higgsfield" };

/** Runs already let go, so overlapping polls cancel each one only once. */
const stopping = new Set<string>();

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

/**
 * How long a run may stay unfinished before the studio stops waiting for
 * it, counted from when it was sent. Stills and sound come back in seconds
 * to minutes and video in minutes, even behind a queue, so these only catch
 * a task that KIE has lost or will never finish; without a limit its tile
 * would read "Rendering" for good.
 */
export const TIME_LIMIT: Record<Run["output"], { ms: number; label: string }> = {
  image: { ms: 30 * 60_000, label: "30 minutes" },
  audio: { ms: 30 * 60_000, label: "30 minutes" },
  video: { ms: 2 * 60 * 60_000, label: "2 hours" },
};

export async function pollRun(run: Run): Promise<void> {
  const state = useStudio.getState();
  const { patchRun } = state;
  // A run is followed up with its own service's key, whichever is in use now.
  const higgsfield = run.provider === "higgsfield";
  const apiKey = keyFor(state, run.provider);
  const name = PROVIDER_NAME[run.provider ?? "kie"];
  if (!apiKey || !run.taskId) return;
  const limit = TIME_LIMIT[run.output] ?? TIME_LIMIT.video;
  const late = Date.now() - run.createdAt > limit.ms;
  try {
    const task = higgsfield
      ? await hf.getTask(apiKey, run.taskId, run.statusUrl)
      : await getTask(apiKey, run.taskId, run.poll as PollKind);
    // Asked once more at the limit: a run that finished meanwhile still
    // lands; one that has not is let go (and on Higgsfield cancelled, where a
    // request still queued allows it, so it cannot start and charge later).
    if (late && task.state !== "success" && task.state !== "failed") {
      if (stopping.has(run.id)) return;
      stopping.add(run.id);
      if (higgsfield) await hf.cancelTask(apiKey, run.taskId, run.cancelUrl).catch(() => {});
      patchRun(run.id, {
        state: "failed",
        error: `Timed out: no result from ${name} after ${limit.label}.`,
      });
      return;
    }
    patchRun(run.id, {
      state: task.state,
      // What the run was sent (references, first frames) is never its output.
      urls: task.urls && task.urls.length > 0 ? withoutInputs(task.urls, { ...run.values, __sent: run.sent }) : run.urls,
      ...("tracks" in task && task.tracks ? { tracks: task.tracks as Run["tracks"] } : {}),
      error: higgsfield ? task.error : englishError(task.error),
      credits: ("credits" in task ? (task.credits as number | undefined) : undefined) ?? run.credits,
    });
    if (!higgsfield && (task.state === "success" || task.state === "failed")) void refreshCredits();
  } catch (error) {
    // A definitive rejection (bad key, unknown task) should surface; a
    // transient network error is simply retried on the next tick.
    if (error instanceof Error && /unauthori|not found|invalid|credentials/i.test(error.message)) {
      patchRun(run.id, { state: "failed", error: englishError(error.message) });
    } else if (late) {
      patchRun(run.id, {
        state: "failed",
        error: `Timed out: ${name} stopped answering after ${limit.label}.`,
      });
    }
  }
}

