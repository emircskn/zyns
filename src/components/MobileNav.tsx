"use client";

import { Icon, type IconName } from "@/components/Icon";
import { ZynsMark } from "@/components/Logo";
import { AccountMenu } from "@/components/TopBar";
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

/** Home, as the studio's mark rather than a house. */
function HomeTab() {
  const page = useStudio((s) => s.page);
  const setPage = useStudio((s) => s.setPage);
  const on = page === "home";
  return (
    <button
      type="button"
      onClick={() => setPage("home")}
      aria-label="Home"
      aria-current={on ? "page" : undefined}
      className={`${TAB} ${on ? "font-medium text-t1" : "text-t4"}`}
    >
      {/* The mark in the icon's place, at the icons' size, named like the rest. */}
      <span className={on ? "" : "opacity-60"}>
        <ZynsMark size={24} />
      </span>
      Home
    </button>
  );
}

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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-1 border-t border-line bg-elevated px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 md:hidden">
      <HomeTab />
      <Tab {...ITEMS[1]} />

      {/* The spark rather than an arrow: this button opens the models, it
          does not send anything. A plain circle, without the metal ring. */}
      <span className="mx-2">
        <button
          type="button"
          onClick={onCreate}
          aria-label="Create"
          data-round
          className="cta grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full"
        >
          <Icon name="spark" size={22} fill="currentColor" strokeWidth={1.2} />
        </button>
      </span>

      <Tab {...ITEMS[2]} />

      {/* The account (key, theme, samples) where the key alone used to be. */}
      <AccountMenu tab onKeyClick={onKey} />
    </nav>
  );
}
