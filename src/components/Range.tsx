"use client";

/**
 * The studio's one slider: a track that is always there, filled up to the
 * value, and a round knob on it. The native range input sits invisible over
 * the whole thing, so dragging, tapping and the keyboard all work as usual.
 * `empty` draws the knob hollow at the start: nothing chosen yet ("Auto").
 */
export function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
  empty = false,
  label,
  title,
  className = "",
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  empty?: boolean;
  label: string;
  title?: string;
  className?: string;
}) {
  const share = empty ? 0 : Math.min(100, Math.max(0, ((value - min) / (max - min || 1)) * 100));
  return (
    <div className={`group/range relative h-5 min-w-0 ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-t1/[0.12]">
        <div className="h-full rounded-full bg-gradient-to-r from-t1/50 to-t1" style={{ width: `${share}%` }} />
      </div>
      {/* Kept inside the track at both ends: offset by its own share of its width. */}
      <span className="pointer-events-none absolute top-1/2" style={{ left: `${share}%`, transform: `translate(-${share}%, -50%)` }}>
        <span
          data-round
          className={`block h-4 w-4 rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.45)] transition-transform duration-[120ms] group-hover/range:scale-110 group-active/range:scale-95 ${
            empty ? "border-2 border-t1/60 bg-[var(--elevated)]" : "bg-white"
          }`}
        />
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        title={title}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range-input absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
