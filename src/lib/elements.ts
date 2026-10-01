/**
 * The Elements library: characters, places, products and styles kept with
 * their reference pictures, to be called into any prompt with `@name`.
 *
 * Called `LibraryElement` in code because "elements" already names Kling's
 * own per-request elements (a field kind of the registry); in the studio
 * both are simply Elements.
 */
import { activeFields, type ModelDef, type Values } from "@/lib/registry";
import type { MediaRef } from "@/lib/media";

export type ElementKind = "character" | "location" | "product" | "style";

export interface LibraryElement {
  id: string;
  kind: ElementKind;
  /** Written after `@` in a prompt: "emir", "depo", "green-puffer". */
  name: string;
  /** One to ten reference pictures; the first is the cover. */
  images: MediaRef[];
  /** A short description added to the prompt wherever the element is called. */
  notes?: string;
  createdAt: number;
}

export const ELEMENT_KINDS: Array<{ id: ElementKind; label: string; plural: string }> = [
  { id: "character", label: "Character", plural: "Characters" },
  { id: "location", label: "Location", plural: "Locations" },
  { id: "product", label: "Product", plural: "Products" },
  { id: "style", label: "Style", plural: "Styles" },
];

export const MAX_ELEMENT_IMAGES = 10;

/** A name as it can follow `@`: lower case, words joined by dashes. */
export function elementName(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenOf(name: string): RegExp {
  return new RegExp(`(^|[\\s(])@${escapeRegExp(name)}(?=$|[\\s.,!?;:)'"])`, "g");
}

/** The library elements a prompt calls, in the order it first calls them. */
export function calledElements(text: string, elements: LibraryElement[]): LibraryElement[] {
  return elements
    .map((element) => ({ element, at: text.search(tokenOf(element.name)) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ element }) => element);
}

/**
 * The prompt as a model should read it: `@emir` becomes "emir", and each
 * called element's notes follow at the end. A model never sees our `@`.
 */
export function spellElements(text: string, elements: LibraryElement[]): string {
  const called = calledElements(text, elements);
  if (called.length === 0) return text;
  let out = text;
  for (const element of called) out = out.replace(tokenOf(element.name), (_m, lead: string) => `${lead}${element.name}`);
  const notes = called.filter((e) => e.notes?.trim()).map((e) => `${e.name}: ${e.notes!.trim()}`);
  return notes.length > 0 ? `${out.trimEnd()}\n\n${notes.join("\n")}` : out;
}

/** The values to send, with every prompt's library elements spelled out. */
export function withLibraryElements(model: ModelDef, values: Values, elements: LibraryElement[]): Values {
  if (elements.length === 0) return values;
  const next = { ...values };
  for (const field of activeFields(model, values)) {
    const text = next[field.key];
    if (field.placement === "prompt" && typeof text === "string") next[field.key] = spellElements(text, elements);
  }
  return next;
}
