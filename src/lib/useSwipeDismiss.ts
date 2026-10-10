"use client";

import { useCallback, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

/** Where a flick would come to rest, as a scroll view decelerates (Apple's projection). */
function project(velocity: number, rate = 0.998) {
  return ((velocity / 1000) * rate) / (1 - rate);
}

/** Past the edge it still follows, but less and less: a soft wall, not a hard stop. */
function rubberband(over: number, size: number, k = 0.55) {
  return (over * size * k) / (size + k * Math.abs(over));
}

/**
 * A phone sheet that can be pulled down to close. The grip (its header)
 * moves the sheet 1:1 under the finger from where it was grabbed; letting
 * go judges by where the flick would land, not where the finger stopped, so
 * a quick short flick closes it as surely as a long slow drag. Upward it
 * resists instead of moving. Kept from closing, it settles back without a
 * bounce. Mice and wide screens are left alone.
 *
 * Returns the props for the grip. The sheet's backdrop, when it is the
 * sheet's previous sibling, dims with it.
 */
export function useSwipeDismiss(sheet: RefObject<HTMLElement | null>, onClose: () => void) {
  const onPointerDown = useCallback(
    (down: ReactPointerEvent<HTMLElement>) => {
      const node = sheet.current;
      if (!node || down.pointerType === "mouse" || window.innerWidth >= 640) return;
      if ((down.target as Element).closest("input, textarea, select, [contenteditable='true'], [data-no-swipe]")) return;
      const grip = down.currentTarget;
      const backdrop = node.previousElementSibling instanceof HTMLElement ? node.previousElementSibling : null;
      const height = node.getBoundingClientRect().height || window.innerHeight;
      const y0 = down.clientY;
      const x0 = down.clientX;
      const trail: Array<{ y: number; t: number }> = [{ y: y0, t: down.timeStamp }];
      let dragging = false;
      let offset = 0;

      const place = (y: number) => {
        offset = y > 0 ? y : rubberband(y, height);
        node.style.transform = `translate3d(0, ${offset}px, 0)`;
        if (backdrop) backdrop.style.opacity = String(Math.max(0, 1 - Math.max(0, offset) / height));
      };

      const move = (event: PointerEvent) => {
        if (event.pointerId !== down.pointerId) return;
        const dy = event.clientY - y0;
        trail.push({ y: event.clientY, t: event.timeStamp });
        if (trail.length > 6) trail.shift();
        if (!dragging) {
          // A few pixels first, and mostly downward, so a tap or a sideways swipe stays one.
          if (Math.abs(dy) < 10 || Math.abs(dy) < Math.abs(event.clientX - x0)) return;
          dragging = true;
          try {
            grip.setPointerCapture(down.pointerId);
          } catch {
            // The finger may already be gone; the window listeners follow it anyway.
          }
          // From where it is now: an entry still running is taken over, not finished first.
          const live = getComputedStyle(node).transform;
          node.style.animation = "none";
          node.style.transition = "none";
          node.style.transform = live === "none" ? "" : live;
          if (backdrop) {
            backdrop.style.animation = "none";
            backdrop.style.transition = "none";
          }
        }
        event.preventDefault();
        place(dy);
      };

      const up = (event: PointerEvent) => {
        if (event.pointerId !== down.pointerId) return;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (!dragging) return;
        // A drag is not also a press on whatever the finger started on.
        const swallow = (click: MouseEvent) => {
          click.stopPropagation();
          click.preventDefault();
        };
        window.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);

        const first = trail[0];
        const last = trail[trail.length - 1];
        const velocity = last.t > first.t ? ((last.y - first.y) / (last.t - first.t)) * 1000 : 0;
        const closing = velocity > 0 && offset + project(velocity) > height * 0.5;
        if (closing) {
          // On at the finger's own speed, so letting go has no seam.
          const left = height - offset;
          const ms = Math.round(Math.min(320, Math.max(160, (left / Math.max(velocity, 1)) * 1000)));
          node.style.transition = `transform ${ms}ms cubic-bezier(0.2, 0.9, 0.3, 1)`;
          node.style.transform = `translate3d(0, ${height}px, 0)`;
          if (backdrop) {
            backdrop.style.transition = `opacity ${ms}ms linear`;
            backdrop.style.opacity = "0";
          }
          setTimeout(onClose, ms);
        } else {
          node.style.transition = "transform 400ms cubic-bezier(0.32, 0.72, 0, 1)";
          node.style.transform = "translate3d(0, 0, 0)";
          if (backdrop) {
            backdrop.style.transition = "opacity 400ms cubic-bezier(0.32, 0.72, 0, 1)";
            backdrop.style.opacity = "";
          }
          // The entry stays stopped (letting it go would play it again), until
          // the sheet is closed some other way: then its exit plays as usual.
          const watch = new MutationObserver(() => {
            if (!/-out\b/.test(node.className)) return;
            watch.disconnect();
            for (const el of [node, backdrop]) {
              if (!el) continue;
              el.style.animation = "";
              el.style.transition = "";
              el.style.transform = "";
              el.style.opacity = "";
            }
          });
          watch.observe(node, { attributes: true, attributeFilter: ["class"] });
        }
      };

      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [sheet, onClose],
  );

  return { onPointerDown, style: { touchAction: "pan-x" as const } };
}
