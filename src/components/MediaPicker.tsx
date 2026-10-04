"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { ServiceBadge } from "@/components/ServiceBadge";
import { PillGroup } from "@/components/PillGroup";
import { MediaPreview } from "@/components/MediaViewer";
import { useAssets, type Asset } from "@/lib/assets";
import { usePresence } from "@/lib/usePresence";
import { useUploader } from "@/lib/useUploader";
import { useStudio } from "@/store/studio";
import { mediaSrc } from "@/lib/storage/client";

type Kind = "image" | "video" | "audio";
type Tab = "generated" | "uploads" | "liked";

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
          <img src={mediaSrc(asset.url)} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : asset.kind === "video" ? (
          <video src={mediaSrc(asset.url)} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-surface bg-gradient-to-br from-t1/[0.07] to-transparent">
            <Icon name="audio" size={20} className="text-t2" />
          </span>
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-left text-[10.5px] text-white/85">
          {asset.label}
        </span>
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
        <span className="pointer-events-none absolute left-1.5 top-1.5 z-20 grid h-5 w-5 place-items-center rounded-full bg-t1 text-canvas">
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
  const [tab, setTab] = useState<Tab>("generated");
  const [chosen, setChosen] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const lastHeight = useRef<number | null>(null);

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

  useEffect(() => {
    if (!open) return;
    setChosen([]);
    setPreview(null);
    setTab(made.length > 0 ? "generated" : "uploads");
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

  // The sheet is as tall as what it holds, so switching tabs, or a list
  // growing, changes its height. It moves there rather than jumping: the
  // old height is kept for a moment and eased into the new one.
  const list = tab === "generated" ? made : tab === "liked" ? liked : uploaded;
  const shape = `${tab}:${list.length}:${pending}:${chosen.length > 0}:${!!error}`;
  useLayoutEffect(() => {
    const node = sheet.current;
    if (!node) {
      lastHeight.current = null;
      return;
    }
    const next = node.getBoundingClientRect().height;
    const previous = lastHeight.current;
    lastHeight.current = next;
    if (previous === null || Math.abs(previous - next) < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // While it moves, the list is briefly taller than the sheet: its scroll
    // bar would flash up and away, so scrolling waits for the sheet to land.
    const list = scroller.current;
    if (list) list.style.overflowY = "hidden";
    const motion = node.animate([{ height: `${previous}px` }, { height: `${next}px` }], {
      duration: 320,
      easing: "cubic-bezier(0.32, 0.72, 0, 1)",
    });
    const settle = () => {
      if (list) list.style.overflowY = "";
    };
    motion.onfinish = settle;
    motion.oncancel = settle;
  }, [shape, mounted]);

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
        className={`relative flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-t-panel border border-line bg-elevated sm:max-w-2xl sm:rounded-panel ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex items-center gap-2 px-4 pt-4 sm:px-5">
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

        <div className="flex items-center px-4 py-3 sm:px-5">
          <PillGroup
            value={tab}
            onChange={(next) => setTab(next as Tab)}
            items={[
              { id: "generated", label: "Generated" },
              { id: "uploads", label: "Uploads" },
              { id: "liked", label: "Liked" },
            ]}
          />
        </div>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
          {tab !== "uploads" && list.length === 0 ? (
            <p className="py-14 text-center text-[13px] text-t4">
              {tab === "liked"
                ? `Nothing liked yet. ${noun[0].toUpperCase() + noun.slice(1)} you heart show up here.`
                : `Nothing generated yet. Runs that produce ${noun} show up here.`}
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

        {multiple && chosen.length > 0 && (
          <div className="flex items-center gap-3 border-t border-line px-4 py-3 sm:px-5">
            <span className="flex-1 text-[12.5px] text-t3">{chosen.length} selected</span>
            <button
              type="button"
              onClick={() => {
                onPick(chosen, chosen.map(kindOf));
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
