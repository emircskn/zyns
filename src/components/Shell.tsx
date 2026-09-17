"use client";

import { useEffect, useState } from "react";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { Gallery } from "@/components/Gallery";
import { Icon, type IconName } from "@/components/Icon";
import { CATEGORY_ACCENT, ModelPicker } from "@/components/ModelPicker";
import { PromptBar } from "@/components/PromptBar";
import { RunPoller } from "@/components/RunPoller";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ThemeSync } from "@/components/ThemeSync";
import { CATEGORIES, type Category } from "@/lib/registry";
import { useModel, useStudio } from "@/store/studio";

const CATEGORY_ICON: Record<Category, IconName> = {
  image: "image",
  video: "video",
  audio: "audio",
  tool: "tool",
};

function RailButton({
  icon,
  label,
  active,
  accent,
  onClick,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  accent?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`group relative grid h-9 w-9 place-items-center rounded-chip transition-all duration-[200ms] ${
        active ? "bg-t1/[0.1] text-t1" : "text-t4 hover:bg-t1/[0.055] hover:text-t1"
      }`}
    >
      <Icon name={icon} size={17} style={active && accent ? { color: accent } : undefined} />
      <span
        className="pointer-events-none absolute left-full ml-2.5 hidden whitespace-nowrap rounded-chip border border-line bg-elevated px-2 py-1 text-[11.5px] text-t2 shadow-[var(--shadow-pop)] group-hover:block"
        style={{ animation: "fade-in 120ms var(--ease) both" }}
      >
        {label}
      </span>
    </button>
  );
}

function Rail({ onKeyClick }: { onKeyClick: () => void }) {
  const togglePicker = useStudio((s) => s.togglePicker);
  const theme = useStudio((s) => s.theme);
  const setTheme = useStudio((s) => s.setTheme);
  const model = useModel();
  const apiKey = useStudio((s) => s.apiKey);

  return (
    <nav className="fixed inset-y-0 left-0 z-30 flex w-14 flex-col items-center border-r border-line bg-canvas-deep/60 py-3.5 backdrop-blur-2xl">
      <button
        type="button"
        onClick={() => togglePicker(true, "all")}
        title="Browse all models"
        className="cta mb-5 grid h-8 w-8 place-items-center rounded-chip hover:scale-105 active:scale-95"
      >
        <Icon name="spark" size={16} strokeWidth={1.8} />
      </button>

      <div className="flex flex-col gap-0.5">
        {CATEGORIES.map((category) => (
          <RailButton
            key={category.id}
            icon={CATEGORY_ICON[category.id]}
            label={`${category.label} — ${category.blurb}`}
            active={model?.category === category.id}
            accent={CATEGORY_ACCENT[category.id]}
            onClick={() => togglePicker(true, category.id)}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-0.5">
        <RailButton
          icon={theme === "dark" ? "sun" : "moon"}
          label={theme === "dark" ? "Switch to light" : "Switch to dark"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <button
          type="button"
          onClick={onKeyClick}
          title={apiKey ? "API key connected" : "Add your API key"}
          className="group relative grid h-9 w-9 place-items-center rounded-chip text-t4 transition-all duration-[200ms] hover:bg-t1/[0.055]"
        >
          <Icon name="key" size={16} style={{ color: apiKey ? "#65f223" : "#62a2ff" }} />
        </button>
      </div>
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
    <header className="sticky top-0 z-20 -mx-6 mb-6 flex items-center gap-3 border-b border-line bg-canvas/75 px-6 py-3.5 backdrop-blur-2xl">
      <div key={model?.id} className="anim-swap min-w-0">
        <h1 className="truncate text-[14.5px] text-t1">{model?.name ?? "KIE Studio"}</h1>
        <p className="truncate text-[11.5px] text-t4">
          {active > 0 ? `${active} run${active > 1 ? "s" : ""} in progress` : model?.tagline}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {runs.length > 0 && (
          <button
            type="button"
            onClick={clearRuns}
            className="rounded-chip px-2.5 py-1.5 text-[12px] text-t4 transition-colors duration-[120ms] hover:bg-t1/[0.055] hover:text-t1"
          >
            Clear gallery
          </button>
        )}
        <button
          type="button"
          onClick={onKeyClick}
          className="flex items-center gap-2 rounded-full bg-t1/[0.055] px-3 py-1.5 text-[12px] text-t2 transition-all duration-[120ms] hover:bg-t1/[0.1] hover:text-t1"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: apiKey ? "#65f223" : "#62a2ff" }}
          />
          {apiKey ? (
            credits !== null ? (
              <>
                <span className="font-mono tabular-nums">{credits.toLocaleString()}</span> credits
              </>
            ) : (
              "Connected"
            )
          ) : (
            "Add API key"
          )}
        </button>
      </div>
    </header>
  );
}

export function Shell() {
  const [keyOpen, setKeyOpen] = useState(false);
  const apiKey = useStudio((s) => s.apiKey);
  const hydrated = useStudio((s) => s.hydrated);

  // ⌘K is the shortcut people already reach for in this kind of studio.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        useStudio.getState().togglePicker(true, "all");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen pl-14">
      <Rail onKeyClick={() => setKeyOpen(true)} />

      <main className="mx-auto max-w-[1600px] px-6 pb-[300px]">
        <TopBar onKeyClick={() => setKeyOpen(true)} />
        {hydrated && !apiKey && (
          <button
            type="button"
            onClick={() => setKeyOpen(true)}
            className="anim-swap mb-6 flex w-full items-center gap-3 rounded-card border border-line bg-t1/[0.028] px-4 py-3 text-left transition-colors duration-[200ms] hover:bg-t1/[0.055]"
          >
            <Icon name="key" size={16} className="shrink-0" style={{ color: "#62a2ff" }} />
            <span className="min-w-0 flex-1 text-[12.5px] text-t2">
              Add your KIE API key to start generating. It stays in this browser.
            </span>
            <span className="shrink-0 text-[12px] text-t1">Add key</span>
          </button>
        )}
        <Gallery />
      </main>

      <PromptBar />
      <SettingsPanel />
      <ModelPicker />
      <RunPoller />
      <ThemeSync />
      <ApiKeyDialog open={keyOpen} onClose={() => setKeyOpen(false)} />
    </div>
  );
}
