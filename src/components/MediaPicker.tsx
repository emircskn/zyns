"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";
import { createPortal } from "react-dom";
import { VideoMark } from "@/components/VideoMark";
import { ConfirmPopup } from "@/components/ConfirmPopup";
import { ElementStatusMenu } from "@/components/ElementStatusMenu";
import { ErrorPopup } from "@/components/ErrorPopup";
import { Icon } from "@/components/Icon";
import { ServiceBadge } from "@/components/ServiceBadge";
import { MediaPreview } from "@/components/MediaViewer";
import { useAssets, type Asset } from "@/lib/assets";
import { keptNote, usedElsewhere } from "@/lib/usage";
import { ELEMENT_KINDS, pickable, type ElementKind, type LibraryElement } from "@/lib/elements";
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
  multiple,
  onClick,
  onPreview,
  onTrash,
}: {
  asset: Asset;
  picked: boolean;
  /** Several can be picked: an empty tick shows on the tile under the pointer. */
  multiple?: boolean;
  /** Already in the field: it keeps its tick and cannot be added twice. */
  taken?: boolean;
  onClick: () => void;
  /** Uploads can be looked at full size from here. Removing one belongs to
   *  Assets, where it does not crowd the choosing. */
  onPreview?: () => void;
  /** Sends it to the Trash, from where Assets can bring it back. */
  onTrash?: () => void;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-card bg-t1/[0.06]">
      <button
        type="button"
        onClick={taken ? undefined : onClick}
        aria-disabled={taken || undefined}
        title={taken ? "Already added" : undefined}
        className={`block h-full w-full ${taken ? "cursor-default" : ""}`}
      >
        {asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbSrc(asset.url, 384)} alt="" loading="lazy" className="h-full w-full object-contain" />
        ) : asset.kind === "video" ? (
          <>
            <video src={videoFrame(asset.url)} muted playsInline preload="metadata" className="h-full w-full object-contain" />
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
          picked ? "ring-2 ring-t1/80" : "ring-1 ring-edge group-hover:ring-line-strong"
        }`}
      />
      {asset.source === "run" && asset.provider && !picked && !multiple && <ServiceBadge provider={asset.provider} small />}
      {multiple && !picked && !taken && (
        <span className="hover-reveal pointer-events-none absolute left-1.5 top-1.5 z-20 h-5 w-5 rounded-full border border-white/70 bg-black/30 opacity-0 transition-opacity duration-[150ms] group-hover:opacity-100" />
      )}
      {picked && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 z-20 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-ink">
          <Icon name="check" size={13} strokeWidth={2.4} />
        </span>
      )}
      {(onPreview || onTrash) && (
        <div className="hover-reveal absolute right-1.5 top-1.5 z-20 flex flex-col gap-1.5 opacity-0 transition-opacity duration-[150ms] group-hover:opacity-100">
          {onPreview && <TileAction icon="expand" label="View full size" onClick={onPreview} />}
          {onTrash && <TileAction icon="trash" label="Delete" onClick={onTrash} />}
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
  limits,
  characters = false,
  onClear,
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
  /** How many more of each kind the model takes, and what to tell when a pick would pass it. */
  limits?: Partial<Record<Kind, { room: number; note: string }>>;
  /** Only the Characters part (one pick, no uploads or generations): a character tile closes it. */
  characters?: boolean;
  /** With `characters`: a way to let go of the character already chosen. */
  onClear?: () => void;
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
  // Higgsfield's second row: every kind, or one of them.
  const [only, setOnly] = useState<Kind | "all">("all");
  // And on Elements, the Elements page's kinds.
  const [elementKind, setElementKind] = useState<ElementKind | "all">("all");
  const [chosen, setChosen] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [limitNote, setLimitNote] = useState<string | null>(null);
  const [deletingElement, setDeletingElement] = useState<LibraryElement | null>(null);
  const removeElement = useStudio((s) => s.removeElement);
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
  const removeRun = useStudio((s) => s.removeRun);
  const removeUpload = useStudio((s) => s.removeUpload);
  const runs = useStudio((s) => s.runs);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [chosenElements, setChosenElements] = useState<string[]>([]);
  // As Higgsfield lays its window out: uploads, elements, then what was made by kind, then the liked.
  const tabs: Array<{ id: Tab; label: string }> = characters ? [{ id: "elements", label: "Characters" }] : [
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
    setLimitNote(null);
    // Always opens on the first tab, Uploads, with its upload button.
    setTab(characters ? "elements" : "uploads");
    setOnly("all");
    setElementKind(characters ? "character" : "all");
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
  const all = genKind ? made.filter((a) => a.kind === genKind) : tab === "liked" ? liked : tab === "uploads" ? uploaded : [];
  const list = only === "all" || genKind ? all : all.filter((a) => a.kind === only);
  const filters = kinds.length > 1 && !genKind && tab !== "elements";
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
    const limit = limits?.[asset.kind];
    if (limit && !chosen.includes(asset.url) && chosen.filter((u) => kindOf(u) === asset.kind).length >= limit.room) {
      setLimitNote(limit.note);
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
        className={`relative flex h-[86dvh] w-full flex-col overflow-hidden rounded-t-panel border border-edge bg-[var(--popover)] sm:h-[min(600px,86dvh)] sm:max-w-[960px] sm:rounded-panel ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        {/* The grip: says it can be pulled down. */}
        <span aria-hidden className="mx-auto mb-1 mt-2 block h-1 w-9 shrink-0 rounded-full bg-t1/20 sm:hidden" />
        {/* As Higgsfield's: the sources as pills along the top, white under
            the chosen one, and the close button at the row's end. */}
        <header {...swipe} className="flex shrink-0 items-center gap-2 px-2 pb-2 pt-1 sm:pt-2">
          <h2 className="sr-only">
            {kinds.length > 1
              ? "Add media"
              : `Add ${kinds[0] === "image" ? "an image" : kinds[0] === "video" ? "a clip" : "audio"}`}
          </h2>
          <div role="tablist" className="no-bar flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-medium transition-colors duration-[120ms] ${
                  tab === item.id ? "bg-white text-accent-ink" : "text-t1/50 hover:text-t1"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-t1/[0.06] text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.12]"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        {/* The list sits in its own darker well, its kinds above it. */}
        <div className="mx-2 mb-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-card bg-black/25">
        {filters && (
          <div className="no-bar flex shrink-0 gap-1 overflow-x-auto px-3 pt-3">
            {(["all", ...kinds] as Array<Kind | "all">).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setOnly(k)}
                className={`h-7 shrink-0 rounded-chip px-2.5 text-[12.5px] font-medium transition-colors duration-[120ms] ${
                  only === k ? "bg-t1/[0.1] text-t1" : "text-t3 hover:text-t1"
                }`}
              >
                {k === "all" ? "All" : k === "image" ? "Images" : k === "video" ? "Videos" : "Audio"}
              </button>
            ))}
          </div>
        )}

        {tab === "elements" && onElements && !characters && (
          <div className="no-bar flex shrink-0 gap-1 overflow-x-auto px-3 pt-3">
            {([{ id: "all", plural: "All" }, ...ELEMENT_KINDS.filter((k) => k.id !== "style")] as Array<{ id: ElementKind | "all"; plural: string }>).map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setElementKind(k.id)}
                className={`h-7 shrink-0 rounded-chip px-2.5 text-[12.5px] font-medium transition-colors duration-[120ms] ${
                  elementKind === k.id ? "bg-t1/[0.1] text-t1" : "text-t3 hover:text-t1"
                }`}
              >
                {k.plural}
              </button>
            ))}
          </div>
        )}

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto p-3">
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
              <>
              {characters && onClear && (
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    onClose();
                  }}
                  className="mb-3 h-8 rounded-chip bg-t1/[0.07] px-3 text-[12.5px] text-t2 hover:text-t1"
                >
                  No character
                </button>
              )}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {/* As Uploads starts with uploading, Elements starts with making one; it opens over this window and lands here. */}
                <button
                  type="button"
                  onClick={() => openElementEditor(elementKind === "all" ? {} : { kind: elementKind })}
                  className="flex aspect-square flex-col items-center justify-center gap-2.5 rounded-card bg-t1/[0.06] text-t1 transition-colors duration-[150ms] hover:bg-t1/[0.1]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-black/40 ring-1 ring-inset ring-t1/15">
                    <Icon name="plus" size={17} />
                  </span>
                  <span className="px-2 text-center text-[12px] font-semibold">{characters ? "Create character" : "Create element"}</span>
                </button>
                {library.filter((e) => (characters ? e.kind === "character" : elementKind === "all" || e.kind === elementKind)).map((element) => {
                  const on = chosenElements.includes(element.id);
                  return (
                    <div key={element.id} className="group relative flex flex-col gap-1 text-left">
                      <span className="relative block aspect-square overflow-hidden rounded-card bg-t1/[0.06]">
                        <button
                          type="button"
                          onClick={() => {
                            if (characters) {
                              onElements?.([element]);
                              onClose();
                              return;
                            }
                            setChosenElements((all) => (on ? all.filter((id) => id !== element.id) : [...all, element.id]));
                          }}
                          className="block h-full w-full"
                          aria-label={`@${element.name}`}
                        >
                          {element.images[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumbSrc(element.images[0].storageUrl, 384)} alt="" loading="lazy" className="h-full w-full object-cover" />
                          )}
                        </button>
                        <span aria-hidden="true" className={`pointer-events-none absolute inset-0 z-10 rounded-card ring-inset transition-shadow duration-[150ms] ${on ? "ring-2 ring-t1/80" : "ring-1 ring-edge group-hover:ring-line-strong"}`} />
                        {!characters &&
                          (on ? (
                            <span className="pointer-events-none absolute left-1.5 top-1.5 z-20 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-ink">
                              <Icon name="check" size={13} strokeWidth={2.4} />
                            </span>
                          ) : (
                            <span className="hover-reveal pointer-events-none absolute left-1.5 top-1.5 z-20 h-5 w-5 rounded-full border border-white/70 bg-black/30 opacity-0 transition-opacity duration-[150ms] group-hover:opacity-100" />
                          ))}
                        <div className="hover-reveal absolute right-1.5 top-1.5 z-20 flex flex-col gap-1.5 opacity-0 transition-opacity duration-[150ms] group-hover:opacity-100">
                          {element.images[0] && <TileAction icon="expand" label="View full size" onClick={() => setPreview(element.images[0].storageUrl)} />}
                          <TileAction icon="trash" label="Delete element" onClick={() => setDeletingElement(element)} />
                        </div>
                        <ElementStatusMenu element={element} className="absolute bottom-1.5 left-1.5 z-20" />
                      </span>
                      <span className="truncate text-[12px] text-t2">@{element.name}</span>
                    </div>
                  );
                })}
              </div>
              </>
            )
          ) : tab !== "uploads" && list.length === 0 ? (
            <p className="py-14 text-center text-[13px] text-t4">
              {tab === "liked"
                ? `Nothing liked yet. ${noun[0].toUpperCase() + noun.slice(1)} you heart show up here.`
                : `Nothing generated yet. ${genKind === "video" ? "Videos" : genKind === "audio" ? "Sounds" : "Images"} you make show up here.`}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {/* Uploading is one of the tiles rather than a separate errand:
                  the chooser sits where the uploads themselves are. */}
              {tab === "uploads" && (
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-2.5 rounded-card bg-t1/[0.06] text-t1 transition-colors duration-[150ms] hover:bg-t1/[0.1] disabled:opacity-50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-black/40 ring-1 ring-inset ring-t1/15">
                    <Icon name="upload" size={17} />
                  </span>
                  <span className="px-2 text-center text-[12px] font-semibold">Upload media</span>
                </button>
              )}
              {/* A place for each file on its way up, where it will land. */}
              {tab === "uploads" &&
                Array.from({ length: pending }, (_, index) => (
                  <div
                    key={`pending-${index}`}
                    aria-label="Uploading"
                    className="anim-pop grid aspect-square place-items-center rounded-card bg-surface ring-1 ring-inset ring-edge"
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
                  multiple={multiple}
                  onClick={() => choose(asset)}
                  onPreview={asset.kind === "audio" ? undefined : () => setPreview(asset.url)}
                  onTrash={() => setDeletingAsset(asset)}
                />
              ))}
            </div>
          )}

        </div>

        {/* An upload that failed says so under the list. */}
        {tab === "uploads" && error && (
          <p className="shrink-0 px-3 pb-3 text-[11.5px] text-[#ff8f8f]">{error}</p>
        )}
        </div>

        {multiple && picks > 0 && (
          <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-1">
            <span className="flex-1 text-[12.5px] text-t3">{max ? `${picks} of ${max} selected` : `${picks} selected`}</span>
            <button
              type="button"
              onClick={() => {
                if (chosen.length > 0) onPick(chosen, chosen.map(kindOf));
                const elements = library.filter((e) => chosenElements.includes(e.id));
                if (elements.length > 0) onElements?.(elements);
                onClose();
              }}
              className="key-btn h-9 rounded-card px-5 text-[13px]"
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
      <ErrorPopup message={limitNote} title="Limit reached" onClose={() => setLimitNote(null)} />
      {/* As in Assets: asked in a small window, saying what else uses the file; confirmed, it goes from Assets too. */}
      <ConfirmPopup
        open={!!deletingAsset}
        title="Delete this?"
        message={
          (deletingAsset &&
            keptNote(
              usedElsewhere([deletingAsset.url], {
                runs: deletingAsset.source === "run" ? runs.filter((r) => r.urls.includes(deletingAsset.url)).map((r) => r.id) : [],
                uploads: deletingAsset.source === "upload" ? [deletingAsset.id] : [],
              }),
            )) ||
          "It is removed from your studio for good."
        }
        confirmLabel="Delete"
        onConfirm={() => {
          const asset = deletingAsset;
          setDeletingAsset(null);
          if (!asset) return;
          setChosen((now) => now.filter((u) => u !== asset.url));
          if (asset.source === "upload") removeUpload(asset.id);
          else {
            const owner = runs.find((r) => r.urls.includes(asset.url));
            if (owner) removeRun(owner.id);
          }
        }}
        onClose={() => setDeletingAsset(null)}
      />
      <ConfirmPopup
        open={!!deletingElement}
        title={deletingElement ? `Delete @${deletingElement.name}?` : ""}
        message="Prompts that call it will no longer find it. Its pictures stay in your studio."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingElement) removeElement(deletingElement.id);
          setChosenElements((all) => all.filter((id) => id !== deletingElement?.id));
          setDeletingElement(null);
        }}
        onClose={() => setDeletingElement(null)}
      />
    </div>,
    document.body,
  );
}
