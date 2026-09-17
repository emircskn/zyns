"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Field, Values } from "@/lib/registry";
import { Icon } from "@/components/Icon";
import { mediaKind, uploadFile } from "@/lib/upload";
import { useStudio } from "@/store/studio";

interface ControlProps {
  field: Field;
  value: unknown;
  values: Values;
  onChange: (value: unknown) => void;
  /** Bar popovers get a denser treatment than the settings panel. */
  dense?: boolean;
  /** Reference strip in the prompt bar: tighter, label above the tiles. */
  compact?: boolean;
}

/* ------------------------------------------------------------------ *
 * Choice controls
 * ------------------------------------------------------------------ */

export function OptionList({ field, value, onChange }: ControlProps) {
  return (
    <div className="flex flex-col gap-px">
      {(field.choices ?? []).map((choice) => {
        const active = String(value ?? "") === choice.value;
        return (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            className={`flex w-full items-center justify-between gap-3 rounded-chip px-2.5 py-2 text-left text-[13px] transition-colors duration-[120ms] ${
              active ? "bg-t1/10 text-t1" : "text-t2 hover:bg-t1/[0.055]"
            }`}
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{choice.label}</span>
              {choice.hint && <span className="truncate text-[11px] text-t4">{choice.hint}</span>}
            </span>
            {active && <Icon name="check" size={14} className="shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({ field, value, onChange }: ControlProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-chip bg-t1/[0.055] p-1">
      {(field.choices ?? []).map((choice) => {
        const active = String(value ?? "") === choice.value;
        return (
          <button
            key={choice.value}
            type="button"
            title={choice.hint}
            onClick={() => onChange(choice.value)}
            className={`flex-1 whitespace-nowrap rounded-chip px-2.5 py-1.5 text-[12px] transition-all duration-[120ms] ${
              active ? "cta" : "text-t3 hover:text-t1"
            }`}
          >
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}

/** Aspect ratios read better as proportional boxes than as a list. */
export function RatioPicker({ field, value, onChange }: ControlProps) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {(field.choices ?? []).map((choice) => {
        const active = String(value ?? "") === choice.value;
        const [w, h] = choice.value.split(":").map(Number);
        const valid = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
        const scale = valid ? 24 / Math.max(w, h) : 0;
        return (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            className={`flex flex-col items-center gap-1.5 rounded-chip px-1 py-2 transition-colors duration-[120ms] ${
              active ? "bg-t1/10 text-t1" : "text-t3 hover:bg-t1/[0.055] hover:text-t1"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center">
              {valid ? (
                <span
                  className="rounded-[2px] border transition-all duration-[200ms]"
                  style={{
                    width: Math.max(w * scale, 5),
                    height: Math.max(h * scale, 5),
                    borderColor: active ? "var(--t1)" : "var(--line-strong)",
                  }}
                />
              ) : (
                <span className="text-[9px] uppercase tracking-[0.08em]">auto</span>
              )}
            </span>
            <span className="font-mono text-[10px] tabular-nums">{choice.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SliderControl({ field, value, onChange }: ControlProps) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const current = value === undefined || value === "" ? undefined : Number(value);
  const display = current ?? min;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[12px] text-t3">{field.label}</span>
        <span className="font-mono text-[12px] tabular-nums text-t1">
          {current === undefined ? "auto" : display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={display}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="mt-0.5 flex justify-between font-mono text-[10px] tabular-nums text-t4">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {current !== undefined && field.default === undefined && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="mt-1.5 text-[11px] text-t4 transition-colors hover:text-t1"
        >
          Clear — let the model decide
        </button>
      )}
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-chip bg-t1/[0.055] px-3 py-2 text-[13px] text-t1 outline-none ring-1 ring-inset ring-transparent transition-all duration-[120ms] placeholder:text-t4 focus:bg-t1/[0.08] focus:ring-line-strong";

export function NumberControl({ field, value, onChange }: ControlProps) {
  return (
    <input
      type="number"
      min={field.min}
      max={field.max}
      step={field.step ?? 1}
      value={value === undefined || value === null ? "" : String(value)}
      placeholder={field.placeholder ?? "Random"}
      onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
      className={`${INPUT_CLASS} font-mono tabular-nums`}
    />
  );
}

export function TextControl({ field, value, onChange }: ControlProps) {
  return (
    <input
      type="text"
      value={(value as string) ?? ""}
      placeholder={field.placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={INPUT_CLASS}
    />
  );
}

export function ToggleControl({ field, value, onChange }: ControlProps) {
  const on = value === true;
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 py-1 text-left"
    >
      <span className="text-[13px] text-t2">{field.label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-[200ms] ${
          on ? "bg-t1" : "bg-t1/15"
        }`}
      >
        <span
          className={`absolute top-[3px] h-3.5 w-3.5 rounded-full transition-all duration-[200ms] ${
            on ? "left-[19px] bg-canvas" : "left-[3px] bg-t1"
          }`}
          style={{ transitionTimingFunction: "var(--ease-spring)" }}
        />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Media inputs
 * ------------------------------------------------------------------ */

const ACCEPT: Record<string, string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
};

function Spinner({ size = 12 }: { size?: number }) {
  return (
    <span
      className="animate-spin rounded-full border-current border-t-transparent opacity-60"
      style={{ width: size, height: size, borderWidth: Math.max(1, size / 10) }}
    />
  );
}

function MediaThumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  const kind = mediaKind(url);
  return (
    <div className="group/thumb anim-pop relative h-14 w-14 shrink-0 overflow-hidden rounded-chip bg-surface ring-1 ring-inset ring-line">
      {kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
      {kind === "video" && <video src={url} className="h-full w-full object-cover" muted playsInline />}
      {kind === "audio" && (
        <div className="flex h-full w-full items-center justify-center text-t3">
          <Icon name="audio" size={18} />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="absolute right-1 top-1 grid h-4.5 w-4.5 place-items-center rounded-full bg-canvas-deep/80 text-white opacity-0 backdrop-blur-sm transition-opacity duration-[120ms] group-hover/thumb:opacity-100"
        style={{ height: 18, width: 18 }}
      >
        <Icon name="close" size={10} />
      </button>
    </div>
  );
}

function AddTile({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="grid h-14 w-14 shrink-0 place-items-center rounded-chip border border-dashed border-line-strong text-t4 transition-all duration-[120ms] hover:border-t1/40 hover:bg-t1/[0.04] hover:text-t1 disabled:opacity-50"
    >
      {busy ? <Spinner /> : <Icon name="plus" size={16} />}
    </button>
  );
}

function useUploader(accept: Field["accept"]) {
  const apiKey = useStudio((s) => s.apiKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function send(files: FileList | File[], onDone: (urls: string[]) => void) {
    if (!apiKey) {
      setError("Add your API key first — uploads go through your KIE account.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const urls = await Promise.all(Array.from(files).map((file) => uploadFile(file, apiKey)));
      onDone(urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, input, send, accept: ACCEPT[accept ?? "image"] };
}

function UrlField({
  value,
  placeholder,
  onCommit,
}: {
  value?: string;
  placeholder: string;
  onCommit: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Paste a public URL instead"
        className={`grid h-5 w-5 place-items-center rounded-full transition-colors duration-[120ms] ${
          open ? "bg-t1/15 text-t1" : "text-t4 hover:text-t1"
        }`}
      >
        <Icon name="link" size={11} />
      </button>
      {open && (
        <input
          type="text"
          autoFocus
          defaultValue={value ?? ""}
          placeholder={placeholder}
          onBlur={(event) => onCommit(event.target.value.trim())}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onCommit(event.currentTarget.value.trim());
              event.currentTarget.blur();
            }
          }}
          className="anim-fade absolute inset-x-0 top-6 z-10 rounded-chip bg-elevated px-2.5 py-1.5 text-[11.5px] text-t1 shadow-[var(--shadow-pop)] outline-none ring-1 ring-inset ring-line placeholder:text-t4"
        />
      )}
    </>
  );
}

function SlotHeader({
  label,
  count,
  help,
  children,
}: {
  label: string;
  count?: string;
  help?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative mb-1.5 flex items-center gap-1.5">
      <span className="truncate text-[11.5px] text-t2" title={help}>
        {label}
      </span>
      {count && <span className="font-mono text-[10px] tabular-nums text-t4">{count}</span>}
      <span className="ml-auto flex items-center">{children}</span>
    </div>
  );
}

export function MediaControl({ field, value, onChange, compact }: ControlProps) {
  const { busy, error, input, send, accept } = useUploader(field.accept);
  const url = (value as string) ?? "";

  return (
    <div className="min-w-0">
      <SlotHeader label={field.label} help={field.help}>
        <UrlField value={url} placeholder="https://…" onCommit={(next) => onChange(next || undefined)} />
      </SlotHeader>
      <div className="flex items-center gap-2">
        {url ? (
          <MediaThumb url={url} onRemove={() => onChange(undefined)} />
        ) : (
          <AddTile busy={busy} onClick={() => input.current?.click()} />
        )}
        {!compact && field.help && (
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-t4">{field.help}</p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const files = event.target.files;
          if (files?.length) void send(files, (urls) => onChange(urls[0]));
          event.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-[11px] text-[#ff6b6b]">{error}</p>}
    </div>
  );
}

export function ImagesControl({ field, value, onChange, compact }: ControlProps) {
  const { busy, error, input, send, accept } = useUploader(field.accept);
  const urls = Array.isArray(value) ? (value as string[]) : [];
  const full = field.maxItems !== undefined && urls.length >= field.maxItems;

  return (
    <div className="min-w-0">
      <SlotHeader
        label={field.label}
        count={`${urls.length}${field.maxItems ? `/${field.maxItems}` : ""}`}
        help={field.help}
      >
        <UrlField
          placeholder="https://… then Enter"
          onCommit={(next) => {
            if (!next || full) return;
            onChange([...urls, next]);
          }}
        />
      </SlotHeader>
      <div className="flex flex-wrap gap-1.5">
        {urls.map((url, index) => (
          <MediaThumb
            key={`${url}-${index}`}
            url={url}
            onRemove={() => onChange(urls.filter((_, i) => i !== index))}
          />
        ))}
        {!full && <AddTile busy={busy} onClick={() => input.current?.click()} />}
      </div>
      {!compact && field.help && <p className="mt-1.5 text-[11px] leading-snug text-t4">{field.help}</p>}
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(event) => {
          const files = event.target.files;
          if (files?.length) {
            const room = field.maxItems ? field.maxItems - urls.length : files.length;
            void send(Array.from(files).slice(0, Math.max(room, 0)), (added) =>
              onChange([...urls, ...added]),
            );
          }
          event.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-[11px] text-[#ff6b6b]">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Composite editors
 * ------------------------------------------------------------------ */

interface Shot {
  prompt: string;
  duration: number;
}

export function ShotsControl({ field, value, onChange }: ControlProps) {
  const shots = (Array.isArray(value) ? value : []) as Shot[];
  const update = (index: number, patch: Partial<Shot>) =>
    onChange(shots.map((shot, i) => (i === index ? { ...shot, ...patch } : shot)));

  return (
    <div className="flex flex-col gap-1.5">
      {shots.map((shot, index) => (
        <div
          key={index}
          className="anim-pop rounded-card bg-t1/[0.04] p-2.5 ring-1 ring-inset ring-line"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-t4">
              Shot {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(shots.filter((_, i) => i !== index))}
              className="text-t4 transition-colors hover:text-t1"
              aria-label="Remove shot"
            >
              <Icon name="close" size={12} />
            </button>
          </div>
          <textarea
            value={shot.prompt}
            rows={2}
            placeholder="What happens in this shot…"
            onChange={(event) => update(index, { prompt: event.target.value })}
            className="w-full resize-none rounded-chip bg-canvas/50 px-2.5 py-2 text-[12.5px] text-t1 outline-none placeholder:text-t4"
          />
          <div className="mt-2 flex items-center gap-2.5">
            <span className="text-[11px] text-t4">Duration</span>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={shot.duration}
              onChange={(event) => update(index, { duration: Number(event.target.value) })}
              className="flex-1"
            />
            <span className="w-7 text-right font-mono text-[11px] tabular-nums text-t1">
              {shot.duration}s
            </span>
          </div>
        </div>
      ))}
      <AddRow label="Add shot" onClick={() => onChange([...shots, { prompt: "", duration: 5 }])} />
      {field.help && <p className="text-[11px] leading-snug text-t4">{field.help}</p>}
    </div>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-chip border border-dashed border-line-strong py-2 text-[12px] text-t3 transition-all duration-[120ms] hover:border-t1/40 hover:bg-t1/[0.04] hover:text-t1"
    >
      <Icon name="plus" size={13} /> {label}
    </button>
  );
}

interface Element {
  name: string;
  description: string;
  element_input_urls?: string[];
  element_input_video_urls?: string[];
}

export function ElementsControl({ field, value, onChange }: ControlProps) {
  const elements = (Array.isArray(value) ? value : []) as Element[];
  const update = (index: number, patch: Partial<Element>) =>
    onChange(elements.map((el, i) => (i === index ? { ...el, ...patch } : el)));

  return (
    <div className="flex flex-col gap-1.5">
      {elements.map((element, index) => (
        <div
          key={index}
          className="anim-pop rounded-card bg-t1/[0.04] p-2.5 ring-1 ring-inset ring-line"
        >
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              value={element.name}
              placeholder="Name (e.g. Mira)"
              onChange={(event) => update(index, { name: event.target.value })}
              className="min-w-0 flex-1 rounded-chip bg-canvas/50 px-2.5 py-1.5 text-[12.5px] text-t1 outline-none placeholder:text-t4"
            />
            <button
              type="button"
              onClick={() => onChange(elements.filter((_, i) => i !== index))}
              className="text-t4 transition-colors hover:text-t1"
              aria-label="Remove element"
            >
              <Icon name="close" size={12} />
            </button>
          </div>
          <textarea
            value={element.description}
            rows={2}
            placeholder="How this character or object looks and behaves…"
            onChange={(event) => update(index, { description: event.target.value })}
            className="mb-2 w-full resize-none rounded-chip bg-canvas/50 px-2.5 py-2 text-[12.5px] text-t1 outline-none placeholder:text-t4"
          />
          <ImagesControl
            field={{
              key: `${field.key}-${index}-images`,
              label: "Reference images",
              kind: "images",
              placement: "panel",
              accept: "image",
              maxItems: 4,
            }}
            values={{}}
            compact
            value={element.element_input_urls ?? []}
            onChange={(urls) => update(index, { element_input_urls: urls as string[] })}
          />
        </div>
      ))}
      <AddRow
        label="Add element"
        onClick={() => onChange([...elements, { name: "", description: "" }])}
      />
      {field.help && <p className="text-[11px] leading-snug text-t4">{field.help}</p>}
    </div>
  );
}

interface Clip {
  url: string;
  start: number;
  ends: number;
}

export function ClipsControl({ field, value, onChange }: ControlProps) {
  const clips = (Array.isArray(value) ? value : []) as Clip[];
  const clip = clips[0];
  const set = (patch: Partial<Clip>) =>
    onChange([{ url: clip?.url ?? "", start: clip?.start ?? 0, ends: clip?.ends ?? 4, ...patch }]);

  return (
    <div className="flex flex-col gap-2">
      <MediaControl
        field={{ ...field, kind: "media", accept: "video", label: field.label }}
        values={{}}
        compact
        value={clip?.url}
        onChange={(url) => (url ? set({ url: url as string }) : onChange([]))}
      />
      {clip?.url && (
        <div className="anim-fade flex items-center gap-2">
          {(["start", "ends"] as const).map((key) => (
            <label key={key} className="flex flex-1 items-center gap-1.5 text-[11px] text-t4">
              {key === "start" ? "Start" : "End"}
              <input
                type="number"
                min={0}
                step={0.1}
                value={clip[key]}
                onChange={(event) => set({ [key]: Number(event.target.value) })}
                className="w-full rounded-chip bg-t1/[0.055] px-2 py-1 font-mono text-[12px] tabular-nums text-t1 outline-none"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Control(props: ControlProps) {
  switch (props.field.kind) {
    case "select":
      return <OptionList {...props} />;
    case "segmented":
      return <Segmented {...props} />;
    case "ratio":
      return <RatioPicker {...props} />;
    case "slider":
      return <SliderControl {...props} />;
    case "number":
      return <NumberControl {...props} />;
    case "toggle":
      return <ToggleControl {...props} />;
    case "text":
      return <TextControl {...props} />;
    case "media":
      return <MediaControl {...props} />;
    case "images":
      return <ImagesControl {...props} />;
    case "shots":
      return <ShotsControl {...props} />;
    case "elements":
      return <ElementsControl {...props} />;
    case "clips":
      return <ClipsControl {...props} />;
    default:
      return <TextControl {...props} />;
  }
}

/** The caption a bar chip shows for the current value. */
export function chipCaption(field: Field, value: unknown, values: Values): string {
  if (field.chip) return field.chip(value, values);
  if (field.kind === "toggle") return field.label;
  const empty = value === undefined || value === null || value === "";
  // A free-text chip with nothing in it should say what it is, not "Auto".
  if (empty) return field.kind === "text" ? field.label : "Auto";
  const choice = field.choices?.find((c) => c.value === String(value));
  if (choice) return choice.label;
  const text = String(value);
  return text.length > 22 ? `${text.slice(0, 21)}…` : text;
}
