"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GlideMark } from "@/components/GlideMark";
import { Icon, type IconName } from "@/components/Icon";
import { CardArt, type CardArtKind } from "@/components/CardArt";
import { AppIcon } from "@/components/AppIcon";
import { VideoMark } from "@/components/VideoMark";
import { Popover } from "@/components/Popover";
import { BatchChip, FieldChip, Reveal, hasOwnCount } from "@/components/PromptBar";
import { VendorBadge } from "@/components/VendorMark";
import { CameraDialog, FilmDialog, GridDialog, StudioDialog } from "@/components/studio/Dialogs";
import { FrameGrab } from "@/components/studio/FrameGrab";
import type { Kind } from "@/components/studio/ReferencePicker";
import { MediaPicker } from "@/components/MediaPicker";
import { PreviewMedia } from "@/components/studio/Settings";
import { SettingsSheet } from "@/components/studio/SettingsSheet";
import { StudioPrompt } from "@/components/studio/StudioPrompt";
import { Wheel } from "@/components/studio/Wheel";
import { PROVIDER_NAME, submitModelRun } from "@/lib/generate";
import { ThumbTools } from "@/components/ThumbTools";
import { limitsFor } from "@/lib/attach";
import { ThumbRow } from "@/components/Attachments";
import { followRefs } from "@/lib/refTags";
import { moveItem } from "@/lib/useReorder";
import { SoulStyleTile } from "@/components/studio/SoulStylePicker";
import { inUse, soulVersionOf, soulsFor, type LibraryElement } from "@/lib/elements";
import { mapParams } from "@/lib/recipes/paramMap";
import { imageRefs } from "@/lib/mentions";
import { activeFields, defaultValues, getModel, modesFor, providerOf, validateValues, type Field, type ModelDef, type Values } from "@/lib/registry";
import { estimateCredits, formatCredits } from "@/lib/registry/pricing";
import { thumbSrc, videoFrame } from "@/lib/storage/client";
import { CINEMA, bottomFields, cardFields, cinemaModel, cinemaSpec, labelOf, listOf, referenceFields } from "@/lib/studio/cinema";
import {
  MOVE_KEY,
  compileCinemaPrompt,
  movesIn,
  otherModelValues,
  putMove,
  studioImageModels,
  studioVideoModels,
  withoutMoves,
} from "@/lib/studio/compose";
import { previewOf, type OptionPreview } from "@/lib/studio/options";
import { mediaKind } from "@/lib/upload";
import { useEstimate } from "@/lib/useEstimate";
import { EMPTY_STUDIO, keyFor, useStudio, type StudioUi } from "@/store/studio";

/** Cinema Studio's composer state, with anything added since it was saved filled in. */
export function useStudioUi(): StudioUi {
  const studio = useStudio((s) => s.studio);
  return useMemo(() => ({ ...EMPTY_STUDIO, ...studio }), [studio]);
}

/** "12 cr" for one, made "48 cr" for four. */
export function times(hint: string | null, count: number): string | null {
  if (!hint || count <= 1) return hint;
  const match = /([\d,]+(?:\.\d+)?)/.exec(hint);
  if (!match) return hint;
  const total = Number(match[1].replace(/,/g, "")) * count;
  const shown = total >= 10 ? Math.round(total) : Math.round(total * 10) / 10;
  return hint.replace(match[1], shown.toLocaleString("en-US"));
}

/** What one send costs: Higgsfield's estimate, or KIE's price list. */
export function usePrice(model: ModelDef | undefined, values: Values, blocker: string | null): string | null {
  const higgsfield = providerOf(model) === "higgsfield";
  const quoted = useEstimate(higgsfield ? model : undefined, values, blocker);
  if (!model) return null;
  if (higgsfield) return quoted ?? model.creditHint?.(values) ?? null;
  const credits = estimateCredits(model, values);
  return model.creditHint?.(values) ?? (credits !== undefined ? formatCredits(credits) : null);
}

/** "Epic +2": the first choice made on a card, and how many more. */
function cardValue(fields: Field[], values: Values): { text: string; set: boolean; thumb?: OptionPreview } {
  const chosen = fields.filter((f) => values[f.key] !== undefined && values[f.key] !== null && values[f.key] !== "");
  if (chosen.length === 0) return { text: "Auto", set: false };
  const first = chosen[0];
  const thumb = chosen.map((f) => previewOf(f.key, values[f.key])).find(Boolean);
  return { text: `${labelOf(first, values[first.key])}${chosen.length > 1 ? ` +${chosen.length - 1}` : ""}`, set: true, thumb };
}

/** One of the five cards along the top of the video composer. */
/** Each card's own little object while nothing is chosen on it. */
const ART: Partial<Record<IconName, CardArtKind>> = { film: "film", camera: "camera", palette: "palette", sun: "light", sliders: "more" };

