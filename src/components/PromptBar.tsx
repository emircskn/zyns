"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { BorderBeam } from "border-beam";
import { Control, chipCaption } from "@/components/controls";
import { PillGroup } from "@/components/PillGroup";
import { Icon, type IconName } from "@/components/Icon";
import { MetalButton } from "@/components/MetalButton";
import { Popover } from "@/components/Popover";
import { submitRun } from "@/lib/generate";
import { insertMention, mentionAtCaret, mentionNames, mentionSources, usedMentions } from "@/lib/mentions";
import { VendorBadge } from "@/components/VendorMark";
import { activeFields, validateValues, type Field } from "@/lib/registry";
import { openPickerHere, useModel, useStudio, useValues } from "@/store/studio";

export function ModeStrip({ flush }: { flush?: boolean }) {
  const model = useModel();
  const values = useValues();
  const setMode = useStudio((s) => s.setMode);
  // A single mode is not a choice — the strip only earns its place from two.
  if (!model?.modes || model.modes.length < 2) return null;

  return (
    <div key={model.id} className={`anim-swap flex justify-start ${flush ? "" : "mb-2"}`}>
      <PillGroup
        className="!bg-elevated ring-1 ring-inset ring-line"
        value={String(values.__mode ?? model.modes[0].id)}
        onChange={setMode}
        items={model.modes.map((mode) => ({ id: mode.id, label: mode.label, hint: mode.hint }))}
      />
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
            <Control
              field={field}
              value={values[field.key]}
              values={values}
              compact
              lane={lane}
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
  const step = (by: number) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setBatch(batch + by);
  };
  return (
    <span
      title="How many to make"
      className={`flex select-none items-center gap-1 rounded-full bg-t1/[0.07] text-t2 ${
        large ? "h-10 px-1.5 text-[14px]" : "h-8 pl-1 pr-1 text-[12.5px] md:h-[34px] md:text-[13px]"
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

  return (
    <Popover
      width={width}
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
 * The prompt textarea with `@name` completion: typing `@` lists the
 * elements defined for this model, and a pick drops the token at the caret.
 */
export function PromptField({
  field,
  index,
  names,
  onSubmit,
  trailing,
  inputRef,
  large,
}: {
  field: Field;
  index: number;
  names: string[];
  onSubmit: () => void;
  trailing?: ReactNode;
  inputRef?: (node: HTMLTextAreaElement | null) => void;
  /** The phone composer's: a page of room to write in rather than a line. */
  large?: boolean;
}) {
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const text = (values[field.key] as string) ?? "";
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null);

  const token = caret === null || names.length === 0 ? null : mentionAtCaret(text, caret);
  const matches = token
    ? names.filter((name) => name.toLowerCase().startsWith(token.query.toLowerCase()))
    : [];
  const open = !!token && matches.length > 0 && dismissed !== token.start;

  // Portalled for the same reason as Popover: inside the bar the beam's glow
  // layers paint over it. Measured off the prompt row before paint.
  const row = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<{ left: number; bottom: number; width: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      setSpot(null);
      return;
    }
    const measure = () => {
      const node = row.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const margin = 20;
      const w = Math.min(260, window.innerWidth - 2 * margin);
      setSpot({
        left: Math.max(margin, Math.min(rect.left, window.innerWidth - margin - w)),
        bottom: window.innerHeight - rect.top + 6,
        width: w,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  useEffect(() => setCursor(0), [token?.query]);

  function syncCaret() {
    const node = ref.current;
    if (node) setCaret(node.selectionStart);
  }

  function pick(name: string) {
    if (!token) return;
    const next = insertMention(text, token.start, caret ?? text.length, name);
    setValue(field.key, next.text);
    setDismissed(null);
    requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(next.caret, next.caret);
      setCaret(next.caret);
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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

  return (
    <div ref={row} className="relative mb-2 flex items-start gap-2">
      <textarea
        ref={(node) => {
          ref.current = node;
          inputRef?.(node);
        }}
        value={text}
        onChange={(event) => {
          setValue(field.key, event.target.value);
          setCaret(event.target.selectionStart);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={syncCaret}
        onClick={syncCaret}
        onSelect={syncCaret}
        onBlur={() => window.setTimeout(() => setCaret(null), 120)}
        rows={large ? (index === 0 ? 6 : 2) : index === 0 ? 2 : 1}
        placeholder={field.placeholder ?? `${field.label}…`}
        className={
          large
            ? "min-h-[104px] min-w-0 flex-1 resize-none bg-transparent text-[16.5px] font-medium leading-[1.45] tracking-[-0.012em] text-t1 outline-none placeholder:font-normal placeholder:text-t4"
            : "max-h-40 min-w-0 flex-1 resize-none bg-transparent px-1 pt-[5px] text-[16px] leading-relaxed tracking-[-0.011em] text-t1 outline-none placeholder:text-t4 md:pt-1.5 md:text-[15px]"
        }
      />
      {trailing}
      {open &&
        spot &&
        createPortal(
        <div
          className="surface-pop anim-rise fixed z-[90] rounded-panel p-1.5"
          style={{ left: spot.left, bottom: spot.bottom, width: spot.width }}
          role="listbox"
        >
          <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-t3">
            Elements
          </div>
          {matches.map((name, i) => (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={i === cursor}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(name)}
              onMouseEnter={() => setCursor(i)}
              className={`flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-[13.5px] transition-colors duration-[120ms] ${
                i === cursor ? "bg-t1 text-canvas" : "text-t2"
              }`}
            >
              <Icon name="at" size={16} className="shrink-0" />
              <span className="truncate">{name}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
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
  onDefine: () => void;
}) {
  const used = usedMentions(text, names);
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
      <button
        type="button"
        onClick={onDefine}
        className="flex h-[26px] items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 text-[12px] text-t3 transition-colors duration-[120ms] hover:border-t1/40 hover:text-t1"
      >
        <Icon name="plus" size={14} />
        {names.length === 0 ? "Add an element to reference it with @" : "Element"}
      </button>
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
  const inputFields = fields.filter((f) => f.placement === "input");
  const barFields = fields.filter((f) => f.placement === "bar");
  const panelFields = fields.filter((f) => f.placement === "panel");

  // A picture at a time, and nothing in the request that asks for more: then
  // the count is ours to send. Models with their own count keep it.
  const batchable =
    !!model && model.output === "image" && !fields.some((f) => /^num_images$|^n$/.test(f.key));
  const blocker = model ? validateValues(model, values) : "Choose a model to start";
  const hint = model?.creditHint?.(values);
  const mentionable = !!model && mentionSources(model, values).length > 0;
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
    let failure: string | null = null;
    for (let i = 0; i < copies; i++) {
      const result = await submitRun();
      if (!result.ok && !failure) failure = result.error ?? "Something went wrong.";
    }
    if (failure) setError(failure);
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
    barFields,
    panelFields,
    batchable,
    blocker,
    hint,
    mentionable,
    names,
    firstPrompt,
    insertToken,
    run,
  };
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
      data-away={!centered && selecting > 0 ? "1" : undefined}
      className={
        centered
          ? "w-full md:hidden"
          : "bar-swap pointer-events-none fixed bottom-[var(--nav-h)] left-0 right-0 z-40 px-4 pb-5 md:hidden"
      }
    >
      {/* Measures the width the card has to fill; the card itself may be a
          pill at the time. */}
      <div ref={frame} className="flex justify-center">
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
            {/* Lined up by eye, not by box: the line box puts the capitals a
                little high, so the label drops to centre them, and the star
                rises to meet them. The star's own box leaves air round the
                glyph, so it gives some back on the left to match the gap on
                the right, and sits close to the word. */}
            <span ref={pill} className="inline-flex items-center gap-1" style={{ transform: "translateY(1.5px)" }}>
              <Icon
                name="spark"
                size={18}
                fill="currentColor"
                strokeWidth={1.2}
                style={{ marginLeft: -3, transform: "translateY(-2px)" }}
              />
              Keep Generate
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

export function PromptBar({ placement = "docked" }: { placement?: "docked" | "center" }) {
  const {
    model,
    values,
    busy,
    error,
    setError,
    promptRef,
    promptFields,
    inputFields,
    barFields,
    panelFields,
    batchable,
    blocker,
    hint,
    mentionable,
    names,
    firstPrompt,
    insertToken,
    run,
  } = useComposer();
  const toggleSettings = useStudio((s) => s.toggleSettings);
  const selecting = useStudio((s) => s.selecting);
  const apiKey = useStudio((s) => s.apiKey);
  const theme = useStudio((s) => s.theme);
  const wrapper = useRef<HTMLDivElement>(null);

  // Decided after mount so the server-rendered markup and the client agree.
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    setMotion(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

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

  return (
    <>
    <PromptCard placement={placement} />
    <div
      // The docked bar gives its place up to the selection bar rather than
      // being stacked under it: picking a tile drops it out of the dock, and
      // letting the selection go brings it back.
      data-away={!centered && selecting > 0 ? "1" : undefined}
      className={
        // On a phone the box is the card above until it is opened.
        centered
          ? "hidden w-full md:block"
          : "bar-swap pointer-events-none fixed bottom-[var(--nav-h)] left-0 right-0 z-40 hidden justify-center px-3 pb-3 md:flex md:pl-[calc(var(--rail-w)+16px)] md:pr-4 md:pb-5"
      }
    >
      <div
        ref={wrapper}
        className={centered ? "w-full" : "pointer-events-auto w-full max-w-[720px]"}
      >
        {model && <ModeStrip />}

        {error && (
          <div className="anim-pop mb-2 flex items-start gap-2 rounded-card bg-[#ff6b6b]/10 px-3.5 py-2.5 text-[12.5px] text-[#ff8f8f] ring-1 ring-inset ring-[#ff6b6b]/25">
            <Icon name="alert" size={16} className="mt-px shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
              <Icon name="close" size={15} />
            </button>
          </div>
        )}

        <BorderBeam
          size="pulse-inner"
          colorVariant="mono"
          // Greyscale has no hue to rotate, so the hue-shift filter is pure
          // cost. The theme is the one the user picked, not the OS's.
          staticColors
          theme={theme}
          active={motion}
          // The library's root is a block it sizes itself; the bar has to keep
          // filling the column it sits in. It also clips to itself, which
          // swallowed the popovers that open above the bar — its glow layers
          // carry their own clip-path, so letting the box overflow is free.
          style={{ display: "block", width: "100%", overflow: "visible" }}
        >
        <div
          className="rounded-panel border border-line bg-elevated p-3"
          style={{ boxShadow: centered ? undefined : "var(--shadow-bar)" }}
        >
          <Reveal>
            <InputStrip fields={inputFields} />
          </Reveal>

          {!model && (
            <DraftField trailing={send} onSubmit={openPickerHere} />
          )}

          {promptFields.map((field, index) => (
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

          <Reveal>
            {mentionable && firstPrompt ? (
              <MentionStrip
                names={names}
                text={(values[firstPrompt.key] as string) ?? ""}
                onInsert={insertToken}
                onDefine={() => toggleSettings(true)}
              />
            ) : null}
          </Reveal>

          <div className="flex flex-wrap items-center gap-1">
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
        </BorderBeam>

        <p className="mt-2 hidden px-2 text-center text-[11.5px] text-t4 md:block">
          {blocker ? blocker : `${model!.vendor} · ${model!.tagline}`}
        </p>
      </div>
    </div>
    </>
  );
}
