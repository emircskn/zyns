"use client";

import { useRef } from "react";
import type { Provider } from "@/lib/registry";
import { GLIDE_TRANSITION, useGlide } from "@/lib/useGlide";
import { useStudio } from "@/store/studio";

const OPTIONS: Array<{ id: Provider; label: string; short: string }> = [
  { id: "kie", label: "KIE AI", short: "KIE" },
  { id: "higgsfield", label: "Higgsfield", short: "Higgsfield" },
];

/**
 * The service the studio makes things with. One tap swaps the models on
 * offer and the key that pays; each keeps its own key, its own last-used
 * models, and runs already sent carry on with the service they went to.
 */
export function ProviderSwitch({
  size = "sm",
  onSwitched,
}: {
  /** `xs` is the phone composer's: a header shared with the section's name. */
  size?: "xs" | "sm" | "lg";
  /** After a switch: the phone composer uses it to land on a model at once. */
  onSwitched?: (provider: Provider) => void;
}) {
  const provider = useStudio((s) => s.provider);
  const setProvider = useStudio((s) => s.setProvider);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);
  const has: Record<Provider, boolean> = { kie: !!apiKey, higgsfield: !!hfKey };
  // One cream pill that glides to the chosen service, as the mode strips'
  // does, rather than two buttons swapping colours in place.
  const root = useRef<HTMLDivElement>(null);
  const { box, settled } = useGlide(root, provider, [size]);
  return (
    <div
      ref={root}
      role="radiogroup"
      aria-label="Service"
      className={`relative ${size === "xs" ? "flex" : "grid grid-cols-2"} gap-0.5 rounded-full bg-t1/[0.06] p-0.5 ${size === "lg" ? "text-[13px]" : "text-[12px]"}`}
    >
      {box && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-full bg-t1"
          style={{
            width: box.w,
            height: box.h,
            transform: `translate(${box.x}px, ${box.y}px)`,
            transition: settled ? GLIDE_TRANSITION : "none",
          }}
        />
      )}
      {OPTIONS.map((option) => {
        const on = provider === option.id;
        return (
          <button
            key={option.id}
            data-pill={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              if (on) return;
              setProvider(option.id);
              onSwitched?.(option.id);
            }}
            title={has[option.id] ? `Use ${option.label}` : `Use ${option.label} (no key yet)`}
            className={`relative flex items-center justify-center gap-1.5 rounded-full font-medium transition-[color,transform] duration-[var(--d-slow)] ease-[var(--ease)] active:scale-[0.96] ${
              size === "lg" ? "h-9 px-3" : size === "xs" ? "h-8 px-3" : "h-7 px-2.5"
            } ${on ? "text-canvas" : "text-t3 hover:text-t1"} ${box ? "" : on ? "bg-t1" : ""}`}
          >
            {size === "xs" ? option.short : option.label}
            {/* Whether the service has a key yet: left out where room is short. */}
            {size !== "xs" && (
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-[var(--d-slow)] ${has[option.id] ? (on ? "bg-canvas" : "bg-t2") : on ? "bg-canvas/35" : "bg-t4/60"}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
