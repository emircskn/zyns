"use client";

import { useMemo, useRef } from "react";
import { Gallery } from "@/components/Gallery";
import { Icon } from "@/components/Icon";
import { PillGroup } from "@/components/PillGroup";
import { MarketingComposer, useMarketing } from "@/components/marketing/MarketingComposer";
import { PresetGrid } from "@/components/marketing/Presets";
import { ProductLink } from "@/components/marketing/ProductLink";
import { RecipeComposer } from "@/components/recipes/RecipeComposer";
import { RecipeRuns } from "@/components/recipes/RecipeRuns";
import { NeedsHiggsfield } from "@/components/remix/RemixPage";
import { inUse } from "@/lib/elements";
import type { MarketingTab, MarketingTool } from "@/lib/marketing/types";
import { mediaSrc } from "@/lib/storage/client";
import { MARKETING_RECIPES } from "@/recipes";
import { useStudio, type Run } from "@/store/studio";

/** Made here: its gallery is these runs alone. Module-level, so the gallery's memo holds. */
const madeHere = (run: Run) => !!run.marketing;

const TOOLS: Array<{ id: MarketingTool; label: string }> = [
  { id: "create", label: "Create" },
  { id: "ad-reference", label: "Ad reference" },
  { id: "product-link", label: "Product link" },
];

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
        className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-line-strong text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.04] hover:text-t1"
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

/**
 * Marketing Studio, laid out as Genjutsu is: on a desktop the composer is a
 * panel down the left and the presets, what was made and the products are
 * beside it; on a phone it reads top to bottom. Image mode runs on
 * Marketing Studio itself (Create, Ad reference) and reads product pages
 * (Product link); Video mode runs recipes, a model chosen for every step.
 */
export function MarketingStudio({ onKeyClick }: { onKeyClick: () => void }) {
  const ui = useMarketing();
  const patch = useStudio((s) => s.patchMarketing);
  const hfKey = useStudio((s) => s.hfKey);
  const hydrated = useStudio((s) => s.hydrated);
  const top = useRef<HTMLDivElement>(null);
  const recipe = MARKETING_RECIPES.find((r) => r.id === ui.recipeId) ?? MARKETING_RECIPES[0];
  const video = ui.mode === "video";

  // What was sent shows at once: the gallery beside the composer.
  const showMade = () => patch({ tab: "generations" });
  const toComposer = () => {
    if (window.matchMedia("(max-width: 767px)").matches) top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Video runs on any service's models; the image tools need Higgsfield's Marketing Studio.
  const needsKey = !video && ui.tool !== "product-link" && !hfKey;

  const composer = (
    <div className="no-bar flex min-h-0 flex-1 flex-col gap-3 md:overflow-y-auto md:p-3">
      <PillGroup
        fill
        value={ui.mode}
        onChange={(mode) => patch({ mode })}
        items={[
          { id: "image", label: "Image" },
          { id: "video", label: "Video" },
        ]}
      />
      {video ? (
        <>
          <PillGroup
            plain
            value={recipe.id}
            onChange={(recipeId) => patch({ recipeId })}
            items={MARKETING_RECIPES.map((r) => ({ id: r.id, label: r.name }))}
          />
          <p className="text-[12.5px] leading-relaxed text-t3">{recipe.description}</p>
          {hydrated && <RecipeComposer key={recipe.id} recipe={recipe} onStarted={showMade} />}
        </>
      ) : (
        <>
          <PillGroup plain value={ui.tool} onChange={(tool) => patch({ tool })} items={TOOLS} />
          {needsKey ? (
            <NeedsHiggsfield onKeyClick={onKeyClick} feature="Marketing Studio runs on Higgsfield" />
          ) : ui.tool === "product-link" ? (
            <ProductLink
              onSaved={(element) => {
                const cover = element.images[0]?.storageUrl;
                patch({ tab: "products", ...(cover ? { product: cover } : {}) });
              }}
            />
          ) : (
            <MarketingComposer tool={ui.tool} onKeyClick={onKeyClick} onSent={showMade} />
          )}
        </>
      )}
    </div>
  );

  const tabs: Array<{ id: MarketingTab; label: string }> = [
    { id: "templates", label: "Presets" },
    { id: "generations", label: "Generations" },
    { id: "products", label: "Products" },
  ];
  const tab = ui.tab;

  return (
    <div className="anim-fade flex flex-1 flex-col md:flex-row md:gap-4 md:px-4 md:pt-4">
      {/* A phone has no header nav, so the page names itself, as the others do. */}
      <div ref={top} className="scroll-mt-4 px-4 pb-3 pt-1 md:hidden">
        <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1">Marketing Studio</h2>
        <p className="text-[13px] text-t3">Product shots, ads and listings, and video made from them</p>
      </div>
      <aside className="flex w-full shrink-0 flex-col px-4 md:sticky md:top-[76px] md:h-[calc(100dvh-92px)] md:w-[360px] md:overflow-hidden md:rounded-panel md:border md:border-line md:bg-elevated md:px-0">
        {composer}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-6 md:min-h-[56px] md:px-1 md:py-2.5">
          <PillGroup plain value={tab} onChange={(t) => patch({ tab: t })} items={tabs} />
        </div>
        <div key={`${tab}-${video ? recipe.id : "image"}`} className="anim-fade flex-1 px-4 pb-8 md:px-1">
          {tab === "templates" ? (
            <PresetGrid
              selected={ui.preset?.id}
              onPick={(preset) => {
                patch({ preset, mode: "image", tool: "create" });
                toComposer();
              }}
            />
          ) : tab === "products" ? (
            <Products
              onUse={(url) => {
                patch({ product: url, mode: ui.mode === "video" ? "image" : ui.mode, tool: ui.tool === "product-link" ? "create" : ui.tool });
                toComposer();
              }}
            />
          ) : video ? (
            hydrated && <RecipeRuns recipe={recipe} />
          ) : (
            <Gallery filter={madeHere} />
          )}
        </div>
      </section>
    </div>
  );
}
