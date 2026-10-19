"use client";

import { ThumbTools } from "@/components/ThumbTools";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import {
  CHIP_KEYS,
  isMarketingModel,
  marketingModels,
  marketingValues,
  MARKETING_LEAD,
  otherValues,
  pageModels,
  takesPerson,
  UI_KEY,
  useMarketing,
} from "@/components/marketing/MarketingComposer";
import { FieldChip } from "@/components/PromptBar";
import { MediaPicker } from "@/components/MediaPicker";
import { GenerateButton, ModelChip, usePrice } from "@/components/studio/StudioComposer";
import { PROVIDER_NAME, submitModelRun } from "@/lib/generate";
import { styleById, styleCover } from "@/lib/marketing/styles";
import type { MarketingPreset, MarketingUi, TemplateStart } from "@/lib/marketing/types";
import { activeFields, defaultValues, getModel, providerOf, validateValues, type Values } from "@/lib/registry";
import { mediaSrc } from "@/lib/storage/client";
import { usePresence } from "@/lib/usePresence";
import { keyFor, useStudio } from "@/store/studio";

/** What was picked under Explore templates: one of ours (a cover to copy) or one of Higgsfield's presets. */
export type PickedTemplate = { kind: "zyns"; styleId: string } | { kind: "hf"; preset: MarketingPreset };

/**
 * Higgsfield's "Recreate template" window: the template large on the left,
 * on the right the product (required), a person if the template has one,
 * what to change, the model and Recreate. Higgsfield's presets run on
 * Marketing Studio's own models only, since only those read a preset_id;
 * ours go to any image model as a cover to copy.
 */
