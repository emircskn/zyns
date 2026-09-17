"use client";

import { useState } from "react";
import { Control, chipCaption } from "@/components/controls";
import { Icon } from "@/components/Icon";
import { Popover } from "@/components/Popover";
import { submitRun } from "@/lib/generate";
import { activeFields, validateValues, type Field } from "@/lib/registry";
import { useModel, useStudio, useValues } from "@/store/studio";

function ModeStrip() {
  const model = useModel();
  const values = useValues();
  const setMode = useStudio((s) => s.setMode);
  if (!model?.modes?.length) return null;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {model.modes.map((mode) => {
        const active = values.__mode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            title={mode.hint}
            onClick={() => setMode(mode.id)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              active
                ? "bg-white text-ink-950"
                : "glass text-ink-300 hover:text-white"
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

function InputStrip({ fields }: { fields: Field[] }) {
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  if (fields.length === 0) return null;

  return (
    <div className="mb-2.5 max-h-[34vh] overflow-y-auto border-b border-white/8 pb-3">
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <Control
            key={field.key}
            field={field}
            value={values[field.key]}
            values={values}
            compact
            onChange={(value) => setValue(field.key, value)}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  icon,
  label,
  value,
  active,
  onClick,
}: {
  icon?: React.ReactNode;
  label?: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <span
      onClick={onClick}
      className={`flex h-8 select-none items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] transition-colors ${
        active
          ? "bg-white text-ink-950"
          : "bg-white/6 text-ink-200 hover:bg-white/12 hover:text-white"
      }`}
    >
      {icon}
      {label && <span className={active ? "text-ink-600" : "text-ink-400"}>{label}</span>}
      <span className="font-medium">{value}</span>
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
        <Chip value={field.label} active={value === true} />
      </button>
    );
  }

  const width = field.kind === "ratio" ? 300 : field.kind === "slider" ? 240 : 250;

  return (
    <Popover
      width={width}
      title={field.label}
      trigger={(open) => <Chip value={chipCaption(field, value, values)} active={open} />}
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
          <p className="px-1.5 pb-1 pt-2 text-[11px] leading-snug text-ink-400">{field.help}</p>
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
    <div className="pointer-events-none fixed bottom-0 left-16 right-0 z-40 flex justify-center px-4 pb-4">
      <div className="pointer-events-auto w-full max-w-3xl">
        <ModeStrip />

        {error && (
          <div className="mb-2 flex items-start gap-2 rounded-2xl bg-red-500/12 px-3.5 py-2.5 text-[12.5px] text-red-300 ring-1 ring-inset ring-red-500/25">
            <Icon name="alert" size={15} className="mt-px shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        <div className="glass rounded-3xl p-3 shadow-2xl shadow-black/60">
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
              className="mb-1.5 max-h-44 w-full resize-none bg-transparent px-1.5 text-[14.5px] leading-relaxed text-white outline-none placeholder:text-ink-500"
            />
          ))}

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-0.5">
            <button type="button" onClick={() => togglePicker(true)} className="shrink-0">
              <Chip
                icon={<Icon name="grid" size={14} className="text-ink-400" />}
                value={model.name}
              />
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
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/6 text-ink-300 transition-colors hover:bg-white/12 hover:text-white"
              >
                <Icon name="sliders" size={15} />
              </button>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
              {hint && <span className="text-[11.5px] tabular-nums text-ink-400">{hint}</span>}
              <button
                type="button"
                onClick={run}
                disabled={busy || !!blocker || !apiKey}
                title={blocker ?? (!apiKey ? "Add your API key first" : "Generate (⌘↵)")}
                className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink-950 transition-all hover:scale-105 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-ink-400 disabled:hover:scale-100"
              >
                {busy ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-400 border-t-ink-950" />
                ) : (
                  <Icon name="arrow-up" size={17} strokeWidth={2.2} />
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-1.5 px-2 text-center text-[11px] text-ink-500">
          {blocker ? blocker : `${model.vendor} · ${model.tagline}`}
        </p>
      </div>
    </div>
  );
}
