"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GenerationLoader } from "@/components/GenerationLoader";
import { MediaViewer } from "@/components/MediaViewer";
import { Icon } from "@/components/Icon";
import { CATEGORY_ACCENT } from "@/components/ModelPicker";
import { getModel, type Category } from "@/lib/registry";
import { mediaKind } from "@/lib/upload";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
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
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#ff6b6b]/10 p-4 text-center backdrop-blur-sm">
        <Icon name="alert" size={18} className="text-[#ff8f8f]" />
        <p className="line-clamp-4 text-[11.5px] leading-snug text-[#ff8f8f]">
          {run.error ?? "Generation failed."}
        </p>
      </div>
    );
  }
  if (run.state === "success") return null;
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 p-3">
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
      // No controls on a tile: the tap belongs to the tile, and the enlarged
      // view is where the clip actually plays.
      <video src={url} className="h-full w-full object-cover" muted loop playsInline preload="metadata" />
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
  const className = `grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition-all duration-[120ms] hover:scale-110 ${
    danger ? "hover:bg-[#ff6b6b]/80" : "hover:bg-black/80"
  }`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" download title={label} aria-label={label} className={className}>
        <Icon name={icon} size={12} />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={className}>
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
  const [loading, setLoading] = useState(false);
  const settled = useRef(false);
  const finish = useCallback(() => setLoading(false), []);

  // A phone has no hover, and this bar is too big to leave sitting on the
  // picture. So there it stays away entirely: a tap opens the media, and the
  // enlarged view carries the same actions with room to label them.
  const coarse = useCoarsePointer();
  const [confirming, setConfirming] = useState(false);

  // Only a run still in flight when the tile mounts gets the shader — work
  // restored from an earlier session should not replay it, and anyone who
  // asked for less motion keeps the plain gradient. Decided once, after
  // mount, so the server-rendered markup and the client agree.
  useEffect(() => {
    if (settled.current) return;
    settled.current = true;
    if (run.urls.length || run.state === "failed") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setLoading(true);
  }, [run.urls.length, run.state]);

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
      onMouseLeave={() => setConfirming(false)}
      className="anim-tile group @container relative mb-2.5 break-inside-avoid overflow-hidden rounded-card bg-surface ring-1 ring-inset ring-line transition-all duration-[200ms] hover:ring-line-strong"
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    >
      <div style={{ aspectRatio: run.ratio }} className="relative w-full">
        {url ? (
          <button type="button" onClick={() => onOpen(url)} className="block h-full w-full cursor-zoom-in">
            <Media url={url} />
          </button>
        ) : (
          // Stays underneath the shader as the fallback when WebGL is missing.
          <div className="pending-surface h-full w-full" />
        )}
        {loading && (
          <GenerationLoader
            url={url}
            reveal={!!url && run.output === "image" && mediaKind(url) === "image"}
            failed={run.state === "failed"}
            onFinished={finish}
          />
        )}
        <StatusOverlay run={run} />
      </div>

      {run.urls.length > 1 && (
        <div className="no-bar flex gap-1.5 overflow-x-auto p-2">
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

      <div
        className="hover-reveal tap-reveal pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3 opacity-0 transition-opacity duration-[200ms] group-hover:opacity-100"
      >
        {/* Nothing to press while the bar is down: at opacity 0 the actions
            would still take the tap meant for the picture under them. */}
        {/* Four actions and a prompt do not share a 200px tile: below that the
            name sits on its own line instead of being squeezed to one letter. */}
        <div
          className={`flex flex-col items-start gap-1.5 @[248px]:flex-row @[248px]:items-end @[248px]:justify-between @[248px]:gap-2 ${
            coarse ? "pointer-events-none" : "pointer-events-auto"
          }`}
        >
          <div className="w-full min-w-0 @[248px]:w-auto">
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
            {confirming ? (
              <>
                <TileAction icon="close" label="Keep it" onClick={() => setConfirming(false)} />
                <button
                  type="button"
                  onClick={() => removeRun(run.id)}
                  className="rounded-full bg-[#ff6b6b]/85 px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors duration-[120ms] hover:bg-[#ff6b6b]"
                >
                  Delete?
                </button>
              </>
            ) : (
              <TileAction
                icon="trash"
                label="Remove from gallery"
                danger
                onClick={() => setConfirming(true)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The packed columns at the widest breakpoint, per density step. Written out
 * rather than interpolated so Tailwind sees every class it has to generate.
 */
const COLUMNS: Record<number, string> = {
  2: "columns-1 sm:columns-2",
  3: "columns-1 sm:columns-2 lg:columns-3",
  4: "columns-1 sm:columns-2 lg:columns-3 xl:columns-4",
  5: "columns-2 sm:columns-3 lg:columns-4 xl:columns-5",
  6: "columns-2 sm:columns-3 lg:columns-5 xl:columns-6",
};

/** The runs of one category, newest first. */
export function Gallery({ category }: { category?: Category }) {
  const runs = useStudio((s) => s.runs);
  const hydrated = useStudio((s) => s.hydrated);
  const density = useStudio((s) => s.density);
  const [viewer, setViewer] = useState<{ url: string; runId: string } | null>(null);

  if (!hydrated) return null;

  const shown = category
    ? runs.filter((run) => getModel(run.modelId)?.category === category)
    : runs;
  // The run behind the open preview, so the panel beside it knows what it is
  // looking at and what its buttons act on.
  const open = viewer ? runs.find((run) => run.id === viewer.runId) : undefined;

  return (
    <>
      <div className={`gap-2.5 ${COLUMNS[density] ?? COLUMNS[4]}`}>
        {shown.map((run, index) => (
          <Tile
            key={run.id}
            run={run}
            index={index}
            onOpen={(url) => setViewer({ url, runId: run.id })}
          />
        ))}
      </div>
      <MediaViewer
        url={open ? viewer?.url ?? null : null}
        run={open}
        onClose={() => setViewer(null)}
      />
    </>
  );
}
