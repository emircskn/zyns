"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Control, InputLabel, MediaThumb } from "@/components/controls";
import { ReferencePicker } from "@/components/studio/ReferencePicker";
import { Row } from "@/components/remix/Row";
import { ModelMedia } from "@/components/ModelMedia";
import { FieldChip, TileChips } from "@/components/PromptBar";
import { BLURB, bannerOf } from "@/lib/remix/banner";
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
import { targetKey, type RemixMode, type RemixRunInfo } from "@/lib/remix/types";
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

function rule(limits: SourceLimits): string | undefined {
  if (limits.min && limits.max) return `${limits.min} to ${limits.max} seconds`;
  if (limits.min) return `${limits.min} seconds or longer`;
  if (limits.max) return `up to ${limits.max} seconds`;
  return undefined;
}

/** The small round buttons the composer's boxes carry. */
function SmallPill({ children, onClick, strong }: { children: ReactNode; onClick: () => void; strong?: boolean }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition-colors duration-[120ms] ${
        strong ? "cta font-medium" : "bg-t1/[0.07] text-t2 hover:bg-t1/[0.12] hover:text-t1"
      }`}
    >
      {children}
    </button>
  );
}

/** A dashed box to add into, drawn as the Video composer's upload boxes are. */
function EmptyBox({
  icons,
  label,
  note,
  onClick,
  extra,
}: {
  icons: Array<Parameters<typeof Icon>[0]["name"]>;
  label: string;
  note?: string;
  onClick: () => void;
  extra?: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="flex w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-panel border-[1.5px] border-dashed border-line-strong bg-t1/[0.02] px-3 py-5 text-center transition-colors duration-[150ms] hover:bg-t1/[0.04] active:bg-t1/[0.05]"
    >
      <span className="flex items-center gap-1.5">
        {icons.map((icon) => (
          <span key={icon} className="grid h-10 w-10 place-items-center rounded-full bg-t1/[0.08] text-t2">
            <Icon name={icon} size={18} />
          </span>
        ))}
      </span>
      <span className="text-[14px] text-t3">
        {label}
        {note && <span className="text-t4"> ({note})</span>}
      </span>
      {extra}
    </div>
  );
}

/** The clip the result keeps the motion (or the scene) of. */
function SourceBox({
  url,
  meta,
  limits,
  onPick,
  onLibrary,
  onClear,
  extra,
}: {
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
      <EmptyBox
        icons={["video"]}
        label="Source video"
        note={rule(limits)}
        onClick={onPick}
        extra={
          <SmallPill onClick={onLibrary}>
            <Icon name="move" size={14} />
            From the Motion library{clips.length > 0 ? ` (${clips.length})` : ""}
          </SmallPill>
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-panel border border-line bg-elevated p-3">
      <div className="relative overflow-hidden rounded-card bg-canvas-deep">
        <video
          key={url}
          src={mediaSrc(url)}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          className="max-h-[240px] w-full object-contain"
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
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-transform duration-[120ms] active:scale-90"
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
        <p className="text-[12.5px] leading-snug text-t3">Only the first {limits.max} s are used. Trim it to pick another stretch.</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <SmallPill onClick={onPick}>Replace</SmallPill>
        {clips.length > 0 && <SmallPill onClick={onLibrary}>Library</SmallPill>}
        {extra}
        <button
          type="button"
          onClick={() => url && !kept && void saveMotionClip(url)}
          disabled={kept}
          className="ml-auto flex items-center gap-1 rounded-full px-2 py-1.5 text-[12px] text-t3 transition-colors duration-[120ms] hover:text-t1 disabled:hover:text-t3"
        >
          <Icon name={kept ? "check" : "plus"} size={13} />
          {kept ? "In library" : "Save to library"}
        </button>
      </div>
    </div>
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
  if (refs.length === 0) {
    return (
      <EmptyBox
        icons={["user", "shirt", "box"]}
        label={label}
        note={`up to ${room}${required ? "" : " · optional"}`}
        onClick={onAdd}
        extra={
          <SmallPill onClick={onElements}>
            <Icon name="user" size={13} />
            From Elements
          </SmallPill>
        }
      />
    );
  }
  return (
    <div className="rounded-panel border border-line bg-elevated p-3">
      <div className="no-bar flex gap-2.5 overflow-x-auto">
        {/* First, so another can be added without scrolling to the end. */}
        {!full && (
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add pictures"
            className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-[20px] border-[1.5px] border-dashed border-line-strong bg-t1/[0.02] transition-colors duration-[150ms] active:bg-t1/[0.06]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-t1/[0.1] text-t1">
              <Icon name="plus" size={20} />
            </span>
          </button>
        )}
        {refs.map((url, index) => {
          const { className, ...hold } = reorder.bind(index);
          return (
            <div key={keys[index]} {...hold} className={`w-[88px] shrink-0 ${className}`}>
              <MediaThumb url={url} roomy onRemove={() => onChange(refs.filter((_, i) => i !== index))} />
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[12px] text-t4">
          {label} · {refs.length}/{room}
          {refs.length > 1 ? " · hold to reorder" : ""}
        </span>
        <SmallPill onClick={onElements}>
          <Icon name="user" size={13} />
          Elements
        </SmallPill>
      </div>
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
  onChangeModel,
  scroll,
  onSent,
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
  /** Opened from the Video page: the way back to the catalogue, on the card and the Model row. */
  onChangeModel?: () => void;
  /** The body scrolls on its own at every size (the phone's full-screen composer). */
  scroll?: boolean;
  /** Called once a run is on its way. */
  onSent?: () => void;
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
    else onSent?.();
  }

  const settings = model ? settingFields(model, own) : [];
  const promptText = remix.prompts[remix.mode] ?? "";

  const tiles = model ? settings : [];
  // As on Video: the tiles share the row; the project chip takes a cell only when it shows.
  const count = Math.max(1, tiles.length);
  const hint = key && blocker ? blocker : "⌘↵ to generate";

  return (
    <>
      {/* The panel's body scrolls on a desktop; the button stays at its foot. */}
      <div
        className={`no-bar flex min-h-0 flex-1 flex-col gap-2.5 md:p-3 [&>*]:shrink-0 ${
          scroll ? "overflow-y-auto overscroll-contain pb-3 md:pb-3" : "md:overflow-y-auto"
        }`}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void generate();
          }
        }}
      >
        <ModeTabs />
        {model && <RemixBanner model={model} mode={remix.mode} onChange={onChangeModel} />}
        <SourceBox
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
        {refsField && (
          <RefsBox
            label={refsField.label}
            refs={remix.refs.slice(0, room)}
            room={room}
            required={!!refsField.required}
            onChange={(refs) => patchRemix({ refs })}
            onAdd={() => setPicking("refs")}
            onElements={() => setChoosing(true)}
          />
        )}
        {/* Elements come in as their pictures, in the Elements window the Video page's prompt opens. */}
        <ReferencePicker
          open={choosing}
          onClose={() => setChoosing(false)}
          elementsOnly
          styles={false}
          room={{ image: 0, video: 0, audio: 0 }}
          taken={[]}
          onAdd={() => undefined}
          onElements={(chosen) =>
            patchRemix((r) => {
              const urls = chosen.flatMap((e) => e.images.map((ref) => ref.storageUrl));
              return { refs: [...r.refs, ...urls.filter((u) => !r.refs.includes(u))].slice(0, room) };
            })
          }
        />
        {below}
        <div className="rounded-panel bg-t1/[0.05] px-3.5 pb-2.5 pt-3">
          <textarea
            value={promptText}
            rows={3}
            placeholder={
              remix.mode === "swap"
                ? "Optional: what to swap, and for what"
                : remix.mode === "restyle"
                  ? "Optional: anything the style should keep or change"
                  : "Optional: describe the new scene"
            }
            onChange={(event) => patchRemix((r) => ({ prompts: { ...r.prompts, [r.mode]: event.target.value } }))}
            className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-t1 outline-none placeholder:text-t4 md:text-[14px]"
          />
        </div>
        {modelRow ??
          (model && (
            <Row
              label="Model"
              onClick={onChangeModel}
              value={
                <>
                  <span className="truncate">
                    {model.id === GENJUTSU ? (remix.mode === "restyle" ? "Genjutsu Restyle" : "Higgsfield Genjutsu") : model.name}
                  </span>
                  <VendorBadge model={model} size={15} bare />
                </>
              }
            />
          ))}
        <TileChips.Provider value>
          <div className={`grid gap-2 ${GRID_COLS[Math.min(3, count)]}`}>
            {tiles.map((field) => (
              <div key={field.key} className="min-w-0">
                <FieldChip field={field} values={own} onChange={setSetting} />
              </div>
            ))}
          </div>
        </TileChips.Provider>
        {built && built.warnings.length > 0 && <p className="px-1 text-[12px] leading-snug text-t4">{built.warnings.join(" ")}</p>}
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
          disabled={!!key && (busy || !!blocker)}
          title={blocker ?? undefined}
          className="cta flex h-12 w-full items-center justify-center gap-2 rounded-panel text-[15.5px] font-semibold disabled:opacity-40"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : !key ? (
            <>
              <Icon name="key" size={17} />
              Add your API key
            </>
          ) : (
            <>
              Generate
              <Icon name="spark" size={15} fill="currentColor" strokeWidth={1.2} />
              {price && <span className="font-mono text-[13px] font-medium tabular-nums opacity-70">{price}</span>}
            </>
          )}
        </button>
        <p className="mt-2 truncate text-center text-[11.5px] text-t4">
          {hint === "⌘↵ to generate" ? <span className="hidden md:inline">{hint}</span> : hint}
        </p>
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
      </div>
    </>
  );
}

const GRID_COLS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3"];

/**
 * The model at the head of the composer, as the Video composer heads with
 * its model's card: Higgsfield's own banner for Genjutsu, the model's
 * preview for another Restyle model.
 */
function RemixBanner({ model, mode, onChange }: { model: ModelDef; mode: RemixMode; onChange?: () => void }) {
  const media = model.id === GENJUTSU ? bannerOf(mode) : undefined;
  return (
    <div className="relative h-[124px] shrink-0 overflow-hidden rounded-panel bg-surface">
      {media?.video ? (
        <video
          key={media.video}
          src={media.video}
          poster={media.poster}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <ModelMedia model={model} own={false} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      {onChange && (
        <button
          type="button"
          onClick={onChange}
          className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[12.5px] font-medium text-white backdrop-blur-md transition-colors duration-[120ms] hover:bg-black/70"
        >
          <Icon name="sliders" size={13} />
          Change
        </button>
      )}
      <div className="absolute inset-x-3.5 bottom-3 text-white">
        <p className="truncate text-[21px] font-bold uppercase leading-none tracking-[-0.02em]">
          {model.id === GENJUTSU ? "Genjutsu" : model.name}
        </p>
        <p className="mt-1.5 truncate text-[12px] text-white/75">
          {MODE_LABEL[mode]} · {BLURB[mode]}
        </p>
      </div>
    </div>
  );
}

