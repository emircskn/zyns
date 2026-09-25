import { activeFields } from "@/lib/registry";
import type { Field, ModelDef, Values } from "@/lib/registry/types";

/**
 * Some models let the prompt point at a named asset with `@name`: Kling's
 * elements, Kling Omni subjects, PixVerse fusion references. These helpers
 * find those fields and the names currently defined in them.
 */
export interface MentionSource {
  field: Field;
  nameKey: string;
}

export function mentionSources(model: ModelDef, values: Values): MentionSource[] {
  return activeFields(model, values).flatMap((field) => {
    if (field.kind === "elements") return [{ field, nameKey: "name" }];
    if (field.kind === "records") {
      const column = field.itemFields?.find((c) => c.key === "ref_name" || c.key === "name");
      if (column) return [{ field, nameKey: column.key }];
    }
    return [];
  });
}

export function mentionNames(model: ModelDef, values: Values): string[] {
  const names = new Set<string>();
  for (const { field, nameKey } of mentionSources(model, values)) {
    const rows = values[field.key];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const name = String((row as Record<string, unknown>)?.[nameKey] ?? "").trim();
      if (name) names.add(name);
    }
  }
  return [...names];
}

/** The `@partial` token the caret is sitting on, if any. */
export function mentionAtCaret(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = /(^|\s)@([^\s@]*)$/.exec(before);
  if (!match) return null;
  return { start: caret - match[2].length - 1, query: match[2] };
}

/** Replace `[start, caret)` with `@name ` and report where the caret lands. */
export function insertMention(text: string, start: number, caret: number, name: string) {
  const token = `@${name} `;
  const next = text.slice(0, start) + token + text.slice(caret);
  return { text: next, caret: start + token.length };
}

/** Which of the defined names the prompt already uses. */
export function usedMentions(text: string, names: string[]): Set<string> {
  const used = new Set<string>();
  for (const name of names) {
    if (new RegExp(`(^|\\s)@${escapeRegExp(name)}(?=\\s|$|[.,!?;:])`).test(text)) used.add(name);
  }
  return used;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The attached reference pictures, by number.
 *
 * Models that take several pictures read the prompt against their order
 * ("the jacket from Image 2"), so the prompt may point at one with
 * `@Image N`. The bar shows such a token as a chip and the send spells it
 * the way the model reads it. Models with named elements keep their own
 * `@name` instead: there `@` belongs to the API.
 */
const IMAGE_TOKEN = /@Image (\d+)(?!\d)/g;

export function imageFields(model: ModelDef, values: Values): Field[] {
  if (mentionSources(model, values).length > 0) return [];
  return activeFields(model, values).filter(
    (f) => f.placement === "input" && (f.accept ?? "image") === "image" && !/mask/.test(f.key),
  );
}

/** The pictures `@Image 1…N` stand for, in the order the model gets them. */
export function imageRefs(model: ModelDef, values: Values): string[] {
  return imageFields(model, values).flatMap((field) => {
    const value = values[field.key];
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string" && !!v);
    return typeof value === "string" && value ? [value] : [];
  });
}

export function imageName(index: number) {
  return `Image ${index + 1}`;
}

/** Where each `@Image N` sits in the text, with the picture it names. */
export function imageTokens(text: string): { start: number; end: number; index: number }[] {
  return [...text.matchAll(IMAGE_TOKEN)].map((match) => ({
    start: match.index!,
    end: match.index! + match[0].length,
    index: Number(match[1]) - 1,
  }));
}

/**
 * Keep the tokens on their pictures when some are taken out: the ones after
 * move up a number, and a token for a removed picture goes with it. Only a
 * plain removal is followed; a strip emptied by a send, or replaced
 * wholesale, leaves the prompt as written.
 */
export function followRemoval(text: string, before: string[], after: string[]): string {
  if (after.length === 0 || after.length >= before.length) return text;
  const moved = new Map<number, number>();
  let j = 0;
  for (let i = 0; i < before.length && j < after.length; i++) {
    if (before[i] === after[j]) moved.set(i, j++);
  }
  if (j !== after.length) return text;
  let out = "";
  let last = 0;
  for (const token of imageTokens(text)) {
    if (token.index >= before.length) continue;
    out += text.slice(last, token.start);
    last = token.end;
    const index = moved.get(token.index);
    if (index !== undefined) out += `@${imageName(index)}`;
    else if (text[last] === " ") last++;
    else if (out.endsWith(" ")) out = out.slice(0, -1);
  }
  return out + text.slice(last);
}

/**
 * The prompt as the model should read it: `@Image 2` becomes `Image 2`, or
 * `[Image 2]` where the model's docs ask for that. Tokens past the pictures
 * attached are left as typed.
 */
export function spellImageMentions(text: string, count: number, bracketed: boolean): string {
  return text.replace(IMAGE_TOKEN, (token, n: string) => {
    const index = Number(n) - 1;
    if (index < 0 || index >= count) return token;
    return bracketed ? `[Image ${n}]` : `Image ${n}`;
  });
}

/** The values to send, with every prompt's `@Image N` spelled out. */
export function withImageMentions(model: ModelDef, values: Values): Values {
  const count = imageRefs(model, values).length;
  if (count === 0) return values;
  const next = { ...values };
  for (const field of activeFields(model, values)) {
    const text = next[field.key];
    if (field.placement !== "prompt" || typeof text !== "string") continue;
    next[field.key] = spellImageMentions(text, count, /\[Image 1\]/.test(field.help ?? ""));
  }
  return next;
}
