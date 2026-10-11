"use client";

import { useMemo, useState } from "react";
import { FieldChip, BatchChip } from "@/components/PromptBar";
import { Icon, type IconName } from "@/components/Icon";
import { PresetPicker } from "@/components/marketing/Presets";
import { ReferencePicker } from "@/components/studio/ReferencePicker";
import { GenerateButton, PriceHint, times, usePrice } from "@/components/studio/StudioComposer";
import { PROVIDER_NAME, submitModelRun } from "@/lib/generate";
import { typeLabel } from "@/lib/marketing/presets";
import type { MarketingRunInfo, MarketingUi } from "@/lib/marketing/types";
import { activeFields, ALL_MODELS, defaultValues, getModel, providerOf, validateValues, type ModelDef, type Values } from "@/lib/registry";
import { mediaSrc } from "@/lib/storage/client";
import { EMPTY_MARKETING } from "@/lib/marketing/types";
import { keyFor, useStudio } from "@/store/studio";

/** Marketing Studio's own image models, the variants offered here. */
export function marketingModels(): ModelDef[] {
  return ALL_MODELS.filter((m) => /^hf-marketing-studio/.test(m.id));
}

/** The page's state with every field it has now, whatever was saved before. */
export function useMarketing(): MarketingUi {
  const saved = useStudio((s) => s.marketing);
  return useMemo(() => ({ ...EMPTY_MARKETING, ...saved }), [saved]);
}

/** What Ad Reference asks of the model: the layout of the one ad, with the other product. */
export const AD_REFERENCE_PROMPT =
  "Recreate the composition, lighting and layout of image 1 with the product from image 2; leave text areas empty.";

/** The settings this page shows as chips, in this order, when the model has them. */
const CHIP_KEYS = ["resolution", "aspect_ratio", "quality"] as const;
const UI_KEY: Record<(typeof CHIP_KEYS)[number], "resolution" | "aspect" | "quality"> = {
  resolution: "resolution",
  aspect_ratio: "aspect",
  quality: "quality",
};

/**
 * The values one send goes out with. With a preset: enhance_prompt on, its
 * id, the product first and the person second. Without: a prompt, and the
 * pictures to edit from when there are any.
 */
export function marketingValues(model: ModelDef, ui: MarketingUi, tool: "create" | "ad-reference"): { values: Values; info: MarketingRunInfo } {
  const preset = tool === "create" ? ui.preset : null;
  const images =
    tool === "ad-reference"
      ? [ui.adReference, ui.product].filter((u): u is string => !!u)
      : preset
        ? [ui.product, ui.avatar].filter((u): u is string => !!u)
        : [ui.product, ...ui.refs].filter((u): u is string => !!u);
  const mode = preset ? "preset" : images.length > 0 ? "edit" : "generate";
  const values: Values = { ...defaultValues(model), __mode: mode };
  const text = ui.prompt.trim();
  values.prompt =
    tool === "ad-reference" ? [AD_REFERENCE_PROMPT, text].filter(Boolean).join(" ") : text || (preset ? preset.name : "");
  if (images.length > 0) values.image_urls = images;
  if (preset) {
    values.enhance_prompt = true;
    values.preset_id = preset.id;
  }
  for (const key of CHIP_KEYS) {
    const chosen = ui[UI_KEY[key]];
    if (chosen) values[key] = chosen;
  }
  const info: MarketingRunInfo =
    tool === "ad-reference"
      ? { tool: "ad-reference", product: ui.product ?? undefined }
      : preset
        ? { tool: "preset", presetId: preset.id, presetName: preset.name, product: ui.product ?? undefined, avatar: ui.avatar ?? undefined }
        : { tool: "direct", product: ui.product ?? undefined };
  return { values, info };
}

