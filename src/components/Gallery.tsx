"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GenerationLoader } from "@/components/GenerationLoader";
import { AudioFace, AudioPlay, audioTitle } from "@/components/AudioCard";
import { LikeHeart } from "@/components/LikeHeart";
import { InputViewer, MediaViewer, inputMedia } from "@/components/MediaViewer";
import { chipCaption } from "@/components/controls";
import { VendorBadge } from "@/components/VendorMark";
import { SelectMark, SelectionBar } from "@/components/SelectionBar";
import { Icon } from "@/components/Icon";
import { saveMedia, useSave } from "@/lib/download";
import { SaveGlyph } from "@/components/SaveGlyph";
import { getModel, type Category } from "@/lib/registry";
import { mediaKind } from "@/lib/upload";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
import { usePhone } from "@/lib/usePhone";
import { useLeaving } from "@/lib/useLeaving";
import { recreateRun, sendReference } from "@/lib/reuse";
import { useReflow } from "@/lib/useReflow";
import { byDay } from "@/lib/days";
import { type Box } from "@/lib/justify";
import { noteRatio, parseRatio, ratioOf } from "@/lib/mediaRatio";
import { JustifiedRows } from "@/components/JustifiedRows";
import { failureHint } from "@/lib/runErrors";
import { keptNote, usedElsewhere } from "@/lib/usage";
import { ConfirmPopup } from "@/components/ConfirmPopup";
import { useStudio, type Run } from "@/store/studio";
import { mediaSrc } from "@/lib/storage/client";

const STATE_LABEL: Record<Run["state"], string> = {
  queued: "Submitting",
  pending: "Queued",
  running: "Rendering",
  success: "",
  failed: "",
};

function StatusOverlay({ run }: { run: Run }) {
  const removeRun = useStudio((s) => s.removeRun);
  // A long reason is cut to a few lines; a tap shows it whole.
  const [whole, setWhole] = useState(false);
  const [asking, setAsking] = useState(false);
  if (run.state === "failed") {
    const hint = failureHint(run.error);
    // A failed tile has no media to open, so its way out has to be on the
    // tile itself and always showing: a phone has no hover to find it with.
    // The tile is a container, so a narrow one keeps the two actions side by
    // side as icons and only a roomy one spells them out.
    return (
      <div className="@container absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] p-3 text-center backdrop-blur-sm">
        <Icon name="alert" size={18} className="hidden shrink-0 text-[var(--danger)] @[140px]:block" />
        {/* Said in so many words, so the tile reads as a failure at a
            glance rather than as one more picture still on its way. */}
        <p className="text-[12.5px] font-medium text-t1 @[140px]:text-[13.5px]">Couldn&apos;t make it</p>
        <button
          type="button"
          // Only a message the tile cuts short opens up; one that fits (a
          // desktop's larger tile) is already whole.
          onClick={(event) => {
            const text = event.currentTarget;
            if (text.scrollHeight > text.clientHeight + 1) setWhole(true);
          }}
          title={run.error}
          aria-expanded={whole}
          className="line-clamp-3 cursor-default text-[11.5px] leading-snug text-[var(--danger)] @[140px]:line-clamp-4"
        >
          {run.error ?? "Generation failed."}
        </button>
        {hint && <p className="hidden text-[11.5px] leading-snug text-t3 @[220px]:line-clamp-3">{hint}</p>}
        {/* The whole reason, over the whole tile; a tap puts it away. */}
        {whole && (
          <button
            type="button"
            onClick={() => setWhole(false)}
            aria-label="Hide the full error"
            className="no-bar absolute inset-0 z-10 overflow-y-auto bg-surface/95 p-3 text-left text-[12px] leading-snug text-[var(--danger)] backdrop-blur-sm"
          >
            {run.error ?? "Generation failed."}
            {hint && <span className="mt-2 block text-t3">{hint}</span>}
          </button>
        )}
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
            onClick={() => setAsking(true)}
            title="Remove from gallery"
            aria-label="Remove"
            className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--danger)_16%,transparent)] px-2 text-[11.5px] text-[var(--danger)] transition-colors duration-[120ms] hover:bg-[color-mix(in_oklab,var(--danger)_28%,transparent)] @[190px]:px-2.5"
          >
            <Icon name="trash" size={13} />
            <span className="hidden @[190px]:inline">Remove</span>
          </button>
        </div>
        <ConfirmPopup
          open={asking}
          title="Delete this?"
          message="The failed run is removed from your studio."
          confirmLabel="Delete"
          onConfirm={() => {
            setAsking(false);
            removeRun(run.id);
          }}
          onClose={() => setAsking(false)}
        />
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
        {run.held ? "Waiting for a slot" : STATE_LABEL[run.state]}
      </span>
    </div>
  );
}

