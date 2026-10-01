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
  const phoneGrid = useStudio((s) => s.phoneGrid);
  const setPhoneGrid = useStudio((s) => s.setPhoneGrid);
  const selectMode = useStudio((s) => s.selectMode);
  const setSelectMode = useStudio((s) => s.setSelectMode);

  return (
    <>
      {/* A phone picks through this rather than a long press, which iOS
          also reads as selecting text or opening the picture's own menu. */}
      <div className="flex items-center gap-1.5 md:hidden">
        <button
          type="button"
          onClick={() => setSelectMode(!selectMode)}
          aria-pressed={selectMode}
          className={`h-9 rounded-full px-3.5 text-[13.5px] font-medium transition-colors duration-[120ms] ${
            selectMode ? "bg-t1 text-canvas" : "bg-t1/[0.07] text-t1"
          }`}
        >
          {selectMode ? "Cancel" : "Select"}
        </button>
        {/* Two answers on a phone, so one button that switches between them:
            everything at once, or one piece of media at its own size. */}
        <button
          type="button"
          onClick={() => setPhoneGrid(!phoneGrid)}
          aria-label={phoneGrid ? "Show one at a time" : "Show as a grid"}
          className="grid h-9 w-9 place-items-center rounded-full bg-t1/[0.07] text-t1 transition-colors duration-[120ms]"
        >
          <Icon name={phoneGrid ? "square" : "grid"} size={16} />
        </button>
      </div>

    {/* A slider rather than a stepper: the tiles resize under the thumb as
        it moves, so the size is chosen by looking rather than by counting. */}
    <label className="hidden items-center gap-2.5 rounded-full bg-t1/[0.07] py-1.5 pl-3 pr-3.5 md:flex">
      <Icon name="grid" size={14} className="shrink-0 text-t4" />
      <input
        type="range"
        min={STEPS[0]}
        max={STEPS[STEPS.length - 1]}
        step={1}
        // Read backwards: the most across at the left, the fewest (and so
        // the biggest tiles) at the right.
        value={STEPS[0] + STEPS[STEPS.length - 1] - density}
        aria-label="Tile size"
        title={`${density} across`}
        // More tiles to the left, bigger ones to the right, which is the
        // way the two icons either side of it read.
        onChange={(event) => setDensity(STEPS[0] + STEPS[STEPS.length - 1] - Number(event.target.value))}
        className="density-range h-1 w-[96px] cursor-ew-resize appearance-none rounded-full bg-t1/[0.18]"
      />
      <Icon name="expand" size={14} className="shrink-0 text-t4" />
    </label>
    </>
  );
}
