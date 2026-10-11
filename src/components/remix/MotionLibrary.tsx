"use client";

import { useMemo, useState } from "react";
import { ConfirmPopup } from "@/components/ConfirmPopup";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { saveMotionClip } from "@/lib/remix/library";
import type { MotionClip } from "@/lib/remix/types";
import { mediaSrc } from "@/lib/storage/client";
import { useStudio } from "@/store/studio";

function length(clip: MotionClip): string | undefined {
  return clip.durationSec ? `${clip.durationSec >= 10 ? Math.round(clip.durationSec) : clip.durationSec.toFixed(1)} s` : undefined;
}

function ClipTile({ clip, active, onUse, onRemove }: { clip: MotionClip; active: boolean; onUse: () => void; onRemove: () => void }) {
  return (
    <div className="group relative flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onUse}
        title="Use as the source"
        className={`relative block aspect-video w-full overflow-hidden rounded-card bg-canvas-deep ring-inset transition-all duration-[120ms] ${
          active ? "ring-2 ring-t1" : "ring-1 ring-line hover:ring-line-strong"
        }`}
      >
        <video
          src={mediaSrc(clip.url)}
          muted
          loop
          playsInline
          preload="metadata"
          onMouseEnter={(event) => void event.currentTarget.play().catch(() => {})}
          onMouseLeave={(event) => event.currentTarget.pause()}
          className="h-full w-full object-cover"
        />
        {length(clip) && (
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-1.5 py-0.5 font-mono text-[10.5px] text-white">
            {length(clip)}
          </span>
        )}
        {active && (
          <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-ink">
            <Icon name="check" size={14} strokeWidth={2.4} />
          </span>
        )}
      </button>
      <div className="flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-t2">{clip.title}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove from the library"
          title="Remove from the library"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-t4 transition-colors duration-[120ms] hover:bg-t1/[0.07] hover:text-t1"
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
      {clip.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {clip.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-t1/[0.06] px-2 py-0.5 text-[10.5px] text-t3">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Clips kept for their motion: your own and what you made, saved from
 * Assets or added here. Picking one makes it the source.
 */
export function MotionLibrary({ onUsed }: { onUsed?: () => void }) {
  const clips = useStudio((s) => s.motionClips);
  const source = useStudio((s) => s.remix.source);
  const patchRemix = useStudio((s) => s.patchRemix);
  const removeMotionClip = useStudio((s) => s.removeMotionClip);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<MotionClip | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const tags = useMemo(() => [...new Set(clips.flatMap((c) => c.tags))].sort(), [clips]);
  const shown = tag ? clips.filter((c) => c.tags.includes(tag)) : clips;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-[12.5px] text-t3">
          {clips.length > 0
            ? `${clips.length} ${clips.length === 1 ? "clip" : "clips"}. Pick one to use its motion.`
            : "Keep clips here for their motion. Save one from Assets, or add it here."}
        </p>
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(tag === t ? null : t)}
            aria-pressed={tag === t}
            className={`rounded-full px-2.5 py-1 text-[12px] transition-colors duration-[120ms] ${
              tag === t ? "bg-t1/[0.1] text-t1 ring-1 ring-inset ring-line-strong" : "bg-t1/[0.06] text-t2 hover:text-t1"
            }`}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-full bg-t1/[0.07] px-3 py-1.5 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
        >
          <Icon name="plus" size={14} />
          Add clips
        </button>
      </div>
      {shown.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((clip) => (
            <ClipTile
              key={clip.id}
              clip={clip}
              active={clip.url === source}
              onUse={() => {
                patchRemix({ source: clip.url });
                onUsed?.();
              }}
              onRemove={() => setRemoving(clip)}
            />
          ))}
        </div>
      )}
      <MediaPicker
        open={adding}
        accept="video"
        multiple
        taken={clips.map((c) => c.url)}
        onPick={(urls) => urls.forEach((url) => void saveMotionClip(url))}
        onClose={() => setAdding(false)}
      />
      <ConfirmPopup
        open={!!removing}
        title="Remove from the library?"
        message="The clip itself stays in Assets."
        confirmLabel="Remove"
        onConfirm={() => {
          if (removing) removeMotionClip(removing.id);
          setRemoving(null);
        }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
