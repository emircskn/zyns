"use client";

import { useEffect, useMemo, useState } from "react";
import { CoverArt } from "@/components/CoverArt";
import { Icon, type IconName } from "@/components/Icon";
import { VendorBadge } from "@/components/VendorMark";
import { CATEGORIES, MODELS, searchModels, type Category, type ModelDef } from "@/lib/registry";
import { ACCENT } from "@/lib/vendors";
import { useStudio } from "@/store/studio";

const CATEGORY_ICON: Record<Category, IconName> = {
  image: "image",
  video: "video",
  audio: "audio",
  tool: "tool",
};

/** One accent per category, drawn from the four brand colours. */
export const CATEGORY_ACCENT: Record<Category, string> = ACCENT as Record<Category, string>;

function ModelCard({
  model,
  active,
  index,
  onPick,
}: {
  model: ModelDef;
  active: boolean;
  index: number;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      style={{ animationDelay: `${Math.min(index, 14) * 18}ms` }}
      className={`anim-tile lift group flex h-full flex-col overflow-hidden rounded-card text-left ring-1 transition-colors duration-[200ms] ${
        active ? "bg-t1/[0.08] ring-line-strong" : "bg-t1/[0.028] ring-line hover:ring-line-strong"
      }`}
    >
      <div className="relative">
        <CoverArt id={model.id} category={model.category} className="aspect-[16/7]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
          <VendorBadge vendor={model.vendor} size={24} />
          {model.badge && (
            <span className="rounded-chip bg-black/45 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-white backdrop-blur-md">
              {model.badge}
            </span>
          )}
        </div>
        {active && (
          <span className="absolute bottom-2.5 right-2.5 grid h-5 w-5 place-items-center rounded-full bg-white text-black">
            <Icon name="check" size={11} strokeWidth={2.4} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <span className="block truncate text-[13.5px] font-medium text-t1">{model.name}</span>
        <span className="block truncate text-[11px] text-t4">{model.vendor}</span>
        <p className="mb-2.5 mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-t3">{model.tagline}</p>
        <div className="mt-auto flex flex-wrap gap-1">
          {(model.modes ?? []).slice(0, 3).map((mode) => (
            <span key={mode.id} className="rounded-chip bg-t1/[0.055] px-1.5 py-0.5 text-[10px] text-t3">
              {mode.label}
            </span>
          ))}
          {(model.modes?.length ?? 0) > 3 && (
            <span className="rounded-chip px-1 py-0.5 font-mono text-[10px] text-t4">
              +{(model.modes?.length ?? 0) - 3}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ModelPicker() {
  const open = useStudio((s) => s.pickerOpen);
  const togglePicker = useStudio((s) => s.togglePicker);
  const selectModel = useStudio((s) => s.selectModel);
  const modelId = useStudio((s) => s.modelId);
  const storedTab = useStudio((s) => s.pickerTab);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Category | "all">(storedTab);

  // The rail can open the picker straight onto a category; each opening
  // starts from a clean search so a stale query never hides the catalogue.
  useEffect(() => {
    if (!open) return;
    setTab(storedTab);
    setQuery("");
  }, [open, storedTab]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") togglePicker(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, togglePicker]);

  const results = useMemo(() => {
    const base = query ? searchModels(query) : MODELS;
    return tab === "all" ? base : base.filter((m) => m.category === tab);
  }, [query, tab]);

  // Group by vendor so a long catalogue reads as a shelf, not a list.
  const groups = useMemo(() => {
    const map = new Map<string, ModelDef[]>();
    for (const model of results) map.set(model.vendor, [...(map.get(model.vendor) ?? []), model]);
    return [...map.entries()];
  }, [results]);

  if (!open) return null;

  let running = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close model picker"
        onClick={() => togglePicker(false)}
        className="anim-fade absolute inset-0 bg-canvas-deep/75 backdrop-blur-md"
      />
      <div
        className="anim-pop relative flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-panel border border-line bg-elevated sm:h-[min(760px,86vh)] sm:rounded-panel"
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4">
          <Icon name="search" size={16} className="shrink-0 text-t4" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search models, vendors or capabilities…"
            className="min-w-0 flex-1 bg-transparent text-[14px] tracking-[-0.011em] text-t1 outline-none placeholder:text-t4"
          />
          <button
            type="button"
            onClick={() => togglePicker(false)}
            className="grid h-7 w-7 place-items-center rounded-chip text-t4 transition-colors duration-[120ms] hover:bg-t1/[0.07] hover:text-t1"
            aria-label="Close"
          >
            <Icon name="close" size={15} />
          </button>
        </header>

        <div className="flex items-center gap-1 overflow-x-auto px-4 py-3 sm:flex-wrap sm:px-5">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`shrink-0 whitespace-nowrap rounded-chip px-3 py-1.5 text-[12.5px] transition-all duration-[120ms] ${
              tab === "all" ? "cta" : "bg-t1/[0.055] text-t3 hover:text-t1"
            }`}
          >
            All <span className="font-mono text-[11px] opacity-60">{MODELS.length}</span>
          </button>
          {CATEGORIES.map((category) => {
            const count = MODELS.filter((m) => m.category === category.id).length;
            const selected = tab === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setTab(category.id)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-chip px-3 py-1.5 text-[12.5px] transition-all duration-[120ms] ${
                  selected ? "cta" : "bg-t1/[0.055] text-t3 hover:text-t1"
                }`}
              >
                <Icon
                  name={CATEGORY_ICON[category.id]}
                  size={13}
                  style={{ color: selected ? undefined : CATEGORY_ACCENT[category.id] }}
                />
                {category.label} <span className="font-mono text-[11px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))] sm:px-5 sm:pb-5">
          {results.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-t4">Nothing matches “{query}”.</p>
          ) : (
            <div key={`${tab}-${query}`} className="flex flex-col gap-6">
              {groups.map(([vendor, models]) => (
                <section key={vendor}>
                  <div className="mb-2.5 flex items-center gap-2">
                    <VendorBadge vendor={vendor} size={20} />
                    <h3 className="text-[12.5px] text-t2">{vendor}</h3>
                    <span className="font-mono text-[10.5px] text-t4">{models.length}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {models.map((model) => (
                      <ModelCard
                        key={model.id}
                        model={model}
                        index={running++}
                        active={model.id === modelId}
                        onPick={() => selectModel(model.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
