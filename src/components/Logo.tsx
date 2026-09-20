"use client";

/**
 * The ZYNS brand marks, rebuilt as outlines from the supplied artwork so they
 * need no webfont and cannot reflow.
 *
 * Both are monochrome by design, so they take tokens rather than fixed
 * colours. The mark's tile is the text colour and its letter is the page: in
 * the dark theme that reads as a cream chip with a black Z, since the
 * artwork's own black tile would sink into the near-black canvas, and in the
 * light theme it lands back on the original black tile with a cream letter.
 */
const Z_GLYPH = "M74-825L753-825L344-165L726-165L726 0L16 0L424-660L74-660L74-825Z";

export function ZynsMark({
  size = 24,
  tile = "var(--t1)",
  ink = "var(--canvas)",
  className,
}: {
  size?: number;
  tile?: string;
  ink?: string;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <rect width="100" height="100" rx="7.5" fill={tile} />
      {/* Placed by the proportions measured off the original: the glyph box
          sits at 11.47%/15.18% and the full stop at 76.89%/70.94%. */}
      <g transform="translate(11.47 15.18) scale(0.08445) translate(-16 825)" fill={ink}>
        <path d={Z_GLYPH} />
      </g>
      <rect x="76.89" y="70.94" width="13.13" height="14" fill={ink} />
    </svg>
  );
}

/**
 * The wordmark, set the way the artwork sets it: lowercase, and tracked in
 * far enough that the letters overlap and merge into one shape. That overlap
 * is why this is outlines and not text — no tracking value reproduces it.
 *
 * `height` is the whole ink box, descender included; the letters themselves
 * are 67%% of it.
 */
const WORD_RATIO = 2.2867;

export function ZynsWordmark({ height = 20, className }: { height?: number; className?: string }) {
  return (
    <svg
      width={height * WORD_RATIO}
      height={height}
      viewBox="0 0 1801.94 788"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M47-513L556-513L302-135L536-135L536 0L5 0L259-378L47-378L47-513Z" transform="translate(-5.00 528.00)" />
      <path d="M327-250L449-513L653-513L250 260L46 260L223-80L-20-513L184-513L327-250Z" transform="translate(382.98 528.00)" />
      <path d="M237 0L60 0L60-513L237-513L237-459L239-459Q308-528 386-528L386-528Q424-528 461.50-518Q499-508 533.50-487Q568-466 589.50-427.50Q611-389 611-338L611-338L611 0L434 0L434-290Q434-330 408.50-360Q383-390 342-390L342-390Q302-390 269.50-359Q237-328 237-290L237-290L237 0Z" transform="translate(848.96 528.00)" />
      <path d="M283-528L283-528Q327-528 370-518Q413-508 434-498L434-498L455-488L397-372Q337-404 283-404L283-404Q253-404 240.50-397.50Q228-391 228-373L228-373Q228-369 229-365Q230-361 233-357.50Q236-354 238.50-351.50Q241-349 247-346Q253-343 256.50-341.50Q260-340 268-337Q276-334 280-332.50Q284-331 293.50-328Q303-325 308-324L308-324Q339-315 362-304Q385-293 410.50-274Q436-255 450-226Q464-197 464-160L464-160Q464 15 221 15L221 15Q166 15 116.50-2Q67-19 45-36L45-36L23-54L95-175Q103-168 116-158.50Q129-149 163-132.50Q197-116 222-116L222-116Q277-116 277-153L277-153Q277-170 263-179.50Q249-189 215.50-201Q182-213 163-223L163-223Q115-248 87-279.50Q59-311 59-363L59-363Q59-441 119.50-484.50Q180-528 283-528Z" transform="translate(1337.94 528.00)" />
    </svg>
  );
}

/** Mark plus wordmark, for the header and anywhere the name is spelled out. */
export function ZynsLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-t1 ${className}`}>
      <ZynsMark size={size} />
      {/* Sized off the mark so the letters sit at the tile's own letter height. */}
      <ZynsWordmark height={size * 0.84} className="relative -top-px" />
      <span className="sr-only">ZYNS</span>
    </span>
  );
}
