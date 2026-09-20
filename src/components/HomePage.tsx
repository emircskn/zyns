"use client";

import { Icon, type IconName } from "@/components/Icon";
import { ZynsWordmark } from "@/components/Logo";
import { CATEGORIES, type Category } from "@/lib/registry";
import { useStudio, type Page } from "@/store/studio";

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
 * The landing page: one held frame before the tools. The hero is an inset
 * canvas with the wordmark set as large as it will go, and the cards below
 * are the way into each kind of work.
 */
export function HomePage() {
  const setPage = useStudio((s) => s.setPage);
  const runs = useStudio((s) => s.runs);
  const loadDemo = useStudio((s) => s.loadDemo);

  return (
    <div className="anim-fade flex flex-1 flex-col gap-4 pb-10 md:gap-6">
      <section className="stage relative flex min-h-[520px] flex-col justify-end overflow-hidden rounded-panel border border-line p-6 md:min-h-[600px] md:p-10">
        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-10">
          <h2 className="min-w-0">
            <span className="sr-only">ZYNS</span>
            <ZynsWordmark height={104} className="w-full max-w-[560px] text-t1 md:h-[168px]" />
          </h2>
          <div className="w-full max-w-[380px] shrink-0">
            <p className="text-[13.5px] leading-relaxed text-t3">
              Every model on the KIE API in one studio — stills, motion, sound and the tools that
              clean them up. One prompt bar, each model&apos;s own settings, everything you make in
              one place.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPage("image")}
                className="cta group flex items-center gap-2 rounded-full py-2 pl-4 pr-2 text-[13px] font-medium"
              >
                Start creating
                <span className="grid h-8 w-8 place-items-center rounded-full bg-canvas/15 transition-transform duration-[200ms] group-hover:translate-x-0.5">
                  <Icon name="chevron" size={15} className="-rotate-90" />
                </span>
              </button>
              {runs.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    loadDemo();
                    setPage("image");
                  }}
                  className="rounded-full px-3 py-2 text-[13px] text-t3 transition-colors duration-[200ms] hover:text-t1"
                >
                  See it with sample media
                </button>
              )}
            </div>
          </div>
        </div>
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
