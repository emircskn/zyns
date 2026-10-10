"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";
import { Icon } from "@/components/Icon";
import { ModelRow } from "@/components/ModelPicker";
import { modelsForStep } from "@/lib/recipes/engine";
import type { Step } from "@/lib/recipes/types";
import { usePresence } from "@/lib/usePresence";

const CAPABILITY_LABEL: Record<string, string> = {
  "text-to-image": "Text to image",
  "image-edit-multi": "Image edit, several pictures",
  "image-to-video": "Image to video",
  "reference-to-video": "Reference to video",
  "video-edit": "Video edit",
  "motion-transfer": "Motion transfer",
  "object-swap": "Object swap",
  "lipsync-from-audio": "Lip sync from audio",
  "text-to-speech": "Text to speech",
};

export function capabilityLabel(capability: string): string {
  return CAPABILITY_LABEL[capability] ?? capability;
}

/**
 * The model picker for one step of a recipe: only the models that can do
 * what the step needs, KIE's and Higgsfield's together, each marked with
 * whose it is.
 */
export function StepModelPicker({
  step,
  open,
  current,
  onPick,
  onClose,
}: {
  step: Step | null;
  open: boolean;
  current?: string;
  onPick: (modelId: string) => void;
  onClose: () => void;
}) {
  const { mounted, exiting } = usePresence(open, 240);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Pulled down on a phone, it closes.
  const swipe = useSwipeDismiss(sheetRef, onClose);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);
  const models = useMemo(() => {
    const all = step ? modelsForStep(step) : [];
    const q = query.trim().toLowerCase();
    return q ? all.filter((m) => `${m.name} ${m.vendor} ${m.provider ?? "kie"}`.toLowerCase().includes(q)) : all;
  }, [step, query]);
  if (!mounted || !step) return null;

  return (
    <div className="fixed inset-0 z-[116] flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        ref={sheetRef}
        className={`relative flex w-full flex-col overflow-hidden bg-canvas sm:h-[min(620px,84vh)] sm:max-w-[560px] sm:rounded-panel sm:border sm:border-line ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header {...swipe} className="border-b border-line px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))] sm:pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[16px] text-t1">{step.label ?? step.id}</p>
              <p className="text-[12.5px] text-t3">
                {capabilityLabel(step.capability)} · {models.length} {models.length === 1 ? "model" : "models"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
            >
              <Icon name="close" size={17} />
            </button>
          </div>
          <div className="flex h-10 items-center gap-2.5 rounded-full bg-t1/[0.05] px-3.5">
            <Icon name="search" size={17} className="shrink-0 text-t4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search models"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-t1 outline-none placeholder:text-t4 sm:text-[13.5px]"
            />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-2 py-2 pb-[max(16px,env(safe-area-inset-bottom))]">
          {models.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-t4">No model matches.</p>
          ) : (
            models.map((model) => (
              <ModelRow
                key={model.id}
                model={model}
                active={model.id === current}
                showProvider
                onPick={() => {
                  onPick(model.id);
                  onClose();
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
