"use client";

import { Icon, type IconName } from "@/components/Icon";
import { ZynsMark } from "@/components/Logo";
import { Stagger } from "@/components/Stagger";
import { CATEGORIES, MODELS, type Category } from "@/lib/registry";
import { useStudio, type Page } from "@/store/studio";

/**
 * The four labels that float around the headline, pointing at it. They are
 * the four kinds of work, so the decoration is also the way in.
 */
const MARKERS: Array<{ id: Category; label: string; side: "left" | "right"; at: string }> = [
  { id: "image", label: "Stills", side: "left", at: "left-[8%] top-[34%] xl:left-[12%]" },
  { id: "video", label: "Motion", side: "left", at: "left-[13%] top-[56%] xl:left-[17%]" },
  { id: "audio", label: "Sound", side: "right", at: "right-[8%] top-[34%] xl:right-[12%]" },
  { id: "tool", label: "Clean-ups", side: "right", at: "right-[13%] top-[56%] xl:right-[17%]" },
];

/** A short hooked arrow, drawn to point from a marker at the headline. */
function MarkerArrow({ side }: { side: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 28"
      className={`absolute top-[-22px] h-[26px] w-[22px] text-t4 ${
        side === "left" ? "left-[70%] -scale-x-100" : "right-[70%]"
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 2c9 1.5 14 8 15 22" />
      <path d="M14.5 19.5 19 24l4.5-4" />
    </svg>
  );
}

const LINES: Record<Category, string[]> = {
  image: ["Text to image, and editing on what you have", "Reference images and character locking", "Up to 4K, every ratio the model allows"],
  video: ["Text, first frame or reference to video", "Camera and motion control where offered", "Extend, restyle and transform existing cuts"],
  audio: ["Music with structure, not just a loop", "Speech in dozens of voices", "Stems, lyrics and isolation"],
  tool: ["Upscale stills and footage", "Cut out backgrounds cleanly", "Separate what was mixed together"],
};

function Card({
  index,
  icon,
  title,
  lines,
  action,
  onClick,
}: {
  index: string;
  icon: IconName;
  title: string;
  lines: string[];
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[248px] flex-col rounded-panel border border-line bg-t1/[0.022] p-5 text-left transition-colors duration-[200ms] hover:border-line-strong hover:bg-t1/[0.045]"
    >
      <span className="absolute right-5 top-5 font-mono text-[11px] text-t4">{index}</span>
      <span className="mb-4 grid h-9 w-9 place-items-center rounded-chip bg-t1/[0.07] text-t2">
        <Icon name={icon} size={17} />
      </span>
      <h3 className="text-[15px] tracking-[-0.01em] text-t1">{title}</h3>
      <ul className="mt-3 flex flex-col gap-1.5">
        {lines.map((line) => (
          <li key={line} className="flex gap-2 text-[12.5px] leading-snug text-t3">
            <Icon name="check" size={14} className="mt-[3px] shrink-0 opacity-70" />
            {line}
          </li>
        ))}
      </ul>
      <span className="mt-auto flex items-center gap-1.5 pt-5 text-[12.5px] text-t2 transition-colors duration-[200ms] group-hover:text-t1">
        {action}
        <Icon name="chevron" size={14} className="-rotate-90" />
      </span>
    </button>
  );
}

/**
 * The landing page: a full frame of hero — mark, headline, the two ways in —
 * and the cards for each kind of work under it.
 */
export function HomePage() {
  const setPage = useStudio((s) => s.setPage);
  const runs = useStudio((s) => s.runs);
  const loadDemo = useStudio((s) => s.loadDemo);

  return (
    <div className="anim-fade flex flex-1 flex-col gap-4 pb-10 md:gap-6">
      {/* A held frame before the tools: the mark under its own light, the
          four kinds of work pointing in at the headline from the sides. */}
      <section className="relative isolate flex min-h-[min(760px,88svh)] flex-col items-center justify-center overflow-hidden rounded-panel border border-line bg-elevated px-4 py-16 text-center md:px-10 md:py-24">
        <span aria-hidden className="hero-aurora" />
        <span aria-hidden className="hero-grid hero-grid--top" />
        <span aria-hidden className="hero-grid hero-grid--bottom" />

        {MARKERS.map((marker, index) => (
          <button
            key={marker.id}
            type="button"
            onClick={() => setPage(marker.id as Page)}
            style={{ animationDelay: `${320 + index * 90}ms` }}
            className={`anim-pop absolute z-20 hidden items-center gap-2 rounded-chip border border-line bg-canvas/70 px-2.5 py-1.5 text-[13px] text-t2 backdrop-blur-sm transition-colors duration-[200ms] hover:border-line-strong hover:text-t1 min-[900px]:flex ${marker.at}`}
          >
            <MarkerArrow side={marker.side} />
            <Icon name={marker.id === "tool" ? "tool" : (marker.id as IconName)} size={14} />
            {marker.label}
          </button>
        ))}

        <Stagger className="relative z-10 flex w-full max-w-[900px] flex-col items-center">
          <span className="t-stagger-line relative mb-7 flex items-center justify-center">
            <span aria-hidden className="hero-bloom" />
            <span className="relative grid h-[104px] w-[104px] place-items-center rounded-[30px] border border-line bg-canvas/60 backdrop-blur-sm md:h-[124px] md:w-[124px]">
              <ZynsMark size={68} className="md:h-[84px] md:w-[84px]" />
            </span>
          </span>

          <div className="relative flex w-full flex-col items-center gap-4">
            <h2 className="t-stagger-line t-stagger-line--2 m-0 max-w-[760px] text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-t1 md:text-[48px] xl:text-[56px]">
              Every model on the KIE API,
              <br className="hidden sm:block" /> in <span style={{ color: "var(--accent)" }}>one studio</span>.
            </h2>
            <p className="t-stagger-line t-stagger-line--3 m-0 max-w-[560px] text-[14px] leading-relaxed text-t3 md:text-[16px]">
              Stills, motion, sound and the tools that clean them up — {MODELS.length} models behind
              one prompt bar, each with its own settings, everything you make in one place.
            </p>
          </div>

          <div className="t-stagger-line t-stagger-line--3 mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={() => setPage("image")}
              className="cta group flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-[14px] font-medium"
            >
              Start creating
              <span className="grid h-9 w-9 place-items-center rounded-full bg-canvas/15 transition-transform duration-[200ms] group-hover:translate-x-0.5">
                <Icon name="chevron" size={16} className="-rotate-90" />
              </span>
            </button>
            {runs.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  loadDemo();
                  setPage("image");
                }}
                className="group flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-[14px] ring-2 ring-inset ring-line-strong transition-colors duration-[200ms] hover:ring-t1/40"
                style={{ color: "var(--accent)" }}
              >
                See it with sample media
                <span className="grid h-9 w-9 place-items-center rounded-full ring-2 ring-inset ring-line-strong transition-transform duration-[200ms] group-hover:translate-x-0.5">
                  <Icon name="chevron" size={16} className="-rotate-90" />
                </span>
              </button>
            )}
          </div>
        </Stagger>
      </section>

      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((category, index) => (
          <Card
            key={category.id}
            index={`0${index + 1}`}
            icon={category.id === "tool" ? "tool" : (category.id as IconName)}
            title={`${category.label}.`}
            lines={LINES[category.id]}
            action={`Open ${category.label.toLowerCase()}`}
            onClick={() => setPage(category.id as Page)}
          />
        ))}
      </section>

      {runs.length > 0 && (
        <button
          type="button"
          onClick={() => setPage("assets")}
          className="flex items-center gap-3 rounded-panel border border-line bg-t1/[0.022] px-5 py-4 text-left transition-colors duration-[200ms] hover:bg-t1/[0.045]"
        >
          <Icon name="grid" size={16} className="shrink-0 text-t3" />
          <span className="min-w-0 flex-1 text-[13px] text-t2">
            {runs.length} {runs.length === 1 ? "run" : "runs"} so far — everything generated and
            uploaded lives in Assets.
          </span>
          <Icon name="chevron" size={15} className="-rotate-90 shrink-0 text-t4" />
        </button>
      )}
    </div>
  );
}
