import type { LibraryElement } from "@/lib/elements";
import { imageName, imageTokens } from "@/lib/mentions";

/**
 * The `@` tags in a prompt that stand for a picture: `@Image 2`, or an
 * element called by name. One place decides what counts as a tag and when it
 * is dead (its picture is no longer attached), for every prompt box.
 */
export interface RefTag {
  start: number;
  end: number;
  /** Unique per picture, for the hover preview. */
  id: string;
  /** The picture it shows on hover ("" when there is none). */
  url: string;
  /** What the preview calls it, without the `@`. */
  name: string;
  /** Its picture is not attached: drawn struck through, no preview. */
  dead: boolean;
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every library picture, by address: the ones that belong to an element rather than being attached by hand. */
export function elementPictures(library: LibraryElement[]): Set<string> {
  return new Set(library.flatMap((element) => element.images.map((ref) => ref.storageUrl)));
}

/** `refs` are the pictures attached, in the order the model gets them. */
export function refTagsIn(text: string, refs: string[], library: LibraryElement[]): RefTag[] {
  const tags: RefTag[] = imageTokens(text).map((t) => ({
    start: t.start,
    end: t.end,
    id: `i${t.index}`,
    url: refs[t.index] ?? "",
    name: imageName(t.index),
    dead: t.index >= refs.length,
  }));
  for (const element of library) {
    const url = element.images[0]?.storageUrl;
    if (!url || !element.name) continue;
    const dead = !element.images.some((r) => refs.includes(r.storageUrl));
    for (const m of text.matchAll(new RegExp(`(?<=^|[\\s(])@${escape(element.name)}(?![\\w-])`, "g"))) {
      tags.push({ start: m.index!, end: m.index! + m[0].length, id: `e${element.id}`, url, name: element.name, dead });
    }
  }
  return tags.sort((a, b) => a.start - b.start).filter((t, i, all) => i === 0 || t.start >= all[i - 1].end);
}
