"use client";

import { useEffect, useRef } from "react";

/**
 * The surface the studio stands on: a field of dots in the text colour,
 * almost invisible at rest, that lifts and brightens around the pointer and
 * carries a ring outward from a click. It is the page's black background
 * made answerable — nothing to read, nothing to click, just a sense that the
 * empty part of the screen is a surface rather than a void.
 *
 * Three layers, each as cheap as it can be. The field at rest is a CSS
 * background, so sitting there costs nothing. The pool of light is one
 * gradient in a div the pointer drags around by transform, which the
 * compositor handles without a repaint. Only the lit dots are drawn, from
 * sprites stamped once per brightness rather than an arc each. And the loop
 * runs only while something is happening: it starts on a pointer event and
 * stops half a second after the last one, so an idle studio spends no frames
 * on it. Reduced motion gets the field and none of the movement.
 */

/** Grid spacing, how far the pointer reaches, and how far a dot leans. */
const STEP = 28;
const REACH = 112;
const SHIFT = 2.5;
/** A ring travels this many pixels a second, fading as it goes. */
const RING_SPEED = 620;
const RING_LIFE = 1100;
const RING_BAND = 64;
/** How many brightnesses the dots are stamped at. */
const STEPS = 7;

function inkOf(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--t1").trim();
  const hex = raw.replace("#", "");
  if (hex.length !== 6) return [250, 250, 250];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

export function Backdrop() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = canvas.current;
    const light = glow.current;
    const ctx = node?.getContext("2d");
    if (!node || !ctx || !light) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let ink = inkOf();
    /** What was painted last frame, so only that has to be cleared. */
    let dirty: Array<[number, number, number, number]> = [];
    /** One stamp per brightness: a dot drawn once and then copied about. */
    let sprites: HTMLCanvasElement[] = [];
    const pointer = { x: -1e5, y: -1e5, near: 0 };
    let rings: Array<{ x: number; y: number; born: number }> = [];
    let frame = 0;
    let until = 0;

    function bake() {
      const [r, g, b] = ink;
      sprites = [];
      for (let i = 0; i < STEPS; i++) {
        const lift = (i + 1) / STEPS;
        const radius = 1 + lift * 1.15;
        const size = Math.ceil((radius + 1) * 2 * dpr);
        const stamp = document.createElement("canvas");
        stamp.width = size;
        stamp.height = size;
        const paint = stamp.getContext("2d")!;
        paint.setTransform(dpr, 0, 0, dpr, 0, 0);
        paint.fillStyle = `rgba(${r},${g},${b},${0.055 + lift * 0.26})`;
        paint.beginPath();
        paint.arc(size / (2 * dpr), size / (2 * dpr), radius, 0, Math.PI * 2);
        paint.fill();
        sprites.push(stamp);
      }
    }

    function resize() {
      // A backdrop of soft dots does not need every device pixel, and the
      // clear and the upload each frame are paid for by the pixel.
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = node!.clientWidth;
      height = node!.clientHeight;
      node!.width = Math.round(width * dpr);
      node!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = [];
      bake();
      draw();
    }

    /** Stamp the dot whose brightness is nearest `lift`. */
    function stamp(x: number, y: number, lift: number, dx = 0, dy = 0) {
      const index = Math.min(STEPS - 1, Math.max(0, Math.round(lift * STEPS) - 1));
      const sprite = sprites[index];
      if (!sprite) return;
      const half = sprite.width / (2 * dpr);
      ctx!.drawImage(sprite, x + dx - half, y + dy - half, half * 2, half * 2);
    }

    function draw() {
      const now = performance.now();
      // Only what was lit last frame needs clearing: the field underneath is
      // a background image, not something drawn here.
      for (const [x, y, w, h] of dirty) ctx!.clearRect(x, y, w, h);
      dirty = [];
      rings = rings.filter((ring) => now - ring.born < RING_LIFE);

      // The dots the pointer can reach. Everything else is the background
      // image, already on screen.
      if (pointer.near > 0.01) {
        const pad = REACH + SHIFT + 4;
        dirty.push([pointer.x - pad, pointer.y - pad, pad * 2, pad * 2]);
        const first = (v: number) => Math.max(0, Math.floor((v - REACH) / STEP));
        const last = (v: number, max: number) =>
          Math.min(Math.ceil(max / STEP), Math.ceil((v + REACH) / STEP));
        for (let iy = first(pointer.y); iy <= last(pointer.y, height); iy++) {
          const y = iy * STEP + STEP / 2;
          const ay = y - pointer.y;
          for (let ix = first(pointer.x); ix <= last(pointer.x, width); ix++) {
            const x = ix * STEP + STEP / 2;
            const ax = x - pointer.x;
            const d2 = ax * ax + ay * ay;
            if (d2 >= REACH * REACH) continue;
            const distance = Math.sqrt(d2);
            // Squared falloff: a tight pool of light rather than a wash.
            const fall = (1 - distance / REACH) ** 2 * pointer.near;
            const push = (fall * SHIFT) / (distance || 1);
            stamp(x, y, fall, ax * push, ay * push);
          }
        }
      }

      // And the dots each ring is crossing, found from the band it is in
      // rather than by walking the whole grid.
      for (const ring of rings) {
        const age = now - ring.born;
        const radius = (age / 1000) * RING_SPEED;
        const fade = 1 - age / RING_LIFE;
        const inner = Math.max(0, radius - RING_BAND);
        const outer = radius + RING_BAND;
        const inner2 = inner * inner;
        const outer2 = outer * outer;
        const pad = outer + 4;
        dirty.push([ring.x - pad, ring.y - pad, pad * 2, pad * 2]);
        const first = (v: number) => Math.max(0, Math.floor((v - outer) / STEP));
        const last = (v: number, max: number) =>
          Math.min(Math.ceil(max / STEP), Math.ceil((v + outer) / STEP));
        for (let iy = first(ring.y); iy <= last(ring.y, height); iy++) {
          const y = iy * STEP + STEP / 2;
          const ay = y - ring.y;
          for (let ix = first(ring.x); ix <= last(ring.x, width); ix++) {
            const x = ix * STEP + STEP / 2;
            const ax = x - ring.x;
            const d2 = ax * ax + ay * ay;
            if (d2 < inner2 || d2 > outer2) continue;
            const band = Math.abs(Math.sqrt(d2) - radius);
            stamp(x, y, Math.exp(-((band / 30) ** 2)) * 0.9 * fade);
          }
        }
      }
    }

    function tick() {
      const now = performance.now();
      // The pool of light fades in and out rather than snapping on.
      const target = now < until ? 1 : 0;
      pointer.near += (target - pointer.near) * 0.12;
      light!.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      light!.style.opacity = String(pointer.near);
      draw();
      if (now < until || rings.length > 0 || pointer.near > 0.01) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        pointer.near = 0;
        light!.style.opacity = "0";
        draw();
      }
    }

    function wake(ms = 500) {
      until = performance.now() + ms;
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function onMove(event: PointerEvent) {
      if (reduce) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      wake();
    }

    function onDown(event: PointerEvent) {
      if (reduce) return;
      // A ring belongs to the surface, not to the button that was pressed.
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [role='button'], [role='menu']")) {
        return;
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      rings.push({ x: event.clientX, y: event.clientY, born: performance.now() });
      if (rings.length > 3) rings.shift();
      wake();
    }

    const themes = new MutationObserver(() => {
      ink = inkOf();
      bake();
      draw();
    });

    const sizes = new ResizeObserver(resize);
    sizes.observe(node);
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    resize();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      sizes.disconnect();
      themes.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={canvas} className="backdrop-field h-full w-full" />
      <span ref={glow} className="backdrop-glow" style={{ opacity: 0 }} />
    </div>
  );
}
