"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { MediaPreview } from "@/components/MediaViewer";
import { PillGroup } from "@/components/PillGroup";
import { useAssets, type Asset } from "@/lib/assets";
import type { LibraryElement } from "@/lib/elements";
import { mediaSrc } from "@/lib/storage/client";
import { mediaKind } from "@/lib/upload";
import { usePresence } from "@/lib/usePresence";
import { useUploader } from "@/lib/useUploader";
import { useStudio } from "@/store/studio";

export type Kind = "image" | "video" | "audio";
type Tab = "uploads" | "elements" | "generations" | "liked";
type Show = "recent" | "all" | Kind;

const WEEK = 7 * 24 * 60 * 60 * 1000;
const KIND_NAME: Record<Kind, string> = { image: "Images", video: "Videos", audio: "Audio" };
const ELEMENT_KINDS = [
  { id: "all", label: "All" },
  { id: "character", label: "Characters" },
  { id: "location", label: "Locations" },
  { id: "product", label: "Props" },
] as const;

function MediaTile({
  asset,
  picked,
  disabled,
  onToggle,
  onPreview,
  onDelete,
}: {
  asset: Asset;
  picked: boolean;
  disabled: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={`group relative aspect-square overflow-hidden rounded-[10px] bg-canvas-deep ${disabled ? "opacity-35" : ""}`}>
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        aria-pressed={picked}
        aria-label={asset.label}
        title={disabled ? "No room left for this kind" : undefined}
        className={`block h-full w-full ${disabled ? "cursor-not-allowed" : ""}`}
      >
        {asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaSrc(asset.url)} alt="" loading="lazy" className="h-full w-full object-contain" />
        ) : asset.kind === "video" ? (
          <video src={mediaSrc(asset.url)} muted playsInline preload="metadata" className="h-full w-full object-contain" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-gradient-to-br from-t1/[0.07] to-transparent">
            <Icon name="audio" size={22} className="text-t2" />
          </span>
        )}
      </button>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-[10px] ring-inset ${picked ? "ring-2 ring-t1" : "ring-1 ring-line group-hover:ring-line-strong"}`}
      />
      <span
        className={`pointer-events-none absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full border transition-opacity duration-[120ms] ${
          picked ? "border-t1 bg-t1 text-canvas opacity-100" : "border-white/70 bg-black/30 text-transparent opacity-0 group-hover:opacity-100"
        }`}
      >
        <Icon name="check" size={12} strokeWidth={2.6} />
      </span>
      <div className="hover-reveal absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100">
        <button
          type="button"
          onClick={onPreview}
          aria-label="View full size"
          className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
        >
          <Icon name="expand" size={13} />
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete upload"
            className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-[#ff6b6b]/80"
          >
            <Icon name="trash" size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The references picker: uploads, library elements, what was made and what
 * was liked, in one large window. Several can be picked at once; each kind
 * stops taking more at its limit, which comes from the model's schema.
 */
export function ReferencePicker({
  open,
  onClose,
  room,
  taken,
  onAdd,
  onElements,
  startTab = "uploads",
  kinds = ["image", "video", "audio"],
}: {
  open: boolean;
  onClose: () => void;
  /** How many more of each kind fit. */
  room: Record<Kind, number>;
  /** Already among the references. */
  taken: string[];
  onAdd: (picked: Array<{ url: string; kind: Kind }>) => void;
  /** Elements picked: their pictures come in, and each is called in the prompt. */
  onElements: (elements: LibraryElement[]) => void;
  startTab?: Tab;
  /** What this composer takes at all (image mode takes pictures only). */
  kinds?: Kind[];
}) {
  const { mounted, exiting } = usePresence(open, 240);
  const assets = useAssets();
  const favorites = useStudio((s) => s.favorites);
  const elements = useStudio((s) => s.elements).filter((e) => e.kind !== "style");
  const removeUpload = useStudio((s) => s.removeUpload);
  const uploads = useStudio((s) => s.uploads);
  const openEditor = useStudio((s) => s.openElementEditor);
  const uploader = useUploader(kinds);
  const [tab, setTab] = useState<Tab>(startTab);
  const [show, setShow] = useState<Show>("all");
  const [newest, setNewest] = useState(true);
  const [picked, setPicked] = useState<Array<{ url: string; kind: Kind }>>([]);
  const [pickedElements, setPickedElements] = useState<string[]>([]);
  const [elementKind, setElementKind] = useState<(typeof ELEMENT_KINDS)[number]["id"]>("all");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab(startTab);
    setPicked([]);
    setPickedElements([]);
    setSearch("");
  }, [open, startTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !preview && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, preview]);

  const list = useMemo(() => {
    const now = Date.now();
    const source =
      tab === "uploads"
        ? assets.filter((a) => a.source === "upload")
        : tab === "generations"
          ? assets.filter((a) => a.source === "run")
          : assets.filter((a) => a.source === "run" && favorites.includes(a.url));
    const shown = source.filter(
      (a) =>
        kinds.includes(a.kind) &&
        !taken.includes(a.url) &&
        (show === "all" ? true : show === "recent" ? now - a.createdAt < WEEK : a.kind === show),
    );
    return newest ? shown : [...shown].reverse();
  }, [assets, tab, favorites, kinds, taken, show, newest]);

  const shownElements = elements.filter(
    (e) => (elementKind === "all" || e.kind === elementKind) && (!search.trim() || e.name.includes(search.trim().toLowerCase())),
  );

  if (!mounted || typeof document === "undefined") return null;

  const count = (kind: Kind) => picked.filter((p) => p.kind === kind).length;
  const full = (kind: Kind) => count(kind) >= room[kind];

  function toggle(asset: Asset) {
    const kind = asset.kind as Kind;
    setPicked((now) =>
      now.some((p) => p.url === asset.url)
        ? now.filter((p) => p.url !== asset.url)
        : count(kind) >= room[kind]
          ? now
          : [...now, { url: asset.url, kind }],
    );
  }

  function finish() {
    if (picked.length > 0) onAdd(picked);
    const chosen = elements.filter((e) => pickedElements.includes(e.id));
    if (chosen.length > 0) onElements(chosen);
    onClose();
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "uploads", label: "Uploads" },
    { id: "elements", label: "Elements" },
    { id: "generations", label: "Generations" },
    { id: "liked", label: "Liked" },
  ];
  const filters: Array<{ id: Show; label: string }> = [
    { id: "recent", label: "Recent" },
    { id: "all", label: "All" },
    ...kinds.map((k) => ({ id: k as Show, label: KIND_NAME[k] })),
  ];
  const total = picked.length + pickedElements.length;

  return createPortal(
    <div className="fixed inset-0 z-[117] flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        role="dialog"
        aria-label="References"
        className={`relative flex w-full flex-col overflow-hidden bg-canvas sm:h-[min(620px,90vh)] sm:max-w-[980px] sm:rounded-panel sm:border sm:border-line ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] sm:pt-3.5">
          <PillGroup value={tab} onChange={setTab} items={tabs} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        {tab === "elements" ? (
          <div className="flex min-h-0 flex-1 gap-1.5 sm:mx-1.5 sm:rounded-[20px] sm:bg-elevated sm:p-1.5">
            <nav className="hidden w-[170px] shrink-0 flex-col gap-1 rounded-card bg-t1/[0.03] p-2 sm:flex">
              {ELEMENT_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setElementKind(k.id)}
                  aria-current={elementKind === k.id || undefined}
                  className={`flex h-9 items-center rounded-[12px] px-2.5 text-[14px] transition-colors duration-[120ms] ${
                    elementKind === k.id ? "bg-t1/[0.1] text-t1" : "text-t3 hover:bg-t1/[0.05] hover:text-t1"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </nav>
            <div className="no-bar min-w-0 flex-1 overflow-y-auto px-3 pb-3 pt-1 sm:p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] font-semibold text-t1">My elements</p>
                <label className="flex h-8 w-[200px] items-center gap-1.5 rounded-full bg-t1/[0.06] px-3 text-t3">
                  <Icon name="search" size={14} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search"
                    className="min-w-0 flex-1 bg-transparent text-[16px] text-t1 outline-none placeholder:text-t4 sm:text-[13px]"
                  />
                </label>
              </div>
              <div className="mb-3 sm:hidden">
                <PillGroup value={elementKind} onChange={setElementKind} items={ELEMENT_KINDS.map((k) => ({ id: k.id, label: k.label }))} />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                <button
                  type="button"
                  onClick={() => openEditor({ kind: elementKind === "all" ? undefined : elementKind })}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-line-strong text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.04] hover:text-t1"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-t1/[0.08]">
                    <Icon name="plus" size={18} />
                  </span>
                  <span className="text-[12.5px]">New element</span>
                </button>
                {shownElements.map((element) => {
                  const on = pickedElements.includes(element.id);
                  return (
                    <button
                      key={element.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setPickedElements((now) => (on ? now.filter((id) => id !== element.id) : [...now, element.id]))}
                      className="group flex flex-col gap-1 text-left"
                    >
                      <span
                        className={`relative block aspect-square w-full overflow-hidden rounded-[10px] bg-surface-2 ring-inset ${on ? "ring-2 ring-t1" : "ring-1 ring-line"}`}
                      >
                        {element.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaSrc(element.images[0].storageUrl)} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="truncate text-[12px] text-t2">@{element.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col sm:mx-1.5 sm:rounded-[20px] sm:bg-elevated sm:p-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-1 sm:p-3">
              <div className="no-bar flex gap-1 overflow-x-auto">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setShow(f.id)}
                    aria-pressed={show === f.id}
                    className={`h-8 shrink-0 rounded-full px-3 text-[12.5px] font-medium transition-colors duration-[120ms] ${
                      show === f.id ? "bg-t1/[0.12] text-t1" : "text-t3 hover:text-t1"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setNewest((n) => !n)}
                className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.06] hover:text-t1"
              >
                <Icon name="sort" size={15} />
                {newest ? "Newest" : "Oldest"}
              </button>
            </div>
            <div className="no-bar min-h-0 flex-1 overflow-y-auto px-3 pb-3 sm:px-3">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {tab === "uploads" && (
                  <button
                    type="button"
                    onClick={() => uploader.input.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-t1/[0.14] text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.04] hover:text-t1"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-t1/[0.08]">
                      {uploader.busy ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Icon name="upload" size={18} />
                      )}
                    </span>
                    <span className="text-[12.5px]">Upload media</span>
                  </button>
                )}
                {list.map((asset) => {
                  const on = picked.some((p) => p.url === asset.url);
                  const upload = asset.source === "upload" ? uploads.find((u) => u.url === asset.url) : undefined;
                  return (
                    <MediaTile
                      key={asset.id}
                      asset={asset}
                      picked={on}
                      disabled={!on && full(asset.kind as Kind)}
                      onToggle={() => toggle(asset)}
                      onPreview={() => setPreview(asset.url)}
                      onDelete={upload ? () => removeUpload(upload.id) : undefined}
                    />
                  );
                })}
              </div>
              {list.length === 0 && tab !== "uploads" && (
                <p className="py-10 text-center text-[13px] text-t4">Nothing here yet.</p>
              )}
              {uploader.error && <p className="pt-3 text-center text-[12.5px]" style={{ color: "var(--danger)" }}>{uploader.error}</p>}
            </div>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <p className="font-mono text-[11.5px] tabular-nums text-t3">
            {kinds.map((k) => `${KIND_NAME[k]} ${count(k)}/${room[k]}`).join(" · ")}
            {pickedElements.length > 0 ? ` · ${pickedElements.length} element${pickedElements.length === 1 ? "" : "s"}` : ""}
          </p>
          <button
            type="button"
            onClick={finish}
            disabled={total === 0}
            className="cta h-10 rounded-full px-5 text-[14px] font-semibold disabled:opacity-40"
          >
            {total > 0 ? `Add ${total}` : "Add"}
          </button>
        </footer>
        <input
          ref={uploader.input}
          type="file"
          multiple
          accept={uploader.accept}
          hidden
          onChange={(event) => {
            const files = event.target.files;
            if (files) {
              void uploader.send(files, (urls) => {
                // What was just uploaded is picked, room allowing.
                setPicked((now) => {
                  let next = [...now];
                  for (const url of urls) {
                    const kind = (useStudio.getState().uploads.find((u) => u.url === url)?.kind ?? mediaKind(url)) as Kind;
                    if (next.filter((p) => p.kind === kind).length < room[kind]) next = [...next, { url, kind }];
                  }
                  return next;
                });
              });
            }
            event.target.value = "";
          }}
        />
      </div>
      <MediaPreview url={preview} onClose={() => setPreview(null)} />
    </div>,
    document.body,
  );
}
