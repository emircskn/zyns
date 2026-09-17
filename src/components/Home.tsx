"use client";

import { CoverArt } from "@/components/CoverArt";
import { Icon, type IconName } from "@/components/Icon";
import { VendorBadge } from "@/components/VendorMark";
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

function FeaturedRail() {
  const selectModel = useStudio((s) => s.selectModel);
  const featured = MODELS.filter((m) => m.featured);
  return (
    <div className="rail">
      {featured.map((model, index) => (
        <button
          key={model.id}
          type="button"
          onClick={() => selectModel(model.id)}
          style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
          className="anim-tile lift group relative w-[220px] shrink-0 overflow-hidden rounded-card text-left ring-1 ring-inset ring-line md:w-[248px]"
        >
          <CoverArt id={model.id} category={model.category} className="aspect-[4/5]" animate />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <VendorBadge vendor={model.vendor} size={24} />
            {model.badge && (
              <span className="rounded-chip bg-black/45 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-white backdrop-blur-md">
                {model.badge}
              </span>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3">
            <span className="block text-[15px] font-medium leading-tight text-white">{model.name}</span>
            <span className="mt-0.5 block text-[11.5px] text-white/70">{model.vendor}</span>
            <span className="mt-2 block line-clamp-2 text-[11.5px] leading-snug text-white/80">
              {model.tagline}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function StarterPrompts() {
  const selectModel = useStudio((s) => s.selectModel);
  const setValue = useStudio((s) => s.setValue);
  const ideas = MODELS.filter((m) => m.featured && m.prompts?.length).flatMap((m) =>
    (m.prompts ?? []).slice(0, 1).map((prompt) => ({ model: m, prompt })),
  );
  return (
    <div className="flex flex-col gap-1.5">
      {ideas.slice(0, 6).map(({ model, prompt }) => (
        <button
          key={model.id}
          type="button"
          onClick={() => {
            selectModel(model.id);
            setTimeout(() => setValue(model.fields.find((f) => f.placement === "prompt")?.key ?? "prompt", prompt), 0);
          }}
          className="group flex items-center gap-3 rounded-card bg-t1/[0.03] px-3.5 py-2.5 text-left ring-1 ring-inset ring-line transition-all duration-[200ms] hover:bg-t1/[0.06] hover:ring-line-strong"
        >
          <VendorBadge vendor={model.vendor} size={22} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] text-t1">{prompt}</span>
            <span className="block text-[10.5px] text-t4">{model.name}</span>
          </span>
          <Icon name="arrow-up" size={13} className="shrink-0 rotate-45 text-t4 transition-all duration-[200ms] group-hover:translate-x-0.5 group-hover:text-t1" />
        </button>
      ))}
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

      <section className="relative">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[15px] text-t1">Featured</h3>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-t4">
            {MODELS.filter((m) => m.featured).length} picks
          </span>
        </div>
        <FeaturedRail />
      </section>

      <section className="relative max-w-2xl">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[15px] text-t1">Try one of these</h3>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-t4">tap to load</span>
        </div>
        <StarterPrompts />
      </section>
    </div>
  );
}
