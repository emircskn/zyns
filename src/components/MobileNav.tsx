"use client";

import { Icon, type IconName } from "@/components/Icon";
import { useStudio, type Page } from "@/store/studio";

const ITEMS: Array<{ id: Page; label: string; icon: IconName }> = [
  { id: "home", label: "Home", icon: "home" },
  { id: "favorites", label: "Favorites", icon: "heart" },
  { id: "assets", label: "Assets", icon: "folder" },
];

function Tab({ id, label, icon }: { id: Page; label: string; icon: IconName }) {
  const page = useStudio((s) => s.page);
  const setPage = useStudio((s) => s.setPage);
  const on = page === id;
  return (
    <button
      type="button"
      onClick={() => setPage(id)}
      aria-current={on ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-1 py-1 text-[10.5px] transition-colors duration-[150ms] ${
        on ? "font-medium text-t1" : "text-t4"
      }`}
    >
      {/* The page you are on is simply brighter — the accent belongs to the
          one button that starts something. */}
      <Icon name={icon} size={21} fill={on && icon === "heart" ? "currentColor" : "none"} />
      {label}
    </button>
  );
}

/**
 * A phone's home row: where you are on the left and right of a button that
 * starts something new. It sits under the prompt bar rather than beside it,
 * and everything above reserves room for it through --nav-h.
 */
export function MobileNav({ onCreate, onKey }: { onCreate: () => void; onKey: () => void }) {
  const apiKey = useStudio((s) => s.apiKey);
  const page = useStudio((s) => s.page);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-stretch gap-1 border-t border-line bg-elevated px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 md:hidden">
      <Tab {...ITEMS[0]} />
      <Tab {...ITEMS[1]} />

      <button
        type="button"
        onClick={onCreate}
        aria-label="Create"
        className="mx-1 grid w-[68px] shrink-0 place-items-center self-center rounded-card py-2.5 transition-transform duration-[150ms] active:scale-95"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
      >
        <Icon name="spark" size={22} fill="currentColor" strokeWidth={1.2} />
      </button>

      <Tab {...ITEMS[2]} />

      <button
        type="button"
        onClick={onKey}
        aria-label={apiKey ? "API key connected" : "Add API key"}
        className={`flex flex-1 flex-col items-center gap-1 py-1 text-[10.5px] transition-colors duration-[150ms] ${
          page === "home" ? "text-t4" : "text-t4"
        }`}
      >
        <span className="relative">
          <Icon name="key" size={21} />
          <span
            className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full ring-2"
            style={{
              background: apiKey ? "var(--accent)" : "var(--t4)",
              // Punched out of the bar rather than sitting on it.
              ["--tw-ring-color" as string]: "var(--elevated)",
            }}
          />
        </span>
        API key
      </button>
    </nav>
  );
}
