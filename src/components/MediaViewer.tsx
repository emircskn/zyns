"use client";

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/Icon";
import { ConfirmPopup } from "@/components/ConfirmPopup";
import { ProjectPicker } from "@/components/ProjectPicker";
import { keptNote, usedElsewhere } from "@/lib/usage";
import { LikeHeart } from "@/components/LikeHeart";
import { SaveGlyph } from "@/components/SaveGlyph";
import { VendorBadge } from "@/components/VendorMark";
import { getModel, type Field } from "@/lib/registry";
import {
  attachReference,
  firstFrameModel,
  referenceModel,
  recreateRun,
  sendReference,
} from "@/lib/reuse";
import { prefetchMedia, useSave } from "@/lib/download";
import { restoreRemix } from "@/lib/remix/reuse";
import { saveMotionClip } from "@/lib/remix/library";
import { mediaKind } from "@/lib/upload";
import { usePresence } from "@/lib/usePresence";
import { usePhone } from "@/lib/usePhone";
import { actionsFor, applyAction, type ResultAction } from "@/lib/resultActions";
import { isStudioRun, studioRecreate, studioReference, studioSettingsOf, studioTurnToVideo } from "@/lib/studio/reuse";
import { CINEMA } from "@/lib/studio/cinema";
import { TileExtras } from "@/lib/tileExtras";
import { useStudio, type Run, type Upload } from "@/store/studio";
import { mediaSrc } from "@/lib/storage/client";

/**
 * Escape closes the view, through a listener that is registered once.
 *
 * A listener re-registered on every render is not merely wasteful here: a
 * component that re-renders this one *while the key event is being
 * dispatched* takes the old listener off the document before the event
 * reaches it, and the spec says a listener removed mid-dispatch is not
 * called. That is exactly what happened, so Escape did nothing at all.
 */
function useEscape(onClose: () => void, onArrow?: (by: -1 | 1) => void) {
  const close = useRef(onClose);
  close.current = onClose;
  const arrow = useRef(onArrow);
  arrow.current = onArrow;
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close.current();
      if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && arrow.current) {
        const target = event.target as HTMLElement | null;
        // Not while typing, or when a key moves something of its own (a video's scrubber).
        if (target?.closest?.("input, textarea, select, [contenteditable], video, audio")) return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        event.preventDefault();
        arrow.current(event.key === "ArrowLeft" ? -1 : 1);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}

/** The kept copy a link stands for, so a run's input can be matched to the upload it was. */
function storageKeyOf(url: string): string | undefined {
  const { copies, remotes } = useStudio.getState();
  return (
    copies[url]?.key ??
    Object.entries(remotes).find(([, by]) => Object.values(by).some((remote) => remote?.url === url))?.[0]
  );
}

/** Where an input came from: a run that made it, or a file that was uploaded. */
function sourceOf(url: string, runs: Run[], uploads: Upload[]): { run?: Run; upload?: Upload } {
  const key = storageKeyOf(url);
  const same = (other: string) => other === url || (!!key && storageKeyOf(other) === key);
  const upload = uploads.find((u) => same(u.url));
  if (upload) return { upload };
  const run = runs.find((r) => r.state === "success" && r.urls.some(same));
  return run ? { run } : {};
}

/** What a file is, for one that came from no run: where from, its type and format, when it was added. */
function fileDetails(url: string, upload?: Upload): Array<{ label: string; value: string }> {
  const kind = mediaKind(url);
  let format = "";
  try {
    const ext = new URL(url, "https://x").pathname.split(".").pop() ?? "";
    if (/^[a-z0-9]{2,5}$/i.test(ext)) format = ext.toUpperCase() === "JPEG" ? "JPG" : ext.toUpperCase();
  } catch {
    // A link that is not one: no format to tell.
  }
  const rows = [
    { label: "Source", value: upload ? "Original upload" : "Input" },
    { label: "Type", value: kind[0].toUpperCase() + kind.slice(1) },
  ];
  if (format) rows.push({ label: "Format", value: format });
  if (upload) rows.push({ label: "Added", value: when(upload.createdAt) });
  return rows;
}

/**
 * The overflow menu, opening and closing under the More tile. It stays
 * mounted through the close so the transition has something to run on, and
 * the open state lands a frame after the mount for the same reason.
 */
