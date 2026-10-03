"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Justified rows: the gallery layout where every row is one height and runs
 * edge to edge, and each piece takes the width its shape gives it at that
 * height. Unlike fixed columns, a wide strip and a tall portrait sit side by
 * side at a sensible size instead of one becoming a sliver and the other a
 * tower.
 *
 * Shapes are clamped for the layout only: anything wider than 2.5:1 or taller
 * than 1:2 is shown cropped to that box (the enlarged view shows it whole),
 * so no tile is ever too thin for its buttons.
 */
export const WIDEST = 2.5;
export const TALLEST = 0.5;

export interface Box {
  width: number;
  height: number;
  /** Which row the tile landed in, counted from 0. */
  row: number;
  /** Where it stands in the frame, from its top left corner. */
  x: number;
  y: number;
}

/**
 * Lays `ratios` out in rows `width` wide with `gap` between tiles, aiming
 * for `target` px of height. A row ends where its height lands closest to
 * the target; the last row keeps the target height and is not stretched.
 */
export function justify(ratios: number[], width: number, target: number, gap: number): Box[] {
  const boxes: Box[] = [];
  if (!(width > 0) || ratios.length === 0) return boxes;
  const shape = ratios.map((r) => Math.min(WIDEST, Math.max(TALLEST, r || 1)));

  let start = 0;
  let row = 0;
  let top = 0;
  while (start < shape.length) {
    // Grow the row one tile at a time until it would be wider than the space
    // at the target height, then keep whichever row length puts the row's
    // height nearest the target.
    let sum = 0;
    let end = start;
    let bestEnd = start + 1;
    let bestHeight = Infinity;
    while (end < shape.length) {
      sum += shape[end];
      end++;
      const height = (width - gap * (end - start - 1)) / sum;
      if (Math.abs(height - target) < Math.abs(bestHeight - target)) {
        bestEnd = end;
        bestHeight = height;
      }
      if (height < target) break;
    }
    // A last row too short to fill the width keeps the target height and
    // stays ragged, rather than being blown up to span it.
    const ragged = bestEnd === shape.length && bestHeight > target;
    const height = Math.round(ragged ? target : bestHeight);
    let used = 0;
    for (let i = start; i < bestEnd; i++) {
      const box = { width: Math.floor(shape[i] * height), height, row, x: used + gap * (i - start), y: top };
      used += box.width;
      boxes.push(box);
    }
    // Flooring each width leaves the row a few pixels short of the edge;
    // the last tile takes them, so every full row ends flush.
    if (!ragged) boxes[boxes.length - 1].width += width - gap * (bestEnd - start - 1) - used;
    start = bestEnd;
    row++;
    top += height + gap;
  }
  return boxes;
}

/**
 * How tall the rows aim to be at a density step: roughly what the old
 * column count gave a square, with a floor so a tile always has room for its
 * select mark and action buttons.
 */
export function rowTarget(width: number, density: number): number {
  const perRow = Math.max(2, Math.min(6, density));
  return Math.round(Math.min(560, Math.max(150, (width / perRow) * 0.85)));
}

/** The width of an element, kept current as it resizes. */
export function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Floored, never rounded up: a row laid out a fraction wider than the
    // frame would wrap its last tile onto a line of its own.
    const read = () => setWidth(Math.floor(node.getBoundingClientRect().width));
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
