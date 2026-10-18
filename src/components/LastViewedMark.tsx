"use client";

import { useStudio } from "@/store/studio";

/** The tile of the media opened last: dimmed a little and marked, so the way back into a long wall is easy to find. */
export function LastViewedMark({ url, small }: { url: string; small?: boolean }) {
  const last = useStudio((s) => s.viewed[0] === url);
  if (!last) return null;
  return (
    <span className="pointer-events-none absolute inset-0 z-[5] grid place-items-center rounded-[inherit] bg-black/45">
      <span className={`flex items-center gap-1.5 font-semibold text-white ${small ? "text-[11px]" : "text-[13px]"}`}>
        <svg width={small ? 14 : 16} height={small ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Last viewed
      </span>
    </span>
  );
}
