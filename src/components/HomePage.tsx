"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { ModelMedia } from "@/components/ModelMedia";
import { PhoneExplore, ROW_NAME, useExplore } from "@/components/PhoneExplore";
import { PromptBar } from "@/components/PromptBar";
import { getModel, type ModelDef } from "@/lib/registry";
import { activeKey, ownPageOf, useStudio, type Page } from "@/store/studio";

/**
 * One verb, four things it can end in, rolling one into the next: the
 * headline says what the studio is for by naming the four kinds of work
 * instead of describing them.
 *
 * The four words share a single grid cell, and the cell is given the width of
 * whichever one is showing, so the line never opens a gap after the verb and
 * the change of width is itself part of the move. A cell left to size itself
 * would be as wide as the longest word, which read as a hole in the sentence.
 * Each word is laid to the start of the cell rather than stretched across it,
 * both so the box hugs the text and so measuring it returns the word's own
 * width instead of the width it was just given.
 */
const MAKES = ["a still.", "a scene.", "a sound.", "it sharper."];
const HOLD = 2600;

function Rolling() {
  const [at, setAt] = useState(0);
  const [was, setWas] = useState(-1);
  const [width, setWidth] = useState<number | null>(null);
  const words = useRef<(HTMLSpanElement | null)[]>([]);

  // Before paint, so the first frame is already the width of the first word
  // rather than the width of the longest. Webfonts land late, and the words
  // are measured again when they do.
  useLayoutEffect(() => {
    function measure() {
      const node = words.current[at];
      if (node) setWidth(node.getBoundingClientRect().width);
    }
    measure();
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [at]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setAt((current) => {
        setWas(current);
        return (current + 1) % MAKES.length;
      });
    }, HOLD);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span
      className="roll-cell inline-grid align-baseline"
      style={width === null ? undefined : { width }}
    >
      {MAKES.map((word, i) => (
        <span
          key={word}
          ref={(node) => {
            words.current[i] = node;
          }}
          aria-hidden={i !== at}
          data-state={i === at ? "on" : i === was ? "past" : "next"}
          className="roll col-start-1 row-start-1 justify-self-start whitespace-nowrap"
        >
          {word}
        </span>
      ))}
    </span>
  );
}

/** A small mark in the corner of a card: NEW, TOP, Studio. Never a pill. */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[4px] bg-accent px-1.5 py-px font-display text-[10px] font-bold uppercase leading-[16px] tracking-[0.03em] text-accent-ink">
      {children}
    </span>
  );
}

/**
 * Explore's lead on a desktop, as Higgsfield's: wide cards three to a
 * screen, the picture on top and the name in capitals under it. The strip
 * scrolls on, and its arrows step a card at a time.
 */
function FeatureStrip() {
  const { features } = useExplore();
  const strip = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const node = strip.current;
    if (!node) return;
    const update = () => setEdge({ start: node.scrollLeft < 4, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 4 });
    update();
    node.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      node.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [features.length]);

  const step = (dir: 1 | -1) => {
    const node = strip.current;
    const card = node?.firstElementChild as HTMLElement | null;
    if (node && card) node.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: "smooth" });
  };

  return (
    <section className="group/strip relative">
      <div ref={strip} className="no-bar flex snap-x snap-mandatory gap-5 overflow-x-auto">
        {features.map((feature) => (
          <button
            key={feature.key}
            type="button"
            onClick={feature.open}
            className="group w-[calc((100%-40px)/3)] shrink-0 snap-start text-left"
          >
            <span className="relative block aspect-[16/9] overflow-hidden rounded-[10px] bg-surface-2">
              <ModelMedia model={feature.model} className="transition-transform duration-[400ms] ease-[var(--ease)] group-hover:scale-[1.02]" />
              {feature.badge && (
                <span className="absolute left-3 top-3">
                  <Badge>{feature.badge}</Badge>
                </span>
              )}
            </span>
            <span className="mt-3 block truncate font-display text-[15px] font-bold uppercase tracking-[0.01em] text-t1">{feature.title}</span>
            <span className="mt-0.5 block truncate text-[14px] text-t3">{feature.line}</span>
          </button>
        ))}
      </div>
      {(["prev", "next"] as const).map((side) => {
        const hidden = side === "prev" ? edge.start : edge.end;
        return (
          <button
            key={side}
            type="button"
            onClick={() => step(side === "prev" ? -1 : 1)}
            aria-label={side === "prev" ? "Previous" : "Next"}
            tabIndex={hidden ? -1 : 0}
            className={`absolute top-[calc((100%-48px)/2)] grid h-10 w-10 -translate-y-1/2 place-items-center rounded-[8px] bg-canvas/85 text-t1 ring-1 ring-inset ring-edge backdrop-blur-md transition-opacity duration-[180ms] hover:bg-surface-2 ${
              side === "prev" ? "left-3" : "right-3"
            } ${hidden ? "pointer-events-none opacity-0" : "opacity-0 group-hover/strip:opacity-100 focus-visible:opacity-100"}`}
          >
            <Icon name="chevron" size={18} className={side === "prev" ? "rotate-90" : "-rotate-90"} />
          </button>
        );
      })}
    </section>
  );
}

