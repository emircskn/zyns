"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
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
import { AccountMenu, CreditsPill, TopBar } from "@/components/TopBar";
import { ThemeSync } from "@/components/ThemeSync";
import { SIDE_PAGES } from "@/lib/layout";
import { openPickerHere, useStudio, type Page } from "@/store/studio";
import { ProviderSwitch } from "@/components/ProviderSwitch";

/**
 * A phone's version of the top bar: the mark, the service, and at the right
 * the credits and the account, as on a desktop. The pages are on the bottom
 * row instead.
 */
function PhoneBar({ onKeyClick }: { onKeyClick: () => void }) {
  const setPage = useStudio((s) => s.setPage);

  return (
    <header className="relative z-30 flex items-center justify-between gap-2 px-4 py-3 md:hidden">
      <button
        type="button"
        onClick={() => setPage("home")}
        aria-label="ZYNS home"
        className="shrink-0 transition-opacity duration-[150ms] hover:opacity-70"
      >
        <ZynsMark size={32} />
      </button>
      {/* The service to make with, in reach on every phone page. */}
      <ProviderSwitch size="xs" />
      <div className="flex shrink-0 items-center gap-1.5">
        <CreditsPill onKeyClick={onKeyClick} compact />
        <AccountMenu onKeyClick={onKeyClick} />
      </div>
    </header>
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
    <div className="flex min-h-dvh flex-col">
      {/* The surface the whole studio stands on, under everything. */}
      <Backdrop />
      <TopBar onKeyClick={() => setKeyOpen(true)} />
      <PhoneBar onKeyClick={() => setKeyOpen(true)} />
      <main
        // A page that makes things, and the library pages, are a wall of
        // media edge to edge; each pads its own toolbar and empty state.
        className={`relative z-10 mx-auto flex w-full flex-1 flex-col ${
          composing || browsing ? "" : "max-w-[1600px] px-4 md:px-6 md:pt-5"
        } ${
          composing ? `below-bar ${SIDE_PAGES.has(page) ? "md:pb-6!" : ""}` : browsing ? "below-card" : "below-nav"
        }`}
      >
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
              <CategoryPage key={shown} category={shown} onKeyClick={() => setKeyOpen(true)} />
            )
          }
        </PageSwap>
      </main>

      {composing && <PromptBar desktop={!SIDE_PAGES.has(page)} />}
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
