"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Control } from "@/components/controls";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { Popover } from "@/components/Popover";
import { Chip } from "@/components/PromptBar";
import { ChipRow, GenerateButton } from "@/components/studio/StudioComposer";
import { ProviderTag } from "@/components/ModelPicker";
import { PROVIDER_NAME } from "@/lib/generate";
import {
  checkSlots,
  chooseStepModel,
  rememberedModel,
  startRecipe,
  stepCost,
  stepsNeeded,
  stepValues,
} from "@/lib/recipes/engine";
import type { Recipe, RecipeInputs, Step } from "@/lib/recipes/types";
import { type LibraryElement, pickable } from "@/lib/elements";
import { activeFields, getModel, providerOf, type Values } from "@/lib/registry";
import { mediaSrc } from "@/lib/storage/client";
import { keyFor, useStudio } from "@/store/studio";
import { StepModelPicker, capabilityLabel } from "./StepModelPicker";

/**
 * The composer for a recipe: its slots and choices, then a row per step
 * with the model that step will run on. A step with no model chosen yet
 * says so, and nothing can be sent until every step has one; the last pick
 * for each step is remembered for next time.
 */
export function RecipeComposer({
  recipe,
  onStarted,
  bar = false,
  lead,
}: {
  recipe: Recipe;
  onStarted?: (id: string) => void;
  /** As Higgsfield's Marketing Studio video box: the first text as the prompt, the rest as chips, pictures as tiles, Generate at the end. */
  bar?: boolean;
  /** Chips that go first in the bar's row (the recipe picker). */
  lead?: ReactNode;
}) {
  const [slots, setSlots] = useState<Record<string, unknown>>({});
  const [choices, setChoices] = useState<Record<string, string>>(
    Object.fromEntries(recipe.choices.map((c) => [c.key, c.default])),
  );
  const [models, setModels] = useState<Record<string, string | undefined>>(() =>
    Object.fromEntries(recipe.steps.map((s) => [s.id, rememberedModel(recipe, s)])),
  );
  const [settings, setSettings] = useState<Record<string, Values>>({});
  const [picking, setPicking] = useState<Step | null>(null);
  const [mediaFor, setMediaFor] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);
  const keys = { apiKey, hfKey };

  const inputs: RecipeInputs = { slots, choices };
  const needed = stepsNeeded(recipe, inputs);
  const missingModel = needed.find((s) => !s.fixedModel && !models[s.id]);
  const slotProblem = checkSlots(recipe, inputs);

  function send() {
    setProblem(null);
    try {
      const id = startRecipe(
        recipe,
        inputs,
        Object.fromEntries(Object.entries(models).filter((e): e is [string, string] => !!e[1])),
        settings,
      );
      if (id) onStarted?.(id);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not start.");
    }
  }

  const field =
    "w-full rounded-chip bg-t1/[0.05] px-3.5 py-2.5 text-[15px] text-t1 outline-none ring-1 ring-inset ring-transparent placeholder:text-t4 focus:ring-line-strong md:text-[14px]";
  const listOf = (key: string) => (Array.isArray(slots[key]) ? slots[key] : slots[key] ? [slots[key]] : []) as string[];
  const pickers = (
    <>
      <StepModelPicker
        step={picking}
        open={!!picking}
        current={picking ? models[picking.id] : undefined}
        onPick={(modelId) => {
          if (!picking) return;
          chooseStepModel(recipe, picking, modelId);
          setModels((all) => ({ ...all, [picking.id]: modelId }));
          // Another model has its own settings.
          setSettings((all) => ({ ...all, [picking.id]: {} }));
        }}
        onClose={() => setPicking(null)}
      />
      <MediaPicker
        open={!!mediaFor}
        accept={(recipe.slots.find((s) => s.key === mediaFor)?.type as "image" | "video" | "audio") ?? "image"}
        multiple={recipe.slots.find((s) => s.key === mediaFor)?.type === "image"}
        onPick={(urls) => {
          if (!mediaFor) return;
          const slot = recipe.slots.find((s) => s.key === mediaFor);
          setSlots((all) => ({
            ...all,
            [mediaFor]: slot?.type === "image" ? [...((all[mediaFor] as string[]) ?? []), ...urls].slice(0, slot.max ?? 10) : urls[0],
          }));
        }}
        onClose={() => setMediaFor(null)}
      />
    </>
  );

  if (bar) {
    const texts = recipe.slots.filter((s) => s.type === "text");
    const [main, ...rest] = texts;
    const media = recipe.slots.filter((s) => s.type !== "text");
    const chosen = needed.filter((s) => s.fixedModel || models[s.id]).length;
    const stepRows = recipe.steps.map((step, index) =>
      !needed.includes(step) ? (
        <p key={step.id} className="rounded-card bg-t1/[0.03] px-3.5 py-3 text-[12.5px] text-t4">
          {index + 1}. {step.label ?? step.id}: skipped, your own {step.capability === "text-to-speech" ? "recording" : "input"} is used
        </p>
      ) : (
        <StepRow
          key={step.id}
          index={index}
          step={step}
          modelId={models[step.id]}
          settings={settings[step.id] ?? {}}
          inputs={inputs}
          missingKey={(() => {
            const model = getModel(models[step.id] ?? "");
            if (!model) return undefined;
            const provider = providerOf(model);
            return keyFor(keys, provider) ? undefined : PROVIDER_NAME[provider];
          })()}
          onChange={() => setPicking(step)}
          onSettings={(values) => setSettings((all) => ({ ...all, [step.id]: values }))}
        />
      ),
    );
    const blocker = missingModel ? `Choose a model for ${missingModel.label ?? missingModel.id}` : slotProblem ?? null;
    return (
      <div className="flex flex-col gap-1.5 rounded-panel border border-line bg-elevated p-1.5 md:min-h-[130px] md:flex-row md:items-center md:gap-2 md:bg-[var(--chip-well)] md:pr-3 md:shadow-[inset_0_0_0_6px_var(--elevated)]">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-[12px] bg-t1/[0.05] p-3 md:self-stretch md:justify-between md:bg-transparent">
          {main && (
            <textarea
              value={(slots[main.key] as string) ?? ""}
              onChange={(event) => setSlots((all) => ({ ...all, [main.key]: event.target.value }))}
              placeholder={main.placeholder ?? `Describe the ${main.label.toLowerCase()}…`}
              rows={2}
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-t1 outline-none placeholder:text-t4 md:text-[14px]"
            />
          )}
          <div className="flex items-center gap-1.5">
            <ChipRow>
              {lead}
              {rest.map((slot) => {
                const text = (slots[slot.key] as string) ?? "";
                return (
                  <Popover
                    key={slot.key}
                    width={300}
                    align="start"
                    title={slot.label}
                    trigger={() => <Chip icon={<Icon name="pencil" size={14} />} value={text.trim() ? `${slot.label}: ${text.trim()}`.slice(0, 28) : slot.label} active={!!text.trim()} />}
                  >
                    {() => (
                      <textarea
                        autoFocus
                        value={text}
                        onChange={(event) => setSlots((all) => ({ ...all, [slot.key]: event.target.value }))}
                        placeholder={slot.placeholder}
                        rows={3}
                        className={`${field} resize-none`}
                      />
                    )}
                  </Popover>
                );
              })}
              {recipe.choices.map((choice) => (
                <Popover
                  key={choice.key}
                  width={180}
                  align="start"
                  title={choice.label}
                  trigger={() => <Chip icon={<Icon name="ratio-auto" size={14} />} value={choices[choice.key]} />}
                >
                  {(close) => (
                    <div className="flex flex-col">
                      {choice.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setChoices((all) => ({ ...all, [choice.key]: option }));
                            close();
                          }}
                          className="flex h-9 items-center justify-between rounded-[8px] px-2.5 text-left text-[13px] text-t1 hover:bg-t1/[0.06]"
                        >
                          {option}
                          {choices[choice.key] === option && <Icon name="check" size={14} className="text-accent" />}
                        </button>
                      ))}
                    </div>
                  )}
                </Popover>
              ))}
              {/* Every step runs on a model chosen for it: all of them behind one chip. */}
              <Popover
                width={380}
                align="start"
                title="Steps"
                trigger={() => <Chip icon={<Icon name="layers" size={14} />} value={`Models ${chosen}/${needed.length}`} active={chosen === needed.length} />}
              >
                {() => <div className="flex flex-col gap-2">{stepRows}</div>}
              </Popover>
            </ChipRow>
          </div>
          {problem && <p className="text-[12.5px] text-[#ff8f8f]">{problem}</p>}
        </div>
        <div className="flex gap-1.5 max-md:grid max-md:grid-cols-2">
          {media.map((slot) => {
            const list = listOf(slot.key);
            const cover = slot.type === "image" ? list[0] : undefined;
            return (
              <div key={slot.key} className="relative max-md:w-full">
                <button
                  type="button"
                  onClick={() => setMediaFor(slot.key)}
                  aria-label={`Add ${slot.label.toLowerCase()}`}
                  title={slot.label}
                  className="relative flex h-[80px] w-[80px] shrink-0 flex-col justify-end overflow-hidden rounded-[16px] bg-t1/[0.06] p-2 text-left ring-1 ring-inset ring-edge transition-colors duration-[120ms] hover:bg-t1/[0.1] max-md:w-full"
                >
                  {cover ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaSrc(cover)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
                    </>
                  ) : list.length > 0 ? (
                    <span className="absolute left-2 top-2 text-t1">
                      <Icon name={slot.type === "audio" ? "audio" : "video"} size={16} />
                    </span>
                  ) : (
                    <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/35 text-t1 ring-1 ring-inset ring-t1/20">
                      <Icon name="plus" size={13} />
                    </span>
                  )}
                  {list.length > 1 && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-black/65 px-1.5 font-mono text-[10px] text-white">{list.length}</span>
                  )}
                  <span className="relative truncate text-[10px] font-bold uppercase text-t1">
                    {slot.type === "audio" ? "Voice" : slot.label}
                    {!slot.required && <span className="font-medium normal-case text-t3"> · opt.</span>}
                  </span>
                </button>
                {list.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSlots((all) => ({ ...all, [slot.key]: slot.type === "image" ? [] : undefined }))}
                    aria-label={`Remove ${slot.label.toLowerCase()}`}
                    className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-black/80 text-white ring-1 ring-t1/20"
                  >
                    <Icon name="close" size={10} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex max-md:hidden">
          <GenerateButton onClick={send} busy={false} disabled={!!blocker} blocker={blocker} price={null} count={1} needsKey={null} />
        </div>
        <div className="md:hidden">
          <GenerateButton wide onClick={send} busy={false} disabled={!!blocker} blocker={blocker} price={null} count={1} needsKey={null} />
        </div>
        {blocker && <p className="px-2 pb-0.5 text-[11.5px] text-t4 md:hidden">{blocker}</p>}
        {pickers}
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-5">
      {recipe.slots.map((slot) => (
        <div key={slot.key}>
          <p className="mb-1.5 text-[12px] font-medium text-t3">
            {slot.label}
            {!slot.required && <span className="font-normal text-t4"> · optional</span>}
          </p>
          {slot.type === "text" ? (
            <textarea
              value={(slots[slot.key] as string) ?? ""}
              onChange={(event) => setSlots((all) => ({ ...all, [slot.key]: event.target.value }))}
              placeholder={slot.placeholder}
              rows={2}
              className={`${field} resize-none`}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {((Array.isArray(slots[slot.key]) ? slots[slot.key] : slots[slot.key] ? [slots[slot.key]] : []) as string[]).map((url) => (
                <span key={url} className="relative h-16 w-16 overflow-hidden rounded-chip bg-t1/[0.05]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {slot.type === "image" && <img src={mediaSrc(url)} alt="" className="h-full w-full object-cover" />}
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() =>
                      setSlots((all) => {
                        const list = (Array.isArray(all[slot.key]) ? all[slot.key] : [all[slot.key]]) as string[];
                        return { ...all, [slot.key]: list.filter((u) => u !== url) };
                      })
                    }
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <Icon name="close" size={11} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setMediaFor(slot.key)}
                className="grid h-16 w-16 place-items-center rounded-chip bg-t1/[0.06] ring-1 ring-inset ring-edge text-t3 hover:text-t1"
                aria-label={`Add ${slot.label}`}
              >
                <Icon name="plus" size={18} />
              </button>
            </div>
          )}
          {slot.type === "image" && slot.elementKind && (
            <ElementRow
              kind={slot.elementKind}
              onPick={(urls) =>
                setSlots((all) => {
                  const now = (Array.isArray(all[slot.key]) ? all[slot.key] : all[slot.key] ? [all[slot.key]] : []) as string[];
                  const room = (slot.max ?? 10) - now.length;
                  return { ...all, [slot.key]: room > 0 ? [...now, ...urls.filter((u) => !now.includes(u)).slice(0, room)] : now };
                })
              }
            />
          )}
        </div>
      ))}

      {recipe.choices.map((choice) => (
        <div key={choice.key}>
          <p className="mb-1.5 text-[12px] font-medium text-t3">{choice.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {choice.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setChoices((all) => ({ ...all, [choice.key]: option }))}
                className={`rounded-full px-3 py-1.5 text-[13px] transition-colors duration-[120ms] ${
                  choices[choice.key] === option ? "bg-t1/[0.1] text-t1 ring-1 ring-inset ring-line-strong" : "bg-t1/[0.05] text-t2 hover:text-t1"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-medium text-t3">Steps</p>
        {recipe.steps.map((step, index) => !needed.includes(step) ? (
          <p key={step.id} className="rounded-card bg-t1/[0.03] px-3.5 py-3 text-[12.5px] text-t4">
            {index + 1}. {step.label ?? step.id}: skipped, your own {step.capability === "text-to-speech" ? "recording" : "input"} is used
          </p>
        ) : (
          <StepRow
            key={step.id}
            index={index}
            step={step}
            modelId={models[step.id]}
            settings={settings[step.id] ?? {}}
            inputs={inputs}
            missingKey={(() => {
              const model = getModel(models[step.id] ?? "");
              if (!model) return undefined;
              const provider = providerOf(model);
              return keyFor(keys, provider) ? undefined : PROVIDER_NAME[provider];
            })()}
            onChange={() => setPicking(step)}
            onSettings={(values) => setSettings((all) => ({ ...all, [step.id]: values }))}
          />
        ))}
      </div>

      {problem && <p className="text-[13px] text-[#ff8f8f]">{problem}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={!!missingModel || !!slotProblem}
          className="cta rounded-full px-5 py-2.5 text-[14px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          Generate
        </button>
        <span className="text-[12.5px] text-t4">
          {missingModel ? `Choose a model for ${missingModel.label ?? missingModel.id}` : slotProblem ?? ""}
        </span>
      </div>

      {pickers}
    </div>
  );
}

/** The library's elements of a kind, as covers to tap: a product's pictures, a character's face. */
function ElementRow({ kind, onPick }: { kind: LibraryElement["kind"]; onPick: (urls: string[]) => void }) {
  const all = useStudio((s) => s.elements);
  const elements = all.filter((e) => e.kind === kind && pickable(e) && e.images.length > 0);
  if (elements.length === 0) return null;
  return (
    <div className="no-bar mt-2 flex gap-1.5 overflow-x-auto">
      {elements.map((element) => (
        <button
          key={element.id}
          type="button"
          onClick={() => onPick(element.images.map((r) => r.storageUrl))}
          title={`@${element.name}`}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-t1/[0.05] py-1 pl-1 pr-2.5 text-[12px] text-t2 hover:text-t1"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaSrc(element.images[0].storageUrl)} alt="" className="h-6 w-6 rounded-full object-cover" />@{element.name}
        </button>
      ))}
    </div>
  );
}

function StepRow({
  index,
  step,
  modelId,
  settings,
  inputs,
  missingKey,
  onChange,
  onSettings,
}: {
  index: number;
  step: Step;
  modelId?: string;
  settings: Values;
  inputs: RecipeInputs;
  missingKey?: string;
  onChange: () => void;
  onSettings: (values: Values) => void;
}) {
  const [open, setOpen] = useState(false);
  const model = getModel(modelId ?? "");
  const preview = useMemo(
    () => (model ? stepValues(step, model, { inputs, stepStates: [], settings: { [step.id]: settings } }) : null),
    [model, step, inputs, settings],
  );
  // The step's own settings: whatever the model offers that the recipe does not fill.
  const own = model && preview
    ? activeFields(model, preview.values).filter(
        (f) =>
          f.placement !== "prompt" &&
          !preview.mapped.includes(f.key) &&
          !(f.placement === "input" && (f.kind === "images" || f.kind === "media")),
      )
    : [];
  const cost = model && preview ? stepCost(model, preview.values) : undefined;

  return (
    <div className="rounded-card bg-t1/[0.05] ring-1 ring-inset ring-edge">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-t1/[0.08] text-[12px] tabular-nums text-t2">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] text-t1">{step.label ?? step.id}</p>
          <p className="truncate text-[12px] text-t3">
            {model ? (
              <span className="inline-flex items-center gap-1.5">
                {model.name} <ProviderTag model={model} />
                {cost && <span className="text-t4">· {cost}</span>}
              </span>
            ) : (
              capabilityLabel(step.capability)
            )}
          </p>
        </div>
        {!step.fixedModel && (
          <button
            type="button"
            onClick={onChange}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors duration-[120ms] ${
              model ? "bg-t1/[0.07] text-t2 hover:text-t1" : "cta"
            }`}
          >
            {model ? "Change" : "Choose model"}
          </button>
        )}
      </div>
      {model && (missingKey || (preview?.warnings.length ?? 0) > 0 || own.length > 0) && (
        <div className="border-t border-line px-3.5 py-2.5">
          {missingKey && <p className="text-[12px] text-[#ffb46b]">This step needs your {missingKey} key.</p>}
          {preview?.warnings.map((w) => (
            <p key={w} className="text-[12px] text-t4">
              {w}
            </p>
          ))}
          {own.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1 flex items-center gap-1 text-[12px] font-medium text-t2 hover:text-t1"
            >
              <Icon name="sliders" size={13} />
              {open ? "Hide settings" : `Settings · ${own.length}`}
            </button>
          )}
          {open && (
            <div className="mt-3 flex flex-col gap-3">
              {own.map((f) => (
                <div key={f.key}>
                  <p className="mb-1 text-[11.5px] text-t3">{f.label}</p>
                  <Control
                    field={f}
                    value={preview!.values[f.key]}
                    values={preview!.values}
                    dense
                    onChange={(value) => onSettings({ ...settings, [f.key]: value })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
