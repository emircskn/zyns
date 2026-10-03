"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Control, InputLabel, MediaThumb } from "@/components/controls";
import { Dropzone, Pill, RoundIcon, Row, Switch } from "@/components/remix/Row";
import { VendorBadge } from "@/components/VendorMark";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { ModeTabs } from "@/components/remix/ModeTabs";
import { Trimmer } from "@/components/remix/Trimmer";
import { MotionLibrary } from "@/components/remix/MotionLibrary";
import { Sheet } from "@/components/remix/Restyle";
import { saveMotionClip } from "@/lib/remix/library";
import { PROVIDER_NAME, submitModelRun } from "@/lib/generate";
import { mediaSrc } from "@/lib/storage/client";
import { readMediaMeta, type MediaMeta } from "@/lib/mediaMeta";
import { estimateCredits, formatCredits } from "@/lib/registry/pricing";
import { getModel, providerOf, validateValues, type Field, type ModelDef, type Values } from "@/lib/registry";
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
import { promptIsOn, targetKey, type RemixMode, type RemixRunInfo } from "@/lib/remix/types";
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

const SOURCE_TITLE: Record<RemixMode, string> = {
  motion: "Add a video to take the motion from",
  swap: "Add a video to edit",
  restyle: "Add a video to restyle",
};

const REFS_TITLE: Record<RemixMode, string> = {
  motion: "Add your characters",
  swap: "Add your characters, products, or clothes",
  restyle: "Add characters to restyle",
};

function rule(limits: SourceLimits): string | undefined {
  if (limits.min && limits.max) return `Video duration: ${limits.min} to ${limits.max} seconds`;
  if (limits.min) return `Video duration: ${limits.min} seconds or longer`;
  if (limits.max) return `Video duration: up to ${limits.max} seconds`;
  return undefined;
}

