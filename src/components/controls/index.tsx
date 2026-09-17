"use client";

import { useRef, useState } from "react";
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

/* ------------------------------------------------------------------ */

export function OptionList({ field, value, onChange }: ControlProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {(field.choices ?? []).map((choice) => {
        const active = String(value ?? "") === choice.value;
        return (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors ${
              active ? "bg-white/10 text-white" : "text-ink-200 hover:bg-white/5"
            }`}
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{choice.label}</span>
              {choice.hint && <span className="truncate text-[11px] text-ink-400">{choice.hint}</span>}
            </span>
            {active && <Icon name="check" size={15} className="shrink-0 text-white" />}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({ field, value, onChange }: ControlProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1">
      {(field.choices ?? []).map((choice) => {
        const active = String(value ?? "") === choice.value;
        return (
          <button
            key={choice.value}
            type="button"
            title={choice.hint}
            onClick={() => onChange(choice.value)}
            className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              active ? "bg-white text-ink-950" : "text-ink-300 hover:text-white"
            }`}
          >
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}

/** Aspect ratios read better as little proportional boxes than as a list. */
export function RatioPicker({ field, value, onChange }: ControlProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {(field.choices ?? []).map((choice) => {
        const active = String(value ?? "") === choice.value;
        const [w, h] = choice.value.split(":").map(Number);
        const valid = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
        const scale = valid ? 26 / Math.max(w, h) : 0;
        return (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors ${
              active ? "bg-white/12 text-white" : "text-ink-300 hover:bg-white/5"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center">
              {valid ? (
                <span
                  className={`rounded-[3px] border ${active ? "border-white" : "border-ink-400"}`}
                  style={{ width: Math.max(w * scale, 6), height: Math.max(h * scale, 6) }}
                />
              ) : (
                <span className="text-[10px] uppercase tracking-wide">auto</span>
              )}
            </span>
            <span className="text-[10.5px] tabular-nums">{choice.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SliderControl({ field, value, onChange, dense }: ControlProps) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const current = value === undefined || value === "" ? undefined : Number(value);
  const display = current ?? min;
  return (
    <div className={dense ? "px-1 py-1" : ""}>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="text-ink-300">{field.label}</span>
        <span className="tabular-nums text-white">
          {current === undefined ? "auto" : display}
          {field.chip ? "" : ""}
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
      <div className="mt-0.5 flex justify-between text-[10.5px] tabular-nums text-ink-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {current !== undefined && !field.default && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="mt-1 text-[11px] text-ink-400 underline-offset-2 hover:text-white hover:underline"
        >
          Clear — let the model decide
        </button>
      )}
    </div>
  );
}

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
      className="w-full rounded-xl bg-white/5 px-3 py-2 text-[13px] text-white outline-none ring-1 ring-inset ring-white/10 placeholder:text-ink-500 focus:ring-white/25"
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
      className="w-full rounded-xl bg-white/5 px-3 py-2 text-[13px] text-white outline-none ring-1 ring-inset ring-white/10 placeholder:text-ink-500 focus:ring-white/25"
    />
  );
}

export function ToggleControl({ field, value, onChange }: ControlProps) {
  const on = value === true;
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left"
    >
      <span className="text-[13px] text-ink-200">{field.label}</span>
      <span
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
          on ? "bg-white" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-[3px] h-4 w-4 rounded-full transition-all ${
            on ? "left-[19px] bg-ink-950" : "left-[3px] bg-white"
          }`}
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

function MediaThumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  const kind = mediaKind(url);
  return (
    <div className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-800 ring-1 ring-white/10">
      {kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
      {kind === "video" && (
        <video src={url} className="h-full w-full object-cover" muted playsInline />
      )}
      {kind === "audio" && (
        <div className="flex h-full w-full items-center justify-center text-ink-300">
          <Icon name="audio" size={20} />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Icon name="close" size={12} />
      </button>
    </div>
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
        className={`grid h-6 w-6 place-items-center rounded-full transition-colors ${
          open ? "bg-white/15 text-white" : "text-ink-500 hover:text-white"
        }`}
      >
        <Icon name="link" size={12} />
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
          className="mt-1.5 w-full rounded-lg bg-white/5 px-2.5 py-1.5 text-[11.5px] text-white outline-none ring-1 ring-inset ring-white/10 placeholder:text-ink-500 focus:ring-white/25"
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
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <span className="truncate text-[11.5px] font-medium text-ink-200" title={help}>
        {label}
      </span>
      {count && <span className="text-[10.5px] tabular-nums text-ink-500">{count}</span>}
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
        <UrlField
          value={url}
          placeholder="https://…"
          onCommit={(next) => onChange(next || undefined)}
        />
      </SlotHeader>
      <div className="flex items-center gap-2">
        {url ? (
          <MediaThumb url={url} onRemove={() => onChange(undefined)} />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-dashed border-white/15 text-ink-400 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            {busy ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white" />
            ) : (
              <Icon name="plus" size={18} />
            )}
          </button>
        )}
        {!compact && field.help && (
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-ink-400">{field.help}</p>
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
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
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
        count={`${urls.length}${field.maxItems ? ` / ${field.maxItems}` : ""}`}
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
      <div className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <MediaThumb
            key={`${url}-${index}`}
            url={url}
            onRemove={() => onChange(urls.filter((_, i) => i !== index))}
          />
        ))}
        {!full && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-dashed border-white/15 text-ink-400 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            {busy ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white" />
            ) : (
              <Icon name="plus" size={18} />
            )}
          </button>
        )}
      </div>
      {!compact && field.help && (
        <p className="mt-1.5 text-[11px] leading-snug text-ink-400">{field.help}</p>
      )}
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
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
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
    <div className="flex flex-col gap-2">
      {shots.map((shot, index) => (
        <div key={index} className="rounded-xl bg-white/5 p-2.5 ring-1 ring-inset ring-white/10">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
              Shot {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(shots.filter((_, i) => i !== index))}
              className="text-ink-400 hover:text-white"
              aria-label="Remove shot"
            >
              <Icon name="close" size={13} />
            </button>
          </div>
          <textarea
            value={shot.prompt}
            rows={2}
            placeholder="What happens in this shot…"
            onChange={(event) => update(index, { prompt: event.target.value })}
            className="w-full resize-none rounded-lg bg-black/30 px-2.5 py-2 text-[12.5px] text-white outline-none placeholder:text-ink-500"
          />
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] text-ink-400">Duration</span>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={shot.duration}
              onChange={(event) => update(index, { duration: Number(event.target.value) })}
              className="flex-1"
            />
            <span className="w-8 text-right text-[11px] tabular-nums text-white">{shot.duration}s</span>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...shots, { prompt: "", duration: 5 }])}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2 text-[12px] text-ink-300 transition-colors hover:border-white/30 hover:text-white"
      >
        <Icon name="plus" size={14} /> Add shot
      </button>
      {field.help && <p className="text-[11px] leading-snug text-ink-400">{field.help}</p>}
    </div>
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
    <div className="flex flex-col gap-2">
      {elements.map((element, index) => (
        <div key={index} className="rounded-xl bg-white/5 p-2.5 ring-1 ring-inset ring-white/10">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              value={element.name}
              placeholder="Name (e.g. Mira)"
              onChange={(event) => update(index, { name: event.target.value })}
              className="min-w-0 flex-1 rounded-lg bg-black/30 px-2.5 py-1.5 text-[12.5px] text-white outline-none placeholder:text-ink-500"
            />
            <button
              type="button"
              onClick={() => onChange(elements.filter((_, i) => i !== index))}
              className="text-ink-400 hover:text-white"
              aria-label="Remove element"
            >
              <Icon name="close" size={13} />
            </button>
          </div>
          <textarea
            value={element.description}
            rows={2}
            placeholder="How this character or object looks and behaves…"
            onChange={(event) => update(index, { description: event.target.value })}
            className="w-full resize-none rounded-lg bg-black/30 px-2.5 py-2 text-[12.5px] text-white outline-none placeholder:text-ink-500"
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
            value={element.element_input_urls ?? []}
            onChange={(urls) => update(index, { element_input_urls: urls as string[] })}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...elements, { name: "", description: "" }])}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2 text-[12px] text-ink-300 transition-colors hover:border-white/30 hover:text-white"
      >
        <Icon name="plus" size={14} /> Add element
      </button>
      {field.help && <p className="text-[11px] leading-snug text-ink-400">{field.help}</p>}
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
        value={clip?.url}
        onChange={(url) => (url ? set({ url: url as string }) : onChange([]))}
      />
      {clip?.url && (
        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-1.5 text-[11px] text-ink-400">
            Start
            <input
              type="number"
              min={0}
              step={0.1}
              value={clip.start}
              onChange={(event) => set({ start: Number(event.target.value) })}
              className="w-full rounded-lg bg-white/5 px-2 py-1 text-[12px] text-white outline-none ring-1 ring-inset ring-white/10"
            />
          </label>
          <label className="flex flex-1 items-center gap-1.5 text-[11px] text-ink-400">
            End
            <input
              type="number"
              min={0}
              step={0.1}
              value={clip.ends}
              onChange={(event) => set({ ends: Number(event.target.value) })}
              className="w-full rounded-lg bg-white/5 px-2 py-1 text-[12px] text-white outline-none ring-1 ring-inset ring-white/10"
            />
          </label>
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
