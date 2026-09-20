"use client";

/**
 * The ZYNS mark: a Z whose horizontal bars carry the text colour and whose
 * diagonal carries the accent — the same amber that rides the prompt bar's
 * edge. No badge, so it sits on any surface, and `currentColor` lets it
 * invert with the theme without a second asset.
 */
export function ZynsMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.8}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M8 8h16" />
      <path d="M24 8L8 24" stroke="var(--accent)" />
      <path d="M8 24h16" />
    </svg>
  );
}

/** Mark plus wordmark, for the header and anywhere the name is spelled out. */
export function ZynsLogo({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-t1 ${className}`}>
      <ZynsMark size={size} />
      <span className="text-[15px] font-semibold tracking-[0.14em]">ZYNS</span>
    </span>
  );
}
