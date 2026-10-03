"use client";

import { PillGroup } from "@/components/PillGroup";
import { MODE_LABEL } from "@/lib/remix/targets";
import type { RemixMode } from "@/lib/remix/types";
import { useStudio } from "@/store/studio";

const MODES: RemixMode[] = ["motion", "swap", "restyle"];

/** Motion transfer · Swap · Restyle. */
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
