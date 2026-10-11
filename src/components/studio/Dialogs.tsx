"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";
import { GlideMark } from "@/components/GlideMark";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/Icon";
import { PillGroup } from "@/components/PillGroup";
import { ArcPicker, RulerPicker, StripPicker, type PickItem } from "@/components/studio/FilmPickers";
import { PreviewMedia } from "@/components/studio/Settings";
import { Wheel } from "@/components/studio/Wheel";
import type { Field, Values } from "@/lib/registry";
import { cameraParts } from "@/lib/studio/cinema";
import { MOVE_KEY } from "@/lib/studio/compose";
import { previewOf } from "@/lib/studio/options";
import { usePresence } from "@/lib/usePresence";

type Set = (key: string, value: unknown) => void;

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  /** Something other than Auto is chosen under it. */
  dot?: boolean;
}

/**
 * The setting dialogs' frame: a title with Reset all and close, and (when
 * there is more than one part) a menu down the left; on a phone the menu is
 * a row of tabs across the top. Choices are kept the moment they are made,
 * so there is no Apply; Esc or ✕ closes.
 */
export function StudioDialog({
  open,
  title,
  onClose,
  onReset,
  nav,
  tab,
  onTab,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onReset?: () => void;
  nav?: NavItem[];
  tab?: string;
  onTab?: (id: string) => void;
  children: ReactNode;
}) {
  const { mounted, exiting } = usePresence(open, 240);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Pulled down on a phone, it closes.
  const swipe = useSwipeDismiss(sheetRef, onClose);
  const side = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted || typeof document === "undefined") return null;
  const menu = nav && nav.length > 1;
  return createPortal(
    <div className="fixed inset-0 z-[116] flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-label={title}
        className={`relative flex w-full flex-col overflow-hidden bg-canvas sm:h-[min(560px,88vh)] sm:max-w-[820px] sm:rounded-panel sm:border sm:border-line ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header {...swipe} className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] sm:pt-3.5">
          <p className="text-[16px] font-semibold text-t1">{title}</p>
          <div className="flex items-center gap-2">
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="h-8 rounded-full bg-t1/[0.1] px-3.5 text-[13px] font-medium text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.16]"
              >
                Reset all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </header>
        {menu && (
          <div className="px-4 pb-2 sm:hidden">
            <PillGroup fill value={tab ?? nav[0].id} onChange={(id) => onTab?.(id)} items={nav.map((n) => ({ id: n.id, label: n.label }))} />
          </div>
        )}
        <div className="flex min-h-0 flex-1 gap-1.5 sm:mx-1.5 sm:mb-1.5 sm:rounded-[12px] sm:bg-elevated sm:p-1.5">
          {menu && (
            <nav ref={side} className="relative hidden w-[184px] shrink-0 flex-col gap-1 rounded-card bg-t1/[0.03] p-2 sm:flex">
              <GlideMark value={tab ?? nav[0].id} className="rounded-[12px] bg-t1/[0.1]" deps={[mounted]} />
              {nav.map((item) => (
                <button
                  key={item.id}
                  data-pill={item.id}
                  type="button"
                  onClick={() => onTab?.(item.id)}
                  aria-current={tab === item.id || undefined}
                  className={`relative flex h-9 items-center gap-2 rounded-[12px] px-2.5 text-[14px] transition-colors duration-[200ms] ${
                    tab === item.id ? "text-t1" : "text-t3 hover:bg-t1/[0.05] hover:text-t1"
                  }`}
                >
                  <Icon name={item.icon} size={16} />
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {item.dot && <span aria-label="Set" className="h-1.5 w-1.5 rounded-full bg-t1" />}
                </button>
              ))}
            </nav>
          )}
          <div key={tab} className="anim-fade no-bar min-w-0 flex-1 overflow-y-auto px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-1 sm:p-3">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type Sort = "default" | "az";

/** A part's heading: what it sets, a line on it, and (for long lists) sort and search. */
function PartHead({
  title,
  sub,
  search,
  onSearch,
  sort,
  onSort,
}: {
  title: string;
  sub: string;
  search?: string;
  onSearch?: (q: string) => void;
  sort?: Sort;
  onSort?: (sort: Sort) => void;
}) {
  const [looking, setLooking] = useState(false);
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-t1">{title}</h3>
        <p className="text-[12px] text-t3">{sub}</p>
      </div>
      {onSearch && (
        <div className="flex items-center gap-1.5">
          {onSort && (
            <button
              type="button"
              onClick={() => onSort(sort === "az" ? "default" : "az")}
              className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.06] hover:text-t1"
            >
              <Icon name="sort" size={15} />
              {sort === "az" ? "A–Z" : "Sort by"}
            </button>
          )}
          {looking || search ? (
            <label className="flex h-8 w-[170px] items-center gap-1.5 rounded-full bg-t1/[0.06] px-3 text-t3">
              <Icon name="search" size={14} />
              <input
                autoFocus
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                onBlur={() => !search && setLooking(false)}
                placeholder="Search"
                className="min-w-0 flex-1 bg-transparent text-[16px] text-t1 outline-none placeholder:text-t4 sm:text-[13px]"
              />
            </label>
          ) : (
            <button
              type="button"
              aria-label="Search"
              onClick={() => setLooking(true)}
              className="grid h-8 w-8 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.06] hover:text-t1"
            >
              <Icon name="search" size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function itemsOf(field: Field | undefined): PickItem[] {
  return (field?.choices ?? []).map((c) => ({ value: c.value, label: c.label, preview: previewOf(field!.key, c.value) }));
}

function useListing(field: Field | undefined) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("default");
  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = itemsOf(field).filter((i) => !q || i.value === "" || i.label.toLowerCase().includes(q));
    if (sort !== "az") return all;
    // Auto stays first; the rest by name.
    return [...all.filter((i) => i.value === ""), ...all.filter((i) => i.value !== "").sort((a, b) => a.label.localeCompare(b.label))];
  }, [field, search, sort]);
  return { items, search, setSearch, sort, setSort };
}

/** A grid of picture cards; a hover plays the loop, a tap chooses. */
function CardGrid({
  label,
  items,
  value,
  onPick,
  cols,
  square,
  action,
}: {
  label: string;
  items: PickItem[];
  value: string;
  onPick: (value: string) => void;
  cols: string;
  /** Square cards (camera moves), rather than wide. */
  square?: boolean;
  /** What a hover offers beside choosing (Put on prompt). */
  action?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-2 ${cols}`}>
      {items.map((item) => {
        const on = value === item.value;
        const over = hover === item.value;
        return (
          <button
            key={item.value || "auto"}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={item.label}
            onClick={() => onPick(item.value)}
            onPointerEnter={(event) => event.pointerType === "mouse" && setHover(item.value)}
            onPointerLeave={() => setHover(null)}
            className="group flex min-w-0 flex-col gap-1.5 text-left"
          >
            <span
              className={`relative block w-full overflow-hidden rounded-card transition-shadow duration-[150ms] ${square ? "aspect-square" : "aspect-[16/9]"} ${
                on ? "shadow-[0_0_0_2px_var(--t1)]" : "shadow-[0_0_0_1px_var(--line)] group-hover:shadow-[0_0_0_1px_var(--line-strong)]"
              }`}
            >
              {item.preview ? (
                <span className="absolute inset-0">
                  <PreviewMedia preview={item.preview} play={over || on} className="h-full w-full" />
                </span>
              ) : (
                <span className="absolute inset-0 grid place-items-center bg-t1/[0.05] text-t3">
                  <Icon name={item.value === "" ? "spark" : "film"} size={22} />
                </span>
              )}
              {action && over && !on && item.value !== "" && (
                <span className="cta absolute inset-x-2 bottom-2 rounded-full py-1.5 text-center text-[12px] font-semibold">{action}</span>
              )}
            </span>
            <span className={`truncate px-0.5 text-[12.5px] font-medium ${on ? "text-t1" : "text-t3 group-hover:text-t1"}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const isSet = (values: Values, key: string) => {
  const v = values[key];
  return v !== undefined && v !== null && v !== "";
};

/** Camera: Setup on three wheels, and Movement as a grid that puts its pick on the prompt. */
export function CameraDialog({
  open,
  fields,
  values,
  onSet,
  onPutMove,
  onClose,
  startTab,
}: {
  open: boolean;
  fields: Field[];
  values: Values;
  onSet: Set;
  /** A move picked (or "" for none): the composer puts its chip on the prompt. */
  onPutMove: (value: string) => void;
  onClose: () => void;
  startTab?: "setup" | "movement";
}) {
  const { setup, movement } = cameraParts(fields);
  const [tab, setTab] = useState<string>(startTab ?? "setup");
  useEffect(() => {
    if (open) setTab(startTab ?? "setup");
  }, [open, startTab]);
  const listing = useListing(movement);
  const icons: IconName[] = ["camera", "lens", "aperture"];
  return (
    <StudioDialog
      open={open}
      title="Camera"
      onClose={onClose}
      onReset={() => {
        for (const field of setup) onSet(field.key, "");
        onPutMove("");
      }}
      nav={[
        { id: "setup", label: "Setup", icon: "camera", dot: setup.some((f) => isSet(values, f.key)) },
        ...(movement ? [{ id: "movement", label: "Movement", icon: "move" as IconName, dot: isSet(values, MOVE_KEY) }] : []),
      ]}
      tab={tab}
      onTab={setTab}
    >
      {tab === "setup" ? (
        <div className="flex gap-1">
          {setup.map((field, i) => (
            <Wheel
              key={field.key}
              field={field.key}
              label={field.label}
              choices={field.choices ?? []}
              value={values[field.key]}
              autoIcon={icons[i] ?? "camera"}
              shaded={i === 1}
              onChange={(next) => onSet(field.key, next)}
            />
          ))}
        </div>
      ) : movement ? (
        <>
          <PartHead
            title="Direct a camera move"
            sub="Adds to the prompt box, or type # there. One per shot."
            search={listing.search}
            onSearch={listing.setSearch}
            sort={listing.sort}
            onSort={listing.setSort}
          />
          <CardGrid
            label={movement.label}
            items={listing.items}
            value={String(values[MOVE_KEY] ?? "")}
            square
            action="Put on prompt"
            cols="grid-cols-2 sm:grid-cols-4"
            onPick={onPutMove}
          />
        </>
      ) : null}
    </StudioDialog>
  );
}

/** Film setup: Genre on a dial, Era on a ruler, Tempo on a strip. */
export function FilmDialog({ open, fields, values, onSet, onClose }: { open: boolean; fields: Field[]; values: Values; onSet: Set; onClose: () => void }) {
  const genre = fields.find((f) => f.key === "genre");
  const era = fields.find((f) => f.key === "era");
  const pacing = fields.find((f) => f.key === "pacing");
  const rest = fields.filter((f) => f !== genre && f !== era && f !== pacing);
  const parts = [genre, era, pacing, ...rest].filter((f): f is Field => !!f);
  const [tab, setTab] = useState<string>(parts[0]?.key ?? "genre");
  const field = parts.find((f) => f.key === tab) ?? parts[0];

  // The ruler reads newest to oldest with Auto in the middle, as a dial set to nothing.
  const eraItems = useMemo(() => {
    const items = itemsOf(era);
    const auto = items.filter((i) => i.value === "");
    const dated = items.filter((i) => i.value !== "").sort((a, b) => b.value.localeCompare(a.value));
    const half = Math.ceil(dated.length / 2);
    return [...dated.slice(0, half), ...auto, ...dated.slice(half)];
  }, [era]);

  const head: Record<string, [string, string]> = {
    genre: ["Select genre", "Story conventions the model should follow"],
    era: ["Select era", "The period the film belongs to"],
    pacing: ["Select tempo", "Pacing of the montage"],
  };
  const value = field ? String(values[field.key] ?? "") : "";
  const set = (next: string) => field && onSet(field.key, next);

  return (
    <StudioDialog
      open={open}
      title="Film setup"
      onClose={onClose}
      onReset={() => parts.forEach((f) => onSet(f.key, ""))}
      nav={parts.map((f) => ({
        id: f.key,
        label: f.key === "pacing" ? "Tempo" : f.label,
        icon: f.key === "genre" ? "film" : f.key === "era" ? "clock" : f.key === "pacing" ? "move" : "sliders",
        dot: isSet(values, f.key),
      }))}
      tab={field?.key}
      onTab={setTab}
    >
      {field && (
        <>
          <PartHead title={head[field.key]?.[0] ?? field.label} sub={head[field.key]?.[1] ?? "Auto leaves it to the model"} />
          {field.key === "genre" ? (
            <ArcPicker label={field.label} items={itemsOf(field)} value={value} onChange={set} />
          ) : field.key === "era" ? (
            <RulerPicker label={field.label} items={eraItems} value={value} onChange={set} />
          ) : field.key === "pacing" ? (
            <StripPicker label={field.label} items={itemsOf(field)} value={value} onChange={set} />
          ) : (
            <CardGrid label={field.label} items={itemsOf(field)} value={value} onPick={set} cols="grid-cols-2 sm:grid-cols-3" />
          )}
        </>
      )}
    </StudioDialog>
  );
}

/** One field's cards (the palette, the lighting, anything new): search, sort, tap to choose, tap again for Auto. */
export function GridDialog({
  open,
  title,
  head,
  sub,
  field,
  values,
  onSet,
  onClose,
  cols,
}: {
  open: boolean;
  title: string;
  head: string;
  sub: string;
  field: Field | undefined;
  values: Values;
  onSet: Set;
  onClose: () => void;
  cols: string;
}) {
  const listing = useListing(field);
  if (!field) return null;
  const value = String(values[field.key] ?? "");
  return (
    <StudioDialog open={open} title={title} onClose={onClose} onReset={() => onSet(field.key, "")}>
      <PartHead title={head} sub={sub} search={listing.search} onSearch={listing.setSearch} sort={listing.sort} onSort={listing.setSort} />
      <CardGrid
        label={field.label}
        items={listing.items}
        value={value}
        cols={cols}
        onPick={(next) => onSet(field.key, next === value ? "" : next)}
      />
    </StudioDialog>
  );
}
