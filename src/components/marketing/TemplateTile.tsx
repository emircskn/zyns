"use client";

import { useRef } from "react";
import type { Box } from "@/lib/justify";
import { noteRatio } from "@/lib/mediaRatio";

/**
 * One template under Explore templates, ours or Higgsfield's alike: the
 * picture whole at its own shape in the justified rows, square corners, and
 * its name only while the pointer is over it, on a light dark wash. Nothing
 * grows or shrinks on hover; a clip plays instead.
 */
export function TemplateTile({
  box,
  src,
  video,
  name,
  active,
  onPick,
}: {
  box: Box;
  src?: string;
  video?: boolean;
  name: string;
  active?: boolean;
  onPick: () => void;
}) {
  const clip = useRef<HTMLVideoElement>(null);
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => void clip.current?.play().catch(() => {})}
      onMouseLeave={() => clip.current?.pause()}
      aria-pressed={active}
      aria-label={name}
      className="group absolute overflow-hidden bg-t1/[0.05] text-left"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
    >
      {src && video ? (
        <video
          ref={clip}
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => noteRatio(src, e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
          className="h-full w-full object-cover"
        />
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onLoad={(e) => noteRatio(src, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
          className="h-full w-full object-cover"
        />
      ) : null}
      <span className="pointer-events-none absolute inset-0 flex items-end bg-black/35 p-3 opacity-0 transition-opacity duration-[160ms] group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="truncate text-[13.5px] font-semibold text-white">{name}</span>
      </span>
      {active && <span aria-hidden className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-accent" />}
    </button>
  );
}
