"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

/**
 * One line of the Remix composer, drawn as the Video composer's Model row
 * is: a small label over the value, and a chevron where a tap opens something.
 */
export function Row({
  label,
  value,
  lead,
  onClick,
}: {
  label: string;
  value: ReactNode;
  /** A picture or badge before the words. */
  lead?: ReactNode;
  onClick?: () => void;
}) {
  const inner = (
    <>
      {lead}
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] text-t3">{label}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-[14.5px] font-medium text-t1">{value}</span>
      </span>
      {onClick && <Icon name="chevron" size={16} className="-rotate-90 shrink-0 text-t3" />}
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-panel bg-t1/[0.05] px-3.5 py-2.5 text-left transition-colors duration-[120ms] hover:bg-t1/[0.08]"
    >
      {inner}
    </button>
  ) : (
    <div className="flex w-full items-center gap-3 rounded-panel bg-t1/[0.05] px-3.5 py-2.5">{inner}</div>
  );
}

