"use client";

import { useRef } from "react";
import { ServiceMark } from "@/components/ServiceBadge";
import type { Provider } from "@/lib/registry";
import { GLIDE_TRANSITION, useGlide } from "@/lib/useGlide";
import { useStudio } from "@/store/studio";

const OPTIONS: Array<{ id: Provider; label: string }> = [
  { id: "kie", label: "KIE AI" },
  { id: "higgsfield", label: "Higgsfield" },
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
      className={`relative ${size === "xs" ? "flex" : "grid grid-cols-2"} gap-0.5 rounded-[10px] bg-t1/[0.05] p-0.5 ring-1 ring-inset ring-line ${size === "lg" ? "text-[13px]" : "text-[12px]"}`}
    >
      {box && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-[8px] bg-[var(--surface-2)] shadow-[0_1px_2px_rgb(0_0_0/0.25)] ring-1 ring-inset ring-line-strong"
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
            aria-label={option.label}
            title={has[option.id] ? `Use ${option.label}` : `Use ${option.label} (no key yet)`}
            className={`relative flex items-center justify-center gap-1.5 rounded-[8px] font-medium transition-colors duration-[100ms] ${
              size === "lg" ? "h-9 px-3" : size === "xs" ? "h-8 px-3.5" : "h-7 px-3"
            } ${on ? "text-t1" : "text-t3 hover:text-t1"} ${box ? "" : on ? "bg-[var(--surface-2)]" : ""}`}
          >
            {/* Each service by its own mark; the key setup also spells it out. */}
            <ServiceMark provider={option.id} size={size === "lg" ? 15 : 14} />
            {size === "lg" && option.label}
            {/* Whether the service has a key yet: left out where room is short. */}
            {size !== "xs" && (
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-[var(--d-slow)] ${has[option.id] ? (on ? "bg-accent" : "bg-t3") : "bg-t4/60"}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
