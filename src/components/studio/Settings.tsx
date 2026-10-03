"use client";

import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { MediaThumb } from "@/components/controls";
import { PillGroup } from "@/components/PillGroup";
import { Sheet } from "@/components/remix/Restyle";
import { Wheel } from "@/components/studio/Wheel";
import { cameraParts, listOf, type CardId } from "@/lib/studio/cinema";
import type { Field, Values } from "@/lib/registry";
import { mediaSrc } from "@/lib/storage/client";
import { keysFor, moveItem, useReorder } from "@/lib/useReorder";
import { useStudio } from "@/store/studio";

type Set = (key: string, value: unknown) => void;

/** One of the cards over the prompt: what it sets, and what it is set to. */
export function SettingCard({
  icon,
  label,
  value,
  onClick,
  wide,
  set,
}: {
  icon: IconName;
  label: string;
  value: string;
  onClick: () => void;
  wide?: boolean;
  /** Something other than Auto is chosen. */
  set?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-col gap-2 rounded-panel bg-t1/[0.05] px-3 py-2.5 text-left transition-colors duration-[120ms] hover:bg-t1/[0.09] active:bg-t1/[0.11] ${
        wide ? "col-span-2" : ""
      }`}
    >
      <span className="flex items-center gap-1.5 text-[12px] text-t3">
        <Icon name={icon} size={14} />
        {label}
      </span>
      <span className={`truncate text-[13.5px] ${set ? "text-t1" : "text-t3"}`}>{value}</span>
    </button>
  );
}

function Done({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="cta h-11 w-full rounded-panel text-[14.5px] font-semibold">
      Done
    </button>
  );
}

/** A field's choices as a grid of buttons; one is chosen at a time. */
function OptionGrid({ field, value, onPick, search }: { field: Field; value: unknown; onPick: (value: string) => void; search?: string }) {
  const q = (search ?? "").trim().toLowerCase();
  const choices = (field.choices ?? []).filter((c) => !q || c.value === "" || c.label.toLowerCase().includes(q));
  return (
    <div role="radiogroup" aria-label={field.label} className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {choices.map((choice) => {
        const on = (value ?? "") === choice.value;
        return (
          <button
            key={choice.value || "auto"}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(choice.value)}
            className={`flex min-h-[44px] flex-col justify-center rounded-card px-3 py-2 text-left transition-colors duration-[120ms] ${
              on ? "bg-t1 text-canvas" : "bg-t1/[0.05] text-t2 hover:bg-t1/[0.1] hover:text-t1"
            }`}
          >
            <span className="flex items-center gap-1.5 text-[13px]">
              {choice.value === "" && <Icon name="spark" size={13} />}
              <span className="truncate">{choice.label}</span>
            </span>
            {choice.value === "" && <span className={`text-[11px] ${on ? "opacity-70" : "text-t4"}`}>Let the model decide</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Camera: the body, lens and aperture on three wheels, and one move. */
export function CameraSheet({
  open,
  fields,
  values,
  onSet,
  onClose,
}: {
  open: boolean;
  fields: Field[];
  values: Values;
  onSet: Set;
  onClose: () => void;
}) {
  const { setup, movement } = cameraParts(fields);
  const [tab, setTab] = useState<"setup" | "movement">("setup");
  return (
    <Sheet open={open} title="Camera" sub="Auto leaves it to the model" onClose={onClose} footer={<Done onClick={onClose} />}>
      {movement && setup.length > 0 && (
        <PillGroup
          fill
          value={tab}
          onChange={setTab}
          items={[
            { id: "setup", label: "Setup" },
            { id: "movement", label: "Movement" },
          ]}
          className="mb-3"
        />
      )}
      {tab === "setup" && setup.length > 0 ? (
        <div className="flex gap-2">
          {setup.map((field) => (
            <Wheel
              key={field.key}
              label={field.label}
              choices={field.choices ?? []}
              value={values[field.key]}
              onChange={(next) => onSet(field.key, next)}
            />
          ))}
        </div>
      ) : movement ? (
        <>
          <p className="mb-2 px-1 text-[12.5px] text-t3">One move per shot.</p>
          <OptionGrid field={movement} value={values[movement.key]} onPick={(next) => onSet(movement.key, next)} />
        </>
      ) : null}
    </Sheet>
  );
}

/** Film, Light, Palette and any other choices: each field's options in a grid. */
export function ChoiceSheet({
  open,
  title,
  fields,
  values,
  onSet,
  onClose,
}: {
  open: boolean;
  title: string;
  fields: Field[];
  values: Values;
  onSet: Set;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  // A long list (the palettes) gets a search box.
  const long = fields.some((f) => (f.choices?.length ?? 0) > 16);
  return (
    <Sheet open={open} title={title} sub="Auto leaves it to the model" onClose={onClose} footer={<Done onClick={onClose} />}>
      {long && (
        <label className="mb-3 flex h-10 items-center gap-2 rounded-full bg-t1/[0.05] px-3.5 text-t3">
          <Icon name="search" size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-t1 outline-none placeholder:text-t4 md:text-[14px]"
          />
        </label>
      )}
      <div className="flex flex-col gap-4">
        {fields.map((field) => (
          <section key={field.key} className="flex flex-col gap-2">
            {fields.length > 1 && <h3 className="px-1 text-[12px] font-medium uppercase tracking-[0.08em] text-t3">{field.label}</h3>}
            <OptionGrid field={field} value={values[field.key]} onPick={(next) => onSet(field.key, next)} search={search} />
          </section>
        ))}
      </div>
    </Sheet>
  );
}

const KIND_ICON: Record<string, IconName> = { image: "image", video: "video", audio: "audio" };

/** One reference list: its media in order (held to reorder), and a way to add more. */
function ReferenceList({
  field,
  urls,
  onChange,
  onAdd,
  onElements,
}: {
  field: Field;
  urls: string[];
  onChange: (urls: string[]) => void;
  onAdd: () => void;
  onElements?: () => void;
}) {
  const keys = keysFor(urls);
  const reorder = useReorder(urls.length, (from, to) => onChange(moveItem(urls, from, to)));
  const room = field.maxItems ?? 10;
  const kind = field.accept ?? "image";
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 className="flex items-center gap-1.5 text-[13px] text-t1">
          <Icon name={KIND_ICON[kind] ?? "image"} size={15} />
          {field.label}
          <span className="font-mono text-[12px] tabular-nums text-t4">
            {urls.length}/{room}
          </span>
        </h3>
        {onElements && (
          <button
            type="button"
            onClick={onElements}
            className="flex items-center gap-1.5 rounded-full bg-t1/[0.07] px-3 py-1.5 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
          >
            <Icon name="user" size={13} />
            From Elements
          </button>
        )}
      </div>
      <div className="no-bar flex gap-2.5 overflow-x-auto pb-1">
        {urls.length < room && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add ${field.label.toLowerCase()}`}
            className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-[20px] border-[1.5px] border-dashed border-line-strong bg-t1/[0.02] transition-colors duration-[150ms] active:bg-t1/[0.06]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-t1/[0.1] text-t1">
              <Icon name="plus" size={20} />
            </span>
          </button>
        )}
        {urls.map((url, index) => {
          const { className, ...hold } = reorder.bind(index);
          return (
            <div key={keys[index]} {...hold} className={`w-[88px] shrink-0 ${className}`}>
              <MediaThumb url={url} roomy onRemove={() => onChange(urls.filter((_, i) => i !== index))} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Library elements, whose pictures come in as references. */
export function ElementGrid({ onPick }: { onPick: (urls: string[], name: string) => void }) {
  const elements = useStudio((s) => s.elements).filter((e) => e.kind !== "style");
  if (elements.length === 0) {
    return <p className="py-6 text-center text-[13px] text-t4">No characters, places or products yet. Make one on the Elements page.</p>;
  }
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {elements.map((element) => (
        <button
          key={element.id}
          type="button"
          onClick={() => onPick(element.images.map((ref) => ref.storageUrl), element.name)}
          title={`@${element.name}`}
          className="group flex flex-col items-center gap-1"
        >
          <span className="block aspect-square w-full overflow-hidden rounded-card bg-surface-2 ring-1 ring-inset ring-line transition-transform duration-[120ms] group-hover:scale-[1.03]">
            {element.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaSrc(element.images[0].storageUrl)} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <span className="w-full truncate text-center text-[11px] text-t3">@{element.name}</span>
        </button>
      ))}
    </div>
  );
}

/** The pictures, clips and sound the shot is made from. */
export function ReferencesSheet({
  open,
  fields,
  values,
  onSet,
  onClose,
}: {
  open: boolean;
  fields: Field[];
  values: Values;
  onSet: Set;
  onClose: () => void;
}) {
  const [picking, setPicking] = useState<Field | null>(null);
  const [elements, setElements] = useState(false);
  const images = fields.find((f) => (f.accept ?? "image") === "image");
  const total = useMemo(() => fields.reduce((n, f) => n + listOf(values[f.key]).length, 0), [fields, values]);

  function add(field: Field, urls: string[]) {
    const now = listOf(values[field.key]);
    onSet(field.key, [...now, ...urls.filter((u) => !now.includes(u))].slice(0, field.maxItems ?? urls.length + now.length));
  }

  return (
    <>
      <Sheet
        open={open}
        title="References"
        sub={total > 0 ? `${total} added · characters, places and props the shot keeps` : "Characters, places and props the shot keeps"}
        onClose={onClose}
        footer={<Done onClick={onClose} />}
      >
        <div className="flex flex-col gap-5">
          {fields.map((field) => (
            <ReferenceList
              key={field.key}
              field={field}
              urls={listOf(values[field.key])}
              onChange={(urls) => onSet(field.key, urls)}
              onAdd={() => setPicking(field)}
              onElements={field === images ? () => setElements((was) => !was) : undefined}
            />
          ))}
          {elements && images && (
            <div className="anim-fade rounded-panel border border-line bg-elevated p-3">
              <ElementGrid
                onPick={(urls) => {
                  add(images, urls);
                  setElements(false);
                }}
              />
            </div>
          )}
        </div>
      </Sheet>
      <MediaPicker
        open={picking !== null}
        accept={(picking?.accept ?? "image") as "image" | "video" | "audio"}
        multiple
        taken={picking ? listOf(values[picking.key]) : []}
        onPick={(urls) => picking && add(picking, urls)}
        onClose={() => setPicking(null)}
      />
    </>
  );
}

export type OpenSheet = CardId | "more" | "refs" | null;