/** One picture the composer needs: what it is for, its number in image_urls, and the picture once chosen. */
function Slot({
  label,
  hint,
  index,
  url,
  icon,
  required,
  onPick,
  onClear,
}: {
  label: string;
  hint?: string;
  /** Its place in image_urls, shown so the order is never a guess. */
  index?: number;
  url: string | null;
  icon: IconName;
  required?: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onPick}
        className={`relative flex h-[104px] w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-card text-center transition-colors duration-[120ms] ${
          url ? "bg-t1/[0.05]" : "border-[1.5px] border-dashed border-line-strong bg-transparent hover:bg-t1/[0.04]"
        }`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaSrc(url)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <Icon name={icon} size={17} className="text-t3" />
            <span className="text-[12.5px] text-t2">{label}</span>
            <span className="px-2 text-[11px] leading-tight text-t4">{hint ?? (required ? "Required" : "Optional")}</span>
          </>
        )}
        {index !== undefined && (
          <span className="absolute left-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-black/60 px-1 font-mono text-[10.5px] text-white">
            {index}
          </span>
        )}
      </button>
      {url && (
        <>
          <span className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-card bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-5 text-[11.5px] text-white">
            {label}
          </span>
          <button
            type="button"
            onClick={onClear}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <Icon name="close" size={12} />
          </button>
        </>
      )}
    </div>
  );
}

type Picking = "product" | "avatar" | "refs" | "adReference" | null;

/**
 * The image composer: the Marketing Studio version, a preset (or none), the
 * pictures it is sent with, the prompt and the settings. With a preset the
 * product is required and goes first, the person second, as the API wants;
 * without, the pictures are something to edit from, or there are none.
 * Ad Reference is the same composer with the ad in place of a preset.
 */
