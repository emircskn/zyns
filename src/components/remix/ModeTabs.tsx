"use client";

import { Icon, type IconName } from "@/components/Icon";
import type { RemixMode } from "@/lib/remix/types";
import { useStudio } from "@/store/studio";

/** Short enough for three to share a phone's row; the banner says each in full. */
const MODES: Array<{ id: RemixMode; icon: IconName; label: string }> = [
  { id: "motion", icon: "move", label: "Motion" },
  { id: "swap", icon: "switch", label: "Swap" },
  { id: "restyle", icon: "palette", label: "Restyle" },
];

/** Motion transfer · Swap · Restyle, as one segmented row. */
export function ModeTabs() {
  const mode = useStudio((s) => s.remix.mode);
  const patchRemix = useStudio((s) => s.patchRemix);
  return (
    <div role="tablist" aria-label="Remix mode" className="flex gap-1 rounded-panel border border-line bg-elevated p-1">
      {MODES.map(({ id, icon, label }) => {
        const on = id === mode;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => patchRemix({ mode: id })}
            className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-card px-2 text-[14px] transition-colors duration-[150ms] ${
              on ? "bg-t1/[0.1] text-t1 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]" : "text-t3 hover:text-t1"
            }`}
          >
            <Icon name={icon} size={16} className="shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
