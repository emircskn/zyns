"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import SNAPSHOT from "@/lib/higgsfield/soulStyles.json";
import { getSoulStyles } from "@/lib/higgsfield/transport";
import type { SoulStyle } from "@/lib/higgsfield/client";
import { usePresence } from "@/lib/usePresence";
import { useStudio } from "@/store/studio";

/** Higgsfield's own default style; a run with no `style_id` uses it. */
export const DEFAULT_SOUL_STYLE = "3db34ab5-3439-4317-9e03-08dc30852e69";

/** Our cover for a style (public/soul-styles/<name>.webp) comes first; Higgsfield's own preview stands in until one is added. */
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function SoulStyleCover({ style, className = "" }: { style?: SoulStyle; className?: string }) {
  const [stage, setStage] = useState(0);
  const src = style ? [`/soul-styles/${slug(style.name)}.webp`, style.preview][stage] : undefined;
  useEffect(() => setStage(0), [style?.id]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" onError={() => setStage((n) => n + 1)} className={`h-full w-full object-cover ${className}`} />
  ) : (
    <span className="grid h-full w-full place-items-center bg-gradient-to-br from-t1/[0.08] to-transparent text-t4">
      <Icon name="image" size={22} />
    </span>
  );
}

/** Soul 2.0's styles: the shipped list at once, replaced by the live one when the Higgsfield key can fetch it. */
export function useSoulStyles(hfKey: string, enabled = true): SoulStyle[] {
  const [styles, setStyles] = useState<SoulStyle[]>(SNAPSHOT);
  useEffect(() => {
    if (!enabled || !hfKey) return;
    let live = true;
    getSoulStyles(hfKey).then((list) => live && list.length > 0 && setStyles(list), () => {});
    return () => {
      live = false;
    };
  }, [hfKey, enabled]);
  return styles;
}

/** Higgsfield's "Create your moodboard" window, as far as its API goes: the curated styles as cards with a search. */
export function SoulStylePicker({ open, styles, selected, onPick, onClose }: { open: boolean; styles: SoulStyle[]; selected: string; onPick: (id: string) => void; onClose: () => void }) {
  const { mounted, exiting } = usePresence(open, 240);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // Only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!mounted || typeof document === "undefined") return null;
  const needle = query.trim().toLowerCase();
  // General leads, wherever the live list puts it.
  const shown = styles.filter((s) => !needle || s.name.toLowerCase().includes(needle)).sort((a, b) => Number(b.id === DEFAULT_SOUL_STYLE) - Number(a.id === DEFAULT_SOUL_STYLE));
  const current = selected || DEFAULT_SOUL_STYLE;

  return createPortal(
    <div className="fixed inset-0 z-[116] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={onClose} className={`absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`} />
      <div
        role="dialog"
        aria-label="Choose a style"
        className={`relative flex h-[90dvh] w-full flex-col overflow-hidden rounded-t-panel border border-edge bg-[var(--popover)] sm:h-[min(820px,90dvh)] sm:max-w-[1080px] sm:rounded-panel ${exiting ? "anim-sheet-out" : "anim-sheet"}`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <h2 className="text-[26px] font-extrabold uppercase leading-none tracking-tight text-t1 sm:text-[30px]">Choose a style</h2>
            <p className="mt-2 max-w-[460px] text-[13.5px] leading-snug text-t3">The look Soul 2.0 gives your picture: light, tone and mood, picked from Higgsfield&apos;s curated styles.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-t1/[0.06] text-t1 hover:bg-t1/[0.12]">
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="mx-2 mb-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-card bg-black/25">
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-3">
            <label className="ml-auto flex h-9 w-[220px] items-center gap-2 rounded-card bg-t1/[0.06] px-3 ring-1 ring-inset ring-edge">
              <Icon name="search" size={14} className="text-t4" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search presets…" className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 outline-none placeholder:text-t4" />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {shown.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-t4">{styles.length === 0 ? "No styles yet." : "No style by that name."}</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-5">
                {shown.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={s.id === current}
                    onClick={() => {
                      onPick(s.id === DEFAULT_SOUL_STYLE ? "" : s.id);
                      onClose();
                    }}
                    className="block text-left"
                  >
                    <span className={`relative block aspect-[3/4] overflow-hidden rounded-card bg-t1/[0.06] ${s.id === current ? "ring-2 ring-accent" : "ring-1 ring-inset ring-edge"}`}>
                      <SoulStyleCover style={s} />
                    </span>
                    <span className="mt-2 block truncate text-center text-[13px] font-semibold text-t1">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The style card beside Generate (the Style chip on a phone): the chosen style's picture, and the window to change it. */
export function SoulStyleTile({ value, onChange, className = "" }: { value: string; onChange: (id: string) => void; className?: string }) {
  const hfKey = useStudio((s) => s.hfKey);
  const styles = useSoulStyles(hfKey);
  const [open, setOpen] = useState(false);
  const style = styles.find((x) => x.id === (value || DEFAULT_SOUL_STYLE));
  const name = style?.name ?? "General";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Style: ${name}`}
        className={`relative flex h-[80px] w-[120px] shrink-0 flex-col justify-end overflow-hidden rounded-panel bg-t1/[0.06] p-2 text-left ring-1 ring-inset ring-edge transition-colors duration-[120ms] hover:bg-t1/[0.1] max-md:h-9 max-md:w-auto max-md:flex-row max-md:items-center max-md:justify-start max-md:rounded-full max-md:px-3 ${className}`}
      >
        <span className="absolute inset-0 max-md:hidden">
          <SoulStyleCover style={style} />
        </span>
        <span className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 to-transparent max-md:hidden" />
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-chip bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white max-md:hidden">
          <Icon name="pencil" size={10} /> Change
        </span>
        <span className="relative block max-w-full truncate text-[12px] font-bold uppercase leading-tight text-white max-md:text-[12.5px] max-md:font-medium max-md:normal-case max-md:text-t2">{name}</span>
      </button>
      <SoulStylePicker open={open} styles={styles} selected={value} onPick={onChange} onClose={() => setOpen(false)} />
    </>
  );
}
