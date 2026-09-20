"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { BorderBeam } from "border-beam";
import { Control, chipCaption } from "@/components/controls";
import { PillGroup } from "@/components/PillGroup";
import { Icon, type IconName } from "@/components/Icon";
import { Popover } from "@/components/Popover";
import { submitRun } from "@/lib/generate";
import { insertMention, mentionAtCaret, mentionNames, mentionSources, usedMentions } from "@/lib/mentions";
import { VendorBadge } from "@/components/VendorMark";
import { activeFields, validateValues, type Field } from "@/lib/registry";
import { useModel, useStudio, useValues } from "@/store/studio";

function ModeStrip() {
  const model = useModel();
  const values = useValues();
  const setMode = useStudio((s) => s.setMode);
  // A single mode is not a choice — the strip only earns its place from two.
  if (!model?.modes || model.modes.length < 2) return null;

  return (
    <div key={model.id} className="anim-swap mb-2 flex justify-start">
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
function Reveal({ children }: { children: ReactNode }) {
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

  return (
    <div className="anim-swap mb-2 border-b border-line pb-3 sm:max-h-[32vh] sm:overflow-y-auto">
      <div className="no-bar -mx-1 flex gap-4 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:gap-x-4 sm:gap-y-3 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div key={field.key} className="w-[168px] shrink-0 sm:w-auto">
            <Control
              field={field}
              value={values[field.key]}
              values={values}
              compact
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
  const scale = valid ? 12 / Math.max(w, h) : 0;
  return (
    <span className="grid h-3.5 w-3.5 place-items-center">
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
        <Icon name="grid" size={14} />
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
  return hit ? <Icon name={hit[1]} size={15} className="opacity-70" /> : null;
}

function Chip({
  icon,
  value,
  active,
}: {
  icon?: ReactNode;
  value: string;
  active?: boolean;
}) {
  return (
    <span
      className={`flex h-8 select-none items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] transition-all duration-[120ms] ${
        active ? "bg-t1 text-canvas" : "bg-t1/[0.07] text-t2 hover:bg-t1/[0.12] hover:text-t1"
      }`}
    >
      {icon}
      {value}
    </span>
  );
}

function FieldChip({ field }: { field: Field }) {
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const value = values[field.key];

  // Booleans read better as a chip you flip than as a chip that opens a menu.
  if (field.kind === "toggle") {
    return (
      <button type="button" onClick={() => setValue(field.key, value !== true)} title={field.help}>
        <Chip icon={chipIcon(field, value)} value={field.label} active={value === true} />
      </button>
    );
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
          <p className="px-1.5 pb-1 pt-2.5 text-[11px] leading-snug text-t4">{field.help}</p>
        )}
      </div>
    </Popover>
  );
}

/**
 * The prompt textarea with `@name` completion: typing `@` lists the
 * elements defined for this model, and a pick drops the token at the caret.
 */
function PromptField({
  field,
  index,
  names,
  onSubmit,
  trailing,
  inputRef,
}: {
  field: Field;
  index: number;
  names: string[];
  onSubmit: () => void;
  trailing?: ReactNode;
  inputRef?: (node: HTMLTextAreaElement | null) => void;
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
        rows={index === 0 ? 2 : 1}
        placeholder={field.placeholder ?? `${field.label}…`}
        className="max-h-40 min-w-0 flex-1 resize-none bg-transparent px-1 pt-[5px] text-[16px] leading-relaxed tracking-[-0.011em] text-t1 outline-none placeholder:text-t4 md:pt-1.5 md:text-[15px]"
      />
      {trailing}
      {open &&
        spot &&
        createPortal(
        <div
          className="surface-pop anim-rise fixed z-50 rounded-panel p-1.5"
          style={{ left: spot.left, bottom: spot.bottom, width: spot.width }}
          role="listbox"
        >
          <div className="px-2.5 pb-1.5 pt-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-t4">
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
              className={`flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-[13px] transition-colors duration-[120ms] ${
                i === cursor ? "bg-t1 text-canvas" : "text-t2"
              }`}
            >
              <Icon name="at" size={15} className="shrink-0 opacity-70" />
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
function MentionStrip({
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
      <span className="mr-0.5 grid h-6 w-6 place-items-center text-t4" title="Reference an element with @name">
        <Icon name="at" size={15} />
      </span>
      {names.map((name) => {
        const active = used.has(name);
        return (
          <button
            key={name}
            type="button"
            onClick={() => onInsert(name)}
            title={active ? `@${name} is in the prompt` : `Insert @${name}`}
            className={`h-6 rounded-full px-2.5 font-mono text-[11.5px] transition-colors duration-[120ms] ${
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
        className="flex h-6 items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 text-[11.5px] text-t3 transition-colors duration-[120ms] hover:border-t1/40 hover:text-t1"
      >
        <Icon name="plus" size={13} />
        {names.length === 0 ? "Add an element to reference it with @" : "Element"}
      </button>
    </div>
  );
}

export function PromptBar() {
  const model = useModel();
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const togglePicker = useStudio((s) => s.togglePicker);
  const toggleSettings = useStudio((s) => s.toggleSettings);
  const apiKey = useStudio((s) => s.apiKey);
  const theme = useStudio((s) => s.theme);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  // Decided after mount so the server-rendered markup and the client agree.
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    setMotion(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // The bar's height depends on the model and mode, so publish it as a CSS
  // variable and let the page pad itself instead of guessing. The bar also
  // animates that height, and writing the variable on every frame of the
  // animation relaid out the whole page underneath it — most of what made
  // the mode strip feel slow on a phone. So it is published once the height
  // settles, not while it moves.
  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;
    let timer = 0;
    const apply = () =>
      document.documentElement.style.setProperty("--bar-h", `${node.offsetHeight}px`);
    apply();
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(apply, 140);
    });
    observer.observe(node);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  if (!model) return null;

  const fields = activeFields(model, values);
  const promptFields = fields.filter((f) => f.placement === "prompt");
  const inputFields = fields.filter((f) => f.placement === "input");
  const barFields = fields.filter((f) => f.placement === "bar");
  const panelFields = fields.filter((f) => f.placement === "panel");

  const blocker = validateValues(model, values);
  const hint = model.creditHint?.(values);
  const mentionable = mentionSources(model, values).length > 0;
  const names = mentionable ? mentionNames(model, values) : [];
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

  async function run() {
    setBusy(true);
    setError(null);
    const result = await submitRun();
    if (!result.ok) setError(result.error ?? "Something went wrong.");
    setBusy(false);
  }

  const send = (
    <button
      type="button"
      onClick={run}
      disabled={busy || !!blocker || !apiKey}
      title={blocker ?? (!apiKey ? "Add your API key first" : "Generate (⌘↵)")}
      className="cta grid h-9 w-9 shrink-0 place-items-center rounded-full hover:scale-[1.06] active:scale-95 disabled:cursor-not-allowed disabled:bg-t1/15 disabled:text-t4 disabled:hover:scale-100"
    >
      {busy ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
      ) : (
        <Icon name="arrow-up" size={16} strokeWidth={2} />
      )}
    </button>
  );

  return (
    <div className="pointer-events-none fixed bottom-[var(--nav-h)] left-0 right-0 z-40 flex justify-center px-3 pb-3 md:px-4 md:pb-5">
      <div ref={wrapper} className="pointer-events-auto w-full max-w-[720px]">
        <ModeStrip />

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
          style={{ boxShadow: "var(--shadow-bar)" }}
        >
          <Reveal>
            <InputStrip fields={inputFields} />
          </Reveal>

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
            <button type="button" onClick={() => togglePicker(true, model.category, true)} className="shrink-0">
              <Chip icon={<VendorBadge vendor={model.vendor} size={18} />} value={model.name} />
            </button>

            {barFields.map((field) => (
              <span key={field.key} className="shrink-0">
                <FieldChip field={field} />
              </span>
            ))}

            {panelFields.length > 0 && (
              <button
                type="button"
                onClick={() => toggleSettings(true)}
                title="Advanced settings"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-t1/[0.07] text-t2 transition-all duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
              >
                <Icon name="sliders" size={16} />
              </button>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2.5 pl-2">
              {hint && <span className="font-mono text-[11px] tabular-nums text-t4">{hint}</span>}
              {/* Models without a prompt still need somewhere to send from. */}
              {promptFields.length === 0 && send}
            </div>
          </div>
        </div>
        </BorderBeam>

        <p className="mt-2 hidden px-2 text-center text-[11px] text-t4 md:block">
          {blocker ? blocker : `${model.vendor} · ${model.tagline}`}
        </p>
      </div>
    </div>
  );
}
