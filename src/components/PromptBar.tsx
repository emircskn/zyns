"use client";

import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { BorderBeam } from "border-beam";
import { Control, InputLabel, chipCaption, sourceItems } from "@/components/controls";
import { PillGroup } from "@/components/PillGroup";
import { Icon, type IconName } from "@/components/Icon";
import { MetalButton } from "@/components/MetalButton";
import { Popover } from "@/components/Popover";
import { submitRun } from "@/lib/generate";
import { GLIDE_TRANSITION, useGlide } from "@/lib/useGlide";
import {
  imageName,
  imageRefs,
  imageTokens,
  insertMention,
  mentionAtCaret,
  mentionNames,
  mentionSources,
  usedMentions,
} from "@/lib/mentions";
import { VendorBadge } from "@/components/VendorMark";
import { AddChip, AttachRow, useAttach } from "@/components/Attachments";
import { ProjectChip } from "@/components/ProjectMenu";
import { attachMedia, isAttachField } from "@/lib/attach";
import type { LibraryElement } from "@/lib/elements";
import { mediaSrc } from "@/lib/storage/client";
import { activeFields, barAndPanel, providerOf, shownInputs, tabOf, validateValues, type Field } from "@/lib/registry";
import { estimateCredits, formatCredits } from "@/lib/registry/pricing";
import { useEstimate } from "@/lib/useEstimate";
import { activeKey, openPickerHere, useModel, useStudio, useValues } from "@/store/studio";
import { ErrorPopup } from "@/components/ErrorPopup";

/**
 * A model's second prompt box (Suno's lyrics, a negative prompt) stays folded
 * behind a "+ Lyrics" link until it is opened or holds something: most runs
 * never touch it, and two empty boxes read as two things you must fill.
 */
export function useFoldedPrompts(fields: Field[], values: Record<string, unknown>, modelId: string) {
  const [opened, setOpened] = useState<string[]>([]);
  const filled = (f: Field) => typeof values[f.key] === "string" && (values[f.key] as string).trim() !== "";
  const isOpen = (f: Field, index: number) => index === 0 || filled(f) || opened.includes(`${modelId}:${f.key}`);
  return {
    shown: fields.filter(isOpen),
    folded: fields.filter((f, index) => !isOpen(f, index)),
    open: (f: Field) => setOpened((current) => [...current, `${modelId}:${f.key}`]),
  };
}

export function PromptFolds({ folded, onOpen }: { folded: Field[]; onOpen: (field: Field) => void }) {
  if (folded.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-1 pb-2">
      {folded.map((field) => (
        <button
          key={field.key}
          type="button"
          onClick={() => onOpen(field)}
          className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[12.5px] text-t3 transition-colors duration-[120ms] hover:text-t1"
        >
          <Icon name="plus" size={13} />
          {field.label}
        </button>
      ))}
    </div>
  );
}

/** Past this many tabs, the rest of a desktop's strip waits behind More. */
const STRIP_TABS = 4;

/** The modes a model offers as tabs, and how each is named. */
function useModeTabs() {
  const model = useModel();
  const values = useValues();
  const setMode = useStudio((s) => s.setMode);
  const current = model ? tabOf(model, values) : "";
  // A mode folded into another tab (Edit into Generate) is not a choice, and
  // one that works on an earlier result is offered on that result; it shows
  // here only while it is the one in use, so the bar says what it will do.
  const tabs = model?.modes?.filter((mode) => !mode.hidden && (!mode.action || mode.id === current)) ?? [];
  // The folded tab makes from text or from a picture, so it is named for
  // neither: "Text to video" beside "Reference" said the picture slot under
  // it was not for pictures.
  const item = (mode: (typeof tabs)[number]) => ({
    id: mode.id,
    label: mode.id === model?.autoMode?.text ? "Generate" : mode.label,
    hint: mode.id === model?.autoMode?.text ? undefined : mode.hint,
  });
  return { model, tabs, current, item, setMode };
}

/**
 * The side composer's modes: words with a line under the one in use, as a
 * page's own sections read, scrolling sideways when there are many.
 */
export function ModeTabs() {
  const { model, tabs, current, item, setMode } = useModeTabs();
  const root = useRef<HTMLDivElement>(null);
  const { box, settled } = useGlide(root, current, [model?.id, tabs.length]);
  if (!model || tabs.length < 2) return null;
  return (
    <div ref={root} role="tablist" className="no-bar relative -mx-1 flex shrink-0 gap-4 overflow-x-auto px-1 pb-2">
      {tabs.map((mode) => {
        const on = mode.id === current;
        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={on}
            data-pill={mode.id}
            title={item(mode).hint}
            onClick={() => setMode(mode.id)}
            className={`shrink-0 whitespace-nowrap pb-1.5 text-[14px] transition-colors duration-[150ms] ${
              on ? "font-semibold text-t1" : "text-t3 hover:text-t1"
            }`}
          >
            {item(mode).label}
          </button>
        );
      })}
      {box && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 h-[2px] rounded-full bg-t1"
          style={{
            top: box.y + box.h - 2,
            width: box.w,
            transform: `translateX(${box.x}px)`,
            transition: settled ? GLIDE_TRANSITION : "none",
          }}
        />
      )}
    </div>
  );
}

export function ModeStrip({ flush, fill }: { flush?: boolean; fill?: boolean }) {
  const { model, tabs, current, item, setMode } = useModeTabs();
  // A single mode is not a choice — the strip only earns its place from two.
  if (!model || tabs.length < 2) return null;
  // A phone's strip scrolls sideways under the thumb; a desktop's keeps its
  // first few and the tab in use, and lists the rest behind More.
  let shown = tabs;
  let rest: typeof tabs = [];
  if (!flush && tabs.length > STRIP_TABS + 1) {
    shown = tabs.slice(0, STRIP_TABS - 1);
    const active = tabs.find((mode) => mode.id === current);
    shown.push(active && !shown.includes(active) ? active : tabs[STRIP_TABS - 1]);
    rest = tabs.filter((mode) => !shown.includes(mode));
  }

  return (
    <div key={model.id} className={`anim-swap flex items-center justify-start gap-1.5 ${flush ? "" : "mb-2"}`}>
      <PillGroup
        className={`!bg-elevated ring-1 ring-inset ring-line ${fill && shown.length <= 3 ? "w-full" : ""}`}
        fill={fill && shown.length <= 3}
        value={current}
        onChange={setMode}
        items={shown.map(item)}
      />
      {rest.length > 0 && (
        <Popover
          align="start"
          width={240}
          trigger={(open) => (
            <span
              className={`flex h-[38px] items-center gap-1 rounded-full bg-elevated px-3.5 text-[13px] ring-1 ring-inset ring-line transition-colors duration-[120ms] ${
                open ? "text-t1" : "text-t3 hover:text-t1"
              }`}
            >
              More
              <Icon name="chevron" size={15} className={`transition-transform duration-[200ms] ${open ? "rotate-180" : ""}`} />
            </span>
          )}
        >
          {(close) =>
            rest.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setMode(mode.id);
                  close();
                }}
                className="flex w-full flex-col items-start rounded-chip px-3 py-2 text-left transition-colors duration-[120ms] hover:bg-t1/[0.06]"
              >
                <span className="text-[13.5px] text-t1">{item(mode).label}</span>
                {mode.hint && <span className="text-[11.5px] leading-snug text-t4">{mode.hint}</span>}
              </button>
            ))
          }
        </Popover>
      )}
    </div>
  );
}