function Card({
  icon,
  label,
  value,
  set,
  thumb,
  note,
  onClick,
  box,
}: {
  icon: IconName;
  label: string;
  value: string;
  set?: boolean;
  thumb?: OptionPreview;
  /** "In prompt": the model picked has no parameter for this, so it is written into the prompt. */
  note?: string;
  onClick: () => void;
  /** Drawn in place of the picture (References' "+" box). */
  box?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}`}
      className="flex h-[52px] min-w-0 items-center gap-2 rounded-card bg-t1/[0.05] py-2 pl-2 pr-3 text-left transition-colors duration-[120ms] hover:bg-t1/[0.09] active:bg-t1/[0.11]"
    >
      {box ??
        (thumb ? (
          <PreviewMedia preview={thumb} className="h-9 w-9 shrink-0 rounded-card" />
        ) : ART[icon] ? (
          <CardArt kind={ART[icon]!} />
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-t1/[0.06] text-t2">
            <Icon name={icon} size={17} />
          </span>
        ))}
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.06em] text-t4">
          {label}
          {note ? ` · ${note}` : ""}
        </span>
        <span className={`truncate text-[13.5px] font-medium ${set ? "text-t1" : "text-t2"}`}>{value}</span>
      </span>
    </button>
  );
}

/**
 * The tool row's chips on a desktop: one line that slides sideways when it
 * runs long, with a small round arrow at the end (as Higgsfield's) to bring
 * the rest in. A phone wraps them instead.
 */
export function ChipRow({ children }: { children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });
  useEffect(() => {
    const node = row.current;
    if (!node) return;
    const update = () => {
      const slack = node.scrollWidth - node.clientWidth;
      const next = { left: node.scrollLeft > 2, right: slack > 2 && node.scrollLeft < slack - 2 };
      setMore((prev) => (prev.left === next.left && prev.right === next.right ? prev : next));
    };
    update();
    node.addEventListener("scroll", update, { passive: true });
    const watch = new ResizeObserver(update);
    watch.observe(node);
    for (const child of Array.from(node.children)) watch.observe(child);
    return () => {
      node.removeEventListener("scroll", update);
      watch.disconnect();
    };
  });
  const slide = (by: number) => row.current?.scrollBy({ left: by, behavior: "smooth" });
  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      <div
        ref={row}
        className="no-bar flex flex-1 flex-wrap items-center gap-1.5 md:min-w-0 md:flex-nowrap md:overflow-x-auto"
      >
        {children}
      </div>
      {/* As Higgsfield's: the arrow sits on a shade of the box's own colour, so the chips run under it and out of sight. */}
      {more.left && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pr-8 max-md:hidden" style={{ background: "linear-gradient(to left, transparent, var(--chip-well) 55%)" }}>
          <button
            type="button"
            aria-label="Scroll chips back"
            onClick={() => slide(-240)}
            className="pointer-events-auto grid h-8 w-8 place-items-center rounded-card bg-[#34363a] text-t1 transition-colors duration-[120ms] hover:bg-[#3e4045]"
          >
            <Icon name="chevron" size={15} className="rotate-90" />
          </button>
        </span>
      )}
      {more.right && (
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pl-8 max-md:hidden" style={{ background: "linear-gradient(to right, transparent, var(--chip-well) 55%)" }}>
          <button
            type="button"
            aria-label="Scroll chips on"
            onClick={() => slide(240)}
            className="pointer-events-auto grid h-8 w-8 place-items-center rounded-card bg-[#34363a] text-t1 transition-colors duration-[120ms] hover:bg-[#3e4045]"
          >
            <Icon name="chevron" size={15} className="-rotate-90" />
          </button>
        </span>
      )}
    </div>
  );
}

/** A small chip on the prompt's tool row. */
function ToolChip({ icon, label, onClick, text }: { icon: IconName; label: string; onClick: () => void; text?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-t1/[0.07] px-2.5 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1 md:h-[34px]"
    >
      <Icon name={icon} size={15} />
      {text}
    </button>
  );
}

/** Cinema Studio's own picture model, first in the image composer's menu. */
const SOUL_CINEMA = "hf-soul-cinema";
// No image model takes a camera or lens of its own, Soul Cinema included: both are written into the prompt.
const SOUL_LEAD = { label: "Soul Cinema · camera and lens go into the prompt", is: (id: string) => id === SOUL_CINEMA, note: "camera and lens go into the prompt" };

/** The model the composer sends to, picked from those that fit the mode. */
export function ModelChip({
  models,
  model,
  onPick,
  lead,
}: {
  models: ModelDef[];
  model: ModelDef | undefined;
  onPick: (id: string) => void;
  /** The studio's own models, listed first under their heading; the rest follow as "Other models". Cinema Studio's by default. */
  lead?: { label: string; is: (id: string) => boolean; note?: string };
}) {
  const [q, setQ] = useState("");
  const shown = models.filter((m) => !q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase()));
  const isLead = (id: string) => (lead ? lead.is(id) : id === CINEMA);
  const cinema = shown.filter((m) => isLead(m.id));
  const rest = shown.filter((m) => !isLead(m.id));
  const row = (m: ModelDef, close: () => void) => (
    <button
      key={m.id}
      type="button"
      role="option"
      aria-selected={m.id === model?.id}
      onClick={() => {
        onPick(m.id);
        close();
      }}
      className={`flex w-full items-center gap-2.5 rounded-card px-2 py-2 text-left transition-colors duration-[120ms] ${
        m.id === model?.id ? "bg-t1/[0.08]" : "hover:bg-t1/[0.05]"
      }`}
    >
      <VendorBadge model={m} size={30} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold text-t1">{m.name}</span>
        <span className="block truncate text-[11.5px] text-t3">{PROVIDER_NAME[providerOf(m)]}{m.tagline ? ` · ${m.tagline}` : ""}</span>
      </span>
      {m.id === model?.id && <Icon name="check" size={15} className="shrink-0 text-t1" />}
    </button>
  );
  return (
    <Popover
      width={360}
      title="Model"
      trigger={(open) => (
        <span
          className={`flex h-8 max-w-[220px] items-center gap-1.5 rounded-full pl-1 pr-2.5 text-[12.5px] font-semibold transition-colors duration-[120ms] md:h-[34px] ${
            open ? "bg-t1/[0.12] text-t1" : "bg-t1/[0.07] text-t1 hover:bg-t1/[0.12]"
          }`}
        >
          {model && <VendorBadge model={model} size={24} />}
          <span className="truncate">{model?.name ?? "Pick a model"}</span>
          <Icon name="chevron" size={14} className="-rotate-90 opacity-70" />
        </span>
      )}
    >
      {(close) => (
        <div className="flex max-h-[var(--pop-max,420px)] flex-col">
          <label className="mb-1.5 flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-t1/[0.06] px-3 text-t3">
            <Icon name="search" size={14} />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search models"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-t1 outline-none placeholder:text-t4 md:text-[13px]"
            />
          </label>
          <div role="listbox" className="no-bar min-h-0 overflow-y-auto">
            {cinema.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-[11.5px] font-medium text-t3">
                  <Icon name="spark" size={12} />
                  {lead?.label ?? "Cinematic"}
                </p>
                {cinema.map((m) => row(m, close))}
              </>
            )}
            {rest.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 px-2 pb-1 pt-2.5 text-[11.5px] font-medium text-t3">
                  <Icon name="spark" size={12} />
                  {lead ? (models.some((m) => isLead(m.id)) ? `Other models${lead.note ? ` · ${lead.note}` : ""}` : "Models") : cinema.length > 0 || models.some((m) => m.id === CINEMA) ? "Other models · settings go into the prompt" : "Models"}
                </p>
                {rest.map((m) => row(m, close))}
              </>
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}

/** Image | Video, beside the composer on a desktop and over it on a phone. */
export function ModeSwitch({ mode, onMode }: { mode: "video" | "image"; onMode: (mode: "video" | "image") => void }) {
  const item = (id: "image" | "video", icon: IconName, label: string) => (
    <button
      type="button"
      data-pill={id}
      onClick={() => onMode(id)}
      aria-pressed={mode === id}
      className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-chip text-[12px] font-semibold transition-colors duration-[var(--d-slow)] ease-[var(--ease)] md:h-[52px] md:w-16 md:flex-none md:flex-col md:gap-1 md:text-[10.5px] max-md:h-9 ${
        mode === id ? "text-t1" : "text-t3 hover:text-t1"
      }`}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
  return (
    <div className="relative flex shrink-0 gap-1 md:flex-col">
      <GlideMark value={mode} className="rounded-chip bg-t1/[0.12]" />
      {item("image", "image", "Image")}
      {item("video", "video", "Video")}
    </div>
  );
}

