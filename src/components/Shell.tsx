"use client";

import { useState } from "react";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { Gallery } from "@/components/Gallery";
import { Icon, type IconName } from "@/components/Icon";
import { ModelPicker } from "@/components/ModelPicker";
import { PromptBar } from "@/components/PromptBar";
import { RunPoller } from "@/components/RunPoller";
import { SettingsPanel } from "@/components/SettingsPanel";
import { CATEGORIES, type Category } from "@/lib/registry";
import { useModel, useStudio } from "@/store/studio";

const CATEGORY_ICON: Record<Category, IconName> = {
  image: "image",
  video: "video",
  audio: "audio",
  tool: "tool",
};

function Rail({ onKeyClick }: { onKeyClick: () => void }) {
  const togglePicker = useStudio((s) => s.togglePicker);
  const model = useModel();
  const apiKey = useStudio((s) => s.apiKey);

  return (
    <nav className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col items-center border-r border-white/8 bg-ink-900/80 py-4 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => togglePicker(true, "all")}
        title="Browse all models"
        className="mb-5 grid h-9 w-9 place-items-center rounded-xl bg-white text-ink-950"
      >
        <Icon name="spark" size={18} strokeWidth={2} />
      </button>

      <div className="flex flex-col gap-1.5">
        {CATEGORIES.map((category) => {
          const active = model?.category === category.id;
          return (
            <button
              key={category.id}
              type="button"
              title={`${category.label} — ${category.blurb}`}
              onClick={() => togglePicker(true, category.id)}
              className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                active ? "bg-white/12 text-white" : "text-ink-400 hover:bg-white/6 hover:text-white"
              }`}
            >
              <Icon name={CATEGORY_ICON[category.id]} size={19} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onKeyClick}
        title={apiKey ? "API key connected" : "Add your API key"}
        className={`mt-auto grid h-10 w-10 place-items-center rounded-xl transition-colors ${
          apiKey ? "text-emerald-400 hover:bg-white/6" : "text-amber-400 hover:bg-white/6"
        }`}
      >
        <Icon name="key" size={18} />
      </button>
    </nav>
  );
}

function TopBar({ onKeyClick }: { onKeyClick: () => void }) {
  const credits = useStudio((s) => s.credits);
  const apiKey = useStudio((s) => s.apiKey);
  const runs = useStudio((s) => s.runs);
  const clearRuns = useStudio((s) => s.clearRuns);
  const model = useModel();

  const active = runs.filter((r) => r.state === "pending" || r.state === "running").length;

  return (
    <header className="sticky top-0 z-20 -mx-6 mb-5 flex items-center gap-3 border-b border-white/8 bg-ink-950/80 px-6 py-3.5 backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="truncate text-[14.5px] font-semibold text-white">
          {model?.name ?? "KIE Studio"}
        </h1>
        <p className="truncate text-[11.5px] text-ink-400">
          {active > 0 ? `${active} run${active > 1 ? "s" : ""} in progress` : model?.tagline}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {runs.length > 0 && (
          <button
            type="button"
            onClick={clearRuns}
            className="rounded-full px-3 py-1.5 text-[12px] text-ink-400 hover:bg-white/6 hover:text-white"
          >
            Clear gallery
          </button>
        )}
        <button
          type="button"
          onClick={onKeyClick}
          className="flex items-center gap-2 rounded-full bg-white/6 px-3 py-1.5 text-[12px] text-ink-200 hover:bg-white/12 hover:text-white"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${apiKey ? "bg-emerald-400" : "bg-amber-400"}`}
          />
          {apiKey
            ? credits !== null
              ? `${credits.toLocaleString()} credits`
              : "Connected"
            : "Add API key"}
        </button>
      </div>
    </header>
  );
}

export function Shell() {
  const [keyOpen, setKeyOpen] = useState(false);
  const apiKey = useStudio((s) => s.apiKey);
  const hydrated = useStudio((s) => s.hydrated);

  return (
    <div className="min-h-screen pl-16">
      <Rail onKeyClick={() => setKeyOpen(true)} />

      <main className="mx-auto max-w-[1600px] px-6 pb-[280px]">
        <TopBar onKeyClick={() => setKeyOpen(true)} />
        {hydrated && !apiKey && (
          <button
            type="button"
            onClick={() => setKeyOpen(true)}
            className="mb-5 flex w-full items-center gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-left ring-1 ring-inset ring-amber-500/25"
          >
            <Icon name="key" size={17} className="shrink-0 text-amber-400" />
            <span className="min-w-0 flex-1 text-[12.5px] text-amber-200">
              Add your KIE API key to start generating. It stays in this browser.
            </span>
            <span className="shrink-0 text-[12px] font-medium text-amber-300">Add key</span>
          </button>
        )}
        <Gallery />
      </main>

      <PromptBar />
      <SettingsPanel />
      <ModelPicker />
      <RunPoller />
      <ApiKeyDialog open={keyOpen} onClose={() => setKeyOpen(false)} />
    </div>
  );
}
