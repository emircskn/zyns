"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Control, chipCaption } from "@/components/controls";
import { Icon, type IconName } from "@/components/Icon";
import { Popover } from "@/components/Popover";
import { submitRun } from "@/lib/generate";
import { VendorBadge } from "@/components/VendorMark";
import { activeFields, validateValues, type Field } from "@/lib/registry";
import { useModel, useStudio, useValues } from "@/store/studio";

function ModeStrip() {
  const model = useModel();
  const values = useValues();
  const setMode = useStudio((s) => s.setMode);
  // A single mode is not a choice — the strip only earns its place from two.
  if (!model?.modes || model.modes.length < 2) return null;

  return (
    <div key={model.id} className="anim-swap mb-2 flex justify-start">
      <div className="flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-elevated/80 p-1 ring-1 ring-inset ring-line backdrop-blur-xl [scrollbar-width:none]">
        {model.modes.map((mode) => {
          const active = values.__mode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              title={mode.hint}
              onClick={() => setMode(mode.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-[120ms] ${
                active ? "bg-t1 text-canvas" : "text-t3 hover:text-t1"
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InputStrip({ fields }: { fields: Field[] }) {
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  if (fields.length === 0) return null;

  return (
    <div className="anim-swap mb-3 border-b border-line pb-3 sm:max-h-[32vh] sm:overflow-y-auto">
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:gap-x-4 sm:gap-y-3 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div key={field.key} className="w-[168px] shrink-0 sm:w-auto">
            <Control
              field={field}
              value={values[field.key]}
              values={values}
              compact
              onChange={(value) => setValue(field.key, value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A tiny frame drawn in the selected aspect ratio — the chip shows its shape. */
function RatioGlyph({ value }: { value: unknown }) {
  const [w, h] = String(value ?? "").split(":").map(Number);
  const valid = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
  const scale = valid ? 12 / Math.max(w, h) : 0;
  return (
    <span className="grid h-3.5 w-3.5 place-items-center">
      {valid ? (
        <span
          className="rounded-[2px] border-[1.5px] border-current"
          style={{ width: Math.max(w * scale, 4), height: Math.max(h * scale, 4) }}
        />
      ) : (
        <Icon name="grid" size={12} />
      )}
    </span>
  );
}

const CHIP_ICON: Array<[RegExp, IconName]> = [
  [/^duration|_seconds$|extend_times|continue_at/, "clock"],
  [/resolution|^quality$|upscale_factor/, "monitor"],
  [/audio|sound|instrumental|loop/, "audio"],
  [/^model$|^version$|^generation_type$|^mode$|persona_model/, "layers"],
  [/voice|vocal_gender|speaker/, "mic"],
  [/style|rendering_speed|template/, "wand"],
  [/num_images|max_images|^n$|index/, "hash"],
];

function chipIcon(field: Field, value: unknown): ReactNode {
  if (field.kind === "ratio" || /aspect_ratio|^ratio$|image_size|^size$/.test(field.key)) {
    return <RatioGlyph value={value} />;
  }
  const hit = CHIP_ICON.find(([re]) => re.test(field.key));
  return hit ? <Icon name={hit[1]} size={13} className="opacity-70" /> : null;
}

function Chip({
  icon,
  value,
  active,
}: {
  icon?: ReactNode;
  value: string;
  active?: boolean;
}) {
  return (
    <span
      className={`flex h-8 select-none items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] transition-all duration-[120ms] ${
        active ? "bg-t1 text-canvas" : "bg-t1/[0.07] text-t2 hover:bg-t1/[0.12] hover:text-t1"
      }`}
    >
      {icon}
      {value}
    </span>
  );
}

function FieldChip({ field }: { field: Field }) {
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const value = values[field.key];

  // Booleans read better as a chip you flip than as a chip that opens a menu.
  if (field.kind === "toggle") {
    return (
      <button type="button" onClick={() => setValue(field.key, value !== true)} title={field.help}>
        <Chip icon={chipIcon(field, value)} value={field.label} active={value === true} />
      </button>
    );
  }

  const width = field.kind === "ratio" ? 296 : field.kind === "slider" ? 236 : 248;

  return (
    <Popover
      width={width}
      title={field.label}
      trigger={(open) => (
        <Chip icon={chipIcon(field, value)} value={chipCaption(field, value, values)} active={open} />
      )}
    >
      <div className="p-1">
        <Control
          field={field}
          value={value}
          values={values}
          dense
          onChange={(next) => setValue(field.key, next)}
        />
        {field.help && (
          <p className="px-1.5 pb-1 pt-2.5 text-[11px] leading-snug text-t4">{field.help}</p>
        )}
      </div>
    </Popover>
  );
}

export function PromptBar() {
  const model = useModel();
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const togglePicker = useStudio((s) => s.togglePicker);
  const toggleSettings = useStudio((s) => s.toggleSettings);
  const apiKey = useStudio((s) => s.apiKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  // The bar's height depends on the model and mode, so publish it as a CSS
  // variable and let the page pad itself instead of guessing.
  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;
    const publish = () =>
      document.documentElement.style.setProperty("--bar-h", `${node.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!model) return null;

  const fields = activeFields(model, values);
  const promptFields = fields.filter((f) => f.placement === "prompt");
  const inputFields = fields.filter((f) => f.placement === "input");
  const barFields = fields.filter((f) => f.placement === "bar");
  const panelFields = fields.filter((f) => f.placement === "panel");

  const blocker = validateValues(model, values);
  const hint = model.creditHint?.(values);

  async function run() {
    setBusy(true);
    setError(null);
    const result = await submitRun();
    if (!result.ok) setError(result.error ?? "Something went wrong.");
    setBusy(false);
  }

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] md:left-14 md:px-4 md:pb-5">
      <div ref={wrapper} className="pointer-events-auto w-full max-w-[720px]">
        <ModeStrip />

        {error && (
          <div className="anim-pop mb-2 flex items-start gap-2 rounded-card bg-[#ff6b6b]/10 px-3.5 py-2.5 text-[12.5px] text-[#ff8f8f] ring-1 ring-inset ring-[#ff6b6b]/25">
            <Icon name="alert" size={14} className="mt-px shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
              <Icon name="close" size={13} />
            </button>
          </div>
        )}

        <div
          className="rounded-panel border border-line bg-elevated/90 p-3 backdrop-blur-2xl"
          style={{ boxShadow: "var(--shadow-bar)" }}
        >
          <InputStrip fields={inputFields} />

          {promptFields.map((field, index) => (
            <textarea
              key={field.key}
              value={(values[field.key] as string) ?? ""}
              onChange={(event) => setValue(field.key, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !blocker && !busy) {
                  event.preventDefault();
                  void run();
                }
              }}
              rows={index === 0 ? 2 : 1}
              placeholder={field.placeholder ?? `${field.label}…`}
              className="mb-2 max-h-40 w-full resize-none bg-transparent px-1 text-[16px] leading-relaxed tracking-[-0.011em] text-t1 outline-none placeholder:text-t4 md:text-[15px]"
            />
          ))}

          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => togglePicker(true, model.category)} className="shrink-0">
              <Chip icon={<VendorBadge vendor={model.vendor} size={18} />} value={model.name} />
            </button>

            {barFields.map((field) => (
              <span key={field.key} className="shrink-0">
                <FieldChip field={field} />
              </span>
            ))}

            {panelFields.length > 0 && (
              <button
                type="button"
                onClick={() => toggleSettings(true)}
                title="Advanced settings"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-t1/[0.07] text-t2 transition-all duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
              >
                <Icon name="sliders" size={14} />
              </button>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2.5 pl-2">
              {hint && <span className="font-mono text-[11px] tabular-nums text-t4">{hint}</span>}
              <button
                type="button"
                onClick={run}
                disabled={busy || !!blocker || !apiKey}
                title={blocker ?? (!apiKey ? "Add your API key first" : "Generate (⌘↵)")}
                className="cta grid h-9 w-9 place-items-center rounded-full hover:scale-[1.06] active:scale-95 disabled:cursor-not-allowed disabled:bg-t1/15 disabled:text-t4 disabled:hover:scale-100"
              >
                {busy ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
                ) : (
                  <Icon name="arrow-up" size={16} strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-2 hidden px-2 text-center text-[11px] text-t4 md:block">
          {blocker ? blocker : `${model.vendor} · ${model.tagline}`}
        </p>
      </div>
    </div>
  );
}
