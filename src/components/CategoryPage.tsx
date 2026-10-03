"use client";

import { Gallery } from "@/components/Gallery";
import { SideComposer } from "@/components/ComposerPanel";
import { SIDE_PAGES } from "@/lib/layout";
import { DensityControl } from "@/components/DensityControl";
import { Icon } from "@/components/Icon";
import { Stagger } from "@/components/Stagger";
import { VendorBadge } from "@/components/VendorMark";
import { CATEGORIES, getModel, type Category } from "@/lib/registry";
import { useModel, useStudio } from "@/store/studio";

const NOUN: Record<Category, string> = {
  image: "images",
  video: "videos",
  audio: "audio",
  tool: "results",
};

const NOUN_ONE: Record<Category, string> = {
  image: "image",
  video: "video",
  audio: "audio",
  tool: "result",
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
/** List or wall, for a desktop's history. */
export function ViewToggle({ view, onChange }: { view: "list" | "grid"; onChange: (view: "list" | "grid") => void }) {
  const item = (id: "list" | "grid", label: string) => (
    <button
      type="button"
      onClick={() => onChange(id)}
      aria-pressed={view === id}
      className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors duration-[120ms] ${
        view === id ? "bg-t1/[0.1] text-t1" : "text-t3 hover:text-t1"
      }`}
    >
      <Icon name={id} size={15} />
      {label}
    </button>
  );
  return (
    <div className="hidden items-center gap-0.5 rounded-full bg-t1/[0.05] p-0.5 md:flex">
      {item("list", "List")}
      {item("grid", "Grid")}
    </div>
  );
}

export function CategoryPage({ category, onKeyClick }: { category: Category; onKeyClick: () => void }) {
  const model = useModel();
  const side = SIDE_PAGES.has(category);
  const view = useStudio((s) => s.views[category]) ?? (side ? "list" : "grid");
  const setView = useStudio((s) => s.setView);
  const togglePicker = useStudio((s) => s.togglePicker);
  const runs = useStudio((s) => s.runs);
  const meta = CATEGORIES.find((c) => c.id === category);
  const mine = runs.filter((run) => getModel(run.modelId)?.category === category);

  return (
    <div className={`anim-fade flex flex-1 ${side ? "md:gap-4 md:px-4 md:pt-4" : ""}`}>
      {side && <SideComposer onKey={onKeyClick} />}
      <div className="flex min-w-0 flex-1 flex-col">
      {/* A slim strip over the wall: the page is already named in the header
          on a desktop, so there it says how much is here; a phone, which has
          no header nav, keeps the name. */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-1 md:min-h-[56px] md:py-2.5 ${
          side ? "md:px-1 md:pt-0" : ""
        }`}
      >
        <div>
          <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1 md:hidden">
            {meta?.label ?? category}
          </h2>
          <p className="text-[13px] text-t3">
            <span className="md:hidden">{BLURB[category]}</span>
            <span className="hidden md:inline">
              {mine.length > 0
                ? `${mine.length.toLocaleString()} ${mine.length === 1 ? NOUN_ONE[category] : NOUN[category]}`
                : BLURB[category]}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
        {mine.length > 0 && view === "grid" && <DensityControl />}
        {mine.length > 0 && <ViewToggle view={view} onChange={(next) => setView(category, next)} />}
        {!side && (
        <button
          type="button"
          onClick={() => togglePicker(true, category, true)}
          // A phone picks its model from the bar at the bottom, where it is
          // already named; up here it was the same word twice.
          className="hidden items-center gap-2 rounded-full bg-t1/[0.07] py-1.5 pl-1.5 pr-3.5 text-[13px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1 md:flex"
        >
          {model && model.category === category ? (
            <>
              <VendorBadge model={model} size={22} />
              <span className="max-w-[160px] truncate">{model.name}</span>
            </>
          ) : (
            <>
              <span className="grid h-[22px] w-[22px] place-items-center rounded-chip bg-t1/[0.1]">
                <Icon name="spark" size={15} />
              </span>
              <span>Choose a model</span>
            </>
          )}
          <Icon name="chevron" size={16} className="-rotate-90 opacity-70" />
        </button>
        )}
        </div>
      </div>

      {mine.length === 0 ? (
        <div className="grid flex-1 place-items-center px-4 py-8 text-center md:py-16">
          <Stagger className="max-w-[560px]">
            {/* Said large, because an empty page should read as a state and
                not as a page that failed to load. */}
            <p className="t-stagger-line text-[34px] leading-[1.08] tracking-[-0.03em] text-t1 md:text-[54px]">
              No {NOUN[category]} yet.
            </p>
            <p className="t-stagger-line t-stagger-line--2 mx-auto mt-4 max-w-[380px] text-[13px] leading-relaxed text-t3">
              Describe what you want in the bar below. Everything this page makes stays on this
              page, and shows up in Assets too.
            </p>
            {/* inline-block, because .t-stagger-line carries no display and an
                inline span drops its top margin onto the line above. */}
            <span className="t-stagger-line t-stagger-line--3 mt-8 inline-block">
              <button
                type="button"
                onClick={() => togglePicker(true, category, true)}
                className="cta rounded-full px-4 py-2 text-[13px] font-medium"
              >
                Browse {meta?.label.toLowerCase() ?? category} models
              </button>
            </span>
          </Stagger>
        </div>
      ) : (
        <div className={view === "list" && !side ? "md:px-4" : ""}>
          <Gallery category={category} view={view} />
        </div>
      )}
      </div>
    </div>
  );
}