interface Way {
  key: string;
  icon: IconName;
  name: string;
  line: string;
  kind?: string;
  badge?: string;
  open: () => void;
}

/** One way in: its mark, its kind in the corner, its name and a line, as Higgsfield's small cards are. */
function WayCard({ way }: { way: Way }) {
  return (
    <button
      type="button"
      onClick={way.open}
      className="flex min-h-[124px] flex-col rounded-[10px] bg-surface p-4 text-left ring-1 ring-inset ring-edge transition-colors duration-[150ms] hover:bg-surface-2"
    >
      <span className="flex items-start justify-between gap-2">
        <Icon name={way.icon} size={19} className="text-t1" />
        {way.kind && <span className="rounded-[6px] bg-t1/[0.06] px-2 py-0.5 text-[11.5px] text-t2">{way.kind}</span>}
      </span>
      <span className="mt-auto flex items-center gap-2 pt-4">
        <span className="truncate text-[15px] font-semibold text-t1">{way.name}</span>
        {way.badge && <Badge>{way.badge}</Badge>}
      </span>
      <span className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-t4">{way.line}</span>
    </button>
  );
}

/** A kind's models in a row of their own, with a way to the whole page. */
function ModelRow({ title, models, onPick, onAll }: { title: string; models: ModelDef[]; onPick: (m: ModelDef) => () => void; onAll: () => void }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-[22px] font-bold uppercase tracking-[-0.01em] text-t1">{title}</h2>
        <button type="button" onClick={onAll} className="flex items-center gap-1 text-[13.5px] text-t3 transition-colors duration-[150ms] hover:text-t1">
          See all
          <Icon name="chevron" size={14} className="-rotate-90" />
        </button>
      </div>
      <div className="no-bar flex snap-x gap-4 overflow-x-auto">
        {models.slice(0, 14).map((model) => (
          <button key={model.id} type="button" onClick={onPick(model)} className="group w-[220px] shrink-0 snap-start text-left">
            <span className="relative block aspect-[4/5] overflow-hidden rounded-[10px] bg-surface-2">
              <ModelMedia model={model} className="transition-transform duration-[400ms] ease-[var(--ease)] group-hover:scale-[1.03]" />
              {model.badge && (
                <span className="absolute left-2.5 top-2.5">
                  <Badge>{model.badge}</Badge>
                </span>
              )}
            </span>
            <span className="mt-2 block truncate text-[14px] font-medium text-t1">{model.name}</span>
            <span className="block truncate text-[12.5px] text-t4">{model.vendor}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * The desktop's home, laid out as Higgsfield's Explore: the leading
 * features as wide cards, then the prompt in a card of its own beside six
 * ways in, a studio given a banner, and each kind's models in a row.
 */
function DesktopExplore({ onKeyClick }: { onKeyClick: () => void }) {
  const { categories, byCategory, pick, setPage } = useExplore();
  const apiKey = useStudio(activeKey);
  const hydrated = useStudio((s) => s.hydrated);
  const loadDemo = useStudio((s) => s.loadDemo);
  const marketing = getModel("hf-marketing-studio-flare");
  // The studios have cards and a banner of their own; the rows and the box lead with the rest.
  const plain = (m: ModelDef) => !ownPageOf(m.id) && !/studio/i.test(m.name);
  const rowOf = (c: string) => {
    const list = byCategory.get(c as never) ?? [];
    return [...list.filter(plain), ...list.filter((m) => !plain(m))];
  };
  const backdrop = rowOf("video")[0] ?? rowOf("image")[0];

  const ways: Way[] = [];
  for (const c of ["video", "image"] as const) {
    // A model of its own, not one of the studios that have a card here already.
    const model = rowOf(c)[0];
    if (model) ways.push({ key: model.id, icon: c, name: model.name, line: model.tagline, kind: c === "video" ? "Video" : "Image", badge: model.badge, open: pick(model) });
  }
  ways.push(
    { key: "genjutsu", icon: "wand", name: "Genjutsu", line: "One clip, many versions: motion, swap, restyle", kind: "Studio", open: () => setPage("remix") },
    { key: "cinema", icon: "film", name: "Cinema Studio", line: "Direct a shot: camera, film, light and colour", kind: "Studio", open: () => setPage("studio") },
    { key: "marketing", icon: "box", name: "Marketing Studio", line: "Product shots, ads and listings", kind: "Studio", open: () => setPage("marketing") },
    { key: "elements", icon: "at", name: "Elements", line: "Characters, products and places you reuse", open: () => setPage("elements") },
  );

  return (
    <div className="flex flex-col gap-12 pb-16 max-md:hidden">
      <FeatureStrip />

      <section className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-5 max-lg:grid-cols-1">
        {/* The prompt in a card of its own, where Higgsfield puts its offer. */}
        <div className="relative isolate flex flex-col justify-center rounded-panel p-7 ring-1 ring-inset ring-edge">
          <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden rounded-panel bg-surface">
            {backdrop && <ModelMedia model={backdrop} className="opacity-45" />}
            <span className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/80 to-canvas/30" />
          </div>
          <h1 className="font-display text-[38px] font-bold uppercase leading-[1.02] tracking-[-0.02em] text-t1">
            Make <span className="text-accent"><Rolling /></span>
          </h1>
          <p className="mt-2 text-[13.5px] text-t3">Nothing here exists until you describe it. One sentence is enough to begin.</p>
          <div className="mt-5">
            <PromptBar placement="center" />
          </div>
          {hydrated && !apiKey && (
            <p className="mt-4 text-[12.5px] text-t4">
              <button type="button" onClick={onKeyClick} className="underline decoration-line-strong underline-offset-[3px] hover:text-t1">
                Add your API key
              </button>{" "}
              to generate, or{" "}
              <button type="button" onClick={loadDemo} className="underline decoration-line-strong underline-offset-[3px] hover:text-t1">
                fill the studio with sample media
              </button>
              .
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ways.map((way) => (
            <WayCard key={way.key} way={way} />
          ))}
        </div>
      </section>

      {marketing && (
        // A studio given the whole width, as Higgsfield gives its newest.
        <section className="relative isolate flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-panel px-6 py-12 text-center ring-1 ring-inset ring-edge">
          <div aria-hidden className="absolute inset-0 -z-10 bg-surface">
            <ModelMedia model={marketing} className="opacity-60" />
            <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--canvas)_10%,transparent_75%)] opacity-90" />
          </div>
          <span className="font-display text-[15px] font-bold uppercase tracking-[0.02em] text-t1">Marketing Studio</span>
          <h2 className="mt-2 font-display text-[54px] font-bold uppercase leading-[0.98] tracking-[-0.03em] text-t1">
            Shots that <span className="text-accent">sell</span>
          </h2>
          <p className="mt-3 text-[15px] text-t2">Bring a product. Pick a preset. Get the ad.</p>
          <button type="button" onClick={() => setPage("marketing")} className="cta mt-6 h-11 rounded-[8px] px-5 text-[14px] font-semibold">
            Open Marketing Studio
          </button>
        </section>
      )}

      {categories.map((c) => {
        const list = rowOf(c.id);
        if (list.length === 0) return null;
        return (
          <ModelRow
            key={c.id}
            title={ROW_NAME[c.id]}
            models={list}
            onPick={pick}
            onAll={() => setPage(c.id as Page)}
          />
        );
      })}
    </div>
  );
}

/**
 * The screen the studio opens on: Explore, on a phone as on a desktop,
 * laid out as Higgsfield's is.
 */
export function HomePage({ onKeyClick }: { onKeyClick: () => void }) {
  return (
    <div className="anim-fade flex flex-1 flex-col">
      <PhoneExplore />
      <DesktopExplore onKeyClick={onKeyClick} />
    </div>
  );
}
