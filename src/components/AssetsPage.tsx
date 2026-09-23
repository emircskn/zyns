"use client";

import { useMemo, useState } from "react";
import { AssetBrowser } from "@/components/AssetBrowser";
import { Stagger } from "@/components/Stagger";
import { DensityControl } from "@/components/DensityControl";
import { Icon, type IconName } from "@/components/Icon";
import { useAssets, type Asset } from "@/lib/assets";

type Filter = "all" | "image" | "video" | "audio" | "tool" | "upload";

const FILTERS: Array<{ id: Filter; label: string; icon: IconName }> = [
  { id: "all", label: "All", icon: "layers" },
  { id: "image", label: "Images", icon: "image" },
  { id: "video", label: "Videos", icon: "video" },
  { id: "audio", label: "Audio", icon: "audio" },
  { id: "tool", label: "Tools", icon: "tool" },
  { id: "upload", label: "Uploads", icon: "upload" },
];

function matches(asset: Asset, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "upload") return asset.source === "upload";
  if (filter === "tool") return asset.category === "tool";
  return asset.kind === filter;
}

/** Everything in one place: what the studio made, and what was uploaded. */
export function AssetsPage() {
  const assets = useAssets();
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => assets.filter((a) => matches(a, filter)), [assets, filter]);

  return (
    <div className="anim-fade flex flex-1 flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
        <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1 md:text-[26px]">Assets</h2>
        <p className="text-[13px] text-t3">
          {assets.length === 0
            ? "Everything you generate or upload collects here."
            : `${assets.length} item${assets.length === 1 ? "" : "s"} · generated and uploaded`}
        </p>
        </div>
        {assets.length > 0 && <DensityControl />}
      </div>

      {/* Each filter its own tile with its icon, the chosen one simply
          lighter: no track, no counts beside every word, no step arrows. The
          row scrolls sideways under a thumb when a phone is too narrow. */}
      <div
        role="tablist"
        aria-label="Filter assets"
        className="no-bar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0"
      >
        {FILTERS.map((f) => {
          const on = f.id === filter;
          return (
            <button
              key={f.id}
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
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="grid flex-1 place-items-center py-16 text-center">
          <Stagger>
            <p className="t-stagger-line text-[14px] text-t2">Nothing here yet</p>
            <p className="t-stagger-line t-stagger-line--2 mt-1 text-[12.5px] text-t4">
              Outputs land here as runs finish, and uploads the moment you add them.
            </p>
          </Stagger>
        </div>
      ) : (
        <AssetBrowser assets={shown} />
      )}
    </div>
  );
}
