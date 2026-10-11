"use client";

import { useEffect, useRef, useState } from "react";
import { CoverArt } from "@/components/CoverArt";
import type { ModelDef } from "@/lib/registry";

/**
 * What a model's card shows behind its name: its own preview (the
 * catalogue's, or the cover chosen for it), else a cover of light. Never
 * something you made with it: a model's card is its picture, not your history.
 * A clip loops silently, and only while the card is in view.
 */
export function ModelMedia({
  model,
  className = "",
  catalog = true,
}: {
  model: ModelDef;
  className?: string;
  /** Whether the preview is shown at all; without it, the cover of light. */
  catalog?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const preview = catalog ? model.preview : undefined;
  const video = preview?.video;
  const still = preview?.poster ?? preview?.image;

  useEffect(() => {
    const node = box.current;
    if (!node || !video) return;
    const watch = new IntersectionObserver(([entry]) => setSeen(entry.isIntersecting), { rootMargin: "80px" });
    watch.observe(node);
    return () => watch.disconnect();
  }, [video]);

  return (
    <div ref={box} className={`absolute inset-0 ${className}`}>
      {!video && !still ? (
        <CoverArt id={model.id} category={model.category} className="absolute inset-0 h-full" />
      ) : (
        <>
          {still && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={still} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {video && (seen || !still) && (
            <video
              src={video}
              poster={still}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </>
      )}
    </div>
  );
}
