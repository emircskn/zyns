"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ModelMedia } from "@/components/ModelMedia";
import { PhoneSubnav } from "@/components/PhoneShell";
import { GENJUTSU } from "@/lib/remix/targets";
import { ALL_MODELS, categoriesFor, getModel, modelsFor, type Category, type ModelDef } from "@/lib/registry";
import { CINEMA } from "@/lib/studio/cinema";
import { ownPageOf, useStudio, type Page } from "@/store/studio";

type Filter = "all" | Category | "studios";

const hasPreview = (m: ModelDef) => !!(m.preview?.video || m.preview?.image || m.preview?.poster);
const baseName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * A model as Explore shows it: with its own preview, or, where it has none
 * (KIE's catalogue carries no pictures), the preview of the same model on
 * the other service, so the same Seedance or Nano Banana is not a blank card.
 */
function withPreview(model: ModelDef): ModelDef {
  if (hasPreview(model)) return model;
  const name = baseName(model.name);
  const twin = ALL_MODELS.find((m) => m.id !== model.id && hasPreview(m) && baseName(m.name) === name);
  return twin ? { ...model, preview: twin.preview } : model;
}

interface Feature {
  key: string;
  /** Whose preview it shows. */
  model: ModelDef;
  title: string;
  line: string;
  kind: Filter;
  badge?: string;
  open: () => void;
}

/** A model's preview behind it, its name in large capitals and a line under it, as Higgsfield's Explore leads. */
function HeroCard({ feature }: { feature: Feature }) {
  return (
    <button
      type="button"
      onClick={feature.open}
      className="relative block aspect-[16/11] w-full shrink-0 snap-center overflow-hidden rounded-[12px] bg-surface-2 text-left ring-1 ring-inset ring-line"
    >
      <ModelMedia model={feature.model} own={false} />
      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      {feature.badge && (
        <span className="absolute left-3 top-3 rounded-[6px] bg-accent px-2 py-0.5 font-display text-[10.5px] font-bold uppercase tracking-[0.04em] text-accent-ink">
          {feature.badge}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 p-4">
        <span className="block font-display text-[24px] font-bold uppercase leading-[1.02] tracking-[-0.02em] text-white">{feature.title}</span>
        <span className="mt-1.5 block text-[13.5px] leading-snug text-white/80">{feature.line}</span>
      </span>
    </button>
  );
}

/** A way straight into a kind of work: its picture tilted inside a yellow frame, its name under it. */
function Tile({ label, model, onPick }: { label: string; model?: ModelDef; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} className="flex min-w-0 flex-col items-center gap-2">
      <span className="relative block aspect-square w-full overflow-hidden rounded-[12px] bg-accent">
        <span className="absolute inset-[9%] -rotate-[6deg] overflow-hidden rounded-[9px] bg-surface-2 shadow-[0_6px_14px_rgb(0_0_0/0.35)]">
          {model && <ModelMedia model={model} />}
        </span>
      </span>
      <span className="truncate text-[13.5px] font-medium text-t1">{label}</span>
    </button>
  );
}

/** One model in a row of a kind: its preview and its name. */
function ModelCard({ model, onPick }: { model: ModelDef; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} className="w-[42vw] max-w-[180px] shrink-0 snap-start text-left">
      <span className="relative block aspect-[4/5] overflow-hidden rounded-[10px] bg-surface-2 ring-1 ring-inset ring-line">
        <ModelMedia model={model} />
        {model.badge && (
          <span className="absolute left-2 top-2 rounded-[5px] bg-accent px-1.5 py-px font-display text-[9.5px] font-bold uppercase text-accent-ink">{model.badge}</span>
        )}
      </span>
      <span className="mt-1.5 block truncate text-[13px] font-medium text-t1">{model.name}</span>
      <span className="block truncate text-[11.5px] text-t3">{model.vendor}</span>
    </button>
  );
}

const ROW_NAME: Record<Category, string> = { image: "Image models", video: "Video models", audio: "Audio models", tool: "Tools" };

/**
 * The phone's home, laid out as Higgsfield's Explore: kinds as chips, the
 * leading features as large cards to swipe through, a row of four ways in,
 * then each kind's models in a row of their own. Everything here opens the
 * page it names, with its model chosen.
 */
export function PhoneExplore() {
  const provider = useStudio((s) => s.provider);
  const selectModel = useStudio((s) => s.selectModel);
  const setPage = useStudio((s) => s.setPage);
  const runs = useStudio((s) => s.runs);
  // Models you have made something with show that, so they never come up blank.
  const made = useMemo(
    () => new Set(runs.filter((r) => r.state === "success" && r.output !== "audio" && r.urls.length > 0).map((r) => r.modelId)),
    [runs],
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [at, setAt] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const categories = categoriesFor(provider);
  const models = modelsFor(provider);

  const setComposer = useStudio((s) => s.setComposer);
  // A model picked here lands where its prompt is written, as Create's do.
  const pick = (model: ModelDef) => () => {
    // Cinema Studio and Genjutsu have pages of their own, with their own composer.
    const own = ownPageOf(model.id);
    if (own) return setPage(own);
    selectModel(model.id);
    setPage(model.category as Page);
    setComposer(true);
  };
  const byCategory = useMemo(() => {
    const out = new Map<Category, ModelDef[]>();
    for (const c of categories) {
      const list = models.filter((m) => m.category === c.id).map(withPreview);
      // Those with a preview to show first, the marked ones (NEW, TOP) first among them:
      // a row of blank covers reads as broken.
      const rank = (m: ModelDef) => (hasPreview(m) || made.has(m.id) ? 0 : 2) + (m.badge ? 0 : 1);
      out.set(c.id, [...list].sort((a, b) => rank(a) - rank(b)));
    }
    return out;
  }, [categories, models, made]);

  const features = useMemo(() => {
    const list: Feature[] = [];
    const genjutsu = getModel(GENJUTSU);
    const cinema = getModel(CINEMA);
    const marketing = getModel("hf-marketing-studio-flare");
    if (genjutsu) list.push({ key: "genjutsu", model: genjutsu, title: "Genjutsu", line: "Motion transfer, swap and restyle on a clip you bring", kind: "studios", badge: "Studio", open: () => setPage("remix") });
    if (cinema) list.push({ key: "cinema", model: cinema, title: "Cinema Studio", line: "Direct a shot: camera, film, light and colour", kind: "studios", badge: "Studio", open: () => setPage("studio") });
    if (marketing) list.push({ key: "marketing", model: marketing, title: "Marketing Studio", line: "Product shots, ads and listings, and video made from them", kind: "studios", badge: "Studio", open: () => setPage("marketing") });
    for (const c of categories) {
      for (const model of (byCategory.get(c.id) ?? []).slice(0, 2)) {
        list.push({ key: model.id, model, title: model.name, line: model.tagline, kind: c.id, badge: model.badge, open: pick(model) });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, byCategory]);
  const shown = features.filter((f) => filter === "all" || f.kind === filter);

  // Which card is in view, for the dots under the strip.
  useEffect(() => {
    const node = strip.current;
    if (!node) return;
    setAt(0);
    node.scrollTo({ left: 0 });
    // One step is a card and the gap after it.
    const onScroll = () => {
      const card = node.firstElementChild as HTMLElement | null;
      const step = (card?.offsetWidth ?? node.clientWidth) + 16;
      setAt(Math.round(node.scrollLeft / Math.max(1, step)));
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [filter, shown.length]);

  const first = (c: Category) => byCategory.get(c)?.[0];
  const tiles: Array<{ key: string; label: string; model?: ModelDef; onPick: () => void }> = [
    ...categories
      .filter((c) => c.id === "image" || c.id === "video")
      .map((c) => ({ key: c.id, label: c.label, model: first(c.id), onPick: () => setPage(c.id as Page) })),
    { key: "genjutsu", label: "Genjutsu", model: getModel(GENJUTSU), onPick: () => setPage("remix") },
    { key: "marketing", label: "Marketing", model: getModel("hf-marketing-studio-flare"), onPick: () => setPage("marketing") },
  ].slice(0, 4);

  const chips: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "All" },
    ...categories.map((c) => ({ id: c.id as Filter, label: c.id === "image" ? "Images" : c.id === "video" ? "Videos" : c.label })),
    { id: "studios", label: "Studios" },
  ];
  const rows = categories.filter((c) => filter === "all" || filter === c.id);

  return (
    <div className="anim-fade -mx-4 flex flex-col gap-6 pb-10 pt-2 md:hidden">
      <PhoneSubnav>
      <div className="no-bar flex gap-1.5 overflow-x-auto px-4">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            aria-pressed={filter === chip.id}
            className={`h-8 shrink-0 rounded-[8px] px-3 text-[13px] font-medium transition-colors duration-[100ms] ${
              filter === chip.id ? "bg-t1 text-canvas" : "bg-t1/[0.06] text-t2 ring-1 ring-inset ring-line"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
      </PhoneSubnav>

      {shown.length > 0 && (
        <section>
          <div ref={strip} className="no-bar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 scroll-px-4">
            {shown.map((feature) => (
              <div key={feature.key} className="w-[calc(100vw-32px)] shrink-0 snap-center">
                <HeroCard feature={feature} />
              </div>
            ))}
          </div>
          {shown.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
              {shown.map((f, i) => (
                <span key={f.key} className={`h-1.5 rounded-full transition-[width,background-color] duration-[150ms] ${i === at ? "w-4 bg-t1" : "w-1.5 bg-t1/25"}`} />
              ))}
            </div>
          )}
        </section>
      )}

      {filter === "all" && (
        <section className="grid grid-cols-4 gap-2.5 px-4">
          {tiles.map((tile) => (
            <Tile key={tile.key} label={tile.label} model={tile.model} onPick={tile.onPick} />
          ))}
        </section>
      )}

      {rows.map((c) => {
        const list = byCategory.get(c.id) ?? [];
        if (list.length === 0) return null;
        return (
          <section key={c.id}>
            <div className="mb-2.5 flex items-center justify-between px-4">
              <h2 className="font-display text-[17px] font-semibold text-t1">{ROW_NAME[c.id]}</h2>
              <button type="button" onClick={() => setPage(c.id as Page)} className="text-[13px] text-t3 hover:text-t1">
                See all
              </button>
            </div>
            <div className="no-bar flex snap-x gap-2.5 overflow-x-auto px-4 scroll-px-4">
              {list.slice(0, 12).map((model) => (
                <ModelCard key={model.id} model={model} onPick={pick(model)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
