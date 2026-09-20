"use client";

import { useEffect, useState } from "react";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { Icon, type IconName } from "@/components/Icon";
import { ZynsWordmark } from "@/components/Logo";
import { AssetsPage } from "@/components/AssetsPage";
import { CategoryPage } from "@/components/CategoryPage";
import { HomePage } from "@/components/HomePage";
import { ModelPicker } from "@/components/ModelPicker";
import { PillGroup } from "@/components/PillGroup";
import { PromptBar } from "@/components/PromptBar";
import { RunPoller } from "@/components/RunPoller";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ThemeSync } from "@/components/ThemeSync";
import { CATEGORIES, type Category } from "@/lib/registry";
import { useModel, useStudio, type Page } from "@/store/studio";

const CATEGORY_ICON: Record<Category, IconName> = {
  image: "image",
  video: "video",
  audio: "audio",
  tool: "tool",
};

const NAV: { id: Page; label: string }[] = [
  ...CATEGORIES.map((c) => ({ id: c.id as Page, label: c.label })),
  { id: "assets" as Page, label: "Assets" },
];

function TopBar({ onKeyClick }: { onKeyClick: () => void }) {
  const credits = useStudio((s) => s.credits);
  const apiKey = useStudio((s) => s.apiKey);
  const runs = useStudio((s) => s.runs);
  const clearRuns = useStudio((s) => s.clearRuns);
  const clearDemo = useStudio((s) => s.clearDemo);
  const page = useStudio((s) => s.page);
  const setPage = useStudio((s) => s.setPage);
  const theme = useStudio((s) => s.theme);
  const setTheme = useStudio((s) => s.setTheme);

  const active = runs.filter((r) => r.state === "pending" || r.state === "running").length;
  const demo = runs.some((r) => r.id.startsWith("demo-"));

  return (
    // Full-bleed bar: the band and its border run edge to edge while the
    // contents sit on the same 1600px column as the page below it. Negative
    // margins could only ever cancel main's padding, so past 1600px the bar
    // stopped short of the window on both sides.
    <header className="sticky top-0 z-30 mb-4 border-b border-line bg-canvas/80 backdrop-blur-2xl md:mb-6">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 py-3 md:gap-7 md:px-6">
        <button
          type="button"
          onClick={() => setPage("home")}
          aria-label="ZYNS — home"
          className="shrink-0 text-t1 transition-opacity duration-[150ms] hover:opacity-70"
        >
          {/* Wordmark only up here; the tile belongs to the icon and the tab. */}
          <ZynsWordmark height={19} className="relative top-[3px]" />
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={`rounded-full px-3 py-1.5 text-[13px] transition-colors duration-[150ms] ${
                page === item.id ? "text-t1" : "text-t3 hover:text-t1"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {demo && (
            <button
              type="button"
              onClick={clearDemo}
              className="hidden items-center gap-1.5 rounded-full bg-t1/[0.07] px-3 py-1.5 text-[11.5px] text-t3 transition-colors duration-[150ms] hover:text-t1 sm:flex"
            >
              Sample media
              <Icon name="close" size={11} />
            </button>
          )}
          {!demo && runs.length > 0 && page !== "home" && (
            <button
              type="button"
              onClick={clearRuns}
              className="hidden rounded-full px-3 py-1.5 text-[11.5px] text-t4 transition-colors duration-[150ms] hover:text-t1 sm:block"
            >
              Clear gallery
            </button>
          )}
          {active > 0 && (
            <span className="hidden items-center gap-1.5 rounded-full bg-t1/[0.07] px-3 py-1.5 text-[11.5px] text-t3 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
              {active} running
            </span>
          )}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
            className="grid h-9 w-9 place-items-center rounded-full text-t3 transition-colors duration-[150ms] hover:bg-t1/[0.07] hover:text-t1"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
          </button>
          <button
            type="button"
            onClick={onKeyClick}
            className="flex items-center gap-2 rounded-full bg-t1/[0.07] px-3.5 py-2 text-[12.5px] text-t2 transition-colors duration-[150ms] hover:bg-t1/[0.12] hover:text-t1"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: apiKey ? "var(--accent)" : "var(--t4)" }}
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
      </div>
    </header>
  );
}

/** The header's nav, for a phone that has no room for it in the bar. */
function PageTabs() {
  const page = useStudio((s) => s.page);
  const setPage = useStudio((s) => s.setPage);
  if (page === "home") return null;
  return (
    <div className="mb-4 md:hidden">
      <PillGroup value={page} onChange={(next) => setPage(next as Page)} items={NAV} />
    </div>
  );
}

export function Shell() {
  const [keyOpen, setKeyOpen] = useState(false);
  const apiKey = useStudio((s) => s.apiKey);
  const hydrated = useStudio((s) => s.hydrated);
  const page = useStudio((s) => s.page);

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

  // Assets and home are for browsing, so the prompt bar steps aside and the
  // page keeps its own bottom margin instead of reserving room for it.
  const composing = page !== "assets" && page !== "home";

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar onKeyClick={() => setKeyOpen(true)} />
      <main
        className={`mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 md:px-6 ${
          composing ? "below-bar" : "pb-10"
        }`}
      >
        {hydrated && !apiKey && page !== "home" && (
          <button
            type="button"
            onClick={() => setKeyOpen(true)}
            className="anim-swap mb-4 flex w-full items-center gap-3 rounded-card border border-line bg-t1/[0.028] px-4 py-3 text-left transition-colors duration-[200ms] hover:bg-t1/[0.055] md:mb-6"
          >
            <Icon name="key" size={16} className="shrink-0" style={{ color: "var(--accent)" }} />
            <span className="min-w-0 flex-1 text-[12.5px] text-t2">
              Add your KIE API key to start generating. It stays in this browser.
            </span>
            <span className="cta shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium">Add key</span>
          </button>
        )}
        <PageTabs />
        {page === "home" ? (
          <HomePage />
        ) : page === "assets" ? (
          <AssetsPage />
        ) : (
          <CategoryPage category={page} />
        )}
      </main>

      {composing && <PromptBar />}
      <SettingsPanel />
      <ModelPicker />
      <RunPoller />
      <ThemeSync />
      <ApiKeyDialog open={keyOpen} onClose={() => setKeyOpen(false)} />
    </div>
  );
}
