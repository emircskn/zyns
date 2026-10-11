"use client";

import { useRef, useState, type ReactNode } from "react";
import { activeFields, type Field, type ItemField, type Values } from "@/lib/registry";
import { PillGroup } from "@/components/PillGroup";
import { GLIDE_TRANSITION, useGlide } from "@/lib/useGlide";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { mediaKind } from "@/lib/upload";
import { sourceItems, type SourceItem } from "@/lib/sources";

export { sourceItems };
import { useUploader } from "@/lib/useUploader";
import { useModel, useStudio, type Run } from "@/store/studio";
import { CLIP_MAX_SECONDS, clipProblem, openingClip, videoDuration, type Clip } from "@/lib/clips";
import { mediaSrc, thumbSrc } from "@/lib/storage/client";
import { keysFor, moveItem, useReorder } from "@/lib/useReorder";

interface ControlProps {
  field: Field;
  value: unknown;
  values: Values;
  onChange: (value: unknown) => void;
  /** Bar popovers get a denser treatment than the settings panel. */
  dense?: boolean;
  /** Reference strip in the prompt bar: tighter, label above the tiles. */
  compact?: boolean;
  /** The only reference slot there is, so its thumbs keep to one line. */
  lane?: boolean;
  /** A phone's composer: big tiles for a thumb, the remove button always there. */
  roomy?: boolean;
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
            className={`flex w-full items-center justify-between gap-3 rounded-full px-3.5 py-2 text-left text-[13.5px] transition-colors duration-[120ms] ${
              active ? "bg-t1/[0.1] text-t1 ring-1 ring-inset ring-line-strong" : "text-t2 hover:bg-t1/[0.07]"
            }`}
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{choice.label}</span>
              {choice.hint && <span className="truncate text-[11.5px] opacity-60">{choice.hint}</span>}
            </span>
            {active && <Icon name="check" size={16} className="shrink-0" />}
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
                <span className="text-[9.5px] uppercase tracking-[0.08em]">auto</span>
              )}
            </span>
            <span className="font-mono text-[10.5px] tabular-nums">{choice.label}</span>
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
        <span className="text-[12.5px] text-t3">{field.label}</span>
        <span className="font-mono text-[12.5px] tabular-nums text-t1">
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
      <div className="mt-0.5 flex justify-between font-mono text-[10.5px] tabular-nums text-t4">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {current !== undefined && field.default === undefined && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="mt-1.5 text-[11.5px] text-t4 transition-colors hover:text-t1"
        >
          Clear, let the model decide
        </button>
      )}
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-chip bg-t1/[0.055] px-3 py-2 text-[13.5px] text-t1 outline-none ring-1 ring-inset ring-transparent transition-all duration-[120ms] placeholder:text-t4 focus:bg-t1/[0.08] focus:ring-line-strong";

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

/**
 * A plain value moved up to the bar next to the pictures (a voice's name, a
 * song's title) has no picture to say what it is, so it carries its label.
 */
export function InputLabel({ field }: { field: Field }) {
  if (!["text", "number", "select", "segmented", "slider", "textarea"].includes(field.kind)) return null;
  return (
    <div className="mb-1.5 truncate text-[12px] text-t2" title={field.help}>
      {field.label}
    </div>
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
      <span className="text-[13.5px] text-t1/90">{field.label}</span>
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

export function MediaThumb({ url, onRemove, roomy }: { url: string; onRemove: () => void; roomy?: boolean }) {
  const kind = mediaKind(url);
  return (
    <div
      className={`group/thumb anim-pop relative shrink-0 overflow-hidden bg-surface ring-1 ring-inset ring-line ${
        roomy ? "h-[88px] w-[88px] rounded-[20px]" : "h-14 w-14 rounded-chip"
      }`}
    >
      {kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbSrc(url, 256)} alt="" draggable={false} className="h-full w-full object-cover" />
      )}
      {kind === "video" && <video src={mediaSrc(url)} className="h-full w-full object-cover" muted playsInline />}
      {kind === "audio" && (
        <div className="flex h-full w-full items-center justify-center text-t3">
          <Icon name="audio" size={18} />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className={
          roomy
            ? "absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white transition-transform duration-[120ms] active:scale-90"
            : "hover-reveal absolute right-1 top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-canvas-deep/80 text-white opacity-0 transition-opacity duration-[120ms] group-hover/thumb:opacity-100"
        }
      >
        <Icon name="close" size={roomy ? 15 : 11} />
      </button>
    </div>
  );
}

function AddTile({ busy, onClick, roomy }: { busy: boolean; onClick: () => void; roomy?: boolean }) {
  if (roomy) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label="Add"
        className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-[20px] border-[1.5px] border-dashed border-line-strong bg-t1/[0.02] transition-colors duration-[150ms] active:bg-t1/[0.06] disabled:opacity-50"
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-t1/[0.1] text-t1 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]">
          {busy ? <Spinner size={16} /> : <Icon name="plus" size={20} />}
        </span>
      </button>
    );
  }
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
        <Icon name="link" size={14} />
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
          className="anim-fade absolute inset-x-0 top-6 z-10 rounded-chip bg-elevated px-2.5 py-1.5 text-[12px] text-t1 shadow-[var(--shadow-pop)] outline-none ring-1 ring-inset ring-line placeholder:text-t4"
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
      <span className="min-w-0 truncate text-[12px] text-t2" title={help}>
        {label}
      </span>
      {count && (
        <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-t4">{count}</span>
      )}
      {children && <span className="flex shrink-0 items-center">{children}</span>}
    </div>
  );
}