export function RecreateTemplate({
  template,
  onClose,
  onKeyClick,
  onSent,
  initial,
}: {
  template: PickedTemplate | null;
  /** A finished run's details, to start from instead of empty. */
  initial?: TemplateStart | null;
  onClose: () => void;
  onKeyClick: () => void;
  onSent?: () => void;
}) {
  const open = !!template;
  const { mounted, exiting } = usePresence(open, 240);
  const [shown, setShown] = useState<PickedTemplate | null>(template);
  const ui = useMarketing();
  const provider = useStudio((s) => s.provider);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);
  const [product, setProduct] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  // Its own model and settings, apart from the prompt box's: kept from one template to the next.
  const [modelId, setModelId] = useState(() => marketingModels()[0]?.id ?? "");
  const [shotSettings, setShotSettings] = useState<Partial<Pick<MarketingUi, "resolution" | "aspect" | "quality">>>({});
  const [ownByModel, setOwnByModel] = useState<Record<string, Values>>({});
  const [picking, setPicking] = useState<"product" | "avatar" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kept while it slides out, so the window does not empty as it goes.
  useEffect(() => {
    if (!template) return;
    setShown(template);
    setProduct(initial ? initial.product : ui.product);
    setAvatar(initial?.avatar ?? null);
    setPrompt(initial?.prompt ?? "");
    setError(null);
    if (initial) {
      setModelId(initial.modelId);
      const v = initial.values;
      setShotSettings(Object.fromEntries(CHIP_KEYS.filter((k) => typeof v[k] === "string").map((k) => [UI_KEY[k], v[k]])));
      const m = getModel(initial.modelId);
      if (m) setOwnByModel((all) => ({ ...all, [m.id]: { ...defaultValues(m), ...v } as Values }));
    }
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // Only when a template is picked: it starts from the page's product.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const hf = shown?.kind === "hf" ? shown.preset : null;
  const style = shown?.kind === "zyns" ? styleById(shown.styleId) : undefined;
  // Higgsfield's presets only on Marketing Studio; ours on any image model.
  const models = useMemo(() => (hf ? marketingModels() : pageModels(provider)), [hf, provider]);
  const model = models.find((m) => m.id === modelId) ?? models[0];
  const marketing = isMarketingModel(model?.id);
  const person = hf ? takesPerson(hf) : true;
  const own: Values = model && !marketing ? (ownByModel[model.id] ?? defaultValues(model)) : {};
  const sendUi: MarketingUi = { ...ui, ...shotSettings, product, avatar: person ? avatar : null, prompt, refs: [], style: style?.id ?? null, preset: hf, count: 1 };
  const built = model ? (marketing ? marketingValues(model, sendUi, "create") : otherValues(model, sendUi, own)) : null;
  const blocker = !model ? "Choose a model." : !product ? "Add your product." : built ? validateValues(model, built.values) : null;
  const price = usePrice(model, built?.values ?? {}, blocker);
  const key = keyFor({ apiKey, hfKey }, providerOf(model));
  const chips = model && built
    ? marketing
      ? activeFields(model, built.values).filter((f) => (CHIP_KEYS as readonly string[]).includes(f.key))
      : activeFields(model, own).filter((f) => f.placement === "bar")
    : [];

  async function recreate() {
    if (!model || !built) return;
    if (!key) return onKeyClick();
    if (busy || blocker) return;
    setBusy(true);
    setError(null);
    const result = await submitModelRun(getModel(model.id) ?? model, built.values, { marketing: { ...built.info, template: hf ? "hf" : "zyns" } }, { schema: true });
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Could not send this.");
    onClose();
    onSent?.();
  }

  if (!mounted || !shown || typeof document === "undefined") return null;
  const name = hf ? hf.name : (style?.name ?? "");
  const cover = hf ? hf.preview : style ? styleCover(style.id) : undefined;

  const slot = (label: string, url: string | null, note: string, onPick: () => void, onClear: () => void) => (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="text-[13px] text-t2">{label}</p>
      <div className="relative">
        <button
          type="button"
          onClick={onPick}
          className="relative flex h-[110px] w-full sm:h-[140px] flex-col items-center justify-center gap-2 overflow-hidden rounded-card bg-t1/[0.04] text-[13px] font-semibold text-t1 ring-1 ring-inset ring-edge transition-colors duration-[120ms] hover:bg-t1/[0.08]"
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaSrc(url)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-t1/[0.1]">
                <Icon name="plus" size={14} />
              </span>
              {label === "Replace product" ? "Upload product" : "Choose character"}
            </>
          )}
          <span className="absolute right-2 top-2 rounded-chip bg-black/40 px-1.5 py-0.5 text-[10.5px] font-medium text-t3">{note}</span>
        </button>
        {url && (
          <ThumbTools url={url} onRemove={onClear} tapOpens={false} />
        )}
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[116] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={onClose} className={`absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`} />
      <div
        role="dialog"
        aria-label="Recreate template"
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-t-panel border border-edge bg-[var(--popover)] sm:max-w-[1080px] sm:flex-row sm:rounded-panel ${exiting ? "anim-sheet-out" : "anim-sheet"}`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-t1/[0.06] text-t2 hover:bg-t1/[0.12] hover:text-t1">
          <Icon name="close" size={16} />
        </button>
        <div className="flex shrink-0 items-center justify-center p-4 sm:w-[48%] sm:p-6">
          {cover && hf?.previewKind === "video" ? (
            <video src={cover} muted loop autoPlay playsInline className="max-h-[40dvh] w-auto rounded-card object-contain sm:max-h-[78dvh]" />
          ) : cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={name} className="max-h-[40dvh] w-auto rounded-card object-contain sm:max-h-[78dvh]" />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:justify-center sm:py-8 sm:pl-2 sm:pr-8">
          <div>
            <h2 className="studio-title text-[22px] font-bold uppercase tracking-[-0.02em] text-t1">Recreate template</h2>
            <p className="mt-1 truncate text-[13px] text-t3">{name}</p>
          </div>
          <div className="flex gap-3">
            {slot("Replace product", product, "Required", () => setPicking("product"), () => setProduct(null))}
            {person && slot("Add character", avatar, "Optional", () => setPicking("avatar"), () => setAvatar(null))}
          </div>
          {person && <p className="-mt-3 text-[12px] text-t4">Add a character only if the template has a person in it.</p>}
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-t2">Describe your edit</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="What do you want to change?"
              className="w-full resize-none rounded-card bg-t1/[0.04] p-3 text-[14px] text-t1 outline-none ring-1 ring-inset ring-edge placeholder:text-t4 focus:ring-line-strong"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-t2">Model and settings</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <ModelChip models={models} model={model} onPick={setModelId} lead={MARKETING_LEAD} />
              {model &&
                built &&
                chips.map((field) => (
                  <span key={field.key} className="shrink-0">
                    <FieldChip
                      field={field}
                      values={marketing ? built.values : own}
                      onChange={(k, v) => {
                        if (!marketing) return setOwnByModel((m) => ({ ...m, [model.id]: { ...own, [k]: v } }));
                        const name = UI_KEY[k as (typeof CHIP_KEYS)[number]];
                        if (name) setShotSettings((x) => ({ ...x, [name]: typeof v === "string" ? v : String(v ?? "") }));
                      }}
                    />
                  </span>
                ))}
            </div>
            {hf && <p className="text-[11.5px] text-t4">Higgsfield templates run on Marketing Studio&apos;s own models.</p>}
          </div>
          <GenerateButton
            wide
            onClick={() => void recreate()}
            busy={busy}
            disabled={!!key && (busy || !!blocker)}
            blocker={blocker}
            price={price}
            count={1}
            needsKey={key ? null : PROVIDER_NAME[providerOf(model)]}
          />
          {(error || (key && blocker)) && <p className={`-mt-3 text-[12px] ${error ? "text-[#ff8f8f]" : "text-t4"}`}>{error ?? blocker}</p>}
        </div>
      </div>
      <MediaPicker
        open={!!picking}
        onClose={() => setPicking(null)}
        accept="image"
        characters={picking === "avatar"}
        taken={[product, avatar].filter((u): u is string => !!u)}
        onPick={(urls) => {
          if (urls[0]) (picking === "product" ? setProduct : setAvatar)(urls[0]);
        }}
        onElements={(elements) => {
          const url = elements[0]?.images[0]?.storageUrl;
          if (url) (picking === "product" ? setProduct : setAvatar)(url);
        }}
      />
    </div>,
    document.body,
  );
}
