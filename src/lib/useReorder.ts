"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";

/**
 * Press and hold a tile, then drag it to a new place in its row. The same
 * on a phone and with a mouse: a touch that moves before the hold is up is
 * a scroll and is left alone; a mouse may also start by simply dragging.
 * The others step aside while it moves, and it settles into its slot when
 * let go. Tiles move only among those of the same group (one picture slot),
 * so a picture never lands in a slot meant for something else.
 */

const HOLD_MS = 280;
const SLOP = 8;
/** How near a scrolling row's edge the finger must be for it to scroll on. */
const EDGE = 32;
const SETTLE_MS = 180;

interface Drag {
  from: number;
  to: number;
  dx: number;
  dy: number;
  settling: boolean;
}

/** The nearest box that scrolls sideways, which the row's slots move with. */
function scrollerOf(node: HTMLElement): HTMLElement | null {
  for (let el = node.parentElement; el; el = el.parentElement) {
    const { overflowX } = getComputedStyle(el);
    if (overflowX === "auto" || overflowX === "scroll") return el;
  }
  return null;
}

export function useReorder(count: number, onMove: (from: number, to: number) => void, groupOf?: (index: number) => string) {
  const nodes = useRef<(HTMLElement | null)[]>([]);
  const rects = useRef<DOMRect[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const stop = useRef<(() => void) | null>(null);
  const latest = useRef({ count, onMove, groupOf });
  latest.current = { count, onMove, groupOf };

  useEffect(() => () => stop.current?.(), []);

  function start(index: number, x: number, y: number, touch: boolean, target: EventTarget | null) {
    if (stop.current || (target as Element | null)?.closest?.("button, a, input, textarea")) return;
    const { count, groupOf } = latest.current;
    const group = groupOf?.(index) ?? "";
    const members = Array.from({ length: count }, (_, k) => k).filter((k) => (groupOf?.(k) ?? "") === group);
    if (members.length < 2) return;

    let began = false;
    let px = x;
    let py = y;
    let to = index;
    let grabX = 0;
    let grabY = 0;
    let scroller: HTMLElement | null = null;
    let scroll0 = 0;
    let frame = 0;

    const shift = () => (scroller?.scrollLeft ?? 0) - scroll0;

    const update = () => {
      const r = rects.current;
      const cx = px + shift();
      let best = index;
      let nearest = Infinity;
      for (const k of members) {
        const d = (r[k].left + r[k].width / 2 - cx) ** 2 + (r[k].top + r[k].height / 2 - py) ** 2;
        if (d < nearest) [nearest, best] = [d, k];
      }
      to = best;
      setDrag({ from: index, to, dx: px - grabX - (r[index].left - shift()), dy: py - grabY - r[index].top, settling: false });
    };

    const tick = () => {
      if (scroller && scroller.scrollWidth > scroller.clientWidth) {
        const box = scroller.getBoundingClientRect();
        // Faster the deeper into the edge, so a tile just inside it can still be reached.
        const into = Math.max(box.left + EDGE - px, px - (box.right - EDGE), 0);
        const step = Math.ceil((Math.min(into, EDGE) / EDGE) * 9) * (px < box.left + EDGE ? -1 : 1);
        if (step) {
          scroller.scrollLeft += step;
          update();
        }
      }
      frame = requestAnimationFrame(tick);
    };

    const begin = () => {
      const node = nodes.current[index];
      if (!node) return cleanup();
      began = true;
      rects.current = nodes.current.map((n) => n?.getBoundingClientRect() ?? new DOMRect());
      scroller = scrollerOf(node);
      scroll0 = scroller?.scrollLeft ?? 0;
      grabX = px - rects.current[index].left;
      grabY = py - rects.current[index].top;
      navigator.vibrate?.(8);
      update();
      frame = requestAnimationFrame(tick);
    };

    const move = (nx: number, ny: number) => {
      px = nx;
      py = ny;
      if (began) return update();
      if (Math.hypot(nx - x, ny - y) > SLOP) {
        // A finger that moves first is scrolling; a mouse is dragging.
        if (touch) cleanup();
        else {
          window.clearTimeout(hold);
          begin();
        }
      }
    };

    const finish = () => {
      if (!began) return cleanup();
      const from = index;
      const r = rects.current;
      cleanup();
      // Glide into the slot it was let go over, then take the new order.
      setDrag({ from, to, dx: r[to].left - r[from].left, dy: r[to].top - r[from].top, settling: true });
      // The click that ends a mouse drag is not a tap on whatever is under it.
      const swallow = (event: Event) => {
        event.stopPropagation();
        event.preventDefault();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
      window.setTimeout(() => {
        setDrag(null);
        if (to !== from) latest.current.onMove(from, to);
      }, SETTLE_MS);
    };

    const onTouchMove = (event: TouchEvent) => {
      const t = event.touches[0];
      if (!t) return;
      // Once it is held, the finger moves the tile, not the page.
      if (began && event.cancelable) event.preventDefault();
      move(t.clientX, t.clientY);
    };
    const onPointerMove = (event: PointerEvent) => move(event.clientX, event.clientY);
    const onCancel = () => {
      cleanup();
      setDrag(null);
    };

    const hold = window.setTimeout(begin, HOLD_MS);

    function cleanup() {
      window.clearTimeout(hold);
      cancelAnimationFrame(frame);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", finish);
      window.removeEventListener("touchcancel", onCancel);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", onCancel);
      stop.current = null;
    }

    if (touch) {
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", finish);
      window.addEventListener("touchcancel", onCancel);
    } else {
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", onCancel);
    }
    stop.current = cleanup;
  }

  /** What one tile spreads on its outer element. */
  function bind(index: number) {
    let style: CSSProperties | undefined;
    if (drag) {
      const r = rects.current;
      const { from, to } = drag;
      if (index === from) {
        style = {
          transform: `translate(${drag.dx}px, ${drag.dy}px) scale(${drag.settling ? 1 : 1.06})`,
          transition: drag.settling ? `transform ${SETTLE_MS}ms var(--ease-spring)` : "none",
          zIndex: 30,
          position: "relative",
          filter: drag.settling ? undefined : "drop-shadow(0 10px 18px rgb(0 0 0 / 0.4))",
          cursor: "grabbing",
        };
      } else {
        // Between where it was and where it is going, each steps one slot over.
        const by = from < to && index > from && index <= to ? -1 : from > to && index >= to && index < from ? 1 : 0;
        const there = r[index + by];
        const dx = by && there ? there.left - r[index].left : 0;
        const dy = by && there ? there.top - r[index].top : 0;
        style = { transform: `translate(${dx}px, ${dy}px)`, transition: "transform 200ms var(--ease-spring)" };
      }
    }
    return {
      ref: (node: HTMLElement | null) => {
        nodes.current[index] = node;
      },
      style,
      className: "select-none [-webkit-touch-callout:none]",
      onPointerDown: (event: ReactPointerEvent) => {
        if (event.pointerType === "touch" || event.button !== 0) return;
        start(index, event.clientX, event.clientY, false, event.target);
      },
      onTouchStart: (event: ReactTouchEvent) => {
        if (event.touches.length !== 1) return;
        const t = event.touches[0];
        start(index, t.clientX, t.clientY, true, event.target);
      },
      // A long press would otherwise open the browser's own menu for the picture.
      onContextMenu: (event: MouseEvent) => event.preventDefault(),
      onDragStart: (event: DragEvent) => event.preventDefault(),
    };
  }

  return { bind, dragging: drag !== null };
}

/** The list with one item taken out and put back at another place. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Keys that stay with each url when the list is reordered (the second copy of one is `#2`). */
export function keysFor(urls: string[]): string[] {
  const seen = new Map<string, number>();
  return urls.map((url) => {
    const n = (seen.get(url) ?? 0) + 1;
    seen.set(url, n);
    return `${url}#${n}`;
  });
}
