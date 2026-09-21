import { vendorMark } from "@/lib/vendors";

/**
 * A vendor's monogram on a plain tile. No brand colour anywhere in the
 * studio, so the tile is a step off the canvas and the letters are text.
 */
export function VendorBadge({ vendor, size = 22 }: { vendor: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-chip bg-t1/[0.09] font-semibold tracking-[-0.03em] text-t2 ring-1 ring-inset ring-line"
      title={vendor}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {vendorMark(vendor)}
    </span>
  );
}
