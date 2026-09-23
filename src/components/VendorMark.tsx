import { BRAND_ICONS } from "@/lib/brandIcons";
import { brandOf, vendorMark } from "@/lib/vendors";

/**
 * A model's maker, on a plain tile: the maker's own mark in the text colour
 * where one is on file, and a two-letter monogram where it is not. No brand
 * colour anywhere in the studio, so the tile is a step off the canvas and the
 * mark is drawn like text.
 */
export function VendorBadge({
  model,
  size = 22,
}: {
  model: { id: string; vendor: string };
  size?: number;
}) {
  const brand = brandOf(model.id);
  const icon = brand ? BRAND_ICONS[brand] : undefined;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-chip bg-t1/[0.09] font-semibold tracking-[-0.03em] text-t2"
      title={icon?.title ?? model.vendor}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {icon ? (
        // A little over half the tile: the marks are drawn edge to edge on
        // their 24-point box, so at full size they would touch the frame.
        <svg
          viewBox="0 0 24 24"
          width={Math.round(size * 0.6)}
          height={Math.round(size * 0.6)}
          fill="currentColor"
          fillRule="evenodd"
          aria-hidden="true"
        >
          {icon.body}
        </svg>
      ) : (
        vendorMark(model.vendor)
      )}
    </span>
  );
}
