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
