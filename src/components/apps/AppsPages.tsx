"use client";

import { useMemo, useRef, useState } from "react";
import { Control } from "@/components/controls";
import { Gallery } from "@/components/Gallery";
import { Icon } from "@/components/Icon";
import { DrawPad, type DrawApi } from "@/components/apps/DrawPad";
import { submitModelRun } from "@/lib/generate";
import { activeFields, defaultValues, KIE_MODELS, type ModelDef } from "@/lib/registry";
import { estimateCredits, formatCredits } from "@/lib/registry/pricing";
import { mediaSrc } from "@/lib/storage/client";
import { uploadFile } from "@/lib/upload";
import { activeKey, useStudio } from "@/store/studio";

/** Higgsfield's Apps categories, and where each of ours goes (a few apps sit elsewhere by name). */
const SECTIONS = ["Professional", "Enhance & Style", "Face & Identity", "Video Editing", "Ads & Products", "Trending Templates", "Extras"];
const SECTION_OF: Record<string, string> = {
  FACE: "Face & Identity",
  CHARACTER: "Face & Identity",
  CAMERA: "Professional",
  EDIT: "Professional",
  STYLE: "Enhance & Style",
  FUN: "Extras",
  ADS: "Ads & Products",
  TEMPLATES: "Trending Templates",
  VIDEO: "Video Editing",
  "VIDEO EDIT": "Video Editing",
};
const SECTION_BLURB: Record<string, string> = {
  Professional: "Camera angles, shots and seamless transitions",
  "Enhance & Style": "Relight, restyle and polish a picture",
  "Face & Identity": "Swap faces and characters, make a character",
  "Video Editing": "Change who or what is in a clip, or how it looks",
  "Ads & Products": "Turn one product picture into an ad",
  "Trending Templates": "One photo, one click, a trending look",
  Extras: "Small fun ones",
};
const sectionOf = (m: ModelDef) => (m.id === "app-transitions" || m.id === "app-behind-the-scenes" ? "Professional" : SECTION_OF[m.badge ?? ""] ?? "Extras");

/** Where a card's picture would be; until one is added the card is a quiet tile with its name. */
const coverOf = (id: string) => `${process.env.NEXT_PUBLIC_ASSET_BASE ?? ""}/app-covers/${id}.webp`;

function Cover({ model, className = "" }: { model: ModelDef; className?: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <span className={`relative block overflow-hidden bg-t1/[0.06] ${className}`}>
      {!missing ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverOf(model.id)} alt="" loading="lazy" onError={() => setMissing(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-gradient-to-br from-t1/[0.1] to-transparent">
          <Icon name={model.output === "video" ? "film" : "image"} size={24} className="text-t4" />
        </span>
      )}
    </span>
  );
}

