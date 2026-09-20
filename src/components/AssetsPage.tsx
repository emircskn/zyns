"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { MediaViewer } from "@/components/MediaViewer";
import { PillGroup } from "@/components/PillGroup";
import { useAssets, type Asset } from "@/lib/assets";
import { useStudio } from "@/store/studio";

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

function AssetTile({
  asset,
  index,
  onOpen,
  onRemove,
}: {
  asset: Asset;
  index: number;
  onOpen: () => void;
  onRemove?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="anim-tile card-lazy group relative overflow-hidden rounded-card bg-surface ring-1 ring-inset ring-line"
      style={{ animationDelay: `${Math.min(index, 12) * 24}ms` }}
    >
      <button type="button" onClick={onOpen} className="block aspect-square w-full cursor-zoom-in">
        {asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : asset.kind === "video" ? (
          <video src={asset.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          <span className="pending-surface grid h-full w-full place-items-center">
            <Icon name="audio" size={22} className="relative z-10 text-white/80" />
          </span>
        )}
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-2.5">
        <p className="truncate text-[11.5px] text-white">{asset.label}</p>
        <p className="truncate text-[10.5px] text-white/60">
          {asset.source === "upload" ? "Uploaded" : (asset.prompt || "Generated")}
        </p>
      </div>

      <div className="hover-reveal absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity duration-[150ms] group-hover:opacity-100">
        <button
          type="button"
          title="Copy URL"
          onClick={() => {
            void navigator.clipboard?.writeText(asset.url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
          className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/85"
        >
          <Icon name={copied ? "check" : "copy"} size={12} />
        </button>
        <a
          href={asset.url}
          target="_blank"
          rel="noreferrer"
          download
          title="Open / download"
          className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/85"
        >
          <Icon name="download" size={12} />
        </a>
        {onRemove && (
          <button
            type="button"
            title="Remove from uploads"
            onClick={onRemove}
            className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-[#ff6b6b]/80"
          >
            <Icon name="trash" size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Everything in one place: what the studio made, and what was uploaded. */
export function AssetsPage() {
  const assets = useAssets();
  const runs = useStudio((s) => s.runs);
  const removeUpload = useStudio((s) => s.removeUpload);
  const [filter, setFilter] = useState<Filter>("all");
  const [lightbox, setLightbox] = useState<string | null>(null);
  // The asset behind the open preview, and the run that made it when there is
  // one, so the panel beside it can show the prompt it came from.
  const open = lightbox ? assets.find((a) => a.url === lightbox) : undefined;
  const run = open?.source === "run" ? runs.find((r) => r.urls.includes(open.url)) : undefined;

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
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((asset, index) => (
            <AssetTile
              key={asset.id}
              asset={asset}
              index={index}
              onOpen={() => setLightbox(asset.url)}
              onRemove={asset.source === "upload" ? () => removeUpload(asset.id) : undefined}
            />
          ))}
        </div>
      )}
      <MediaViewer
        url={lightbox}
        run={run}
        upload={open?.source === "upload" ? { id: open.id, label: open.label } : undefined}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
