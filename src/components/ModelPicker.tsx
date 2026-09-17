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

function ModelCard({ model, active, onPick }: { model: ModelDef; active: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`group flex h-full flex-col rounded-2xl p-3.5 text-left ring-1 transition-all ${
        active
          ? "bg-white/10 ring-white/30"
          : "bg-white/[0.03] ring-white/8 hover:bg-white/[0.06] hover:ring-white/20"
      }`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/8 text-ink-200">
            <Icon name={CATEGORY_ICON[model.category]} size={15} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold text-white">{model.name}</span>
            <span className="block truncate text-[11px] text-ink-400">{model.vendor}</span>
          </span>
        </div>
        {model.badge && (
          <span className="shrink-0 rounded-full bg-brand/20 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-brand-soft">
            {model.badge}
          </span>
        )}
      </div>
      <p className="mb-2.5 line-clamp-2 text-[11.5px] leading-snug text-ink-300">{model.tagline}</p>
      <div className="mt-auto flex flex-wrap gap-1">
        {model.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-ink-400">
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

  // The rail can open the picker straight onto a category.
  useEffect(() => {
    if (open) setTab(storedTab);
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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="glass animate-rise relative flex h-[min(760px,88vh)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl shadow-2xl shadow-black/80">
        <header className="flex items-center gap-3 border-b border-white/8 px-5 py-3.5">
          <Icon name="search" size={17} className="shrink-0 text-ink-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search models, vendors or capabilities…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-ink-500"
          />
          <button
            type="button"
            onClick={() => togglePicker(false)}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-white/8 hover:text-white"
            aria-label="Close"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="flex items-center gap-1.5 px-5 py-3">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              tab === "all" ? "bg-white text-ink-950" : "bg-white/5 text-ink-300 hover:text-white"
            }`}
          >
            All {MODELS.length}
          </button>
          {CATEGORIES.map((category) => {
            const count = MODELS.filter((m) => m.category === category.id).length;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setTab(category.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  tab === category.id ? "bg-white text-ink-950" : "bg-white/5 text-ink-300 hover:text-white"
                }`}
              >
                <Icon name={CATEGORY_ICON[category.id]} size={14} />
                {category.label} {count}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {results.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-ink-400">
              Nothing matches “{query}”.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
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
