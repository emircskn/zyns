"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { CATEGORY_ACCENT } from "@/components/ModelPicker";
import { getModel } from "@/lib/registry";
import { mediaKind } from "@/lib/upload";
import { useStudio, type Run } from "@/store/studio";

const STATE_LABEL: Record<Run["state"], string> = {
  queued: "Submitting",
  pending: "Queued",
  running: "Rendering",
  success: "",
  failed: "",
};

function StatusOverlay({ run }: { run: Run }) {
  if (run.state === "failed") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#ff6b6b]/10 p-4 text-center backdrop-blur-sm">
        <Icon name="alert" size={18} className="text-[#ff8f8f]" />
        <p className="line-clamp-4 text-[11.5px] leading-snug text-[#ff8f8f]">
          {run.error ?? "Generation failed."}
        </p>
      </div>
    );
  }
  if (run.state === "success") return null;
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
      <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-white/40 border-t-white" />
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/80">
        {STATE_LABEL[run.state]}
      </span>
    </div>
  );
}

function Media({ url }: { url: string }) {
  const kind = mediaKind(url);
  if (kind === "video") {
    return (
      <video
        src={url}
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
      <div className="pending-surface flex h-full w-full flex-col items-center justify-center gap-3 p-5">
        <Icon name="audio" size={22} className="relative z-10 text-white/80" />
        <audio src={url} controls className="relative z-10 w-full max-w-[280px]" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />;
}

function TileAction({
  icon,
  label,
  onClick,
  href,
  danger,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const className = `grid h-7 w-7 place-items-center rounded-chip bg-black/55 text-white backdrop-blur-md transition-all duration-[120ms] hover:scale-110 ${
    danger ? "hover:bg-[#ff6b6b]/80" : "hover:bg-black/80"
  }`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" download title={label} className={className}>
        <Icon name={icon} size={12} />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} title={label} className={className}>
      <Icon name={icon} size={12} />
    </button>
  );
}

function Tile({ run, index, onOpen }: { run: Run; index: number; onOpen: (url: string) => void }) {
  const removeRun = useStudio((s) => s.removeRun);
  const selectModel = useStudio((s) => s.selectModel);
  const setValues = useStudio((s) => s.setValues);
  const [copied, setCopied] = useState(false);
  const url = run.urls[0];
  const accent = CATEGORY_ACCENT[getModel(run.modelId)?.category ?? "image"];

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
    <div
      className="anim-tile group relative mb-2.5 break-inside-avoid overflow-hidden rounded-card bg-surface ring-1 ring-inset ring-line transition-all duration-[200ms] hover:ring-line-strong"
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    >
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
          <div className="pending-surface h-full w-full" />
        )}
        <StatusOverlay run={run} />
      </div>

      {run.urls.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto p-2">
          {run.urls.slice(1).map((extra) => (
            <button
              key={extra}
              type="button"
              onClick={() => onOpen(extra)}
              className="h-12 w-12 shrink-0 overflow-hidden rounded-chip ring-1 ring-inset ring-line transition-transform duration-[120ms] hover:scale-105"
            >
              <Media url={extra} />
            </button>
          ))}
        </div>
      )}

      <div className="hover-reveal pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3 opacity-0 transition-opacity duration-[200ms] group-hover:opacity-100">
        <div className="pointer-events-auto flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-[11.5px] text-white">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
              {run.modelName}
            </p>
            {run.prompt && (
              <p className="line-clamp-2 text-[11px] leading-snug text-white/65">{run.prompt}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <TileAction icon="refresh" label="Reuse these settings" onClick={reuse} />
            {url && (
              <>
                <TileAction
                  icon={copied ? "check" : "copy"}
                  label="Copy URL"
                  onClick={copy}
                />
                <TileAction icon="download" label="Open / download" href={url} />
              </>
            )}
            <TileAction
              icon="trash"
              label="Remove from gallery"
              danger
              onClick={() => removeRun(run.id)}
            />
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
    <div className="anim-fade fixed inset-0 z-[110] flex items-center justify-center bg-canvas-deep/92 p-6 backdrop-blur-md">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="anim-pop relative max-h-full max-w-full rounded-card object-contain"
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-chip bg-white/10 text-white transition-colors duration-[120ms] hover:bg-white/20"
        aria-label="Close"
      >
        <Icon name="close" size={17} />
      </button>
    </div>
  );
}

export function Gallery() {
  const runs = useStudio((s) => s.runs);
  const hydrated = useStudio((s) => s.hydrated);
  const togglePicker = useStudio((s) => s.togglePicker);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!hydrated) return null;

  if (runs.length === 0) {
    return (
      <div className="anim-fade flex flex-1 flex-col items-center justify-center px-6 py-6 text-center md:py-10">
        <span className="pending-surface mb-4 grid h-12 w-12 place-items-center rounded-card md:mb-5 md:h-16 md:w-16 md:rounded-panel">
          <Icon name="spark" size={20} className="relative z-10 text-white" />
        </span>
        <h2 className="mb-1.5 text-[16px] text-t1 md:mb-2 md:text-[18px]">Nothing generated yet</h2>
        <p className="max-w-sm text-[12.5px] leading-relaxed text-t3 md:mb-5 md:text-[13px]">
          Pick a model in the bar below, set it up the way you want, and hit generate. Every run
          lands here at its real aspect ratio.
        </p>
        {/* The phone header already carries the model button, so the CTA is desktop-only. */}
        <button
          type="button"
          onClick={() => togglePicker(true, "all")}
          className="cta hidden rounded-full px-4 py-2 text-[12.5px] hover:scale-[1.03] active:scale-95 md:inline-flex"
        >
          Browse models
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 gap-2.5 sm:columns-2 lg:columns-3 xl:columns-4">
        {runs.map((run, index) => (
          <Tile key={run.id} run={run} index={index} onOpen={setLightbox} />
        ))}
      </div>
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
