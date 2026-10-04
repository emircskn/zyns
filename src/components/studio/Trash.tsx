"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChoiceDialog } from "@/components/ChoiceDialog";
import { GlideMark } from "@/components/GlideMark";
import { Icon } from "@/components/Icon";
import { TRASH_DAYS, useStudio } from "@/store/studio";

export type TrashKind = "generation" | "upload" | "folder" | "project";

export interface TrashItem {
  key: string;
  kind: TrashKind;
  name: string;
  trashedAt: number;
  /** Drawn in the middle of its card. */
  preview: ReactNode;
  restore: () => void;
  /** Gone for good. */
  purge: () => void;
}

const DAY = 86_400_000;

/** Days left before the Trash lets it go. */
function daysLeft(trashedAt: number): string {
  const days = Math.max(1, Math.ceil((trashedAt + TRASH_DAYS * DAY - Date.now()) / DAY));
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** A folder in the Trash, drawn as one in its own colour. */
export function FolderGlyph({ color }: { color?: string }) {
  const c = color ?? "var(--t3)";
  return (
    <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" fill={c} />
      <path d="M2 9h20" stroke="rgba(0,0,0,0.18)" strokeWidth="1.2" />
    </svg>
  );
}

function Card({
  item,
  picked,
  onPick,
  onRestore,
  onPurge,
}: {
  item: TrashItem;
  picked: boolean;
  onPick: () => void;
  onRestore: () => void;
  onPurge: () => void;
}) {
  // Shown on hover and while picked; always where there is no hover.
  const reveal = picked ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100";
  const round = "grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white transition-colors duration-[120ms]";
  return (
    <div className="group relative aspect-[4/5] overflow-hidden rounded-card bg-t1/[0.04]">
      <button type="button" onClick={onPick} aria-pressed={picked} aria-label={`Select ${item.name}`} className="absolute inset-0 grid place-items-center pb-7">
        {item.preview}
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/40 to-transparent px-2.5 pb-2 pt-6">
        <span className="min-w-0 truncate text-[12.5px] font-semibold text-t1 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">{item.name}</span>
        <span className="shrink-0 text-[11.5px] text-t3">{daysLeft(item.trashedAt)}</span>
      </div>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-card ring-inset transition-shadow duration-[120ms] ${picked ? "ring-2 ring-t1" : "ring-1 ring-line"}`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-[6px] border transition-opacity duration-[120ms] ${
          picked ? "border-t1 bg-t1 text-canvas" : "border-white/70 bg-black/30 text-transparent"
        } ${reveal}`}
      >
        <Icon name="check" size={12} strokeWidth={2.6} />
      </span>
      <div className={`absolute right-2 top-2 flex flex-col gap-1.5 transition-opacity duration-[120ms] ${reveal}`}>
        <button type="button" onClick={onRestore} aria-label={`Restore ${item.name}`} title="Restore" className={`${round} hover:bg-black/80`}>
          <Icon name="undo" size={14} />
        </button>
        <button type="button" onClick={onPurge} aria-label={`Delete ${item.name} permanently`} title="Delete permanently" className={`${round} hover:bg-[#ff6b6b]/80`}>
          <Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  );
}

/**
 * The Trash: what was deleted, kept for TRASH_DAYS so it can come back.
 * Kinds as tabs, each card with its days left; on hover (always, on a
 * phone) a box to pick it, Restore and Delete for good. Picking brings up
 * a bar along the bottom for all the picked at once.
 */
