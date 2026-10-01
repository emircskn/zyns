"use client";

import { useEffect, useRef, useState } from "react";
import { CoverArt } from "@/components/CoverArt";
import type { ModelDef } from "@/lib/registry";
import { mediaSrc } from "@/lib/storage/client";
import { mediaKind } from "@/lib/upload";
import { useStudio } from "@/store/studio";

/**
 * What a model's card shows behind its name: your own latest result from
 * it, else (where asked for) the catalogue's preview, else a cover of light.
 * A clip loops silently, and only while the card is in view.
 */
export function ModelMedia({
  model,
  className = "",
  catalog = true,
}: {
  model: ModelDef;
  className?: string;
  /** Whether the catalogue's preview may stand in for a result of your own. */
  catalog?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const runs = useStudio((s) => s.runs);
  const latest = runs
    .find((r) => r.modelId === model.id && r.state === "success" && r.urls.some((u) => mediaKind(u) !== "audio"))
    ?.urls.find((u) => mediaKind(u) !== "audio");
  const preview = catalog ? model.preview : undefined;
  const video = latest ? (mediaKind(latest) === "video" ? mediaSrc(latest) : undefined) : preview?.video;
  const still = latest ? (mediaKind(latest) === "image" ? mediaSrc(latest) : undefined) : (preview?.poster ?? preview?.image);

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
