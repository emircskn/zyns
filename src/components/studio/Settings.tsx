"use client";

import { inUse } from "@/lib/elements";
import { Icon } from "@/components/Icon";
import { mediaSrc, thumbSrc } from "@/lib/storage/client";
import type { OptionPreview } from "@/lib/studio/options";
import { useStudio } from "@/store/studio";

/** A choice's still, with its loop played over it while `play` (hovered, or the one chosen). */
export function PreviewMedia({ preview, play, className = "" }: { preview: OptionPreview; play?: boolean; className?: string }) {
  return (
    <span className={`relative block overflow-hidden bg-t1/[0.06] ${className}`}>
      {preview.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.image} alt="" loading="lazy" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {preview.video && play && (
        <video src={preview.video} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
      )}
      {preview.colors && preview.colors.length > 0 && (
        // A palette's colours, drawn from its values rather than read off the picture.
        <span className="absolute inset-x-0 bottom-0 flex h-[20%] min-h-[6px]">
          {preview.colors.map((color, i) => (
            <span key={i} className="flex-1" style={{ background: color }} />
          ))}
        </span>
      )}
    </span>
  );
}

/** Library elements, whose pictures come in as references. */
export function ElementGrid({ onPick }: { onPick: (urls: string[], name: string) => void }) {
  const elements = useStudio((s) => s.elements).filter((e) => e.kind !== "style" && inUse(e));
  if (elements.length === 0) {
    return <p className="py-6 text-center text-[13px] text-t4">No characters, places or products yet. Make one on the Elements page.</p>;
  }
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {elements.map((element) => (
        <button
          key={element.id}
          type="button"
          onClick={() => onPick(element.images.map((ref) => ref.storageUrl), element.name)}
          title={`@${element.name}`}
          className="group flex flex-col items-center gap-1"
        >
          <span className="block aspect-square w-full overflow-hidden rounded-card bg-surface-2 ring-1 ring-inset ring-line transition-transform duration-[120ms] group-hover:scale-[1.03]">
            {element.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbSrc(element.images[0].storageUrl, 384)} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <span className="w-full truncate text-center text-[11px] text-t3">@{element.name}</span>
        </button>
      ))}
    </div>
  );
}
