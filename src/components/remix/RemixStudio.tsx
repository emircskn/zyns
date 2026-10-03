"use client";

import { PillGroup } from "@/components/PillGroup";
import { RemixPage } from "@/components/remix/RemixPage";
import { MODE_LABEL } from "@/lib/remix/targets";
import type { RemixMode } from "@/lib/remix/types";
import { useStudio } from "@/store/studio";

const MODES: RemixMode[] = ["motion", "swap", "restyle"];

export function ModeTabs() {
  const mode = useStudio((s) => s.remix.mode);
  const patchRemix = useStudio((s) => s.patchRemix);
  return (
    <PillGroup
      fill
      value={mode}
      onChange={(next) => patchRemix({ mode: next })}
      items={MODES.map((id) => ({ id, label: MODE_LABEL[id] }))}
    />
  );
}

/** The Remix page with everything it holds wired in. */
export function RemixStudio({ onKeyClick }: { onKeyClick: () => void }) {
  return (
    <RemixPage
      onKeyClick={onKeyClick}
      composer={
        <div className="flex flex-col gap-3 rounded-panel border border-line bg-elevated p-3">
          <ModeTabs />
        </div>
      }
    />
  );
}
