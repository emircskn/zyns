"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Stagger } from "@/components/Stagger";
import { ELEMENT_KINDS, SOUL_MODELS, elementName, inUse, type ElementKind, type LibraryElement } from "@/lib/elements";
import { listSouls } from "@/lib/higgsfield/transport";
import { makeMediaRef } from "@/lib/media";
import { mediaSrc, thumbSrc } from "@/lib/storage/client";
import { useStudio } from "@/store/studio";

type Filter = "all" | ElementKind | "archived";

/**
 * The Elements library: the characters, places, products and styles kept
 * with their reference pictures, each called into a prompt with `@name`.
 */
export function ElementsPage() {
  const elements = useStudio((s) => s.elements);
  const openEditor = useStudio((s) => s.openElementEditor);
  const openTrainer = useStudio((s) => s.openSoulTrainer);
  const hfKey = useStudio((s) => s.hfKey);
  const [filter, setFilter] = useState<Filter>("all");
  // Characters come two ways: sheets (pictures, for every model) and Soul IDs (Higgsfield's, for one Soul model).
  const [side, setSide] = useState<"sheets" | "soul">("sheets");
  const [importing, setImporting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const saveElement = useStudio((s) => s.saveElement);
  const archived = elements.filter((e) => !inUse(e));
  const souls = filter === "character" && side === "soul";
  // Archived ones keep to their own tab, out of the way of the ones in use.
  const shown = elements.filter((e) =>
    filter === "archived"
      ? !inUse(e)
      : inUse(e) && (filter === "all" || (e.kind === filter && (filter !== "character" || (side === "soul") === !!e.soul))),
  );
  const newOne = () => (souls ? openTrainer({}) : openEditor(filter === "all" || filter === "archived" ? {} : { kind: filter }));

  /** Soul IDs already on the Higgsfield account, brought in beside the ones made here. */
  async function importSouls() {
    if (!hfKey) return setNote("Add your Higgsfield key first.");
    setImporting(true);
    setNote(null);
    const found = await listSouls(hfKey);
    const known = new Set(elements.flatMap((e) => (e.soul ? [e.soul.id] : [])));
    const names = new Set(elements.map((e) => e.name));
    let added = 0;
    for (const soul of found) {
      if (known.has(soul.id)) continue;
      let name = elementName(soul.name) || "character";
      for (let n = 2; names.has(name); n += 1) name = `${elementName(soul.name) || "character"}-${n}`;
      names.add(name);
      const cover = soul.thumbnail ? await makeMediaRef(soul.thumbnail, "image").catch(() => null) : null;
      const element: LibraryElement = {
        id: crypto.randomUUID(),
        kind: "character",
        name,
        images: cover ? [cover] : [],
        status: "ready",
        soul: { id: soul.id, version: soul.version, state: soul.state, error: soul.error },
        createdAt: soul.createdAt ?? Date.now(),
      };
      saveElement(element);
      added += 1;
    }
    setImporting(false);
    setNote(found.length === 0 ? "Higgsfield listed no characters for this key." : added === 0 ? "Every character on the account is already here." : `Brought in ${added}.`);
  }

  return (
    <div className="anim-fade flex flex-1 flex-col">
      {elements.length > 0 && (
        <div className="mb-3 flex items-center gap-1 pr-4 max-md:pt-1 md:mb-0 md:min-h-[56px] md:gap-3 md:py-2.5">
        {/* The kinds slide on under New, which keeps its place at the right. */}
        <div
          role="tablist"
          aria-label="Filter elements"
          className="no-bar flex min-w-0 flex-1 gap-2 overflow-x-auto pl-4 [mask-image:linear-gradient(to_right,black_calc(100%-12px),transparent)]"
        >
          {[
            { id: "all" as Filter, plural: "All" },
            ...ELEMENT_KINDS,
            ...(archived.length > 0 ? [{ id: "archived" as Filter, plural: `Archived · ${archived.length}` }] : []),
          ].map((kind) => {
            const on = kind.id === filter;
            return (
              <button
                key={kind.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(kind.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-[120ms] ${
                  on ? "bg-t1/[0.12] text-t1" : "bg-t1/[0.04] text-t3 hover:text-t1"
                }`}
              >
                {kind.plural}
              </button>
            );
          })}
          {/* Room for the fade, so the last kind ends clear of it once scrolled to. */}
          <span aria-hidden className="w-1 shrink-0" />
        </div>
        <button
          type="button"
          onClick={newOne}
          className="cta flex shrink-0 items-center gap-1.5 rounded-full py-2 pl-3 pr-4 text-[12.5px] font-medium"
        >
          <Icon name="plus" size={15} />
          New
        </button>
        </div>
      )}

      {filter === "character" && (
        <div className="mb-3 flex flex-wrap items-center gap-2 px-4">
          <div role="tablist" aria-label="Kind of character" className="flex rounded-full bg-t1/[0.05] p-0.5">
            {([
              ["sheets", "Sheets"],
              ["soul", "Soul ID"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={side === id}
                onClick={() => setSide(id)}
                className={`rounded-full px-3.5 py-1 text-[12.5px] transition-colors duration-[120ms] ${side === id ? "bg-t1/[0.12] text-t1" : "text-t3 hover:text-t1"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {side === "soul" && (
            <button
              type="button"
              onClick={() => void importSouls()}
              disabled={importing}
              className="flex items-center gap-1.5 rounded-full bg-t1/[0.05] px-3 py-1.5 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:text-t1 disabled:opacity-60"
            >
              {importing ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name="download" size={13} />}
              From my Higgsfield
            </button>
          )}
          {note && side === "soul" && <span className="text-[12px] text-t3">{note}</span>}
        </div>
      )}

      {elements.length === 0 ? (
        <div className="grid flex-1 place-items-center px-4 py-20 text-center">
          <Stagger className="max-w-[560px]">
            <p className="t-stagger-line text-[34px] leading-[1.08] tracking-[-0.03em] text-t1 md:text-[54px]">
              No elements yet.
            </p>
            <p className="t-stagger-line t-stagger-line--2 mx-auto mt-4 max-w-[400px] text-[13.5px] leading-relaxed text-t3">
              Keep a character, a place, a product or a style with a few pictures of it, then type @ in
              any prompt to bring it into the shot.
            </p>
            <span className="t-stagger-line t-stagger-line--3 mt-8 inline-block">
              <button
                type="button"
                onClick={() => openEditor({})}
                className="cta rounded-full px-4 py-2 text-[12.5px] font-medium"
              >
                New element
              </button>
              <button
                type="button"
                onClick={() => openTrainer({})}
                className="ml-2 rounded-full bg-t1/[0.07] px-4 py-2 text-[12.5px] font-medium text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.12]"
              >
                Soul ID character
              </button>
            </span>
          </Stagger>
        </div>
      ) : shown.length === 0 ? (
        <p className="px-4 py-16 text-center text-[13px] text-t4">
          {filter === "archived"
            ? "Nothing archived."
            : souls
              ? "No Soul ID characters yet. Train one from 20 or more photos of a person, for Soul Cinema, Soul 2.0 or Soul 1.0."
              : "None of this kind yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {shown.map((element) => {
            const cover = element.images[0];
            const kind = ELEMENT_KINDS.find((k) => k.id === element.kind);
            return (
              <button
                key={element.id}
                type="button"
                onClick={() => openEditor({ id: element.id })}
                className="group flex flex-col overflow-hidden rounded-card bg-elevated text-left ring-1 ring-inset ring-line transition-colors duration-[150ms] hover:ring-line-strong"
              >
                <span className="relative block aspect-[3/4] w-full overflow-hidden bg-t1/[0.05]">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbSrc(cover.storageUrl, 512)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.03]"
                    />
                  )}
                  {element.images.length > 1 && !element.soul && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] tabular-nums text-white">
                      {element.images.length}
                    </span>
                  )}
                  {element.soul && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
                      {element.soul.state === "completed" ? null : element.soul.state === "failed" ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b6b]" />
                      ) : (
                        <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-white border-t-transparent" />
                      )}
                      {SOUL_MODELS.find((m) => m.version === element.soul!.version)?.label}
                    </span>
                  )}
                </span>
                <span className="block px-3 py-2.5">
                  <span className="block truncate text-[14px] font-medium text-t1">@{element.name}</span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-t3">
                      {element.soul
                        ? element.soul.state === "completed"
                          ? "Soul ID"
                          : element.soul.state === "failed"
                            ? element.soul.error ?? "Training failed"
                            : "Training…"
                        : kind?.label}
                    </span>
                    {!inUse(element) && (
                      // A span, not a button: the card itself is one.
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          saveElement({ ...element, status: undefined });
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          event.stopPropagation();
                          saveElement({ ...element, status: undefined });
                        }}
                        className="shrink-0 rounded-full bg-t1/[0.08] px-2.5 py-1 text-[11.5px] text-t1 hover:bg-t1/[0.14]"
                      >
                        Restore
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
