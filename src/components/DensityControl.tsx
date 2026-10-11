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

  return (
    <>
      {/* A phone picks through this rather than a long press, which iOS
          also reads as selecting text or opening the picture's own menu. */}
      <div className="flex items-center gap-1.5 md:hidden">
        <SelectToggle />
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
        selectMode ? "bg-t1/[0.1] text-t1 ring-1 ring-inset ring-line-strong" : "bg-t1/[0.07] text-t1"
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
    <div role="radiogroup" aria-label="Layout" className="flex h-9 items-center gap-0.5 rounded-full bg-t1/[0.07] p-1">
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
          className={`grid h-7 w-8 place-items-center rounded-full transition-colors duration-[120ms] ${
            phoneGrid === grid ? "bg-t1/[0.14] text-t1" : "text-t3"
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
  );
}
