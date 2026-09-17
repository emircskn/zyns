"use client";

import { useEffect, useMemo, useState } from "react";
import { CoverArt } from "@/components/CoverArt";
import { Icon } from "@/components/Icon";
import { PillGroup } from "@/components/PillGroup";
import { VendorBadge } from "@/components/VendorMark";
import { CATEGORIES, MODELS, searchModels, type Category, type ModelDef } from "@/lib/registry";
import { usePresence } from "@/lib/usePresence";
import { ACCENT } from "@/lib/vendors";
import { useStudio } from "@/store/studio";

/** One accent per category, drawn from the four brand colours. */
export const CATEGORY_ACCENT: Record<Category, string> = ACCENT as Record<Category, string>;

const TAB_LABEL: Record<Category, string> = {
  image: "Images",
  video: "Videos",
  audio: "Audio",
  tool: "Tools",
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
  return (
    <button
      type="button"
      onClick={onPick}
      style={{ animationDelay: `${180 + Math.min(index, 14) * 22}ms` }}
      className={`anim-tile lift group flex flex-col overflow-hidden rounded-card bg-surface-2 text-left ring-1 transition-colors duration-[200ms] ${
        active ? "ring-t1/60" : "ring-transparent hover:ring-line-strong"
      }`}
    >
      <div className="relative">
        <CoverArt id={model.id} category={model.category} className="aspect-[7/4]" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          {model.badge ? (
            <span className="rounded-chip bg-accent px-2 py-0.5 text-[10.5px] font-semibold uppercase italic tracking-[0.04em] text-accent-ink">
              {model.badge}
            </span>
          ) : (
            <span />
          )}
          <VendorBadge vendor={model.vendor} size={22} />
        </div>
        {active && (
          <span className="absolute bottom-2.5 right-2.5 grid h-6 w-6 place-items-center rounded-full bg-t1 text-canvas">
            <Icon name="check" size={12} strokeWidth={2.4} />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-3.5 pb-3.5 pt-3">
        <span className="block truncate text-[15px] font-semibold uppercase leading-tight tracking-[-0.01em] text-t1">
          {model.name}
        </span>
        <span className="block truncate text-[12.5px] leading-snug text-t3">{model.tagline}</span>
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
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<Category>(storedTab === "all" ? "image" : storedTab);
  const { mounted, exiting } = usePresence(open, 300);

  // The rail and the prompt bar can open the picker straight onto a
  // category; each opening starts from a clean search so a stale query
  // never hides the catalogue.
  useEffect(() => {
    if (!open) return;
    setTab(storedTab === "all" ? "image" : storedTab);
    setQuery("");
    setSearching(false);
  }, [open, storedTab]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") togglePicker(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, togglePicker]);

  // A search spans every category so "kling" is found from the Images tab.
  const results = useMemo(
    () => (query.trim() ? searchModels(query) : MODELS.filter((m) => m.category === tab)),
    [query, tab],
  );

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close model picker"
        onClick={() => togglePicker(false)}
        className={`no-press absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        className={`relative flex w-full flex-col overflow-hidden bg-canvas sm:h-[min(820px,90vh)] sm:max-w-5xl sm:rounded-panel sm:border sm:border-line ${
          exiting ? "anim-sheet-out" : "anim-sheet sheet-stagger"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex items-center gap-2 px-4 pb-3 pt-[max(20px,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
          {searching ? (
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full bg-t1/[0.07] px-4 py-2.5">
              <Icon name="search" size={16} className="shrink-0 text-t4" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search models…"
                className="min-w-0 flex-1 bg-transparent text-[16px] text-t1 outline-none placeholder:text-t4 sm:text-[14px]"
              />
            </div>
          ) : (
            <h2 className="flex-1 text-[30px] font-semibold leading-none tracking-[-0.03em] text-t1 sm:text-[34px]">
              Create
            </h2>
          )}
          <button
            type="button"
            onClick={() => {
              setSearching((value) => !value);
              setQuery("");
            }}
            aria-label={searching ? "Stop searching" : "Search models"}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors duration-[120ms] ${
              searching ? "bg-t1 text-canvas" : "bg-t1/[0.07] text-t1 hover:bg-t1/[0.12]"
            }`}
          >
            <Icon name="search" size={17} />
          </button>
          <button
            type="button"
            onClick={() => togglePicker(false)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-t1/[0.07] text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.12]"
            aria-label="Close"
          >
            <Icon name="close" size={17} />
          </button>
        </header>

        {!query.trim() && (
          <div className="px-4 py-2 sm:px-6">
            <PillGroup
              size="lg"
              bare
              value={tab}
              onChange={setTab}
              items={CATEGORIES.map((category) => ({ id: category.id, label: TAB_LABEL[category.id] }))}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-6">
          {results.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-t4">Nothing matches “{query}”.</p>
          ) : (
            <div key={`${tab}-${query}`} className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
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
