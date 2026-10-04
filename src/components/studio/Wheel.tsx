"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import type { Choice } from "@/lib/registry";
import { previewOf } from "@/lib/studio/options";

const ITEM = 116;
const SHOWN = 3;

/**
 * A vertical wheel of choices, as a camera's dial reads: each choice a
 * stadium-shaped pill with its picture, and the one in the middle is the one
 * chosen. Scrolled, tapped, stepped with ˄ ˅ or the arrow keys; it settles
 * on a choice once it stops.
 */
export function Wheel({
  field,
  label,
  choices,
  value,
  onChange,
  autoIcon = "camera",
  shaded,
}: {
  /** The field's key, for the pictures of its choices. */
  field?: string;
  label: string;
  choices: Choice[];
  value: unknown;
  onChange: (value: string) => void;
  /** What Auto's pill shows, having no picture. */
  autoIcon?: IconName;
  /** The middle column sits on a slightly lighter ground. */
  shaded?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const chosen = Math.max(0, choices.findIndex((c) => c.value === (value ?? "")));
  const [live, setLive] = useState(chosen);
  const settle = useRef<number | undefined>(undefined);
  // Set while the wheel is turned by us, so the scroll it causes is not read back as a pick.
  const steering = useRef(false);

  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    if (Math.round(node.scrollTop / ITEM) !== chosen) {
      steering.current = true;
      node.scrollTop = chosen * ITEM;
      window.setTimeout(() => (steering.current = false), 60);
    }
    setLive(chosen);
  }, [chosen]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  function pick(index: number) {
    const choice = choices[Math.max(0, Math.min(choices.length - 1, index))];
    if (!choice) return;
    setLive(choices.indexOf(choice));
    if (choice.value !== (value ?? "")) onChange(choice.value);
  }

  function turnTo(index: number) {
    const node = box.current;
    const at = Math.max(0, Math.min(choices.length - 1, index));
    pick(at);
    if (node) {
      steering.current = true;
      node.scrollTo({ top: at * ITEM, behavior: "smooth" });
      window.setTimeout(() => (steering.current = false), 400);
    }
  }

  const step = (by: number, icon: "up" | "down") => (
    <button
      type="button"
      onClick={() => turnTo(live + by)}
      disabled={live + by < 0 || live + by >= choices.length}
      aria-label={by < 0 ? `Previous ${label.toLowerCase()}` : `Next ${label.toLowerCase()}`}
      className="mx-auto grid h-7 w-9 place-items-center rounded-full bg-t1/[0.07] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1 disabled:opacity-30"
    >
      <Icon name="chevron" size={15} className={icon === "up" ? "rotate-180" : ""} />
    </button>
  );

  return (
    <div className={`flex min-w-0 flex-1 flex-col items-stretch gap-2 rounded-panel py-3 ${shaded ? "bg-t1/[0.03]" : ""}`}>
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-t3">{label}</p>
      {step(-1, "up")}
      <div
        ref={box}
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            turnTo(live + (event.key === "ArrowDown" ? 1 : -1));
          }
        }}
        onScroll={(event) => {
          const at = Math.round(event.currentTarget.scrollTop / ITEM);
          setLive(Math.max(0, Math.min(choices.length - 1, at)));
          if (steering.current) return;
          window.clearTimeout(settle.current);
          settle.current = window.setTimeout(() => pick(at), 140);
        }}
        className="no-bar relative snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_78%,transparent)]"
        style={{ height: ITEM * SHOWN, paddingBlock: ITEM * Math.floor(SHOWN / 2) }}
      >
        {choices.map((choice, index) => {
          const on = index === live;
          const image = field ? previewOf(field, choice.value)?.image : undefined;
          return (
            <div key={choice.value || "auto"} className="flex snap-center items-center justify-center px-2" style={{ height: ITEM }}>
              <button
                type="button"
                role="option"
                aria-selected={index === chosen}
                aria-label={choice.label}
                onClick={() => turnTo(index)}
                className={`block h-[100px] w-full max-w-[156px] rounded-full p-[5px] transition-[opacity,box-shadow] duration-[150ms] ${
                  on ? "opacity-100 shadow-[inset_0_0_0_2px_var(--t1)]" : "opacity-60 shadow-[inset_0_0_0_1px_var(--line)]"
                }`}
              >
                {/* The picture fills a stadium of its own inside the frame, so it never runs over the ring. */}
                <span className="relative flex h-full w-full flex-col items-center justify-end overflow-hidden rounded-full bg-black/30 pb-2.5">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" draggable={false} className="absolute inset-0 h-full w-full scale-[1.15] object-cover" />
                  ) : (
                    <Icon name={choice.value === "" ? autoIcon : "spark"} size={24} className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 text-t2" />
                  )}
                  {image && <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />}
                  <span className="relative max-w-full truncate px-3 text-[12px] font-semibold text-white">{choice.label}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {step(1, "down")}
    </div>
  );
}
