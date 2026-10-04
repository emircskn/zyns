"use client";

/**
 * Bringing work back into Cinema Studio's composer: a picture as a
 * reference, a picture to make a video from, or a whole run to make again.
 */
import { activeFields, defaultValues, getModel } from "@/lib/registry";
import { useStudio, type Run } from "@/store/studio";
import { CINEMA, cinemaModel, labelOf, listOf } from "./cinema";

export function isStudioRun(run: Run | undefined): boolean {
  return !!run && (run.modelId === CINEMA || !!run.studio);
}

function toStudio() {
  const store = useStudio.getState();
  if (store.page !== "studio") store.setPage("studio");
  store.patchStudio({ view: "home" });
}

/** Adds a picture to the references of the mode the composer is in. */
export function studioReference(url: string): void {
  const store = useStudio.getState();
  const mode = store.studio?.mode ?? "video";
  if (mode === "image") {
    store.patchStudio((s) => ({ imageRefs: s.imageRefs.includes(url) ? s.imageRefs : [...s.imageRefs, url] }));
  } else {
    const model = cinemaModel();
    const values = store.valuesByModel[CINEMA] ?? (model ? defaultValues(model) : {});
    const now = listOf(values.image_urls);
    if (!now.includes(url)) store.setModelValues(CINEMA, { image_urls: [...now, url].slice(0, 30) });
  }
  toStudio();
}

/** A picture made in image mode, taken to video mode as its reference. */
export function studioTurnToVideo(url: string): void {
  useStudio.getState().patchStudio({ mode: "video" });
  studioReference(url);
}

/** A run put back in the composer: its model, its settings, its prompt. */
export function studioRecreate(run: Run): boolean {
  const store = useStudio.getState();
  const model = getModel(run.modelId);
  if (!model) return false;
  const values = { ...defaultValues(model), ...run.values };
  if (run.modelId === CINEMA) {
    store.setModelValues(CINEMA, values, true);
    store.patchStudio({ mode: "video", videoModelId: CINEMA });
  } else if (run.studio === "image") {
    store.setModelValues(run.modelId, values, true);
    store.patchStudio({ mode: "image", imageModelId: run.modelId, imagePrompt: run.prompt });
  } else {
    store.setModelValues(run.modelId, values, true);
    store.setModelValues(CINEMA, { prompt: run.prompt });
    store.patchStudio({ mode: "video", videoModelId: run.modelId });
  }
  toStudio();
  return true;
}

const SETTINGS: Array<[string, string]> = [
  ["genre", "Genre"],
  ["era", "Era"],
  ["pacing", "Tempo"],
  ["camera_model", "Camera"],
  ["camera_lens", "Lens"],
  ["camera_aperture", "Aperture"],
  ["camera_movement", "Movement"],
  ["light", "Light"],
  ["color_palette", "Palette"],
];

/** The director's choices a Cinema Studio run was made with, for its details. */
export function studioSettingsOf(run: Run): Array<{ label: string; value: string }> {
  const model = cinemaModel();
  if (!model || run.modelId !== CINEMA) return [];
  const fields = activeFields(model, run.values);
  const rows: Array<{ label: string; value: string }> = [];
  for (const [key, label] of SETTINGS) {
    const field = fields.find((f) => f.key === key);
    const value = field ? labelOf(field, run.values[key]) : undefined;
    rows.push({ label, value: value ?? "Auto" });
  }
  const duration = run.values.duration;
  if (duration !== undefined) rows.unshift({ label: "Duration", value: `${duration}s` });
  return rows;
}
