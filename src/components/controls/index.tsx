"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Field, ItemField, Values } from "@/lib/registry";
import { PillGroup } from "@/components/PillGroup";
import { GLIDE_TRANSITION, useGlide } from "@/lib/useGlide";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { mediaKind } from "@/lib/upload";
import { useUploader } from "@/lib/useUploader";
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
            className={`flex w-full items-center justify-between gap-3 rounded-full px-3.5 py-2 text-left text-[13px] transition-colors duration-[120ms] ${
              active ? "bg-t1 text-canvas" : "text-t2 hover:bg-t1/[0.07]"
            }`}
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{choice.label}</span>
              {choice.hint && <span className="truncate text-[11px] opacity-60">{choice.hint}</span>}
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
    <PillGroup
      fill
      value={String(value ?? "")}
      onChange={onChange}
      items={(field.choices ?? []).map((choice) => ({
        id: choice.value,
        label: choice.label,
        hint: choice.hint,
      }))}
    />
  );
}

/** Aspect ratios read better as proportional boxes than as a list. */
export function RatioPicker({ field, value, onChange }: ControlProps) {
  const root = useRef<HTMLDivElement>(null);
  const current = String(value ?? "");
  const { box, settled } = useGlide(root, current, [field.choices?.length]);
  return (
    <div ref={root} className="relative grid grid-cols-4 gap-1">
      {box && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-card bg-t1"
          style={{
            width: box.w,
            height: box.h,
            transform: `translate(${box.x}px, ${box.y}px)`,
            transition: settled ? GLIDE_TRANSITION : "none",
          }}
        />
      )}
      {(field.choices ?? []).map((choice, index) => {
        const active = current === choice.value;
        const [w, h] = choice.value.split(":").map(Number);
        const valid = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
        const scale = valid ? 24 / Math.max(w, h) : 0;
        return (
          <button
            key={choice.value}
            type="button"
            data-pill={choice.value}
            onClick={() => onChange(choice.value)}
            style={{ animationDelay: `${40 + index * 14}ms` }}
            className={`anim-swap relative z-10 flex flex-col items-center gap-1.5 rounded-card px-1 py-2 transition-colors duration-[200ms] ${
              active ? "text-canvas" : "text-t3 hover:bg-t1/[0.07] hover:text-t1"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center">
              {valid ? (
                <span
                  className="rounded-[2px] border transition-all duration-[320ms]"
                  style={{
                    width: Math.max(w * scale, 5),
                    height: Math.max(h * scale, 5),
                    borderColor: active ? "var(--canvas)" : "var(--line-strong)",
                    transform: active ? "scale(1.12)" : "scale(1)",
                    transitionTimingFunction: "var(--ease-spring)",
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
        className="hover-reveal absolute right-1 top-1 grid place-items-center rounded-full bg-canvas-deep/80 text-white opacity-0 backdrop-blur-sm transition-opacity duration-[120ms] group-hover/thumb:opacity-100"
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
    // The paste-a-URL button belongs to the label, so it sits beside it
    // rather than drifting to the far edge of a wide column.
    <div className="relative mb-1.5 flex items-center gap-1">
      <span className="min-w-0 truncate text-[11.5px] text-t2" title={help}>
        {label}
      </span>
      {count && (
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-t4">{count}</span>
      )}
      {children && <span className="flex shrink-0 items-center">{children}</span>}
    </div>
  );
}

export function MediaControl({ field, value, onChange, compact }: ControlProps) {
  const [picking, setPicking] = useState(false);
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
          <AddTile busy={false} onClick={() => setPicking(true)} />
        )}
        {!compact && field.help && (
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-t4">{field.help}</p>
        )}
      </div>
      <MediaPicker
        open={picking}
        accept={field.accept ?? "image"}
        taken={url ? [url] : []}
        onPick={(picked) => onChange(picked[0])}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}

export function ImagesControl({ field, value, onChange, compact }: ControlProps) {
  const [picking, setPicking] = useState(false);
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
        {!full && <AddTile busy={false} onClick={() => setPicking(true)} />}
      </div>
      {!compact && field.help && <p className="mt-1.5 text-[11px] leading-snug text-t4">{field.help}</p>}
      <MediaPicker
        open={picking}
        accept={field.accept ?? "image"}
        multiple
        taken={urls}
        onPick={(picked) => {
          const room = field.maxItems ? field.maxItems - urls.length : picked.length;
          onChange([...urls, ...picked.slice(0, Math.max(room, 0))]);
        }}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Repeating groups
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

/* ------------------------------------------------------------------ *
 * Generic editors for documented shapes the bespoke ones do not cover
 * ------------------------------------------------------------------ */

const SMALL_INPUT =
  "w-full rounded-chip bg-canvas/50 px-2.5 py-1.5 text-[12.5px] text-t1 outline-none placeholder:text-t4";

function ItemInput({
  column,
  value,
  onChange,
}: {
  column: ItemField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (column.kind) {
    case "select":
      return (
        <select
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value || undefined)}
          className={SMALL_INPUT}
        >
          <option value="">—</option>
          {(column.choices ?? []).map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      );
    case "number":
      return (
        <input
          type="number"
          min={column.min}
          max={column.max}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
          className={`${SMALL_INPUT} font-mono tabular-nums`}
        />
      );
    case "toggle":
      return (
        <ToggleControl
          field={{ key: column.key, label: column.label, kind: "toggle", placement: "panel" }}
          values={{}}
          value={value}
          onChange={onChange}
        />
      );
    case "media":
      return (
        <MediaControl
          field={{ key: column.key, label: column.label, kind: "media", placement: "panel", accept: column.accept }}
          values={{}}
          compact
          value={value}
          onChange={onChange}
        />
      );
    case "images":
      return (
        <ImagesControl
          field={{ key: column.key, label: column.label, kind: "images", placement: "panel", accept: column.accept }}
          values={{}}
          compact
          value={value}
          onChange={onChange}
        />
      );
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          placeholder={column.help}
          onChange={(event) => onChange(event.target.value)}
          className={SMALL_INPUT}
        />
      );
  }
}

/** Array-of-objects parameter, one card per row, columns from the docs. */
export function RecordsControl({ field, value, onChange }: ControlProps) {
  const rows = (Array.isArray(value) ? value : []) as Record<string, unknown>[];
  const columns = field.itemFields ?? [];
  const update = (index: number, key: string, next: unknown) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: next } : row)));
  const full = field.maxItems !== undefined && rows.length >= field.maxItems;

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, index) => (
        <div key={index} className="anim-pop rounded-card bg-t1/[0.04] p-2.5 ring-1 ring-inset ring-line">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-t4">
              {field.label} {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="text-t4 transition-colors hover:text-t1"
              aria-label="Remove row"
            >
              <Icon name="close" size={12} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {columns.map((column) => (
              <div key={column.key}>
                {column.kind !== "toggle" && column.kind !== "media" && column.kind !== "images" && (
                  <label className="mb-1 block text-[11px] text-t3">
                    {column.label}
                    {column.required && <span className="text-t4"> · required</span>}
                  </label>
                )}
                <ItemInput
                  column={column}
                  value={row[column.key]}
                  onChange={(next) => update(index, column.key, next)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {!full && <AddRow label={`Add ${field.label.toLowerCase().replace(/s$/, "")}`} onClick={() => onChange([...rows, {}])} />}
      {field.help && <p className="text-[11px] leading-snug text-t4">{field.help}</p>}
    </div>
  );
}

/** A list of plain strings — IDs, indexes — entered one at a time. */
export function ListControl({ field, value, onChange }: ControlProps) {
  const items = (Array.isArray(value) ? value : []) as Array<string | number>;
  const full = field.maxItems !== undefined && items.length >= field.maxItems;
  return (
    <div className="flex flex-col gap-1.5">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="anim-pop flex items-center gap-1 rounded-chip bg-t1/[0.07] px-2 py-1 font-mono text-[11px] text-t1"
            >
              {String(item)}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                aria-label="Remove"
                className="text-t4 hover:text-t1"
              >
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      {!full && (
        <input
          type="text"
          placeholder={field.placeholder ?? "Type a value and press Enter"}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            const next = event.currentTarget.value.trim();
            if (!next) return;
            onChange([...items, /^-?\d+$/.test(next) ? Number(next) : next]);
            event.currentTarget.value = "";
            event.preventDefault();
          }}
          className={INPUT_CLASS}
        />
      )}
      {field.help && <p className="text-[11px] leading-snug text-t4">{field.help}</p>}
    </div>
  );
}

/** Raw JSON for the rare nested shapes nothing else fits. */
export function JsonControl({ field, value, onChange }: ControlProps) {
  const [error, setError] = useState<string | null>(null);
  const text = typeof value === "string" ? value : value === undefined ? "" : JSON.stringify(value, null, 2);
  return (
    <div>
      <textarea
        value={text}
        rows={4}
        spellCheck={false}
        placeholder={field.placeholder ?? "[ ... ]"}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === "" ? undefined : next);
          if (!next.trim()) return setError(null);
          try {
            JSON.parse(next);
            setError(null);
          } catch {
            setError("Not valid JSON yet.");
          }
        }}
        className="w-full resize-y rounded-chip bg-t1/[0.055] px-3 py-2 font-mono text-[12px] text-t1 outline-none ring-1 ring-inset ring-transparent placeholder:text-t4 focus:ring-line-strong"
      />
      {error && <p className="mt-1 text-[11px] text-[#ff8f8f]">{error}</p>}
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
    case "records":
      return <RecordsControl {...props} />;
    case "list":
      return <ListControl {...props} />;
    case "json":
      return <JsonControl {...props} />;
    default:
      return <TextControl {...props} />;
  }
}

/** The caption a bar chip shows for the current value. */
export function chipCaption(field: Field, value: unknown, values: Values): string {
  if (field.chip) return field.chip(value, values);
  if (field.kind === "toggle") return field.label;
  if (["images", "records", "list", "shots", "elements", "clips"].includes(field.kind)) {
    const n = Array.isArray(value) ? value.length : 0;
    return n === 0 ? field.label : `${n} ${field.label.toLowerCase()}`;
  }
  const empty = value === undefined || value === null || value === "";
  // A chip with nothing chosen should say what it is, not "Auto".
  if (empty) return field.label;
  const choice = field.choices?.find((c) => c.value === String(value));
  if (choice) return choice.label;
  const text = String(value);
  return text.length > 22 ? `${text.slice(0, 21)}…` : text;
}