/** The large Generate at the composer's end, with what it costs. */
export function GenerateButton({
  onClick,
  busy,
  disabled,
  blocker,
  price,
  count,
  needsKey,
  wide = false,
}: {
  onClick: () => void;
  busy: boolean;
  disabled: boolean;
  blocker: string | null;
  price: string | null;
  count: number;
  needsKey: string | null;
  /** The phone's: the composer's whole width at its foot, with the price on it. */
  wide?: boolean;
}) {
  // Higgsfield's: a tall accent tile at the composer's end, the word over what it costs.
  const what = needsKey ? `Add your ${needsKey} key` : `Generate${count > 1 ? ` ×${count}` : ""}${price ? ` · ${price}` : ""} (⌘↵)`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={needsKey ? `Add your ${needsKey} key` : "Generate"}
      title={blocker ?? what}
      className={`cta cta-lift flex shrink-0 items-center justify-center rounded-card font-display font-bold uppercase tracking-[0.02em] disabled:cursor-not-allowed ${
        wide ? "h-12 w-full gap-1.5 text-[13.5px]" : "h-[80px] w-[120px] flex-col gap-1 text-[12px]"
      }`}
    >
      {busy ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
      ) : needsKey ? (
        <Icon name="key" size={15} />
      ) : wide ? (
        <Icon name="arrow-up" size={15} strokeWidth={2.2} />
      ) : null}
      <span className="font-bold">{needsKey ? "Add key" : "Generate"}</span>
      {!wide && !needsKey && price && (
        <span className="font-mono text-[11px] font-medium normal-case tracking-normal opacity-70">
          {price}
          {count > 1 ? ` ×${count}` : ""}
        </span>
      )}
      {wide && !needsKey && price && (
        <span className="font-mono text-[12px] font-normal normal-case tracking-normal opacity-70">
          {price}
          {count > 1 ? ` ×${count}` : ""}
        </span>
      )}
    </button>
  );
}

/** What the send costs, at the end of the settings row, as the bars show it. */
export function PriceHint({ price, count }: { price: string | null; count: number }) {
  if (!price) return null;
  return (
    <span className="ml-auto shrink-0 pl-2 font-mono text-[11.5px] tabular-nums text-t3 max-md:hidden">
      {price}
      {count > 1 ? ` · ×${count}` : ""}
    </span>
  );
}

type OpenDialog = "film" | "camera" | "movement" | "palette" | "light" | "more" | null;

/**
 * Cinema Studio's composer. Video mode: the five setting cards along the
 * top, the prompt (with `@` elements and `#` camera moves as chips) and its
 * tool row under them, and Generate at the end. Image mode: a prompt, a
 * character and a camera beside it. On a desktop it lies across the page;
 * on a phone it stacks.
 */
export function StudioComposer({ onKeyClick, docked }: { onKeyClick: () => void; docked?: boolean }) {
  const studio = useStudioUi();
  const patchStudio = useStudio((s) => s.patchStudio);
  const mode = studio.mode;
  return (
    <div className={`flex flex-col gap-2 md:flex-row md:items-end ${docked ? "" : ""}`}>
      <ModeSwitch mode={mode} onMode={(next) => patchStudio({ mode: next })} />
      <div key={mode} className="anim-fade min-w-0 flex-1">
        {mode === "video" ? <VideoComposer onKeyClick={onKeyClick} /> : <ImageComposer onKeyClick={onKeyClick} />}
      </div>
    </div>
  );
}

/** After a send from Home, the generations page, where the new piece shows up. */
function showMade() {
  const store = useStudio.getState();
  if ((store.studio?.view ?? "home") === "home") store.patchStudio({ view: "generations" });
}

function useNotice(): [string | null, (text: string) => void] {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [notice]);
  return [notice, setNotice];
}

