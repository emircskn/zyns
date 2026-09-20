"use client";

import { useEffect, useMemo, useState } from "react";
import { CoverArt } from "@/components/CoverArt";
import { Icon } from "@/components/Icon";
import { PillGroup } from "@/components/PillGroup";
import { VendorBadge } from "@/components/VendorMark";
import { CATEGORIES, MODELS, type Category, type ModelDef } from "@/lib/registry";
import { usePresence } from "@/lib/usePresence";
import { useStudio } from "@/store/studio";

type Tab = "all" | Category;

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "all", label: "All" },
  ...CATEGORIES.map((category) => ({ id: category.id as Tab, label: category.label })),
];

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
      style={{ animationDelay: `${120 + Math.min(index, 12) * 20}ms` }}
      className={`anim-tile lift card-lazy group flex flex-col overflow-hidden rounded-card bg-surface-2 text-left ring-1 transition-colors duration-[200ms] ${
        active ? "ring-t1/60" : "ring-transparent"
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
          <VendorBadge vendor={model.vendor} size={24} />
        </div>
        {active && (
          <span className="absolute bottom-2.5 right-2.5 grid h-8 w-8 place-items-center rounded-full bg-t1 text-canvas">
            <Icon name="check" size={16} strokeWidth={2.4} />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-3 pb-3 pt-2.5">
        <span className="block truncate text-[13.5px] font-semibold uppercase leading-tight tracking-[-0.01em] text-t1">
          {model.name}
        </span>
        <span className="block truncate text-[12px] leading-snug text-t3">{model.tagline}</span>
      </div>
    </button>
  );
}

/**
 * What a phone's Create button opens: the catalogue as covers rather than a
 * list, since the point here is to browse for something to make, not to find
 * a model you already have in mind.
 */
export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const selectModel = useStudio((s) => s.selectModel);
  const modelId = useStudio((s) => s.modelId);
  const [tab, setTab] = useState<Tab>("all");
  const { mounted, exiting } = usePresence(open, 300);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const shown = useMemo(
    () => (tab === "all" ? MODELS : MODELS.filter((model) => model.category === tab)),
    [tab],
  );

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`no-press absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${
          exiting ? "anim-fade-out" : "anim-fade"
        }`}
      />
      <div
        className={`relative flex w-full flex-col overflow-hidden bg-canvas sm:h-[min(820px,88vh)] sm:max-w-3xl sm:rounded-panel sm:border sm:border-line ${
          exiting ? "anim-sheet-out" : "anim-sheet sheet-stagger"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex items-center gap-2 px-4 pb-3 pt-[max(18px,env(safe-area-inset-top))] sm:px-5 sm:pt-5">
          <h2 className="flex-1 text-[26px] font-semibold leading-none tracking-[-0.03em] text-t1">
            Create
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-t1/[0.07] text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.12]"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="px-4 pb-2 sm:px-5">
          <PillGroup
            size="lg"
            bare
            value={tab}
            onChange={setTab}
            items={TABS}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-5">
          <div key={tab} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {shown.map((model, index) => (
              <ModelCard
                key={model.id}
                model={model}
                index={index}
                active={model.id === modelId}
                onPick={() => {
                  selectModel(model.id);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
