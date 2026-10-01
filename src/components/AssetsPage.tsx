"use client";

import { Fragment, useMemo, useState } from "react";
import { AssetBrowser } from "@/components/AssetBrowser";
import { Stagger } from "@/components/Stagger";
import { DensityControl } from "@/components/DensityControl";
import { Icon, type IconName } from "@/components/Icon";
import { inFlight, pendingAsset, useAssets, type Asset } from "@/lib/assets";
import { useStudio } from "@/store/studio";

type Filter = "all" | "image" | "video" | "audio" | "tool" | "upload";

const FILTERS: Array<{ id: Filter; label: string; icon: IconName }> = [
  { id: "all", label: "All", icon: "layers" },
  { id: "image", label: "Images", icon: "image" },
  { id: "video", label: "Videos", icon: "video" },
  { id: "audio", label: "Audio", icon: "audio" },
  { id: "tool", label: "Tools", icon: "tool" },
  { id: "upload", label: "Uploads", icon: "upload" },
];

// Uploads live under their own tab and nowhere else: what you put in is not
// what the studio made, and it would crowd the outputs out.
function matches(asset: Asset, filter: Filter) {
  if (filter === "upload") return asset.source === "upload";
  if (asset.source === "upload") return false;
  if (filter === "all") return true;
  if (filter === "tool") return asset.category === "tool";
  return asset.kind === filter;
}

/** What the studio made, by kind, and what was uploaded, on a tab of its own. */
export function AssetsPage() {
  const assets = useAssets();
  const runs = useStudio((s) => s.runs);
  const setPage = useStudio((s) => s.setPage);
  const [filter, setFilter] = useState<Filter>("all");

  // Runs still being made sit among the outputs with their loader, and turn
  // into the finished media in the same place when they land.
  const working = useMemo(() => runs.filter(inFlight).map(pendingAsset), [runs]);
  const shown = useMemo(
    () => [...working, ...assets].filter((a) => matches(a, filter)).sort((a, b) => b.createdAt - a.createdAt),
    [working, assets, filter],
  );

  return (
    <div className="anim-fade flex flex-1 flex-col">
      {/* A slim strip over the wall, as on the pages that make things: the
          header names the page on a desktop, so there it says how much is
          here; a phone keeps the name. */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-1 md:min-h-[56px] md:py-2.5">
        <div>
          <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1 md:hidden">Assets</h2>
          <p className="text-[13px] text-t3">
            <span className="md:hidden">What you make and upload</span>
            <span className="hidden md:inline">
              {shown.length > 0 ? `${shown.length.toLocaleString()} ${shown.length === 1 ? "item" : "items"}` : "What you make and upload"}
            </span>
          </p>
        </div>
        {assets.length + working.length > 0 && <DensityControl />}
      </div>

      {/* Each filter its own tile with its icon, the chosen one simply
          lighter: no track, no counts beside every word, no step arrows. The
          row scrolls sideways under a thumb when a phone is too narrow. */}
      <div
        role="tablist"
        aria-label="Filter assets"
        className="no-bar mb-3 flex gap-2 overflow-x-auto px-4"
      >
        {FILTERS.map((f) => {
          const on = f.id === filter;
          return (
            <Fragment key={f.id}>
            {/* Uploads are not something the studio made: a hairline sets
                them apart from the outputs' filters, as All leaves them out. */}
            {f.id === "upload" && <span aria-hidden className="mx-1 w-px shrink-0 self-stretch bg-line-strong" />}
            <button
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(f.id)}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-card px-3.5 text-[14px] font-semibold tracking-[-0.01em] transition-colors duration-[150ms] ${
                on ? "bg-t1/[0.14] text-t1" : "bg-t1/[0.05] text-t2 hover:bg-t1/[0.08] hover:text-t1"
              }`}
            >
              <Icon name={f.icon} size={17} className={on ? "" : "text-t3"} />
              {f.label}
            </button>
            </Fragment>
          );
        })}
        {/* A phone has no top bar to reach Elements from; it sits at the end
            of this row, set apart like Uploads. */}
        <span aria-hidden className="mx-1 w-px shrink-0 self-stretch bg-line-strong md:hidden" />
        <button
          type="button"
          onClick={() => setPage("elements")}
          className="flex h-10 shrink-0 items-center gap-2 rounded-card bg-t1/[0.05] px-3.5 text-[14px] font-semibold tracking-[-0.01em] text-t2 transition-colors duration-[150ms] hover:bg-t1/[0.08] hover:text-t1 md:hidden"
        >
          <Icon name="user" size={17} className="text-t3" />
          Elements
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="grid flex-1 place-items-center px-4 py-16 text-center">
          <Stagger>
            <p className="t-stagger-line text-[14px] text-t2">Nothing here yet</p>
            <p className="t-stagger-line t-stagger-line--2 mt-1 text-[12.5px] text-t4">
              {filter === "upload"
                ? "Media you upload as a reference collects here."
                : "Outputs land here as runs finish."}
            </p>
          </Stagger>
        </div>
      ) : (
        <AssetBrowser assets={shown} />
      )}
    </div>
  );
}
