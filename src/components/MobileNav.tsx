"use client";

import { Icon, type IconName } from "@/components/Icon";
import { MetalButton } from "@/components/MetalButton";
import { useStudio, type Page } from "@/store/studio";

/**
 * The four tabs share one shape, and it is the Create button's height: the
 * row is centred on that button, so a tab whose icon and name started at the
 * top of the row sat visibly higher than it.
 */
const TAB =
  "flex h-[52px] flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-[150ms]";

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
      className={`${TAB} ${on ? "font-medium text-t1" : "text-t4"}`}
    >
      {/* The page you are on is simply brighter — the accent belongs to the
          one button that starts something. */}
      <Icon name={icon} size={23} fill={on && icon === "heart" ? "currentColor" : "none"} />
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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-1 border-t border-line bg-elevated px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 md:hidden">
      <Tab {...ITEMS[0]} />
      <Tab {...ITEMS[1]} />

      {/* The same metal ring the send button wears, around a circle this
          time, and still the spark rather than an arrow: this button opens
          the models, it does not send anything. */}
      <span className="mx-2">
        <MetalButton>
          <button
            type="button"
            onClick={onCreate}
            aria-label="Create"
            className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full text-t1 transition-transform duration-[150ms] active:scale-95"
          >
            {/* The fill sits inside the button, not on it: the ring normalizes
                the host's own chrome, and a background set there is dropped. */}
            <span className="grid h-full w-full place-items-center rounded-full bg-t1/[0.07]">
              <Icon name="spark" size={22} fill="currentColor" strokeWidth={1.2} />
            </span>
          </button>
        </MetalButton>
      </span>

      <Tab {...ITEMS[2]} />

      <button
        type="button"
        onClick={onKey}
        aria-label={apiKey ? "API key connected" : "Add API key"}
        className={`${TAB} text-t4`}
      >
        <span className="relative">
          <Icon name="key" size={23} />
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
