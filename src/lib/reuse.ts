"use client";

import {
  MODELS,
  activeFields,
  defaultValues,
  getModel,
  type Field,
  type ModelDef,
} from "@/lib/registry";
import { useStudio, type Run } from "@/store/studio";

/**
 * Putting a finished piece of media back into the bar: the two things you do
 * with something you already have, in one place, because a tile, the
 * enlarged view and the assets browser all offer them and they must behave
 * the same way from each.
 *
 * `recreate` puts the whole run back: its model, its settings and its
 * prompt, including the pictures it was given, so the bar is ready to send
 * again. `sendReference` takes only the picture and hands it to the model in
 * the bar as a reference.
 */

/** Every input a model takes a picture through, whatever mode turns it on. */
export function imageInputs(model: ModelDef): Field[] {
  return model.fields.filter(
    (f) =>
      f.placement === "input" &&
      f.accept === "image" &&
      (f.kind === "images" || f.kind === "media"),
  );
}

export function imageInput(model: ModelDef): Field | undefined {
  return imageInputs(model)[0];
}

/** Put that url into the field, adding to a list or replacing a single slot. */
function attach(model: ModelDef, field: Field, url: string) {
  const { setValue } = useStudio.getState();
  if (field.kind !== "images") {
    setValue(field.key, url);
    return;
  }
  const current = useStudio.getState().valuesByModel[model.id]?.[field.key];
  const list = Array.isArray(current) ? current.filter((u) => typeof u === "string") : [];
  if (list.includes(url)) return;
  const room = field.maxItems ?? 10;
  setValue(field.key, [...list, url].slice(-room));
}

/**
 * Put the picture in the model's reference strip, switching mode when that is
 * where the strip lives: Nano Banana takes a reference in Edit and not in
 * Generate, so handing it one has to mean switching. Returns false only when
 * the model takes no picture at all.
 */
export function attachReference(model: ModelDef, url: string): boolean {
  const store = useStudio.getState();
  const values = store.valuesByModel[model.id] ?? {};
  const fields = imageInputs(model);
  let field = fields.find((f) => !f.when || f.when(values));

  if (!field) {
    for (const candidate of fields) {
      const mode = model.modes?.find((m) => candidate.when?.({ ...values, __mode: m.id }));
      if (!mode) continue;
      store.setMode(mode.id);
      field = candidate;
      break;
    }
  }
  if (!field) return false;
  attach(model, field, url);
  return true;
}

/**
 * The model a picture goes to as a reference: the one in the bar when it
 * takes pictures, and otherwise the image model the studio was last on.
 * Without this, browsing Assets with no model chosen left the picture
 * nowhere to go.
 */
export function referenceModel(): ModelDef | undefined {
  const store = useStudio.getState();
  const active = getModel(store.modelId);
  if (active && imageInput(active)) return active;
  const last = store.modelByCategory.image;
  const preferred = last ? getModel(last) : undefined;
  if (preferred && imageInput(preferred)) return preferred;
  return MODELS.find((m) => m.category === "image" && imageInput(m));
}

/**
 * The video model a picture can be handed to as a first frame: the one the
 * video page was last on when it takes one, or the first one that does.
 */
export function firstFrameModel(): ModelDef | undefined {
  const last = useStudio.getState().modelByCategory.video;
  const preferred = last ? getModel(last) : undefined;
  if (preferred && imageInput(preferred)) return preferred;
  return MODELS.find((m) => m.category === "video" && imageInput(m));
}

/** Hand a picture to that model as a reference. Returns false if none takes one. */
export function sendReference(url: string): boolean {
  const model = referenceModel();
  if (!model) return false;
  const store = useStudio.getState();
  // The strip that takes it belongs to the bar, and the bar is on the model's
  // own page: from Assets or Favorites there was nothing to see here, which
  // is why this looked like it did nothing at all.
  if (store.modelId !== model.id) store.selectModel(model.id);
  else if (store.page !== "home" && store.page !== model.category) {
    store.setPage(model.category);
  }
  return attachReference(model, url);
}

/**
 * Put a run back in the bar: its model, then its own settings over that
 * model's defaults, so a run recorded before a field existed still lands on
 * a complete form. A run that kept only its prompt line (sample media, or an
 * older run) puts that line in the prompt field rather than arriving empty.
 */
export function recreateRun(run: Run): boolean {
  const model = getModel(run.modelId);
  const store = useStudio.getState();
  store.selectModel(run.modelId);
  if (!model) return false;
  const values = { ...defaultValues(model), ...run.values };
  const field = activeFields(model, values).find((f) => f.placement === "prompt");
  if (field && run.prompt && !String(values[field.key] ?? "").trim()) {
    values[field.key] = run.prompt;
  }
  useStudio.getState().setValues(values);
  return true;
}
