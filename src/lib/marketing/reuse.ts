"use client";

/** Putting a Marketing Studio run back where it was made, with what it was made from. */
import { CHIP_KEYS, isMarketingModel, UI_KEY } from "@/components/marketing/MarketingComposer";
import type { MarketingUi } from "@/lib/marketing/types";
import { getModel } from "@/lib/registry";
import { useStudio, type Run } from "@/store/studio";

export function isMarketingRun(run: Run | undefined): boolean {
  return !!run?.marketing;
}

export function marketingRecreate(run: Run): boolean {
  const info = run.marketing;
  const model = getModel(run.modelId);
  if (!info || !model) return false;
  const store = useStudio.getState();
  if (run.provider && store.provider !== run.provider) store.setProvider(run.provider);
  const base = { view: "home" as const, mode: "image" as const, modelId: model.id };

  // A template: its own window opens, filled in.
  const template = info.template === "zyns" && info.style
    ? ({ kind: "zyns", styleId: info.style } as const)
    : info.preset
      ? ({ kind: "hf", preset: info.preset } as const)
      : info.presetId
        ? ({ kind: "hf", preset: { id: info.presetId, name: info.presetName ?? "Template", type: "" } } as const)
        : null;
  if (template) {
    store.patchMarketing({
      ...base,
      reopen: { template, product: info.product ?? null, avatar: info.avatar ?? null, prompt: info.prompt ?? "", modelId: model.id, values: run.values },
    });
    store.setPage("marketing");
    return true;
  }

  // A style or plain prompt: the page's own box, with its model, style and pictures.
  const settings: Partial<MarketingUi> = {};
  for (const key of CHIP_KEYS) {
    const v = run.values[key];
    if (isMarketingModel(model.id) && typeof v === "string") settings[UI_KEY[key]] = v;
  }
  if (!isMarketingModel(model.id)) store.setModelValues(model.id, run.values, true);
  store.patchMarketing({
    ...base,
    ...settings,
    view: info.tool === "ad-reference" ? "ad-reference" : "home",
    prompt: info.prompt ?? run.prompt,
    style: info.style ?? null,
    preset: null,
    product: info.product ?? null,
    avatar: info.avatar ?? null,
    refs: info.refs ?? [],
    adReference: info.adReference ?? null,
  });
  store.setPage("marketing");
  return true;
}