function Media({ url, run, small, compact }: { url: string; run?: Run; small?: boolean; compact?: boolean }) {
  const kind = mediaKind(url);
  if (kind === "video") {
    return (
      // No controls on a tile: the tap belongs to the tile, and the enlarged
      // view is where the clip actually plays.
      <video
        src={mediaSrc(url)}
        className="no-lift h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => noteRatio(url, e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
      />
    );
  }
  if (kind === "audio") {
    // Named for what it is; the tile lays its own play button over this.
    if (small) {
      return (
        <span className="grid h-full w-full place-items-center bg-surface bg-gradient-to-br from-t1/[0.07] to-transparent">
          <Icon name="audio" size={16} className="text-t2" />
        </span>
      );
    }
    return <AudioFace title={audioTitle(run, url)} source={run?.modelName} compact={compact} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={mediaSrc(url)}
      alt=""
      loading="lazy"
      draggable={false}
      onLoad={(e) => noteRatio(url, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
      className="no-lift h-full w-full object-cover"
    />
  );
}

function TileAction({
  icon,
  glyph,
  label,
  onClick,
  danger,
  filled,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  /** Drawn instead of the icon, for a button that shows its own progress. */
  glyph?: ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  /** A heart that is already given reads as solid. */
  filled?: boolean;
}) {
  const className = `grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition-all duration-[120ms] hover:scale-110 ${
    danger ? "hover:bg-[#ff6b6b]/80" : "hover:bg-black/80"
  }`;
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={className}>
      {glyph ?? <Icon name={icon} size={14} fill={filled ? "currentColor" : "none"} />}
    </button>
  );
}

/** The tile's Download, which shows its save going through and done. */
function SaveTileAction({ url }: { url: string }) {
  const saver = useSave();
  return (
    <TileAction
      icon="download"
      glyph={<SaveGlyph state={saver.state} size={14} />}
      label={saver.label}
      onClick={() => saver.state !== "busy" && void saver.save([url])}
    />
  );
}

/** A run's tile: its media, or its loader while it is being made. */
export function Tile({
  run,
  index,
  onOpen,
  square,
  leaving,
  picked,
  picking,
  onPick,
  box,
}: {
  run: Run;
  index: number;
  /** Its size in the desktop's justified rows; absent in a phone's grid. */
  box?: Box;
  onOpen: (url: string) => void;
  /** Square and cropped in a phone's grid; its own shape everywhere else. */
  square: boolean;
  /** On its way out: shrinking where it stood rather than blinking away. */
  leaving?: boolean;
  picked: boolean;
  /** Picking is under way (something picked, or Select pressed): a tap picks rather than opens. */
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
  // A made voice finishes with nothing to reveal: the loader has no file to
  // wait for, so it steps aside.
  useEffect(() => {
    if (run.made && !run.urls.length) setLoading(false);
  }, [run.made, run.urls.length]);


  return (
    <div
      data-flip={run.id}
      className={`${
        leaving ? "tile-leave" : "anim-tile"
      } group relative shrink-0 overflow-hidden bg-surface transition-all duration-[200ms] ${
        box || square ? "" : "break-inside-avoid"
      }`}
      style={{
        animationDelay: `${Math.min(index, 10) * 30}ms`,
        ...(box ? { position: "absolute", left: box.x, top: box.y, width: box.width, height: box.height } : null),
      }}
    >
      {/* Asked in a small window, saying what else uses the file. */}
      <ConfirmPopup
        open={confirming}
        title="Delete this?"
        message={(confirming && keptNote(usedElsewhere(run.urls, { runs: [run.id] }))) || "It is removed from your studio for good."}
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirming(false);
          removeRun(run.id);
        }}
        onClose={() => setConfirming(false)}
      />
      {/* While the run is still queued the box is a slim placeholder; it
          grows into the shape of the media as the model starts on it, and
          the same transition carries the tile between grid sizes. */}
      <div
        style={
          box || square
            ? undefined
            : { aspectRatio: run.output === "audio" ? "1 / 1" : run.state === "queued" ? "5 / 2" : run.ratio }
        }
        className={`t-resize relative w-full ${box ? "h-full" : square ? "aspect-square" : ""}`}
      >
        {url ? (
          <button
            type="button"
            onClick={() => (picking ? onPick() : onOpen(url))}
            className="block h-full w-full cursor-zoom-in"
          >
            <Media url={url} run={run} compact={square} />
          </button>
        ) : run.made ? (
          // A voice has nothing to look at: the tile says what was made.
          <div className="grid h-full w-full place-items-center bg-t1/[0.03] text-t3">
            <Icon name="mic" size={26} />
          </div>
        ) : (
          // What a restored or reduced-motion tile shows while it waits.
          <div className="pending-surface h-full w-full" />
        )}
        {run.made && (
          <span className="pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] text-white backdrop-blur-md">
            {run.made.kind === "voice" ? "Voice" : "Character"}
            {run.made.name ? ` · ${run.made.name}` : ""}
          </span>
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
        {url && mediaKind(url) === "audio" && !picking && (
          <AudioPlay key={url} url={url} compact={square} className={`absolute z-10 ${square ? "bottom-2 left-2" : "bottom-3 left-3"}`} />
        )}
      </div>

      {/* A phone's grid of squares has no room under a tile: the rest are in the enlarged view. */}
      {run.urls.length > 1 && !square && (
        <div className="no-bar flex gap-1.5 overflow-x-auto p-2">
          {run.urls.slice(1).map((extra) => (
            <button
              key={extra}
              type="button"
              onClick={() => onOpen(extra)}
              className="h-12 w-12 shrink-0 overflow-hidden rounded-chip ring-1 ring-inset ring-line transition-transform duration-[120ms] hover:scale-105"
            >
              <Media url={extra} run={run} small />
            </button>
          ))}
        </div>
      )}

      {/* The frame that says it is picked, over the picture rather than under
          it: an inset ring on the tile itself is painted beneath the media and
          came out as thin lines along the edges. */}
      {picked && (
        <span className="pointer-events-none absolute inset-0 z-10 ring-2 ring-inset ring-t1" />
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
          {url && <SaveTileAction url={url} />}
          <TileAction icon="refresh" label="Recreate" onClick={() => recreateRun(run)} />
          <TileAction icon="trash" label="Remove from gallery" danger onClick={() => setConfirming(true)} />
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

/** How tall the list view lets a piece of media stand. */
const LIST_MEDIA_H = 440;

/**
 * A run in the list view's words: its model, the prompt, what it was given,
 * the options that shaped it and when, beside the media itself.
 */
function RunDetails({ run }: { run: Run }) {
  const model = getModel(run.modelId);
  const removeRun = useStudio((s) => s.removeRun);
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  // One of the inputs, open in the viewer.
  const [input, setInput] = useState<string | null>(null);
  const inputs = inputMedia(run);
  const chips = model
    ? model.fields
        .filter((f) => f.placement === "bar" && f.kind !== "toggle")
        .map((f) => ({ field: f, value: run.values[f.key] }))
        .filter(({ value }) => value !== undefined && value !== null && value !== "" && typeof value !== "object")
        .filter(({ field }, i, all) => all.findIndex((x) => x.field.key === field.key) === i)
        .slice(0, 4)
        .map(({ field, value }) => chipCaption(field, value, run.values))
    : [];
  const button =
    "grid h-8 w-8 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.07] hover:text-t1";
  return (
    <div className="flex min-w-0 flex-col rounded-panel border border-line bg-elevated p-4">
      <span className="flex w-fit items-center gap-1.5 rounded-full bg-t1/[0.07] px-2.5 py-1 text-[12px] font-medium text-t1">
        {model && <VendorBadge model={model} size={14} bare />}
        {run.modelName}
      </span>
      {run.prompt && (
        <p className="mt-3 line-clamp-6 whitespace-pre-line text-[13.5px] leading-relaxed text-t2">{run.prompt}</p>
      )}
      {inputs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {inputs.slice(0, 8).map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setInput(url)}
              title="Open this input"
              aria-label="Open this input"
              className="h-11 w-11 overflow-hidden rounded-chip bg-surface ring-1 ring-inset ring-line transition-transform duration-[120ms] hover:scale-105 active:scale-95"
            >
              {mediaKind(url) === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaSrc(url)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-t3">
                  <Icon name={mediaKind(url) === "video" ? "video" : "audio"} size={15} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <InputViewer url={input} inputs={inputs} onShow={setInput} onClose={() => setInput(null)} />
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full border border-line px-2.5 py-1 text-[12px] text-t2">
              {chip}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto flex items-center gap-1 pt-4">
        <span className="flex-1 text-[12px] text-t4">
          {new Date(run.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
        </span>
        {run.prompt && (
          <button
            type="button"
            title={copied ? "Copied" : "Copy prompt"}
            aria-label="Copy prompt"
            onClick={() => {
              void navigator.clipboard?.writeText(run.prompt).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
              });
            }}
            className={button}
          >
            <Icon name={copied ? "check" : "copy"} size={15} />
          </button>
        )}
        <button type="button" title="Recreate" aria-label="Recreate" onClick={() => recreateRun(run)} className={button}>
          <Icon name="refresh" size={15} />
        </button>
        <button
          type="button"
          title="Remove from gallery"
          aria-label="Remove"
          onClick={() => setAsking(true)}
          className="grid h-8 w-8 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-[#ff6b6b]/10 hover:text-[#ff8f8f]"
        >
          <Icon name="trash" size={15} />
        </button>
        <ConfirmPopup
          open={asking}
          title="Delete this?"
          message={(asking && keptNote(usedElsewhere(run.urls, { runs: [run.id] }))) || "It is removed from your studio for good."}
          confirmLabel="Delete"
          onConfirm={() => {
            setAsking(false);
            removeRun(run.id);
          }}
          onClose={() => setAsking(false)}
        />
      </div>
    </div>
  );
}

/** The runs of one category, newest first. */
export function Gallery({ category, view = "grid" }: { category?: Category; view?: "list" | "grid" }) {
  const runs = useStudio((s) => s.runs);
  const hydrated = useStudio((s) => s.hydrated);
  const phoneGrid = useStudio((s) => s.phoneGrid);
  const phone = usePhone();
  const favorites = useStudio((s) => s.favorites);
  const setFavorites = useStudio((s) => s.setFavorites);
  const removeRun = useStudio((s) => s.removeRun);
  const fileUnder = useStudio((s) => s.fileUnder);
  const [viewer, setViewer] = useState<{ url: string; runId: string } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  // A phone's Select button: tiles pick on a tap before anything is picked.
  const selectMode = useStudio((s) => s.selectMode);
  const setSelectMode = useStudio((s) => s.setSelectMode);
  // Cancel ends picking outright: whatever was picked goes with it.
  useEffect(() => {
    if (!selectMode) setPicked([]);
  }, [selectMode]);

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

  const tile = (run: Run, box?: Box) => (
    <Tile
      key={run.id}
      run={run}
      box={box}
      index={tiles.indexOf(run)}
      square={phone && phoneGrid}
      leaving={leaving.has(run.id)}
      onOpen={(url) => setViewer({ url, runId: run.id })}
      picked={picked.includes(run.id)}
      picking={picked.length > 0 || selectMode}
      onPick={() =>
        setPicked((current) =>
          current.includes(run.id) ? current.filter((id) => id !== run.id) : [...current, run.id],
        )
      }
    />
  );

  // The run behind the open preview, so the panel beside it knows what it is
  // looking at and what its buttons act on.
  const open = viewer ? runs.find((run) => run.id === viewer.runId) : undefined;
  // What the open view steps through: every finished output, in the order the gallery shows them.
  const sequence = shown.flatMap((run) => (run.state === "success" ? run.urls : []));
  const pickedUrls = picked.flatMap((id) => runs.find((run) => run.id === id)?.urls ?? []);
  // The project the picks share, or "" when they are in different ones.
  const pickedProjects = new Set(picked.map((id) => runs.find((run) => run.id === id)?.projectId ?? null));
  const pickedProject = pickedProjects.size === 1 ? [...pickedProjects][0] : "";

  return (
    <>
      {/* A desktop lays everything out as one wall, edge to edge, newest
          first; a phone keeps a heading for each day the media was made on.
          Either way one container holds every tile, so a tile that moves
          still slides there rather than jumping. */}
      <div ref={grid} className={`no-text-select flex flex-col overflow-x-clip ${view === "list" && !phone ? "gap-3" : "gap-6"}`}>
        {view === "list" && !phone ? (
          // Higgsfield's history: each run a row, the media on the left at
          // its own shape and the details on the right.
          tiles.map((run) => {
            const ratio = run.output === "audio" ? 1 : (ratioOf(run.urls[0]) ?? parseRatio(run.ratio) ?? 16 / 9);
            return (
              <article key={run.id} className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-3">
                <div className="flex min-h-[260px] items-center justify-center rounded-panel bg-t1/[0.03] p-3">
                  <div style={{ width: `min(100%, ${Math.round(LIST_MEDIA_H * ratio)}px)` }}>{tile(run)}</div>
                </div>
                <RunDetails run={run} />
              </article>
            );
          })
        ) : phone ? (
          byDay(tiles, (run) => run.createdAt).map((day) => (
            <section key={day.key}>
              <h3 className="mb-2.5 px-4 text-[15px] font-semibold tracking-[-0.01em] text-t1">{day.label}</h3>
              {/* Everything the same size in a grid of three, or one piece
                  of media at a time, meeting almost edge to edge. */}
              <div className={`grid gap-[2px] ${phoneGrid ? "grid-cols-3" : "grid-cols-1"}`}>
                {day.items.map((run) => tile(run))}
              </div>
            </section>
          ))
        ) : (
          // Justified rows, as tall as the density step asks, each tile as
          // wide as its shape.
          <JustifiedRows
            items={tiles}
            keyOf={(run) => run.id}
            // Sound has no shape of its own: a square, so a song is a tile
            // among the others rather than a banner across the row.
            ratioOf={(run) => (run.output === "audio" ? 1 : (ratioOf(run.urls[0]) ?? parseRatio(run.ratio)))}
            render={(run, box) => tile(run, box)}
          />
        )}
      </div>

      <SelectionBar
        open={selectMode}
        count={picked.length}
        total={shown.length}
        onSelectAll={() => setPicked(shown.map((run) => run.id))}
        favorited={pickedUrls.length > 0 && pickedUrls.every((url) => favorites.includes(url))}
        onFavorite={() =>
          setFavorites(pickedUrls, !pickedUrls.every((url) => favorites.includes(url)))
        }
        onDownload={() => saveMedia(pickedUrls)}
        project={pickedProject}
        deleteNote={() => keptNote(usedElsewhere(pickedUrls, { runs: picked }), picked.length > 1)}
        onProject={(projectId) => {
          fileUnder(pickedUrls, projectId);
          setPicked([]);
          setSelectMode(false);
        }}
        onDelete={() => {
          picked.forEach(removeRun);
          setPicked([]);
          setSelectMode(false);
        }}
        onClose={() => {
          setPicked([]);
          setSelectMode(false);
        }}
      />

      <MediaViewer
        url={open ? viewer?.url ?? null : null}
        run={open}
        onClose={() => setViewer(null)}
        sequence={sequence}
        onShow={(url) => {
          const owner = shown.find((run) => run.state === "success" && run.urls.includes(url));
          if (owner) setViewer({ url, runId: owner.id });
        }}
      />
    </>
  );
}
