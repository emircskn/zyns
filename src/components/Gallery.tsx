"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenerationLoader } from "@/components/GenerationLoader";
import { LikeHeart } from "@/components/LikeHeart";
import { MediaViewer } from "@/components/MediaViewer";
import { SelectMark, SelectionBar } from "@/components/SelectionBar";
import { Icon } from "@/components/Icon";
import { downloadAll } from "@/lib/download";
import { getModel, type Category } from "@/lib/registry";
import { mediaKind } from "@/lib/upload";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
import { usePhone } from "@/lib/usePhone";
import { useLeaving } from "@/lib/useLeaving";
import { recreateRun, sendReference } from "@/lib/reuse";
import { useReflow } from "@/lib/useReflow";
import { byDay } from "@/lib/days";
import { useLongPress } from "@/lib/useLongPress";
import { useStudio, type Run } from "@/store/studio";

const STATE_LABEL: Record<Run["state"], string> = {
  queued: "Submitting",
  pending: "Queued",
  running: "Rendering",
  success: "",
  failed: "",
};

function StatusOverlay({ run }: { run: Run }) {
  const removeRun = useStudio((s) => s.removeRun);
  if (run.state === "failed") {
    // A failed tile has no media to open, so its way out has to be on the
    // tile itself and always showing: a phone has no hover to find it with.
    // The tile is a container, so a narrow one keeps the two actions side by
    // side as icons and only a roomy one spells them out.
    return (
      <div className="@container absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] p-3 text-center backdrop-blur-sm">
        <Icon name="alert" size={18} className="hidden shrink-0 text-[var(--danger)] @[140px]:block" />
        <p className="line-clamp-3 text-[11.5px] leading-snug text-[var(--danger)] @[140px]:line-clamp-4">
          {run.error ?? "Generation failed."}
        </p>
        <div className="mt-0.5 flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => recreateRun(run)}
            title="Put this run's model and settings back in the prompt bar"
            aria-label="Recreate"
            className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-t1/[0.08] px-2 text-[11.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.14] hover:text-t1 @[190px]:px-2.5"
          >
            <Icon name="refresh" size={13} />
            <span className="hidden @[190px]:inline">Recreate</span>
          </button>
          <button
            type="button"
            onClick={() => removeRun(run.id)}
            title="Remove from gallery"
            aria-label="Remove"
            className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--danger)_16%,transparent)] px-2 text-[11.5px] text-[var(--danger)] transition-colors duration-[120ms] hover:bg-[color-mix(in_oklab,var(--danger)_28%,transparent)] @[190px]:px-2.5"
          >
            <Icon name="trash" size={13} />
            <span className="hidden @[190px]:inline">Remove</span>
          </button>
        </div>
      </div>
    );
  }
  if (run.state === "success") return null;
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 p-3">
      {/* In the theme's own ink: it sits on the loader, which follows the
          theme, never on the finished picture. */}
      <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-t1/30 border-t-t1" />
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-t2">
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
      <video
        src={url}
        className="no-lift h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
      />
    );
  }
  if (kind === "audio") {
    return (
      <div className="pending-surface flex h-full w-full flex-col items-center justify-center gap-3 p-5">
        <Icon name="audio" size={22} className="relative z-10 text-t2" />
        <audio src={url} controls className="relative z-10 w-full max-w-[280px]" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      draggable={false}
      className="no-lift h-full w-full object-cover"
    />
  );
}

function TileAction({
  icon,
  label,
  onClick,
  href,
  danger,
  filled,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  /** A heart that is already given reads as solid. */
  filled?: boolean;
}) {
  const className = `grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition-all duration-[120ms] hover:scale-110 ${
    danger ? "hover:bg-[#ff6b6b]/80" : "hover:bg-black/80"
  }`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" download title={label} aria-label={label} className={className}>
        <Icon name={icon} size={14} fill={filled ? "currentColor" : "none"} />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={className}>
      <Icon name={icon} size={14} fill={filled ? "currentColor" : "none"} />
    </button>
  );
}

