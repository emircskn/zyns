"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AudioFace, AudioPlay, audioTitle } from "@/components/AudioCard";
import { Icon } from "@/components/Icon";
import { LikeHeart } from "@/components/LikeHeart";
import { MediaViewer } from "@/components/MediaViewer";
import { SelectMark, SelectionBar } from "@/components/SelectionBar";
import { saveMedia, useSave } from "@/lib/download";
import { SaveGlyph } from "@/components/SaveGlyph";
import { usePhone } from "@/lib/usePhone";
import { useLeaving } from "@/lib/useLeaving";
import { recreateRun, sendReference } from "@/lib/reuse";
import { useReflow } from "@/lib/useReflow";
import { keptNote, usedElsewhere } from "@/lib/usage";
import { byDay } from "@/lib/days";
import { type Box } from "@/lib/justify";
import { noteRatio, parseRatio, ratioOf } from "@/lib/mediaRatio";
import { JustifiedRows } from "@/components/JustifiedRows";
import { Tile } from "@/components/Gallery";
import { type Asset } from "@/lib/assets";
import { useStudio, type Run } from "@/store/studio";
import { mediaSrc } from "@/lib/storage/client";

function TileButton({
  icon,
  glyph,
  label,
  onClick,
  danger,
  filled,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  /** Drawn instead of the icon, for a button that shows its own progress. */
  glyph?: ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  filled?: boolean;
}) {
  const className = `grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all duration-[120ms] hover:scale-110 ${
    danger ? "hover:bg-[#ff6b6b]/80" : "hover:bg-black/85"
  }`;
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={className}>
      {glyph ?? <Icon name={icon} size={14} fill={filled ? "currentColor" : "none"} />}
    </button>
  );
}

