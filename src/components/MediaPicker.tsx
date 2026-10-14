"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";
import { createPortal } from "react-dom";
import { VideoMark } from "@/components/VideoMark";
import { Icon } from "@/components/Icon";
import { ServiceBadge } from "@/components/ServiceBadge";
import { PillGroup } from "@/components/PillGroup";
import { MediaPreview } from "@/components/MediaViewer";
import { useAssets, type Asset } from "@/lib/assets";
import { pickable, type LibraryElement } from "@/lib/elements";
import { usePresence } from "@/lib/usePresence";
import { useUploader } from "@/lib/useUploader";
import { useStudio } from "@/store/studio";
import { thumbSrc, videoFrame } from "@/lib/storage/client";

type Kind = "image" | "video" | "audio";
type Tab = "uploads" | "elements" | "gen-image" | "gen-video" | "gen-audio" | "liked";
const GEN_TAB: Record<Kind, Tab> = { image: "gen-image", video: "gen-video", audio: "gen-audio" };
const GEN_LABEL: Record<Kind, string> = { image: "Image Generations", video: "Video Generations", audio: "Audio Generations" };

function TileAction({
  icon,
  label,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        // The tile underneath picks the asset; these do their own thing.
        event.stopPropagation();
        onClick();
      }}
      className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white transition-all duration-[120ms] hover:scale-110 hover:bg-black/75"
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

