"use client";

import { useState, type ReactNode } from "react";
import { ConfirmPopup } from "@/components/ConfirmPopup";
import { GenerationLoader } from "@/components/GenerationLoader";
import { Icon } from "@/components/Icon";
import { MediaViewer } from "@/components/MediaViewer";
import { inFlight } from "@/lib/assets";
import { MODE_LABEL } from "@/lib/remix/targets";
import { failureHint } from "@/lib/runErrors";
import { mediaSrc } from "@/lib/storage/client";
import { keptNote, usedElsewhere } from "@/lib/usage";
import { useStudio, type Run } from "@/store/studio";

function ago(at: number): string {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** One remix: what it made (or is making), and what to do next with it. */
function RemixCard({
  run,
  stage,
  actions,
  onOpen,
}: {
  run: Run;
  /** What the card shows of a finished run; the plain result when left out. */
  stage?: ReactNode;
  actions?: ReactNode;
  onOpen: (url: string) => void;
}) {
  const removeRun = useStudio((s) => s.removeRun);
  const [confirming, setConfirming] = useState(false);
  const [settled, setSettled] = useState(!inFlight(run));
  const info = run.remix!;
  const url = run.urls[0];
  const working = inFlight(run);
  const note = confirming ? keptNote(usedElsewhere(run.urls, { runs: [run.id] })) : undefined;

  return (
    <article className="anim-tile overflow-hidden rounded-panel border border-line bg-elevated">
      <div className="relative aspect-video bg-canvas-deep">
        {run.state === "success" && url ? (
          (stage ?? (
            <button type="button" onClick={() => onOpen(url)} className="absolute inset-0" aria-label="Open">
              <video src={mediaSrc(url)} muted loop autoPlay playsInline className="h-full w-full object-contain" />
            </button>
          ))
        ) : run.state === "failed" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center">
            <Icon name="alert" size={20} style={{ color: "var(--danger)" }} />
            <p className="max-w-[420px] text-[13px] leading-snug text-t1">{run.error ?? "This one did not work."}</p>
            {failureHint(run.error) && <p className="max-w-[420px] text-[12px] leading-snug text-t3">{failureHint(run.error)}</p>}
          </div>
        ) : (
          <video src={mediaSrc(info.source)} muted loop autoPlay playsInline className="h-full w-full object-contain opacity-40" />
        )}
        {!settled && (
          <GenerationLoader url={url} failed={run.state === "failed"} onFinished={() => setSettled(true)} />
        )}
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] text-white backdrop-blur-md">
          {MODE_LABEL[info.mode]}
          {info.presetName ? ` · ${info.presetName}` : ""}
          {working ? " · working" : ""}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {info.refs.slice(0, 5).map((ref) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={ref} src={mediaSrc(ref)} alt="" className="h-7 w-7 shrink-0 rounded-[8px] object-cover ring-1 ring-inset ring-line" />
          ))}
          <span className="ml-1 truncate text-[12px] text-t4">
            {run.modelName} · {ago(run.createdAt)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Delete"
            title="Delete"
            className="grid h-8 w-8 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.07] hover:text-t1"
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>
      <ConfirmPopup
        open={confirming}
        title="Delete this?"
        message={note ?? "It is removed from your studio for good."}
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirming(false);
          removeRun(run.id);
        }}
        onClose={() => setConfirming(false)}
      />
    </article>
  );
}

/** What was made in Remix, newest first. */
export function RemixHistory({
  stage,
  actions,
}: {
  stage?: (run: Run, open: (url: string) => void) => ReactNode;
  actions?: (run: Run) => ReactNode;
}) {
  const runs = useStudio((s) => s.runs);
  const mine = runs.filter((run) => run.remix);
  const [viewing, setViewing] = useState<{ url: string; runId: string } | null>(null);
  const open = viewing ? runs.find((run) => run.id === viewing.runId) : undefined;
  const sequence = mine.flatMap((run) => (run.state === "success" ? run.urls : []));

  if (mine.length === 0) {
    return (
      <div className="grid place-items-center px-4 py-8 text-center md:min-h-[calc(100dvh-220px)] md:py-16">
        <div className="max-w-[560px]">
        <p className="text-[34px] leading-[1.08] tracking-[-0.03em] text-t1 md:text-[54px]">Nothing remixed yet.</p>
        <p className="mx-auto mt-4 max-w-[380px] text-[13px] leading-relaxed text-t3">
          Add a clip and the pictures to put in it. What you make here also shows up in Assets.
        </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        {mine.map((run) => {
          const openUrl = (url: string) => setViewing({ url, runId: run.id });
          return (
            <RemixCard
              key={run.id}
              run={run}
              stage={run.state === "success" && stage ? stage(run, openUrl) : undefined}
              actions={actions?.(run)}
              onOpen={openUrl}
            />
          );
        })}
      </div>
      <MediaViewer
        url={open ? (viewing?.url ?? null) : null}
        run={open}
        onClose={() => setViewing(null)}
        sequence={sequence}
        onShow={(url) => {
          const owner = mine.find((run) => run.urls.includes(url));
          if (owner) setViewing({ url, runId: owner.id });
        }}
      />
    </>
  );
}