function MoreMenu({
  open,
  anchor,
  onClose,
  children,
}: {
  open: boolean;
  anchor: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const { mounted, exiting } = usePresence(open, 150);
  const [shown, setShown] = useState(false);
  const [place, setPlace] = useState<{ left: number; y: number; below: boolean } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const WIDTH = 216;

  // Measured off the tile it belongs to, and flipped above it when the tile
  // sits too low for the menu to fit under.
  useLayoutEffect(() => {
    if (!mounted) {
      setPlace(null);
      return;
    }
    const measure = () => {
      const node = anchor.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const margin = 12;
      const below = window.innerHeight - rect.bottom > 190;
      setPlace({
        left: Math.max(
          margin,
          Math.min(rect.right - WIDTH, window.innerWidth - margin - WIDTH),
        ),
        y: below ? rect.bottom + 8 : window.innerHeight - rect.top + 8,
        below,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [mounted, anchor]);

  useEffect(() => {
    if (!mounted) {
      setShown(false);
      return;
    }
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [mounted]);

  // A click anywhere else puts it away, and Escape closes the menu before it
  // closes the view behind it, which is why this listens on the way down.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panel.current?.contains(target) || anchor.current?.contains(target)) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose, anchor]);

  if (!mounted || !place || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panel}
      role="menu"
      className={`surface-pop t-modal ${place.below ? "t-modal--below" : "t-modal--above"} fixed z-[120] flex flex-col gap-0.5 rounded-card p-1.5 ${
        exiting ? "is-closing" : shown ? "is-open" : ""
      }`}
      style={{
        left: place.left,
        width: WIDTH,
        ...(place.below ? { top: place.y } : { bottom: place.y }),
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/** The pictures a run was given to work from, in the order it got them. */
/**
 * One of the inputs a run was given, from the kept copy when there is one:
 * the service's own link stops working after some days. A file gone from
 * everywhere shows as such rather than as a broken picture.
 */
function RefThumb({ url, onOpen }: { url: string; onOpen: () => void }) {
  const [gone, setGone] = useState(false);
  const src = mediaSrc(url);
  const kind = mediaKind(url);
  const box = "h-14 w-14 shrink-0 overflow-hidden rounded-chip ring-1 ring-inset ring-line";
  if (gone) {
    return (
      <span title="This input is no longer available" className={`${box} grid place-items-center bg-t1/[0.03] text-t4`}>
        <span className="flex flex-col items-center gap-0.5">
          <Icon name={kind === "video" ? "video" : kind === "audio" ? "audio" : "image"} size={15} />
          <span className="text-[9.5px] leading-none">Gone</span>
        </span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Open this input"
      aria-label="Open this input"
      className={`${box} transition-transform duration-[120ms] hover:scale-105 active:scale-95`}
    >
      {kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setGone(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-surface-2">
          <Icon name={kind === "video" ? "video" : "audio"} size={16} className="text-t3" />
        </span>
      )}
    </button>
  );
}

export function inputMedia(run: Run): string[] {
  const model = getModel(run.modelId);
  if (!model) return [];
  const urls: string[] = [];
  for (const field of model.fields) {
    if (field.placement !== "input") continue;
    const value = run.values[field.key];
    if (typeof value === "string") urls.push(value);
    else if (Array.isArray(value)) {
      for (const item of value) if (typeof item === "string") urls.push(item);
    }
  }
  return urls.filter((url) => /^https?:|^data:/.test(url));
}

function when(at: number) {
  return new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * What the run was: its model, the options that shaped it, and when it ran.
 * The options come from the same fields the prompt bar puts on its chips, so
 * a model that offers quality and size lists quality and size here.
 */
function detailsOf(run: Run): Array<{ label: string; value: string }> {
  const rows = [
    { label: "Model", value: run.modelName },
    { label: "Type", value: run.output },
    { label: "Ratio", value: run.ratio.replace(" / ", ":").replace("/", ":") },
  ];
  const model = getModel(run.modelId);
  if (model) {
    if (run.mode) {
      const mode = model.modes?.find((m) => m.id === run.mode);
      if (mode) rows.push({ label: "Mode", value: mode.label });
    }
    for (const field of model.fields) {
      if (field.placement !== "bar" || rows.length >= (run.modelId === CINEMA ? 12 : 7)) continue;
      const value = run.values[field.key];
      if (value === undefined || value === null || value === "" || typeof value === "object") continue;
      if (rows.some((row) => row.label === field.label)) continue;
      const choice = field.choices?.find((c) => String(c.value) === String(value));
      rows.push({ label: field.label, value: choice?.label ?? String(value) });
    }
  }
  // A Cinema Studio shot lists the director's choices it was made with.
  for (const row of studioSettingsOf(run)) if (!rows.some((r) => r.label === row.label)) rows.push(row);
  rows.push({ label: "Created", value: when(run.createdAt) });
  // The charge as KIE reported it; the estimate before the run is only that.
  if (run.credits !== undefined) {
    rows.push({ label: "Spent", value: `${run.credits.toLocaleString("en-US")} credits` });
  }
  return rows;
}

/**
 * The media itself. On a phone it takes the width it is given and keeps its
 * own height, so the page under it scrolls; on a desktop it fills the stage
 * beside the panel. Bare either way — a frame on a picture this size reads
 * as a border the picture does not have.
 */
function Stage({ url }: { url: string }) {
  // no-lift: a long press here belongs to the phone's own Save / Copy menu,
  // not to dragging the picture out of the page.
  const fit =
    "no-lift max-h-[52vh] w-auto max-w-full object-contain md:h-full md:max-h-none md:w-full";
  const kind = mediaKind(url);
  if (kind === "video") {
    return <video src={mediaSrc(url)} controls autoPlay loop playsInline className={fit} />;
  }
  if (kind === "audio") {
    return (
      <div className="flex w-full max-w-[520px] flex-col items-center gap-5 py-8">
        <Icon name="audio" size={34} className="text-t3" />
        <audio src={mediaSrc(url)} controls autoPlay className="w-full" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mediaSrc(url)} alt="" draggable={false} className={fit} />;
}

/**
 * One tile shape for all six actions: the icon over its name, so the grid
 * reads as a set of equal choices rather than one shout and five whispers.
 */
const TILE_SHAPE =
  "flex w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-card px-1.5 py-3 text-[12px] transition-colors duration-[120ms]";

function Action({
  icon,
  label,
  onClick,
  href,
  primary,
  danger,
  filled,
  innerRef,
  glyph,
  lit,
}: {
  icon: IconName;
  /** Drawn instead of the icon, for a button that shows its own progress. */
  glyph?: ReactNode;
  /** Lighter, the way a finished action reads (Download once saved). */
  lit?: boolean;
  label: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
  danger?: boolean;
  /** A heart already given reads as solid. */
  filled?: boolean;
  /** For a tile something else hangs off, like the overflow menu. */
  innerRef?: RefObject<HTMLButtonElement | null>;
}) {
  const shape = TILE_SHAPE;
  const className = primary
    ? `cta ${shape} font-medium`
    : lit
      ? `${shape} bg-t1/[0.14] text-t1`
      : `${shape} bg-t1/[0.07] ${danger ? "hover:bg-[#ff6b6b]/15" : "text-t2 hover:bg-t1/[0.12] hover:text-t1"}`;
  const tint = danger ? { color: "var(--danger)" } : undefined;
  const inner = (
    <>
      {glyph ?? <Icon name={icon} size={19} fill={filled ? "currentColor" : "none"} />}
      <span className="max-w-full truncate">{label}</span>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        download
        title={label}
        aria-label={label}
        style={tint}
        className={className}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      ref={innerRef}
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={tint}
      className={className}
    >
      {inner}
    </button>
  );
}

/** A titled card: the prompt, the details. Collapsible where it says so. */
function Section({
  title,
  right,
  children,
  collapsible,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="px-4 pb-1 pt-3.5">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((was) => !was)}
            aria-expanded={open}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-t3 transition-colors duration-[120ms] hover:text-t1"
          >
            {title}
            <Icon
              name="chevron"
              size={15}
              className="transition-transform duration-[200ms]"
              style={{ transform: open ? "rotate(180deg)" : "none" }}
            />
          </button>
        ) : (
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-t3">{title}</h3>
        )}
        {right}
      </div>
      {open && <div className="rounded-card bg-t1/[0.035] p-3">{children}</div>}
    </section>
  );
}

/**
 * The enlarged view: the media on the stage, and beside it everything the run
 * knows about itself with the things you can do to it. It is where a phone
 * gets its actions, since a tile there has no hover to reveal them.
 */
export function MediaViewer({
  url,
  run,
  upload,
  onClose,
  sequence,
  onShow,
  onBack,
  depth = 0,
}: {
  url: string | null;
  /** The run behind the media, when it came from one. */
  run?: Run;
  /** An uploaded file instead, which can only be looked at and removed. */
  upload?: { id: string; label: string };
  onClose: () => void;
  /** Everything the view can step through (the arrow keys and buttons), in order. */
  sequence?: string[];
  /** Show another of `sequence` in place of this one. */
  onShow?: (url: string) => void;
  /** Opened over another view (a run's input): back goes to that one. */
  onBack?: () => void;
  /** How many views this one is opened over. */
  depth?: number;
}) {
  const { mounted, exiting } = usePresence(!!url, 220);
  const [shown, setShown] = useState(url);
  const [copied, setCopied] = useState<"url" | "prompt" | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Choosing the project this belongs to.
  const [filing, setFiling] = useState(false);
  const projects = useStudio((s) => s.projects);
  const fileUnder = useStudio((s) => s.fileUnder);
  const uploads = useStudio((s) => s.uploads);
  const motionClips = useStudio((s) => s.motionClips);
  const [more, setMore] = useState(false);
  const moreTile = useRef<HTMLButtonElement>(null);
  const [full, setFull] = useState(false);
  // An input of this run, opened in a view over this one.
  const [inner, setInner] = useState<string | null>(null);
  const innerOpen = useRef(false);
  innerOpen.current = !!inner;
  const runs = useStudio((s) => s.runs);

  const removeRun = useStudio((s) => s.removeRun);
  const removeUpload = useStudio((s) => s.removeUpload);
  const favorites = useStudio((s) => s.favorites);
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const modelId = useStudio((s) => s.modelId);
  const saver = useSave();
  const extras = useContext(TileExtras);
  const phone = usePhone();
  const resetSaver = saver.reset;

  useEffect(() => {
    if (url) setShown(url);
  }, [url]);

  // A phone saves through its share sheet, which has to open from the tap
  // itself: a picture is fetched as soon as it is opened, so Download has it
  // in hand. Videos are fetched on the tap (they can be large), and ask for
  // one more tap if that took too long.
  useEffect(() => {
    resetSaver();
    if (url && mediaKind(url) === "image") prefetchMedia(url);
  }, [url, resetSaver]);

  // A fresh preview never opens mid-confirmation, or half-read.
  useEffect(() => {
    if (!url) return;
    setConfirming(false);
    setMore(false);
    setFull(false);
    setInner(null);
  }, [url]);

  // The neighbours in the order the view steps through.
  const at = sequence && shown ? sequence.indexOf(shown) : -1;
  const prev = at > 0 ? sequence![at - 1] : undefined;
  const next = at >= 0 && at < sequence!.length - 1 ? sequence![at + 1] : undefined;

  function step(by: -1 | 1) {
    const target = by < 0 ? prev : next;
    if (target && onShow) onShow(target);
  }

  // The view over this one has the keys while it is open.
  useEscape(
    () => {
      if (!innerOpen.current) (onBack ?? onClose)();
    },
    (by) => {
      if (!innerOpen.current && !confirming && !filing && !more) step(by);
    },
  );

  // The next one along is already loading when it is asked for.
  useEffect(() => {
    for (const near of [prev, next]) {
      if (near && mediaKind(near) === "image") new Image().src = mediaSrc(near);
    }
  }, [prev, next]);

  const refs = useMemo(() => (run ? inputMedia(run) : []), [run]);
  const uploadRow = upload ? uploads.find((u) => u.id === upload.id) : undefined;
  const details = useMemo(
    () => (run ? detailsOf(run) : shown ? fileDetails(shown, uploadRow) : []),
    [run, shown, uploadRow],
  );
  const model = run ? getModel(run.modelId) : undefined;
  const active = getModel(modelId);
  const isImage = shown ? mediaKind(shown) === "image" : false;
  const kept = !!shown && favorites.includes(shown);
  const openElementEditor = useStudio((s) => s.openElementEditor);

  // Which model a picture can be handed to, as a reference and as a first
  // frame. Both follow the bar when it takes pictures and otherwise the model
  // that category was last on, so browsing Assets with nothing chosen still
  // has somewhere to send it.
  const canReference = useMemo(() => (isImage ? referenceModel() : undefined), [isImage, active]);
  const videoModel = useMemo(() => (isImage ? firstFrameModel() : undefined), [isImage]);

  if (!mounted || !shown || typeof document === "undefined") return null;

  async function copy(text: string, what: "url" | "prompt") {
    await navigator.clipboard?.writeText(text);
    setCopied(what);
    window.setTimeout(() => setCopied(null), 1400);
  }

  function turnToVideo() {
    if (!shown) return;
    if (isStudioRun(run)) {
      studioTurnToVideo(shown);
      onClose();
      return;
    }
    if (!videoModel) return;
    // The model comes first: mode and values both belong to whichever model
    // is active, and the picture rides in as that model's reference.
    useStudio.getState().selectModel(videoModel.id);
    attachReference(videoModel, shown);
    onClose();
    readyToWrite();
  }

  function recreate() {
    if (!run) return;
    if (isStudioRun(run)) {
      studioRecreate(run);
      onClose();
      return;
    }
    // A remix goes back to Remix, with its clip and its pictures.
    if (run.remix) {
      restoreRemix(run);
      onClose();
      return;
    }
    recreateRun(run);
    onClose();
    readyToWrite();
  }

  function reference() {
    if (!shown) return;
    if (isStudioRun(run) || useStudio.getState().page === "studio") {
      studioReference(shown);
      onClose();
      return;
    }
    if (!sendReference(shown)) return;
    onClose();
    readyToWrite();
  }

  // After handing the bar a run or a picture, have it ready to write in: a
  // phone opens its composer; a desktop's bar is always open, so its prompt
  // simply takes the caret.
  function readyToWrite() {
    if (phone) {
      useStudio.getState().setComposer(true);
      return;
    }
    window.setTimeout(() => {
      const box = [...document.querySelectorAll<HTMLTextAreaElement>("textarea[data-prompt-input]")].find(
        (node) => node.getBoundingClientRect().width > 0,
      );
      if (!box) return;
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    }, 260);
  }

  // What other models can do with this run: Extend it, Upscale it, split
  // its stems. Grouped by the model that does it, the run's own first.
  const follow = run ? actionsFor(run) : [];
  const groups = follow.reduce<Array<{ model: ResultAction["model"]; items: ResultAction[] }>>((all, action) => {
    const group = all.find((g) => g.model.id === action.model.id);
    if (group) group.items.push(action);
    else all.push({ model: action.model, items: [action] });
    return all;
  }, []);
  groups.sort((a, b) => Number(b.model.id === run?.modelId) - Number(a.model.id === run?.modelId));

  function follow_(action: ResultAction) {
    if (!run) return;
    applyAction(action, run, shown ?? undefined);
    onClose();
    readyToWrite();
  }

  // In a project, Delete puts it in the project's Trash instead.
  function toTrash() {
    const urls = run ? run.urls : shown ? [shown] : [];
    useStudio.getState().setTrashed(urls, true);
    (onBack ?? onClose)();
  }

  function remove() {
    if (run) removeRun(run.id);
    else if (upload) removeUpload(upload.id);
    (onBack ?? onClose)();
  }

  // Everything this media can do, in reaching order. Six fit in the grid;
  // past that the tail steps behind More, so the rows stay square, and each
  // of those carries the line it reads as in that menu.
  type Entry = { key: string; tile: ReactNode; row?: { icon: IconName; label: string; onClick: () => void; danger?: boolean } };
  // What else uses this file, said before deleting it (its file then stays).
  const deleteNote = confirming
    ? keptNote(
        usedElsewhere(run ? run.urls : shown ? [shown] : [], {
          runs: run ? [run.id] : [],
          uploads: upload ? [upload.id] : [],
        }),
      )
    : undefined;
  const inMotionLibrary = !!shown && motionClips.some((clip) => clip.url === shown);
  const filedIn = run?.projectId ?? uploads.find((u) => u.id === upload?.id)?.projectId;
  const project = projects.find((p) => p.id === filedIn);
  const entries = ([
    (videoModel || (isImage && isStudioRun(run))) && { key: "video", tile: <Action key="video" icon="video" label="Turn to video" primary onClick={turnToVideo} /> },
    run && { key: "recreate", tile: <Action key="recreate" icon="refresh" label="Recreate" onClick={recreate} /> },
    (canReference || (isImage && isStudioRun(run))) && { key: "reference", tile: <Action key="reference" icon="layers" label="Reference" onClick={reference} /> },
    {
      key: "favorite",
      tile: (
        <LikeHeart
          key="favorite"
          liked={kept}
          title={kept ? "Remove from favorites" : "Add to favorites"}
          onToggle={() => shown && toggleFavorite(shown)}
          className={`${TILE_SHAPE} bg-t1/[0.07] text-t2 hover:bg-t1/[0.12] hover:text-t1`}
        >
          <span className="max-w-full truncate">{kept ? "Kept" : "Favorite"}</span>
        </LikeHeart>
      ),
    },
    {
      key: "download",
      tile: (
        <Action
          key="download"
          icon="download"
          label={saver.label}
          glyph={<SaveGlyph state={saver.state} size={19} />}
          lit={saver.state === "done" || saver.state === "retry"}
          onClick={() => shown && saver.state !== "busy" && void saver.save([shown])}
        />
      ),
    },
    (run || upload) && {
      key: "project",
      tile: <Action key="project" icon="folder" label={project ? project.name : "Project"} lit={!!project} onClick={() => setFiling(true)} />,
      row: { icon: "folder" as IconName, label: project ? `Project · ${project.name}` : "Add to project", onClick: () => setFiling(true) },
    },
    isImage && shown && {
      key: "element",
      tile: (
        <Action
          key="element"
          icon="user"
          label="Make element"
          onClick={() => {
            openElementEditor({ images: [shown] });
            onClose();
          }}
        />
      ),
      row: {
        icon: "user" as IconName,
        label: "Make element",
        onClick: () => {
          openElementEditor({ images: [shown] });
          onClose();
        },
      },
    },
    shown && mediaKind(shown) === "video" && {
      key: "motion",
      tile: (
        <Action
          key="motion"
          icon="move"
          label={inMotionLibrary ? "In motion library" : "Motion clip"}
          lit={inMotionLibrary}
          onClick={() => !inMotionLibrary && void saveMotionClip(shown)}
        />
      ),
      row: {
        icon: "move" as IconName,
        label: inMotionLibrary ? "In the Motion library" : "Save as motion clip",
        onClick: () => !inMotionLibrary && void saveMotionClip(shown),
      },
    },
    ...(extras?.folders && extras.onFolder && shown
      ? extras.folders.map((folder: { id: string; name: string }) => ({
          key: `folder-${folder.id}`,
          tile: <Action key={`folder-${folder.id}`} icon="folder" label={folder.name} onClick={() => extras.onFolder!(shown, folder.id)} />,
          row: { icon: "folder" as IconName, label: `Move to ${folder.name}`, onClick: () => extras.onFolder!(shown, folder.id) },
        }))
      : []),
    (run || upload) &&
      (extras?.trash
        ? {
            key: "delete",
            tile: <Action key="delete" icon="trash" label="Trash" danger onClick={toTrash} />,
            row: { icon: "trash" as IconName, label: "Move to Trash", onClick: toTrash, danger: true },
          }
        : {
            key: "delete",
            tile: <Action key="delete" icon="trash" label="Delete" danger onClick={() => setConfirming(true)} />,
            row: { icon: "trash" as IconName, label: "Delete", onClick: () => setConfirming(true), danger: true },
          }),
  ] as Array<Entry | false | "" | null | undefined>).filter((entry): entry is Entry => !!entry);
  const overflowed = entries.length > 6;
  const tiles = (overflowed ? entries.slice(0, 5) : entries).map((entry) => entry.tile);
  const tail = overflowed ? entries.slice(5) : [];

  const title = run?.modelName ?? upload?.label ?? (onBack ? "Input" : "Media");
  const subtitle = run
    ? `${model?.category ?? "run"} · ${run.urls.length > 1 ? `${run.urls.length} outputs` : "1 output"}`
    : upload
      ? "Uploaded"
      : "Given to the run";
  const innerSource = inner ? sourceOf(inner, runs, uploads) : {};

  return (
    <>
      {createPortal(
        // A phone scrolls the whole thing — picture, then what to do with it,
        // then what it is. A desktop keeps the picture still on a stage with the
        // panel beside it, which is what `md:` switches back on throughout.
        <div
          data-viewer="media"
          // The studio does not go black behind an enlarged picture: it stays
          // there, blurred out under a dark sheet, so the picture is clearly on
          // top of the page you were on rather than in a room of its own. A phone
          // keeps the solid ground, both because a backdrop filter is switched
          // off at that width for the frame rate and because there is nothing to
          // see behind a view that fills the screen.
          style={{ zIndex: 110 + depth * 4 }}
          className={`fixed inset-0 flex flex-col overflow-y-auto overscroll-contain bg-canvas-deep pt-[calc(56px+env(safe-area-inset-top))] md:flex-row md:overflow-hidden md:bg-canvas-deep/70 md:pt-0 md:backdrop-blur-xl ${
            exiting ? "anim-fade-out" : "anim-fade"
          }`}
        >
          <div className="relative flex shrink-0 items-center justify-center p-3 md:min-h-0 md:flex-1 md:p-8">
            <button
              type="button"
              className="absolute inset-0 hidden md:block"
              aria-label={onBack ? "Back" : "Close"}
              onClick={onBack ?? onClose}
            />
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="absolute left-5 top-5 z-20 hidden h-9 items-center gap-1 rounded-full bg-t1/[0.09] pl-2.5 pr-3.5 text-[13px] text-t1 ring-1 ring-inset ring-line backdrop-blur-md transition-colors duration-[120ms] hover:bg-t1/[0.16] md:flex"
              >
                <Icon name="chevron" size={16} style={{ transform: "rotate(90deg)" }} />
                Back
              </button>
            )}
            {/* The one before and after, on a phone as on a desktop; there the arrow keys do the same. */}
            {prev && onShow && (
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous"
                title="Previous (←)"
                className="absolute left-4 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-canvas-deep/60 text-t1 ring-1 ring-inset ring-line transition-[background-color,transform] duration-[120ms] active:scale-95 md:h-11 md:w-11 md:bg-t1/[0.08] md:backdrop-blur-md md:hover:bg-t1/[0.16]"
              >
                <Icon name="chevron" size={20} style={{ transform: "rotate(90deg)" }} />
              </button>
            )}
            {next && onShow && (
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next"
                title="Next (→)"
                className="absolute right-4 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-canvas-deep/60 text-t1 ring-1 ring-inset ring-line transition-[background-color,transform] duration-[120ms] active:scale-95 md:h-11 md:w-11 md:bg-t1/[0.08] md:backdrop-blur-md md:hover:bg-t1/[0.16]"
              >
                <Icon name="chevron" size={20} style={{ transform: "rotate(-90deg)" }} />
              </button>
            )}
            <div
              className={`relative z-10 flex w-full flex-col items-center justify-center gap-3 md:h-full ${
                exiting ? "" : "anim-zoom"
              }`}
            >
              <div className="relative z-10 flex w-full min-h-0 items-center justify-center md:flex-1">
                <Stage url={shown} />
              </div>
              {run && run.urls.length > 1 && (
                <div className="no-bar relative z-10 flex shrink-0 gap-1.5 overflow-x-auto pb-0.5">
                  {run.urls.map((one) => (
                    <button
                      key={one}
                      type="button"
                      onClick={() => setShown(one)}
                      className={`h-12 w-12 shrink-0 overflow-hidden rounded-chip ring-1 ring-inset transition-all duration-[120ms] ${
                        one === shown ? "ring-t1/70" : "ring-line hover:ring-line-strong"
                      }`}
                    >
                      {mediaKind(one) === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={one} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center bg-surface-2">
                          <Icon name={mediaKind(one) === "video" ? "video" : "audio"} size={15} className="text-t3" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* A phone scrolls the whole view, and the panel's header belongs to the
              desktop, so the way out sits in a bar of its own across the top of
              the screen: pinned there while the view scrolls through the actions
              and the details, and solid, so nothing of the picture runs under it.
              The view is padded by the bar's height rather than sliding beneath
              it. */}
          <header className="fixed inset-x-0 top-0 z-20 bg-canvas-deep pt-[env(safe-area-inset-top)] md:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex h-10 items-center gap-1 rounded-full bg-t1/[0.09] pl-2.5 pr-4 text-[14px] text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.16]"
                >
                  <Icon name="chevron" size={18} style={{ transform: "rotate(90deg)" }} />
                  Back
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-10 w-10 place-items-center rounded-full bg-t1/[0.09] text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.16]"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          </header>

          <aside className="flex w-full shrink-0 flex-col md:h-auto md:w-[348px] md:border-l md:border-line md:bg-canvas">
            <header className="hidden items-center gap-3 border-b border-line px-4 py-3 md:flex">
              {model ? (
                <VendorBadge model={model} size={32} />
              ) : (
                <span className="grid h-[32px] w-[32px] place-items-center rounded-chip bg-t1/[0.07]">
                  <Icon name="upload" size={16} className="text-t3" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-t1">{title}</p>
                <p className="truncate text-[12px] capitalize text-t3">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.07] hover:text-t1"
              >
                <Icon name="close" size={18} />
              </button>
            </header>

            {/* Actions lead on a phone, where they are what the tap was for, and
                sit under the panel on a desktop, where the hover already had them. */}
            <div className="order-first flex shrink-0 flex-col gap-2 p-4 md:order-last md:mt-auto md:border-t md:border-line">
              {/* Six tiles the same size, in the order you reach for them. What
                  does not fit goes behind More — and when everything fits, as it
                  does for an upload, More is not there at all. */}
              <div className="grid grid-cols-3 gap-2">
                {tiles}
                {overflowed && (
                  <Action
                    innerRef={moreTile}
                    icon="more"
                    label="More"
                    onClick={() => {
                      setMore((was) => !was);
                      setConfirming(false);
                    }}
                  />
                )}
              </div>

              {overflowed && (
                <MoreMenu open={more} anchor={moreTile} onClose={() => setMore(false)}>
                  {tail.map(
                    (entry) =>
                      entry.row && (
                        <button
                          key={entry.key}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMore(false);
                            entry.row!.onClick();
                          }}
                          style={entry.row.danger ? { color: "var(--danger)" } : undefined}
                          className={`flex items-center gap-2.5 rounded-chip px-3 py-2 text-left text-[13.5px] transition-colors duration-[120ms] ${
                            entry.row.danger ? "hover:bg-[#ff6b6b]/10" : "text-t2 hover:bg-t1/[0.07] hover:text-t1"
                          }`}
                        >
                          <Icon name={entry.row.icon} size={15} className="shrink-0" />
                          <span className="truncate">{entry.row.label}</span>
                        </button>
                      ),
                  )}
                </MoreMenu>
              )}

              {groups.length > 0 && (
                <section aria-label="Continue with" className="flex flex-col gap-2 pt-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-t4">Continue with</p>
                  {groups.map((group) => (
                    <div key={group.model.id} className="flex flex-col gap-1.5">
                      {groups.length > 1 && (
                        <p className="flex items-center gap-1.5 text-[12px] text-t3">
                          <VendorBadge model={group.model} size={14} bare />
                          {group.model.name}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((action) => (
                          <button
                            key={`${action.model.id}:${action.mode.id}`}
                            type="button"
                            onClick={() => follow_(action)}
                            title={action.mode.hint}
                            className="rounded-full bg-t1/[0.07] px-3 py-1.5 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
                          >
                            {action.mode.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Asked before it happens, in a window of its own: a gallery is
                  the only copy of what it holds, and a tap is easy to make by
                  accident. */}
              <ProjectPicker
                open={filing}
                current={(run?.projectId ?? uploads.find((u) => u.id === upload?.id)?.projectId) ?? null}
                count={1}
                onPick={(projectId) => {
                  setFiling(false);
                  if (shown) fileUnder([shown], projectId);
                }}
                onClose={() => setFiling(false)}
              />
              <ConfirmPopup
                open={confirming}
                title="Delete this?"
                message={deleteNote ?? "It is removed from your studio for good."}
                confirmLabel="Delete"
                onConfirm={remove}
                onClose={() => setConfirming(false)}
              />
            </div>

            <div className="pb-4 md:min-h-0 md:flex-1 md:overflow-y-auto md:pb-0">
              {run && (run.prompt || refs.length > 0) && (
                <Section
                  title="Prompt"
                  right={
                    run.prompt ? (
                      <button
                        type="button"
                        onClick={() => copy(run.prompt, "prompt")}
                        className="flex items-center gap-1.5 rounded-full bg-t1/[0.07] px-3 py-1 text-[12px] text-t2 transition-colors duration-[120ms] hover:text-t1"
                      >
                        <Icon name={copied === "prompt" ? "check" : "copy"} size={14} />
                        Copy
                      </button>
                    ) : undefined
                  }
                >
                  {refs.length > 0 && (
                    <div className="no-bar mb-2.5 flex gap-1.5 overflow-x-auto">
                      {refs.map((ref) => (
                        <RefThumb key={ref} url={ref} onOpen={() => setInner(ref)} />
                      ))}
                    </div>
                  )}
                  {run.prompt ? (
                    <>
                      <p className={`text-[13.5px] leading-relaxed text-t1/85 ${full ? "" : "line-clamp-5"}`}>
                        {run.prompt}
                      </p>
                      {run.prompt.length > 220 && (
                        <button
                          type="button"
                          onClick={() => setFull((was) => !was)}
                          className="mt-1.5 flex items-center gap-1 text-[13px] text-t3 transition-colors duration-[120ms] hover:text-t1"
                        >
                          {full ? "Show less" : "See all"}
                          <Icon
                            name="chevron"
                            size={14}
                            className="transition-transform duration-[200ms]"
                            style={{ transform: full ? "rotate(180deg)" : "none" }}
                          />
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-[13.5px] leading-relaxed text-t4">
                      No prompt. This run worked from its inputs.
                    </p>
                  )}
                </Section>
              )}

              {details.length > 0 && (
                <Section title="Details" collapsible>
                  <dl className="flex flex-col gap-1.5">
                    {details.map((row) => (
                      <div key={row.label} className="flex items-baseline justify-between gap-3">
                        <dt className="shrink-0 text-[12.5px] text-t3">{row.label}</dt>
                        <dd className="truncate text-right text-[12.5px] capitalize text-t1/85">{row.value}</dd>
                      </div>
                    ))}
                    {/* Which project it is filed under, and the way to change it. */}
                    {(run || upload) && (
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="shrink-0 text-[12.5px] text-t3">Project</dt>
                        <dd className="min-w-0 text-right">
                          <button
                            type="button"
                            onClick={() => setFiling(true)}
                            className="max-w-full truncate text-[12.5px] text-t1/85 underline decoration-line-strong underline-offset-[3px] hover:text-t1"
                          >
                            {project ? project.name : "None · add"}
                          </button>
                        </dd>
                      </div>
                    )}
                  </dl>
                </Section>
              )}
            </div>
          </aside>
        </div>,
        document.body,
      )}
      {/* A run's input, opened over this view: Back returns here, and
          anything sent from it closes both. */}
      <MediaViewer
        url={inner}
        run={innerSource.run}
        upload={innerSource.upload ? { id: innerSource.upload.id, label: innerSource.upload.name ?? "Upload" } : undefined}
        sequence={refs}
        onShow={setInner}
        onBack={() => setInner(null)}
        onClose={() => {
          setInner(null);
          onClose();
        }}
        depth={depth + 1}
      />
    </>
  );
}

/**
 * One of a run's inputs, opened on its own (from the list view's thumbs):
 * the run that made it or the upload it was, with the usual actions, and
 * the arrows stepping through the run's other inputs.
 */
export function InputViewer({
  url,
  inputs,
  onShow,
  onClose,
}: {
  url: string | null;
  inputs: string[];
  onShow: (url: string) => void;
  onClose: () => void;
}) {
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  const source = url ? sourceOf(url, runs, uploads) : {};
  return (
    <MediaViewer
      url={url}
      run={source.run}
      upload={source.upload ? { id: source.upload.id, label: source.upload.name ?? "Upload" } : undefined}
      sequence={inputs}
      onShow={onShow}
      onClose={onClose}
    />
  );
}

/**
 * A plain zoom, for places that already have their own actions around the
 * media — the picker's thumbnails. No panel, no frame: just the file, big.
 */
export function MediaPreview({
  url,
  onClose,
  z = 130,
}: {
  url: string | null;
  onClose: () => void;
  z?: number;
}) {
  const { mounted, exiting } = usePresence(!!url, 220);
  const [shown, setShown] = useState(url);

  useEffect(() => {
    if (url) setShown(url);
  }, [url]);

  useEscape(onClose);

  if (!mounted || !shown || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center bg-canvas-deep/95 p-4 backdrop-blur-xl md:p-10 ${
        exiting ? "anim-fade-out" : "anim-fade"
      }`}
      style={{ zIndex: z }}
    >
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className={`relative flex h-full w-full items-center justify-center ${exiting ? "" : "anim-zoom"}`}>
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <Stage url={shown} />
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors duration-[120ms] hover:bg-white/20"
        aria-label="Close"
      >
        <Icon name="close" size={17} />
      </button>
    </div>,
    document.body,
  );
}