/** The panel on the left of an app: what it needs, what it can be set to, what it will cost, and which model does the work. */
function Runner({ model, onKeyClick, onChange }: { model: ModelDef; onKeyClick: () => void; onChange?: () => void }) {
  const apiKey = useStudio(activeKey);
  const stored = useStudio((s) => s.valuesByModel[model.id]);
  const setModelValues = useStudio((s) => s.setModelValues);
  const values = useMemo(() => stored ?? defaultValues(model), [stored, model]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [painted, setPainted] = useState(0);
  const pad = useRef<DrawApi | null>(null);

  const fields = activeFields(model, values);
  const first = values.slot0 as string[] | string | undefined;
  const picture = Array.isArray(first) ? first[0] : first;
  const blocker = model.validate?.(model.draw ? { ...values, mask: "x" } : values) ?? null;
  const credits = estimateCredits(model, values);

  async function generate() {
    if (!apiKey) return onKeyClick();
    setError(null);
    setBusy(true);
    try {
      let sent = values;
      if (model.draw) {
        const blob = await pad.current?.mask();
        if (!blob) throw new Error("Paint the area to change first.");
        sent = { ...values, mask: await uploadFile(new File([blob], "mask.png", { type: "image/png" }), apiKey, "kie") };
      }
      const result = await submitModelRun(model, sent);
      if (!result.ok) setError(result.error ?? "Could not start.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-4">
      <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-panel border border-line bg-elevated md:sticky md:top-[76px] md:h-[calc(100dvh-92px)] md:w-[360px]">
        <div className="no-bar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <div className="relative">
            <Cover model={model} className="aspect-[16/9] rounded-card" />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-card bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-10">
              <span className="block font-display text-[20px] font-bold uppercase leading-none text-white">{model.name}</span>
            </span>
            {onChange && (
              <button type="button" onClick={onChange} className="absolute right-2 top-2 flex items-center gap-1.5 rounded-chip bg-black/60 px-2.5 py-1.5 text-[12.5px] text-white backdrop-blur hover:bg-black/75">
                <Icon name="pencil" size={13} /> Change
              </button>
            )}
          </div>
          <p className="text-[12.5px] leading-snug text-t3">{model.tagline}</p>
          {fields.map((field) => (
            <div key={field.key}>
              {field.kind !== "images" && field.kind !== "media" && <p className="mb-1.5 text-[12px] font-medium text-t3">{field.label}</p>}
              <Control
                // A short list reads better as a row of choices than as a column.
                field={field.kind === "select" && (field.choices?.length ?? 0) <= 4 ? { ...field, kind: "segmented" } : field}
                value={values[field.key]}
                values={values}
                dense
                onChange={(value) => setModelValues(model.id, { [field.key]: value })}
              />
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-line p-3">
          {model.runsOn && (
            <p className="mb-2 text-center text-[11.5px] text-t4">
              Runs on {model.runsOn(values)} · KIE
            </p>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={busy || (!!apiKey && !!blocker && !model.draw)}
            title={blocker ?? undefined}
            className="cta flex h-11 w-full items-center justify-center gap-2 rounded-chip text-[14px] font-semibold disabled:opacity-50"
          >
            {busy ? "Starting…" : "Generate"}
            {credits !== undefined && !busy && <span className="font-mono text-[12px] opacity-80">{formatCredits(credits)}</span>}
          </button>
          {(error || (apiKey && blocker && !model.draw)) && <p className="mt-2 text-center text-[11.5px] text-[#ff8f8f]">{error ?? blocker}</p>}
        </div>
      </aside>

      <section className="mt-4 flex min-w-0 flex-1 flex-col gap-4 md:mt-0">
        {model.draw && picture && (
          <div className="rounded-panel border border-line bg-elevated p-3">
            <p className="mb-2 text-[12px] text-t3">Paint over the part to change{painted ? ` · ${painted} stroke${painted > 1 ? "s" : ""}` : ""}, then say what it should become in Details.</p>
            <DrawPad src={picture} api={pad} onCount={setPainted} />
          </div>
        )}
        <div className="flex items-center justify-between px-1">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-t3">History</p>
        </div>
        <Gallery modelId={model.id} view="grid" />
      </section>
    </div>
  );
}

function NeedsKie() {
  const setProvider = useStudio((s) => s.setProvider);
  return (
    <div className="grid flex-1 place-items-center px-4 py-16 text-center">
      <div className="max-w-[420px]">
        <p className="text-[22px] tracking-[-0.02em] text-t1">These run on KIE</p>
        <p className="mt-2 text-[13px] text-t3">Higgsfield has its own Apps and Effects on its website. Switch the service at the top to KIE to use them here.</p>
        <button type="button" onClick={() => setProvider("kie")} className="cta mt-5 rounded-full px-5 py-2.5 text-[13.5px] font-medium">
          Switch to KIE
        </button>
      </div>
    </div>
  );
}

/** Higgsfield's Apps page: search, categories, and a card for each app that opens its own page. */
function AppsGallery({ onKeyClick }: { onKeyClick: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("All");
  const apps = useMemo(() => KIE_MODELS.filter((m) => m.app === "apps"), []);
  const open = apps.find((m) => m.id === openId);

  if (open) {
    return (
      <div className="anim-fade flex flex-1 flex-col px-4 pt-4">
        <button type="button" onClick={() => setOpenId(null)} className="mb-3 flex w-fit items-center gap-1.5 text-[13px] text-t3 hover:text-t1">
          <Icon name="chevron" size={14} className="rotate-90" /> All apps
        </button>
        <Runner model={open} onKeyClick={onKeyClick} />
      </div>
    );
  }

  const needle = query.trim().toLowerCase();
  const shown = apps.filter((m) => (!needle || `${m.name} ${m.tagline}`.toLowerCase().includes(needle)) && (section === "All" || sectionOf(m) === section));

  return (
    <div className="anim-fade mx-auto w-full max-w-[1500px] px-4 pb-10 pt-6 md:px-6">
      <h1 className="font-display text-[44px] font-bold uppercase leading-none tracking-[-0.01em] text-t1 md:text-[56px]">Apps</h1>
      <p className="mt-3 text-[13.5px] text-t3">One-click AI tools: change a picture or a clip, or turn it into an ad, in one step.</p>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex h-10 w-full items-center gap-2 rounded-full bg-t1/[0.05] px-3.5 md:w-[260px]">
          <Icon name="search" size={16} className="text-t4" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[14px] text-t1 outline-none placeholder:text-t4" />
        </div>
        {["All", ...SECTIONS].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setSection(name)}
            className={`h-9 rounded-full px-3.5 text-[13px] ${section === name ? "bg-t1 text-canvas" : "bg-t1/[0.06] text-t2 hover:bg-t1/[0.12]"}`}
          >
            {name}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="py-16 text-center text-[13px] text-t4">No apps match “{query}”.</p>}
      {SECTIONS.map((name) => {
        const list = shown.filter((m) => sectionOf(m) === name);
        if (!list.length) return null;
        return (
          <section key={name} className="mt-9">
            <h2 className="font-display text-[22px] font-bold uppercase text-t1">{name}</h2>
            <p className="mb-3 text-[12.5px] text-t3">{SECTION_BLURB[name]}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((m) => (
                <button key={m.id} type="button" onClick={() => setOpenId(m.id)} className="group flex flex-col justify-start text-left">
                  <Cover model={m} className="aspect-[4/3] rounded-card ring-1 ring-inset ring-edge transition-transform duration-150 group-hover:scale-[1.015]" />
                  <span className="mt-2 block truncate text-[14px] font-semibold text-t1">{m.name}</span>
                  <span className="line-clamp-2 text-[12px] leading-snug text-t3">{m.tagline}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Higgsfield's Effects page: one effect at a time on the left, Change opens every effect. */
function EffectsPage({ onKeyClick }: { onKeyClick: () => void }) {
  const effects = useMemo(() => KIE_MODELS.filter((m) => m.app === "effects"), []);
  const [id, setId] = useState(effects[0]?.id);
  const [changing, setChanging] = useState(false);
  const [query, setQuery] = useState("");
  const model = effects.find((m) => m.id === id) ?? effects[0];
  if (!model) return null;
  const needle = query.trim().toLowerCase();
  const list = effects.filter((m) => !needle || m.name.toLowerCase().includes(needle));

  return (
    <div className="anim-fade flex flex-1 flex-col px-4 pt-4">
      <Runner model={model} onKeyClick={onKeyClick} onChange={() => setChanging(true)} />
      {changing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setChanging(false)} className="absolute inset-0 bg-canvas-deep/80 backdrop-blur-md" />
          <div className="relative flex h-[min(760px,90dvh)] w-full max-w-[1000px] flex-col overflow-hidden rounded-panel border border-edge bg-[var(--popover)]" style={{ boxShadow: "var(--shadow-pop)" }}>
            <div className="flex items-center gap-3 border-b border-line p-3">
              <p className="font-display text-[18px] font-bold uppercase">Effects</p>
              <div className="flex h-9 flex-1 items-center gap-2 rounded-full bg-t1/[0.05] px-3">
                <Icon name="search" size={15} className="text-t4" />
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-t4" />
              </div>
              <button type="button" aria-label="Close" onClick={() => setChanging(false)} className="grid h-9 w-9 place-items-center rounded-full bg-t1/[0.06] hover:bg-t1/[0.12]">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-3 sm:grid-cols-3 md:grid-cols-4">
              {list.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setId(m.id);
                    setChanging(false);
                  }}
                  aria-pressed={m.id === model.id}
                  className="text-left"
                >
                  <span className="relative block">
                    <Cover model={m} className={`aspect-[3/4] rounded-card ${m.id === model.id ? "ring-2 ring-accent" : "ring-1 ring-inset ring-edge"}`} />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-card bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-2 pt-10">
                      <span className="block truncate text-[13px] font-semibold text-white">{m.name}</span>
                    </span>
                  </span>
                </button>
              ))}
              {list.length === 0 && <p className="col-span-full py-12 text-center text-[13px] text-t4">No effect matches “{query}”.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppsPages({ kind, onKeyClick }: { kind: "apps" | "effects"; onKeyClick: () => void }) {
  const provider = useStudio((s) => s.provider);
  const hydrated = useStudio((s) => s.hydrated);
  if (!hydrated) return null;
  if (provider !== "kie") return <NeedsKie />;
  return kind === "apps" ? <AppsGallery onKeyClick={onKeyClick} /> : <EffectsPage onKeyClick={onKeyClick} />;
}
