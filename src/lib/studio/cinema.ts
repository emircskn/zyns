/**
 * Cinema Studio's controls, read off the model's schema. Every option comes
 * from the catalogue: a choice Higgsfield adds shows up here without a
 * change. The fields are only sorted into the cards they belong on; a
 * choice field none of the cards claims gets a card of its own.
 */
import { activeFields, getModel, type Field, type ModelDef, type Values } from "@/lib/registry";
import { getSpec } from "@/lib/registry/hf/auto";

export const CINEMA = "hf-cinema-studio-4";
export const CINEMA_ENDPOINT = "higgsfield/cinema-studio/4.0";

export type CardId = "camera" | "film" | "light" | "palette";

export const CARDS: Array<{ id: CardId; label: string; icon: "camera" | "film" | "sun" | "palette"; keys: (key: string) => boolean }> = [
  { id: "camera", label: "Camera", icon: "camera", keys: (key) => key.startsWith("camera_") },
  { id: "film", label: "Film", icon: "film", keys: (key) => key === "genre" || key === "era" || key === "pacing" },
  { id: "light", label: "Light", icon: "sun", keys: (key) => key === "light" },
  { id: "palette", label: "Palette", icon: "palette", keys: (key) => key === "color_palette" },
];

export function cinemaModel(): ModelDef | undefined {
  return getModel(CINEMA);
}

/** The catalogue's own banner, example prompt and schema. */
export function cinemaSpec() {
  return getSpec(CINEMA_ENDPOINT);
}

function isChoice(field: Field): boolean {
  return field.kind === "select" && (field.choices?.length ?? 0) > 0;
}

/** The choice fields each card holds, in the schema's order. */
export function cardFields(model: ModelDef, values: Values): Record<CardId, Field[]> & { more: Field[] } {
  const choices = activeFields(model, values).filter(isChoice);
  const out = { camera: [], film: [], light: [], palette: [], more: [] } as Record<CardId, Field[]> & { more: Field[] };
  for (const field of choices) {
    const card = CARDS.find((c) => c.keys(field.key));
    out[card ? card.id : "more"].push(field);
  }
  out.camera = cameraOrder(out.camera);
  return out;
}

/** The camera's three wheels (body, lens, aperture) and its one move. */
export function cameraParts(fields: Field[]): { setup: Field[]; movement?: Field } {
  const movement = fields.find((f) => f.key === "camera_movement");
  return { setup: fields.filter((f) => f !== movement), movement };
}

/** The camera's fields as its card reads them: body, lens, aperture, then the move. */
export function cameraOrder(fields: Field[]): Field[] {
  const { setup, movement } = cameraParts(fields);
  return movement ? [...setup, movement] : setup;
}

/** The settings along the bottom: everything that is not a choice card, a reference or the prompt. */
export function bottomFields(model: ModelDef, values: Values): Field[] {
  return activeFields(model, values).filter(
    (f) => f.placement !== "prompt" && f.placement !== "input" && !isChoice(f) && f.kind !== "elements",
  );
}

/** The reference lists, pictures first. */
export function referenceFields(model: ModelDef, values: Values): Field[] {
  const order = { image: 0, video: 1, audio: 2 } as Record<string, number>;
  return activeFields(model, values)
    .filter((f) => f.placement === "input" && f.kind === "images")
    .sort((a, b) => (order[a.accept ?? "image"] ?? 3) - (order[b.accept ?? "image"] ?? 3));
}

export function labelOf(field: Field, value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return field.choices?.find((c) => c.value === value)?.label ?? String(value);
}

/** What a card says under its name: the choices made, or Auto. */
export function summary(fields: Field[], values: Values): string {
  const picked = fields.map((f) => labelOf(f, values[f.key])).filter(Boolean);
  return picked.length > 0 ? picked.join(" · ") : "Auto";
}

export function listOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}
