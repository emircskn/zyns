"use client";

import { useCallback, useMemo, useRef } from "react";
import { Gallery } from "@/components/Gallery";
import { GlideMark } from "@/components/GlideMark";
import { AppIcon, PlaceIcon } from "@/components/AppIcon";
import { FoldButton, NavRow, SideHeading } from "@/components/studio/StudioViews";
import { ModeSwitch } from "@/components/studio/StudioComposer";
import { SideCollapsed, useSideCollapsed } from "@/components/studio/sideCollapse";
import { Icon } from "@/components/Icon";
import { Popover } from "@/components/Popover";
import { Chip } from "@/components/PromptBar";
import { PillGroup } from "@/components/PillGroup";
import { isMarketingModel, MarketingComposer, marketingModels, useMarketing } from "@/components/marketing/MarketingComposer";
import { PresetGrid } from "@/components/marketing/Presets";
import { ProductLink } from "@/components/marketing/ProductLink";
import { RecipeComposer } from "@/components/recipes/RecipeComposer";
import { RecipeRuns } from "@/components/recipes/RecipeRuns";
import { NeedsHiggsfield } from "@/components/remix/RemixPage";
import { inUse } from "@/lib/elements";
import type { MarketingView } from "@/lib/marketing/types";
import { mediaSrc } from "@/lib/storage/client";
import { MARKETING_RECIPES } from "@/recipes";
import { useStudio, type Run } from "@/store/studio";

/** Made here: its gallery is these runs alone. Module-level, so the gallery's memo holds. */
const madeHere = (run: Run) => !!run.marketing;


