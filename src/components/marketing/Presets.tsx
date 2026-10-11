"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { presetTypes, typeLabel, usePresetCatalogue } from "@/lib/marketing/presets";
import type { MarketingPreset } from "@/lib/marketing/types";
import { usePresence } from "@/lib/usePresence";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";
import { useStudio } from "@/store/studio";

/** A preset's card: its preview (a clip plays while hovered), its name and its kind. */
export function PresetCard({ preset, active, onPick }: { preset: MarketingPreset; active?: boolean; onPick: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => void video.current?.play().catch(() => {})}
      onMouseLeave={() => video.current?.pause()}
      aria-pressed={active}
      className="group relative block w-full overflow-hidden rounded-card bg-t1/[0.05] text-left"
    >
      <span className="block aspect-[4/5] w-full">
        {preset.preview && preset.previewKind === "video" ? (
          <video ref={video} src={preset.preview} muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : preset.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preset.preview} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-[400ms] ease-[var(--ease)] group-hover:scale-[1.03]" />
        ) : (
          <span className="grid h-full w-full place-items-center text-t4">
            <Icon name="image" size={22} />
          </span>
        )}
      </span>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-8">
        <span className="block truncate text-[12.5px] font-medium text-white">{preset.name}</span>
        <span className="block truncate text-[11px] text-white/70">{typeLabel(preset.type)}</span>
      </span>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-card ring-inset transition-shadow duration-[120ms] ${active ? "ring-2 ring-t1" : "ring-1 ring-line"}`}
      />
    </button>
  );
}

/**
 * The catalogue as a grid: kinds as chips over it (from what the catalogue
 * says, never a list of our own), a search, and more pages as it scrolls.
 */
export function PresetGrid({
  selected,
  onPick,
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  scroller,
  side = false,
}: {
  selected?: string;
  onPick: (preset: MarketingPreset) => void;
  columns?: string;
  /** The box that scrolls, when it is not the page. */
  scroller?: React.RefObject<HTMLElement | null>;
  /** The kinds down the left on a wide screen (the picker), not as chips over the grid. */
  side?: boolean;
}) {
  const hfKey = useStudio((s) => s.hfKey);
  const { items, loading, error, done, loadMore } = usePresetCatalogue();
  const [type, setType] = useState<string>("all");
  const [query, setQuery] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const types = useMemo(() => presetTypes(items), [items]);
  const needle = query.trim().toLowerCase();
  const shown = items.filter((p) => (type === "all" || p.type === type) && (!needle || p.name.toLowerCase().includes(needle)));

  useEffect(() => {
    if (hfKey && items.length === 0 && !loading && !error && !done) void loadMore(hfKey);
  }, [hfKey, items.length, loading, error, done, loadMore]);

  // The next page as the end of the grid comes near.
  useEffect(() => {
    const node = end.current;
    if (!node || !hfKey || done) return;
    const watch = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void usePresetCatalogue.getState().loadMore(hfKey);
      },
      { root: scroller?.current ?? null, rootMargin: "600px 0px" },
    );
    watch.observe(node);
    return () => watch.disconnect();
  }, [hfKey, done, scroller, items.length]);

  if (!hfKey) return <p className="px-1 py-10 text-center text-[13px] text-t3">Add your Higgsfield key to see the presets.</p>;

  const kinds = ["all", ...types];
  return (
    <div className={side ? "flex flex-col gap-3 md:flex-row md:gap-5" : "flex flex-col gap-3"}>
      {side && (
        <nav aria-label="Kinds" className="hidden w-[180px] shrink-0 flex-col gap-0.5 md:sticky md:top-0 md:flex md:self-start">
          {kinds.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`flex h-9 items-center justify-between rounded-[10px] px-3 text-left text-[13.5px] transition-colors duration-[120ms] ${
                type === t ? "bg-t1/[0.09] text-t1" : "text-t2 hover:bg-t1/[0.05] hover:text-t1"
              }`}
            >
              {t === "all" ? "All" : typeLabel(t)}
              <span className="font-mono text-[11px] text-t4">{t === "all" ? items.length : items.filter((p) => p.type === t).length}</span>
            </button>
          ))}
        </nav>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className={`no-bar flex min-w-0 flex-1 gap-1.5 overflow-x-auto ${side ? "md:hidden" : ""}`}>
          {kinds.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`h-8 shrink-0 rounded-full px-3.5 text-[12.5px] transition-colors duration-[120ms] ${
                type === t ? "bg-t1/[0.1] text-t1 ring-1 ring-inset ring-line-strong" : "bg-t1/[0.06] text-t2 hover:text-t1"
              }`}
            >
              {t === "all" ? "All" : typeLabel(t)}
            </button>
          ))}
        </div>
        <label className="flex h-8 w-full items-center gap-2 rounded-full bg-t1/[0.05] px-3 sm:w-[220px]">
          <Icon name="search" size={14} className="shrink-0 text-t4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search presets"
            aria-label="Search presets"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 outline-none placeholder:text-t4"
          />
        </label>
      </div>

      {shown.length > 0 && (
        <div className={`grid gap-2 ${columns}`}>
          {shown.map((preset) => (
            <PresetCard key={preset.id} preset={preset} active={preset.id === selected} onPick={() => onPick(preset)} />
          ))}
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-[13px] text-t3">{error}</p>
          <button type="button" onClick={() => void loadMore(hfKey)} className="rounded-full bg-t1/[0.07] px-4 py-1.5 text-[12.5px] text-t2 hover:text-t1">
            Try again
          </button>
        </div>
      ) : loading ? (
        <p className="py-6 text-center text-[12.5px] text-t4">Loading presets…</p>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-t3">{items.length === 0 ? "No presets on this account." : "No preset matches."}</p>
      ) : null}
      <div ref={end} aria-hidden className="h-px" />
      </div>
    </div>
  );
}

/** Choosing a preset over everything: the catalogue's grid in a sheet. */
export function PresetPicker({
  open,
  selected,
  onPick,
  onClose,
}: {
  open: boolean;
  selected?: string;
  onPick: (preset: MarketingPreset) => void;
  onClose: () => void;
}) {
  const { mounted, exiting } = usePresence(open, 240);
  const sheet = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  // Pulled down on a phone, it closes.
  const swipe = useSwipeDismiss(sheet, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[116] flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        ref={sheet}
        role="dialog"
        aria-label="Presets"
        className={`relative flex w-full flex-col overflow-hidden bg-canvas sm:h-[min(720px,90vh)] sm:max-w-[980px] sm:rounded-panel sm:border sm:border-line ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header {...swipe} className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] sm:pt-3.5">
          <h2 className="pl-1 text-[17px] font-semibold text-t1">Presets</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
          >
            <Icon name="close" size={17} />
          </button>
        </header>
        <div ref={body} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
          <PresetGrid
            selected={selected}
            scroller={body}
            side
            columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            onPick={(preset) => {
              onPick(preset);
              onClose();
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
