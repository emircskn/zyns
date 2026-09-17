"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { mediaKind } from "@/lib/upload";
import { useStudio, type Run } from "@/store/studio";

function StatusOverlay({ run }: { run: Run }) {
  if (run.state === "failed") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/40 p-4 text-center">
        <Icon name="alert" size={20} className="text-red-400" />
        <p className="line-clamp-4 text-[11.5px] leading-snug text-red-200">
          {run.error ?? "Generation failed."}
        </p>
      </div>
    );
  }
  if (run.state === "success") return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
      <span className="text-[11px] uppercase tracking-wider text-ink-300">
        {run.state === "queued" ? "Submitting" : run.state === "pending" ? "Queued" : "Rendering"}
      </span>
    </div>
  );
}

function Media({ url, poster }: { url: string; poster?: string }) {
  const kind = mediaKind(url);
  if (kind === "video") {
    return (
      <video
        src={url}
        poster={poster}
        className="h-full w-full object-cover"
        controls
        loop
        playsInline
        preload="metadata"
      />
    );
  }
  if (kind === "audio") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-ink-800 to-ink-900 p-4">
        <Icon name="audio" size={26} className="text-ink-300" />
        <audio src={url} controls className="w-full max-w-[280px]" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />;
}

function Tile({ run, onOpen }: { run: Run; onOpen: (url: string) => void }) {
  const removeRun = useStudio((s) => s.removeRun);
  const selectModel = useStudio((s) => s.selectModel);
  const setValues = useStudio((s) => s.setValues);
  const [copied, setCopied] = useState(false);
  const url = run.urls[0];

  function reuse() {
    selectModel(run.modelId);
    // `selectModel` switches the active model first so the values land on it.
    setTimeout(() => setValues({ ...run.values }), 0);
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-ink-850 ring-1 ring-white/8">
      <div style={{ aspectRatio: run.ratio }} className="relative w-full">
        {url ? (
          <button
            type="button"
            onClick={() => (mediaKind(url) === "image" ? onOpen(url) : undefined)}
            className="block h-full w-full cursor-zoom-in"
          >
            <Media url={url} />
          </button>
        ) : (
          <div className="skeleton h-full w-full" />
        )}
        <StatusOverlay run={run} />
      </div>

      {run.urls.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-2 pb-2 pt-2">
          {run.urls.slice(1).map((extra) => (
            <button
              key={extra}
              type="button"
              onClick={() => onOpen(extra)}
              className="h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10"
            >
              <Media url={extra} />
            </button>
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="pointer-events-auto flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-medium text-white">{run.modelName}</p>
            {run.prompt && (
              <p className="line-clamp-2 text-[11px] leading-snug text-ink-300">{run.prompt}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={reuse}
              title="Reuse these settings"
              className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <Icon name="refresh" size={13} />
            </button>
            {url && (
              <>
                <button
                  type="button"
                  onClick={copy}
                  title="Copy URL"
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <Icon name={copied ? "check" : "copy"} size={13} />
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  title="Open / download"
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <Icon name="download" size={13} />
                </a>
              </>
            )}
            <button
              type="button"
              onClick={() => removeRun(run.id)}
              title="Remove from gallery"
              className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-red-600/80"
            >
              <Icon name="trash" size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-6">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="relative max-h-full max-w-full rounded-xl object-contain" />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

export function Gallery() {
  const runs = useStudio((s) => s.runs);
  const hydrated = useStudio((s) => s.hydrated);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!hydrated) return null;

  if (runs.length === 0) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-ink-300">
          <Icon name="spark" size={24} />
        </span>
        <h2 className="mb-1.5 text-[17px] font-semibold text-white">Nothing generated yet</h2>
        <p className="max-w-sm text-[13px] leading-relaxed text-ink-400">
          Pick a model in the bar below, set it up the way you want, and hit generate. Every run
          lands here at its real aspect ratio.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4">
        {runs.map((run) => (
          <Tile key={run.id} run={run} onOpen={setLightbox} />
        ))}
      </div>
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
