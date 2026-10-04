"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Stagger } from "@/components/Stagger";
import { ELEMENT_KINDS, inUse, type ElementKind } from "@/lib/elements";
import { mediaSrc } from "@/lib/storage/client";
import { useStudio } from "@/store/studio";

type Filter = "all" | ElementKind | "archived";

/**
 * The Elements library: the characters, places, products and styles kept
 * with their reference pictures, each called into a prompt with `@name`.
 */
export function ElementsPage() {
  const elements = useStudio((s) => s.elements);
  const openEditor = useStudio((s) => s.openElementEditor);
  const [filter, setFilter] = useState<Filter>("all");
  const saveElement = useStudio((s) => s.saveElement);
  const archived = elements.filter((e) => !inUse(e));
  // Archived ones keep to their own tab, out of the way of the ones in use.
  const shown = elements.filter((e) => (filter === "archived" ? !inUse(e) : inUse(e) && (filter === "all" || e.kind === filter)));

  return (
    <div className="anim-fade flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-1 md:min-h-[56px] md:py-2.5">
        <div>
          <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1 md:hidden">Elements</h2>
          <p className="text-[13px] text-t3">
            <span className="md:hidden">Call them into any prompt with @</span>
            <span className="hidden md:inline">
              {elements.length > 0
                ? `${elements.length} ${elements.length === 1 ? "element" : "elements"} · call one into any prompt with @`
                : "Call them into any prompt with @"}
            </span>
          </p>
        </div>
        {elements.length > 0 && (
          <button
            type="button"
            onClick={() => openEditor({})}
            className="cta flex items-center gap-1.5 rounded-full py-2 pl-3 pr-4 text-[12.5px] font-medium"
          >
            <Icon name="plus" size={15} />
            New element
          </button>
        )}
      </div>

      {elements.length > 0 && (
        <div role="tablist" aria-label="Filter elements" className="no-bar mb-3 flex gap-2 overflow-x-auto px-4">
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
            </span>
          </Stagger>
        </div>
      ) : shown.length === 0 ? (
        <p className="px-4 py-16 text-center text-[13px] text-t4">
          {filter === "archived" ? "Nothing archived." : "None of this kind yet."}
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
                      src={mediaSrc(cover.storageUrl)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.03]"
                    />
                  )}
                  {element.images.length > 1 && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] tabular-nums text-white">
                      {element.images.length}
                    </span>
                  )}
                </span>
                <span className="block px-3 py-2.5">
                  <span className="block truncate text-[14px] font-medium text-t1">@{element.name}</span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-t3">{kind?.label}</span>
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
