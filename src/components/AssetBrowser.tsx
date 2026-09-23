"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { LikeHeart } from "@/components/LikeHeart";
import { MediaViewer } from "@/components/MediaViewer";
import { SelectMark, SelectionBar } from "@/components/SelectionBar";
import { downloadAll } from "@/lib/download";
import { usePhone } from "@/lib/usePhone";
import { useLeaving } from "@/lib/useLeaving";
import { recreateRun, sendReference } from "@/lib/reuse";
import { useReflow } from "@/lib/useReflow";
import { useLongPress } from "@/lib/useLongPress";
import { type Asset } from "@/lib/assets";
import { useStudio, type Run } from "@/store/studio";

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
  const className = `grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all duration-[120ms] hover:scale-110 ${
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
  run,
  index,
  picked,
  picking,
  square,
  leaving,
  onPick,
  onOpen,
  onRemove,
}: {
  asset: Asset;
  /** The run that made it, when one did: only those can be recreated. */
  run?: Run;
  index: number;
  picked: boolean;
  picking: boolean;
  /** Square and cropped in a grid; its own shape one at a time. */
  square: boolean;
  /** On its way out: shrinking where it stood rather than blinking away. */
  leaving?: boolean;
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
      data-flip={asset.id}
      onMouseLeave={() => setConfirming(false)}
      className={`${
        leaving ? "tile-leave" : "anim-tile"
      } card-lazy group relative overflow-hidden rounded-card bg-surface ring-1 ring-inset ring-line transition-shadow duration-[150ms]`}
      style={{ animationDelay: `${Math.min(index, 12) * 24}ms` }}
    >
      <button
        type="button"
        onClick={picking ? onPick : onOpen}
        className={`block w-full cursor-zoom-in ${square ? "aspect-square" : ""}`}
      >
        {asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.url}
            alt=""
            loading="lazy"
            draggable={false}
            className={`no-lift w-full ${square ? "h-full object-cover" : "h-auto"}`}
          />
        ) : asset.kind === "video" ? (
          <video
            src={asset.url}
            muted
            playsInline
            preload="metadata"
            className={`no-lift w-full ${square ? "h-full object-cover" : "h-auto"}`}
          />
        ) : (
          <span className={`pending-surface grid w-full place-items-center ${square ? "h-full" : "aspect-square"}`}>
            <Icon name="audio" size={22} className="relative z-10 text-white/80" />
          </span>
        )}
      </button>

      {/* The frame that says it is picked, over the picture rather than under
          it: an inset ring on the tile itself is painted beneath the media and
          came out as thin lines along the edges. */}
      {picked && (
        <span className="pointer-events-none absolute inset-0 z-10 rounded-card ring-2 ring-inset ring-t1" />
      )}

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
        // A phone never shows these: they cover the picture, and the enlarged
        // view carries the same actions with room to name them. They stand in
        // a column down the right, with the one that sends this picture
        // somewhere else on the opposite corner.
        // The sheet over the picture never takes a click itself: at
        // pointer-events-auto it swallowed the tap meant for the media under
        // it, and nothing opened. Only the two clusters take one.
        <div className="hover-reveal tap-reveal pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[150ms] group-hover:opacity-100">
          <div className="pointer-events-none absolute bottom-1.5 right-1.5 top-1.5 flex flex-col flex-wrap-reverse content-start gap-1 [&>*]:pointer-events-auto">
            <LikeHeart
              liked={kept}
              size={14}
              title={kept ? "Remove from favorites" : "Add to favorites"}
              onToggle={() => toggleFavorite(asset.url)}
              className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all duration-[120ms] hover:scale-110 hover:bg-black/85"
            />
            <TileButton icon="download" label="Open / download" href={asset.url} />
            {run && <TileButton icon="refresh" label="Recreate" onClick={() => recreateRun(run)} />}
            {onRemove &&
              (confirming ? (
                <>
                  <TileButton icon="close" label="Keep it" onClick={() => setConfirming(false)} />
                  <button
                    type="button"
                    onClick={onRemove}
                    aria-label="Confirm delete"
                    className="grid h-7 w-7 place-items-center rounded-full bg-[#ff6b6b]/85 text-white backdrop-blur-md transition-colors duration-[120ms] hover:bg-[#ff6b6b]"
                  >
                    <Icon name="check" size={14} strokeWidth={2.2} />
                  </button>
                </>
              ) : (
                <TileButton icon="trash" label="Delete" danger onClick={() => setConfirming(true)} />
              ))}
          </div>

          {asset.kind === "image" && (
            <div className="pointer-events-auto absolute bottom-1.5 left-1.5">
              <TileButton
                icon="layers"
                label="Use as reference"
                onClick={() => sendReference(asset.url)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A grid of finished media with everything you can do to it: one at a time
 * through the enlarged view, or several at once by picking them.
 */
/**
 * How the columns pack from `md` up, per density step — written out so
 * Tailwind sees every class it has to generate.
 */
const COLUMNS: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-3 lg:grid-cols-4",
  5: "md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  6: "md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
};

export function AssetBrowser({ assets }: { assets: Asset[] }) {
  const runs = useStudio((s) => s.runs);
  const density = useStudio((s) => s.density);
  const phoneGrid = useStudio((s) => s.phoneGrid);
  const phone = usePhone();
  const removeRun = useStudio((s) => s.removeRun);
  const removeUpload = useStudio((s) => s.removeUpload);
  const favorites = useStudio((s) => s.favorites);
  const setFavorites = useStudio((s) => s.setFavorites);
  const [viewing, setViewing] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  // Deleting, or taking something out of Favorites, empties a cell: the tile
  // is held in it while it shrinks away.
  const { items: tiles, leaving } = useLeaving(assets, (asset) => asset.id);
  // And the tiles that are still there slide into the room it leaves.
  const grid = useRef<HTMLDivElement>(null);
  useReflow(grid);

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
      <div
        ref={grid}
        className={`grid gap-1.5 ${phoneGrid ? "grid-cols-3" : "grid-cols-1"} md:gap-2.5 ${
          COLUMNS[density] ?? COLUMNS[4]
        }`}
      >
        {tiles.map((asset, index) => (
          <AssetTile
            key={asset.id}
            asset={asset}
            run={asset.source === "run" ? runs.find((r) => r.urls.includes(asset.url)) : undefined}
            index={index}
            square={!phone || phoneGrid}
            leaving={leaving.has(asset.id)}
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
