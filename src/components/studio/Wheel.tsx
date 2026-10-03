"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import type { Choice } from "@/lib/registry";
import { previewOf } from "@/lib/studio/options";

const ITEM = 40;
const SHOWN = 5;

/**
 * A vertical wheel of choices, as a camera body's dial reads: the one in the
 * middle band is the one chosen. Scrolled, tapped or stepped with the arrow
 * keys; it settles on a choice once it stops.
 */
export function Wheel({
  field,
  label,
  choices,
  value,
  onChange,
}: {
  /** The field's key, for the pictures of its choices. */
  field?: string;
  label: string;
  choices: Choice[];
  value: unknown;
  onChange: (value: string) => void;
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

  return (
    <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2">
      <p className="text-center text-[11.5px] font-medium uppercase tracking-[0.08em] text-t3">{label}</p>
      {field && <WheelPicture field={field} choice={choices[live]} />}
      <div className="relative rounded-panel bg-t1/[0.04]">
        {/* The band the chosen one sits in. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-1.5 rounded-card bg-t1/[0.09]"
          style={{ top: ITEM * Math.floor(SHOWN / 2), height: ITEM }}
        />
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
          className="no-bar relative snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]"
          style={{ height: ITEM * SHOWN, paddingBlock: ITEM * Math.floor(SHOWN / 2) }}
        >
          {choices.map((choice, index) => {
            const away = Math.abs(index - live);
            return (
              <button
                key={choice.value || "auto"}
                type="button"
                role="option"
                aria-selected={index === chosen}
                onClick={() => turnTo(index)}
                className={`flex w-full snap-center items-center justify-center truncate px-2 text-[13.5px] transition-[color,opacity] duration-[120ms] ${
                  away === 0 ? "font-medium text-t1" : "text-t3"
                }`}
                style={{ height: ITEM, opacity: away === 0 ? 1 : away === 1 ? 0.7 : 0.4 }}
              >
                <span className="truncate">{choice.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The camera body, lens or aperture the wheel is on, pictured over it. */
function WheelPicture({ field, choice }: { field: string; choice: Choice | undefined }) {
  const image = choice ? previewOf(field, choice.value)?.image : undefined;
  return (
    <div className="grid aspect-[16/10] place-items-center overflow-hidden rounded-panel bg-t1/[0.04]">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={image} src={image} alt="" draggable={false} className="anim-fade h-full w-full object-contain p-1.5" />
      ) : (
        <Icon name={choice?.value === "" ? "camera" : "spark"} size={22} className="text-t3" />
      )}
    </div>
  );
}
