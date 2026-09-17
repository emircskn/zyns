"use client";

import { CoverArt } from "@/components/CoverArt";
import { Icon, type IconName } from "@/components/Icon";
import { CATEGORIES, MODELS, type Category } from "@/lib/registry";
import { ACCENT } from "@/lib/vendors";
import { useStudio } from "@/store/studio";

const CATEGORY_ICON: Record<Category, IconName> = {
  image: "image",
  video: "video",
  audio: "audio",
  tool: "tool",
};

const CATEGORY_COVER: Record<Category, string> = {
  image: "showcase-image",
  video: "showcase-video",
  audio: "showcase-audio",
  tool: "showcase-tool",
};

function CategoryTiles() {
  const togglePicker = useStudio((s) => s.togglePicker);
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {CATEGORIES.map((category, index) => {
        const count = MODELS.filter((m) => m.category === category.id).length;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => togglePicker(true, category.id)}
            style={{ animationDelay: `${index * 40}ms` }}
            className="anim-tile lift group relative aspect-[4/3] overflow-hidden rounded-card text-left ring-1 ring-inset ring-line md:aspect-[5/3]"
          >
            <CoverArt id={CATEGORY_COVER[category.id]} category={category.id} style={{ position: "absolute", inset: 0, height: "100%" }} animate />
            <div className="absolute inset-0 flex flex-col justify-between p-3.5">
              <span className="grid h-8 w-8 place-items-center rounded-chip bg-black/40 text-white backdrop-blur-md">
                <Icon name={CATEGORY_ICON[category.id]} size={16} />
              </span>
              <span>
                <span className="block text-[15px] font-medium text-white">{category.label}</span>
                <span className="block text-[11.5px] text-white/70">
                  {count} models · {category.blurb.toLowerCase()}
                </span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function Home() {
  const category = useStudio((s) => s.category);
  return (
    <div className="anim-fade flex flex-col gap-8 md:gap-10">
      <div className="stage-glow" style={{ ["--stage" as string]: ACCENT[category] }} />
      <section className="relative">
        <h2 className="mb-1 text-[22px] leading-tight text-t1 md:text-[28px]" style={{ textWrap: "balance" }}>
          What are you making today?
        </h2>
        <p className="mb-4 text-[13px] text-t3">
          {MODELS.length} model families, every option each one supports, one prompt bar.
        </p>
        <CategoryTiles />
      </section>

    </div>
  );
}