export function TrashView({
  items,
  tabs,
  note,
  purgeNote,
}: {
  items: TrashItem[];
  /** Said before anything goes for good: what that means here. */
  purgeNote: string;
  /** The kinds this Trash holds, as its tabs after All; none for a single kind. */
  tabs?: Array<{ id: TrashKind; label: string }>;
  note: string;
}) {
  const [tab, setTab] = useState<TrashKind | "all">("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [asking, setAsking] = useState<{ title: string; run: () => void } | null>(null);
  const setSelecting = useStudio((s) => s.setSelecting);

  const shown = (tab === "all" ? [...items] : items.filter((i) => i.kind === tab)).sort((a, b) => b.trashedAt - a.trashedAt);
  const chosen = items.filter((i) => picked.includes(i.key));
  const toggle = (key: string) => setPicked((now) => (now.includes(key) ? now.filter((k) => k !== key) : [...now, key]));
  const forGood = (list: TrashItem[], title: string) =>
    setAsking({
      title: title ||
        (list.length === 1
          ? `Permanently delete “${list[0].name.length > 40 ? `${list[0].name.slice(0, 38).trimEnd()}…` : list[0].name}”?`
          : `Permanently delete ${list.length} items?`),
      run: () => {
        for (const item of list) item.purge();
        setPicked((now) => now.filter((k) => !list.some((i) => i.key === k)));
      },
    });

  // What left the Trash is no longer picked.
  useEffect(() => {
    setPicked((now) => {
      const next = now.filter((k) => items.some((i) => i.key === k));
      return next.length === now.length ? now : next;
    });
  }, [items]);

  // The composer's bar steps aside for this one while something is picked.
  useEffect(() => {
    setSelecting(chosen.length);
    return () => setSelecting(0);
  }, [chosen.length, setSelecting]);

  useEffect(() => {
    if (chosen.length === 0) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPicked([]);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [chosen.length]);

  const barButton = "flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.1] hover:text-t1 sm:px-3.5";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pb-3 pt-2 md:min-h-[56px] md:px-1 md:py-2.5">
        <h2 className="text-[15px] font-semibold text-t1">Trash</h2>
        <div className="flex items-center gap-3">
          <p className="hidden text-[12.5px] text-t3 sm:block">{note}</p>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => forGood(items, "Empty the Trash?")}
            className="cta h-8 rounded-full px-3.5 text-[13px] font-medium disabled:opacity-40"
          >
            Empty trash
          </button>
        </div>
        <p className="w-full text-[12.5px] text-t3 sm:hidden">{note}</p>
      </div>

      {tabs && tabs.length > 1 && (
        <div className="no-bar relative mx-4 mb-3 flex gap-1 overflow-x-auto md:mx-1">
          <GlideMark value={tab} className="rounded-full bg-t1/[0.1]" />
          {[{ id: "all" as const, label: "All" }, ...tabs].map((t) => {
            const count = t.id === "all" ? items.length : items.filter((i) => i.kind === t.id).length;
            return (
              <button
                key={t.id}
                type="button"
                data-pill={t.id}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`relative flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors duration-[var(--d-slow)] ${
                  tab === t.id ? "text-t1" : "text-t3 hover:text-t1"
                }`}
              >
                {t.label}
                {count > 0 && <span className="font-mono text-[11px] text-t4">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div key={tab} className="anim-fade">
        {shown.length === 0 ? (
          <p className="px-4 py-16 text-center text-[13px] text-t3">{items.length === 0 ? "The Trash is empty." : "Nothing of this kind in the Trash."}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-3 md:px-1 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {shown.map((item) => (
              <Card
                key={item.key}
                item={item}
                picked={picked.includes(item.key)}
                onPick={() => toggle(item.key)}
                onRestore={item.restore}
                onPurge={() => forGood([item], "")}
              />
            ))}
          </div>
        )}
      </div>

      {chosen.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="bar-rise pointer-events-none fixed bottom-[var(--nav-h)] left-0 right-0 z-50 flex justify-center px-3 pb-3 md:pb-5">
            <div className="surface-pop pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1.5 pl-3">
              <span className="mr-1 flex shrink-0 items-center gap-2 whitespace-nowrap text-[12.5px] text-t1">
                <span className="grid h-6 w-6 place-items-center rounded-chip bg-t1 text-canvas">
                  <Icon name="check" size={15} strokeWidth={2.2} />
                </span>
                {chosen.length} selected
              </span>
              {chosen.length < shown.length && (
                <button type="button" onClick={() => setPicked(shown.map((i) => i.key))} aria-label="Select all" className={barButton}>
                  <Icon name="grid" size={16} />
                  <span className="hidden sm:inline">Select all</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  for (const item of chosen) item.restore();
                  setPicked([]);
                }}
                className={`${barButton} bg-t1/[0.07] text-t1`}
              >
                <Icon name="undo" size={15} />
                Restore
              </button>
              <button
                type="button"
                onClick={() => forGood(chosen, "")}
                aria-label="Delete permanently"
                className={`${barButton} hover:!bg-[#ff6b6b]/12 hover:!text-[#ff8f8f]`}
              >
                <Icon name="trash" size={15} />
              </button>
              <button type="button" onClick={() => setPicked([])} aria-label="Clear selection" className={barButton}>
                <Icon name="close" size={15} />
              </button>
            </div>
          </div>,
          document.body,
        )}

      <ChoiceDialog
        open={!!asking}
        title={asking?.title ?? ""}
        message={purgeNote}
        confirmLabel="Delete permanently"
        onConfirm={() => {
          asking?.run();
          setAsking(null);
        }}
        onClose={() => setAsking(null)}
      />
    </div>
  );
}

/** Lets go of what has been in the Trash too long, once the saved studio is loaded. */
export function TrashSweeper() {
  useEffect(() => {
    const run = () => useStudio.getState().sweepTrash();
    if (useStudio.persist.hasHydrated()) run();
    else return useStudio.persist.onFinishHydration(run);
  }, []);
  return null;
}
