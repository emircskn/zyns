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

/** The pages that make something, and the pages that hold what was made. */
const MAKE: { id: Page; label: string; icon: IconName }[] = CATEGORIES.map((c) => ({
  id: c.id as Page,
  label: c.label,
  icon: CATEGORY_ICON[c.id],
}));

const KEEP: { id: Page; label: string; icon: IconName }[] = [
  { id: "assets" as Page, label: "Assets", icon: "folder" },
  { id: "favorites" as Page, label: "Favorites", icon: "heart" },
];

function NavRow({
  label,
  icon,
  on,
  onClick,
  title,
  filled,
  toggle,
}: {
  label: string;
  icon: IconName;
  on?: boolean;
  onClick: () => void;
  title?: string;
  /** The heart reads as kept when the page is the one you are on. */
  filled?: boolean;
  /** A switch rather than a page: says so as pressed, not as current. */
  toggle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-current={on && !toggle ? "page" : undefined}
      aria-pressed={toggle ? !!on : undefined}
      className={`flex w-full items-center gap-3 rounded-card px-3 py-2 text-[13.5px] transition-colors duration-[150ms] ${
        on ? "bg-t1/[0.09] font-medium text-t1" : "text-t3 hover:bg-t1/[0.05] hover:text-t1"
      }`}
    >
      <Icon name={icon} size={19} fill={on && filled ? "currentColor" : "none"} />
      {label}
    </button>
  );
}

/** A quiet heading over a group, the way a file tree names its sections. */
function GroupLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1.5 pt-4 text-[10.5px] font-medium uppercase tracking-[0.1em] text-t3">
      {children}
    </p>
  );
}

/**
 * The desktop's left edge: the mark, the pages by name, and at the foot an
 * account block with what the key has left to spend. Rows rather than icons
 * in a strip, so a page is read rather than guessed, and the two switches
 * that belong to the browser instead of to any page sit with the key.
 *
 * A phone gets the bottom row instead, so this is hidden there; everything
 * else clears it through --rail-w.
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
  const hydrated = useStudio((s) => s.hydrated);

  const active = runs.filter((r) => r.state === "pending" || r.state === "running").length;
  const demo = runs.some((r) => r.id.startsWith("demo-"));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--rail-w)] flex-col border-r border-line bg-canvas px-2.5 py-3 md:flex">
      <button
        type="button"
        onClick={() => setPage("home")}
        aria-label="ZYNS home"
        title="Home"
        className="mb-3 flex w-fit items-center rounded-card px-2 py-1.5 transition-opacity duration-[150ms] hover:opacity-70"
      >
        {/* The badge alone, and bigger for it: the name is set into the mark
            already, and spelling it out beside it said it twice. */}
        <ZynsMark size={40} />
      </button>

      <nav className="flex w-full flex-col gap-0.5">
        {MAKE.map((item) => (
          <NavRow
            key={item.id}
            label={item.label}
            icon={item.icon}
            on={page === item.id}
            onClick={() => setPage(item.id)}
          />
        ))}
      </nav>

      <GroupLabel>Library</GroupLabel>
      <nav className="flex w-full flex-col gap-0.5">
        {KEEP.map((item) => (
          <NavRow
            key={item.id}
            label={item.label}
            icon={item.icon}
            filled={item.icon === "heart"}
            on={page === item.id}
            onClick={() => setPage(item.id)}
          />
        ))}
        {/* Somewhere to see the studio full before there is an API key, and
            the way back out of it. It goes once a key is connected, and it
            sits here rather than at the foot: below it is only the empty run
            of the rail, so nothing moves when it comes or goes. */}
        {hydrated && !apiKey && (
          <NavRow
            label="Samples"
            icon="palette"
            toggle
            on={demo}
            title={demo ? "Take the sample media back out" : "Fill the studio with sample media"}
            onClick={demo ? clearDemo : loadDemo}
          />
        )}
      </nav>

      <div className="mt-auto w-full pt-4">
        {active > 0 && (
          <p className="mb-2 flex items-center gap-2 px-3 text-[12px] text-t3">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-t1" />
            {active} running
          </p>
        )}

        <GroupLabel>Account</GroupLabel>
        {/* What the key has left, and the key itself where the screenshot put
            its overflow menu: on this studio there is nothing else to keep in
            a menu, and the key is what an account here amounts to. */}
        <div className="flex items-center gap-2 rounded-card px-2 py-1.5">
          <ZynsMark size={28} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-t2">
            {credits !== null ? (
              <>
                <span className="font-mono tabular-nums text-t1">{credits.toLocaleString()}</span>{" "}
                credits
              </>
            ) : apiKey ? (
              "Connected"
            ) : (
              "No API key"
            )}
          </span>
          <button
            type="button"
            onClick={onKeyClick}
            title={apiKey ? "Change your API key" : "Add your API key"}
            aria-label={apiKey ? "Change your API key" : "Add your API key"}
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-t2 transition-colors duration-[150ms] hover:bg-t1/[0.07] hover:text-t1"
          >
            <Icon name="key" size={19} />
            <span
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full ring-2"
              style={{
                background: apiKey ? "var(--t1)" : "var(--t4)",
                ["--tw-ring-color" as string]: "var(--canvas)",
              }}
            />
          </button>
        </div>

        {/* The theme on a row of its own, so the foot of the rail is the
            same two lines whatever else comes and goes above it. */}
        <div className="mt-1">
          <NavRow
            label={theme === "dark" ? "Light theme" : "Dark theme"}
            icon={theme === "dark" ? "sun" : "moon"}
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          />
        </div>
      </div>
    </aside>
  );
}
