"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { MediaViewer } from "@/components/MediaViewer";
import { SelectMark, SelectionBar } from "@/components/SelectionBar";
import { downloadAll } from "@/lib/download";
import { useLongPress } from "@/lib/useLongPress";
import { type Asset } from "@/lib/assets";
import { useStudio } from "@/store/studio";

function TileButton({
  icon,
  label,
  onClick,
  href,
  danger,
  filled,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  filled?: boolean;
}) {
  const className = `grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all duration-[120ms] hover:scale-110 ${
    danger ? "hover:bg-[#ff6b6b]/80" : "hover:bg-black/85"
  }`;
  const glyph = <Icon name={icon} size={14} fill={filled ? "currentColor" : "none"} />;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" download title={label} aria-label={label} className={className}>
      {glyph}
    </a>
  ) : (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={className}>
      {glyph}
    </button>
  );
}

function AssetTile({
  asset,
  index,
  picked,
  picking,
  onPick,
  onOpen,
  onRemove,
}: {
  asset: Asset;
  index: number;
  picked: boolean;
  picking: boolean;
  onPick: () => void;
  onOpen: () => void;
  onRemove?: () => void;
}) {
  const favorites = useStudio((s) => s.favorites);
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const kept = favorites.includes(asset.url);
  const [confirming, setConfirming] = useState(false);
  const press = useLongPress(onPick);

  return (
    <div
      {...press}
      onMouseLeave={() => setConfirming(false)}
      className={`anim-tile card-lazy group relative overflow-hidden rounded-card bg-surface ring-1 ring-inset transition-shadow duration-[150ms] ${
        picked ? "ring-2 ring-t1/70" : "ring-line"
      }`}
      style={{ animationDelay: `${Math.min(index, 12) * 24}ms` }}
    >
      <button
        type="button"
        onClick={picking ? onPick : onOpen}
        className="block aspect-square w-full cursor-zoom-in"
      >
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

      <button
        type="button"
        onClick={onPick}
        aria-label={picked ? "Deselect" : "Select"}
        // Invisible is not absent: at opacity 0 this still took the tap meant
        // for the picture under it, and the tile quietly went into picking.
        className={`absolute left-1.5 top-1.5 transition-opacity duration-[150ms] ${
          picking
            ? "opacity-100"
            : "hover-reveal tap-reveal pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
        }`}
      >
        <SelectMark on={picked} />
      </button>

      {!picking && (
        <div className="hover-reveal absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity duration-[150ms] group-hover:opacity-100">
          <TileButton
            icon="heart"
            filled={kept}
            label={kept ? "Remove from favorites" : "Add to favorites"}
            onClick={() => toggleFavorite(asset.url)}
          />
          <TileButton icon="download" label="Open / download" href={asset.url} />
          {onRemove &&
            (confirming ? (
              <>
                <TileButton icon="close" label="Keep it" onClick={() => setConfirming(false)} />
                <button
                  type="button"
                  onClick={onRemove}
                  aria-label="Confirm delete"
                  className="grid h-8 w-8 place-items-center rounded-full bg-[#ff6b6b]/85 text-white backdrop-blur-md transition-colors duration-[120ms] hover:bg-[#ff6b6b]"
                >
                  <Icon name="check" size={14} strokeWidth={2.2} />
                </button>
              </>
            ) : (
              <TileButton icon="trash" label="Delete" danger onClick={() => setConfirming(true)} />
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * A grid of finished media with everything you can do to it: one at a time
 * through the enlarged view, or several at once by picking them.
 */
export function AssetBrowser({ assets }: { assets: Asset[] }) {
  const runs = useStudio((s) => s.runs);
  const removeRun = useStudio((s) => s.removeRun);
  const removeUpload = useStudio((s) => s.removeUpload);
  const favorites = useStudio((s) => s.favorites);
  const setFavorites = useStudio((s) => s.setFavorites);
  const [viewing, setViewing] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  // A pick can be taken out from under the selection — by a delete here, or
  // by a run finishing elsewhere — so it is trimmed to what is on screen.
  useEffect(() => {
    setPicked((current) => {
      const live = current.filter((url) => assets.some((a) => a.url === url));
      return live.length === current.length ? current : live;
    });
  }, [assets]);

  const open = viewing ? assets.find((a) => a.url === viewing) : undefined;
  const run = open?.source === "run" ? runs.find((r) => r.urls.includes(open.url)) : undefined;

  function drop(url: string) {
    const asset = assets.find((a) => a.url === url);
    if (!asset) return;
    if (asset.source === "upload") removeUpload(asset.id);
    else {
      const owner = runs.find((r) => r.urls.includes(url));
      if (owner) removeRun(owner.id);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {assets.map((asset, index) => (
          <AssetTile
            key={asset.id}
            asset={asset}
            index={index}
            picked={picked.includes(asset.url)}
            picking={picked.length > 0}
            onPick={() =>
              setPicked((current) =>
                current.includes(asset.url)
                  ? current.filter((u) => u !== asset.url)
                  : [...current, asset.url],
              )
            }
            onOpen={() => setViewing(asset.url)}
            onRemove={() => drop(asset.url)}
          />
        ))}
      </div>

      <SelectionBar
        count={picked.length}
        favorited={picked.length > 0 && picked.every((url) => favorites.includes(url))}
        onFavorite={() =>
          setFavorites(picked, !picked.every((url) => favorites.includes(url)))
        }
        onDownload={() => downloadAll(picked)}
        onDelete={() => {
          picked.forEach(drop);
          setPicked([]);
        }}
        onClose={() => setPicked([])}
      />

      <MediaViewer
        url={viewing}
        run={run}
        upload={open?.source === "upload" ? { id: open.id, label: open.label } : undefined}
        onClose={() => setViewing(null)}
      />
    </>
  );
}
