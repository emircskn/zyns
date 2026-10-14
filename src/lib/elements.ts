/**
 * The Elements library: characters, places, products and styles kept with
 * their reference pictures, to be called into any prompt with `@name`.
 *
 * Called `LibraryElement` in code because "elements" already names Kling's
 * own per-request elements (a field kind of the registry); in the studio
 * both are simply Elements.
 */
import type { IconName } from "@/components/Icon";
import { activeFields, type ModelDef, type Values } from "@/lib/registry";
import type { MediaRef } from "@/lib/media";
import type { SoulState, SoulVersion } from "@/lib/higgsfield/client";

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
  /** Which take of it this is ("v1", "v2"), for keeping versions apart. */
  version?: string;
  /** Where it stands: a draft, ready to use, or set aside. */
  status?: ElementStatus;
  /** Anything else worth saying about it ("eyes": "green"); added to the prompt with the notes. */
  props?: Record<string, string>;
  /**
   * A Soul ID character: one Higgsfield trained from pictures for one Soul
   * model. It is used by that model alone, by its id rather than its
   * pictures; a character without one is a sheet, for every other model.
   */
  soul?: { id: string; version: SoulVersion; state: SoulState; error?: string };
  createdAt: number;
}

/** Which Soul model each Soul ID is trained for, as Higgsfield names them. */
export const SOUL_MODELS: Array<{ version: SoulVersion; label: string; modelId: string }> = [
  { version: "cinema", label: "Soul Cinema", modelId: "hf-soul-cinema" },
  { version: "v2", label: "Soul 2.0", modelId: "hf-soul-2" },
  { version: "v1", label: "Soul 1.0", modelId: "hf-soul" },
];

/** The Soul ID version a model takes, if it is one of the Soul models. */
export function soulVersionOf(modelId: string | undefined): SoulVersion | undefined {
  return SOUL_MODELS.find((m) => m.modelId === modelId)?.version;
}

/** Soul ID characters ready for this version. */
export function soulsFor(elements: LibraryElement[], version: SoulVersion): LibraryElement[] {
  return elements.filter((e) => inUse(e) && e.soul?.version === version && e.soul.state === "completed");
}

/** What a picker offers to send as pictures: in use, and kept with pictures rather than a Soul ID. */
export function pickable(element: LibraryElement): boolean {
  return inUse(element) && !element.soul;
}

/** The characters any other model takes: those kept with pictures (sheets), not Soul IDs. */
export function isSheet(element: LibraryElement): boolean {
  return !element.soul;
}

export type ElementStatus = "draft" | "ready" | "archived";
export const ELEMENT_STATUSES: Array<{ id: ElementStatus; label: string }> = [
  { id: "draft", label: "Draft" },
  { id: "ready", label: "Ready" },
  { id: "archived", label: "Archived" },
];

/** Archived elements stay in the library but are not offered anywhere to pick. */
export function inUse(element: LibraryElement): boolean {
  return element.status !== "archived";
}

/** What is said about an element in the prompt: its notes, then its own properties. */
export function elementNotes(element: LibraryElement): string {
  const props = Object.entries(element.props ?? {})
    .filter(([k, v]) => k.trim() && v.trim())
    .map(([k, v]) => `${k.trim()} ${v.trim()}`);
  return [element.notes?.trim(), ...props].filter(Boolean).join(", ");
}

export const ELEMENT_KINDS: Array<{ id: ElementKind; label: string; plural: string; icon: IconName }> = [
  { id: "character", label: "Character", plural: "Characters", icon: "smile" },
  { id: "location", label: "Location", plural: "Locations", icon: "landscape" },
  { id: "product", label: "Product", plural: "Products", icon: "shapes" },
  { id: "style", label: "Style", plural: "Styles", icon: "palette" },
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
  const notes = called.filter((e) => elementNotes(e)).map((e) => `${e.name}: ${elementNotes(e)}`);
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
