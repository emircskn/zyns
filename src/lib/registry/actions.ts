import type { Field, ModelDef, Values } from "./types";

function shownIn(field: Field, mode: string): boolean {
  return !field.when || field.when({ __mode: mode } as Values);
}

/**
 * Marks the modes that work on something the studio already made: those that
 * cannot run without an earlier run or track picked, and need nothing else (Veo's Extend, Grok's
 * Upscale, every Suno Studio tool). They leave the tab strip and are offered
 * on the result itself instead, where the thing they work on is in hand. A
 * model's first mode is never one: it is where the model starts.
 */
export function withActions(model: ModelDef): ModelDef {
  const modes = model.modes ?? [];
  if (modes.length < 2) return model;
  let marked = false;
  const next = modes.map((mode, index) => {
    if (index === 0 || mode.hidden) return mode;
    const field =
      model.fields.find((f) => f.kind === "source" && f.required && f.source?.of === "track" && shownIn(f, mode.id)) ??
      model.fields.find((f) => f.kind === "source" && f.required && (f.source?.of ?? "task") === "task" && shownIn(f, mode.id));
    if (!field) return mode;
    // One that also wants a file uploaded (Suno's Stems from an upload) is
    // about that file as much as the result, so it stays a tab.
    const upload = model.fields.some(
      (f) => f.required && (f.kind === "images" || f.kind === "media" || f.kind === "clips") && shownIn(f, mode.id),
    );
    if (upload) return mode;
    marked = true;
    return { ...mode, action: field.key };
  });
  return marked ? { ...model, modes: next } : model;
}
