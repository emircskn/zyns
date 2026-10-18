"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

/**
 * A small (i) that explains a choice on hover. The note is drawn fixed to the
 * screen: the list it sits in scrolls, and would cut a note drawn inside it.
 */
export function InfoDot({ text }: { text: string }) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  return (
    <span
      role="note"
      aria-label={text}
      onClick={(event) => event.stopPropagation()}
      onMouseEnter={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        setAt({ x: Math.min(Math.max(box.left + box.width / 2, 115), window.innerWidth - 115), y: box.top - 8 });
      }}
      onMouseLeave={() => setAt(null)}
      className="grid h-[18px] w-[18px] place-items-center rounded-full text-[11px] font-semibold italic leading-none text-t3 ring-1 ring-inset ring-current hover:text-t1"
    >
      i
      {at && createPortal(
        <span
          className="pointer-events-none fixed z-[200] w-[210px] -translate-x-1/2 -translate-y-full rounded-card bg-[var(--popover)] px-3 py-2 text-left text-[12px] font-normal not-italic leading-snug text-t2 ring-1 ring-inset ring-edge"
          style={{ left: at.x, top: at.y, boxShadow: "var(--shadow-pop)" }}
        >
          {text}
        </span>,
        document.body,
      )}
    </span>
  );
}
