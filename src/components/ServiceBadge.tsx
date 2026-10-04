import { BRAND_ICONS } from "@/lib/brandIcons";
import type { Provider } from "@/lib/registry";

/**
 * KIE's mark, from its own site's icon. Used as a mask and filled with the
 * text colour, so it reads in one colour like every other mark in the studio.
 */
const KIE_MARK = "data:image/png;base64,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";

/** A service's own mark, drawn in the current text colour. */
export function ServiceMark({ provider, size = 12 }: { provider: Provider; size?: number }) {
  if (provider === "higgsfield") {
    const icon = BRAND_ICONS.higgsfield;
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" fillRule="evenodd" aria-hidden="true" className="shrink-0">
        {icon?.body}
      </svg>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="block shrink-0 bg-current"
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${KIE_MARK})`,
        maskImage: `url(${KIE_MARK})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

/**
 * Which service made a piece, small in a tile's top-left corner: the
 * service's mark on a dark disc. The select mark takes its place on hover.
 */
export function ServiceBadge({ provider, small, hidden }: { provider: Provider; small?: boolean; hidden?: boolean }) {
  return (
    <span
      role="img"
      aria-label={`Made with ${provider === "higgsfield" ? "Higgsfield" : "KIE"}`}
      title={provider === "higgsfield" ? "Higgsfield" : "KIE"}
      className={`pointer-events-none absolute left-2 top-2 z-[5] grid place-items-center rounded-full bg-black/60 text-white transition-opacity duration-[150ms] ${
        small ? "h-5 w-5" : "h-6 w-6"
      } ${hidden ? "opacity-0" : "group-hover:opacity-0"}`}
    >
      <ServiceMark provider={provider} size={small ? 11 : 13} />
    </span>
  );
}
