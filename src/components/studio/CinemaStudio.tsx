"use client";

import { useState } from "react";
import { Gallery } from "@/components/Gallery";
import { ViewToggle } from "@/components/CategoryPage";
import { DensityControl } from "@/components/DensityControl";
import { NeedsHiggsfield } from "@/components/remix/RemixPage";
import { CinemaComposer } from "@/components/studio/CinemaComposer";
import { CINEMA } from "@/lib/studio/cinema";
import { useStudio } from "@/store/studio";

const BLURB = "Direct a shot: camera, film, light and colour";

/**
 * Cinema Studio, laid out as Genjutsu's page and the Video page are: on a
 * desktop the composer is a panel down the left, held in view while what it
 * made scrolls beside it; on a phone the page reads top to bottom.
 */
export function CinemaStudio({ onKeyClick }: { onKeyClick: () => void }) {
  const hfKey = useStudio((s) => s.hfKey);
  const made = useStudio((s) => s.runs.filter((run) => run.modelId === CINEMA).length);
  const [view, setView] = useState<"list" | "grid">("list");

  return (
    <div className="anim-fade flex flex-1 flex-col md:flex-row md:gap-4 md:px-4 md:pt-4">
      {/* A phone has no header nav, so the page names itself, as the others do. */}
      <div className="px-4 pb-3 pt-1 md:hidden">
        <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1">Cinema Studio</h2>
        <p className="text-[13px] text-t3">{BLURB}</p>
      </div>
      <aside className="flex w-full shrink-0 flex-col px-4 md:sticky md:top-[76px] md:h-[calc(100dvh-92px)] md:w-[340px] md:overflow-hidden md:rounded-panel md:border md:border-line md:bg-elevated md:px-0">
        {hfKey ? (
          <CinemaComposer onKeyClick={onKeyClick} />
        ) : (
          <NeedsHiggsfield onKeyClick={onKeyClick} feature="Cinema Studio runs on Higgsfield" />
        )}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-6 md:min-h-[56px] md:px-1 md:py-2.5">
          <p className="text-[13px] text-t3">
            {made > 0 ? `${made.toLocaleString()} ${made === 1 ? "shot" : "shots"}` : BLURB}
          </p>
          {made > 0 && (
            <div className="flex items-center gap-2">
              {view === "grid" && <DensityControl />}
              <ViewToggle view={view} onChange={setView} />
            </div>
          )}
        </div>
        {made === 0 ? (
          <div className="grid flex-1 place-items-center px-4 py-10 text-center md:py-16">
            <div className="max-w-[460px]">
              <p className="text-[30px] leading-[1.08] tracking-[-0.03em] text-t1 md:text-[44px]">No shots yet.</p>
              <p className="mx-auto mt-4 max-w-[360px] text-[13px] leading-relaxed text-t3">
                Set the camera, the film, the light and the palette, describe the shot, and generate. What you make here stays
                here, and shows up in Assets and on the Video page too.
              </p>
            </div>
          </div>
        ) : (
          <div className="md:px-1">
            <Gallery modelId={CINEMA} view={view} />
          </div>
        )}
      </section>
    </div>
  );
}
