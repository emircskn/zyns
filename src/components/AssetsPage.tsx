"use client";

import { useMemo, useState } from "react";
import { AssetBrowser } from "@/components/AssetBrowser";
import { PillGroup } from "@/components/PillGroup";
import { useAssets, type Asset } from "@/lib/assets";

type Filter = "all" | "image" | "video" | "audio" | "tool" | "upload";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "audio", label: "Audio" },
  { id: "tool", label: "Tools" },
  { id: "upload", label: "Uploads" },
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
  const counts = useMemo(
    () =>
      FILTERS.reduce<Record<string, number>>((all, f) => {
        all[f.id] = assets.filter((a) => matches(a, f.id)).length;
        return all;
      }, {}),
    [assets],
  );

  return (
    <div className="anim-fade flex flex-1 flex-col">
      <div className="mb-4">
        <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1 md:text-[26px]">Assets</h2>
        <p className="text-[13px] text-t3">
          {assets.length === 0
            ? "Everything you generate or upload collects here."
            : `${assets.length} item${assets.length === 1 ? "" : "s"} · generated and uploaded`}
        </p>
      </div>

      <div className="mb-4">
        <PillGroup
          value={filter}
          onChange={(next) => setFilter(next as Filter)}
          items={FILTERS.map((f) => ({
            id: f.id,
            label: counts[f.id] ? `${f.label} · ${counts[f.id]}` : f.label,
          }))}
        />
      </div>

      {shown.length === 0 ? (
        <div className="grid flex-1 place-items-center py-16 text-center">
          <div>
            <p className="text-[14px] text-t2">Nothing here yet</p>
            <p className="mt-1 text-[12.5px] text-t4">
              Outputs land here as runs finish, and uploads the moment you add them.
            </p>
          </div>
        </div>
      ) : (
        <AssetBrowser assets={shown} />
      )}
    </div>
  );
}
