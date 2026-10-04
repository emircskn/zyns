"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { Popover } from "@/components/Popover";
import { BatchChip, FieldChip } from "@/components/PromptBar";
import { ProjectChip } from "@/components/ProjectMenu";
import { Sheet } from "@/components/remix/Restyle";
import { VendorBadge } from "@/components/VendorMark";
import { CameraDialog, FilmDialog, GridDialog, StudioDialog } from "@/components/studio/Dialogs";
import { FrameGrab } from "@/components/studio/FrameGrab";
import { ReferencePicker, type Kind } from "@/components/studio/ReferencePicker";
import { ElementGrid, PreviewMedia } from "@/components/studio/Settings";
import { StudioPrompt } from "@/components/studio/StudioPrompt";
import { Wheel } from "@/components/studio/Wheel";
import { PROVIDER_NAME, submitModelRun } from "@/lib/generate";
import type { LibraryElement } from "@/lib/elements";
import { mapParams } from "@/lib/recipes/paramMap";
import { activeFields, defaultValues, modesFor, providerOf, validateValues, type Field, type ModelDef, type Values } from "@/lib/registry";
import { estimateCredits, formatCredits } from "@/lib/registry/pricing";
import { mediaSrc } from "@/lib/storage/client";
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
function times(hint: string | null, count: number): string | null {
  if (!hint || count <= 1) return hint;
  const match = /([\d,]+(?:\.\d+)?)/.exec(hint);
  if (!match) return hint;
  const total = Number(match[1].replace(/,/g, "")) * count;
  const shown = total >= 10 ? Math.round(total) : Math.round(total * 10) / 10;
  return hint.replace(match[1], shown.toLocaleString("en-US"));
}

