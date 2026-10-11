"use client";

import { inUse } from "@/lib/elements";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { ModelRow } from "@/components/ModelPicker";
import { VendorBadge } from "@/components/VendorMark";
import { Row } from "@/components/remix/Row";
import { getRestylePresets } from "@/lib/higgsfield/transport";
import type { RestylePreset } from "@/lib/higgsfield/client";
import { isNativeRestyle, restyleTargets, targetOf } from "@/lib/remix/targets";
import { zynsStyles, type ZynsStyle } from "@/lib/remix/styles";
import { targetKey } from "@/lib/remix/types";
import { getModel, providerOf } from "@/lib/registry";
import { usePresence } from "@/lib/usePresence";
import { useStudio } from "@/store/studio";

/** Genjutsu Restyle's styles, read with your Higgsfield key once a visit. */
export function useRestylePresets(): { presets: RestylePreset[] | null; error: string | null } {
  const hfKey = useStudio((s) => s.hfKey);
  const [presets, setPresets] = useState<RestylePreset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!hfKey) return;
    let live = true;
    getRestylePresets(hfKey).then(
      (items) => live && setPresets(items),
      (err) => live && setError(err instanceof Error ? err.message : "The styles could not be loaded."),
    );
    return () => {
      live = false;
    };
  }, [hfKey]);
  return { presets, error };
}

