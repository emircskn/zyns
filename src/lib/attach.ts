import { activeFields, defaultValues, getModel, type Field, type Values } from "@/lib/registry";
import { useStudio } from "@/store/studio";

export type MediaKind = "image" | "video" | "audio";

/**
 * A field the bar's one "+" fills: pictures, clips or sound taken as files.
 * A mask is painted rather than chosen, and a trimmed clip carries its own
 * editor, so both keep their slots.
 */
export function isAttachField(field: Field): boolean {
  return (field.kind === "images" || field.kind === "media") && !/mask/i.test(field.key);
}

export function kindOf(field: Field): MediaKind {
  return field.accept ?? "image";
}

export function urlsIn(field: Field, value: unknown): string[] {
  if (field.kind === "images") return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && !!v) : [];
  return typeof value === "string" && value ? [value] : [];
}

/** How many more a field takes. */
export function roomIn(field: Field, value: unknown): number {
  if (field.kind === "images") return (field.maxItems ?? Infinity) - urlsIn(field, value).length;
  return urlsIn(field, value).length ? 0 : 1;
}

function attachFields(model: NonNullable<ReturnType<typeof getModel>>, values: Values): Field[] {
  return activeFields(model, values).filter((f) => f.placement === "input" && isAttachField(f));
}

/**
 * Puts picked media where it belongs: each item in the first field that
 * takes its kind and has room, in the order the model lists them (so two
 * pictures on a video model are its first frame, then its last).
 *
 * A field can appear only once the one before it is filled (a last frame
 * after a first), so this goes round again with the settled values until
 * nothing more fits. Returns what found no place.
 */
export function attachMedia(picked: Array<{ url: string; kind: MediaKind }>): Array<{ url: string; kind: MediaKind }> {
  let rest = picked;
  for (let pass = 0; pass < 4 && rest.length > 0; pass++) {
    const state = useStudio.getState();
    const model = getModel(state.modelId);
    if (!model) return rest;
    const values = state.valuesByModel[state.modelId] ?? defaultValues(model);
    const fields = attachFields(model, values);
    const next: Record<string, unknown> = {};
    const left: typeof rest = [];
    for (const item of rest) {
      const field = fields.find((f) => kindOf(f) === item.kind && roomIn(f, next[f.key] ?? values[f.key]) > 0);
      if (!field) {
        left.push(item);
        continue;
      }
      const current = next[field.key] ?? values[field.key];
      next[field.key] = field.kind === "images" ? [...urlsIn(field, current), item.url] : item.url;
    }
    for (const [key, value] of Object.entries(next)) useStudio.getState().setValue(key, value);
    if (left.length === rest.length) break;
    rest = left;
  }
  return rest;
}
