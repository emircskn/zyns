"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { BatchChip, FieldChip, TileChips } from "@/components/PromptBar";
import { ProjectChip } from "@/components/ProjectMenu";
import { CameraSheet, ChoiceSheet, ReferencesSheet, SettingCard, type OpenSheet } from "@/components/studio/Settings";
import { previewOf, type OptionPreview } from "@/lib/studio/options";
import { PROVIDER_NAME, submitModelRun } from "@/lib/generate";
import { insertMention, mentionAtCaret } from "@/lib/mentions";
import { defaultValues, validateValues, type Field, type Values } from "@/lib/registry";
import { mediaSrc } from "@/lib/storage/client";
import { mediaKind } from "@/lib/upload";
import {
  CARDS,
  CINEMA,
  bottomFields,
  cardFields,
  cinemaModel,
  cinemaSpec,
  listOf,
  referenceFields,
  summary,
} from "@/lib/studio/cinema";
import { useEstimate } from "@/lib/useEstimate";
import { useStudio } from "@/store/studio";
import type { LibraryElement } from "@/lib/elements";

/** The picture a card shows for what is chosen on it: the first chosen field that has one. */
function thumbOf(fields: Field[], values: Values): OptionPreview | undefined {
  for (const field of fields) {
    const value = values[field.key];
    if (value === undefined || value === null || value === "") continue;
    const preview = previewOf(field.key, value);
    if (preview) return preview;
  }
  return undefined;
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

/**
 * The prompt, with `@` for the library's elements: a pick drops `@name` in
 * the text and brings the element's pictures into the references, where
 * they count toward the limit before anything is sent.
 */
function StudioPrompt({
  text,
  placeholder,
  onText,
  onElement,
  onSubmit,
  extra,
}: {
  text: string;
  placeholder: string;
  onText: (text: string) => void;
  onElement: (element: LibraryElement) => void;
  onSubmit: () => void;
  /** Flags that sit with the prompt (native audio), as on the Video page. */
  extra?: ReactNode;
}) {
  const elements = useStudio((s) => s.elements).filter((e) => e.kind !== "style");
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [spot, setSpot] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null);
  const pendingCaret = useRef<number | null>(null);

  const token = caret === null ? null : mentionAtCaret(text, caret);
  const q = token?.query.toLowerCase() ?? "";
  const matches = token ? elements.filter((e) => e.name.toLowerCase().startsWith(q)) : [];
  const open = !!token && matches.length > 0 && dismissed !== token.start;

  useEffect(() => setCursor(0), [token?.query]);

  useLayoutEffect(() => {
    const at = pendingCaret.current;
    const node = ref.current;
    if (at === null || !node) return;
    pendingCaret.current = null;
    node.focus();
    node.setSelectionRange(at, at);
    setCaret(at);
  });

  useLayoutEffect(() => {
    if (!open) {
      setSpot(null);
      return;
    }
    const measure = () => {
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const margin = 12;
      const width = Math.min(280, window.innerWidth - 2 * margin);
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - margin - width));
      const view = window.visualViewport;
      const viewBottom = (view?.offsetTop ?? 0) + (view?.height ?? window.innerHeight);
      if (viewBottom - rect.bottom > 220) setSpot({ left, top: rect.bottom + 6, width });
      else setSpot({ left, bottom: window.innerHeight - rect.top + 6, width });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, text]);

  function pick(element: LibraryElement) {
    if (!token) return;
    const next = insertMention(text, token.start, caret ?? text.length, element.name);
    onText(next.text);
    pendingCaret.current = next.caret;
    setDismissed(null);
    onElement(element);
  }

  function addAt() {
    const node = ref.current;
    const at = node?.selectionStart ?? text.length;
    const lead = at > 0 && !/\s/.test(text[at - 1]) ? " " : "";
    onText(text.slice(0, at) + lead + "@" + text.slice(at));
    pendingCaret.current = at + lead.length + 1;
  }

  const sync = () => ref.current && setCaret(ref.current.selectionStart);

  return (
    <div className="rounded-panel bg-t1/[0.05] px-3.5 pb-2.5 pt-3">
      <textarea
        ref={ref}
        aria-label="Prompt"
        value={text}
        rows={4}
        placeholder={placeholder}
        onChange={(event) => {
          onText(event.target.value);
          setCaret(event.target.selectionStart);
        }}
        onKeyUp={sync}
        onClick={sync}
        onSelect={sync}
        onBlur={() => window.setTimeout(() => setCaret(null), 120)}
        onKeyDown={(event) => {
          if (open) {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setCursor((c) => (c + (event.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
              return;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              pick(matches[cursor] ?? matches[0]);
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setDismissed(token?.start ?? null);
              return;
            }
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSubmit();
          }
        }}
        className="no-bar max-h-[220px] w-full resize-none bg-transparent text-[16px] leading-relaxed text-t1 outline-none placeholder:text-t4 md:text-[14px]"
      />
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        <button
          type="button"
          onClick={addAt}
          title="Call an element with @"
          className="flex items-center gap-1 rounded-full bg-t1/[0.07] px-2.5 py-1 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
        >
          <Icon name="at" size={14} />
          Element
        </button>
        {elements.length === 0 && <span className="ml-auto truncate text-[11.5px] text-t4">No elements yet</span>}
      </div>
      {open &&
        spot &&
        createPortal(
          <div
            role="listbox"
            className="surface-pop anim-rise fixed z-[118] max-h-[min(320px,50vh)] overflow-y-auto rounded-panel p-1.5"
            style={{ left: spot.left, top: spot.top, bottom: spot.bottom, width: spot.width }}
          >
            <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-t3">Your elements</div>
            {matches.map((element, i) => (
              <button
                key={element.id}
                type="button"
                role="option"
                aria-selected={i === cursor}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(element)}
                onMouseEnter={() => setCursor(i)}
                className={`flex w-full items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3 text-left text-[13.5px] transition-colors duration-[120ms] ${
                  i === cursor ? "bg-t1 text-canvas" : "text-t2"
                }`}
              >
                {element.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaSrc(element.images[0].storageUrl)} alt="" className="h-8 w-8 shrink-0 rounded-full bg-t1/[0.07] object-cover" />
                ) : (
                  <Icon name="at" size={16} className="shrink-0" />
                )}
                <span className="truncate">@{element.name}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

/** The model's own banner, as the Video composer heads with its model's card. */
function Banner() {
  const spec = cinemaSpec();
  const media = spec?.banner ?? spec?.preview;
  return (
    <div className="relative h-[124px] shrink-0 overflow-hidden rounded-panel bg-surface">
      {media?.video && (
        <video
          src={media.video}
          poster={media.poster}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <div className="absolute inset-x-3.5 bottom-3 text-white">
        <p className="truncate text-[21px] font-bold uppercase leading-none tracking-[-0.02em]">Cinema Studio</p>
        <p className="mt-1.5 truncate text-[12px] text-white/75">4.0 · Camera, film, light and colour, set like a shoot</p>
      </div>
    </div>
  );
}

/** Cinema Studio's composer: the setting cards, the references, the prompt, the shot's format and Generate. */
export function CinemaComposer({ onKeyClick, scroll, onSent }: { onKeyClick: () => void; scroll?: boolean; onSent?: () => void }) {
  const model = cinemaModel();
  const stored = useStudio((s) => s.valuesByModel[CINEMA]);
  const setModelValues = useStudio((s) => s.setModelValues);
  const hfKey = useStudio((s) => s.hfKey);
  const count = useStudio((s) => s.studioCount);
  const setCount = useStudio((s) => s.setStudioCount);
  const defaults = useMemo(() => (model ? defaultValues(model) : {}), [model]);
  const values: Values = stored ?? defaults;
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spec = cinemaSpec();

  const set = (key: string, value: unknown) => setModelValues(CINEMA, { [key]: value });

  useEffect(() => setError(null), [values]);

  const cards = model ? cardFields(model, values) : null;
  const refs = model ? referenceFields(model, values) : [];
  const row = model ? bottomFields(model, values) : [];
  const flags = row.filter((f) => f.kind === "toggle");
  const bottom = row.filter((f) => f.kind !== "toggle");
  const images = refs.find((f) => (f.accept ?? "image") === "image");
  const total = refs.reduce((n, f) => n + listOf(values[f.key]).length, 0);
  const thumbs = refs.flatMap((f) => listOf(values[f.key])).slice(0, 6);
  const prompt = typeof values.prompt === "string" ? values.prompt : "";

  const blocker = !model ? "Cinema Studio is not available." : !prompt.trim() ? "Describe the shot to continue." : validateValues(model, values);
  const price = times(useEstimate(model, values, blocker), count);

  async function generate() {
    if (!model) return;
    if (!hfKey) return onKeyClick();
    if (busy || blocker) return;
    setBusy(true);
    setError(null);
    // Each one its own request, through Higgsfield's queue.
    for (let i = 0; i < count; i += 1) {
      const result = await submitModelRun(model, values, {}, { schema: true });
      if (!result.ok) {
        setError(result.error ?? "Could not send this.");
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    onSent?.();
  }

  const more = cards?.more ?? [];
  // The choice sheet keeps what it showed while it closes.
  const choice = useRef<"film" | "light" | "palette" | "more">("film");
  if (sheet === "film" || sheet === "light" || sheet === "palette" || sheet === "more") choice.current = sheet;
  const shown = choice.current;
  const title = shown === "more" ? "More" : (CARDS.find((c) => c.id === shown)?.label ?? "");

  return (
    <>
      <div
        className={`no-bar flex min-h-0 flex-1 flex-col gap-2.5 md:p-3 [&>*]:shrink-0 ${
          scroll ? "overflow-y-auto overscroll-contain pb-3 md:pb-3" : "md:overflow-y-auto"
        }`}
      >
        <Banner />
        {cards && (
          <div className="grid grid-cols-2 gap-2">
            {CARDS.filter((card) => cards[card.id].length > 0).map((card) => (
              <SettingCard
                key={card.id}
                icon={card.icon}
                label={card.label}
                value={summary(cards[card.id], values)}
                set={summary(cards[card.id], values) !== "Auto"}
                thumb={thumbOf(cards[card.id], values)}
                onClick={() => setSheet(card.id)}
              />
            ))}
            {more.length > 0 && (
              <SettingCard icon="sliders" label="More" value={summary(more, values)} set={summary(more, values) !== "Auto"} onClick={() => setSheet("more")} />
            )}
            {refs.length > 0 && (
              <button
                type="button"
                onClick={() => setSheet("refs")}
                className="col-span-2 flex min-w-0 items-center gap-3 rounded-panel bg-t1/[0.05] px-3 py-2.5 text-left transition-colors duration-[120ms] hover:bg-t1/[0.09] active:bg-t1/[0.11]"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="flex items-center gap-1.5 text-[12px] text-t3">
                    <Icon name="layers" size={14} />
                    References
                    <span className="font-mono tabular-nums text-t4">
                      {listOf(values[images?.key ?? ""]).length}/{images?.maxItems ?? 30}
                    </span>
                  </span>
                  <span className={`truncate text-[13.5px] ${total ? "text-t1" : "text-t3"}`}>
                    {total ? `${total} added` : "Characters, places, clips, sound"}
                  </span>
                </span>
                {thumbs.length > 0 ? (
                  <span className="flex -space-x-2">
                    {thumbs.slice(0, 4).map((url) => (
                      <span key={url} className="h-9 w-9 overflow-hidden rounded-full bg-surface ring-2 ring-elevated">
                        {mediaKind(url) === "video" ? (
                          <video src={mediaSrc(url)} muted playsInline className="h-full w-full object-cover" />
                        ) : mediaKind(url) === "audio" ? (
                          <span className="grid h-full w-full place-items-center text-t3">
                            <Icon name="audio" size={14} />
                          </span>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaSrc(url)} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-t1/[0.08] text-t2">
                    <Icon name="plus" size={17} />
                  </span>
                )}
              </button>
            )}
          </div>
        )}
        <StudioPrompt
          text={prompt}
          placeholder={spec?.example ? `Describe the shot, e.g. ${spec.example}` : "Describe the shot"}
          onText={(text) => set("prompt", text)}
          onSubmit={() => void generate()}
          extra={flags.map((field) => (
            <FieldChip key={field.key} field={field} values={values} onChange={set} />
          ))}
          onElement={(element) => {
            if (!images) return;
            const now = listOf(values[images.key]);
            const pictures = element.images.map((ref) => ref.storageUrl).filter((url) => !now.includes(url));
            set(images.key, [...now, ...pictures].slice(0, images.maxItems ?? 30));
          }}
        />
        <TileChips.Provider value>
          <div className="grid grid-cols-3 gap-2">
            {bottom.map((field) => (
              <div key={field.key} className="min-w-0">
                <FieldChip field={field} values={values} onChange={set} />
              </div>
            ))}
            <div className="min-w-0">
              <BatchChip value={count} onChange={setCount} />
            </div>
            <div className="min-w-0 empty:hidden">
              <ProjectChip full />
            </div>
          </div>
        </TileChips.Provider>
        {error && (
          <p role="alert" className="flex items-start gap-1.5 px-1 text-[12.5px] leading-snug" style={{ color: "var(--danger)" }}>
            <Icon name="alert" size={15} className="mt-px shrink-0" />
            {error}
          </p>
        )}
      </div>
      <div className="shrink-0 pt-2.5 md:border-t md:border-line md:p-3">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={!!hfKey && (busy || !!blocker)}
          title={blocker ?? undefined}
          className="cta flex h-12 w-full items-center justify-center gap-2 rounded-panel text-[15.5px] font-semibold disabled:opacity-40"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : !hfKey ? (
            <>
              <Icon name="key" size={17} />
              Add your {PROVIDER_NAME.higgsfield} key
            </>
          ) : (
            <>
              Generate{count > 1 ? ` ×${count}` : ""}
              <Icon name="spark" size={15} fill="currentColor" strokeWidth={1.2} />
              {price && <span className="font-mono text-[13px] font-medium tabular-nums opacity-70">{price}</span>}
            </>
          )}
        </button>
        <p className="mt-2 truncate text-center text-[11.5px] text-t4">
          {hfKey && blocker ? blocker : <span className="hidden md:inline">⌘↵ to generate</span>}
        </p>
      </div>
      {cards && (
        <>
          <CameraSheet open={sheet === "camera"} fields={cards.camera} values={values} onSet={set} onClose={() => setSheet(null)} />
          <ChoiceSheet
            key={shown}
            open={sheet === shown}
            title={title}
            fields={shown === "more" ? more : cards[shown]}
            values={values}
            onSet={set}
            onClose={() => setSheet(null)}
          />
        </>
      )}
      <ReferencesSheet open={sheet === "refs"} fields={refs} values={values} onSet={set} onClose={() => setSheet(null)} />
    </>
  );
}