function Tile({
  run,
  index,
  onOpen,
  square,
  leaving,
  picked,
  picking,
  onPick,
}: {
  run: Run;
  index: number;
  onOpen: (url: string) => void;
  /** Square and cropped in a phone's grid; its own shape everywhere else. */
  square: boolean;
  /** On its way out: shrinking where it stood rather than blinking away. */
  leaving?: boolean;
  picked: boolean;
  /** Something is already picked, so a tap picks rather than opens. */
  picking: boolean;
  onPick: () => void;
}) {
  const removeRun = useStudio((s) => s.removeRun);
  const favorites = useStudio((s) => s.favorites);
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const url = run.urls[0];
  const kept = !!url && favorites.includes(url);
  const [loading, setLoading] = useState(false);
  const settled = useRef(false);
  const finish = useCallback(() => setLoading(false), []);

  // A phone has no hover, and this bar is too big to leave sitting on the
  // picture. So there it stays away entirely: a tap opens the media, and the
  // enlarged view carries the same actions with room to label them.
  const coarse = useCoarsePointer();
  const [confirming, setConfirming] = useState(false);
  const press = useLongPress(onPick);

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


  return (
    <div
      {...press}
      data-flip={run.id}
      onMouseLeave={() => setConfirming(false)}
      className={`${
        leaving ? "tile-leave" : "anim-tile"
      } group relative overflow-hidden rounded-card bg-surface ring-1 ring-inset transition-all duration-[200ms] ${
        square ? "" : "mb-2.5 break-inside-avoid"
      } ${
        picked ? "ring-line" : "ring-line hover:ring-line-strong"
      }`}
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    >
      {/* While the run is still queued the box is a slim placeholder; it
          grows into the shape of the media as the model starts on it, and
          the same transition carries the tile between grid sizes. */}
      <div
        style={square ? undefined : { aspectRatio: run.state === "queued" ? "5 / 2" : run.ratio }}
        className={`t-resize relative w-full ${square ? "aspect-square" : ""}`}
      >
        {url ? (
          <button
            type="button"
            onClick={() => (picking ? onPick() : onOpen(url))}
            className="block h-full w-full cursor-zoom-in"
          >
            <Media url={url} />
          </button>
        ) : (
          // What a restored or reduced-motion tile shows while it waits.
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

      {/* The frame that says it is picked, over the picture rather than under
          it: an inset ring on the tile itself is painted beneath the media and
          came out as thin lines along the edges. */}
      {picked && (
        <span className="pointer-events-none absolute inset-0 z-10 rounded-card ring-2 ring-inset ring-t1" />
      )}

      {url && (
        <button
          type="button"
          onClick={onPick}
          aria-label={picked ? "Deselect" : "Select"}
          // Invisible is not absent: at opacity 0 this still took the tap
          // meant for the picture under it.
          className={`absolute left-2 top-2 z-10 transition-opacity duration-[150ms] ${
            picking
              ? "opacity-100"
              : "hover-reveal tap-reveal pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
          }`}
        >
          <SelectMark on={picked} />
        </button>
      )}

      {/* Actions alone: the model and the prompt are a keystroke away in the
          enlarged view, and on a tile they only cover the picture. They stand
          in a column down the right, in reaching order, with the one that
          sends this picture somewhere else on the opposite corner. */}
      {/* A failed tile carries its own two actions in the overlay above. */}
      {run.state !== "failed" && (
      <div className="hover-reveal tap-reveal pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[200ms] group-hover:opacity-100">
        <div
          // A short tile has no room for the whole column, so what does not
          // fit wraps into a second one to its left instead of running off the
          // foot. The column itself spans the height to measure against, so
          // only the buttons in it take a click, never the gap under them.
          className={`pointer-events-none absolute bottom-2 right-2 top-2 flex flex-col flex-wrap-reverse content-start gap-1 ${
            coarse || picking ? "" : "[&>*]:pointer-events-auto"
          }`}
        >
          {url && (
            <LikeHeart
              liked={kept}
              size={14}
              title={kept ? "Remove from favorites" : "Add to favorites"}
              onToggle={() => toggleFavorite(url)}
              className="grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition-all duration-[120ms] hover:scale-110 hover:bg-black/80"
            />
          )}
          {url && <TileAction icon="download" label="Open / download" href={url} />}
          <TileAction icon="refresh" label="Recreate" onClick={() => recreateRun(run)} />
          {confirming ? (
            <>
              <TileAction icon="close" label="Keep it" onClick={() => setConfirming(false)} />
              <button
                type="button"
                onClick={() => removeRun(run.id)}
                aria-label="Confirm delete"
                className="grid h-7 w-7 place-items-center rounded-full bg-[#ff6b6b]/85 text-white backdrop-blur-md transition-transform duration-[120ms] hover:scale-110"
              >
                <Icon name="check" size={14} strokeWidth={2.2} />
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

        {url && mediaKind(url) === "image" && (
          <div
            className={`absolute bottom-2 left-2 ${
              coarse || picking ? "pointer-events-none" : "pointer-events-auto"
            }`}
          >
            <TileAction icon="layers" label="Use as reference" onClick={() => sendReference(url)} />
          </div>
        )}
      </div>
      )}
    </div>
  );
}

/**
 * The packed columns at the widest breakpoint, per density step. Written out
 * rather than interpolated so Tailwind sees every class it has to generate,
 * and from `md` up only: a phone lays the gallery out its own way.
 */
const COLUMNS: Record<number, string> = {
  2: "md:columns-2",
  3: "md:columns-2 lg:columns-3",
  4: "md:columns-2 lg:columns-3 xl:columns-4",
  5: "md:columns-3 lg:columns-4 xl:columns-5",
  6: "md:columns-3 lg:columns-5 xl:columns-6",
};

/** The runs of one category, newest first. */
export function Gallery({ category }: { category?: Category }) {
  const runs = useStudio((s) => s.runs);
  const hydrated = useStudio((s) => s.hydrated);
  const density = useStudio((s) => s.density);
  const phoneGrid = useStudio((s) => s.phoneGrid);
  const phone = usePhone();
  const favorites = useStudio((s) => s.favorites);
  const setFavorites = useStudio((s) => s.setFavorites);
  const removeRun = useStudio((s) => s.removeRun);
  const [viewer, setViewer] = useState<{ url: string; runId: string } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  const shown = useMemo(
    () =>
      category ? runs.filter((run) => getModel(run.modelId)?.category === category) : runs,
    [runs, category],
  );
  // A deleted run holds its cell while it shrinks out of it, rather than the
  // grid closing over it between two frames.
  const { items: tiles, leaving } = useLeaving(shown, (run) => run.id);
  // And whatever is left slides into the room it leaves, rather than the
  // next tile simply being there.
  const grid = useRef<HTMLDivElement>(null);
  useReflow(grid);

  // A run can finish, or be deleted, while its tile is picked.
  useEffect(() => {
    setPicked((current) => {
      const live = current.filter((id) => runs.some((run) => run.id === id));
      return live.length === current.length ? current : live;
    });
  }, [runs]);

  if (!hydrated) return null;

  // The run behind the open preview, so the panel beside it knows what it is
  // looking at and what its buttons act on.
  const open = viewer ? runs.find((run) => run.id === viewer.runId) : undefined;
  const pickedUrls = picked.flatMap((id) => runs.find((run) => run.id === id)?.urls ?? []);

  return (
    <>
      {/* A heading for each day the media was made on, newest first. One
          container holds every day, so a tile that moves up into the day
          above still slides there rather than jumping. */}
      <div ref={grid} className="-mx-1.5 flex flex-col gap-6 md:mx-0 md:gap-8">
        {byDay(tiles, (run) => run.createdAt).map((day) => (
          <section key={day.key}>
            <h3 className="mb-2.5 px-1.5 text-[15px] font-semibold tracking-[-0.01em] text-t1 md:mb-3 md:px-0 md:text-[16px]">
              {day.label}
            </h3>
            {/* Phone: everything the same size in a grid of three, or one
                piece of media at a time. Desktop: the packed columns, at the
                chosen step. */}
            <div
              className={`grid gap-1.5 ${phoneGrid ? "grid-cols-3" : "grid-cols-1"} md:block md:gap-2.5 ${
                COLUMNS[density] ?? COLUMNS[4]
              }`}
            >
              {day.items.map((run) => (
          <Tile
            key={run.id}
            run={run}
            index={tiles.indexOf(run)}
            square={phone && phoneGrid}
            leaving={leaving.has(run.id)}
            onOpen={(url) => setViewer({ url, runId: run.id })}
            picked={picked.includes(run.id)}
            picking={picked.length > 0}
            onPick={() =>
              setPicked((current) =>
                current.includes(run.id)
                  ? current.filter((id) => id !== run.id)
                  : [...current, run.id],
              )
            }
          />
              ))}
            </div>
          </section>
        ))}
      </div>

      <SelectionBar
        count={picked.length}
        favorited={pickedUrls.length > 0 && pickedUrls.every((url) => favorites.includes(url))}
        onFavorite={() =>
          setFavorites(pickedUrls, !pickedUrls.every((url) => favorites.includes(url)))
        }
        onDownload={() => downloadAll(pickedUrls)}
        onDelete={() => {
          picked.forEach(removeRun);
          setPicked([]);
        }}
        onClose={() => setPicked([])}
      />

      <MediaViewer
        url={open ? viewer?.url ?? null : null}
        run={open}
        onClose={() => setViewer(null)}
      />
    </>
  );
}
