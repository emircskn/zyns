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
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
        <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1 md:text-[26px]">Favorites</h2>
        <p className="text-[13px] text-t3">
          {shown.length === 0
            ? "The heart on any piece of media keeps it here."
            : `${shown.length} kept · generated and uploaded`}
        </p>
        </div>
        {shown.length > 0 && <DensityControl />}
      </div>

      {shown.length === 0 ? (
        <div className="grid flex-1 place-items-center py-20 text-center">
          <Stagger className="max-w-[560px]">
            <p className="t-stagger-line text-[34px] leading-[1.08] tracking-[-0.03em] text-t1 md:text-[54px]">
              Nothing kept yet.
            </p>
            <p className="t-stagger-line t-stagger-line--2 mx-auto mt-4 max-w-[380px] text-[13.5px] leading-relaxed text-t3">
              Press the heart on a tile, or in the enlarged view, and it stays here, out of the
              way of everything else you make.
            </p>
            <span className="t-stagger-line t-stagger-line--3 mt-6">
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
