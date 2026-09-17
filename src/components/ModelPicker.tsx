"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, MODELS, searchModels, type Category, type ModelDef } from "@/lib/registry";
import { Icon, type IconName } from "@/components/Icon";
import { useStudio } from "@/store/studio";

const CATEGORY_ICON: Record<Category, IconName> = {
  image: "image",
  video: "video",
  audio: "audio",
  tool: "tool",
};

/** One accent per category, drawn from the four brand colours. */
export const CATEGORY_ACCENT: Record<Category, string> = {
  image: "#62a2ff",
  video: "#762fad",
  audio: "#65f223",
  tool: "#55227d",
};

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
  const accent = CATEGORY_ACCENT[model.category];
  return (
    <button
      type="button"
      onClick={onPick}
      style={{ animationDelay: `${Math.min(index, 14) * 18}ms` }}
      className={`anim-tile group flex h-full flex-col rounded-card p-3.5 text-left ring-1 transition-all duration-[200ms] hover:-translate-y-0.5 ${
        active
          ? "bg-t1/[0.08] ring-line-strong"
          : "bg-t1/[0.028] ring-line hover:bg-t1/[0.06] hover:ring-line-strong"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-chip transition-colors duration-[200ms]"
            style={{
              background: `color-mix(in oklab, ${accent} 18%, transparent)`,
              color: accent,
            }}
          >
            <Icon name={CATEGORY_ICON[model.category]} size={14} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-medium text-t1">{model.name}</span>
            <span className="block truncate text-[11px] text-t4">{model.vendor}</span>
          </span>
        </div>
        {model.badge && (
          <span
            className="shrink-0 rounded-chip px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]"
            style={{
              background: `color-mix(in oklab, ${accent} 16%, transparent)`,
              color: accent,
            }}
          >
            {model.badge}
          </span>
        )}
      </div>
      <p className="mb-3 line-clamp-2 text-[11.5px] leading-snug text-t3">{model.tagline}</p>
      <div className="mt-auto flex flex-wrap gap-1">
        {model.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-chip bg-t1/[0.055] px-1.5 py-0.5 text-[10px] text-t4">
            {tag}
          </span>
        ))}
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close model picker"
        onClick={() => togglePicker(false)}
        className="anim-fade absolute inset-0 bg-canvas-deep/75 backdrop-blur-md"
      />
      <div
        className="anim-pop relative flex h-[min(760px,86vh)] w-full max-w-5xl flex-col overflow-hidden rounded-panel border border-line bg-elevated"
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
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

        <div className="flex flex-wrap items-center gap-1 px-5 py-3">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`rounded-chip px-3 py-1.5 text-[12.5px] transition-all duration-[120ms] ${
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
                className={`flex items-center gap-1.5 rounded-chip px-3 py-1.5 text-[12.5px] transition-all duration-[120ms] ${
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

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {results.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-t4">Nothing matches “{query}”.</p>
          ) : (
            <div
              key={`${tab}-${query}`}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
            >
              {results.map((model, index) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  index={index}
                  active={model.id === modelId}
                  onPick={() => selectModel(model.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