/** The tile's Download, which shows its save going through and done. */
function SaveTileButton({ url }: { url: string }) {
  const saver = useSave();
  return (
    <TileButton
      icon="download"
      glyph={<SaveGlyph state={saver.state} size={14} />}
      label={saver.label}
      onClick={() => saver.state !== "busy" && void saver.save([url])}
    />
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
  box,
}: {
  asset: Asset;
  /** Its size in the desktop's justified rows; absent in a phone's grid. */
  box?: Box;
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

  return (
    <div
      data-flip={asset.id}
      onMouseLeave={() => setConfirming(false)}
      className={`${
        leaving ? "tile-leave" : "anim-tile"
      } card-lazy group relative shrink-0 overflow-hidden bg-surface ${
        box ? "transition-[width,height] duration-[200ms]" : ""
      }`}
      style={{
        animationDelay: `${Math.min(index, 12) * 24}ms`,
        ...(box ? { position: "absolute", left: box.x, top: box.y, width: box.width, height: box.height } : null),
      }}
    >
      <button
        type="button"
        onClick={picking ? onPick : onOpen}
        className={`block w-full cursor-zoom-in ${box ? "h-full" : square ? "aspect-square" : ""}`}
      >
        {asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc(asset.url)}
            alt=""
            loading="lazy"
            draggable={false}
            onLoad={(e) => noteRatio(asset.url, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
            className={`no-lift w-full ${box || square ? "h-full object-cover" : "h-auto"}`}
          />
        ) : asset.kind === "video" ? (
          <video
            src={mediaSrc(asset.url)}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => noteRatio(asset.url, e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
            className={`no-lift w-full ${box || square ? "h-full object-cover" : "h-auto"}`}
          />
        ) : (
          <span className={`block w-full ${box || square ? "h-full" : "aspect-square"}`}>
            <AudioFace
              title={asset.source === "upload" ? asset.label : audioTitle(run, asset.url)}
              source={asset.source === "upload" ? "Upload" : asset.label}
              compact={square}
            />
          </span>
        )}
      </button>

      {asset.kind === "audio" && !picking && (
        <AudioPlay
          key={asset.url}
          url={asset.url}
          compact={square}
          className={`absolute z-10 ${square ? "bottom-2 left-2" : "bottom-3 left-3"}`}
        />
      )}

      {/* The frame that says it is picked, over the picture rather than under
          it: an inset ring on the tile itself is painted beneath the media and
          came out as thin lines along the edges. */}
      {picked && (
        <span className="pointer-events-none absolute inset-0 z-10 ring-2 ring-inset ring-t1" />
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
            <SaveTileButton url={asset.url} />
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
export function AssetBrowser({
  assets,
  byDate = true,
}: {
  assets: Asset[];
  /** Day headings over the grid; off for a short strip like home's Recent. */
  byDate?: boolean;
}) {
  const runs = useStudio((s) => s.runs);
  const phoneGrid = useStudio((s) => s.phoneGrid);
  const phone = usePhone();
  const removeRun = useStudio((s) => s.removeRun);
  const removeUpload = useStudio((s) => s.removeUpload);
  const fileUnder = useStudio((s) => s.fileUnder);
  const favorites = useStudio((s) => s.favorites);
  const setFavorites = useStudio((s) => s.setFavorites);
  const [viewing, setViewing] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  // A phone's Select button: tiles pick on a tap before anything is picked.
  const selectMode = useStudio((s) => s.selectMode);
  const setSelectMode = useStudio((s) => s.setSelectMode);
  // Cancel ends picking outright: whatever was picked goes with it.
  useEffect(() => {
    if (!selectMode) setPicked([]);
  }, [selectMode]);
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

  // Only finished media can be picked: a run still being made has nothing
  // to download, favourite or delete as media yet.
  const pickable = assets.filter((asset) => asset.source !== "pending");

  const tile = (asset: Asset, box?: Box) =>
    asset.source === "pending" && asset.run ? (
      <Tile
        key={asset.id}
        run={asset.run}
        box={box}
        index={tiles.indexOf(asset)}
        square={phone && phoneGrid}
        leaving={leaving.has(asset.id)}
        picked={false}
        picking={false}
        onPick={() => {}}
        onOpen={() => {}}
      />
    ) : (
    <AssetTile
      key={asset.id}
      asset={asset}
      box={box}
      run={asset.source === "run" ? runs.find((r) => r.urls.includes(asset.url)) : undefined}
      index={tiles.indexOf(asset)}
      square={phone && phoneGrid}
      leaving={leaving.has(asset.id)}
      picked={picked.includes(asset.url)}
      picking={picked.length > 0 || selectMode}
      onPick={() =>
        setPicked((current) =>
          current.includes(asset.url) ? current.filter((u) => u !== asset.url) : [...current, asset.url],
        )
      }
      onOpen={() => setViewing(asset.url)}
      onRemove={() => drop(asset.url)}
    />
    );

  return (
    <>
      {/* A desktop lays everything out as one wall, edge to edge; a phone
          keeps a heading for each day. One container either way, so a tile
          moving into the day above still slides there. */}
      {/* Clipped sideways: a tile sliding to its new place when the layout
          changes passes the edge for a moment, and a phone's browser zooms
          the whole page out to fit it and stays zoomed. */}
      <div ref={grid} className="no-text-select flex flex-col gap-6 overflow-x-clip">
        {(byDate && phone
          ? byDay(tiles, (asset) => asset.createdAt)
          : [{ key: "all", label: "", items: tiles }]
        ).map((day) => (
          <section key={day.key}>
            {byDate && phone && (
            <h3 className="mb-2.5 px-4 text-[15px] font-semibold tracking-[-0.01em] text-t1">
              {day.label}
            </h3>
            )}
            {/* Phone: a grid of three squares, or one at a time. Desktop:
                justified rows, each piece as wide as its shape. */}
            {phone ? (
              <div className={`grid gap-[2px] ${phoneGrid ? "grid-cols-3" : "grid-cols-1"}`}>
                {day.items.map((asset) => tile(asset))}
              </div>
            ) : (
              <JustifiedRows
                items={day.items}
                keyOf={(asset) => asset.id}
                ratioOf={(asset) =>
                  // Sound is a square tile, not a banner across the row.
                  (asset.kind === "audio" ? 1 : undefined) ??
                  (asset.run ? parseRatio(asset.run.ratio) : ratioOf(asset.url)) ??
                  (asset.source === "run" ? parseRatio(runs.find((r) => r.urls.includes(asset.url))?.ratio) : undefined)
                }
                render={(asset, box) => tile(asset, box)}
              />
            )}
          </section>
        ))}
      </div>

      <SelectionBar
        open={selectMode}
        count={picked.length}
        total={pickable.length}
        onSelectAll={() => setPicked(pickable.map((asset) => asset.url))}
        favorited={picked.length > 0 && picked.every((url) => favorites.includes(url))}
        onFavorite={() =>
          setFavorites(picked, !picked.every((url) => favorites.includes(url)))
        }
        onDownload={() => saveMedia(picked)}
        project={(() => {
          const shared = new Set(picked.map((url) => assets.find((a) => a.url === url)?.projectId ?? null));
          return shared.size === 1 ? [...shared][0] : "";
        })()}
        deleteNote={() => {
          const chosen = assets.filter((a) => picked.includes(a.url));
          const runIds = chosen.flatMap((a) => (a.source === "run" ? runs.filter((r) => r.urls.includes(a.url)).map((r) => r.id) : []));
          const uploadIds = chosen.filter((a) => a.source === "upload").map((a) => a.id);
          return keptNote(usedElsewhere(picked, { runs: runIds, uploads: uploadIds }), picked.length > 1);
        }}
        onProject={(projectId) => {
          fileUnder(picked, projectId);
          setPicked([]);
          setSelectMode(false);
        }}
        onDelete={() => {
          picked.forEach(drop);
          setPicked([]);
          setSelectMode(false);
        }}
        onClose={() => {
          setPicked([]);
          setSelectMode(false);
        }}
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