/** The clip the result keeps the motion (or the scene) of. */
function SourceBox({
  mode,
  url,
  meta,
  limits,
  onPick,
  onLibrary,
  onClear,
  extra,
}: {
  mode: RemixMode;
  url: string | null;
  meta: MediaMeta | null | undefined;
  limits: SourceLimits;
  onPick: () => void;
  /** The Motion library, to pick a kept clip. */
  onLibrary: () => void;
  onClear: () => void;
  extra?: ReactNode;
}) {
  const clips = useStudio((s) => s.motionClips);
  const kept = !!url && clips.some((clip) => clip.url === url);
  const problem = sourceProblem(meta, limits);
  const length = meta?.durationSec;
  const over = !!length && !!limits.max && limits.trims && length > limits.max + 0.05;
  if (!url) {
    return (
      <Dropzone
        icons={<RoundIcon name="video" />}
        title={SOURCE_TITLE[mode]}
        sub={rule(limits)}
        onClick={onPick}
        action={
          <Pill icon="plus" onClick={onLibrary}>
            Select from the Motion library{clips.length > 0 ? ` (${clips.length})` : ""}
          </Pill>
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-panel bg-elevated p-2">
      <div className="relative overflow-hidden rounded-card bg-canvas-deep">
        <video
          key={url}
          src={mediaSrc(url)}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          className="max-h-[300px] w-full object-contain"
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
        <p role="alert" className="flex items-start gap-1.5 px-1 text-[12.5px] leading-snug" style={{ color: "var(--danger)" }}>
          <Icon name="alert" size={15} className="mt-px shrink-0" />
          {problem.text}
        </p>
      ) : over ? (
        <p className="px-1 text-[12.5px] leading-snug text-t3">Only the first {limits.max} s are used. Trim it to pick another stretch.</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5 px-0.5 pb-0.5">
        <SmallPill onClick={onPick}>Replace</SmallPill>
        {clips.length > 0 && <SmallPill onClick={onLibrary}>Library</SmallPill>}
        {extra}
        <button
          type="button"
          onClick={() => url && !kept && void saveMotionClip(url)}
          disabled={kept}
          className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] text-t3 transition-colors duration-[120ms] hover:text-t1 disabled:hover:text-t3"
        >
          <Icon name={kept ? "check" : "plus"} size={13} />
          {kept ? "In library" : "Save to library"}
        </button>
      </div>
    </div>
  );
}

function SmallPill({ children, onClick, strong }: { children: ReactNode; onClick: () => void; strong?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition-colors duration-[120ms] ${
        strong ? "cta font-medium" : "bg-t1/[0.07] text-t2 hover:bg-t1/[0.12] hover:text-t1"
      }`}
    >
      {children}
    </button>
  );
}

/** The pictures the result takes its characters (or objects) from, in the order the model reads them. */
function RefsBox({
  mode,
  label,
  refs,
  room,
  required,
  onChange,
  onAdd,
  onElements,
}: {
  mode: RemixMode;
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
  if (refs.length === 0) {
    return (
      <Dropzone
        icons={
          <>
            <RoundIcon name="user" />
            <RoundIcon name="shirt" overlap />
            <RoundIcon name="box" overlap />
          </>
        }
        title={REFS_TITLE[mode]}
        sub={`Up to ${room} ${room === 1 ? "image" : "images"}${required ? "" : " · optional"}`}
        onClick={onAdd}
        action={
          <Pill icon="user" onClick={onElements}>
            From Elements
          </Pill>
        }
      />
    );
  }
  return (
    <div className="rounded-panel bg-elevated p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="text-[13.5px] text-t1">
          {label} <span className="font-mono text-[11.5px] tabular-nums text-t4">{refs.length}/{room}</span>
        </span>
        <SmallPill onClick={onElements}>
          <Icon name="user" size={13} />
          Elements
        </SmallPill>
      </div>
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
      {refs.length > 1 && (
        <p className="mt-2 text-[11.5px] leading-snug text-t4">Hold and drag to reorder. The model reads them in this order.</p>
      )}
    </div>
  );
}

/** A setting with a short list of values, as a row that opens its list in place. */
function SettingRow({ field, value, onChange }: { field: Field; value: unknown; onChange: (value: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const choices = field.choices ?? [];
  const current = choices.find((c) => String(c.value) === String(value ?? field.default ?? ""));
  return (
    <Row
      label={field.label}
      value={<span className="truncate">{current?.label ?? String(value ?? "—")}</span>}
      chevron="down"
      open={open}
      onClick={() => setOpen((was) => !was)}
    >
      {open && (
        <div className="anim-fade flex flex-col gap-px border-t border-line p-1.5">
          {choices.map((choice) => {
            const on = choice === current;
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => {
                  onChange(choice.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-3 rounded-card px-3 py-2.5 text-left text-[14px] transition-colors duration-[120ms] ${
                  on ? "bg-t1/[0.08] text-t1" : "text-t2 hover:bg-t1/[0.05] hover:text-t1"
                }`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{choice.label}</span>
                  {choice.hint && <span className="truncate text-[12px] text-t4">{choice.hint}</span>}
                </span>
                {on && <Icon name="check" size={16} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </Row>
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
  modelRow,
  below,
  style,
  needsStyle,
  info,
}: {
  onKeyClick: () => void;
  /** Restyle's model row, in place of the plain one naming the model. */
  modelRow?: ReactNode;
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
  const [library, setLibrary] = useState(false);
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

  const promptOn = promptIsOn(remix);

  return (
    <div className="flex flex-col gap-2.5">
      <ModeTabs />
      <SourceBox
        mode={remix.mode}
        url={remix.source}
        meta={meta}
        limits={limits}
        onPick={() => setPicking("source")}
        onLibrary={() => setLibrary(true)}
        onClear={() => patchRemix({ source: null })}
        extra={
          meta?.durationSec && (!limits.min || meta.durationSec > limits.min) ? (
            <SmallPill
              onClick={() => setTrimming(true)}
              strong={!!problem?.trim || (limits.trims && !!limits.max && meta.durationSec > limits.max)}
            >
              <Icon name="film" size={14} />
              Trim
            </SmallPill>
          ) : undefined
        }
      />
      <Sheet open={library} title="Motion library" sub="Clips kept for their motion" onClose={() => setLibrary(false)}>
        <MotionLibrary onUsed={() => setLibrary(false)} />
      </Sheet>
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
          mode={remix.mode}
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
      {/* The prompt is optional here: off, nothing is sent with the run. */}
      <div className="rounded-panel bg-elevated">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="flex-1 text-[15px] text-t1">Prompt</span>
          <Switch
            label="Prompt"
            on={promptOn}
            onFlip={() => patchRemix((r) => ({ promptOn: { ...r.promptOn, [r.mode]: !promptIsOn(r) } }))}
          />
        </div>
        {promptOn && (
          <div className="anim-fade border-t border-line px-4 pb-3 pt-2.5">
            <textarea
              value={promptText}
              rows={3}
              autoFocus={!promptText}
              placeholder={
                remix.mode === "swap"
                  ? "What to swap, and for what: “the jacket for the one in the picture”"
                  : remix.mode === "restyle"
                    ? "Anything the style should keep or change"
                    : "Describe the new scene"
              }
              onChange={(event) =>
                patchRemix((r) => ({
                  prompts: { ...r.prompts, [r.mode]: event.target.value },
                  promptOn: { ...r.promptOn, [r.mode]: true },
                }))
              }
              className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-t1 outline-none placeholder:text-t4 md:text-[14px]"
            />
          </div>
        )}
      </div>
      {modelRow ??
        (model && (
          <Row
            label="Model"
            lead={<VendorBadge model={model} size={34} />}
            value={<span className="truncate">{model.id === GENJUTSU ? "Higgsfield Genjutsu" : model.name}</span>}
          />
        ))}
      {model &&
        settings.map((field) =>
          field.choices && field.choices.length > 0 && (field.kind === "select" || field.kind === "segmented" || field.kind === "ratio") ? (
            <SettingRow key={field.key} field={field} value={own[field.key]} onChange={(value) => setSetting(field.key, value)} />
          ) : (
            <div key={field.key} className="rounded-panel bg-elevated px-4 py-3">
              <InputLabel field={field} />
              <Control field={field} value={own[field.key]} values={own} dense onChange={(value) => setSetting(field.key, value)} />
            </div>
          ),
        )}
      {built && built.warnings.length > 0 && <p className="px-1 text-[12px] leading-snug text-t4">{built.warnings.join(" ")}</p>}
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 px-1 text-[12.5px] leading-snug" style={{ color: "var(--danger)" }}>
          <Icon name="alert" size={15} className="mt-px shrink-0" />
          {error}
        </p>
      ) : key && blocker ? (
        <p className="px-1 text-center text-[12px] text-t4">{blocker}</p>
      ) : null}
      {/* Held in reach on a phone while the composer is on screen, as Higgsfield's is. */}
      <div className="sticky bottom-[calc(var(--nav-h)+10px)] z-20 rounded-panel bg-canvas md:static">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={!!key && (busy || !!blocker)}
          title={blocker ?? undefined}
          className="cta flex h-[56px] w-full items-center justify-center gap-2 rounded-panel text-[16.5px] font-semibold shadow-[0_8px_24px_rgb(0_0_0/0.35)] disabled:opacity-60 md:h-12 md:text-[15.5px] md:shadow-none"
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
              Generate
              <Icon name="spark" size={15} fill="currentColor" strokeWidth={1.2} />
              {price && <span className="font-mono text-[13px] font-medium tabular-nums opacity-70">{price}</span>}
            </>
          )}
        </button>
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

