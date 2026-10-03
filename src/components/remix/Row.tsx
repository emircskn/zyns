"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

/**
 * One line of the Remix composer, the way Higgsfield's Genjutsu lays its
 * settings out: a small label over the value, and a chevron where a tap
 * opens something. Without `onClick` it only states what is there.
 */
export function Row({
  label,
  value,
  lead,
  onClick,
  chevron = "right",
  open,
  children,
}: {
  label: string;
  value: ReactNode;
  /** A picture or badge before the words. */
  lead?: ReactNode;
  onClick?: () => void;
  chevron?: "right" | "down";
  /** For a row that opens in place (chevron down): whether it is open. */
  open?: boolean;
  /** What opens under the row. */
  children?: ReactNode;
}) {
  const inner = (
    <>
      {lead}
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] text-t3">{label}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[15px] text-t1">{value}</span>
      </span>
      {onClick && (
        <Icon
          name="chevron"
          size={18}
          className="shrink-0 text-t3 transition-transform duration-[200ms]"
          style={{ transform: chevron === "right" ? "rotate(-90deg)" : open ? "rotate(180deg)" : "none" }}
        />
      )}
    </>
  );
  return (
    <div className="overflow-hidden rounded-panel bg-elevated">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-expanded={chevron === "down" ? !!open : undefined}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-[120ms] hover:bg-t1/[0.03]"
        >
          {inner}
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
      )}
      {children}
    </div>
  );
}

/** A dashed place to drop something into, as Higgsfield's empty boxes are. */
export function Dropzone({
  icons,
  title,
  sub,
  action,
  onClick,
}: {
  icons: ReactNode;
  title: string;
  sub?: string;
  /** A second way in, under the words. */
  action?: ReactNode;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-panel border-[1.5px] border-dashed border-line-strong bg-elevated px-4 py-8 text-center transition-colors duration-[150ms] hover:bg-t1/[0.03] active:bg-t1/[0.05]"
    >
      <span className="flex items-center">{icons}</span>
      <span className="flex flex-col gap-1">
        <span className="text-[16px] font-medium leading-snug text-t1">{title}</span>
        {sub && <span className="text-[13px] text-t3">{sub}</span>}
      </span>
      {action && (
        <span onClick={(event) => event.stopPropagation()} className="contents">
          {action}
        </span>
      )}
    </div>
  );
}

export function RoundIcon({ name, overlap }: { name: Parameters<typeof Icon>[0]["name"]; overlap?: boolean }) {
  return (
    <span
      className={`grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-t1 ring-2 ring-elevated shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] ${
        overlap ? "-ml-3" : ""
      }`}
    >
      <Icon name={name} size={20} />
    </span>
  );
}

/** The pill buttons inside the boxes ("Select from the Motion library"). */
export function Pill({ icon, children, onClick, strong }: { icon?: Parameters<typeof Icon>[0]["name"]; children: ReactNode; onClick: () => void; strong?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] transition-colors duration-[120ms] ${
        strong ? "cta font-medium" : "bg-t1/[0.08] text-t1 hover:bg-t1/[0.13]"
      }`}
    >
      {icon && <Icon name={icon} size={15} />}
      {children}
    </button>
  );
}

/** A switch, for the Prompt row. */
export function Switch({ on, onFlip, label }: { on: boolean; onFlip: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onFlip}
      className={`relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-[200ms] ${on ? "bg-t1" : "bg-t1/[0.18]"}`}
    >
      <span
        className={`absolute top-[3px] h-6 w-6 rounded-full transition-all duration-[200ms] ${on ? "bg-canvas" : "bg-t1/85"}`}
        style={{ left: on ? 25 : 3, transitionTimingFunction: "var(--ease-spring)" }}
      />
    </button>
  );
}
