"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AssetBrowser } from "@/components/AssetBrowser";
import { Icon } from "@/components/Icon";
import { PromptBar } from "@/components/PromptBar";
import { useAssets } from "@/lib/assets";
import { useStudio } from "@/store/studio";

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

/**
 * The screen the studio opens on: the box in the middle of it, the pages
 * down the left, and whatever was made last underneath. Nothing else — no
 * model is chosen for you, and the box says so until you choose one.
 */
export function HomePage({ onKeyClick }: { onKeyClick: () => void }) {
  const assets = useAssets();
  const apiKey = useStudio((s) => s.apiKey);
  const hydrated = useStudio((s) => s.hydrated);
  const setPage = useStudio((s) => s.setPage);
  const loadDemo = useStudio((s) => s.loadDemo);

  const recent = useMemo(() => assets.slice(0, 6), [assets]);

  // The box holds the middle of the first screen, whether or not there is
  // anything under it: the hero takes all the height left below whatever the
  // page put above it, and Recent is pulled up into the empty part beneath
  // the box rather than taking any of it away.
  const hero = useRef<HTMLElement>(null);
  const middle = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [pull, setPull] = useState(0);
  const demo = useStudio((s) => s.runs.some((r) => r.id.startsWith("demo-")));

  useLayoutEffect(() => {
    const node = hero.current;
    if (!node) return;
    const measure = () => {
      // Measured off the page rather than off itself, so growing it cannot
      // feed back into the number.
      setTop(Math.round(node.getBoundingClientRect().top + window.scrollY));
      // And the pull is only ever as much as the room under the box: on a
      // short screen there is none, and Recent simply follows the hero.
      const room = node.offsetHeight - (middle.current?.offsetHeight ?? 0);
      const peek =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--home-peek"),
        ) || 0;
      setPull(Math.max(0, Math.min(peek, Math.round(room / 2) - 24)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [hydrated, apiKey, demo, recent.length]);

  // Fonts land after the first paint and move everything above it.
  useEffect(() => {
    document.fonts?.ready
      .then(() => {
        const node = hero.current;
        if (node) setTop(Math.round(node.getBoundingClientRect().top + window.scrollY));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="anim-fade flex flex-1 flex-col">
      <section
        ref={hero}
        style={{ minHeight: `calc(100dvh - ${top}px - var(--nav-h) - 12px)` }}
        className="flex flex-col items-center justify-center py-8 md:py-12"
      >
        <div ref={middle} className="w-full max-w-[720px]">
          {/* A real space between the verb and the word, not a flex gap: the
              line is read aloud and copied as one sentence. */}
          <h1 className="text-center text-[28px] leading-[1.1] tracking-[-0.03em] text-t1 md:text-[42px]">
            Make <Rolling />
          </h1>
          {/* Not a spec sheet. What is true of the empty box is that nothing
              in here exists yet, and one sentence is the whole price of
              entry; the model count belongs on the pages, not here. */}
          <p className="mx-auto mt-3 max-w-[430px] text-center text-[13px] leading-relaxed text-t3 md:text-[13.5px]">
            Nothing here exists until you describe it.{" "}
            {/* Kept whole, so the two lines are the two sentences rather than
                a sentence broken over the turn. */}
            <span className="whitespace-nowrap">One sentence is enough to begin.</span>
          </p>

          <div className="mt-7 md:mt-8">
            <PromptBar placement="center" />
          </div>

          {hydrated && !apiKey && (
            <p className="mt-6 text-center text-[13px] text-t4">
              <button
                type="button"
                onClick={onKeyClick}
                className="underline decoration-line-strong underline-offset-[3px] transition-colors duration-[150ms] hover:text-t1 hover:decoration-t1"
              >
                Add your API key
              </button>{" "}
              to generate, or{" "}
              <button
                type="button"
                onClick={loadDemo}
                className="underline decoration-line-strong underline-offset-[3px] transition-colors duration-[150ms] hover:text-t1 hover:decoration-t1"
              >
                fill the studio with sample media
              </button>{" "}
              to look around first.
            </p>
          )}
        </div>
      </section>

      {recent.length > 0 && (
        // Lifted into the empty room under the box, so its heading peeks at
        // the foot of the first screen without moving the box at all.
        <section
          style={{ marginTop: pull ? -pull : undefined }}
          className="relative mx-auto w-full max-w-[1000px] pb-2 pt-2"
        >
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-[14px] font-medium uppercase tracking-[0.08em] text-t3">Recent</h2>
            <button
              type="button"
              onClick={() => setPage("assets")}
              className="flex items-center gap-1 text-[13.5px] text-t3 transition-colors duration-[150ms] hover:text-t1"
            >
              All assets
              <Icon name="chevron" size={16} className="-rotate-90" />
            </button>
          </div>
          <AssetBrowser assets={recent} />
        </section>
      )}
    </div>
  );
}
