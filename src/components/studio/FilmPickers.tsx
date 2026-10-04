"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import type { OptionPreview } from "@/lib/studio/options";

export interface PickItem {
  value: string;
  label: string;
  preview?: OptionPreview;
}

/** A choice's loop, or its still, filling its card. */
function Clip({ preview, play }: { preview?: OptionPreview; play: boolean }) {
  return (
    <span className="absolute inset-0 bg-t1/[0.06]">
      {preview?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.image} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {preview?.video && play && (
        <video key={preview.video} src={preview.video} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
      )}
      {!preview && (
        <span className="absolute inset-0 grid place-items-center text-t3">
          <Icon name="film" size={26} />
        </span>
      )}
    </span>
  );
}

/** Steps a horizontal picker by a drag across it, one choice per `per` pixels. */
function useDrag(onStep: (by: number) => void, per = 60) {
  const from = useRef<number | null>(null);
  return {
    onPointerDown: (event: ReactPointerEvent) => {
      from.current = event.clientX;
    },
    onPointerUp: (event: ReactPointerEvent) => {
      if (from.current === null) return;
      const moved = event.clientX - from.current;
      from.current = null;
      const steps = Math.trunc(moved / per);
      if (steps !== 0) onStep(-steps);
    },
    onPointerCancel: () => {
      from.current = null;
    },
  };
}

/** ‹ the chosen one's name › under a picker. */
function Stepper({ label, onStep, atStart, atEnd, big }: { label: ReactNode; onStep: (by: number) => void; atStart: boolean; atEnd: boolean; big?: boolean }) {
  const arrow = (by: number) => (
    <button
      type="button"
      onClick={() => onStep(by)}
      disabled={by < 0 ? atStart : atEnd}
      aria-label={by < 0 ? "Previous" : "Next"}
      className="grid h-8 w-8 place-items-center rounded-full bg-t1/[0.07] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1 disabled:opacity-30"
    >
      <Icon name="chevron" size={16} className={by < 0 ? "rotate-90" : "-rotate-90"} />
    </button>
  );
  return (
    <div className="flex items-center justify-center gap-3">
      {arrow(-1)}
      {big ? label : <span className="min-w-[96px] rounded-full bg-t1/[0.1] px-4 py-1.5 text-center text-[14px] font-semibold text-t1">{label}</span>}
      {arrow(1)}
    </div>
  );
}

function useIndex(items: PickItem[], value: string, onChange: (value: string) => void) {
  const index = Math.max(0, items.findIndex((item) => item.value === value));
  const go = (by: number) => {
    const next = items[Math.max(0, Math.min(items.length - 1, index + by))];
    if (next && next.value !== value) onChange(next.value);
  };
  return { index, go };
}

function keys(go: (by: number) => void) {
  return (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      go(event.key === "ArrowRight" ? 1 : -1);
    }
  };
}

/**
 * Genre: cards on an arc, the chosen one large and playing in the middle,
 * its neighbours tilted away on either side. Turned by the arrows, a drag,
 * the arrow keys or a tap on a neighbour.
 */
export function ArcPicker({ items, value, onChange, label }: { items: PickItem[]; value: string; onChange: (value: string) => void; label: string }) {
  const { index, go } = useIndex(items, value, onChange);
  const drag = useDrag(go);
  return (
    <div className="flex flex-col gap-4" role="listbox" aria-label={label} tabIndex={0} onKeyDown={keys(go)}>
      <div {...drag} className="relative mx-auto h-[210px] w-full max-w-[640px] touch-pan-y select-none overflow-hidden">
        {items.map((item, i) => {
          const d = i - index;
          if (Math.abs(d) > 2) return null;
          const a = Math.abs(d);
          return (
            <button
              key={item.value || "auto"}
              type="button"
              role="option"
              aria-selected={d === 0}
              aria-label={item.label}
              onClick={() => onChange(item.value)}
              className={`absolute left-1/2 top-2 aspect-[16/9] w-[min(316px,72vw)] overflow-hidden rounded-panel transition-[transform,opacity] duration-[320ms] ease-[var(--ease)] ${
                d === 0 ? "z-20 shadow-[0_0_0_2px_color-mix(in_oklab,var(--t1)_35%,transparent)]" : "z-10"
              }`}
              style={{
                transform: `translateX(calc(-50% + ${d * 58}%)) translateY(${a * 26}px) rotate(${d * 14}deg) scale(${1 - a * 0.16})`,
                opacity: d === 0 ? 1 : a === 1 ? 0.55 : 0.25,
                zIndex: 20 - a,
              }}
            >
              <Clip preview={item.preview} play={d === 0} />
            </button>
          );
        })}
      </div>
      <Stepper label={items[index]?.label} onStep={go} atStart={index === 0} atEnd={index === items.length - 1} />
    </div>
  );
}

