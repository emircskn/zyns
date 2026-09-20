"use client";

import { Icon } from "@/components/Icon";
import { useStudio } from "@/store/studio";

const STEPS = [2, 3, 4, 5, 6];

/**
 * How tightly the gallery packs. Bigger tiles to look at something, smaller
 * ones to find something — one control either way, so the page does not need
 * a settings panel for a single number.
 */
export function DensityControl() {
  const density = useStudio((s) => s.density);
  const setDensity = useStudio((s) => s.setDensity);
  const at = STEPS.indexOf(density);
  const step = (direction: -1 | 1) => {
    const next = STEPS[Math.min(STEPS.length - 1, Math.max(0, (at === -1 ? 2 : at) + direction))];
    if (next) setDensity(next);
  };

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-t1/[0.07] p-1">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={density <= STEPS[0]}
        aria-label="Bigger tiles"
        title="Bigger tiles"
        className="grid h-8 w-8 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:text-t1 disabled:opacity-35 disabled:hover:text-t3"
      >
        <Icon name="expand" size={15} />
      </button>
      <span className="w-5 text-center font-mono text-[11px] tabular-nums text-t3">{density}</span>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={density >= STEPS[STEPS.length - 1]}
        aria-label="Smaller tiles"
        title="Smaller tiles"
        className="grid h-8 w-8 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:text-t1 disabled:opacity-35 disabled:hover:text-t3"
      >
        <Icon name="grid" size={15} />
      </button>
    </div>
  );
}
