"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { Icon } from "@/components/Icon";
import { ZynsMark } from "@/components/Logo";
import { AssetsPage } from "@/components/AssetsPage";
import { Backdrop } from "@/components/Backdrop";
import { FavoritesPage } from "@/components/FavoritesPage";
import { CategoryPage } from "@/components/CategoryPage";
import { CreateSheet } from "@/components/CreateSheet";
import { HomePage } from "@/components/HomePage";
import { MobileNav } from "@/components/MobileNav";
import { ModelPicker } from "@/components/ModelPicker";
import { PhoneComposer } from "@/components/PhoneComposer";
import { PromptBar, PromptCard } from "@/components/PromptBar";
import { RunPoller } from "@/components/RunPoller";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SideRail } from "@/components/SideRail";
import { ThemeSync } from "@/components/ThemeSync";
import { openPickerHere, useStudio, type Page } from "@/store/studio";

/**
 * A phone has no rail, so the mark and the theme sit in a thin strip at the
 * top; the pages and the key are on the bottom row.
 */
function PhoneBar() {
  const setPage = useStudio((s) => s.setPage);
  const theme = useStudio((s) => s.theme);
  const setTheme = useStudio((s) => s.setTheme);
  const runs = useStudio((s) => s.runs);
  const loadDemo = useStudio((s) => s.loadDemo);
  const clearDemo = useStudio((s) => s.clearDemo);

  const demo = runs.some((r) => r.id.startsWith("demo-"));

  return (
    <header className="relative z-10 flex items-center justify-between px-4 py-3 md:hidden">
      {/* The badge, not the name: a phone bar is too short a line to spell
          anything out on, and the mark carries further at this size. */}
      <button
        type="button"
        onClick={() => setPage("home")}
        aria-label="ZYNS home"
        className="transition-opacity duration-[150ms] hover:opacity-70"
      >
        <ZynsMark size={32} />
      </button>
      <div className="flex items-center gap-1">
        {/* The rail's samples button, for a phone that has no rail. */}
        <button
          type="button"
          onClick={demo ? clearDemo : loadDemo}
          aria-label={demo ? "Take the sample media back out" : "Fill the studio with sample media"}
          aria-pressed={demo}
          className={`grid h-9 w-9 place-items-center rounded-full transition-colors duration-[150ms] ${
            demo ? "bg-t1/[0.1] text-t1" : "text-t3 hover:bg-t1/[0.07] hover:text-t1"
          }`}
        >
          <Icon name="palette" size={16} />
        </button>
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
          className="grid h-9 w-9 place-items-center rounded-full text-t3 transition-colors duration-[150ms] hover:bg-t1/[0.07] hover:text-t1"
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
        </button>
      </div>
    </header>
  );
}

/**
 * Clearing the gallery: about the page rather than about the studio, so it
 * sits above the page instead of above the app, and says nothing when there
 * is nothing to clear. Sample media has its own button in the rail.
 */
function TopStrip() {
  const runs = useStudio((s) => s.runs);
  const clearRuns = useStudio((s) => s.clearRuns);
  const page = useStudio((s) => s.page);

  const demo = runs.some((r) => r.id.startsWith("demo-"));
  if (demo || runs.length === 0 || page === "home") return null;

  return (
    <div className="mb-2 flex justify-end">
      <button
        type="button"
        onClick={clearRuns}
        className="rounded-full px-3 py-1.5 text-[11.5px] text-t4 transition-colors duration-[150ms] hover:text-t1"
      >
        Clear gallery
      </button>
    </div>
  );
}

/**
 * Holds the page on screen while the next one is asked for, so one leaves
 * upward and the other rises into its place. Without it the headline of an
 * empty state was simply different on the next frame.
 */
function PageSwap({ page, children }: { page: Page; children: (page: Page) => ReactNode }) {
  const [shown, setShown] = useState(page);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (page === shown) return;
    setLeaving(true);
    const timer = window.setTimeout(() => {
      setShown(page);
      setLeaving(false);
    }, 170);
    return () => window.clearTimeout(timer);
  }, [page, shown]);

  return (
    <div
      // Keyed by what is on screen, not by what was asked for: a new
      // element cannot transition out of a state it never had.
      key={shown}
      className={`page-swap flex flex-1 flex-col ${leaving ? "is-leaving" : "is-entering"}`}
    >
      {children(shown)}
    </div>
  );
}

export function Shell() {
  const [keyOpen, setKeyOpen] = useState(false);
  const createOpen = useStudio((s) => s.createOpen);
  const setCreateOpen = useStudio((s) => s.setCreateOpen);
  const page = useStudio((s) => s.page);

  // ⌘K is the shortcut people already reach for in this kind of studio.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        openPickerHere();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Home carries the box in the middle of itself and the browsing pages have
  // none at all; only a page that makes things docks one at the bottom.
  const composing = page !== "assets" && page !== "favorites" && page !== "home";
  // A phone keeps its prompt card on the library pages too, so the prompt it
  // was writing does not vanish the moment it goes to look at something. The
  // desktop bar has no business there; the card is phone-only already.
  const browsing = page === "assets" || page === "favorites";

  return (
    <div className="flex min-h-dvh flex-col md:pl-[var(--rail-w)]">
      {/* The surface the whole studio stands on, under everything. */}
      <Backdrop />
      <SideRail onKeyClick={() => setKeyOpen(true)} />
      <PhoneBar />
      <main
        className={`relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 md:px-6 md:pt-5 ${
          composing ? "below-bar" : browsing ? "below-card" : "below-nav"
        }`}
      >
        <TopStrip />
        <PageSwap page={page}>
          {(shown) =>
            shown === "home" ? (
              <HomePage onKeyClick={() => setKeyOpen(true)} />
            ) : shown === "assets" ? (
              <AssetsPage />
            ) : shown === "favorites" ? (
              <FavoritesPage />
            ) : (
              // Keyed by page: without it React reuses this element between
              // categories and the empty state's reveal never runs again.
              <CategoryPage key={shown} category={shown} />
            )
          }
        </PageSwap>
      </main>

      {composing && <PromptBar />}
      {browsing && <PromptCard placement="docked" />}
      <MobileNav onCreate={() => setCreateOpen(true)} onKey={() => setKeyOpen(true)} />
      <PhoneComposer onKey={() => setKeyOpen(true)} />
      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
      <SettingsPanel />
      <ModelPicker />
      <RunPoller />
      <ThemeSync />
      <ApiKeyDialog open={keyOpen} onClose={() => setKeyOpen(false)} />
    </div>
  );
}
