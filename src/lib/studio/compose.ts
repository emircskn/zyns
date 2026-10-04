/**
 * What Cinema Studio's composer sends, whichever model it sends to.
 *
 * Cinema Studio 4.0 takes its director's controls as real parameters. Any
 * other model picked in the composer has no such parameters, so the same
 * choices are written into its prompt instead ("compiled"). The camera move
 * lives in the prompt as a `#move` chip; it is taken out of the text and
 * sent as `camera_movement` (Cinema Studio takes one per shot).
 */
import { mapParams } from "@/lib/recipes/paramMap";
import { activeFields, getModel, modelsFor, modesFor, type Field, type ModelDef, type Provider, type Values } from "@/lib/registry";
import { ownPageOf } from "@/store/studio";
import { CINEMA, labelOf } from "./cinema";

export const MOVE_KEY = "camera_movement";

function promptField(model: ModelDef, values: Values): Field | undefined {
  return activeFields(model, values).find((f) => f.placement === "prompt");
}

/**
 * The video models the composer can send to: Cinema Studio first (the page
 * is built around it), then the chosen service's models that take a prompt.
 */
export function studioVideoModels(provider: Provider): ModelDef[] {
  const cinema = getModel(CINEMA);
  const others = modelsFor(provider).filter((m) => {
    if (m.category !== "video" || m.id === CINEMA || ownPageOf(m.id)) return false;
    const mode = modesFor(m, "image-to-video")[0];
    const values = mapParams(m, mode, {}).values;
    return !!promptField(m, values);
  });
  return cinema ? [cinema, ...others] : others;
}

/** The chosen service's image models that make a picture from a prompt. */
export function studioImageModels(provider: Provider): ModelDef[] {
  return modelsFor(provider).filter((m) => {
    if (m.category !== "image" || ownPageOf(m.id)) return false;
    return !!promptField(m, mapParams(m, undefined, {}).values);
  });
}

const TOKEN = /(^|[\s(])#([a-z0-9][a-z0-9-]*)(?=$|[\s.,!?;:)])/g;

/** The `#move` chips in a prompt that name a real move, in order. */
export function movesIn(text: string, field: Field | undefined): Array<{ start: number; end: number; value: string }> {
  const values = new Set((field?.choices ?? []).map((c) => c.value).filter(Boolean));
  const found: Array<{ start: number; end: number; value: string }> = [];
  for (const match of text.matchAll(TOKEN)) {
    if (!values.has(match[2])) continue;
    const start = (match.index ?? 0) + match[1].length;
    found.push({ start, end: start + match[2].length + 1, value: match[2] });
  }
  return found;
}

/** The prompt without its move chips, as a model should read it. */
export function withoutMoves(text: string, field: Field | undefined): string {
  let out = text;
  for (const move of movesIn(text, field).reverse()) out = out.slice(0, move.start) + out.slice(move.end);
  return out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,!?;:])/g, "$1").trim();
}

/**
 * Puts a move chip in the prompt, at `at` (or the end). The model takes one
 * move per shot, so one already there is taken out: `replaced` says so.
 */
export function putMove(text: string, value: string, field: Field | undefined, at?: number): { text: string; caret: number; replaced: boolean } {
  const existing = movesIn(text, field);
  let base = text;
  let caret = at ?? text.length;
  for (const move of [...existing].reverse()) {
    base = base.slice(0, move.start) + base.slice(move.end);
    if (caret > move.start) caret -= Math.min(caret, move.end) - move.start;
  }
  const lead = caret > 0 && !/\s/.test(base[caret - 1]) ? " " : "";
  const token = `${lead}#${value} `;
  const next = base.slice(0, caret) + token + base.slice(caret).replace(/^ /, "");
  return { text: next, caret: caret + token.length, replaced: existing.some((m) => m.value !== value) };
}

/** The director's choices in words, for a model that has no parameters for them. */
export function compileCinemaPrompt(fields: Field[], values: Values): string {
  const say = (key: string) => {
    const field = fields.find((f) => f.key === key);
    return field ? labelOf(field, values[key]) : undefined;
  };
  const parts: string[] = [];
  const camera = say("camera_model");
  const lens = say("camera_lens");
  const aperture = say("camera_aperture");
  if (camera || lens || aperture) {
    parts.push(
      `Shot ${camera ? `on ${camera.toLowerCase()}` : ""}${lens ? ` with a ${lens.toLowerCase()} lens` : ""}${aperture ? ` at ${aperture}` : ""}`.replace("Shot  ", "Shot "),
    );
  }
  const move = say(MOVE_KEY);
  if (move) parts.push(`Camera move: ${move.toLowerCase()}`);
  const genre = say("genre");
  if (genre) parts.push(`${genre} film`);
  const era = say("era");
  if (era) parts.push(`set in the ${era}`);
  const pacing = say("pacing");
  if (pacing) parts.push(`${pacing.toLowerCase()} pacing`);
  const light = say("light");
  if (light) parts.push(`${light.toLowerCase()} lighting`);
  const palette = say("color_palette");
  if (palette) parts.push(`colour palette "${palette}"`);
  return parts.length > 0 ? `${parts.join(", ")}.` : "";
}

/**
 * The values for another model: its own settings, the prompt with the
 * director's choices written in, and the references where it takes them.
 */
export function otherModelValues(
  model: ModelDef,
  own: Values,
  prompt: string,
  images: string[],
  video?: string,
): { values: Values; warnings: string[] } {
  const mode = images.length > 0 ? (modesFor(model, "image-to-video")[0] ?? modesFor(model, "reference-to-video")[0]) : undefined;
  const placed = mapParams(model, mode ?? (own.__mode as string | undefined), { prompt, images, video });
  const values: Values = { ...placed.values };
  // Its own settings (duration, resolution, …) as chosen in the composer.
  for (const field of activeFields(model, values)) {
    if (field.placement === "prompt" || field.placement === "input") continue;
    if (own[field.key] !== undefined) values[field.key] = own[field.key];
  }
  return { values, warnings: placed.warnings };
}
