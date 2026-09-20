"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { VendorBadge } from "@/components/VendorMark";
import { CATEGORIES, MODELS, searchModels, type Category, type ModelDef } from "@/lib/registry";
import { usePresence } from "@/lib/usePresence";
import { ACCENT } from "@/lib/vendors";
import { useStudio } from "@/store/studio";

/** One accent per category, drawn from the four brand colours. */
export const CATEGORY_ACCENT: Record<Category, string> = ACCENT as Record<Category, string>;

const GROUP_LABEL: Record<Category, string> = {
  image: "Image models",
  video: "Video models",
  audio: "Audio models",
  tool: "Tools",
};

function ModelRow({
  model,
  active,
  onPick,
}: {
  model: ModelDef;
  active: boolean;
  onPick: () => void;
}) {
  const row = useRef<HTMLButtonElement>(null);

  // The one you are on should be in front of you when the list opens.
  useEffect(() => {
    if (active) row.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <button
      ref={row}
      type="button"
      onClick={onPick}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-left transition-colors duration-[120ms] ${
        active ? "bg-t1/[0.06] ring-1 ring-inset ring-line-strong" : "hover:bg-t1/[0.045]"
      }`}
    >
      <VendorBadge vendor={model.vendor} size={34} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-medium text-t1">{model.name}</span>
          {model.badge && (
            <span className="shrink-0 rounded-[2px] bg-accent px-1 py-px text-[9px] font-semibold uppercase tracking-[0.04em] text-accent-ink">
              {model.badge}
            </span>
          )}
        </span>
        <span className="block truncate text-[12px] leading-snug text-t3">{model.tagline}</span>
      </span>
      {active && (
        <Icon name="check" size={15} strokeWidth={2.2} className="shrink-0" style={{ color: "var(--accent)" }} />
      )}
    </button>
  );
}

/**
 * The catalogue as a list you read down rather than a wall of cards: search
 * at the top, models grouped by what they make, and the one you are using
 * ticked where it sits.
 */
export function ModelPicker() {
  const open = useStudio((s) => s.pickerOpen);
  const togglePicker = useStudio((s) => s.togglePicker);
  const selectModel = useStudio((s) => s.selectModel);
  const modelId = useStudio((s) => s.modelId);
  const storedTab = useStudio((s) => s.pickerTab);
  const locked = useStudio((s) => s.pickerLocked);
  const [query, setQuery] = useState("");
  const { mounted, exiting } = usePresence(open, 300);
  const scope: Category = storedTab === "all" ? "image" : storedTab;

  // Every opening starts from a clean search, so a stale query never hides
  // the catalogue.
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") togglePicker(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, togglePicker]);

  // A page's picker lists that page's models, but a search reaches the whole
  // catalogue — asking for "kling" from Images should find it, not nothing.
  const groups = useMemo(() => {
    const searching = query.trim().length > 0;
    const found = searching ? searchModels(query) : MODELS;
    const scoped = locked && !searching ? found.filter((m) => m.category === scope) : found;
    return CATEGORIES.map((category) => ({
      id: category.id,
      models: scoped.filter((m) => m.category === category.id),
    })).filter((group) => group.models.length > 0);
  }, [query, locked, scope]);

  if (!mounted) return null;

  const count = groups.reduce((sum, group) => sum + group.models.length, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close model picker"
        onClick={() => togglePicker(false)}
        className={`no-press absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${
          exiting ? "anim-fade-out" : "anim-fade"
        }`}
      />
      <div
        className={`relative flex w-full flex-col overflow-hidden bg-canvas sm:h-[min(620px,84vh)] sm:max-w-[560px] sm:rounded-panel sm:border sm:border-line ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex items-center gap-2 border-b border-line px-3 pb-3 pt-[max(16px,env(safe-area-inset-top))] sm:py-3">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-t1/[0.05] px-3.5">
            <Icon name="search" size={15} className="shrink-0 text-t4" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search models"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-t1 outline-none placeholder:text-t4 sm:text-[13.5px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="shrink-0 text-t4 transition-colors duration-[120ms] hover:text-t1"
              >
                <Icon name="close" size={13} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => togglePicker(false)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
            aria-label="Close"
          >
            <Icon name="close" size={15} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-2 pb-[max(16px,env(safe-area-inset-bottom))] pt-1 sm:pb-3">
          {count === 0 ? (
            <p className="py-16 text-center text-[13px] text-t4">Nothing matches “{query}”.</p>
          ) : (
            groups.map((group) => (
              <section key={group.id} className="pb-1.5">
                <h3 className="px-3 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-t4">
                  {GROUP_LABEL[group.id]}
                </h3>
                <div className="flex flex-col gap-0.5">
                  {group.models.map((model) => (
                    <ModelRow
                      key={model.id}
                      model={model}
                      active={model.id === modelId}
                      onPick={() => selectModel(model.id)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
