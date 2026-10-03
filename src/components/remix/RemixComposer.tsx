"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Control, InputLabel, MediaThumb } from "@/components/controls";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { ModeTabs } from "@/components/remix/ModeTabs";
import { Trimmer } from "@/components/remix/Trimmer";
import { PROVIDER_NAME, submitModelRun } from "@/lib/generate";
import { mediaSrc } from "@/lib/storage/client";
import { readMediaMeta, type MediaMeta } from "@/lib/mediaMeta";
import { estimateCredits, formatCredits } from "@/lib/registry/pricing";
import { getModel, providerOf, validateValues, type ModelDef, type Values } from "@/lib/registry";
import {
  GENJUTSU,
  MODE_LABEL,
  baseValues,
  referenceField,
  referenceRoom,
  remixPrice,
  remixValues,
  sourceField,
  sourceLimits,
  settingFields,
  targetOf,
  type SourceLimits,
  type StyleInput,
} from "@/lib/remix/targets";
import { targetKey, type RemixRunInfo } from "@/lib/remix/types";
import { useEstimate } from "@/lib/useEstimate";
import { keysFor, moveItem, useReorder } from "@/lib/useReorder";
import { keyFor, useStudio } from "@/store/studio";

/** A clip's frame and length, read once per clip. */
const metaCache = new Map<string, Promise<MediaMeta | null>>();

export function useClipMeta(url: string | null | undefined): MediaMeta | null | undefined {
  const [meta, setMeta] = useState<MediaMeta | null | undefined>(undefined);
  useEffect(() => {
    setMeta(undefined);
    if (!url) return;
    let live = true;
    let pending = metaCache.get(url);
    if (!pending) {
      pending = readMediaMeta(mediaSrc(url), "video").catch(() => null);
      metaCache.set(url, pending);
    }
    void pending.then((found) => live && setMeta(found));
    return () => {
      live = false;
    };
  }, [url]);
  return meta;
}

function seconds(value: number): string {
  return value >= 10 ? `${Math.round(value)} s` : `${value.toFixed(1)} s`;
}

/** What is wrong with the source for this model, if anything, and whether a trim would fix it. */
export function sourceProblem(meta: MediaMeta | null | undefined, limits: SourceLimits): { text: string; trim: boolean } | null {
  const length = meta?.durationSec;
  if (length && limits.min && length < limits.min - 0.05) {
    return { text: `This clip is ${seconds(length)}. It needs at least ${limits.min} s.`, trim: false };
  }
  if (length && limits.max && length > limits.max + 0.05 && !limits.trims) {
    return { text: `This clip is ${seconds(length)}. Trim it to ${limits.max} s or less.`, trim: true };
  }
  if (meta?.width && meta.height && limits.minPixels && meta.width * meta.height < limits.minPixels) {
    return {
      text: `This clip is ${meta.width}×${meta.height}. It needs a bigger frame (at least ${limits.minPixels.toLocaleString("en-US")} pixels, like 640×640).`,
      trim: false,
    };
  }
  return null;
}

