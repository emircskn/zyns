"use client";

import { Gallery } from "@/components/Gallery";
import { DensityControl } from "@/components/DensityControl";
import { Icon } from "@/components/Icon";
import { VendorBadge } from "@/components/VendorMark";
import { CATEGORIES, MODELS, type Category } from "@/lib/registry";
import { useModel, useStudio } from "@/store/studio";

const NOUN: Record<Category, string> = {
  image: "images",
  video: "videos",
  audio: "audio",
  tool: "results",
};

const BLURB: Record<Category, string> = {
  image: "Stills you generate and edit",
  video: "Motion, avatars and editing",
  audio: "Music, speech and effects",
  tool: "Upscales, cut-outs and clean-ups",
};

/**
 * One page per kind of work: the models for it, and the things it has made.
 * Nothing from another category appears here.
 */
export function CategoryPage({ category }: { category: Category }) {
  const model = useModel();
  const togglePicker = useStudio((s) => s.togglePicker);
  const runs = useStudio((s) => s.runs);
  const meta = CATEGORIES.find((c) => c.id === category);
  const count = MODELS.filter((m) => m.category === category).length;
  const mine = runs.filter((run) => MODELS.find((m) => m.id === run.modelId)?.category === category);

  return (
    <div className="anim-fade flex flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1 md:text-[26px]">
            {meta?.label ?? category}
          </h2>
          <p className="text-[13px] text-t3">
            {BLURB[category]} · {count} models
          </p>
        </div>
        <div className="flex items-center gap-2">
        {mine.length > 0 && <DensityControl />}
        <button
          type="button"
          onClick={() => togglePicker(true, category, true)}
          className="flex items-center gap-2 rounded-full bg-t1/[0.07] py-1.5 pl-1.5 pr-3.5 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
        >
          {model && model.category === category ? (
            <>
              <VendorBadge vendor={model.vendor} size={22} />
              <span className="max-w-[160px] truncate">{model.name}</span>
            </>
          ) : (
            <>
              <span className="grid h-[22px] w-[22px] place-items-center rounded-chip bg-t1/[0.1]">
                <Icon name="spark" size={12} />
              </span>
              <span>Choose a model</span>
            </>
          )}
          <Icon name="chevron" size={13} className="-rotate-90 opacity-60" />
        </button>
        </div>
      </div>

      {mine.length === 0 ? (
        <div className="grid flex-1 place-items-center py-20 text-center">
          <div className="anim-rise max-w-[560px]">
            {/* Said large, because an empty page should read as a state and
                not as a page that failed to load. */}
            <p className="text-[34px] leading-[1.08] tracking-[-0.03em] text-t1 md:text-[54px]">
              No {NOUN[category]} yet.
            </p>
            <p className="mx-auto mt-4 max-w-[380px] text-[13.5px] leading-relaxed text-t3">
              Describe what you want in the bar below. Everything this page makes stays on this
              page, and shows up in Assets too.
            </p>
            <button
              type="button"
              onClick={() => togglePicker(true, category, true)}
              className="cta mt-6 rounded-full px-4 py-2 text-[12.5px] font-medium"
            >
              Browse {meta?.label.toLowerCase() ?? category} models
            </button>
          </div>
        </div>
      ) : (
        <Gallery category={category} />
      )}
    </div>
  );
}
