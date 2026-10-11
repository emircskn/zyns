"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/Icon";
import { ZynsMark } from "@/components/Logo";
import { ProviderSwitch } from "@/components/ProviderSwitch";
import { CreditsPill } from "@/components/TopBar";
import { smallScreen } from "@/components/ViewportSync";
import { categoriesFor } from "@/lib/registry";
import { usePresence } from "@/lib/usePresence";
import { activeKey, useStudio, type Page } from "@/store/studio";

/** What a page is called in the phone's header. */
const TITLES: Partial<Record<Page, string>> = {
  home: "Explore",
  image: "Image",
  video: "Video",
  audio: "Audio",
  tool: "Tools",
  remix: "Genjutsu",
  studio: "Cinema Studio",
  marketing: "Marketing Studio",
  assets: "Assets",
  favorites: "Favorites",
  elements: "Elements",
};

const ICONS: Partial<Record<Page, IconName>> = {
  image: "image",
  video: "video",
  audio: "audio",
  tool: "tool",
};

function Row({
  icon,
  label,
  on,
  onClick,
  trailing,
}: {
  icon: IconName;
  label: string;
  on?: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={on ? "page" : undefined}
      className={`flex h-11 w-full items-center gap-3 rounded-[8px] px-3 text-left text-[15px] transition-colors duration-[100ms] ${
        on ? "bg-t1/[0.08] font-medium text-t1" : "text-t2 hover:bg-t1/[0.05] hover:text-t1"
      }`}
    >
      <Icon name={icon} size={19} className={on ? "text-t1" : "text-t3"} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}

/**
 * The phone's menu, opened from the header's top-left button: Create first
 * and lit, then every page with its icon, the service to make with, and the
 * account's settings at the foot. It slides in from the left and out the
 * same way; a tap outside or Escape closes it.
 */
function SidePanel({ open, onClose, onKeyClick }: { open: boolean; onClose: () => void; onKeyClick: () => void }) {
  const { mounted, exiting } = usePresence(open, 200);
  const page = useStudio((s) => s.page);
  const setPage = useStudio((s) => s.setPage);
  const setCreateOpen = useStudio((s) => s.setCreateOpen);
  const provider = useStudio((s) => s.provider);
  const theme = useStudio((s) => s.theme);
  const setTheme = useStudio((s) => s.setTheme);
  const desktopView = useStudio((s) => s.desktopView);
  const setDesktopView = useStudio((s) => s.setDesktopView);
  const apiKey = useStudio(activeKey);
  const hydrated = useStudio((s) => s.hydrated);
  const runs = useStudio((s) => s.runs);
  const loadDemo = useStudio((s) => s.loadDemo);
  const clearDemo = useStudio((s) => s.clearDemo);
  const demo = runs.some((r) => r.id.startsWith("demo-"));

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // The page under the panel stays where it was.
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = before;
    };
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  const go = (to: Page) => () => {
    setPage(to);
    onClose();
  };
  const make: Array<{ id: Page; label: string; icon: IconName }> = [
    ...categoriesFor(provider).map((c) => ({ id: c.id as Page, label: c.label, icon: ICONS[c.id as Page] ?? "spark" })),
    { id: "remix", label: "Genjutsu", icon: "wand" },
    { id: "studio", label: "Cinema Studio", icon: "film" },
    { id: "marketing", label: "Marketing Studio", icon: "box" },
  ];
  const keep: Array<{ id: Page; label: string; icon: IconName }> = [
    { id: "assets", label: "Assets", icon: "folder" },
    { id: "favorites", label: "Favorites", icon: "heart" },
    { id: "elements", label: "Elements", icon: "at" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/70 ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <nav
        className={`absolute inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col border-r border-line bg-elevated pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] ${
          exiting ? "drawer-out" : "drawer-in"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="flex items-center justify-between px-4 pb-3">
          <button type="button" onClick={go("home")} className="flex items-center gap-2.5" aria-label="ZYNS home">
            <ZynsMark size={28} />
            <span className="font-display text-[18px] font-semibold tracking-[-0.02em] text-t1">ZYNS</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-[8px] text-t3 hover:bg-t1/[0.06] hover:text-t1"
          >
            <Icon name="sidebar" size={20} />
          </button>
        </div>

        <div className="no-bar flex-1 overflow-y-auto px-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              setCreateOpen(true);
            }}
            className="cta mb-2 flex h-11 w-full items-center gap-3 rounded-[8px] px-3 text-left text-[15px]"
          >
            <Icon name="plus" size={19} strokeWidth={2.2} />
            Create
          </button>
          <Row icon="home" label="Explore" on={page === "home"} onClick={go("home")} />
          {make.map((item) => (
            <Row key={item.id} icon={item.icon} label={item.label} on={page === item.id} onClick={go(item.id)} />
          ))}
          <div className="mx-3 my-2 h-px bg-line" />
          {keep.map((item) => (
            <Row key={item.id} icon={item.icon} label={item.label} on={page === item.id} onClick={go(item.id)} />
          ))}

          <p className="px-3 pb-2 pt-5 font-mono text-[11px] uppercase tracking-[0.08em] text-t4">Service</p>
          <div className="px-1">
            <ProviderSwitch size="lg" />
          </div>
        </div>

        <div className="mt-2 border-t border-line px-3 pt-2">
          <Row
            icon="key"
            label={apiKey ? "Change API key" : "Add API key"}
            onClick={() => {
              onClose();
              onKeyClick();
            }}
            trailing={<span className={`h-2 w-2 rounded-full ${apiKey ? "bg-accent" : "bg-t4"}`} />}
          />
          <Row icon={theme === "dark" ? "sun" : "moon"} label={theme === "dark" ? "Light theme" : "Dark theme"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} />
          {(desktopView || smallScreen()) && (
            <Row
              icon="monitor"
              label="Desktop view"
              onClick={() => setDesktopView(!desktopView)}
              trailing={desktopView ? <Icon name="check" size={16} className="text-t1" /> : undefined}
            />
          )}
          {hydrated && !apiKey && (
            <Row
              icon="palette"
              label="Sample media"
              onClick={demo ? clearDemo : loadDemo}
              trailing={demo ? <Icon name="check" size={16} className="text-t1" /> : undefined}
            />
          )}
        </div>
      </nav>
    </div>,
    document.body,
  );
}

/**
 * A phone's top edge, as Higgsfield's: the menu button on the left, the
 * page's name in the middle, what the key has left on the right. There is
 * no row of tabs at the bottom any more; the menu holds every page.
 */
export function PhoneHeader({ onKeyClick }: { onKeyClick: () => void }) {
  const page = useStudio((s) => s.page);
  const [open, setOpen] = useState(false);
  const close = useRef(() => setOpen(false)).current;
  return (
    <>
      <header className="sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-canvas/90 px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-xl md:hidden">
        <div className="flex">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-[8px] text-t2 transition-colors duration-[100ms] hover:bg-t1/[0.06] hover:text-t1"
          >
            <Icon name="sidebar" size={22} />
          </button>
        </div>
        <h1 className="truncate text-center font-display text-[17px] font-semibold tracking-[-0.01em] text-t1">{TITLES[page] ?? "ZYNS"}</h1>
        <div className="flex justify-end">
          <CreditsPill onKeyClick={onKeyClick} compact />
        </div>
      </header>
      <SidePanel open={open} onClose={close} onKeyClick={onKeyClick} />
    </>
  );
}
