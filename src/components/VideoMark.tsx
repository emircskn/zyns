import { Icon } from "@/components/Icon";

/**
 * Says a tile is a clip: on a still first frame it reads as a picture
 * otherwise. A label, not a button — it sits in a corner and takes no tap,
 * so it never looks like it would start playing.
 */
export function VideoMark({ tiny, className = "bottom-1.5 left-1.5" }: { tiny?: boolean; className?: string }) {
  return (
    <span
      aria-label="Video"
      className={`pointer-events-none absolute z-[4] grid place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm ${
        tiny ? "h-[18px] w-[18px]" : "h-6 w-6"
      } ${className}`}
    >
      <Icon name="video" size={tiny ? 10 : 13} />
    </span>
  );
}
