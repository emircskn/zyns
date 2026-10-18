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
      className="inline-grid h-4 w-4 place-items-center text-t3 hover:text-t1"
    >
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="8" cy="8" r="6.6" strokeWidth="1.2" />
        <circle cx="8" cy="5" r="0.55" fill="currentColor" strokeWidth="0.9" />
        <path d="M8 7.4v3.8" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
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
