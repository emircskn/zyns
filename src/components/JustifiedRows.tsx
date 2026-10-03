"use client";

import { Fragment, useRef, type ReactNode } from "react";
import { justify, rowTarget, useWidth, type Box } from "@/lib/justify";
import { useMediaRatios } from "@/lib/mediaRatio";
import { useStudio } from "@/store/studio";

/** The hairline between tiles: they meet almost edge to edge. */
export const ROW_GAP = 2;

/**
 * The desktop galleries' layout: rows of one height running the full width,
 * each tile as wide as its shape makes it (see lib/justify). The density
 * control sets how tall the rows aim to be. Tiles keep their `data-flip`
 * keys, so useReflow still slides them when a row re-flows.
 */
export function JustifiedRows<T>({
  items,
  keyOf,
  ratioOf,
  render,
}: {
  items: T[];
  keyOf: (item: T) => string;
  /** Width over height, as far as it is known yet. */
  ratioOf: (item: T) => number | undefined;
  render: (item: T, box: Box) => ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const width = useWidth(frame);
  const density = useStudio((s) => s.density);
  // A newly measured shape re-lays the rows; ratioOf reads the measurements.
  useMediaRatios();

  const boxes = width
    ? justify(items.map((item) => ratioOf(item) ?? 1), width, rowTarget(width, density), ROW_GAP)
    : [];

  // One flat run of siblings, each placed where justify() put it, not a div
  // per row: a tile that moves to another row is the same element moving
  // rather than a new one mounting (which would restart its loader and
  // replay its entrance). Placed rather than left to wrap: while a tile's
  // width eases to a new size a row can run a pixel over, and the browser
  // then broke the line somewhere else and the order jumped about.
  const last = boxes[boxes.length - 1];
  return (
    <div ref={frame} className="relative w-full" style={{ height: last ? last.y + last.height : 0 }}>
      {boxes.map((box, i) => (
        <Fragment key={keyOf(items[i])}>{render(items[i], box)}</Fragment>
      ))}
    </div>
  );
}
