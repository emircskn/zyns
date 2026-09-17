import { vendorMark } from "@/lib/vendors";

export function VendorBadge({ vendor, size = 22 }: { vendor: string; size?: number }) {
  const mark = vendorMark(vendor);
  return (
    <span
      className="grid shrink-0 place-items-center rounded-chip font-semibold tracking-[-0.03em] ring-1 ring-inset ring-white/15"
      title={vendor}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        color: mark.ink ?? "#fff",
        background: `linear-gradient(135deg, ${mark.from}, ${mark.to})`,
      }}
    >
      {mark.glyph}
    </span>
  );
}
