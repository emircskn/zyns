"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { PillGroup } from "@/components/PillGroup";
import { MediaPreview } from "@/components/MediaViewer";
import { useAssets, type Asset } from "@/lib/assets";
import { usePresence } from "@/lib/usePresence";
import { useUploader } from "@/lib/useUploader";
import { useStudio } from "@/store/studio";

type Kind = "image" | "video" | "audio";
type Tab = "generated" | "uploads";

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
      className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all duration-[120ms] hover:scale-110 hover:bg-black/75"
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

function Thumb({
  asset,
  picked,
  onClick,
  onPreview,
  onRemove,
}: {
  asset: Asset;
  picked: boolean;
  onClick: () => void;
  /** Uploads can be looked at full size and thrown away from here. */
  onPreview?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={`group relative aspect-square overflow-hidden rounded-card bg-surface-2 ring-1 transition-colors duration-[150ms] ${
        picked ? "ring-t1/70" : "ring-line hover:ring-line-strong"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        title={asset.prompt ?? asset.label}
        className="block h-full w-full"
      >
        {asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : asset.kind === "video" ? (
          <video src={asset.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          <span className="pending-surface grid h-full w-full place-items-center">
            <Icon name="audio" size={20} className="relative z-10 text-white/80" />
          </span>
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-left text-[10.5px] text-white/85">
          {asset.label}
        </span>
      </button>
      {picked && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-t1 text-canvas">
          <Icon name="check" size={13} strokeWidth={2.4} />
        </span>
      )}
      {(onPreview || onRemove) && (
        <div className="hover-reveal absolute right-1.5 top-1.5 flex flex-col gap-1.5 opacity-0 transition-opacity duration-[150ms] group-hover:opacity-100">
          {onPreview && <TileAction icon="expand" label="View full size" onClick={onPreview} />}
          {onRemove && <TileAction icon="trash" label="Remove upload" onClick={onRemove} />}
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
  accept = "image",
  multiple = false,
  taken = [],
  onPick,
  onClose,
}: {
  open: boolean;
  accept?: Kind;
  multiple?: boolean;
  taken?: string[];
  onPick: (urls: string[]) => void;
  onClose: () => void;
}) {
  const { mounted, exiting } = usePresence(open, 240);
  const assets = useAssets();
  const { busy, error, input, send, accept: mime } = useUploader(accept);
  const [tab, setTab] = useState<Tab>("generated");
  const [chosen, setChosen] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const removeUpload = useStudio((s) => s.removeUpload);
  const urlField = useRef<HTMLInputElement>(null);

  const made = useMemo(
    () => assets.filter((a) => a.source === "run" && a.kind === accept),
    [assets, accept],
  );
  const uploaded = useMemo(
    () => assets.filter((a) => a.source === "upload" && a.kind === accept),
    [assets, accept],
  );

  useEffect(() => {
    if (!open) return;
    setChosen([]);
    setUrl("");
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

  if (!mounted || typeof document === "undefined") return null;

  const list = tab === "generated" ? made : uploaded;
  const noun = accept === "video" ? "clips" : accept === "audio" ? "audio" : "images";

  function choose(asset: Asset) {
    if (!multiple) {
      onPick([asset.url]);
      onClose();
      return;
    }
    setChosen((current) =>
      current.includes(asset.url)
        ? current.filter((u) => u !== asset.url)
        : [...current, asset.url],
    );
  }

  function commitUrl() {
    const value = url.trim();
    if (!value) return;
    onPick([value]);
    setUrl("");
    if (!multiple) onClose();
  }

  // The prompt bar filters its own backdrop, which makes it the containing
  // block for anything fixed inside it. The dialog has to leave that subtree
  // to cover the page at all.
  return createPortal(
    <div className="fixed inset-0 z-[115] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${
          exiting ? "anim-fade-out" : "anim-fade"
        }`}
      />
      <div
        className={`relative flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-t-panel border border-line bg-elevated sm:max-w-2xl sm:rounded-panel ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex items-center gap-2 px-4 pt-4 sm:px-5">
          <h2 className="flex-1 text-[17px] font-semibold tracking-[-0.02em] text-t1">
            Add {accept === "image" ? "an image" : accept === "video" ? "a clip" : "audio"}
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
              { id: "generated", label: `Generated ${made.length ? `· ${made.length}` : ""}`.trim() },
              { id: "uploads", label: `Uploads ${uploaded.length ? `· ${uploaded.length}` : ""}`.trim() },
            ]}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
          {tab === "generated" && list.length === 0 ? (
            <p className="py-14 text-center text-[13px] text-t4">
              Nothing generated yet. Runs that produce {noun} show up here.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {/* Uploading is one of the tiles rather than a separate errand:
                  the chooser sits where the uploads themselves are. */}
              {tab === "uploads" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => input.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-2.5 rounded-card border border-dashed border-line-strong text-t3 transition-colors duration-[150ms] hover:border-t1/40 hover:bg-t1/[0.03] hover:text-t1 disabled:opacity-50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-t1/[0.07]">
                    <Icon name="upload" size={17} />
                  </span>
                  <span className="px-2 text-center text-[12.5px] font-medium">
                    {busy ? "Uploading…" : "Upload media"}
                  </span>
                </button>
              )}
              {list.map((asset) => (
                <Thumb
                  key={asset.id}
                  asset={asset}
                  picked={chosen.includes(asset.url) || taken.includes(asset.url)}
                  onClick={() => choose(asset)}
                  onPreview={
                    tab === "uploads" && asset.kind === "image"
                      ? () => setPreview(asset.url)
                      : undefined
                  }
                  onRemove={tab === "uploads" ? () => removeUpload(asset.id) : undefined}
                />
              ))}
            </div>
          )}

          {tab === "uploads" && (
            <>
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={urlField}
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitUrl();
                    }
                  }}
                  placeholder="…or paste a public URL"
                  className="min-w-0 flex-1 rounded-full bg-t1/[0.055] px-4 py-2.5 text-[13px] text-t1 outline-none ring-1 ring-inset ring-transparent transition-all duration-[120ms] placeholder:text-t4 focus:ring-line-strong"
                />
                <button
                  type="button"
                  onClick={commitUrl}
                  disabled={!url.trim()}
                  className="cta shrink-0 rounded-full px-4 py-2.5 text-[12.5px] font-medium disabled:opacity-40"
                >
                  Add
                </button>
              </div>
              {error && <p className="mt-2 text-[11.5px] text-[#ff8f8f]">{error}</p>}
            </>
          )}
        </div>

        {multiple && chosen.length > 0 && (
          <div className="flex items-center gap-3 border-t border-line px-4 py-3 sm:px-5">
            <span className="flex-1 text-[12.5px] text-t3">{chosen.length} selected</span>
            <button
              type="button"
              onClick={() => {
                onPick(chosen);
                onClose();
              }}
              className="cta rounded-full px-4 py-2 text-[12.5px] font-medium"
            >
              Add {chosen.length}
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
              void send(files, (urls) => {
                onPick(urls);
                onClose();
              });
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
