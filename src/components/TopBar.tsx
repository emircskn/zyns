"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { ZynsMark } from "@/components/Logo";
import { ProviderSwitch } from "@/components/ProviderSwitch";
import { smallScreen } from "@/components/ViewportSync";
import { refreshCredits } from "@/lib/generate";
import { categoriesFor, type Provider } from "@/lib/registry";
import { GLIDE_TRANSITION, useGlide } from "@/lib/useGlide";
import { usePresence } from "@/lib/usePresence";
import { activeKey, useStudio, type Page } from "@/store/studio";

/** Every page by name, left to right: the ones that make, then the ones that keep. */
function pagesFor(provider: Provider): { id: Page; label: string }[][] {
  return [
    // Home is the mark at the far left, so it is not a pill of its own.
    [
      ...categoriesFor(provider).map((c) => ({ id: c.id as Page, label: c.label })),
      // Genjutsu's own page: a clip remade with your characters, objects or a style.
      { id: "remix", label: "Genjutsu" },
      // Cinema Studio's own page: a shot directed with real camera, film and light settings.
      { id: "studio", label: "Cinema Studio" },
      // Marketing Studio's own page: product shots, ads and listings, and video made from them.
      { id: "marketing", label: "Marketing" },
    ],
    [
      { id: "assets", label: "Assets" },
      { id: "favorites", label: "Favorites" },
      { id: "elements", label: "Elements" },
    ],
  ];
}