export function MarketingComposer({ tool, onKeyClick, onSent }: { tool: "create" | "ad-reference"; onKeyClick: () => void; onSent?: () => void }) {
  const ui = useMarketing();
  const patch = useStudio((s) => s.patchMarketing);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);
  const models = useMemo(() => marketingModels(), []);
  const model = getModel(ui.modelId);
  const [picking, setPicking] = useState<Picking>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preset = tool === "create" ? ui.preset : null;
  const built = model ? marketingValues(model, ui, tool) : null;
  const maxRefs = 16 - (ui.product ? 1 : 0);
  const blocker = !model
    ? "Choose a Marketing Studio version."
    : tool === "ad-reference" && !ui.adReference
      ? "Add the ad to take the layout from."
      : tool === "ad-reference" && !ui.product
        ? "Add your product."
        : preset && !ui.product
          ? "A preset needs your product picture."
          : !preset && tool === "create" && !ui.prompt.trim()
            ? "Describe the shot to continue."
            : built
              ? validateValues(model, built.values)
              : null;
  const count = Math.max(1, Math.min(4, ui.count));
  const price = times(usePrice(model, built?.values ?? {}, blocker), count);
  const provider = providerOf(model);
  const key = keyFor({ apiKey, hfKey }, provider);
  const chips = model && built ? activeFields(model, built.values).filter((f) => (CHIP_KEYS as readonly string[]).includes(f.key)) : [];

  async function generate() {
    if (!model || !built) return;
    if (!key) return onKeyClick();
    if (busy || blocker) return;
    setBusy(true);
    setError(null);
    for (let i = 0; i < count; i += 1) {
      const result = await submitModelRun(model, built.values, { marketing: built.info }, { schema: true });
      if (!result.ok) {
        setError(result.error ?? "Could not send this.");
        break;
      }
      if (i === 0) onSent?.();
    }
    setBusy(false);
  }

  const pickedUrls = [ui.product, ui.avatar, ui.adReference, ...ui.refs].filter((u): u is string => !!u);

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void generate();
        }
      }}
    >
      {/* The version: picked each time it matters, remembered after. */}
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-t3">Model</p>
        <div className="flex flex-wrap gap-1.5">
          {models.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => patch({ modelId: m.id })}
              aria-pressed={m.id === ui.modelId}
              className={`h-8 rounded-full px-3.5 text-[12.5px] transition-colors duration-[120ms] ${
                m.id === ui.modelId ? "bg-t1/[0.1] text-t1 ring-1 ring-inset ring-line-strong" : "bg-t1/[0.06] text-t2 hover:text-t1"
              }`}
            >
              {m.name.replace(/^Marketing Studio\s*/, "") || m.name}
            </button>
          ))}
        </div>
        {!model && <p className="mt-1.5 text-[12px] text-t4">Choose one to start; it is remembered for next time.</p>}
      </div>

      {tool === "create" ? (
        <>
          {/* The preset, or none: with none the prompt alone decides. */}
          {preset ? (
            <div className="flex items-center gap-3 rounded-card bg-t1/[0.05] p-2 pr-2.5">
              <span className="h-14 w-11 shrink-0 overflow-hidden rounded-[10px] bg-t1/[0.06]">
                {preset.preview && preset.previewKind !== "video" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preset.preview} alt="" className="h-full w-full object-cover" />
                ) : preset.preview ? (
                  <video src={preset.preview} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] text-t1">{preset.name}</span>
                <span className="block truncate text-[11.5px] text-t3">{typeLabel(preset.type)} · prompt enhanced</span>
              </span>
              <button type="button" onClick={() => setPresetsOpen(true)} className="rounded-full bg-t1/[0.07] px-3 py-1.5 text-[12px] text-t2 hover:text-t1">
                Change
              </button>
              <button
                type="button"
                onClick={() => patch({ preset: null })}
                aria-label="No preset"
                className="grid h-7 w-7 place-items-center rounded-full text-t3 hover:bg-t1/[0.07] hover:text-t1"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPresetsOpen(true)}
              className="flex items-center gap-3 rounded-card bg-t1/[0.05] px-3 py-3 text-left transition-colors duration-[120ms] hover:bg-t1/[0.08]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-t1/[0.07] text-t2">
                <Icon name="grid" size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] text-t1">Choose a preset</span>
                <span className="block text-[11.5px] text-t3">Or write the shot yourself below</span>
              </span>
              <Icon name="chevron" size={14} className="-rotate-90 text-t4" />
            </button>
          )}

          <div className="flex gap-2">
            <Slot
              label="Product"
              icon="box"
              index={ui.product || preset ? 1 : undefined}
              required={!!preset}
              hint={preset ? "Required" : "To edit from"}
              url={ui.product}
              onPick={() => setPicking("product")}
              onClear={() => patch({ product: null })}
            />
            {preset ? (
              <Slot
                label="Model"
                icon="user"
                index={2}
                hint="Optional · without one, the product alone"
                url={ui.avatar}
                onPick={() => setPicking("avatar")}
                onClear={() => patch({ avatar: null })}
              />
            ) : (
              <div className="flex min-w-0 flex-1 flex-col">
                <button
                  type="button"
                  onClick={() => setPicking("refs")}
                  className="flex h-[104px] w-full flex-col items-center justify-center gap-1 rounded-card border-[1.5px] border-dashed border-line-strong text-center hover:bg-t1/[0.04]"
                >
                  <Icon name="photos" size={17} className="text-t3" />
                  <span className="text-[12.5px] text-t2">More pictures</span>
                  <span className="text-[11px] text-t4">{ui.refs.length ? `${ui.refs.length} added` : `Up to ${maxRefs}`}</span>
                </button>
              </div>
            )}
          </div>
          {!preset && ui.refs.length > 0 && (
            <div className="no-bar flex gap-1.5 overflow-x-auto">
              {ui.refs.map((url, i) => (
                <span key={url} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-t1/[0.05]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaSrc(url)} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1 font-mono text-[9.5px] text-white">{i + (ui.product ? 2 : 1)}</span>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => patch({ refs: ui.refs.filter((u) => u !== url) })}
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <Icon name="close" size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex gap-2">
            <Slot
              label="Reference ad"
              icon="image"
              index={1}
              required
              url={ui.adReference}
              onPick={() => setPicking("adReference")}
              onClear={() => patch({ adReference: null })}
            />
            <Slot label="Product" icon="box" index={2} required url={ui.product} onPick={() => setPicking("product")} onClear={() => patch({ product: null })} />
          </div>
          <p className="rounded-card bg-t1/[0.04] px-3 py-2.5 text-[12px] leading-relaxed text-t3">
            The layout, light and composition of the ad are rebuilt around your product, with the text areas left empty to add your own words after.
            Use an ad you have the rights to.
          </p>
        </>
      )}

      <div>
        <p className="mb-1.5 text-[12px] font-medium text-t3">{tool === "ad-reference" ? "Anything to add" : preset ? "Details" : "Prompt"}</p>
        <textarea
          value={ui.prompt}
          onChange={(event) => patch({ prompt: event.target.value })}
          rows={3}
          placeholder={
            tool === "ad-reference"
              ? "Optional: a colour to lean on, the mood, what to leave out"
              : preset
                ? "Optional: what to change from the preset"
                : "A glass serum bottle on wet black stone, soft rim light, drops of water"
          }
          className="w-full resize-none rounded-card bg-t1/[0.05] px-3.5 py-3 text-[15px] leading-relaxed text-t1 outline-none ring-1 ring-inset ring-transparent placeholder:text-t4 focus:ring-line-strong md:text-[14px]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {model &&
          built &&
          chips.map((field) => (
            <span key={field.key} className="shrink-0">
              <FieldChip
                field={field}
                values={built.values}
                onChange={(k, v) => {
                  const name = UI_KEY[k as (typeof CHIP_KEYS)[number]];
                  if (name) patch({ [name]: typeof v === "string" ? v : String(v ?? "") } as Partial<MarketingUi>);
                }}
              />
            </span>
          ))}
        <span className="shrink-0">
          <BatchChip value={count} onChange={(n) => patch({ count: n })} />
        </span>
        <PriceHint price={price} count={count} />
      </div>

      {error && <p className="text-[12.5px] text-[#ff8f8f]">{error}</p>}
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 text-[12px] text-t4">{key ? blocker ?? "⌘↵ to generate" : `Needs your ${PROVIDER_NAME[provider]} key`}</span>
        <GenerateButton
          onClick={() => void generate()}
          busy={busy}
          disabled={!!key && (busy || !!blocker)}
          blocker={blocker}
          price={price}
          count={count}
          needsKey={key ? null : PROVIDER_NAME[provider]}
        />
      </div>

      <PresetPicker
        open={presetsOpen}
        selected={ui.preset?.id}
        onPick={(p) => patch({ preset: p })}
        onClose={() => setPresetsOpen(false)}
      />
      <ReferencePicker
        open={!!picking}
        onClose={() => setPicking(null)}
        kinds={["image"]}
        room={{ image: picking === "refs" ? Math.max(0, maxRefs - ui.refs.length) : 1, video: 0, audio: 0 }}
        taken={pickedUrls}
        startTab={picking === "product" || picking === "avatar" ? "elements" : "uploads"}
        onAdd={(picked) => {
          const urls = picked.filter((p) => p.kind === "image").map((p) => p.url);
          if (urls.length === 0 || !picking) return;
          if (picking === "refs") patch((m) => ({ refs: [...m.refs, ...urls].slice(0, maxRefs) }));
          else patch({ [picking]: urls[0] } as Partial<MarketingUi>);
        }}
        onElements={(elements) => {
          // An element's cover stands for it: a product shot of the product, a person for the model.
          const covers = elements.map((e) => e.images[0]?.storageUrl).filter((u): u is string => !!u);
          if (covers.length === 0 || !picking) return;
          if (picking === "refs") patch((m) => ({ refs: [...m.refs, ...covers].slice(0, maxRefs) }));
          else patch({ [picking]: covers[0] } as Partial<MarketingUi>);
        }}
      />
    </div>
  );
}