export function Sheet({
  open,
  title,
  sub,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  sub?: string;
  onClose: () => void;
  children: ReactNode;
  /** Held at the foot, under what scrolls. */
  footer?: ReactNode;
}) {
  const { mounted, exiting } = usePresence(open, 240);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Pulled down on a phone, it closes.
  const swipe = useSwipeDismiss(sheetRef, onClose);
  if (!mounted || typeof document === "undefined") return null;
  // On the page's top layer: the composer it opens from is a sticky column
  // of its own, which would otherwise keep it under the history beside it.
  return createPortal(
    <div className="fixed inset-0 z-[116] flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-label={title}
        className={`relative flex w-full flex-col overflow-hidden bg-canvas sm:h-[min(640px,84vh)] sm:max-w-[600px] sm:rounded-panel sm:border sm:border-line ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header {...swipe} className="flex items-center justify-between gap-3 border-b border-line px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))] sm:pt-4">
          <div className="min-w-0">
            <p className="text-[16px] text-t1">{title}</p>
            {sub && <p className="text-[12.5px] text-t3">{sub}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
          >
            <Icon name="close" size={17} />
          </button>
        </header>
        <div className={`flex-1 overflow-y-auto p-3 ${footer ? "" : "pb-[max(16px,env(safe-area-inset-bottom))]"}`}>{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Which model Restyle runs on: Genjutsu's own Restyle first, then its
 * motion transfer with a style reference, then every model that can edit a
 * video. The last one picked is kept.
 */
export function RestyleModelRow() {
  const remix = useStudio((s) => s.remix);
  const patchRemix = useStudio((s) => s.patchRemix);
  const [open, setOpen] = useState(false);
  const target = targetOf(remix);
  const options = restyleTargets();
  const current = options.find((t) => targetKey(t) === targetKey(target));
  const model = getModel(target.modelId);
  return (
    <>
      <Row
        label="Model"
        value={
          <>
            <span className="truncate">{current?.label ?? model?.name ?? "Choose a model"}</span>
            {model && <VendorBadge model={model} size={15} bare />}
          </>
        }
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} title="Restyle with" sub={`Video edit · ${options.length} models`} onClose={() => setOpen(false)}>
        {options.map((option) => (
          <ModelRow
            key={targetKey(option)}
            model={option.model}
            active={targetKey(option) === targetKey(target)}
            showProvider
            name={option.label}
            tagline={
              isNativeRestyle(option)
                ? "Higgsfield's own Restyle, with its style list"
                : option.model.id === "hf-genjutsu"
                  ? "The clip's motion on a style reference picture"
                  : option.model.tagline
            }
            onPick={() => {
              patchRemix({ restyle: { modelId: option.modelId, mode: option.mode } });
              setOpen(false);
            }}
          />
        ))}
      </Sheet>
    </>
  );
}

/** A preview clip that plays while it is on screen, muted and looping, over its still. */
function LoopVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const watch = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? void node.play().catch(() => {}) : node.pause()),
      { threshold: 0.4 },
    );
    watch.observe(node);
    return () => watch.disconnect();
  }, [src]);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function Tile({
  name,
  preview,
  video,
  tint,
  active,
  badge,
  onPick,
}: {
  name: string;
  preview?: string;
  video?: string;
  tint?: [string, string];
  active: boolean;
  badge?: string;
  onPick: () => void;
}) {
  return (
    <button type="button" onClick={onPick} aria-pressed={active} className="group flex flex-col gap-1.5 text-left">
      <span
        className={`relative block aspect-[4/5] w-full overflow-hidden rounded-card ring-inset transition-all duration-[120ms] ${
          active ? "ring-2 ring-t1" : "ring-1 ring-line group-hover:ring-line-strong"
        }`}
        style={tint && !preview ? { background: `linear-gradient(140deg, ${tint[0]}, ${tint[1]})` } : undefined}
      >
        {video ? (
          <LoopVideo src={video} poster={preview} />
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        {badge && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{badge}</span>
        )}
        {active && (
          <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-ink">
            <Icon name="check" size={14} strokeWidth={2.4} />
          </span>
        )}
      </span>
      <span className="truncate text-[12.5px] text-t2">{name}</span>
    </button>
  );
}

/** The styles the chosen Restyle model can take, to pick one. */
export function StyleGrid({ onPicked }: { onPicked?: () => void }) {
  const remix = useStudio((s) => s.remix);
  const patchRemix = useStudio((s) => s.patchRemix);
  const elements = useStudio((s) => s.elements).filter(inUse);
  const openElementEditor = useStudio((s) => s.openElementEditor);
  const native = isNativeRestyle(targetOf(remix));
  const { presets, error } = useRestylePresets();

  if (native) {
    if (error) return <p className="py-8 text-center text-[13px] text-t3">{error}</p>;
    if (!presets) return <p className="py-8 text-center text-[13px] text-t4">Loading Higgsfield&apos;s styles…</p>;
    if (presets.length === 0) return <p className="py-8 text-center text-[13px] text-t4">Higgsfield lists no styles for this account.</p>;
    return (
      <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
        {presets.map((preset) => (
          <Tile
            key={preset.id}
            name={preset.name}
            preview={preset.preview}
            video={preset.video}
            active={remix.presetId === preset.id}
            onPick={() => {
              patchRemix({ presetId: preset.id });
              onPicked?.();
            }}
          />
        ))}
      </div>
      </div>
    );
  }

  const styles = zynsStyles(elements);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] leading-relaxed text-t3">
        Zyns styles: a line of prompt and, for your own, their pictures as a style reference. Make your own as a Style element.
      </p>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
        <Tile
          name="No style"
          tint={["#2a2a2a", "#161616"]}
          active={!remix.styleId}
          onPick={() => {
            patchRemix({ styleId: undefined });
            onPicked?.();
          }}
        />
        {styles.map((style) => (
          <Tile
            key={style.id}
            name={style.name}
            preview={style.preview}
            tint={style.tint}
            badge={style.own ? "Yours" : undefined}
            active={remix.styleId === style.id}
            onPick={() => {
              patchRemix({ styleId: style.id });
              onPicked?.();
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => openElementEditor({ kind: "style" })}
          className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-line-strong text-t3 transition-colors duration-[120ms] hover:text-t1"
        >
          <Icon name="plus" size={18} />
          <span className="text-[12px]">New style</span>
        </button>
      </div>
    </div>
  );
}

/** The style in use, the way to change it, and what the composer needs to send it. */
export function useRestyleStyle(): { style: ZynsStyle | undefined; preset: RestylePreset | undefined; needs: string | null } {
  const remix = useStudio((s) => s.remix);
  const elements = useStudio((s) => s.elements);
  const { presets } = useRestylePresets();
  if (remix.mode !== "restyle") return { style: undefined, preset: undefined, needs: null };
  const native = isNativeRestyle(targetOf(remix));
  if (native) {
    const preset = presets?.find((p) => p.id === remix.presetId);
    // A style picked before, now gone from Higgsfield's list, asks again.
    const gone = presets && remix.presetId && !preset;
    return {
      style: undefined,
      preset,
      needs: !remix.presetId || gone ? "Choose a style to continue." : null,
    };
  }
  const style = zynsStyles(elements).find((s) => s.id === remix.styleId);
  return { style, preset: undefined, needs: null };
}

export function StyleRow() {
  const remix = useStudio((s) => s.remix);
  const setRemixTab = useStudio((s) => s.setRemixTab);
  const patchRemix = useStudio((s) => s.patchRemix);
  const [open, setOpen] = useState(false);
  const { style, preset } = useRestyleStyle();
  const native = isNativeRestyle(targetOf(remix));
  const model = getModel(targetOf(remix).modelId);
  const name = native ? preset?.name : style?.name;
  const preview = native ? preset?.preview : style?.preview;
  // The styles open beside the composer (below it on a phone) on Remix; from the Video page, over it.
  const choose = () => {
    const tabs = document.getElementById("remix-tabs");
    if (!tabs) return setOpen(true);
    setRemixTab("styles");
    requestAnimationFrame(() => tabs.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const sheet = (
    <Sheet
      open={open}
      title="Style"
      sub={native ? "Higgsfield's Restyle styles" : `Zyns styles for ${model?.name ?? "this model"} (${providerOf(model) === "higgsfield" ? "Higgsfield" : "KIE"})`}
      onClose={() => setOpen(false)}
    >
      <StyleGrid onPicked={() => setOpen(false)} />
    </Sheet>
  );

  // Chosen: the style with its picture, a way to change it and one to take it off again.
  if (name) {
    return (
      <>
        <div className="flex w-full items-center gap-3 rounded-panel bg-t1/[0.05] py-2.5 pl-3 pr-2">
          <span
            className="block h-11 w-11 shrink-0 overflow-hidden rounded-chip ring-1 ring-inset ring-line"
            style={!preview && style ? { background: `linear-gradient(140deg, ${style.tint[0]}, ${style.tint[1]})` } : undefined}
          >
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] text-t3">Style</span>
            <span className="line-clamp-2 block text-[14.5px] font-medium leading-snug text-t1">{name}</span>
          </span>
          <button
            type="button"
            onClick={choose}
            className="shrink-0 rounded-chip bg-t1/[0.07] px-3 py-1.5 text-[13px] font-medium text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.12]"
          >
            Change
          </button>
          <button
            type="button"
            onClick={() => patchRemix(native ? { presetId: undefined } : { styleId: undefined })}
            aria-label="Remove style"
            title="Remove style"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.08] hover:text-t1"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
        {sheet}
      </>
    );
  }

  return (
    <>
      <Row
        label={native ? "Style" : "Style · optional"}
        value={<span className="truncate">{native ? "Choose a style" : "No style"}</span>}
        onClick={choose}
        lead={
        <span
          className="block h-8 w-8 shrink-0 overflow-hidden rounded-chip ring-1 ring-inset ring-line"
          style={!preview && style ? { background: `linear-gradient(140deg, ${style.tint[0]}, ${style.tint[1]})` } : undefined}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : !style ? (
            <span className="grid h-full w-full place-items-center bg-t1/[0.05] text-t3">
              <Icon name="palette" size={18} />
            </span>
          ) : null}
        </span>
        }
      />
      {sheet}
    </>
  );
}
