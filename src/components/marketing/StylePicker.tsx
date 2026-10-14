"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { MARKETING_STYLES, STYLE_CATEGORIES, styleCover, type StyleCategory } from "@/lib/marketing/styles";
import { usePresence } from "@/lib/usePresence";

/** A style's card: its cover (a quiet tile until one is added) and its name under it. */
export function StyleCard({ id, name, on, onPick }: { id: string; name: string; on: boolean; onPick: () => void }) {
  const [missing, setMissing] = useState(false);
  return (
    <button type="button" onClick={onPick} aria-pressed={on} className="block text-left">
      <span className={`relative block aspect-[3/4] overflow-hidden rounded-[14px] bg-t1/[0.06] ${on ? "ring-2 ring-accent" : "ring-1 ring-inset ring-edge"}`}>
        {!missing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={styleCover(id)} alt="" loading="lazy" onError={() => setMissing(true)} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-gradient-to-br from-t1/[0.08] to-transparent text-t4">
            <Icon name="image" size={22} />
          </span>
        )}
        {/* The name on the picture, over a soft dark fade, as Higgsfield's templates. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pb-2.5 pt-12">
          <span className="block truncate text-[13px] font-semibold text-white">{name}</span>
        </span>
      </span>
    </button>
  );
}

/**
 * Higgsfield's "Choose style" window: the kinds down the left, the styles of the one chosen as a grid with a search. Picking the
 * chosen style again lets it go.
 */
export function StylePicker({
  open,
  selected,
  onPick,
  onClose,
}: {
  open: boolean;
  selected: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
}) {
  const { mounted, exiting } = usePresence(open, 240);
  const [category, setCategory] = useState<StyleCategory>("product-shot");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const current = MARKETING_STYLES.find((x) => x.id === selected);
    if (current) setCategory(current.category);
    setQuery("");
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // Only when it opens: it starts on the chosen style's kind.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted || typeof document === "undefined") return null;
  const needle = query.trim().toLowerCase();
  const shown = MARKETING_STYLES.filter((x) => x.only !== "template" && (needle ? x.name.toLowerCase().includes(needle) : x.category === category));
  const label = STYLE_CATEGORIES.find((c) => c.id === category)?.label ?? "";

  return createPortal(
    <div className="fixed inset-0 z-[116] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={onClose} className={`absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`} />
      <div
        role="dialog"
        aria-label="Choose style"
        className={`relative flex h-[90dvh] w-full flex-col overflow-hidden rounded-t-[20px] border border-edge bg-[var(--popover)] sm:h-[min(820px,90dvh)] sm:max-w-[1080px] sm:rounded-[20px] ${exiting ? "anim-sheet-out" : "anim-sheet"}`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-5">
          <h2 className="text-[16px] font-bold text-t1">Choose style</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-t1/[0.06] text-t1 hover:bg-t1/[0.12]">
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="mx-2 mb-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-black/25 sm:flex-row">
          <nav className="no-bar flex shrink-0 gap-1 overflow-x-auto border-line p-2 sm:w-[184px] sm:flex-col sm:overflow-visible sm:border-r sm:p-3">
            {(["image"] as const).map((group) => (
              <div key={group} className="flex shrink-0 gap-1 sm:flex-col">
                <p className="hidden px-2 pb-1 pt-2 text-[12px] font-medium text-t4 sm:block">Image</p>
                {STYLE_CATEGORIES.filter((c) => c.group === group).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategory(c.id);
                      setQuery("");
                    }}
                    className={`flex h-9 shrink-0 items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[14px] transition-colors duration-[120ms] ${
                      category === c.id && !needle ? "bg-t1/[0.1] font-semibold text-t1" : "text-t3 hover:text-t1"
                    }`}
                  >
                    <Icon name={c.icon} size={16} />
                    {c.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-3">
              <p className="text-[14.5px] font-bold text-t1">{needle ? "Search" : label}</p>
              <label className="flex h-9 w-[200px] items-center gap-2 rounded-[10px] bg-t1/[0.06] px-3 ring-1 ring-inset ring-edge">
                <Icon name="search" size={14} className="text-t4" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 outline-none placeholder:text-t4" />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              {shown.length === 0 ? (
                <p className="py-16 text-center text-[13px] text-t4">{needle ? "No style by that name." : "No styles here yet."}</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-4">
                  {shown.map((x) => (
                    <StyleCard
                      key={x.id}
                      id={x.id}
                      name={x.name}
                      on={x.id === selected}
                      onPick={() => {
                        onPick(x.id === selected ? null : x.id);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Our own templates under Explore templates, apart from Higgsfield's: the
 * styles as a grid with their kinds as chips. A pick sends its cover along
 * as the look to copy.
 */
export function OwnTemplateGrid({ selected, onPick }: { selected: string | null; onPick: (id: string | null) => void }) {
  const [category, setCategory] = useState<StyleCategory | "all">("all");
  const own = MARKETING_STYLES.filter((x) => x.only !== "style");
  const kinds = STYLE_CATEGORIES.filter((c) => c.group === "image" && own.some((x) => x.category === c.id));
  const shown = own.filter((x) => category === "all" || x.category === category);
  const chip = (id: StyleCategory | "all", label: string, icon: Parameters<typeof Icon>[0]["name"]) => (
    <button
      key={id}
      type="button"
      onClick={() => setCategory(id)}
      aria-pressed={category === id}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors duration-[120ms] ${
        category === id ? "bg-t1/[0.12] text-t1" : "bg-t1/[0.05] text-t3 hover:text-t1"
      }`}
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="no-bar flex gap-1.5 overflow-x-auto">
        {chip("all", "All", "grid")}
        {kinds.map((c) => chip(c.id, c.label, c.icon))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {shown.map((x) => (
          <StyleCard key={x.id} id={x.id} name={x.name} on={x.id === selected} onPick={() => onPick(x.id === selected ? null : x.id)} />
        ))}
      </div>
    </div>
  );
}