/** The pages in a line, with one soft pill that glides to the one you are on. */
function PageNav() {
  const page = useStudio((s) => s.page);
  const setPage = useStudio((s) => s.setPage);
  const provider = useStudio((s) => s.provider);
  const root = useRef<HTMLElement>(null);
  const groups = pagesFor(provider);
  const { box, settled } = useGlide(root, page, [provider]);

  return (
    // A narrow window scrolls the line sideways rather than running it under the account.
    <nav ref={root} aria-label="Pages" className="no-bar relative flex min-w-0 items-center gap-0.5 overflow-x-auto">
      {box && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-[8px] bg-t1/[0.08]"
          style={{
            width: box.w,
            height: box.h,
            transform: `translate(${box.x}px, ${box.y}px)`,
            transition: settled ? GLIDE_TRANSITION : "none",
          }}
        />
      )}
      {groups.map((group, index) => (
        <div key={index} className="flex shrink-0 items-center gap-0.5">
          {index > 0 && <span aria-hidden className="mx-2 h-4 w-px bg-line" />}
          {group.map((item) => {
            const on = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-pill={item.id}
                onClick={() => setPage(item.id)}
                aria-current={on ? "page" : undefined}
                className={`relative h-8 whitespace-nowrap rounded-[8px] px-3 text-[13.5px] transition-colors duration-[100ms] ${
                  on ? "font-medium text-t1" : "text-t3 hover:text-t1"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/**
 * What the key has left to spend, just left of the account. KIE reports a
 * balance; Higgsfield keeps its own in Console and prices each run in the
 * prompt bar instead, so there the pill is the way to that balance.
 */
export function CreditsPill({ onKeyClick, compact }: { onKeyClick: () => void; compact?: boolean }) {
  const provider = useStudio((s) => s.provider);
  const credits = useStudio((s) => s.credits);
  const apiKey = useStudio(activeKey);
  const hydrated = useStudio((s) => s.hydrated);
  const [checking, setChecking] = useState(false);

  const pill =
    "flex h-9 items-center gap-1.5 rounded-[8px] bg-t1/[0.04] px-3 text-[13px] text-t2 ring-1 ring-inset ring-line transition-colors duration-[100ms] hover:bg-t1/[0.08] hover:text-t1";

  if (!hydrated) return null;

  if (!apiKey) {
    return (
      <button
        type="button"
        onClick={onKeyClick}
        className="cta flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[13px]"
        title="Add an API key to start making"
      >
        <Icon name="key" size={15} />
        {compact ? "Add key" : "Add API key"}
      </button>
    );
  }

  if (provider === "higgsfield") {
    return (
      <a
        href="https://console.higgsfield.ai"
        target="_blank"
        rel="noreferrer"
        className={pill}
        title="Higgsfield keeps its balance in Console; each run's price shows in the prompt bar before you send it"
      >
        <Icon name="coin" size={16} />
        Balance
        <span aria-hidden className="text-t4">
          ↗
        </span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        setChecking(true);
        await refreshCredits();
        setChecking(false);
      }}
      className={pill}
      title="KIE credits left on this key (click to check again)"
      aria-label={credits !== null ? `${credits.toLocaleString()} credits, check again` : "Check credits"}
    >
      <Icon name="coin" size={16} className={checking ? "animate-spin" : undefined} />
      <span className="font-mono tabular-nums text-t1">{credits !== null ? credits.toLocaleString() : "—"}</span>
      {!compact && <span className="hidden text-t3 lg:inline">credits</span>}
    </button>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  pressed,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      aria-pressed={pressed}
      className="flex w-full items-center gap-3 rounded-card px-3 py-2 text-left text-[13px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.06] hover:text-t1"
    >
      <Icon name={icon} size={17} />
      <span className="flex-1">{label}</span>
      {pressed && <Icon name="check" size={15} />}
    </button>
  );
}

/**
 * The account, at the far right: a round badge with a dot for whether the
 * service in use has a key, and a menu holding the key and the two switches
 * that belong to the browser rather than to any page.
 */
export function AccountMenu({
  onKeyClick,
  tab,
}: {
  onKeyClick: () => void;
  /** A phone's: a tab of the bottom row, whose menu opens upward. */
  tab?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { mounted, exiting } = usePresence(open, 160);
  const root = useRef<HTMLDivElement>(null);
  const provider = useStudio((s) => s.provider);
  const apiKey = useStudio(activeKey);
  const desktopView = useStudio((s) => s.desktopView);
  const setDesktopView = useStudio((s) => s.setDesktopView);
  const runs = useStudio((s) => s.runs);
  const loadDemo = useStudio((s) => s.loadDemo);
  const clearDemo = useStudio((s) => s.clearDemo);
  const hydrated = useStudio((s) => s.hydrated);
  const demo = runs.some((r) => r.id.startsWith("demo-"));
  const service = provider === "higgsfield" ? "Higgsfield" : "KIE AI";

  useEffect(() => {
    if (!open) return;
    function onDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const act = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={root} className={tab ? "relative flex flex-1" : "relative"}>
      {tab ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Account"
          aria-haspopup="menu"
          aria-expanded={open}
          className={`flex h-[52px] flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-[150ms] ${
            open ? "font-medium text-t1" : "text-t4"
          }`}
        >
          <span className="relative">
            <Icon name="user" size={23} />
            {/* Lit while a key is connected, as the key tab's dot was. */}
            <span
              className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full ring-2"
              style={{
                background: apiKey ? "var(--accent)" : "var(--t4)",
                ["--tw-ring-color" as string]: "var(--elevated)",
              }}
            />
          </span>
          Account
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Account"
          aria-haspopup="menu"
          aria-expanded={open}
          className={`relative grid h-9 w-9 place-items-center rounded-full text-t1 transition-[background-color,transform] duration-[150ms] active:scale-[0.94] ${
            open ? "bg-t1/[0.14]" : "bg-t1/[0.08] hover:bg-t1/[0.12]"
          }`}
        >
          <Icon name="user" size={18} />
          <span
            className="absolute right-[1px] top-[1px] h-2 w-2 rounded-full ring-2"
            style={{
              background: apiKey ? "var(--t1)" : "var(--t4)",
              ["--tw-ring-color" as string]: "var(--canvas)",
            }}
          />
        </button>
      )}

      {mounted && (
        <div
          role="menu"
          className={`absolute right-0 z-[70] w-[248px] rounded-panel border border-line bg-elevated p-1.5 ${
            tab ? "bottom-[calc(100%+10px)] origin-bottom-right" : "top-[calc(100%+8px)] origin-top-right"
          } ${
            exiting ? "anim-pop-out" : "anim-pop"
          }`}
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <div className="flex items-center gap-3 px-3 pb-2.5 pt-2">
            <ZynsMark size={30} />
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-t1">{service}</p>
              <p className="truncate text-[12px] text-t3">{apiKey ? "Key connected" : "No API key yet"}</p>
            </div>
          </div>
          <div className="mx-1.5 mb-1 h-px bg-line" />
          <MenuRow icon="key" label={apiKey ? "Change API key" : "Add API key"} onClick={act(onKeyClick)} />
          {/* A phone can be shown the desktop's layout, and back; a desktop has no use for it. */}
          {(desktopView || smallScreen()) && (
            <MenuRow icon="monitor" label="Desktop view" pressed={desktopView} onClick={act(() => setDesktopView(!desktopView))} />
          )}
          {/* The studio full of sample media before there is a key, and the way back out. */}
          {hydrated && !apiKey && (
            <MenuRow icon="palette" label="Sample media" pressed={demo} onClick={act(demo ? clearDemo : loadDemo)} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The desktop's top edge: the mark on the left, the pages running right from
 * it, and at the far end the account with what the key has left beside it.
 * A phone has its own strip and a bottom row, so this is hidden there.
 */
export function TopBar({ onKeyClick }: { onKeyClick: () => void }) {
  const setPage = useStudio((s) => s.setPage);
  const active = useStudio(
    (s) => s.runs.filter((r) => r.state === "pending" || r.state === "running").length,
  );

  return (
    <header className="sticky top-0 z-40 hidden h-[60px] shrink-0 items-center gap-4 border-b border-line bg-canvas/85 px-5 backdrop-blur-xl md:flex">
      <button
        type="button"
        onClick={() => setPage("home")}
        aria-label="ZYNS home"
        title="Home"
        className="shrink-0 transition-opacity duration-[150ms] hover:opacity-70"
      >
        <ZynsMark size={32} />
      </button>

      <PageNav />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {active > 0 && (
          <span className="mr-1 flex items-center gap-2 text-[12.5px] text-t3">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-t1" />
            {active} running
          </span>
        )}
        <ProviderSwitch />
        <CreditsPill onKeyClick={onKeyClick} />
        <AccountMenu onKeyClick={onKeyClick} />
      </div>
    </header>
  );
}