export function MediaControl({ field, value, onChange, compact, roomy }: ControlProps) {
  const [picking, setPicking] = useState(false);
  const url = (value as string) ?? "";

  return (
    <div className="min-w-0">
      <SlotHeader label={field.label} help={field.help}>
        <UrlField value={url} placeholder="https://…" onCommit={(next) => onChange(next || undefined)} />
      </SlotHeader>
      <div className="flex items-center gap-2">
        {url ? (
          <MediaThumb url={url} roomy={roomy} onRemove={() => onChange(undefined)} />
        ) : (
          <AddTile busy={false} roomy={roomy} onClick={() => setPicking(true)} />
        )}
        {!compact && field.help && (
          <p className="min-w-0 flex-1 text-[11.5px] leading-snug text-t4">{field.help}</p>
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

export function ImagesControl({ field, value, onChange, compact, lane, roomy }: ControlProps) {
  const [picking, setPicking] = useState(false);
  const urls = Array.isArray(value) ? (value as string[]) : [];
  const full = field.maxItems !== undefined && urls.length >= field.maxItems;
  // Held and dragged to a new place: the order is the order the model reads them in.
  const reorder = useReorder(urls.length, (from, to) => onChange(moveItem(urls, from, to)));
  const keys = keysFor(urls);

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
      {/* A model with several reference slots gives each one a narrow column,
          so its thumbs wrap after three. A model with a single slot has the
          whole bar: there they stay on one line and scroll. */}
      <div
        className={
          roomy
            ? lane
              ? "no-bar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-0.5 pt-0.5"
              : "flex flex-wrap gap-2.5"
            : lane
              ? "no-bar flex gap-1.5 overflow-x-auto pb-0.5"
              : "flex flex-wrap gap-1.5 [&>*]:w-14"
        }
      >
        {/* First, so another can be added without scrolling to the end. */}
        {!full && <AddTile busy={false} roomy={roomy} onClick={() => setPicking(true)} />}
        {urls.map((url, index) => {
          const { className, ...hold } = reorder.bind(index);
          return (
            <div key={keys[index]} {...hold} className={`shrink-0 ${className}`}>
              <MediaThumb url={url} roomy={roomy} onRemove={() => onChange(urls.filter((_, i) => i !== index))} />
            </div>
          );
        })}
      </div>
      {!compact && field.help && <p className="mt-1.5 text-[11.5px] leading-snug text-t4">{field.help}</p>}
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
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-t4">
              Shot {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(shots.filter((_, i) => i !== index))}
              className="text-t4 transition-colors hover:text-t1"
              aria-label="Remove shot"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
          <textarea
            value={shot.prompt}
            rows={2}
            placeholder="What happens in this shot…"
            onChange={(event) => update(index, { prompt: event.target.value })}
            className="w-full resize-none rounded-chip bg-canvas/50 px-2.5 py-2 text-[13px] text-t1 outline-none placeholder:text-t4"
          />
          <div className="mt-2 flex items-center gap-2.5">
            <span className="text-[11.5px] text-t4">Duration</span>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={shot.duration}
              onChange={(event) => update(index, { duration: Number(event.target.value) })}
              className="flex-1"
            />
            <span className="w-7 text-right font-mono text-[11.5px] tabular-nums text-t1">
              {shot.duration}s
            </span>
          </div>
        </div>
      ))}
      <AddRow label="Add shot" onClick={() => onChange([...shots, { prompt: "", duration: 5 }])} />
      {field.help && <p className="text-[11.5px] leading-snug text-t4">{field.help}</p>}
    </div>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-chip border border-dashed border-line-strong py-2 text-[12.5px] text-t3 transition-all duration-[120ms] hover:border-t1/40 hover:bg-t1/[0.04] hover:text-t1"
    >
      <Icon name="plus" size={16} /> {label}
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
              className="min-w-0 flex-1 rounded-chip bg-canvas/50 px-2.5 py-1.5 text-[13px] text-t1 outline-none placeholder:text-t4"
            />
            <button
              type="button"
              onClick={() => onChange(elements.filter((_, i) => i !== index))}
              className="text-t4 transition-colors hover:text-t1"
              aria-label="Remove element"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
          <textarea
            value={element.description}
            rows={2}
            placeholder="How this character or object looks and behaves…"
            onChange={(event) => update(index, { description: event.target.value })}
            className="mb-2 w-full resize-none rounded-chip bg-canvas/50 px-2.5 py-2 text-[13px] text-t1 outline-none placeholder:text-t4"
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
      {field.help && <p className="text-[11.5px] leading-snug text-t4">{field.help}</p>}
    </div>
  );
}

