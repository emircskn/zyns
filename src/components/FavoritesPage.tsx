"use client";

import { AssetBrowser } from "@/components/AssetBrowser";
import { Stagger } from "@/components/Stagger";
import { DensityControl } from "@/components/DensityControl";
import { useAssets } from "@/lib/assets";
import { useStudio } from "@/store/studio";

/** The media you kept, whatever made it and whichever page it came from. */
export function FavoritesPage() {
  const assets = useAssets();
  const favorites = useStudio((s) => s.favorites);
  const setPage = useStudio((s) => s.setPage);
  // Kept in the order they were favourited, newest first.
  const shown = favorites
    .map((url) => assets.find((asset) => asset.url === url))
    .filter((asset): asset is NonNullable<typeof asset> => !!asset);

  return (
    <div className="anim-fade flex flex-1 flex-col">
      {/* A slim strip over the wall, as on the pages that make things. */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-1 md:min-h-[56px] md:py-2.5">
        <div>
          <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1 md:hidden">Favorites</h2>
          <p className="text-[13px] text-t3">
            <span className="md:hidden">What you keep with the heart</span>
            <span className="hidden md:inline">
              {shown.length > 0 ? `${shown.length.toLocaleString()} kept` : "What you keep with the heart"}
            </span>
          </p>
        </div>
        {shown.length > 0 && <DensityControl />}
      </div>

      {shown.length === 0 ? (
        <div className="grid flex-1 place-items-center px-4 py-20 text-center">
          <Stagger className="max-w-[560px]">
            <p className="t-stagger-line text-[34px] leading-[1.08] tracking-[-0.03em] text-t1 md:text-[54px]">
              Nothing kept yet.
            </p>
            <p className="t-stagger-line t-stagger-line--2 mx-auto mt-4 max-w-[380px] text-[13.5px] leading-relaxed text-t3">
              Press the heart on a tile, or in the enlarged view, and it stays here, out of the
              way of everything else you make.
            </p>
            {/* inline-block, because .t-stagger-line carries no display and an
                inline span drops its top margin onto the line above. */}
            <span className="t-stagger-line t-stagger-line--3 mt-8 inline-block">
              <button
                type="button"
                onClick={() => setPage("image")}
                className="cta rounded-full px-4 py-2 text-[12.5px] font-medium"
              >
                Back to image
              </button>
            </span>
          </Stagger>
        </div>
      ) : (
        <AssetBrowser assets={shown} />
      )}
    </div>
  );
}
