"use client";

import { Range } from "@/components/Range";
import { Icon } from "@/components/Icon";
import { useStudio } from "@/store/studio";

const STEPS = [2, 3, 4, 5, 6];

/**
 * How tightly the gallery packs. Bigger tiles to look at something, smaller
 * ones to find something — one control either way, so the page does not need
 * a settings panel for a single number.
 */
export function DensityControl({ select = true }: { select?: boolean } = {}) {

  return (
    <>
      {/* A phone picks through this rather than a long press, which iOS
          also reads as selecting text or opening the picture's own menu. */}
      <div className="flex items-center gap-1.5 md:hidden">
        {select && <SelectToggle />}
        <PhoneGridToggle />
      </div>

    <DensitySlider />
    </>
  );
}

/** A phone's Select: tiles pick on a tap until it is pressed again (Cancel). */
export function SelectToggle() {
  const selectMode = useStudio((s) => s.selectMode);
  const setSelectMode = useStudio((s) => s.setSelectMode);
  return (
    <button
      type="button"
      onClick={() => setSelectMode(!selectMode)}
      aria-pressed={selectMode}
      className={`h-9 rounded-full px-3.5 text-[13.5px] font-medium transition-colors duration-[120ms] ${
        selectMode ? "bg-t1/[0.12] text-t1" : "bg-t1/[0.05] text-t1 hover:bg-t1/[0.1]"
      }`}
    >
      {selectMode ? "Cancel" : "Select"}
    </button>
  );
}

/**
 * A phone's two layouts, side by side so both are in view: one piece of
 * media at its own size, or everything at once in a grid.
 */
export function PhoneGridToggle() {
  const phoneGrid = useStudio((s) => s.phoneGrid);
  const setPhoneGrid = useStudio((s) => s.setPhoneGrid);
  return (
    <div role="radiogroup" aria-label="Layout" className="flex h-9 items-center gap-0.5 rounded-card bg-t1/[0.05] p-1">
      {([
        [false, "square", "One at a time"],
        [true, "grid", "Grid"],
      ] as const).map(([grid, icon, label]) => (
        <button
          key={icon}
          type="button"
          role="radio"
          aria-checked={phoneGrid === grid}
          aria-label={label}
          onClick={() => setPhoneGrid(grid)}
          className={`grid h-7 w-8 place-items-center rounded-chip transition-colors duration-[120ms] ${
            phoneGrid === grid ? "bg-t1/[0.12] text-t1" : "text-t3 hover:text-t1"
          }`}
        >
          <Icon name={icon} size={15} />
        </button>
      ))}
    </div>
  );
}

/** A desktop's tile size, as a slider. */
export function DensitySlider() {
  const density = useStudio((s) => s.density);
  const setDensity = useStudio((s) => s.setDensity);
  // A slider rather than a stepper: the tiles resize under the thumb as it
  // moves, so the size is chosen by looking rather than by counting.
  return (
    <label className="hidden items-center gap-2.5 rounded-card bg-t1/[0.05] py-1.5 pl-3 pr-3.5 md:flex">
      <Icon name="grid" size={14} className="shrink-0 text-t4" />
      {/* Read backwards: the most across at the left, the fewest (and so the biggest tiles) at the right, as the icons either side say. */}
      <Range
        min={STEPS[0]}
        max={STEPS[STEPS.length - 1]}
        value={STEPS[0] + STEPS[STEPS.length - 1] - density}
        label="Tile size"
        title={`${density} across`}
        onChange={(n) => setDensity(STEPS[0] + STEPS[STEPS.length - 1] - n)}
        className="w-[96px]"
      />
      <Icon name="expand" size={14} className="shrink-0 text-t4" />
    </label>
  );
}