/**
 * Era: the chosen period playing on top, and under it a ruler to slide
 * along, with the period's name large over the line and its neighbours
 * either side.
 */
export function RulerPicker({ items, value, onChange, label }: { items: PickItem[]; value: string; onChange: (value: string) => void; label: string }) {
  const { index, go } = useIndex(items, value, onChange);
  const drag = useDrag(go, 44);
  const current = items[index];
  return (
    <div className="flex flex-col gap-4" role="listbox" aria-label={label} tabIndex={0} onKeyDown={keys(go)}>
      <div className="relative mx-auto aspect-video w-full max-w-[420px] overflow-hidden rounded-panel">
        <Clip preview={current?.preview} play />
      </div>
      <div {...drag} className="relative mx-auto h-10 w-full max-w-[460px] touch-pan-y select-none overflow-hidden">
        {/* The ticks slide under a fixed mark, one gap per choice. */}
        <div
          className="absolute inset-y-0 flex items-center gap-[7px] transition-transform duration-[320ms] ease-[var(--ease)]"
          style={{ left: "50%", transform: `translateX(${-(index * 6 * 8) - 1}px)` }}
        >
          {Array.from({ length: (items.length - 1) * 6 + 1 }, (_, i) => (
            <span key={i} className={`w-px shrink-0 ${i % 6 === 0 ? "h-6 bg-t2" : "h-3 bg-t4"}`} />
          ))}
        </div>
        <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rounded-full bg-t1" />
      </div>
      <Stepper
        big
        onStep={go}
        atStart={index === 0}
        atEnd={index === items.length - 1}
        label={
          <span className="flex min-w-[220px] items-baseline justify-center gap-4">
            <span className="w-16 text-right text-[13px] text-t4">{items[index - 1]?.label ?? ""}</span>
            <span role="option" aria-selected className="text-[24px] font-bold tracking-[-0.02em] text-t1">
              {current?.label}
            </span>
            <span className="w-16 text-[13px] text-t4">{items[index + 1]?.label ?? ""}</span>
          </span>
        }
      />
    </div>
  );
}

/**
 * Tempo: a row of cards, the chosen one large in the middle and the ones
 * beside it smaller and faded.
 */
export function StripPicker({ items, value, onChange, label }: { items: PickItem[]; value: string; onChange: (value: string) => void; label: string }) {
  const { index, go } = useIndex(items, value, onChange);
  const drag = useDrag(go);
  return (
    <div className="flex flex-col gap-4" role="listbox" aria-label={label} tabIndex={0} onKeyDown={keys(go)}>
      <div {...drag} className="relative mx-auto h-[200px] w-full max-w-[680px] touch-pan-y select-none overflow-hidden">
        {items.map((item, i) => {
          const d = i - index;
          if (Math.abs(d) > 2) return null;
          const a = Math.abs(d);
          return (
            <button
              key={item.value || "auto"}
              type="button"
              role="option"
              aria-selected={d === 0}
              aria-label={item.label}
              onClick={() => onChange(item.value)}
              className="absolute left-1/2 top-1/2 aspect-[16/9] w-[min(300px,68vw)] overflow-hidden rounded-panel transition-[transform,opacity] duration-[320ms] ease-[var(--ease)]"
              style={{
                transform: `translate(calc(-50% + ${d * 82}%), -50%) scale(${d === 0 ? 1 : 0.62})`,
                opacity: d === 0 ? 1 : a === 1 ? 0.45 : 0.15,
                zIndex: 20 - a,
              }}
            >
              <Clip preview={item.preview} play={d === 0} />
            </button>
          );
        })}
      </div>
      <Stepper label={items[index]?.label} onStep={go} atStart={index === 0} atEnd={index === items.length - 1} />
    </div>
  );
}