function Box({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-panel border border-line bg-elevated p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[12.5px] text-t2">{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

/** The clip the result keeps the motion (or the scene) of. */
function SourceBox({
  url,
  meta,
  limits,
  onPick,
  onClear,
  extra,
}: {
  url: string | null;
  meta: MediaMeta | null | undefined;
  limits: SourceLimits;
  onPick: () => void;
  onClear: () => void;
  extra?: ReactNode;
}) {
  const problem = sourceProblem(meta, limits);
  const length = meta?.durationSec;
  const over = !!length && !!limits.max && limits.trims && length > limits.max + 0.05;
  const rule =
    limits.min && limits.max ? `${limits.min}–${limits.max} s` : limits.min ? `${limits.min} s or longer` : undefined;
  return (
    <Box title="Source video" right={rule && <span className="font-mono text-[11px] text-t4">{rule}</span>}>
      {url ? (
        <div className="flex flex-col gap-2">
          <div className="relative overflow-hidden rounded-card bg-canvas-deep">
            <video
              key={url}
              src={mediaSrc(url)}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              className="max-h-[260px] w-full object-contain"
            />
            {length ? (
              <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[11px] text-white">
                {seconds(length)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClear}
              aria-label="Remove the source video"
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white transition-transform duration-[120ms] active:scale-90"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
          {problem ? (
            <p role="alert" className="flex items-start gap-1.5 text-[12.5px] leading-snug" style={{ color: "var(--danger)" }}>
              <Icon name="alert" size={15} className="mt-px shrink-0" />
              {problem.text}
            </p>
          ) : over ? (
            <p className="text-[12.5px] leading-snug text-t3">
              Only the first {limits.max} s are used. Trim it to pick another stretch.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onPick}
              className="rounded-full bg-t1/[0.07] px-3 py-1.5 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
            >
              Replace
            </button>
            {extra}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-line-strong bg-t1/[0.02] px-3 py-7 text-center transition-colors duration-[150ms] hover:bg-t1/[0.04] active:bg-t1/[0.05]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-t1/[0.08] text-t2">
            <Icon name="video" size={18} />
          </span>
          <span className="text-[13.5px] text-t2">Add a video</span>
          <span className="text-[12px] text-t4">Upload, or pick one from Assets</span>
        </button>
      )}
    </Box>
  );
}

/** The pictures the result takes its characters (or objects) from, in the order the model reads them. */
function RefsBox({
  label,
  refs,
  room,
  required,
  onChange,
  onAdd,
  onElements,
}: {
  label: string;
  refs: string[];
  room: number;
  required: boolean;
  onChange: (refs: string[]) => void;
  onAdd: () => void;
  onElements: () => void;
}) {
  const keys = keysFor(refs);
  const reorder = useReorder(refs.length, (from, to) => onChange(moveItem(refs, from, to)));
  const full = refs.length >= room;
  return (
    <Box
      title={label}
      right={
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={onElements}
            className="flex items-center gap-1 rounded-full bg-t1/[0.07] px-2.5 py-1 text-[12px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
          >
            <Icon name="user" size={13} />
            Elements
          </button>
          <span className="font-mono text-[11px] tabular-nums text-t4">
            {refs.length}/{room}
          </span>
        </span>
      }
    >
      <div className="no-bar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 pt-0.5">
        {!full && (
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add pictures"
            className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-[20px] border-[1.5px] border-dashed border-line-strong bg-t1/[0.02] text-t2 transition-colors duration-[150ms] hover:bg-t1/[0.05]"
          >
            <Icon name="plus" size={18} />
          </button>
        )}
        {refs.map((url, index) => {
          const { className, ...hold } = reorder.bind(index);
          return (
            <div key={keys[index]} {...hold} className={`shrink-0 ${className}`}>
              <MediaThumb url={url} roomy onRemove={() => onChange(refs.filter((_, i) => i !== index))} />
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-t4">
        {refs.length > 1
          ? "Hold and drag to reorder. The model reads them in this order."
          : required
            ? "Add at least one: a character, an outfit, a product."
            : "Optional."}
      </p>
    </Box>
  );
}

/** Library elements, to bring their pictures in as references. */
function ElementChooser({ open, onPick, onClose }: { open: boolean; onPick: (urls: string[]) => void; onClose: () => void }) {
  const elements = useStudio((s) => s.elements).filter((e) => e.kind !== "style");
  if (!open) return null;
  return (
    <div className="anim-fade rounded-panel border border-line bg-elevated p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12.5px] text-t2">Add from Elements</span>
        <button type="button" onClick={onClose} aria-label="Close" className="text-t4 hover:text-t1">
          <Icon name="close" size={16} />
        </button>
      </div>
      {elements.length === 0 ? (
        <p className="py-3 text-center text-[12.5px] text-t4">No characters, places or products yet. Make one on the Elements page.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {elements.map((element) => (
            <button
              key={element.id}
              type="button"
              onClick={() => onPick(element.images.map((ref) => ref.storageUrl))}
              title={`@${element.name}`}
              className="group flex flex-col items-center gap-1"
            >
              <span className="block aspect-square w-full overflow-hidden rounded-card bg-surface-2 ring-1 ring-inset ring-line transition-transform duration-[120ms] group-hover:scale-[1.03]">
                {element.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaSrc(element.images[0].storageUrl)} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="w-full truncate text-center text-[11px] text-t3">@{element.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** What a send would cost: Genjutsu by the source's seconds, other models by their own estimate. */
function usePrice(model: ModelDef | undefined, values: Values, blocker: string | null, length: number | undefined) {
  const higgsfield = providerOf(model) === "higgsfield";
  const perSecond = model && model.id === GENJUTSU ? remixPrice(model, values, length) : null;
  const quoted = useEstimate(higgsfield && !perSecond ? model : undefined, values, blocker);
  if (!model) return null;
  if (perSecond) return perSecond;
  if (higgsfield) return quoted ?? model.creditHint?.(values) ?? null;
  const credits = estimateCredits(model, values);
  return model.creditHint?.(values) ?? (credits !== undefined ? formatCredits(credits) : null);
}

/** The Remix composer: the mode, the source, the references, the prompt and the model's own settings. */
export function RemixComposer({
  onKeyClick,
  above,
  below,
  style,
  needsStyle,
  info,
}: {
  onKeyClick: () => void;
  /** Restyle's model row, between the tabs and the source. */
  above?: ReactNode;
  /** Restyle's style row, under the references. */
  below?: ReactNode;
  /** A style the chosen model takes as a reference and a line of prompt. */
  style?: StyleInput;
  /** Why there is no style yet, where the model cannot go without one. */
  needsStyle?: string | null;
  /** More for the run to remember (the style's name). */
  info?: Partial<RemixRunInfo>;
}) {
  const remix = useStudio((s) => s.remix);
  const patchRemix = useStudio((s) => s.patchRemix);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);
  const target = targetOf(remix);
  const model = getModel(target.modelId);
  const [picking, setPicking] = useState<"source" | "refs" | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [trimming, setTrimming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = useClipMeta(remix.source);

  // A new mode, model or input clears what went wrong last time.
  useEffect(() => setError(null), [remix.mode, remix.source, remix.refs, targetKey(target)]);

  const own = useMemo(() => (model ? baseValues(model, target, remix) : {}), [model, target, remix]);
  const built = useMemo(() => (model ? remixValues(model, target, remix, style) : null), [model, target, remix, style]);
  const limits = model ? sourceLimits(model, own) : { trims: false };
  const problem = sourceProblem(meta, limits);
  const refsField = model ? referenceField(model, own) : undefined;
  const room = model ? referenceRoom(model, own) : 0;
  const provider = providerOf(model);
  const key = keyFor({ apiKey, hfKey }, provider);

  const blocker = !model
    ? "This model is not available."
    : !remix.source
      ? "Add a source video to continue."
      : problem
        ? problem.text
        : needsStyle
          ? needsStyle
          : built
            ? validateValues(model, built.values)
            : null;
  const price = usePrice(model, built?.values ?? own, blocker, meta?.durationSec);

  function setSetting(name: string, value: unknown) {
    patchRemix((r) => ({
      settings: { ...r.settings, [targetKey(target)]: { ...(r.settings[targetKey(target)] ?? {}), [name]: value } },
    }));
  }

  async function generate() {
    if (!model || !built) return;
    if (!key) return onKeyClick();
    if (busy || blocker) return;
    setBusy(true);
    setError(null);
    const result = await submitModelRun(model, built.values, {
      remix: {
        mode: remix.mode,
        source: remix.source!,
        refs: remix.refs,
        ...(remix.mode === "restyle" ? { presetId: remix.presetId, styleId: remix.styleId } : {}),
        ...info,
      },
    });
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Could not send this.");
  }

  const settings = model ? settingFields(model, own) : [];
  const promptText = remix.prompts[remix.mode] ?? "";

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-panel border border-line bg-elevated p-1.5">
        <ModeTabs />
      </div>
      {above}
      <SourceBox
        url={remix.source}
        meta={meta}
        limits={limits}
        onPick={() => setPicking("source")}
        onClear={() => patchRemix({ source: null })}
        extra={
          meta?.durationSec && (!limits.min || meta.durationSec > limits.min) ? (
            <button
              type="button"
              onClick={() => setTrimming(true)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition-colors duration-[120ms] ${
                problem?.trim || (limits.trims && limits.max && meta.durationSec > limits.max)
                  ? "cta font-medium"
                  : "bg-t1/[0.07] text-t2 hover:bg-t1/[0.12] hover:text-t1"
              }`}
            >
              <Icon name="film" size={14} />
              Trim
            </button>
          ) : undefined
        }
      />
      {remix.source && meta?.durationSec ? (
        <Trimmer
          open={trimming}
          url={remix.source}
          duration={meta.durationSec}
          min={limits.min}
          max={limits.max}
          onClose={() => setTrimming(false)}
          onDone={(url) => {
            setTrimming(false);
            patchRemix({ source: url });
          }}
        />
      ) : null}
      {refsField && (
        <RefsBox
          label={refsField.label}
          refs={remix.refs.slice(0, room)}
          room={room}
          required={!!refsField.required}
          onChange={(refs) => patchRemix({ refs })}
          onAdd={() => setPicking("refs")}
          onElements={() => setChoosing((was) => !was)}
        />
      )}
      <ElementChooser
        open={choosing}
        onClose={() => setChoosing(false)}
        onPick={(urls) => {
          patchRemix((r) => ({ refs: [...r.refs, ...urls.filter((u) => !r.refs.includes(u))].slice(0, room) }));
          setChoosing(false);
        }}
      />
      {below}
      <Box title="Prompt" right={<span className="text-[11px] text-t4">Optional</span>}>
        <textarea
          value={promptText}
          rows={3}
          placeholder={
            remix.mode === "swap"
              ? "What to swap, and for what: “the jacket for the one in the picture”"
              : remix.mode === "restyle"
                ? "Anything the style should keep or change"
                : "Describe the new scene"
          }
          onChange={(event) => patchRemix((r) => ({ prompts: { ...r.prompts, [r.mode]: event.target.value } }))}
          className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-t1 outline-none placeholder:text-t4 md:text-[13.5px]"
        />
      </Box>
      {model && settings.length > 0 && (
        <Box title="Settings">
          <div className="flex flex-col gap-3">
            {settings.map((field) => (
              <div key={field.key}>
                <InputLabel field={field} />
                <Control
                  field={field}
                  value={own[field.key]}
                  values={own}
                  dense
                  onChange={(value) => setSetting(field.key, value)}
                />
              </div>
            ))}
          </div>
        </Box>
      )}
      {built && built.warnings.length > 0 && (
        <p className="px-1 text-[12px] leading-snug text-t4">{built.warnings.join(" ")}</p>
      )}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={!!key && (busy || !!blocker)}
          title={blocker ?? undefined}
          className="cta flex h-12 w-full items-center justify-center gap-2 rounded-panel text-[15.5px] font-semibold disabled:opacity-40"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : !key ? (
            <>
              <Icon name="key" size={17} />
              Add your {PROVIDER_NAME[provider]} key
            </>
          ) : (
            <>
              {MODE_LABEL[remix.mode]}
              <Icon name="spark" size={15} fill="currentColor" strokeWidth={1.2} />
              {price && <span className="font-mono text-[13px] font-medium tabular-nums opacity-70">{price}</span>}
            </>
          )}
        </button>
        {error ? (
          <p role="alert" className="flex items-start gap-1.5 px-1 text-[12.5px] leading-snug" style={{ color: "var(--danger)" }}>
            <Icon name="alert" size={15} className="mt-px shrink-0" />
            {error}
          </p>
        ) : key && blocker ? (
          <p className="px-1 text-center text-[12px] text-t4">{blocker}</p>
        ) : null}
      </div>
      <MediaPicker
        open={picking !== null}
        accept={picking === "source" ? "video" : "image"}
        multiple={picking === "refs"}
        taken={picking === "refs" ? remix.refs : remix.source ? [remix.source] : []}
        onPick={(urls) => {
          if (picking === "source") patchRemix({ source: urls[0] ?? null });
          else patchRemix((r) => ({ refs: [...r.refs, ...urls].slice(0, room) }));
        }}
        onClose={() => setPicking(null)}
      />
    </div>
  );
}

