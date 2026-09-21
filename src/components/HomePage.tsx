"use client";

import { useMemo } from "react";
import { AssetBrowser } from "@/components/AssetBrowser";
import { Icon, type IconName } from "@/components/Icon";
import { PromptBar } from "@/components/PromptBar";
import { useAssets } from "@/lib/assets";
import { CATEGORIES, MODELS, type Category } from "@/lib/registry";
import { useStudio, type Page } from "@/store/studio";

const COUNT: Record<Category, number> = CATEGORIES.reduce(
  (all, c) => ({ ...all, [c.id]: MODELS.filter((m) => m.category === c.id).length }),
  {} as Record<Category, number>,
);

const ICON: Record<Category, IconName> = {
  image: "image",
  video: "video",
  audio: "audio",
  tool: "tool",
};

/** One way in per kind of work, under the box that does all of them. */
function Quick({ category }: { category: Category }) {
  const setPage = useStudio((s) => s.setPage);
  const meta = CATEGORIES.find((c) => c.id === category);
  return (
    <button
      type="button"
      onClick={() => setPage(category as Page)}
      className="flex items-center gap-2 rounded-full border border-line bg-t1/[0.03] py-1.5 pl-3 pr-3.5 text-[12.5px] text-t2 transition-colors duration-[150ms] hover:border-line-strong hover:bg-t1/[0.07] hover:text-t1"
    >
      <Icon name={ICON[category]} size={15} className="opacity-80" />
      {meta?.label}
      <span className="font-mono text-[11px] tabular-nums text-t4">{COUNT[category]}</span>
    </button>
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

  return (
    <div className="anim-fade flex flex-1 flex-col">
      {/* With nothing made yet the box holds the whole screen; once there is
          work underneath, it gives some of that back so the grid shows. */}
      <section
        className={`flex flex-col items-center justify-center ${
          recent.length > 0 ? "py-10 md:py-14" : "flex-1 py-8 md:py-12"
        }`}
      >
        <div className="w-full max-w-[720px]">
          <h1 className="text-center text-[28px] leading-[1.1] tracking-[-0.03em] text-t1 md:text-[42px]">
            What do you want to make?
          </h1>
          <p className="mx-auto mt-3 max-w-[420px] text-center text-[13px] leading-relaxed text-t3 md:text-[13.5px]">
            Every model on the KIE API behind one box: stills, motion, sound and the tools that
            clean them up.
          </p>

          <div className="mt-7 md:mt-8">
            <PromptBar placement="center" />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((category) => (
              <Quick key={category.id} category={category.id} />
            ))}
          </div>

          {hydrated && !apiKey && (
            <p className="mt-6 text-center text-[12px] text-t4">
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
        <section className="mx-auto w-full max-w-[1000px] pb-2">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-t4">Recent</h2>
            <button
              type="button"
              onClick={() => setPage("assets")}
              className="flex items-center gap-1 text-[12.5px] text-t3 transition-colors duration-[150ms] hover:text-t1"
            >
              All assets
              <Icon name="chevron" size={14} className="-rotate-90" />
            </button>
          </div>
          <AssetBrowser assets={recent} />
        </section>
      )}
    </div>
  );
}
