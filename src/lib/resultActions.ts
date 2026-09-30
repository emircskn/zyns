import { activeFields, modelsFor, providerOf, type Field, type Mode, type ModelDef } from "@/lib/registry";
import { sourceItems } from "@/lib/sources";
import { useStudio, type Run } from "@/store/studio";

/** Something a model can do with a finished run: Extend it, Upscale it, split its stems. */
export interface ResultAction {
  model: ModelDef;
  mode: Mode;
  field: Field;
}

function fieldOf(model: ModelDef, mode: Mode): Field | undefined {
  return model.fields.find((f) => f.key === mode.action && (!f.when || f.when({ __mode: mode.id })));
}

/**
 * The actions a run qualifies for: every action mode, in the run's own
 * service, whose picker would offer this run. So a Suno song gets Extend
 * from Suno and Stems, MIDI and the rest from Suno Studio, and a Veo clip
 * its Extend and 4K.
 */
export function actionsFor(run: Run): ResultAction[] {
  if (run.state !== "success") return [];
  const provider = run.provider ?? "kie";
  const out: ResultAction[] = [];
  for (const model of modelsFor(provider)) {
    if (providerOf(model) !== provider) continue;
    for (const mode of model.modes ?? []) {
      if (!mode.action) continue;
      const field = fieldOf(model, mode);
      if (field && sourceItems(field, [run], model.id).length > 0) out.push({ model, mode, field });
    }
  }
  return out;
}

/**
 * Puts the action in the bar: its model, its mode, and the run picked in
 * every source field of that mode that the run can fill (a Suno tool asks
 * for the song's task and one of its tracks; this run answers both). The
 * track is the one on screen when the viewer knows it.
 */
export function applyAction(action: ResultAction, run: Run, shown?: string) {
  const store = useStudio.getState();
  store.selectModel(action.model.id);
  useStudio.getState().setMode(action.mode.id);
  const state = useStudio.getState();
  const values = state.valuesByModel[action.model.id] ?? {};
  for (const field of activeFields(action.model, values)) {
    if (field.kind !== "source") continue;
    const items = sourceItems(field, [run], action.model.id);
    if (items.length === 0) continue;
    const item =
      (shown && items.find((i) => run.tracks?.find((t) => t.id === i.id)?.audio === shown)) || items[0];
    const many = (field.source?.max ?? 1) > 1;
    useStudio.getState().setValue(field.key, many ? [item.id] : item.id);
  }
}