export function ClipsControl({ field, value, onChange, roomy }: ControlProps) {
  const clips = (Array.isArray(value) ? value : []) as Clip[];
  const clip = clips[0];
  const set = (patch: Partial<Clip>) =>
    onChange([{ url: clip?.url ?? "", start: clip?.start ?? 0, ends: clip?.ends ?? CLIP_MAX_SECONDS, ...patch }]);

  // A new video is trimmed to its opening stretch at once, then to its real
  // length once that is known. A video swapped or removed meanwhile wins.
  const current = useRef<string | undefined>(clip?.url);
  current.current = clip?.url;
  function choose(url: string) {
    onChange([openingClip(url, null)]);
    void videoDuration(url).then((seconds) => {
      if (seconds && current.current === url) onChange([openingClip(url, seconds)]);
    });
  }

  const span = clip ? Number(clip.ends) - Number(clip.start) : 0;
  const problem = clip ? clipProblem(clip) : null;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <MediaControl
        field={{ ...field, kind: "media", accept: "video", label: field.label }}
        values={{}}
        compact
        roomy={roomy}
        value={clip?.url}
        onChange={(url) => (url ? choose(url as string) : onChange([]))}
      />
      {clip?.url && (
        <div className="anim-fade flex items-center gap-1.5 text-[11.5px] text-t4" title={`Up to ${CLIP_MAX_SECONDS} seconds of the video are used`}>
          {(["start", "ends"] as const).map((key, i) => (
            <label key={key} className="flex items-center gap-1">
              {i === 1 && <span aria-hidden>–</span>}
              <span className="sr-only">{key === "start" ? "Start" : "End"}</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={clip[key]}
                onChange={(event) => set({ [key]: Number(event.target.value) })}
                className={`w-[52px] rounded-chip bg-t1/[0.055] px-1.5 py-1 text-center font-mono text-[12px] tabular-nums outline-none ${
                  problem ? "text-[var(--danger)]" : "text-t1"
                }`}
              />
            </label>
          ))}
          <span className="font-mono tabular-nums">{span > 0 ? `${Math.round(span * 10) / 10}s` : "s"}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sources: earlier results a field points at by ID
 * ------------------------------------------------------------------ */

const SOURCE_EMPTY: Record<NonNullable<Field["source"]>["of"], string> = {
  task: "Your finished runs with this model show up here to pick from.",
  track: "Songs you make with Suno Music show up here to pick from.",
  character: "Characters you make in Create character show up here.",
  voice: "Voices you make in Create voice show up here.",
};

/**
 * An earlier result, picked as a tile instead of typed as an ID: the run to
 * extend or upscale, the track a Suno tool works on, the characters and
 * voices a Gemini Omni video uses. The link button still takes a pasted ID,
 * for things made outside the studio.
 */
export function SourceControl({ field, value, values, onChange, roomy }: ControlProps) {
  const runs = useStudio((s) => s.runs);
  const modelId = useStudio((s) => s.modelId);
  const model = useModel();
  const setValue = useStudio((s) => s.setValue);
  const spec = field.source ?? { of: "task" as const };
  const max = spec.max ?? 1;
  const many = max > 1;
  const picked = many
    ? Array.isArray(value)
      ? (value as unknown[]).map(String)
      : []
    : typeof value === "string" && value
      ? [value]
      : [];
  const items = sourceItems(field, runs, modelId).slice(0, 24);
  const strays = picked.filter((id) => !items.some((item) => item.id === id));

  function toggle(item: SourceItem) {
    const on = picked.includes(item.id);
    if (many) {
      if (on) onChange(picked.filter((id) => id !== item.id));
      else if (picked.length < max) onChange([...picked, item.id]);
      return;
    }
    onChange(on ? undefined : item.id);
    // A track belongs to a task, and the tools that take one also ask for
    // the other: picking the track settles both.
    if (spec.of === "track" && model && activeFields(model, values).some((f) => f.key === "task_id")) {
      setValue("task_id", on ? undefined : item.run.taskId);
    }
  }

  const size = roomy ? "h-[88px] w-[88px] rounded-[20px]" : "h-14 w-14 rounded-chip";
  return (
    <div className="min-w-0">
      <SlotHeader label={field.label} count={many ? `${picked.length}/${max}` : undefined} help={field.help}>
        <UrlField
          placeholder="Paste an ID, then Enter"
          onCommit={(next) => {
            if (!next) return;
            if (many) {
              if (!picked.includes(next) && picked.length < max) onChange([...picked, next]);
            } else onChange(next);
          }}
        />
      </SlotHeader>
      {items.length === 0 && strays.length === 0 ? (
        <p className="max-w-[260px] text-[11.5px] leading-snug text-t4">{SOURCE_EMPTY[spec.of]}</p>
      ) : (
        <div className="no-bar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-0.5 pt-0.5">
          {strays.map((id) => (
            <div
              key={id}
              className={`relative grid shrink-0 place-items-center bg-t1/[0.06] px-2 ring-2 ring-t1 ${size}`}
              title={id}
            >
              <span className="line-clamp-3 break-all text-center font-mono text-[10px] leading-tight text-t2">{id}</span>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onChange(many ? picked.filter((p) => p !== id) : undefined)}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
          {items.map((item) => {
            const on = picked.includes(item.id);
            const kind = item.thumb ? mediaKind(item.thumb) : undefined;
            return (
              <button
                key={`${item.run.id}:${item.id}`}
                type="button"
                onClick={() => toggle(item)}
                title={item.title}
                aria-pressed={on}
                className={`group/src relative shrink-0 overflow-hidden bg-surface text-left transition-[box-shadow,opacity] duration-[150ms] ${size} ${
                  on ? "ring-2 ring-t1" : "ring-1 ring-inset ring-line opacity-80 hover:opacity-100"
                }`}
              >
                {kind === "video" ? (
                  <video src={item.thumb} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                ) : kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-t3">
                    <Icon name={item.icon} size={20} />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1 pt-3 text-[10.5px] text-white">
                  {item.title}
                </span>
                {on && (
                  <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-ink">
                    <Icon name="check" size={12} strokeWidth={2.4} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Generic editors for documented shapes the bespoke ones do not cover
 * ------------------------------------------------------------------ */

const SMALL_INPUT =
  "w-full rounded-chip bg-canvas/50 px-2.5 py-1.5 text-[13px] text-t1 outline-none placeholder:text-t4";

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
          <option value="">None</option>
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
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-t4">
              {field.label} {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="text-t4 transition-colors hover:text-t1"
              aria-label="Remove row"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {columns.map((column) => (
              <div key={column.key}>
                {column.kind !== "toggle" && column.kind !== "media" && column.kind !== "images" && (
                  <label className="mb-1 block text-[11.5px] text-t3">
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
      {field.help && <p className="text-[11.5px] leading-snug text-t4">{field.help}</p>}
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
              className="anim-pop flex items-center gap-1 rounded-chip bg-t1/[0.07] px-2 py-1 font-mono text-[11.5px] text-t1"
            >
              {String(item)}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                aria-label="Remove"
                className="text-t4 hover:text-t1"
              >
                <Icon name="close" size={11} />
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
      {field.help && <p className="text-[11.5px] leading-snug text-t4">{field.help}</p>}
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
        className="w-full resize-y rounded-chip bg-t1/[0.055] px-3 py-2 font-mono text-[12.5px] text-t1 outline-none ring-1 ring-inset ring-transparent placeholder:text-t4 focus:ring-line-strong"
      />
      {error && <p className="mt-1 text-[11.5px] text-[#ff8f8f]">{error}</p>}
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
    case "source":
      return <SourceControl {...props} />;
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
  // A chip with nothing chosen should say what it is, not "Auto" — unless
  // the list itself names the empty choice (Higgsfield's "" is its Auto).
  if (empty) return field.choices?.find((c) => c.value === "")?.label || field.label;
  const choice = field.choices?.find((c) => c.value === String(value));
  if (choice) return choice.label;
  const text = String(value);
  return text.length > 22 ? `${text.slice(0, 21)}…` : text;
}
