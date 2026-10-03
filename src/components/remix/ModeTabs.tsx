"use client";

import { useRef } from "react";
import { PillGroup } from "@/components/PillGroup";
import { MODE_LABEL } from "@/lib/remix/targets";
import type { RemixMode } from "@/lib/remix/types";
import { GLIDE_TRANSITION, useGlide } from "@/lib/useGlide";
import { useStudio } from "@/store/studio";

const MODES: RemixMode[] = ["motion", "swap", "restyle"];

/**
 * Motion transfer · Swap · Restyle, drawn as the Video composer draws its
 * modes: underlined words in the desktop panel, a filled strip on a phone.
 */
export function ModeTabs() {
  const mode = useStudio((s) => s.remix.mode);
  const patchRemix = useStudio((s) => s.patchRemix);
  const root = useRef<HTMLDivElement>(null);
  const { box, settled } = useGlide(root, mode, []);
  const pick = (id: RemixMode) => patchRemix({ mode: id });
  return (
    <>
      <PillGroup
        className="!bg-elevated w-full ring-1 ring-inset ring-line md:hidden"
        fill
        value={mode}
        onChange={pick}
        items={MODES.map((id) => ({ id, label: MODE_LABEL[id] }))}
      />
      <div ref={root} role="tablist" className="no-bar relative -mx-1 hidden shrink-0 gap-4 overflow-x-auto px-1 pb-2 md:flex">
        {MODES.map((id) => {
          const on = id === mode;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              data-pill={id}
              onClick={() => pick(id)}
              className={`shrink-0 whitespace-nowrap pb-1.5 text-[14px] transition-colors duration-[150ms] ${
                on ? "font-semibold text-t1" : "text-t3 hover:text-t1"
              }`}
            >
              {MODE_LABEL[id]}
            </button>
          );
        })}
        {box && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 h-[2px] rounded-full bg-t1"
            style={{
              top: box.y + box.h - 2,
              width: box.w,
              transform: `translateX(${box.x}px)`,
              transition: settled ? GLIDE_TRANSITION : "none",
            }}
          />
        )}
      </div>
    </>
  );
}