function VideoComposer({ onKeyClick }: { onKeyClick: () => void }) {
  const cinema = cinemaModel();
  const studio = useStudioUi();
  const patchStudio = useStudio((s) => s.patchStudio);
  const elements = useStudio((s) => s.elements);
  const stored = useStudio((s) => s.valuesByModel[CINEMA]);
  const valuesByModel = useStudio((s) => s.valuesByModel);
  const setModelValues = useStudio((s) => s.setModelValues);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);
  const studioCount = useStudio((s) => s.studioCount);
  const setCount = useStudio((s) => s.setStudioCount);
  const defaults = useMemo(() => (cinema ? defaultValues(cinema) : {}), [cinema]);
  const values: Values = stored ?? defaults;
  const provider_ = useStudio((s) => s.provider);
  const models = useMemo(() => studioVideoModels(provider_), [provider_]);
  const model = models.find((m) => m.id === studio.videoModelId) ?? cinema;
  const isCinema = model?.id === CINEMA;
  const own: Values = model && !isCinema ? (valuesByModel[model.id] ?? defaultValues(model)) : values;
  // A model with its own count (how many per run) keeps it; ours then sends one run.
  const selfCount = !!model && hasOwnCount(activeFields(model, own));
  const count = selfCount ? 1 : studioCount;

  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [refsOpen, setRefsOpen] = useState<null | "uploads" | "elements">(null);
  const [grabbing, setGrabbing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useNotice();
  const [input, setInput] = useState<HTMLTextAreaElement | null>(null);

  const set = (key: string, value: unknown) => setModelValues(CINEMA, { [key]: value });
  const setOwn = (key: string, value: unknown) => model && setModelValues(model.id, { [key]: value });

  const cards = cinema ? cardFields(cinema, values) : null;
  const moveField = cards?.camera.find((f) => f.key === MOVE_KEY);
  const refs = cinema ? referenceFields(cinema, values) : [];
  const fieldOf = (kind: Kind) => refs.find((f) => (f.accept ?? "image") === kind);
  const prompt = typeof values.prompt === "string" ? values.prompt : "";
  const total = refs.reduce((n, f) => n + listOf(values[f.key]).length, 0);
  const room = refs.reduce((n, f) => n + (f.maxItems ?? 0), 0);
  const thumbs = refs.flatMap((f) => listOf(values[f.key])).slice(0, 1);

  // The move lives in the prompt as a chip; one set before chips existed gets its chip.
  useEffect(() => {
    const move = values[MOVE_KEY];
    if (moveField && typeof move === "string" && move && movesIn(prompt, moveField).length === 0) {
      set("prompt", putMove(prompt, move, moveField).text.trimEnd());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveField]);

  useEffect(() => setError(null), [values, model?.id]);

  function setPrompt(text: string) {
    const move = movesIn(text, moveField)[0]?.value ?? "";
    setModelValues(CINEMA, { prompt: text, [MOVE_KEY]: move });
  }

  function putMoveOnPrompt(value: string) {
    if (!value) {
      setPrompt(withoutMoves(prompt, moveField));
      return;
    }
    const next = putMove(prompt, value, moveField, input?.selectionStart ?? undefined);
    setPrompt(next.text);
    if (next.replaced) setNotice("This model takes one camera move per shot, so the new one took the old one's place.");
  }

  /** Elements' pictures into the references; `call` also writes `@name` into the prompt (the prompt's own `@` menu already has). */
  function addElements(elements: LibraryElement[], call = true) {
    const images = fieldOf("image");
    if (call) {
      let text = prompt;
      for (const element of elements) {
        if (!new RegExp(`(^|\\s)@${element.name}(\\s|$)`).test(text)) text = `${text.trimEnd()}${text.trim() ? " " : ""}@${element.name} `;
      }
      setPrompt(text);
    }
    if (images) {
      const now = listOf(values[images.key]);
      const pictures = elements.flatMap((e) => e.images.map((r) => r.storageUrl)).filter((u) => !now.includes(u));
      set(images.key, [...now, ...pictures].slice(0, images.maxItems ?? 30));
    }
  }

  // What goes out: Cinema Studio takes its controls as they are; another
  // model gets them written into its prompt, with the references placed.
  const sent = useMemo(() => {
    if (!model) return null;
    const text = withoutMoves(prompt, moveField);
    if (isCinema) return { values: { ...values, prompt: text }, warnings: [] as string[] };
    const all = cinema ? [...cardFields(cinema, values).camera, ...cardFields(cinema, values).film, ...cardFields(cinema, values).light, ...cardFields(cinema, values).palette, ...cardFields(cinema, values).more] : [];
    const compiled = compileCinemaPrompt(all, values);
    return otherModelValues(
      model,
      own,
      [text, compiled].filter(Boolean).join(" "),
      listOf(values[fieldOf("image")?.key ?? ""]),
      listOf(values[fieldOf("video")?.key ?? ""])[0],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, isCinema, values, own, prompt, moveField, cinema]);

  const provider = providerOf(model);
  const key = keyFor({ apiKey, hfKey }, provider);
  const blocker = !model
    ? "Pick a model."
    : !withoutMoves(prompt, moveField).trim()
      ? "Describe the shot to continue."
      : sent
        ? validateValues(model, sent.values)
        : null;
  const price = times(usePrice(model, sent?.values ?? {}, blocker), count);

  async function generate() {
    if (!model || !sent) return;
    if (!key) return onKeyClick();
    if (busy || blocker) return;
    setBusy(true);
    setError(null);
    for (let i = 0; i < count; i += 1) {
      const result = await submitModelRun(model, sent.values, { studio: "video" }, { schema: isCinema });
      if (!result.ok) {
        setError(result.error ?? "Could not send this.");
        setBusy(false);
        return;
      }
      // On its way: Home hands over to the generations, where it is being made.
      if (i === 0) showMade();
    }
    setBusy(false);
  }

  const note = isCinema ? undefined : "in prompt";
  const film = cards ? cardValue(cards.film, values) : null;
  const camera = cards ? cardValue(cards.camera.filter((f) => f.key !== MOVE_KEY), values) : null;
  const palette = cards ? cardValue(cards.palette, values) : null;
  const light = cards ? cardValue(cards.light, values) : null;
  const more = cards ? cardValue(cards.more, values) : null;
  const chips = isCinema
    ? (cinema ? bottomFields(cinema, values) : [])
    : model
      ? activeFields(model, own).filter((f) => f.placement === "bar")
      : [];

  return (
    <div className="flex flex-col gap-1.5 rounded-panel border border-line bg-elevated p-1.5">
      {cards && (
        <div className={`grid gap-1.5 max-md:grid-cols-2 max-md:[&>*:last-child:nth-child(odd)]:col-span-2 ${cards.more.length > 0 ? "md:grid-cols-6" : "md:grid-cols-5"}`}>
          <Card
            icon="layers"
            label="References"
            value={`${total}/${room}`}
            set={total > 0}
            onClick={() => setRefsOpen("uploads")}
            box={
              thumbs.length > 0 ? (
                <span className="flex h-9 w-9 shrink-0">
                  {thumbs.map((url) => (
                    <span key={url} className="h-9 w-9 shrink-0 overflow-hidden rounded-card bg-surface">
                      {mediaKind(url) === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbSrc(url, 256)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-t3">
                          <Icon name={mediaKind(url) === "video" ? "video" : "audio"} size={14} />
                        </span>
                      )}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-t1/[0.06] text-t2">
                  <Icon name="plus" size={17} />
                </span>
              )
            }
          />
          {cards.film.length > 0 && film && <Card icon="film" label="Film setup" value={film.text} set={film.set} thumb={film.thumb} note={note} onClick={() => setDialog("film")} />}
          {cards.camera.length > 0 && camera && <Card icon="camera" label="Camera" value={camera.text} set={camera.set} thumb={camera.thumb} note={note} onClick={() => setDialog("camera")} />}
          {cards.palette.length > 0 && palette && <Card icon="palette" label="Palette" value={palette.text} set={palette.set} thumb={palette.thumb} note={note} onClick={() => setDialog("palette")} />}
          {cards.light.length > 0 && light && <Card icon="sun" label="Lighting" value={light.text} set={light.set} thumb={light.thumb} note={note} onClick={() => setDialog("light")} />}
          {cards.more.length > 0 && more && <Card icon="sliders" label="More" value={more.text} set={more.set} note={note} onClick={() => setDialog("more")} />}
        </div>
      )}
      {/* On a desktop Generate sits inside the prompt's well, as Higgsfield's does. */}
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2 md:rounded-card md:bg-t1/[0.05] md:pr-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-card bg-t1/[0.05] p-3 max-md:gap-6 md:bg-transparent">
          {/* The references sit over the prompt and grow in as they come. */}
          <div className="-mb-2.5 max-md:-mb-6">
            <Reveal>
              <ReferenceStrip refs={refs} values={values} onSet={set} onPicturesChanged={(before, after) => setPrompt(followRefs(prompt, before, after, elements))} />
            </Reveal>
          </div>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <StudioPrompt
                text={prompt}
                placeholder="Describe your scene. Use @ for characters and places, # for a camera move"
                onText={setPrompt}
                onElement={(element) => addElements([element], false)}
                onMoveReplaced={() => setNotice("This model takes one camera move per shot, so the new one took the old one's place.")}
                onSubmit={() => void generate()}
                move={moveField}
                inputRef={setInput}
                refs={listOf(values[fieldOf("image")?.key ?? ""])}
              />
            </div>
          </div>
          {/* On a phone the chips wrap rather than run off the edge, so every one is in sight.
              On a desktop Generate ends the row, level with them, as the other bars have it,
              and a row too long slides on under it rather than pushing it down. */}
          <div className="flex items-center gap-1.5">
            <ChipRow>
            <ToolChip icon="plus" label="Add references" onClick={() => setRefsOpen("uploads")} />
            <ToolChip icon="frame" label="Take a frame from a clip" onClick={() => setGrabbing(true)} />
            <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
            <ModelChip models={models} model={model} onPick={(id) => patchStudio({ videoModelId: id })} />
            {chips.map((field) => (
              <span key={field.key} className="shrink-0 max-md:hidden">
                <FieldChip field={field} values={isCinema ? values : own} onChange={isCinema ? set : setOwn} />
              </span>
            ))}
            {!selfCount && (
              <span className="shrink-0 max-md:hidden">
                <BatchChip value={count} onChange={setCount} />
              </span>
            )}
            <SettingsSheet
              rows={[
                ...chips.map((field) => ({ key: field.key, label: field.label, node: <FieldChip field={field} values={isCinema ? values : own} onChange={isCinema ? set : setOwn} /> })),
                ...(selfCount ? [] : [{ key: "batch", label: "Batch size", node: <BatchChip value={count} onChange={setCount} /> }]),
              ]}
            />
            </ChipRow>
          </div>
          {(error || notice || (sent && sent.warnings.length > 0)) && (
            <p
              role={error ? "alert" : "status"}
              className="flex items-start gap-1.5 px-0.5 text-[12.5px] leading-snug"
              style={error ? { color: "var(--danger)" } : undefined}
            >
              {error && <Icon name="alert" size={15} className="mt-px shrink-0" />}
              <span className={error ? "" : "text-t3"}>{error ?? notice ?? sent?.warnings.join(" ")}</span>
            </p>
          )}
        </div>
        <div className="flex max-md:hidden">
          <GenerateButton
            onClick={() => void generate()}
            busy={busy}
            disabled={!!key && (busy || !!blocker)}
            blocker={blocker}
            price={price}
            count={count}
            needsKey={key ? null : PROVIDER_NAME[provider]}
          />
        </div>
      </div>
      <div className="md:hidden">
        <GenerateButton
          wide
          onClick={() => void generate()}
          busy={busy}
          disabled={!!key && (busy || !!blocker)}
          blocker={blocker}
          price={price}
          count={count}
          needsKey={key ? null : PROVIDER_NAME[provider]}
        />
      </div>
      {key && blocker && <p className="px-2 pb-0.5 text-[11.5px] text-t4 md:hidden">{blocker}</p>}

      {cards && (
        <>
          <FilmDialog open={dialog === "film"} fields={cards.film} values={values} onSet={set} onClose={() => setDialog(null)} />
          <CameraDialog
            open={dialog === "camera" || dialog === "movement"}
            startTab={dialog === "movement" ? "movement" : "setup"}
            fields={cards.camera}
            values={values}
            onSet={set}
            onPutMove={putMoveOnPrompt}
            onClose={() => setDialog(null)}
          />
          <GridDialog
            open={dialog === "palette"}
            title="Palette"
            head="Set up colour palette"
            sub="Palette the colour grade should follow"
            field={cards.palette[0]}
            values={values}
            onSet={set}
            cols="grid-cols-2 sm:grid-cols-4"
            onClose={() => setDialog(null)}
          />
          <GridDialog
            open={dialog === "light"}
            title="Lighting"
            head="Set up lighting"
            sub="Pick a scheme for the shot's light"
            field={cards.light[0]}
            values={values}
            onSet={set}
            cols="grid-cols-2 sm:grid-cols-3"
            onClose={() => setDialog(null)}
          />
          {cards.more.length > 0 && (
            <GridDialog
              open={dialog === "more"}
              title="More"
              head={cards.more[0].label}
              sub="Auto leaves it to the model"
              field={cards.more[0]}
              values={values}
              onSet={set}
              cols="grid-cols-2 sm:grid-cols-3"
              onClose={() => setDialog(null)}
            />
          )}
        </>
      )}
      {/* One "+" for everything, as Higgsfield's window has it: uploads, elements, what was made by kind, the liked. */}
      <MediaPicker
        open={refsOpen === "uploads"}
        accept={refs.map((f) => (f.accept ?? "image") as Kind)}
        multiple
        onElements={(chosen) => addElements(chosen, false)}
        max={room}
        limits={limitsFor(refs, values, cinema?.name ?? "This model")}
        taken={refs.flatMap((f) => listOf(values[f.key]))}
        onPick={(urls, pickedKinds) => {
          const picked = urls.map((url, i) => ({ url, kind: pickedKinds[i] ?? "image" }));
          for (const kind of ["image", "video", "audio"] as Kind[]) {
            const field = fieldOf(kind);
            const urls = picked.filter((p) => p.kind === kind).map((p) => p.url);
            if (!field || urls.length === 0) continue;
            const now = listOf(useStudio.getState().valuesByModel[CINEMA]?.[field.key]);
            set(field.key, [...now, ...urls.filter((u) => !now.includes(u))].slice(0, field.maxItems ?? 30));
          }
        }}
        onClose={() => setRefsOpen(null)}
      />
      <FrameGrab
        open={grabbing}
        onClose={() => setGrabbing(false)}
        onFrame={(url) => {
          const field = fieldOf("image");
          if (!field) return;
          const now = listOf(useStudio.getState().valuesByModel[CINEMA]?.[field.key]);
          set(field.key, [...now, url].slice(0, field.maxItems ?? 30));
        }}
      />
    </div>
  );
}

/** What is among the references, over the prompt, each with a way out and a hold to move it. */
function ReferenceStrip({ refs, values, onSet, onPicturesChanged }: { refs: Field[]; values: Values; onSet: (key: string, value: unknown) => void; onPicturesChanged: (before: string[], after: string[]) => void }) {
  const items = refs.flatMap((f) => listOf(values[f.key]).map((url) => ({ url, field: f })));
  if (items.length === 0) return null;
  // Only a picture field's list is what `@Image N` points at.
  const changed = (field: Field, before: string[], after: string[]) => {
    onSet(field.key, after);
    if ((field.accept ?? "image") === "image") onPicturesChanged(before, after);
  };
  return (
    <ThumbRow
      items={items.map(({ url, field }) => ({ url, group: field.key }))}
      onRemove={(i) => {
        const { field, url } = items[i];
        const before = listOf(values[field.key]);
        changed(field, before, before.filter((u) => u !== url));
      }}
      onMove={(from, to) => {
        const { field } = items[from];
        const before = listOf(values[field.key]);
        const fromIn = before.indexOf(items[from].url);
        const toIn = before.indexOf(items[to].url);
        if (fromIn >= 0 && toIn >= 0) changed(field, before, moveItem(before, fromIn, toIn));
      }}
    />
  );
}

/** A Soul model's characters: its trained Soul IDs, those still training, and a way to train one. */
function SoulGrid({ version, onPick, onNew }: { version: "v1" | "v2" | "cinema"; onPick: (elementId: string) => void; onNew: () => void }) {
  const elements = useStudio((s) => s.elements);
  const ready = soulsFor(elements, version);
  const training = elements.filter((e) => inUse(e) && e.soul?.version === version && e.soul.state !== "completed" && e.soul.state !== "failed");
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {[...ready, ...training].map((element) => {
        const done = element.soul?.state === "completed";
        return (
          <button
            key={element.id}
            type="button"
            disabled={!done}
            onClick={() => onPick(element.id)}
            title={`@${element.name}`}
            className="group flex flex-col items-center gap-1 disabled:opacity-60"
          >
            <span className="relative block aspect-square w-full overflow-hidden rounded-card bg-surface-2 ring-1 ring-inset ring-edge">
              {element.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbSrc(element.images[0].storageUrl, 384)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-t3">
                  <Icon name="smile" size={20} />
                </span>
              )}
              {!done && (
                <span className="absolute inset-x-1 bottom-1 rounded-full bg-black/60 py-0.5 text-center text-[10px] text-white">Training…</span>
              )}
            </span>
            <span className="w-full truncate text-center text-[11px] text-t3">@{element.name}</span>
          </button>
        );
      })}
      <button type="button" onClick={onNew} className="flex flex-col items-center gap-1">
        <span className="grid aspect-square w-full place-items-center rounded-card bg-t1/[0.06] text-t3 transition-colors duration-[120ms] hover:text-t1">
          <Icon name="plus" size={20} />
        </span>
        <span className="w-full truncate text-center text-[11px] text-t3">Train new</span>
      </button>
    </div>
  );
}

/** What an element is, said to the model, and what of it must stay. */
const KIND_WORD: Record<string, string> = { character: "person", location: "place", product: "product", style: "style" };
const KIND_KEEP: Record<string, string> = { character: "their face and look", location: "the place", product: "the product", style: "the style" };

/** Image mode: a prompt, then a character and a camera, as Higgsfield's image composer lays them. */
function ImageComposer({ onKeyClick }: { onKeyClick: () => void }) {
  const cinema = cinemaModel();
  const studio = useStudioUi();
  const patchStudio = useStudio((s) => s.patchStudio);
  // Taking a picture out or moving one carries the prompt's `@Image N` tags with it.
  const changeImageRefs = (next: string[]) => patchStudio((s) => ({ imageRefs: next, imagePrompt: followRefs(s.imagePrompt, s.imageRefs, next, elements) }));
  const valuesByModel = useStudio((s) => s.valuesByModel);
  const setModelValues = useStudio((s) => s.setModelValues);
  const elements = useStudio((s) => s.elements);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);
  const studioCount = useStudio((s) => s.studioCount);
  const setCount = useStudio((s) => s.setStudioCount);
  const provider_ = useStudio((s) => s.provider);
  // Soul Cinema leads whichever service is chosen up top, as Cinema Studio's own
  // picture model (on the Higgsfield key); that service's models follow as "Other models".
  const models = useMemo(() => {
    const soul = getModel(SOUL_CINEMA);
    const rest = studioImageModels(provider_).filter((m) => m.id !== SOUL_CINEMA);
    return soul ? [soul, ...rest] : rest;
  }, [provider_]);
  const model = models.find((m) => m.id === studio.imageModelId) ?? models[0];
  // How many pictures the chosen model takes as references (its own count, 14 when it does not say).
  const refMax = model?.fields.find((f) => f.kind === "images")?.maxItems ?? 14;
  const own: Values = model ? (valuesByModel[model.id] ?? defaultValues(model)) : {};
  // A model with its own count (how many per run) keeps it; ours then sends one run.
  const selfCount = !!model && hasOwnCount(activeFields(model, own));
  const count = selfCount ? 1 : studioCount;
  // A Soul model takes its own trained characters (Soul IDs) by id; any
  // other model takes a sheet's pictures. The pick shows only where it applies.
  const soulVersion = soulVersionOf(model?.id);
  const picked = elements.find((e) => e.id === studio.character);
  const character = soulVersion
    ? picked?.soul?.version === soulVersion && picked.soul.state === "completed"
      ? picked
      : undefined
    : picked && !picked.soul
      ? picked
      : undefined;
  const openTrainer = useStudio((s) => s.openSoulTrainer);
  // Soul 2.0 takes a style by id; its card stands where the camera's does for every other model.
  const styled = soulVersion === "v2";
  const [refsOpen, setRefsOpen] = useState<null | "uploads" | "elements">(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraFields = cinema ? cardFields(cinema, {}).camera : [];
  const bodyField = cameraFields.find((f) => f.key === "camera_model");
  const lensField = cameraFields.find((f) => f.key === "camera_lens");
  const camValues: Values = { camera_model: studio.imageCamera, camera_lens: studio.imageLens };
  const bodyLabel = bodyField ? labelOf(bodyField, studio.imageCamera) : undefined;
  const lensLabel = lensField ? labelOf(lensField, studio.imageLens) : undefined;

  const sent = useMemo(() => {
    if (!model) return null;
    const compiled = compileCinemaPrompt(cameraFields, camValues);
    const pictures = character && !character.soul ? character.images.map((r) => r.storageUrl) : [];
    const images = [...pictures, ...studio.imageRefs];
    const mode = images.length > 0 ? (modesFor(model, "image-edit-multi")[0] ?? (own.__mode as string | undefined)) : (own.__mode as string | undefined);
    // The character's pictures go first, so they are Image 1 to N; the
    // prompt says so, since a name alone means nothing to the model.
    const taken = imageRefs(model, mapParams(model, mode, { prompt: "x", images }).values).filter((u) => pictures.includes(u)).length;
    const named = character && new RegExp(`(^|\\s)@${character.name}(\\s|$)`).test(studio.imagePrompt);
    const call =
      character && !character.soul && taken > 0
        ? `${named ? "" : ` @${character.name}`}. @${character.name} is the ${KIND_WORD[character.kind] ?? "subject"} in ${Array.from({ length: taken }, (_, i) => `@Image ${i + 1}`).join(", ")}; keep ${KIND_KEEP[character.kind] ?? "their look"} the same.`
        : "";
    // The character's sheet goes first, so a picture the person attached is Image (taken + n) to the model.
    const typed = taken > 0 ? studio.imagePrompt.replace(/@Image (\d+)/g, (_, n: string) => `@Image ${Number(n) + taken}`) : studio.imagePrompt;
    const text = [typed.trim() + call, compiled].filter(Boolean).join(" ");
    const placed = mapParams(model, mode, { prompt: text, images });
    // A model that takes no pictures cannot use the character at all: said
    // plainly, rather than a note that its pictures were left out.
    if (character && !character.soul && taken === 0) placed.warnings.splice(0, placed.warnings.length, `${model.name} can't use a character. Pick a model that takes reference images, or remove @${character.name}.`);
    const values: Values = { ...placed.values };
    for (const field of activeFields(model, values)) {
      if (field.placement === "prompt" || field.placement === "input") continue;
      if (own[field.key] !== undefined) values[field.key] = own[field.key];
    }
      // A Soul ID goes as the model's own character parameter; none when not picked here.
    if (soulVersion) {
      if (character?.soul) {
        values.custom_reference_id = character.soul.id;
        if (own.custom_reference_strength !== undefined) values.custom_reference_strength = own.custom_reference_strength;
      } else {
        delete values.custom_reference_id;
        delete values.custom_reference_strength;
      }
    }
    // A style does not combine with reference pictures.
    if (styled && own.style_id && images.length === 0) values.style_id = own.style_id;
    // The pictures as the model gets them, in order, for `@Image N`.
    return { values, warnings: placed.warnings, unusable: !!character && !character.soul && taken === 0, refs: imageRefs(model, values) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, own, studio.imagePrompt, studio.imageRefs, studio.imageCamera, studio.imageLens, character]);

  const provider = providerOf(model);
  const key = keyFor({ apiKey, hfKey }, provider);
  const blocker = !model ? "No image model is available." : !studio.imagePrompt.trim() ? "Describe the picture to continue." : sent?.unusable ? sent.warnings[0] : sent ? validateValues(model, sent.values) : null;
  const price = times(usePrice(model, sent?.values ?? {}, blocker), count);
  const chips = model ? activeFields(model, own).filter((f) => f.placement === "bar" && f.kind !== "soulStyle") : [];

  async function generate() {
    if (!model || !sent) return;
    if (!key) return onKeyClick();
    if (busy || blocker) return;
    setBusy(true);
    setError(null);
    for (let i = 0; i < count; i += 1) {
      const result = await submitModelRun(model, sent.values, {
        studio: "image",
        studioImage: { prompt: studio.imagePrompt, camera: studio.imageCamera, lens: studio.imageLens, character: studio.character, refs: studio.imageRefs },
      });
      if (!result.ok) {
        setError(result.error ?? "Could not send this.");
        setBusy(false);
        return;
      }
      // On its way: Home hands over to the generations, where it is being made.
      if (i === 0) showMade();
    }
    setBusy(false);
  }

  // Higgsfield's two tiles beside the prompt: 80px high, the character's square, the camera's a little wider.
  const tile = "relative flex h-[80px] shrink-0 flex-col justify-end overflow-hidden rounded-panel bg-t1/[0.06] p-2 text-left transition-colors duration-[120ms] hover:bg-t1/[0.1] max-md:w-full";
  const cameraImage = previewOf("camera_model", studio.imageCamera)?.image;

  return (
    <div className="flex flex-col gap-1.5 rounded-panel border border-line bg-elevated p-1.5 md:flex-row md:items-center md:gap-2 md:bg-[var(--chip-well)] md:pr-3 md:shadow-[inset_0_0_0_6px_var(--elevated)]">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-card bg-t1/[0.05] p-3 max-md:gap-6 md:bg-transparent">
        {/* The references sit over the prompt and grow in as they come. */}
        <div className="-mb-2.5 max-md:-mb-6">
          <Reveal>
            {studio.imageRefs.length > 0 && (
              <ThumbRow
                items={studio.imageRefs.map((url) => ({ url }))}
                onRemove={(i) => changeImageRefs(studio.imageRefs.filter((_, j) => j !== i))}
                onMove={(from, to) => changeImageRefs(moveItem(studio.imageRefs, from, to))}
              />
            )}
          </Reveal>
        </div>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <StudioPrompt
              text={studio.imagePrompt}
              placeholder="Describe the picture. Use @ for characters and places"
              onText={(text) => patchStudio({ imagePrompt: text })}
              onSubmit={() => void generate()}
              refs={studio.imageRefs}
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ChipRow>
          <ToolChip icon="plus" label="Add pictures" onClick={() => setRefsOpen("uploads")} />
          <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
          <ModelChip models={models} model={model} onPick={(id) => patchStudio({ imageModelId: id })} lead={SOUL_LEAD} />
          {model &&
            chips.map((field) => (
              <span key={field.key} className="shrink-0 max-md:hidden">
                <FieldChip field={field} values={own} onChange={(k, v) => setModelValues(model.id, { [k]: v })} />
              </span>
            ))}
          {!selfCount && (
            <span className="shrink-0 max-md:hidden">
              <BatchChip value={count} onChange={setCount} />
            </span>
          )}
          {model && (
            <SettingsSheet
              rows={[
                ...chips.map((field) => ({ key: field.key, label: field.label, node: <FieldChip field={field} values={own} onChange={(k, v) => setModelValues(model.id, { [k]: v })} /> })),
                ...(selfCount ? [] : [{ key: "batch", label: "Batch size", node: <BatchChip value={count} onChange={setCount} /> }]),
              ]}
            />
          )}
          </ChipRow>
        </div>
        {(error || (sent && sent.warnings.length > 0)) && (
          <p role={error ? "alert" : "status"} className="text-[12.5px] leading-snug" style={error ? { color: "var(--danger)" } : undefined}>
            <span className={error ? "" : "text-t3"}>{error ?? sent?.warnings.join(" ")}</span>
          </p>
        )}
      </div>
      <div className="flex gap-1.5 max-md:grid max-md:grid-cols-2">
        <button type="button" onClick={() => setChoosing(true)} className={`${tile} md:w-[80px]`} aria-label={character ? `Character: @${character.name}` : "Add a character"}>
          {character?.images[0] ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbSrc(character.images[0].storageUrl, 256)} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
            </>
          ) : (
            <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/35 text-t1">
              <Icon name="plus" size={13} />
            </span>
          )}
          <span className="relative max-w-full truncate text-[10px] font-bold uppercase tracking-normal text-t1">
            {character ? `@${character.name}` : "Character"}
          </span>
        </button>
        {styled && studio.imageRefs.length === 0 ? (
          <SoulStyleTile value={String(own.style_id ?? "")} onChange={(id) => setModelValues(model.id, { style_id: id })} strength={own.custom_reference_strength as number | undefined} onStrength={(n) => setModelValues(model.id, { custom_reference_strength: n })} className="md:w-[120px]" />
        ) : (
        <button type="button" onClick={() => setCameraOpen(true)} className={`${tile} md:w-[120px]`} aria-label={`Camera: ${bodyLabel ?? "Auto"} / ${lensLabel ?? "Auto"}`}>
          {cameraImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cameraImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 to-transparent" />
            </>
          ) : (
            // As Higgsfield's: a small lens in the corner while no camera is chosen.
            <span className="absolute right-2 top-2 overflow-hidden rounded-full">
              <CardArt kind="camera" size={24} />
            </span>
          )}
          <span className="relative block max-w-full truncate text-[12px] font-semibold leading-tight text-t1">{bodyLabel ?? "Camera"}</span>
          <span className="relative block max-w-full truncate text-[10.5px] leading-tight text-t3">{lensLabel ?? "Lens · Auto"}</span>
        </button>
        )}
      </div>
      <div className="flex max-md:hidden">
        <GenerateButton
          onClick={() => void generate()}
          busy={busy}
          disabled={!!key && (busy || !!blocker)}
          blocker={blocker}
          price={price}
          count={count}
          needsKey={key ? null : PROVIDER_NAME[provider]}
        />
      </div>

      <div className="md:hidden">
        <GenerateButton
          wide
          onClick={() => void generate()}
          busy={busy}
          disabled={!!key && (busy || !!blocker)}
          blocker={blocker}
          price={price}
          count={count}
          needsKey={key ? null : PROVIDER_NAME[provider]}
        />
      </div>

      <StudioDialog
        open={cameraOpen}
        title="Set up camera"
        onClose={() => setCameraOpen(false)}
        onReset={() => patchStudio({ imageCamera: "", imageLens: "" })}
      >
        <div className="flex gap-1">
          {bodyField && (
            <Wheel field="camera_model" label="Camera" choices={bodyField.choices ?? []} value={studio.imageCamera} onChange={(v) => patchStudio({ imageCamera: v })} />
          )}
          {lensField && (
            <Wheel
              field="camera_lens"
              label="Lens"
              autoIcon="lens"
              shaded
              choices={lensField.choices ?? []}
              value={studio.imageLens}
              onChange={(v) => patchStudio({ imageLens: v })}
            />
          )}
        </div>
        <p className="mt-2 px-1 text-[12px] text-t4">Image models take these as words in the prompt.</p>
      </StudioDialog>
      <MediaPicker
        open={choosing}
        characters
        accept="image"
        onElements={(chosen) => chosen[0] && patchStudio({ character: chosen[0].id })}
        onClear={character ? () => patchStudio({ character: null }) : undefined}
        onPick={() => {}}
        onClose={() => setChoosing(false)}
      />
      {/* Pictures come in from the same window Genjutsu opens for its references. */}
      <MediaPicker
        open={refsOpen !== null}
        accept="image"
        multiple
        max={refMax}
        limits={{ image: { room: Math.max(refMax - studio.imageRefs.length, 0), note: `${model?.name ?? "This model"} takes up to ${refMax} images.${studio.imageRefs.length ? ` ${studio.imageRefs.length} already added.` : ""}` } }}
        onElements={(chosen) =>
          patchStudio((s) => ({
            imageRefs: [...(s.imageRefs ?? []), ...chosen.flatMap((e) => e.images.map((r) => r.storageUrl)).filter((u) => !(s.imageRefs ?? []).includes(u))].slice(0, refMax),
          }))
        }
        taken={studio.imageRefs}
        onPick={(urls) => patchStudio((s) => ({ imageRefs: [...s.imageRefs, ...urls.filter((u) => !s.imageRefs.includes(u))].slice(0, refMax) }))}
        onClose={() => setRefsOpen(null)}
      />
    </div>
  );
}
