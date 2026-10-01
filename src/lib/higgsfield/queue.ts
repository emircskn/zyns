"use client";

/**
 * Higgsfield caps how many requests an account may have in flight, and turns
 * away one more with "Maximum number of concurrent requests (N)". Runs past
 * that ceiling wait here, in the order they were made, and go out as running
 * ones finish. The ceiling is learned from that error, since it differs from
 * account to account.
 */
import { concurrencyLimit } from "./client";
import { createTask } from "./transport";
import { useStudio, type Run } from "@/store/studio";

/** How long to hold off after being turned away, before asking again. */
const RETRY_MS = 10_000;

let limit: number | null = null;
let retryAt = 0;
const sending = new Map<string, Promise<void>>();

function inFlight(run: Run): boolean {
  return run.provider === "higgsfield" && !!run.taskId && (run.state === "pending" || run.state === "running");
}

/** A Higgsfield run made but not yet accepted by Higgsfield. */
export function waiting(run: Run): boolean {
  return run.provider === "higgsfield" && run.state === "queued" && !run.taskId && !!run.request;
}

async function send(key: string, run: Run): Promise<void> {
  const { patchRun } = useStudio.getState();
  if (!run.request) return;
  try {
    const task = await createTask(key, run.request.endpoint, run.request.payload, run.idempotencyKey);
    patchRun(run.id, {
      taskId: task.taskId,
      statusUrl: task.statusUrl,
      cancelUrl: task.cancelUrl,
      state: "pending",
      request: undefined,
      held: undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    const ceiling = concurrencyLimit(message);
    if (ceiling !== null) {
      limit = ceiling;
      retryAt = Date.now() + RETRY_MS;
      patchRun(run.id, { held: true });
    } else {
      patchRun(run.id, { state: "failed", error: message, request: undefined, held: undefined });
    }
  }
}

/**
 * Sends as many waiting runs as there is room for. Called when a run is made
 * and on every poll tick, so a held run goes out once a slot frees up.
 */
export function drainHiggsfield(): void {
  const { hfKey, runs } = useStudio.getState();
  if (!hfKey || Date.now() < retryAt) return;
  const queue = runs
    .filter((run) => waiting(run) && !sending.has(run.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  if (queue.length === 0) return;
  let room = limit === null ? queue.length : limit - runs.filter(inFlight).length - sending.size;
  for (const run of queue) {
    if (room <= 0) break;
    room -= 1;
    const job = send(hfKey, run).finally(() => sending.delete(run.id));
    sending.set(run.id, job);
  }
}

/** Puts a run in line and waits until it has either gone out, been held, or failed. */
export async function enqueue(runId: string): Promise<void> {
  drainHiggsfield();
  await sending.get(runId);
}