/**
 * Height-animating wrapper. A mode that brings its own reference inputs used
 * to snap the bar to its new size; now the bar grows and shrinks into it.
 * The box is clipped only while it moves, so a popover inside can still
 * escape it at rest.
 */
export function Reveal({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const known = useRef<number | null>(null);

  useLayoutEffect(() => {
    const node = inner.current;
    if (!node) return;
    const measure = () => {
      const next = node.offsetHeight;
      if (next === known.current) return;
      // The first measurement runs from `auto`, which cannot animate, so it
      // lands silently; every later one is a real change worth showing.
      if (known.current !== null) setMoving(true);
      known.current = next;
      setHeight(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!moving) return;
    const timer = window.setTimeout(() => setMoving(false), 380);
    return () => window.clearTimeout(timer);
  }, [moving, height]);

  return (
    <div
      className="reveal"
      style={{ height: height ?? undefined, overflow: moving ? "hidden" : undefined }}
    >
      {/* flow-root keeps a child's bottom margin inside the measured box,
          so spacing under the reference strip survives. */}
      <div ref={inner} className="flow-root">
        {children}
      </div>
    </div>
  );
}

function InputStrip({ fields }: { fields: Field[] }) {
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  if (fields.length === 0) return null;

  // One slot takes the whole bar and keeps its thumbs on a single line;
  // several share it in columns, where each one's thumbs wrap after three.
  const lane = fields.length === 1;

  return (
    <div className="anim-swap mb-2 border-b border-line pb-3 sm:max-h-[32vh] sm:overflow-y-auto">
      <div
        className={`no-bar -mx-1 flex gap-4 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 ${
          lane ? "" : "sm:grid sm:gap-x-4 sm:gap-y-3 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {fields.map((field) => (
          <div key={field.key} className={`shrink-0 sm:w-auto ${lane ? "w-full min-w-0" : "w-[168px]"}`}>
            <InputLabel field={field} />
            <Control
              field={field}
              value={values[field.key]}
              values={values}
              compact
              lane={lane}
              roomy
              onChange={(value) => setValue(field.key, value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A tiny frame drawn in the selected aspect ratio — the chip shows its shape. */
function RatioGlyph({ value }: { value: unknown }) {
  const [w, h] = String(value ?? "").split(":").map(Number);
  const valid = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
  const scale = valid ? 13 / Math.max(w, h) : 0;
  return (
    <span className="grid h-4 w-4 place-items-center">
      {valid ? (
        <span
          className="rounded-[2px] border-[1.5px] border-current"
          style={{
            width: Math.max(w * scale, 4),
            height: Math.max(h * scale, 4),
            transition: "width var(--d-slow) var(--ease-spring), height var(--d-slow) var(--ease-spring)",
          }}
        />
      ) : (
        <Icon name="grid" size={15} />
      )}
    </span>
  );
}

const CHIP_ICON: Array<[RegExp, IconName]> = [
  [/^duration|_seconds$|extend_times|continue_at/, "clock"],
  [/resolution|^quality$|upscale_factor/, "monitor"],
  [/audio|sound|instrumental|loop/, "audio"],
  [/^model$|^version$|^generation_type$|^mode$|persona_model/, "layers"],
  [/voice|vocal_gender|speaker/, "mic"],
  [/style|rendering_speed|template/, "palette"],
  [/num_images|max_images|^n$|index/, "hash"],
];

function chipIcon(field: Field, value: unknown): ReactNode {
  if (field.kind === "ratio" || /aspect_ratio|^ratio$|image_size|^size$/.test(field.key)) {
    return <RatioGlyph value={value} />;
  }
  const hit = CHIP_ICON.find(([re]) => re.test(field.key));
  return hit ? <Icon name={hit[1]} size={16} /> : null;
}

/**
 * The phone's composer has the whole screen to itself, so its chips are
 * thumb-sized; the bar keeps its compact ones. Set by the composer around
 * its chip row rather than threaded through every chip.
 */
export const LargeChips = createContext(false);

/**
 * The side composer's options sit in a grid of equal tiles rather than a row
 * of pills: each chip fills its cell and reads left to right.
 */
export const TileChips = createContext(false);

export function Chip({
  icon,
  value,
  active,
}: {
  icon?: ReactNode;
  value: string;
  active?: boolean;
}) {
  const large = useContext(LargeChips);
  const tile = useContext(TileChips);
  if (tile) {
    return (
      <span
        className={`flex h-11 w-full min-w-0 select-none items-center gap-2 rounded-card px-3 text-[14px] transition-colors duration-[120ms] ${
          active ? "bg-t1 text-canvas" : "bg-t1/[0.06] text-t1 hover:bg-t1/[0.1]"
        }`}
      >
        <span className={`shrink-0 ${active ? "" : "text-t2"}`}>{icon}</span>
        <span className="min-w-0 truncate">{value}</span>
      </span>
    );
  }
  return (
    <span
      className={`flex select-none items-center whitespace-nowrap rounded-full transition-all duration-[120ms] ${
        large
          ? "h-10 gap-2 px-3.5 text-[14px]"
          : "h-8 gap-1.5 px-3 text-[12.5px] md:h-[34px] md:gap-[7px] md:px-3.5 md:text-[13px]"
      } ${
        active ? "bg-t1 text-canvas" : "bg-t1/[0.07] text-t2 hover:bg-t1/[0.12] hover:text-t1"
      }`}
    >
      {icon}
      {value}
    </span>
  );
}

/**
 * A flag on the bar, like a model's own audio: the chip names it and a
 * switch inside says whether it is on. A chip that simply turned white read
 * as pressed rather than as on, and it was not plain that tapping it again
 * was the way to turn the thing back off.
 */
function ToggleChip({ field, on, onFlip }: { field: Field; on: boolean; onFlip: () => void }) {
  const large = useContext(LargeChips);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={field.label}
      onClick={onFlip}
      title={field.help}
      className={`flex select-none items-center whitespace-nowrap rounded-full bg-t1/[0.07] transition-colors duration-[120ms] hover:bg-t1/[0.12] ${
        on ? "text-t1" : "text-t3 hover:text-t1"
      } ${
        large
          ? "h-10 gap-2 pl-3.5 pr-2.5 text-[14px]"
          : "h-8 gap-1.5 pl-3 pr-2 text-[12.5px] md:h-[34px] md:gap-[7px] md:pl-3.5 md:pr-2.5 md:text-[13px]"
      }`}
    >
      {chipIcon(field, on)}
      {field.label}
      <span
        aria-hidden="true"
        className={`relative ml-0.5 shrink-0 rounded-full transition-colors duration-[200ms] ${
          large ? "h-[20px] w-[34px]" : "h-[18px] w-[30px]"
        } ${on ? "bg-t1" : "bg-t1/[0.18]"}`}
      >
        <span
          className={`absolute top-[2px] rounded-full transition-all duration-[200ms] ${
            large ? "h-4 w-4" : "h-[14px] w-[14px]"
          } ${on ? "bg-canvas" : "bg-t1/80"}`}
          style={{
            left: on ? (large ? 16 : 14) : 2,
            transitionTimingFunction: "var(--ease-spring)",
          }}
        />
      </span>
    </button>
  );
}

/**
 * How many copies of this run to send. Most image models return one picture
 * a call, so the count is ours to keep rather than a field on the request:
 * the bar simply sends the same thing that many times. Models that batch
 * themselves have their own control and do not get this one.
 */
export function BatchChip() {
  const batch = useStudio((s) => s.batch);
  const setBatch = useStudio((s) => s.setBatch);
  const large = useContext(LargeChips);
  const tile = useContext(TileChips);
  const step = (by: number) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setBatch(batch + by);
  };
  return (
    <span
      title="How many to make"
      className={`flex select-none items-center gap-1 text-t2 ${
        tile
          ? "h-11 w-full justify-between rounded-card bg-t1/[0.06] px-1.5 text-[14px] text-t1"
          : large
            ? "h-10 rounded-full bg-t1/[0.07] px-1.5 text-[14px]"
            : "h-8 rounded-full bg-t1/[0.07] pl-1 pr-1 text-[12.5px] md:h-[34px] md:text-[13px]"
      }`}
    >
      <button
        type="button"
        onClick={step(-1)}
        disabled={batch <= 1}
        aria-label="One fewer"
        className={`grid place-items-center rounded-full transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1 disabled:opacity-35 disabled:hover:bg-transparent ${
          large ? "h-7 w-7" : "h-6 w-6 md:h-[26px] md:w-[26px]"
        }`}
      >
        <Icon name="minus" size={14} strokeWidth={2.2} />
      </button>
      <span className="min-w-[34px] text-center font-mono tabular-nums">{batch}/4</span>
      <button
        type="button"
        onClick={step(1)}
        disabled={batch >= 4}
        aria-label="One more"
        className={`grid place-items-center rounded-full transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1 disabled:opacity-35 disabled:hover:bg-transparent ${
          large ? "h-7 w-7" : "h-6 w-6 md:h-[26px] md:w-[26px]"
        }`}
      >
        <Icon name="plus" size={14} strokeWidth={2.2} />
      </button>
    </span>
  );
}

export function FieldChip({ field }: { field: Field }) {
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const value = values[field.key];

  // Booleans read better as a chip you flip than as a chip that opens a menu.
  if (field.kind === "toggle") {
    return <ToggleChip field={field} on={value === true} onFlip={() => setValue(field.key, value !== true)} />;
  }

  const width = field.kind === "ratio" ? 296 : field.kind === "slider" ? 236 : 248;
  const tile = useContext(TileChips);

  return (
    <Popover
      width={width}
      full={tile}
      title={field.label}
      trigger={(open) => (
        <Chip icon={chipIcon(field, value)} value={chipCaption(field, value, values)} active={open} />
      )}
    >
      <div className="p-1">
        <Control
          field={field}
          value={value}
          values={values}
          dense
          onChange={(next) => setValue(field.key, next)}
        />
        {field.help && (
          <p className="px-1.5 pb-1 pt-2.5 text-[11.5px] leading-snug text-t3">{field.help}</p>
        )}
      </div>
    </Popover>
  );
}

/**
 * A name the prompt can point at with `@`, and the picture it stands for:
 * the model's own names (Kling elements, attached Image 1…N), or an element
 * from the library.
 */
type MentionOption = { name: string; thumb?: string; element?: LibraryElement };

function optionMatches(option: MentionOption, query: string) {
  const q = query.toLowerCase();
  const name = option.name.toLowerCase();
  if (name.startsWith(q) || name.replace(/\s+/g, "").startsWith(q)) return true;
  // `@2` finds Image 2.
  return !!option.thumb && /^\d+$/.test(q) && name.split(" ")[1]?.startsWith(q) === true;
}

/** The text box's properties that decide where a letter lands. */
const TYPESET = [
  "box-sizing", "width", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "font-family", "font-size", "font-weight", "font-style", "letter-spacing", "line-height",
  "text-transform", "word-spacing", "text-indent", "tab-size",
];

/**
 * Where character `at` of a textarea sits on screen, and how tall its line
 * is: a hidden copy of the box is laid out with the same text and type, and
 * a mark at that character is measured.
 */
function caretPoint(node: HTMLTextAreaElement, at: number) {
  const style = getComputedStyle(node);
  const copy = document.createElement("div");
  for (const name of TYPESET) copy.style.setProperty(name, style.getPropertyValue(name));
  Object.assign(copy.style, {
    position: "absolute",
    visibility: "hidden",
    top: "0",
    left: "-9999px",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    wordBreak: style.wordBreak,
  });
  copy.textContent = node.value.slice(0, at);
  const mark = document.createElement("span");
  mark.textContent = node.value.slice(at, at + 1) || ".";
  copy.appendChild(mark);
  document.body.appendChild(copy);
  const x = mark.offsetLeft;
  const y = mark.offsetTop;
  copy.remove();
  const rect = node.getBoundingClientRect();
  const line = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.4;
  return { left: rect.left + x - node.scrollLeft, top: rect.top + y - node.scrollTop, height: line };
}

/**
 * The prompt textarea with `@` completion: typing `@` lists the elements
 * defined for this model or, for models that take several pictures, the
 * attached references as Image 1…N. A pick drops the token at the caret.
 *
 * A textarea cannot hold chips, so the `@Image N` tokens are drawn by a copy
 * of the text laid out exactly behind it: the textarea's own glyphs go
 * transparent (its caret and selection stay), and the copy paints the text
 * with each token on its chip. The same copy tells which chip is under the
 * pointer, for the enlarged look at its picture.
 */
export function PromptField({
  field,
  index,
  names,
  onSubmit,
  trailing,
  inputRef,
  large,
  clamp,
}: {
  field: Field;
  index: number;
  names: string[];
  onSubmit: () => void;
  trailing?: ReactNode;
  inputRef?: (node: HTMLTextAreaElement | null) => void;
  /** The phone composer's: a page of room to write in rather than a line. */
  large?: boolean;
  /** Held to a few lines, fading out where a long prompt goes on. */
  clamp?: boolean;
}) {
  const model = useModel();
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const text = (values[field.key] as string) ?? "";
  const ref = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null);

  const refs = model && names.length === 0 ? imageRefs(model, values) : [];
  const library = useStudio((s) => s.elements);
  const own: MentionOption[] =
    names.length > 0 ? names.map((name) => ({ name })) : refs.map((url, i) => ({ name: imageName(i), thumb: url }));
  const options: MentionOption[] = [
    ...own,
    ...library
      .filter((element) => !own.some((o) => o.name === element.name))
      .map((element) => ({ name: element.name, thumb: element.images[0]?.storageUrl, element })),
  ];
  const chips = refs.length > 0 ? imageTokens(text).filter((t) => t.index < refs.length) : [];
  const chipped = chips.length > 0;
  // A caret set down inside a chip is not writing a new one.
  const inChip = caret !== null && chips.some((chip) => caret > chip.start && caret <= chip.end);
  const token = caret === null || options.length === 0 || inChip ? null : mentionAtCaret(text, caret);
  const matches = token ? options.filter((option) => optionMatches(option, token.query)) : [];
  const open = !!token && matches.length > 0 && dismissed !== token.start;

  // Portalled for the same reason as Popover: inside the bar the beam's glow
  // layers paint over it. Set just under the line the caret is on, or just
  // over it when there is no room below (the desktop bar sits at the foot
  // of the screen); measured before paint, and again as the text moves.
  const row = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      setSpot(null);
      return;
    }
    const measure = () => {
      const node = ref.current;
      if (!node) return;
      const margin = 16;
      const w = Math.min(260, window.innerWidth - 2 * margin);
      const point = caretPoint(node, token?.start ?? node.selectionStart);
      // What the keyboard leaves of the screen, on a phone.
      const view = window.visualViewport;
      const viewTop = view?.offsetTop ?? 0;
      const viewBottom = viewTop + (view?.height ?? window.innerHeight);
      const left = Math.max(margin, Math.min(point.left - 12, window.innerWidth - margin - w));
      const below = point.top + point.height + 6;
      const room = viewBottom - below - margin;
      if (room >= Math.min(200, 56 * matches.length + 40)) setSpot({ left, top: below, width: w });
      else setSpot({ left, bottom: window.innerHeight - Math.max(viewTop + margin, point.top - 6), width: w });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [open, text, token?.start, matches.length]);

  useEffect(() => setCursor(0), [token?.query]);

  // The copy scrolls with the textarea once the prompt outgrows the box.
  useLayoutEffect(() => {
    if (mirror.current && ref.current) mirror.current.scrollTop = ref.current.scrollTop;
  });

  // Whether a held prompt runs on past what is shown, so its end can fade.
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    const node = ref.current;
    const over = !!clamp && !!node && node.scrollHeight > node.clientHeight + 2;
    if (over !== overflowing) setOverflowing(over);
  });

  // The chip under the pointer (or the finger's last tap) and where it is.
  const [peek, setPeek] = useState<{ index: number; rect: DOMRect } | null>(null);
  useEffect(() => {
    if (!peek) return;
    const close = () => setPeek(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [peek]);
  const peekUrl = peek ? refs[peek.index] : undefined;

  function chipAt(x: number, y: number) {
    const node = mirror.current;
    if (!node) return null;
    for (const chip of node.querySelectorAll<HTMLElement>("[data-chip]")) {
      for (const rect of chip.getClientRects()) {
        if (x >= rect.left - 2 && x <= rect.right + 2 && y >= rect.top - 2 && y <= rect.bottom + 2) {
          return { index: Number(chip.dataset.chip), rect };
        }
      }
    }
    return null;
  }

  // The caret after an edit of ours is set in the same commit as the new
  // text: a frame later, a key typed in between would already have landed
  // at the end, where React leaves the caret when it writes the value.
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const at = pendingCaret.current;
    const node = ref.current;
    if (at === null || !node) return;
    pendingCaret.current = null;
    node.focus();
    node.setSelectionRange(at, at);
    setCaret(at);
  });

  function placeCaret(at: number) {
    pendingCaret.current = at;
  }

  function syncCaret() {
    const node = ref.current;
    if (node) setCaret(node.selectionStart);
  }

  function pick(option: MentionOption) {
    if (!token) return;
    const next = insertMention(text, token.start, caret ?? text.length, option.name);
    setValue(field.key, next.text);
    setDismissed(null);
    placeCaret(next.caret);
    // A library element brings its pictures along, into the model's own
    // picture slots, where they show before anything is sent.
    if (option.element) {
      const attached = new Set(Object.values(values).flat().filter((v): v is string => typeof v === "string"));
      const pictures = option.element.images.map((ref) => ref.storageUrl).filter((url) => !attached.has(url));
      if (pictures.length > 0) attachMedia(pictures.map((url) => ({ url, kind: "image" as const })));
    }
  }

  // A chip goes as one piece: Backspace at its end (or Delete at its start)
  // takes the whole token rather than leaving a stray `@Image`.
  function eraseChip(event: KeyboardEvent<HTMLTextAreaElement>) {
    const node = event.currentTarget;
    if (node.selectionStart !== node.selectionEnd) return false;
    const at = node.selectionStart;
    const chip = chips.find((c) =>
      event.key === "Backspace" ? at > c.start && at <= c.end : at >= c.start && at < c.end,
    );
    if (!chip) return false;
    event.preventDefault();
    // One of the spaces either side goes too, so no double gap is left.
    const end = text[chip.end] === " " && (chip.start === 0 || text[chip.start - 1] === " ") ? chip.end + 1 : chip.end;
    setValue(field.key, text.slice(0, chip.start) + text.slice(end));
    placeCaret(chip.start);
    return true;
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    setPeek(null);
    if ((event.key === "Backspace" || event.key === "Delete") && !event.altKey && !event.metaKey && !event.ctrlKey) {
      if (eraseChip(event)) return;
    }
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
  }

  // The copy and the textarea share every rule that decides where a letter
  // lands; only the box around the textarea is its own.
  const type = large
    ? "text-[16.5px] font-medium leading-[1.45] tracking-[-0.012em]"
    : "px-1 pt-[5px] text-[16px] leading-relaxed tracking-[-0.011em] md:pt-1.5 md:text-[15px]";

  const copy: ReactNode[] = [];
  if (chipped) {
    let last = 0;
    for (const chip of chips) {
      copy.push(text.slice(last, chip.start));
      copy.push(
        <span key={chip.start} data-chip={chip.index} className="prompt-chip">
          {text.slice(chip.start, chip.end)}
        </span>,
      );
      last = chip.end;
    }
    // A closing line break only takes room with something after it.
    copy.push(text.slice(last) + "​");
  }

  return (
    <div ref={row} className="relative mb-2 flex items-start gap-2">
      <div className="relative min-w-0 flex-1">
        {chipped && (
          <div
            ref={mirror}
            aria-hidden
            className={`no-bar pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-t1 ${type} ${
              overflowing ? "[mask-image:linear-gradient(to_bottom,black_62%,transparent)]" : ""
            }`}
          >
            {copy}
          </div>
        )}
        <textarea
          data-prompt-input={index === 0 ? "" : undefined}
          ref={(node) => {
            ref.current = node;
            inputRef?.(node);
          }}
          value={text}
          onChange={(event) => {
            setValue(field.key, event.target.value);
            setCaret(event.target.selectionStart);
            setPeek(null);
          }}
          onKeyDown={onKeyDown}
          onKeyUp={syncCaret}
          onClick={syncCaret}
          onSelect={syncCaret}
          onScroll={(event) => {
            if (mirror.current) mirror.current.scrollTop = event.currentTarget.scrollTop;
          }}
          onPointerMove={(event) => {
            if (event.pointerType !== "mouse" || !chipped) return;
            const hit = chipAt(event.clientX, event.clientY);
            setPeek((now) => (hit?.index === now?.index ? now : hit));
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setPeek(null);
          }}
          onPointerUp={(event) => {
            // No hover on a phone: a tap on a chip shows its picture, the
            // next tap anywhere else puts it away.
            if (event.pointerType === "mouse") return;
            const hit = chipped ? chipAt(event.clientX, event.clientY) : null;
            setPeek((now) => (hit && hit.index !== now?.index ? hit : null));
          }}
          onBlur={() => {
            window.setTimeout(() => setCaret(null), 120);
            setPeek(null);
          }}
          rows={large ? (index === 0 ? 6 : 2) : index === 0 ? 2 : 1}
          placeholder={field.placeholder ?? `${field.label}…`}
          className={`relative block w-full resize-none bg-transparent text-t1 outline-none placeholder:text-t4 ${type} ${
            large ? "min-h-[104px] placeholder:font-normal" : "max-h-40"
          } ${clamp ? "no-bar max-h-[122px] overflow-hidden" : ""} ${
            overflowing ? "[mask-image:linear-gradient(to_bottom,black_62%,transparent)]" : ""
          } ${chipped ? "no-bar text-transparent caret-t1" : ""}`}
        />
      </div>
      {trailing}
      {peek &&
        peekUrl &&
        createPortal(
          <ChipPeek url={peekUrl} name={imageName(peek.index)} rect={peek.rect} />,
          document.body,
        )}
      {open &&
        spot &&
        createPortal(
        <div
          className="surface-pop anim-rise fixed z-[90] max-h-[min(340px,50vh)] overflow-y-auto rounded-panel p-1.5"
          style={{ left: spot.left, top: spot.top, bottom: spot.bottom, width: spot.width }}
          role="listbox"
        >
          {matches.map((option, i) => (
            <Fragment key={`${option.element ? "library" : "own"}-${option.name}`}>
            {(i === 0 || !!matches[i - 1].element !== !!option.element) && (
              <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-t3">
                {option.element ? "Your elements" : names.length > 0 ? "Elements" : "References"}
              </div>
            )}
            <button
              type="button"
              role="option"
              aria-selected={i === cursor}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(option)}
              onMouseEnter={() => setCursor(i)}
              className={`flex w-full items-center gap-2.5 rounded-full text-left text-[13.5px] transition-colors duration-[120ms] ${
                option.thumb ? "py-1.5 pl-1.5 pr-3" : "px-3 py-2"
              } ${i === cursor ? "bg-t1 text-canvas" : "text-t2"}`}
            >
              {option.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaSrc(option.thumb)}
                  alt=""
                  draggable={false}
                  className="h-8 w-8 shrink-0 rounded-full bg-t1/[0.07] object-cover"
                />
              ) : (
                <Icon name="at" size={16} className="shrink-0" />
              )}
              <span className="truncate">{option.element ? `@${option.name}` : option.name}</span>
            </button>
            </Fragment>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

/** The enlarged look at a chip's picture, standing over the chip. */
function ChipPeek({ url, name, rect }: { url: string; name: string; rect: DOMRect }) {
  const margin = 16;
  const half = 104;
  const center = Math.max(margin + half, Math.min(rect.left + rect.width / 2, window.innerWidth - margin - half));
  return (
    <div
      className="surface-pop anim-pop pointer-events-none fixed z-[95] -translate-x-1/2 rounded-card p-1.5"
      style={{ left: center, bottom: window.innerHeight - rect.top + 10 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        draggable={false}
        className="block h-auto max-h-[200px] w-auto min-w-[120px] max-w-[196px] rounded-[10px] bg-t1/[0.07] object-contain"
      />
      <div className="px-1 pb-0.5 pt-1.5 text-center text-[12px] font-medium text-t2">@{name}</div>
    </div>
  );
}

/**
 * The names a prompt may point at, as tap-to-insert tokens, plus a way to
 * define more. Only shown for models whose API understands `@name`.
 */
export function MentionStrip({
  names,
  text,
  onInsert,
  onDefine,
}: {
  names: string[];
  text: string;
  onInsert: (name: string) => void;
  /** Where more are defined; left out when they are already in view above. */
  onDefine?: () => void;
}) {
  const used = usedMentions(text, names);
  if (names.length === 0 && !onDefine) return null;
  return (
    <div className="anim-swap mb-2 flex flex-wrap items-center gap-1 px-0.5">
      <span className="mr-0.5 grid h-[26px] w-[26px] place-items-center text-t3" title="Reference an element with @name">
        <Icon name="at" size={16} />
      </span>
      {names.map((name) => {
        const active = used.has(name);
        return (
          <button
            key={name}
            type="button"
            onClick={() => onInsert(name)}
            title={active ? `@${name} is in the prompt` : `Insert @${name}`}
            className={`h-[26px] rounded-full px-2.5 font-mono text-[12px] transition-colors duration-[120ms] ${
              active ? "bg-t1 text-canvas" : "bg-t1/[0.07] text-t2 hover:bg-t1/[0.12] hover:text-t1"
            }`}
          >
            @{name}
          </button>
        );
      })}
      {onDefine && (
      <button
        type="button"
        onClick={onDefine}
        className="flex h-[26px] items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 text-[12px] text-t3 transition-colors duration-[120ms] hover:border-t1/40 hover:text-t1"
      >
        <Icon name="plus" size={14} />
        {names.length === 0 ? "Add an element to reference it with @" : "Element"}
      </button>
      )}
    </div>
  );
}

/**
 * The prompt box before a model exists. What is typed here is kept in the
 * store and moves into the model's own prompt the moment one is chosen, so
 * you can start writing and pick the model after.
 */
function DraftField({ trailing, onSubmit }: { trailing?: ReactNode; onSubmit: () => void }) {
  const draft = useStudio((s) => s.draft);
  const setDraft = useStudio((s) => s.setDraft);
  return (
    <div className="relative mb-2 flex items-start gap-2">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSubmit();
          }
        }}
        rows={2}
        placeholder="Describe what you want to make…"
        className="max-h-40 min-w-0 flex-1 resize-none bg-transparent px-1 pt-[5px] text-[16px] leading-relaxed tracking-[-0.011em] text-t1 outline-none placeholder:text-t4 md:pt-1.5 md:text-[15px]"
      />
      {trailing}
    </div>
  );
}

/**
 * The studio's one input. It docks at the bottom of a page that makes
 * things, and stands in the middle of the home screen; both are the same
 * box, so what you type survives the move between them.
 */
export function useComposer() {
  const model = useModel();
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  const fields = model ? activeFields(model, values) : [];
  const promptFields = fields.filter((f) => f.placement === "prompt");
  // An optional picker of earlier results with nothing to pick (no
  // characters made yet, say) is only a note taking room from the prompt;
  // the mode that makes them is a tap away above.
  const runs = useStudio((s) => s.runs);
  const inputFields = shownInputs(fields.filter((f) => f.placement === "input")).filter((f) => {
    if (f.kind !== "source" || f.required || !model) return true;
    const value = values[f.key];
    const picked = Array.isArray(value) ? value.length > 0 : !!value;
    return picked || sourceItems(f, runs, model.id).length > 0;
  });
  // Files go through the one "+" and sit as thumbs over the prompt; the
  // rest of the inputs (lines, pickers, trimmed clips) keep their slots.
  const attachFields = inputFields.filter(isAttachField);
  const stripFields = inputFields.filter((f) => !isAttachField(f));
  const { bar: barFields, panel: panelFields } = barAndPanel(fields);

  // A picture at a time, and nothing in the request that asks for more: then
  // the count is ours to send. Models with their own count keep it.
  const batchable =
    !!model && model.output === "image" && !fields.some((f) => /^num_images$|^n$|^batch_size$/.test(f.key));
  const blocker = model ? validateValues(model, values) : "Choose a model to start";
  // What the send will cost: a KIE model from KIE's price list, where every
  // copy of a batch is a run of its own; a Higgsfield model from Higgsfield's
  // own estimate, asked as the settings change.
  const batch = useStudio((s) => s.batch);
  const higgsfield = providerOf(model) === "higgsfield";
  const estimate = useMemo(
    () => (model && !higgsfield ? estimateCredits(model, values) : undefined),
    [model, values, higgsfield],
  );
  const quoted = useEstimate(higgsfield ? model : undefined, values, blocker);
  const hint = higgsfield
    ? (quoted ?? model?.creditHint?.(values))
    : (model?.creditHint?.(values) ??
      (estimate !== undefined ? formatCredits(estimate * (batchable ? batch : 1)) : undefined));
  const sources = model ? mentionSources(model, values) : [];
  const mentionable = sources.length > 0;
  // Named references that sit in the bar are defined right there; only
  // those in the drawer need a way to it.
  const definedInPanel = sources.some((s) => s.field.placement === "panel");
  const names = mentionable && model ? mentionNames(model, values) : [];
  const firstPrompt = promptFields[0];

  // Tapping a token drops `@name` where the caret last was in the prompt.
  function insertToken(name: string) {
    if (!firstPrompt) return;
    const node = promptRef.current;
    const text = (values[firstPrompt.key] as string) ?? "";
    const caret = node?.selectionStart ?? text.length;
    const lead = caret > 0 && !/\s$/.test(text.slice(0, caret)) ? " " : "";
    const next = text.slice(0, caret) + lead + `@${name} ` + text.slice(caret);
    setValue(firstPrompt.key, next);
    requestAnimationFrame(() => {
      if (!node) return;
      const position = caret + lead.length + name.length + 2;
      node.focus();
      node.setSelectionRange(position, position);
    });
  }

  /** Sends the run, as many times as the batch asks; true when all went out. */
  async function run(): Promise<boolean> {
    setBusy(true);
    setError(null);
    // One send, several runs: they queue together and land in the gallery as
    // they finish. The first failure is the one worth showing.
    const copies = batchable ? useStudio.getState().batch : 1;
    const sent = useStudio.getState().modelId;
    let failure: string | null = null;
    for (let i = 0; i < copies; i++) {
      const result = await submitRun();
      if (!result.ok && !failure) failure = result.error ?? "Something went wrong.";
    }
    // A sent run takes its references with it: the next one starts with an
    // empty strip and the same prompt. The run keeps its own copy, so
    // Recreate brings them back. A send that failed leaves them to retry.
    if (failure) setError(failure);
    else useStudio.getState().clearInputs(sent);
    setBusy(false);
    return !failure;
  }

  return {
    model,
    values,
    busy,
    error,
    setError,
    promptRef,
    promptFields,
    inputFields,
    attachFields,
    stripFields,
    barFields,
    panelFields,
    batchable,
    blocker,
    hint,
    mentionable,
    definedInPanel,
    names,
    firstPrompt,
    insertToken,
    run,
  };
}

/**
 * The prompt box's slow breathing glow, shared by the desktop bar and the
 * phone's card so the two stay one effect.
 *
 * The library's greyscale palette is light greys, which glow on a dark card
 * and vanish on a white one. In the light theme the same greys are taken
 * down by its brightness multiplier into soft darks, so the glow reads there
 * too, as a shadow breathing at the edge rather than a light.
 */
const LIGHT_GLOW_BRIGHTNESS = 0.35;

function useMotionAllowed() {
  // Decided after mount so the server-rendered markup and the client agree.
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    setMotion(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return motion;
}

function Glow({
  children,
  active = true,
  radius,
}: {
  children: ReactNode;
  active?: boolean;
  /** Where the glowing box is not its first child, say its corner outright. */
  radius?: number;
}) {
  const theme = useStudio((s) => s.theme);
  const motion = useMotionAllowed();
  return (
    <BorderBeam
      size="pulse-inner"
      colorVariant="mono"
      // Greyscale has no hue to rotate, so the hue-shift filter is pure
      // cost. The theme is the one the user picked, not the OS's.
      staticColors
      theme={theme}
      active={motion && active}
      brightness={theme === "light" ? LIGHT_GLOW_BRIGHTNESS : undefined}
      borderRadius={radius}
      // The library's root is a block it sizes itself; the box has to keep
      // filling the column it sits in. It also clips to itself, which
      // swallowed the popovers that open above the bar — its glow layers
      // carry their own clip-path, so letting the box overflow is free.
      style={{ display: "block", width: "100%", overflow: "visible" }}
    >
      {children}
    </BorderBeam>
  );
}

/**
 * Publishes a docked box's height as --bar-h so the page can pad itself.
 * Only while the box is on screen: the phone's card and the desktop bar are
 * both mounted, one of them hidden by a breakpoint, and a hidden one
 * measuring zero must not win.
 */
function usePublishedHeight(node: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = node.current;
    if (!el || !enabled) return;
    let timer = 0;
    const apply = () => {
      if (el.offsetWidth === 0) return;
      document.documentElement.style.setProperty("--bar-h", `${el.offsetHeight}px`);
    };
    apply();
    // The height animates with the model and mode, and writing the variable
    // on every frame relaid out the whole page underneath it, so it is
    // published once the height settles, not while it moves.
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(apply, 140);
    });
    observer.observe(el);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [node, enabled]);
}

/**
 * A phone's prompt box while it is not being written in: what the prompt
 * says so far and the model it goes to, and nothing else on the screen. A
 * tap takes it to the full-screen composer, or to the catalogue when there
 * is no model yet.
 */
/**
 * Whether the page is being scrolled down, the way a phone's toolbars read
 * it: a push down past the top hides the thing, any real pull back up, or
 * reaching the top, brings it back. Small wobbles either way change nothing.
 */
function useScrollingDown(enabled: boolean) {
  const [down, setDown] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - last;
        if (y < 48) {
          setDown(false);
          last = y;
        } else if (Math.abs(dy) > 8) {
          setDown(dy > 0);
          last = y;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [enabled]);
  return enabled && down;
}

/** The pill the docked card folds into while the page scrolls down. */
const PILL_H = 44;
const MORPH = "420ms cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * A phone's prompt box while it is not being written in: what the prompt
 * says so far and the model it goes to, and nothing else on the screen. A
 * tap takes it to the full-screen composer, or to the catalogue when there
 * is no model yet. Docked, it folds into a small Keep Generate pill while
 * the page is scrolled down, so the media gets the screen, and opens back
 * out when the page is pulled back up.
 */
export function PromptCard({ placement }: { placement: "docked" | "center" }) {
  const model = useModel();
  const values = useValues();
  const draft = useStudio((s) => s.draft);
  const selecting = useStudio((s) => s.selecting);
  const selectMode = useStudio((s) => s.selectMode);
  const setComposer = useStudio((s) => s.setComposer);
  const setCreateOpen = useStudio((s) => s.setCreateOpen);
  const centered = placement === "center";
  const folded = useScrollingDown(!centered);

  // The card's content is laid out at the card's full width whatever the box
  // around it is doing, so its height is known while the box is a pill and
  // the page's padding never moves under a scrolling finger.
  const content = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const [full, setFull] = useState<{ w: number; h: number } | null>(null);
  const [pillW, setPillW] = useState(188);
  usePublishedHeight(content, !centered);

  useLayoutEffect(() => {
    const box = frame.current;
    const inner = content.current;
    if (!box || !inner) return;
    const measure = () => {
      const w = box.clientWidth;
      if (w === 0) return;
      setFull((was) => {
        const h = inner.offsetHeight;
        return was && was.w === w && was.h === h ? was : { w, h };
      });
      if (pill.current) setPillW(Math.ceil(pill.current.offsetWidth) + 36);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  const first = model ? activeFields(model, values).find((f) => f.placement === "prompt") : undefined;
  const text = ((first ? values[first.key] : draft) as string | undefined)?.trim() ?? "";

  const open = () => (model ? setComposer(true) : setCreateOpen(true));

  return (
    <div
      data-away={!centered && (selecting > 0 || selectMode) ? "1" : undefined}
      className={
        centered
          ? "w-full md:hidden"
          : "bar-swap pointer-events-none fixed bottom-[var(--nav-h)] left-0 right-0 z-40 px-4 pb-5 md:hidden"
      }
    >
      {/* Measures the width the card has to fill; the card itself may be a
          pill at the time. */}
      <div ref={frame} className="flex justify-center">
        {/* The same breathing glow as the desktop bar, while the card is a
            card; as a pill it is only a way back, and rests. */}
        <Glow active={!folded} radius={24}>
        <div className="flex justify-center">
        <button
          type="button"
          onClick={open}
          aria-label={folded ? "Keep Generate" : undefined}
          className="pointer-events-auto relative overflow-hidden border border-line bg-elevated text-left"
          style={{
            width: folded ? pillW : "100%",
            height: folded ? PILL_H : (full?.h ?? "auto"),
            borderRadius: folded ? 16 : 24,
            boxShadow: centered ? undefined : "var(--shadow-bar)",
            transition: `width ${MORPH}, height ${MORPH}, border-radius ${MORPH}`,
          }}
        >
          <div
            ref={content}
            aria-hidden={folded}
            className={`${full ? "absolute left-0 top-0" : ""} px-4 pb-3 pt-[18px]`}
            style={{
              width: full?.w ?? "100%",
              opacity: folded ? 0 : 1,
              transition: `opacity ${folded ? "140ms" : "260ms 120ms"} ease`,
            }}
          >
            <p className={`line-clamp-2 text-[15px] leading-5 ${text ? "text-t3" : "text-t4"}`}>
              {text || "Describe what you want to make…"}
            </p>
            {/* The model's mark and name as one piece on one quiet fill. */}
            <span className="mt-3.5 inline-flex h-[31px] max-w-full items-center gap-2 rounded-[12px] bg-t1/[0.05] px-2.5 text-[13px] text-t3">
              {model ? (
                <>
                  <VendorBadge model={model} size={15} bare />
                  <span className="truncate">{model.name}</span>
                </>
              ) : (
                <>
                  <Icon name="spark" size={16} />
                  Choose a model
                </>
              )}
            </span>
          </div>

          <span
            aria-hidden={!folded}
            className="pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap text-[14.5px] font-medium text-t1"
            style={{
              opacity: folded ? 1 : 0,
              transition: `opacity ${folded ? "220ms 160ms" : "120ms"} ease`,
            }}
          >
            {/* Centred on the word's capitals, in whatever font the device
                has: the word's box is trimmed to its cap height, so centring
                the two boxes centres the star on the capitals and the pair
                in the pill, with no nudges tuned to one font. The star's
                own box leaves air round the glyph, so it gives some back on
                the left to match the right, and sits close to the word. */}
            <span ref={pill} className="inline-flex items-center gap-[7px]">
              <Icon
                name="spark"
                size={18}
                fill="currentColor"
                strokeWidth={1.2}
                style={{ marginLeft: -3, marginRight: -3 }}
              />
              <span className="leading-none" style={{ textBox: "trim-both cap alphabetic" } as CSSProperties}>
                Keep Generate
              </span>
            </span>
          </span>
        </button>
        </div>
        </Glow>
      </div>
    </div>
  );
}

export function PromptBar({
  placement = "docked",
  desktop = true,
}: {
  placement?: "docked" | "center";
  /** False where the page has its own composer on a desktop (the video page's side panel). */
  desktop?: boolean;
}) {
  const {
    model,
    values,
    busy,
    error,
    setError,
    promptRef,
    promptFields,
    attachFields,
    stripFields,
    barFields,
    panelFields,
    batchable,
    blocker,
    hint,
    mentionable,
    definedInPanel,
    names,
    firstPrompt,
    insertToken,
    run,
  } = useComposer();
  const attach = useAttach(attachFields);
  const prompts = useFoldedPrompts(promptFields, values, model?.id ?? "");
  const toggleSettings = useStudio((s) => s.toggleSettings);
  const selecting = useStudio((s) => s.selecting);
  const selectMode = useStudio((s) => s.selectMode);
  const apiKey = useStudio(activeKey);
  const wrapper = useRef<HTMLDivElement>(null);

  const centered = placement === "center";
  // The centred box sits in the page's own flow; nothing pads itself for it.
  usePublishedHeight(wrapper, !centered);

  const send = (
    // The one button that starts something, so the one that wears the metal
    // ring. The lift on hover is gone: the ring is measured off the child, and
    // a child that grows under it drags the ring a frame behind.
    <MetalButton>
      <button
        type="button"
        onClick={run}
        disabled={busy || !!blocker || !apiKey}
        title={blocker ?? (!apiKey ? "Add your API key first" : "Generate (⌘↵)")}
        className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full text-t1 transition-colors duration-[150ms] disabled:cursor-not-allowed disabled:text-t4"
      >
        {/* The fill sits inside the button, not on it: the ring normalizes the
            host's own chrome, and a background set there is dropped. */}
        <span className="grid h-full w-full place-items-center rounded-full bg-t1/[0.07]">
          {busy ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
          ) : (
            <Icon name="arrow-up" size={17} strokeWidth={2} />
          )}
        </span>
      </button>
    </MetalButton>
  );

  if (!desktop) return <PromptCard placement={placement} />;

  return (
    <>
    <PromptCard placement={placement} />
    <div
      // The docked bar gives its place up to the selection bar rather than
      // being stacked under it: picking a tile drops it out of the dock, and
      // letting the selection go brings it back.
      data-away={!centered && (selecting > 0 || selectMode) ? "1" : undefined}
      className={
        // On a phone the box is the card above until it is opened.
        centered
          ? "hidden w-full md:block"
          : "bar-swap pointer-events-none fixed bottom-[var(--nav-h)] left-0 right-0 z-40 hidden justify-center px-3 pb-3 md:flex md:pl-4 md:pr-4 md:pb-5"
      }
    >
      <div
        ref={wrapper}
        className={centered ? "w-full" : "pointer-events-auto w-full max-w-[720px]"}
      >
        {model && <ModeStrip />}

        <ErrorPopup message={error} onClose={() => setError(null)} />

        <Glow>
        <div
          className="rounded-panel border border-line bg-elevated p-3"
          style={{ boxShadow: centered ? undefined : "var(--shadow-bar)" }}
        >
          <Reveal>
            <InputStrip fields={stripFields} />
            <AttachRow fields={attachFields} onAdd={attach.open} canAdd={attach.canAdd} />
          </Reveal>
          {attach.picker}

          {!model && (
            <DraftField trailing={send} onSubmit={openPickerHere} />
          )}

          {prompts.shown.map((field, index) => (
            <PromptField
              key={field.key}
              field={field}
              index={index}
              names={names}
              onSubmit={() => {
                if (!blocker && !busy) void run();
              }}
              trailing={index === 0 ? send : undefined}
              inputRef={index === 0 ? (node) => (promptRef.current = node) : undefined}
            />
          ))}
          <PromptFolds folded={prompts.folded} onOpen={prompts.open} />

          <Reveal>
            {mentionable && firstPrompt ? (
              <MentionStrip
                names={names}
                text={(values[firstPrompt.key] as string) ?? ""}
                onInsert={insertToken}
                onDefine={definedInPanel ? () => toggleSettings(true) : undefined}
              />
            ) : null}
          </Reveal>

          <div className="flex flex-wrap items-center gap-1">
            {attachFields.length > 0 && attach.canAdd && <AddChip onClick={attach.open} needed={attach.needed} />}
            <button
              type="button"
              onClick={openPickerHere}
              className="shrink-0"
            >
              {model ? (
                <Chip icon={<VendorBadge model={model} size={17} bare />} value={model.name} />
              ) : (
                <Chip icon={<Icon name="spark" size={16} />} value="Choose model" />
              )}
            </button>

            {barFields.map((field) => (
              <span key={field.key} className="shrink-0">
                <FieldChip field={field} />
              </span>
            ))}

            {batchable && (
              <span className="shrink-0">
                <BatchChip />
              </span>
            )}

            <ProjectChip />

            {panelFields.length > 0 && (
              <button
                type="button"
                onClick={() => toggleSettings(true)}
                title="Advanced settings"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-t1/[0.07] text-t2 transition-all md:h-[34px] md:w-[34px] duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
              >
                <Icon name="sliders" size={17} />
              </button>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2.5 pl-2">
              {hint && <span className="font-mono text-[11.5px] tabular-nums text-t3">{hint}</span>}
              {/* Models without a prompt still need somewhere to send from. */}
              {model && promptFields.length === 0 && send}
            </div>
          </div>
        </div>
        </Glow>

        <p className="mt-2 hidden px-2 text-center text-[11.5px] text-t4 md:block">
          {blocker ? blocker : `${model!.vendor} · ${model!.tagline}`}
        </p>
      </div>
    </div>
    </>
  );
}
