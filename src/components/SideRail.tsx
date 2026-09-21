"use client";

import { Icon, type IconName } from "@/components/Icon";
import { ZynsMark } from "@/components/Logo";
import { CATEGORIES, type Category } from "@/lib/registry";
import { useStudio, type Page } from "@/store/studio";

const CATEGORY_ICON: Record<Category, IconName> = {
  image: "image",
  video: "video",
  audio: "audio",
  tool: "tool",
};

const NAV: { id: Page; label: string; icon: IconName }[] = [
  ...CATEGORIES.map((c) => ({ id: c.id as Page, label: c.label, icon: CATEGORY_ICON[c.id] })),
  { id: "assets" as Page, label: "Assets", icon: "folder" },
  { id: "favorites" as Page, label: "Favorites", icon: "heart" },
];

function RailButton({
  label,
  icon,
  on,
  onClick,
  title,
  badge,
}: {
  label: string;
  icon: IconName;
  on?: boolean;
  onClick: () => void;
  title?: string;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-current={on ? "page" : undefined}
      className={`group flex w-14 flex-col items-center gap-1 rounded-card px-1 py-2 text-[9.5px] leading-none transition-colors duration-[150ms] ${
        on ? "bg-t1/[0.1] text-t1" : "text-t3 hover:bg-t1/[0.05] hover:text-t1"
      }`}
    >
      <span className="relative">
        {/* The folder bumps: on hover, and once as it becomes the page you
            are on, which is the only cue a touch screen gets. Keyed so that
            second one starts over rather than sitting finished. */}
        <Icon
          key={icon === "folder" && on ? "bumped" : "still"}
          name={icon}
          size={19}
          fill={on && icon === "heart" ? "currentColor" : "none"}
          className={
            icon === "folder" ? `icon-bump${on ? " icon-bump--now" : ""}` : undefined
          }
        />
        {badge !== undefined && (
          <span
            className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full ring-2"
            style={{
              background: badge ? "var(--t1)" : "var(--t4)",
              ["--tw-ring-color" as string]: "var(--canvas)",
            }}
          />
        )}
      </span>
      {label}
    </button>
  );
}

/**
 * The desktop's left edge: the mark, the pages, and at the foot of it what
 * belongs to the browser rather than to any page — the sample media, the
 * theme and the API key. A phone gets the bottom row instead, so this is
 * hidden there; everything else clears it through --rail-w.
 */
export function SideRail({ onKeyClick }: { onKeyClick: () => void }) {
  const page = useStudio((s) => s.page);
  const setPage = useStudio((s) => s.setPage);
  const theme = useStudio((s) => s.theme);
  const setTheme = useStudio((s) => s.setTheme);
  const apiKey = useStudio((s) => s.apiKey);
  const credits = useStudio((s) => s.credits);
  const runs = useStudio((s) => s.runs);
  const loadDemo = useStudio((s) => s.loadDemo);
  const clearDemo = useStudio((s) => s.clearDemo);

  const active = runs.filter((r) => r.state === "pending" || r.state === "running").length;
  const demo = runs.some((r) => r.id.startsWith("demo-"));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--rail-w)] flex-col items-center border-r border-line bg-canvas py-3 md:flex">
      <button
        type="button"
        onClick={() => setPage("home")}
        aria-label="ZYNS home"
        title="Home"
        className="mb-2 grid h-10 w-10 place-items-center rounded-card transition-opacity duration-[150ms] hover:opacity-70"
      >
        <ZynsMark size={26} />
      </button>

      <nav className="flex w-full flex-col items-center gap-0.5">
        {NAV.map((item) => (
          <RailButton
            key={item.id}
            label={item.label}
            icon={item.icon}
            on={page === item.id}
            onClick={() => setPage(item.id)}
          />
        ))}
      </nav>

      <div className="mt-auto flex w-full flex-col items-center gap-0.5 pt-3">
        {active > 0 && (
          <span
            title={`${active} running`}
            className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-t1/[0.07] font-mono text-[10px] tabular-nums text-t2"
          >
            {active}
          </span>
        )}
        {/* Somewhere to see the studio full before there is an API key, and
            the way back out of it. */}
        <RailButton
          label="Samples"
          icon="palette"
          on={demo}
          title={demo ? "Take the sample media back out" : "Fill the studio with sample media"}
          onClick={demo ? clearDemo : loadDemo}
        />
        <RailButton
          label={theme === "dark" ? "Light" : "Dark"}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          icon={theme === "dark" ? "sun" : "moon"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <RailButton
          label="API key"
          icon="key"
          badge={!!apiKey}
          title={
            apiKey
              ? credits !== null
                ? `Connected · ${credits.toLocaleString()} credits`
                : "Connected"
              : "Add your API key"
          }
          onClick={onKeyClick}
        />
      </div>
    </aside>
  );
}