/** The products in the library: each one's cover, to use as the product or to open. */
function Products({ onUse }: { onUse: (url: string) => void }) {
  const elements = useStudio((s) => s.elements);
  const products = useMemo(() => elements.filter((e) => e.kind === "product" && inUse(e)), [elements]);
  const open = useStudio((s) => s.openElementEditor);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <button
        type="button"
        onClick={() => open({ kind: "product" })}
        className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-card bg-t1/[0.06] ring-1 ring-inset ring-edge text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.05] hover:text-t1"
      >
        <Icon name="plus" size={20} />
        <span className="text-[13px]">New product</span>
      </button>
      {products.map((product) => {
        const cover = product.images[0]?.storageUrl;
        return (
          <div key={product.id} className="group relative aspect-[4/5] overflow-hidden rounded-card bg-t1/[0.05]">
            <button type="button" onClick={() => open({ id: product.id })} aria-label={`Edit @${product.name}`} className="absolute inset-0">
              {cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaSrc(cover)} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </button>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-8">
              <span className="block truncate text-[12.5px] font-medium text-white">@{product.name}</span>
              {product.props?.price && <span className="block truncate text-[11px] text-white/70">{product.props.price}</span>}
            </span>
            {cover && (
              <button
                type="button"
                onClick={() => onUse(cover)}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] text-white opacity-0 transition-opacity duration-[120ms] hover:bg-black/80 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
              >
                Use
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

const NAV: Array<{ id: MarketingView; label: string; place: string }> = [
  { id: "home", label: "Home", place: "home" },
  { id: "generations", label: "My generations", place: "generations" },
  { id: "favorites", label: "My favorites", place: "favorites" },
  { id: "products", label: "My products", place: "products" },
];
const TOOL_NAV: Array<{ id: MarketingView; label: string; place: string }> = [
  { id: "ad-reference", label: "Ad Reference", place: "adReference" },
  { id: "product-link", label: "Product Link", place: "productLink" },
];

/** The side menu, as Cinema Studio's: its pages, then its tools. */
function MarketingSidebar({ view, onView }: { view: MarketingView; onView: (view: MarketingView) => void }) {
  const folded = useSideCollapsed();
  return (
    <div className="relative flex h-full flex-col gap-1 p-2">
      <GlideMark value={view} className="rounded-[12px] bg-t1/[0.1]" deps={[folded]} />
      <div className={`flex gap-1.5 pb-1 ${folded ? "justify-center" : "items-start"}`}>
        {!folded && (
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-t1/[0.05] pl-1.5 pr-2">
            <AppIcon glyph="box" tone="lime" size={24} />
            <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[14.5px] font-semibold text-t1">Marketing Studio</span>
          </div>
        )}
        <FoldButton />
      </div>
      {NAV.map((item) => (
        <NavRow key={item.id} pill={item.id} icon={<PlaceIcon place={item.place} />} label={item.label} on={view === item.id} onClick={() => onView(item.id)} />
      ))}
      <SideHeading label="Tools" />
      {TOOL_NAV.map((item) => (
        <NavRow key={item.id} pill={item.id} icon={<PlaceIcon place={item.place} />} label={item.label} on={view === item.id} onClick={() => onView(item.id)} />
      ))}
    </div>
  );
}

/**
 * Marketing Studio, laid out as Cinema Studio is: a side menu of its pages
 * and tools, and beside it the page chosen there. Home is a large title over
 * the composer (Image on Marketing Studio itself, Video by recipes) with the
 * presets under it.
 */
export function MarketingStudio({ onKeyClick }: { onKeyClick: () => void }) {
  const ui = useMarketing();
  const patch = useStudio((s) => s.patchMarketing);
  const hfKey = useStudio((s) => s.hfKey);
  const provider = useStudio((s) => s.provider);
  const hydrated = useStudio((s) => s.hydrated);
  const folded = useStudio((s) => !!s.studio.sideCollapsed);
  const favorites = useStudio((s) => s.favorites);
  const top = useRef<HTMLDivElement>(null);
  const recipe = MARKETING_RECIPES.find((r) => r.id === ui.recipeId) ?? MARKETING_RECIPES[0];
  const video = ui.mode === "video";
  const view = ui.view ?? "home";
  const liked = useCallback((run: Run) => !!run.marketing && run.urls.some((u) => favorites.includes(u)), [favorites]);

  // What was sent shows at once, among what was made here.
  const showMade = () => patch({ view: "generations" });
  const toComposer = () => top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const needsHf = (feature: string) => !hfKey && <NeedsHiggsfield onKeyClick={onKeyClick} feature={feature} />;

  const composer = video ? (
    hydrated && (
      <RecipeComposer
        bar
        key={recipe.id}
        recipe={recipe}
        onStarted={showMade}
        lead={
          // The kind of video, in the place Higgsfield's has its motion style.
          <Popover
            width={280}
            align="start"
            title="Video"
            trigger={() => <Chip icon={<Icon name="film" size={14} />} value={recipe.name} />}
          >
            {(close) => (
              <div className="flex flex-col">
                {MARKETING_RECIPES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      patch({ recipeId: r.id });
                      close();
                    }}
                    className="flex flex-col rounded-[8px] px-2.5 py-2 text-left hover:bg-t1/[0.06]"
                  >
                    <span className="flex items-center justify-between text-[13px] font-semibold text-t1">
                      {r.name}
                      {r.id === recipe.id && <Icon name="check" size={14} className="text-accent" />}
                    </span>
                    <span className="text-[11.5px] leading-snug text-t3">{r.description}</span>
                  </button>
                ))}
              </div>
            )}
          </Popover>
        }
      />
    )
  ) : (
    // With KIE chosen up top the bar runs on KIE's models and needs no Higgsfield key.
    (provider === "higgsfield" && needsHf("Marketing Studio runs on Higgsfield")) || <MarketingComposer bar tool="create" onKeyClick={onKeyClick} onSent={showMade} />
  );

  const page =
    view === "home" ? (
      <div className="flex flex-col items-center gap-8 px-4 pb-12 pt-4 md:px-0 md:pt-[10vh]">
        <h1 className="studio-title text-center text-[30px] font-bold uppercase leading-[1.02] tracking-[-0.03em] md:text-[46px]">
          Turn any product
          <span className="block text-t3">into ready to post content</span>
        </h1>
        <div ref={top} className="flex w-full max-w-[1180px] scroll-mt-24 flex-col gap-2 md:flex-row md:items-stretch">
          <div className="md:hidden">
            <PillGroup fill value={ui.mode} onChange={(mode) => patch({ mode })} items={[{ id: "image", label: "Image" }, { id: "video", label: "Video" }]} />
          </div>
          <div className="max-md:hidden md:self-center">
            <ModeSwitch mode={ui.mode} onMode={(mode) => patch({ mode })} />
          </div>
          <div className="min-w-0 flex-1">{composer}</div>
        </div>
        <div className="w-full">
          <h2 className="studio-title mb-4 text-[22px] font-bold uppercase tracking-[-0.02em] text-t1">Explore templates</h2>
          <PresetGrid
            selected={ui.preset?.id}
            onPick={(preset) => {
              // A template runs on Marketing Studio itself.
              patch({ preset, style: null, mode: "image", tool: "create", ...(isMarketingModel(ui.modelId) ? {} : { modelId: marketingModels()[0]?.id ?? "" }) });
              toComposer();
            }}
          />
        </div>
      </div>
    ) : view === "generations" ? (
      video ? hydrated && <RecipeRuns recipe={recipe} /> : <Gallery filter={madeHere} />
    ) : view === "favorites" ? (
      <Gallery filter={liked} />
    ) : view === "products" ? (
      <div className="px-4 pb-8 pt-4 md:px-1">
        <Products
          onUse={(url) => {
            patch({ product: url, mode: "image", tool: "create", view: "home" });
          }}
        />
      </div>
    ) : view === "ad-reference" ? (
      <div className="mx-auto w-full max-w-[560px] px-4 pb-10 pt-6 md:px-0">
        {needsHf("Ad Reference runs on Higgsfield") || (
          <div className="rounded-panel border border-line bg-elevated p-4">
            <MarketingComposer tool="ad-reference" onKeyClick={onKeyClick} onSent={showMade} />
          </div>
        )}
      </div>
    ) : (
      <div className="mx-auto w-full max-w-[560px] px-4 pb-10 pt-6 md:px-0">
        <div className="rounded-panel border border-line bg-elevated p-4">
          <ProductLink
            onSaved={(element) => {
              const cover = element.images[0]?.storageUrl;
              patch({ view: "products", ...(cover ? { product: cover } : {}) });
            }}
          />
        </div>
      </div>
    );

  return (
    <div className="anim-fade flex flex-1 flex-col md:flex-row md:gap-4 md:px-4 md:pt-4">
      <aside
        className={`hidden shrink-0 transition-[width] duration-[260ms] ease-[var(--ease)] md:sticky md:top-[76px] md:block md:h-[calc(100dvh-92px)] md:overflow-hidden md:rounded-panel md:border md:border-line md:bg-elevated ${
          folded ? "w-[64px]" : "w-[229px]"
        }`}
      >
        <SideCollapsed.Provider value={folded}>
          <MarketingSidebar view={view} onView={(next) => patch({ view: next })} />
        </SideCollapsed.Provider>
      </aside>
      {/* A phone has no side menu: the pages are a row of tabs. */}
      <div className="no-bar overflow-x-auto px-4 pb-1 pt-2 md:hidden">
        <PillGroup plain value={view} onChange={(next) => patch({ view: next })} items={[...NAV, ...TOOL_NAV].map(({ id, label }) => ({ id, label }))} />
      </div>
      <main key={view} className="anim-fade flex min-w-0 flex-1 flex-col">
        {page}
      </main>
    </div>
  );
}
