/**
 * Pictures and clips for Cinema Studio's choices, from a snapshot of
 * Higgsfield's own web app (`data/cinema-studio-options.json`, see
 * `docs/zyns-studio-ref/STUDIO-UI.md`). The choices themselves still come
 * from the model's schema: this only adds a preview to a value the schema
 * offers, and a value it has no preview for is shown as text.
 */
import snapshot from "../../../data/cinema-studio-options.json";

export interface OptionPreview {
  /** A still: a camera body or lens, a palette's frame, a clip's poster. */
  image?: string;
  /** A short loop showing the choice, played where there is room for it. */
  video?: string;
  /** A palette's colours, in order. */
  colors?: string[];
}

interface Entry {
  value: string | null;
  media?: { type?: string; url?: string; poster?: string };
}

interface Palette {
  value: string;
  image?: string;
  hex?: string[];
}

const byField = new Map<string, Map<string, OptionPreview>>();

for (const [key, entries] of Object.entries(snapshot.video as Record<string, Entry[]>)) {
  const map = new Map<string, OptionPreview>();
  for (const entry of entries) {
    const media = entry.media;
    if (!media?.url) continue;
    // Auto is the empty choice here, as it is in the schema.
    const value = entry.value ?? "";
    map.set(value, media.type === "video" ? { image: media.poster, video: media.url } : { image: media.url });
  }
  byField.set(key, map);
}

const palettes = new Map<string, OptionPreview>();
for (const palette of snapshot.color_palette as Palette[]) {
  palettes.set(palette.value, { image: palette.image, colors: palette.hex });
}
byField.set("color_palette", palettes);

/** The preview for one choice of a field, if the snapshot has one. */
export function previewOf(key: string, value: unknown): OptionPreview | undefined {
  return byField.get(key)?.get(typeof value === "string" ? value : "");
}

/** Whether a field's choices have previews at all, so its grid can be laid out for them. */
export function hasPreviews(key: string): boolean {
  return (byField.get(key)?.size ?? 0) > 0;
}