function Thumb({
  asset,
  picked,
  taken,
  onClick,
  onPreview,
}: {
  asset: Asset;
  picked: boolean;
  /** Already in the field: it keeps its tick and cannot be added twice. */
  taken?: boolean;
  onClick: () => void;
  /** Uploads can be looked at full size from here. Removing one belongs to
   *  Assets, where it does not crowd the choosing. */
  onPreview?: () => void;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-card bg-surface-2">
      <button
        type="button"
        onClick={taken ? undefined : onClick}
        aria-disabled={taken || undefined}
        title={taken ? "Already added" : undefined}
        className={`block h-full w-full ${taken ? "cursor-default" : ""}`}
      >
        {asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbSrc(asset.url, 384)} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : asset.kind === "video" ? (
          <>
            <video src={videoFrame(asset.url)} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            <VideoMark />
          </>
        ) : (
          <span className="grid h-full w-full place-items-center bg-surface bg-gradient-to-br from-t1/[0.07] to-transparent">
            <Icon name="audio" size={20} className="text-t2" />
          </span>
        )}
      </button>
      {/* The frame is drawn inside the tile and over the picture. Drawn
          outside it, as a ring, the scrolling list clipped its top edge on
          the first row, so a picked tile lost its top line. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-10 rounded-card ring-inset transition-shadow duration-[150ms] ${
          picked ? "ring-2 ring-t1/80" : "ring-1 ring-line group-hover:ring-line-strong"
        }`}
      />
      {asset.source === "run" && asset.provider && !picked && <ServiceBadge provider={asset.provider} small />}
      {picked && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 z-20 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-ink">
          <Icon name="check" size={13} strokeWidth={2.4} />
        </span>
      )}
      {onPreview && (
        <div className="hover-reveal absolute right-1.5 top-1.5 z-20 opacity-0 transition-opacity duration-[150ms] group-hover:opacity-100">
          <TileAction icon="expand" label="View full size" onClick={onPreview} />
        </div>
      )}
    </div>
  );
}

/**
 * Picking a reference: everything the studio already has — what it made and
 * what was uploaded — beside the file chooser, so a reference can be reused
 * without hunting for the original file.
 */
export function MediaPicker({
  open,
  accept: asked = "image",
  multiple: askedMultiple = false,
  taken: askedTaken = [],
  onPick,
  onClose,
  above,
  onElements,
  modelElements,
  max,
}: {
  open: boolean;
  /** One kind, or several for the bar's "+", which files each where it goes. */
  accept?: Kind | Kind[];
  multiple?: boolean;
  taken?: string[];
  /** The picked urls, and the kind of each. */
  onPick: (urls: string[], kinds: Kind[]) => void;
  onClose: () => void;
  /** Opened from a window that itself sits over the page's other windows (the element editor). */
  above?: boolean;
  /** Elements picked from their own tab, as Higgsfield's window has one; no tab without this. */
  onElements?: (elements: LibraryElement[]) => void;
  /** A model's own elements (Kling's), above yours on the Elements tab: a pick goes straight into the prompt. */
  modelElements?: { label: string; names: string[]; used: Set<string>; onPick: (name: string) => void; onDefine?: () => void };
  /** How many may be added, for the "N of max selected" count. */
  max?: number;
}) {
  const { mounted, exiting } = usePresence(open, 240);
  // What it was opened for, kept while it closes: a caller that resets its
  // own state on close (Remix's one picker for clips and pictures) would
  // otherwise flash the other kind's media during the closing slide.
  const kept = useRef({ accept: asked, multiple: askedMultiple, taken: askedTaken });
  if (open) kept.current = { accept: asked, multiple: askedMultiple, taken: askedTaken };
  const { accept, multiple, taken } = kept.current;
  const assets = useAssets();
  const { pending, error, input, send, accept: mime } = useUploader(accept);
  const [tab, setTab] = useState<Tab>("uploads");
  const [chosen, setChosen] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  // Pulled down on a phone, it closes.
  const swipe = useSwipeDismiss(sheet, onClose);
  const scroller = useRef<HTMLDivElement>(null);

  const kinds = useMemo(() => (Array.isArray(accept) ? accept : [accept]), [accept]);
  const favorites = useStudio((s) => s.favorites);
  const made = useMemo(
    () => assets.filter((a) => a.source === "run" && kinds.includes(a.kind)),
    [assets, kinds],
  );
  const uploaded = useMemo(
    () => assets.filter((a) => a.source === "upload" && kinds.includes(a.kind)),
    [assets, kinds],
  );
  const liked = useMemo(
    () => made.filter((a) => favorites.includes(a.url)),
    [made, favorites],
  );
  const library = useStudio((s) => s.elements).filter((e) => e.kind !== "style" && pickable(e));
  const openElementEditor = useStudio((s) => s.openElementEditor);
  const [chosenElements, setChosenElements] = useState<string[]>([]);
  // As Higgsfield lays its window out: uploads, elements, then what was made by kind, then the liked.
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "uploads", label: "Uploads" },
    ...(onElements || modelElements ? [{ id: "elements" as Tab, label: "Elements" }] : []),
    ...kinds.map((k) => ({ id: GEN_TAB[k], label: GEN_LABEL[k] })),
    { id: "liked", label: "Liked" },
  ];

  useEffect(() => {
    if (!open) return;
    setChosen([]);
    setChosenElements([]);
    setPreview(null);
    // Always opens on the first tab, Uploads, with its upload button.
    setTab("uploads");
    // Only when the dialog opens: the lists move as uploads land.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      // The preview is on top and closes itself first.
      if (event.key === "Escape" && !preview) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, preview]);

  // One height whatever the tab holds, so switching tabs never moves the window.
  const genKind = (Object.keys(GEN_TAB) as Kind[]).find((k) => GEN_TAB[k] === tab);
  const list = genKind ? made.filter((a) => a.kind === genKind) : tab === "liked" ? liked : tab === "uploads" ? uploaded : [];
  const picks = chosen.length + chosenElements.length;

  if (!mounted || typeof document === "undefined") return null;

  const noun =
    kinds.length > 1 ? "media" : kinds[0] === "video" ? "clips" : kinds[0] === "audio" ? "audio" : "images";
  const kindOf = (url: string) => assets.find((a) => a.url === url)?.kind ?? kinds[0];

  function choose(asset: Asset) {
    // What is already in the field stays there; picking it again would only
    // add it a second time.
    if (taken.includes(asset.url)) return;
    if (!multiple) {
      onPick([asset.url], [asset.kind]);
      onClose();
      return;
    }
    setChosen((current) =>
      current.includes(asset.url)
        ? current.filter((u) => u !== asset.url)
        : [...current, asset.url],
    );
  }

  // The prompt bar filters its own backdrop, which makes it the containing
  // block for anything fixed inside it. The dialog has to leave that subtree
  // to cover the page at all.
  return createPortal(
    <div className={`fixed inset-0 ${above ? "z-[121]" : "z-[117]"} flex items-end justify-center sm:items-center sm:p-4`}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        // Over the element editor the page is blurred already: a second blur over it only costs frames.
        className={`absolute inset-0 bg-canvas-deep/80 ${above ? "" : "backdrop-blur-md"} ${
          exiting ? "anim-fade-out" : "anim-fade"
        }`}
      />
      <div
        ref={sheet}
        className={`relative flex h-[86dvh] w-full flex-col overflow-hidden rounded-t-panel border border-line bg-elevated sm:h-[min(640px,86dvh)] sm:max-w-2xl sm:rounded-panel ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        {/* The grip: says it can be pulled down. */}
        <span aria-hidden className="mx-auto -mb-2 mt-2 block h-1 w-9 shrink-0 rounded-full bg-t1/20 sm:hidden" />
        <header {...swipe} className="flex shrink-0 items-center gap-2 px-4 pt-4 sm:px-5">
          <h2 className="flex-1 text-[17px] font-semibold tracking-[-0.02em] text-t1">
            {kinds.length > 1
              ? "Add media"
              : `Add ${kinds[0] === "image" ? "an image" : kinds[0] === "video" ? "a clip" : "audio"}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-t1/[0.07] text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.12]"
          >
            <Icon name="close" size={17} />
          </button>
        </header>

        {/* One row of every source, sliding sideways on a phone when it runs past the edge. */}
        <div className="no-bar shrink-0 overflow-x-auto px-4 py-3 sm:px-5">
          <PillGroup value={tab} onChange={(next) => setTab(next as Tab)} items={tabs} className="w-max" />
        </div>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
          {tab === "elements" && modelElements && (modelElements.names.length > 0 || modelElements.onDefine) && (
            <div className="mb-4 border-b border-line pb-4">
              <p className="mb-2 text-[13px] font-medium text-t2">{modelElements.label}&apos;s own elements</p>
              <div className="flex flex-wrap gap-1.5">
                {modelElements.names.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      modelElements.onPick(name);
                      onClose();
                    }}
                    className={`h-8 rounded-full px-3 font-mono text-[12.5px] transition-colors duration-[120ms] ${
                      modelElements.used.has(name) ? "bg-t1/[0.1] text-t1 ring-1 ring-inset ring-line-strong" : "bg-t1/[0.07] text-t2 hover:bg-t1/[0.12] hover:text-t1"
                    }`}
                  >
                    @{name}
                  </button>
                ))}
                {modelElements.onDefine && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      modelElements.onDefine!();
                    }}
                    className="flex h-8 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 text-[12.5px] text-t3 transition-colors duration-[120ms] hover:border-t1/40 hover:text-t1"
                  >
                    <Icon name="plus" size={13} />
                    {modelElements.names.length === 0 ? `Define a ${modelElements.label} element` : "Define another"}
                  </button>
                )}
              </div>
            </div>
          )}
          {tab === "elements" ? (
            !onElements ? null : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {/* As Uploads starts with uploading, Elements starts with making one; it opens over this window and lands here. */}
                <button
                  type="button"
                  onClick={() => openElementEditor({})}
                  className="flex aspect-square flex-col items-center justify-center gap-2.5 rounded-card border border-dashed border-line-strong text-t3 transition-colors duration-[150ms] hover:border-t1/40 hover:bg-t1/[0.03] hover:text-t1"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-t1/[0.07]">
                    <Icon name="plus" size={17} />
                  </span>
                  <span className="px-2 text-center text-[12.5px] font-medium">Create element</span>
                </button>
                {library.map((element) => {
                  const on = chosenElements.includes(element.id);
                  return (
                    <button
                      key={element.id}
                      type="button"
                      onClick={() => setChosenElements((all) => (on ? all.filter((id) => id !== element.id) : [...all, element.id]))}
                      className="relative flex flex-col gap-1 text-left"
                    >
                      <span className={`relative block aspect-square overflow-hidden rounded-card bg-surface ${on ? "ring-2 ring-t1" : "ring-1 ring-inset ring-line"}`}>
                        {element.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbSrc(element.images[0].storageUrl, 384)} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                        <span className={`absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full border ${on ? "border-accent bg-accent text-accent-ink" : "border-white/70 bg-black/30 text-transparent"}`}>
                          <Icon name="check" size={12} strokeWidth={2.6} />
                        </span>
                      </span>
                      <span className="truncate text-[12px] text-t2">@{element.name}</span>
                    </button>
                  );
                })}
              </div>
            )
          ) : tab !== "uploads" && list.length === 0 ? (
            <p className="py-14 text-center text-[13px] text-t4">
              {tab === "liked"
                ? `Nothing liked yet. ${noun[0].toUpperCase() + noun.slice(1)} you heart show up here.`
                : `Nothing generated yet. ${genKind === "video" ? "Videos" : genKind === "audio" ? "Sounds" : "Images"} you make show up here.`}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {/* Uploading is one of the tiles rather than a separate errand:
                  the chooser sits where the uploads themselves are. */}
              {tab === "uploads" && (
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-2.5 rounded-card border border-dashed border-line-strong text-t3 transition-colors duration-[150ms] hover:border-t1/40 hover:bg-t1/[0.03] hover:text-t1 disabled:opacity-50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-t1/[0.07]">
                    <Icon name="upload" size={17} />
                  </span>
                  <span className="px-2 text-center text-[12.5px] font-medium">Upload media</span>
                </button>
              )}
              {/* A place for each file on its way up, where it will land. */}
              {tab === "uploads" &&
                Array.from({ length: pending }, (_, index) => (
                  <div
                    key={`pending-${index}`}
                    aria-label="Uploading"
                    className="anim-pop grid aspect-square place-items-center rounded-card bg-surface ring-1 ring-inset ring-line"
                  >
                    <span className="h-7 w-7 animate-spin rounded-full border-[2.5px] border-t1/20 border-t-t1" />
                  </div>
                ))}
              {list.map((asset) => (
                <Thumb
                  key={asset.id}
                  asset={asset}
                  picked={chosen.includes(asset.url) || taken.includes(asset.url)}
                  taken={taken.includes(asset.url)}
                  onClick={() => choose(asset)}
                  onPreview={
                    tab === "uploads" && asset.kind === "image"
                      ? () => setPreview(asset.url)
                      : undefined
                  }
                />
              ))}
            </div>
          )}

        </div>

        {/* An upload that failed says so under the list. */}
        {tab === "uploads" && error && (
          <p className="shrink-0 px-4 pb-4 text-[11.5px] text-[#ff8f8f] sm:px-5 sm:pb-5">{error}</p>
        )}

        {multiple && picks > 0 && (
          <div className="flex items-center gap-3 border-t border-line px-4 py-3 sm:px-5">
            <span className="flex-1 text-[12.5px] text-t3">{max ? `${picks} of ${max} selected` : `${picks} selected`}</span>
            <button
              type="button"
              onClick={() => {
                if (chosen.length > 0) onPick(chosen, chosen.map(kindOf));
                const elements = library.filter((e) => chosenElements.includes(e.id));
                if (elements.length > 0) onElements?.(elements);
                onClose();
              }}
              className="cta rounded-full px-4 py-2 text-[12.5px] font-medium"
            >
              Add
            </button>
          </div>
        )}

        <input
          ref={input}
          type="file"
          accept={mime}
          multiple={multiple}
          hidden
          onChange={(event) => {
            const files = event.target.files;
            if (files?.length) {
              // A fresh upload waits in Uploads, unpicked, to be chosen like
              // any other: several can be uploaded and only some used.
              void send(files, () => setTab("uploads"));
            }
            event.target.value = "";
          }}
        />
      </div>
      <MediaPreview url={preview} onClose={() => setPreview(null)} z={130} />
    </div>,
    document.body,
  );
}