/** What one send costs: Higgsfield's estimate, or KIE's price list. */
function usePrice(model: ModelDef | undefined, values: Values, blocker: string | null): string | null {
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
          <PreviewMedia preview={thumb} className="h-9 w-9 shrink-0 rounded-[10px]" />
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-t1/[0.06] text-t2">
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

/** The model the composer sends to, picked from those that fit the mode. */
function ModelChip({ models, model, onPick }: { models: ModelDef[]; model: ModelDef | undefined; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const shown = models.filter((m) => !q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase()));
  const cinema = shown.filter((m) => m.id === CINEMA);
  const rest = shown.filter((m) => m.id !== CINEMA);
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
      className={`flex w-full items-center gap-2.5 rounded-[12px] px-2 py-2 text-left transition-colors duration-[120ms] ${
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
            open ? "bg-t1 text-canvas" : "bg-t1/[0.07] text-t1 hover:bg-t1/[0.12]"
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
                  Cinematic
                </p>
                {cinema.map((m) => row(m, close))}
              </>
            )}
            {rest.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 px-2 pb-1 pt-2.5 text-[11.5px] font-medium text-t3">
                  <Icon name="spark" size={12} />
                  {cinema.length > 0 || models.some((m) => m.id === CINEMA) ? "Other models · settings go into the prompt" : "Models"}
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
function ModeSwitch({ mode, onMode }: { mode: "video" | "image"; onMode: (mode: "video" | "image") => void }) {
  const item = (id: "image" | "video", icon: IconName, label: string) => (
    <button
      type="button"
      onClick={() => onMode(id)}
      aria-pressed={mode === id}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-[18px] text-[12px] font-semibold transition-colors duration-[120ms] md:h-[52px] md:w-16 md:flex-none md:flex-col md:gap-1 md:text-[10.5px] max-md:h-9 ${
        mode === id ? "bg-t1/[0.1] text-t1" : "text-t3 hover:text-t1"
      }`}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
  return (
    <div className="flex shrink-0 gap-1 rounded-panel border border-line bg-elevated p-1 md:flex-col">
      {item("image", "image", "Image")}
      {item("video", "video", "Video")}
    </div>
  );
}

/** The large Generate at the composer's end, with what it costs. */
function GenerateButton({
  onClick,
  busy,
  disabled,
  blocker,
  price,
  count,
  needsKey,
}: {
  onClick: () => void;
  busy: boolean;
  disabled: boolean;
  blocker: string | null;
  price: string | null;
  count: number;
  needsKey: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={blocker ?? undefined}
      className="cta flex h-12 w-full shrink-0 flex-row items-center justify-center gap-2 rounded-card font-semibold disabled:opacity-40 md:h-auto md:min-h-[80px] md:w-[128px] md:flex-col md:gap-1"
    >
      {busy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : needsKey ? (
        <span className="flex items-center gap-1.5 px-2 text-[12.5px]">
          <Icon name="key" size={15} />
          Add {needsKey} key
        </span>
      ) : (
        <>
          <span className="text-[13px] uppercase tracking-[0.04em]">Generate{count > 1 ? ` ×${count}` : ""}</span>
          <span className="flex items-center gap-1 font-mono text-[12px] font-medium tabular-nums opacity-70">
            <Icon name="spark" size={12} fill="currentColor" strokeWidth={1.2} />
            {price ?? "—"}
          </span>
        </>
      )}
    </button>
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
      <div className="min-w-0 flex-1">
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
  const stored = useStudio((s) => s.valuesByModel[CINEMA]);
  const valuesByModel = useStudio((s) => s.valuesByModel);
  const setModelValues = useStudio((s) => s.setModelValues);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);
  const count = useStudio((s) => s.studioCount);
  const setCount = useStudio((s) => s.setStudioCount);
  const defaults = useMemo(() => (cinema ? defaultValues(cinema) : {}), [cinema]);
  const values: Values = stored ?? defaults;
  const provider_ = useStudio((s) => s.provider);
  const models = useMemo(() => studioVideoModels(provider_), [provider_]);
  const model = models.find((m) => m.id === studio.videoModelId) ?? cinema;
  const isCinema = model?.id === CINEMA;
  const own: Values = model && !isCinema ? (valuesByModel[model.id] ?? defaultValues(model)) : values;

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
        <div className={`grid gap-1.5 max-md:grid-cols-2 ${cards.more.length > 0 ? "md:grid-cols-6" : "md:grid-cols-5"}`}>
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
                    <span key={url} className="h-9 w-9 shrink-0 overflow-hidden rounded-[10px] bg-surface">
                      {mediaKind(url) === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaSrc(url)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-t3">
                          <Icon name={mediaKind(url) === "video" ? "video" : "audio"} size={14} />
                        </span>
                      )}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-t1/[0.06] text-t2">
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
      <div className="flex flex-col gap-1.5 md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-[20px] bg-t1/[0.05] p-3">
          <StudioPrompt
            text={prompt}
            placeholder="Describe your scene. Use @ for characters and places, # for a camera move"
            onText={setPrompt}
            onElement={(element) => addElements([element], false)}
            onMoveReplaced={() => setNotice("This model takes one camera move per shot, so the new one took the old one's place.")}
            onSubmit={() => void generate()}
            move={moveField}
            inputRef={setInput}
          />
          <div className="no-bar flex items-center gap-1.5 overflow-x-auto md:flex-wrap md:overflow-visible">
            <ToolChip icon="plus" label="Add references" onClick={() => setRefsOpen("uploads")} />
            <ToolChip icon="at" label="Add an element" onClick={() => setRefsOpen("elements")} />
            <ToolChip icon="frame" label="Take a frame from a clip" onClick={() => setGrabbing(true)} />
            <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
            <ModelChip models={models} model={model} onPick={(id) => patchStudio({ videoModelId: id })} />
            {chips.map((field) => (
              <span key={field.key} className="shrink-0">
                <FieldChip field={field} values={isCinema ? values : own} onChange={isCinema ? set : setOwn} />
              </span>
            ))}
            <span className="shrink-0">
              <BatchChip value={count} onChange={setCount} />
            </span>
            <span className="shrink-0 empty:hidden">
              <ProjectChip />
            </span>
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
      <ReferencePicker
        open={refsOpen !== null}
        startTab={refsOpen ?? "uploads"}
        onClose={() => setRefsOpen(null)}
        room={{
          image: Math.max(0, (fieldOf("image")?.maxItems ?? 0) - listOf(values[fieldOf("image")?.key ?? ""]).length),
          video: Math.max(0, (fieldOf("video")?.maxItems ?? 0) - listOf(values[fieldOf("video")?.key ?? ""]).length),
          audio: Math.max(0, (fieldOf("audio")?.maxItems ?? 0) - listOf(values[fieldOf("audio")?.key ?? ""]).length),
        }}
        kinds={refs.map((f) => (f.accept ?? "image") as Kind)}
        taken={refs.flatMap((f) => listOf(values[f.key]))}
        onAdd={(picked) => {
          for (const kind of ["image", "video", "audio"] as Kind[]) {
            const field = fieldOf(kind);
            const urls = picked.filter((p) => p.kind === kind).map((p) => p.url);
            if (!field || urls.length === 0) continue;
            const now = listOf(useStudio.getState().valuesByModel[CINEMA]?.[field.key]);
            set(field.key, [...now, ...urls.filter((u) => !now.includes(u))].slice(0, field.maxItems ?? 30));
          }
        }}
        onElements={addElements}
      />
      <ReferenceStrip refs={refs} values={values} onSet={set} />
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

/** What is among the references, small, under the composer, each with a way out. */
function ReferenceStrip({ refs, values, onSet }: { refs: Field[]; values: Values; onSet: (key: string, value: unknown) => void }) {
  const items = refs.flatMap((f) => listOf(values[f.key]).map((url) => ({ url, field: f })));
  if (items.length === 0) return null;
  return (
    <div className="no-bar flex gap-1.5 overflow-x-auto px-1.5 pb-1">
      {items.map(({ url, field }) => (
        <span key={url} className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-surface ring-1 ring-inset ring-line">
          {mediaKind(url) === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaSrc(url)} alt="" className="h-full w-full object-cover" />
          ) : mediaKind(url) === "video" ? (
            <video src={mediaSrc(url)} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-t3">
              <Icon name="audio" size={15} />
            </span>
          )}
          <button
            type="button"
            aria-label="Remove reference"
            onClick={() => onSet(field.key, listOf(values[field.key]).filter((u) => u !== url))}
            className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/65 text-white opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 max-md:opacity-100"
          >
            <Icon name="close" size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

/** Image mode: a prompt, then a character and a camera, as Higgsfield's image composer lays them. */
function ImageComposer({ onKeyClick }: { onKeyClick: () => void }) {
  const cinema = cinemaModel();
  const studio = useStudioUi();
  const patchStudio = useStudio((s) => s.patchStudio);
  const valuesByModel = useStudio((s) => s.valuesByModel);
  const setModelValues = useStudio((s) => s.setModelValues);
  const elements = useStudio((s) => s.elements);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);
  const count = useStudio((s) => s.studioCount);
  const setCount = useStudio((s) => s.setStudioCount);
  const provider_ = useStudio((s) => s.provider);
  const models = useMemo(() => studioImageModels(provider_), [provider_]);
  const model = models.find((m) => m.id === studio.imageModelId) ?? models[0];
  const own: Values = model ? (valuesByModel[model.id] ?? defaultValues(model)) : {};
  const character = elements.find((e) => e.id === studio.character);
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
    const call = character && !new RegExp(`(^|\\s)@${character.name}(\\s|$)`).test(studio.imagePrompt) ? ` @${character.name}` : "";
    const text = [studio.imagePrompt.trim() + call, compiled].filter(Boolean).join(" ");
    const images = [...(character ? character.images.map((r) => r.storageUrl) : []), ...studio.imageRefs];
    const mode = images.length > 0 ? (modesFor(model, "image-edit-multi")[0] ?? (own.__mode as string | undefined)) : (own.__mode as string | undefined);
    const placed = mapParams(model, mode, { prompt: text, images });
    const values: Values = { ...placed.values };
    for (const field of activeFields(model, values)) {
      if (field.placement === "prompt" || field.placement === "input") continue;
      if (own[field.key] !== undefined) values[field.key] = own[field.key];
    }
    return { values, warnings: placed.warnings };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, own, studio.imagePrompt, studio.imageRefs, studio.imageCamera, studio.imageLens, character]);

  const provider = providerOf(model);
  const key = keyFor({ apiKey, hfKey }, provider);
  const blocker = !model ? "No image model is available." : !studio.imagePrompt.trim() ? "Describe the picture to continue." : sent ? validateValues(model, sent.values) : null;
  const price = times(usePrice(model, sent?.values ?? {}, blocker), count);
  const chips = model ? activeFields(model, own).filter((f) => f.placement === "bar") : [];

  async function generate() {
    if (!model || !sent) return;
    if (!key) return onKeyClick();
    if (busy || blocker) return;
    setBusy(true);
    setError(null);
    for (let i = 0; i < count; i += 1) {
      const result = await submitModelRun(model, sent.values, { studio: "image" });
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

  const tile = "flex h-[80px] w-[88px] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-card bg-t1/[0.05] text-center transition-colors duration-[120ms] hover:bg-t1/[0.09]";
  const cameraImage = previewOf("camera_model", studio.imageCamera)?.image;

  return (
    <div className="flex flex-col gap-1.5 rounded-panel border border-line bg-elevated p-1.5 md:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-[20px] bg-t1/[0.05] p-3">
        <StudioPrompt
          text={studio.imagePrompt}
          placeholder="Describe the picture. Use @ for characters and places"
          onText={(text) => patchStudio({ imagePrompt: text })}
          onSubmit={() => void generate()}
        />
        <div className="no-bar flex items-center gap-1.5 overflow-x-auto md:flex-wrap md:overflow-visible">
          <ToolChip icon="plus" label="Add pictures" onClick={() => setRefsOpen("uploads")} text={studio.imageRefs.length ? String(studio.imageRefs.length) : undefined} />
          <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
          <ModelChip models={models} model={model} onPick={(id) => patchStudio({ imageModelId: id })} />
          {model &&
            chips.map((field) => (
              <span key={field.key} className="shrink-0">
                <FieldChip field={field} values={own} onChange={(k, v) => setModelValues(model.id, { [k]: v })} />
              </span>
            ))}
          <span className="shrink-0">
            <BatchChip value={count} onChange={setCount} />
          </span>
          <span className="shrink-0 empty:hidden">
            <ProjectChip />
          </span>
        </div>
        {studio.imageRefs.length > 0 && (
          <div className="no-bar flex gap-1.5 overflow-x-auto">
            {studio.imageRefs.map((url) => (
              <span key={url} className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] ring-1 ring-inset ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaSrc(url)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove picture"
                  onClick={() => patchStudio((s) => ({ imageRefs: s.imageRefs.filter((u) => u !== url) }))}
                  className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/65 text-white opacity-0 group-hover:opacity-100 max-md:opacity-100"
                >
                  <Icon name="close" size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        {(error || (sent && sent.warnings.length > 0)) && (
          <p role={error ? "alert" : "status"} className="text-[12.5px] leading-snug" style={error ? { color: "var(--danger)" } : undefined}>
            <span className={error ? "" : "text-t3"}>{error ?? sent?.warnings.join(" ")}</span>
          </p>
        )}
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setChoosing(true)} className={tile} aria-label={character ? `Character: @${character.name}` : "Add a character"}>
          {character?.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaSrc(character.images[0].storageUrl)} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-t1/[0.08] text-t2">
              <Icon name="plus" size={16} />
            </span>
          )}
          <span className="max-w-full truncate px-1 font-mono text-[10px] uppercase tracking-[0.06em] text-t3">
            {character ? `@${character.name}` : "Character"}
          </span>
        </button>
        <button type="button" onClick={() => setCameraOpen(true)} className={tile} aria-label={`Camera: ${bodyLabel ?? "Auto"} / ${lensLabel ?? "Auto"}`}>
          {cameraImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cameraImage} alt="" className="h-10 max-w-[72px] object-contain" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-t1/[0.08] text-t2">
              <Icon name="camera" size={16} />
            </span>
          )}
          <span className="max-w-full truncate px-1 text-[10.5px] leading-tight text-t2">
            {bodyLabel ?? "Auto"} / {lensLabel ?? "Auto"}
          </span>
        </button>
        <div className="flex-1 md:flex-none">
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
      <Sheet open={choosing} title="Character" sub="Its pictures go with the prompt" onClose={() => setChoosing(false)}>
        {character && (
          <button
            type="button"
            onClick={() => {
              patchStudio({ character: null });
              setChoosing(false);
            }}
            className="mb-3 rounded-full bg-t1/[0.07] px-3 py-1.5 text-[12.5px] text-t2 hover:text-t1"
          >
            No character
          </button>
        )}
        <ElementGrid
          onPick={(_, name) => {
            const element = useStudio.getState().elements.find((e) => e.name === name);
            if (element) patchStudio({ character: element.id });
            setChoosing(false);
          }}
        />
      </Sheet>
      <ReferencePicker
        open={refsOpen !== null}
        startTab={refsOpen ?? "uploads"}
        onClose={() => setRefsOpen(null)}
        kinds={["image"]}
        room={{ image: Math.max(0, 14 - studio.imageRefs.length), video: 0, audio: 0 }}
        taken={studio.imageRefs}
        onAdd={(picked) => patchStudio((s) => ({ imageRefs: [...s.imageRefs, ...picked.map((p) => p.url).filter((u) => !s.imageRefs.includes(u))] }))}
        onElements={(chosen) =>
          patchStudio((s) => ({
            imagePrompt: `${s.imagePrompt.trimEnd()} ${chosen.map((e) => `@${e.name}`).join(" ")} `.trimStart(),
            imageRefs: [...s.imageRefs, ...chosen.flatMap((e) => e.images.map((r) => r.storageUrl)).filter((u) => !s.imageRefs.includes(u))],
          }))
        }
      />
    </div>
  );
}
