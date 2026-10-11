"use client";

import { useEffect, useRef, useState } from "react";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { ConfirmPopup } from "@/components/ConfirmPopup";
import {
  ELEMENT_KINDS,
  ELEMENT_STATUSES,
  MAX_ELEMENT_IMAGES,
  elementName,
  type ElementKind,
  type ElementStatus,
  type LibraryElement,
} from "@/lib/elements";
import { useUploader } from "@/lib/useUploader";
import { makeMediaRef, type MediaRef } from "@/lib/media";
import { mediaSrc, thumbSrc } from "@/lib/storage/client";
import { usePresence } from "@/lib/usePresence";
import { useStudio } from "@/store/studio";

/**
 * Making or changing an element: its name after `@`, what it is, one to ten
 * pictures (the first is the cover) and a line of notes for the prompt.
 * Opened from the Elements page, or from a picture's "Make element".
 */
export function ElementEditor() {
  const editor = useStudio((s) => s.elementEditor);
  const close = useStudio((s) => s.openElementEditor);
  const { mounted, exiting } = usePresence(!!editor, 240);
  // Kept while closing, so the sheet does not empty as it leaves.
  const [shown, setShown] = useState(editor);
  useEffect(() => {
    if (editor) setShown(editor);
  }, [editor]);
  if (!mounted || !shown) return null;
  return <EditorSheet key={shown.id ?? `new-${(shown.images ?? []).join()}`} start={shown} exiting={exiting} onClose={() => close(null)} />;
}

function EditorSheet({
  start,
  exiting,
  onClose,
}: {
  start: { id?: string; images?: string[]; kind?: ElementKind };
  exiting: boolean;
  onClose: () => void;
}) {
  const elements = useStudio((s) => s.elements);
  const saveElement = useStudio((s) => s.saveElement);
  const removeElement = useStudio((s) => s.removeElement);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Pulled down on a phone, it closes.
  const swipe = useSwipeDismiss(sheetRef, onClose);
  const existing = start.id ? elements.find((e) => e.id === start.id) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [kind, setKind] = useState<ElementKind>(existing?.kind ?? start.kind ?? "character");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [version, setVersion] = useState(existing?.version ?? "");
  const [status, setStatus] = useState<ElementStatus | undefined>(existing?.status);
  const [props, setProps] = useState<Array<[string, string]>>(Object.entries(existing?.props ?? {}));
  const [dragging, setDragging] = useState(false);
  const uploader = useUploader("image");
  // Pictures by the address shown; those already kept carry their MediaRef.
  const [images, setImages] = useState<string[]>(
    existing ? existing.images.map((ref) => ref.storageUrl) : (start.images ?? []).slice(0, MAX_ELEMENT_IMAGES),
  );
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !picking && !confirming) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, picking, confirming]);

  const slug = elementName(name);
  const taken = elements.some((e) => e.name === slug && e.id !== existing?.id);

  async function save() {
    if (!slug) return setProblem("Give it a name to call it by.");
    if (taken) return setProblem(`@${slug} is already an element.`);
    if (images.length === 0) return setProblem("Add at least one picture.");
    setProblem(null);
    setSaving(true);
    try {
      const known = new Map((existing?.images ?? []).map((ref) => [ref.storageUrl, ref]));
      const refs: MediaRef[] = [];
      for (const url of images) refs.push(known.get(url) ?? (await makeMediaRef(url, "image")));
      const element: LibraryElement = {
        id: existing?.id ?? crypto.randomUUID(),
        kind,
        name: slug,
        images: refs,
        notes: notes.trim() || undefined,
        version: version.trim() || undefined,
        status,
        props: props.some(([k, v]) => k.trim() && v.trim())
          ? Object.fromEntries(props.filter(([k, v]) => k.trim() && v.trim()).map(([k, v]) => [k.trim(), v.trim()]))
          : undefined,
        createdAt: existing?.createdAt ?? Date.now(),
      };
      saveElement(element);
      onClose();
    } catch {
      setProblem("The pictures could not be kept. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const field = "w-full rounded-chip bg-t1/[0.05] px-3.5 py-2.5 text-[15px] text-t1 outline-none ring-1 ring-inset ring-transparent placeholder:text-t4 focus:ring-line-strong md:text-[14px]";

  return (
    <div className="fixed inset-0 z-[119] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        // Under the picture picker's own dimming the blur is never seen, and redrawing it costs frames.
        className={`absolute inset-0 bg-canvas-deep/75 ${picking ? "" : "backdrop-blur-md"} ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-label={existing ? `Edit @${existing.name}` : "New element"}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-panel border border-line bg-elevated sm:max-w-[520px] sm:rounded-panel ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        {/* The grip: says it can be pulled down. */}
        <span aria-hidden className="mx-auto -mb-2 mt-2 block h-1 w-9 shrink-0 rounded-full bg-t1/20 sm:hidden" />
        <header {...swipe} className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[17px] text-t1">{existing ? `@${existing.name}` : "New element"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
          >
            <Icon name="close" size={17} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <label className="mb-1.5 block text-[12px] font-medium text-t3" htmlFor="element-name">
            Name
          </label>
          <div className="relative mb-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-t4 md:text-[14px]">@</span>
            <input
              id="element-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="emir"
              autoFocus={!existing}
              className={`${field} pl-7`}
            />
          </div>
          <p className="mb-4 min-h-[18px] text-[12px] text-t4">
            {slug && slug !== name.trim().replace(/^@/, "") ? `Called as @${slug}` : taken ? `@${slug} is taken` : ""}
          </p>

          <p className="mb-1.5 text-[12px] font-medium text-t3">Kind</p>
          <div className="mb-5 grid grid-cols-4 gap-1.5">
            {ELEMENT_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                aria-pressed={kind === k.id}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-chip px-1.5 py-2 text-[13px] transition-colors duration-[120ms] max-sm:flex-col max-sm:gap-1 max-sm:text-[12px] ${
                  kind === k.id ? "bg-t1/[0.1] text-t1 ring-1 ring-inset ring-line-strong" : "bg-t1/[0.05] text-t2 hover:text-t1"
                }`}
              >
                <Icon name={k.icon} size={15} className="shrink-0" />
                <span className="truncate">{k.label}</span>
              </button>
            ))}
          </div>

          <p className="mb-1.5 text-[12px] font-medium text-t3">
            Pictures <span className="font-normal text-t4">· {images.length}/{MAX_ELEMENT_IMAGES}, the first is the cover</span>
          </p>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
              if (files.length > 0) {
                void uploader.send(files, (urls) =>
                  setImages((all) => [...all, ...urls.filter((u) => !all.includes(u))].slice(0, MAX_ELEMENT_IMAGES)),
                );
              }
            }}
            className={`mb-1 grid grid-cols-4 gap-2 rounded-card p-1 transition-colors duration-[120ms] sm:grid-cols-5 ${
              dragging ? "bg-t1/[0.06] ring-1 ring-inset ring-line-strong" : ""
            }`}
          >
            {images.map((url, i) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-chip bg-t1/[0.05] ring-1 ring-inset ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbSrc(url, 256)} alt="" className="h-full w-full object-cover" />
                {i === 0 ? (
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-px text-[10px] text-white">
                    Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setImages((all) => [url, ...all.filter((u) => u !== url)])}
                    className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-px text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100"
                  >
                    Make cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setImages((all) => all.filter((u) => u !== url))}
                  aria-label="Remove picture"
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            ))}
            {images.length < MAX_ELEMENT_IMAGES && (
              <button
                type="button"
                onClick={() => setPicking(true)}
                aria-label="Add pictures"
                className="grid aspect-square place-items-center rounded-chip border-[1.5px] border-dashed border-line-strong text-t3 transition-colors duration-[120ms] hover:text-t1"
              >
                {uploader.busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Icon name="plus" size={20} />
                )}
              </button>
            )}
          </div>
          <p className="mb-5 text-[11.5px] text-t4">Or drop pictures here.</p>

          <label className="mb-1.5 block text-[12px] font-medium text-t3" htmlFor="element-notes">
            Description <span className="font-normal text-t4">· added to the prompt wherever it is called</span>
          </label>
          <textarea
            id="element-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Late twenties, short dark hair, round glasses"
            className={`${field} min-h-[84px] resize-none`}
          />

          <div className="mt-5 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-t3" htmlFor="element-version">
                Version
              </label>
              <input id="element-version" value={version} onChange={(event) => setVersion(event.target.value)} placeholder="v1" className={field} />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-t3">Status</p>
              <div className="grid grid-cols-3 gap-1">
                {ELEMENT_STATUSES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus((now) => (now === s.id ? undefined : s.id))}
                    aria-pressed={status === s.id}
                    className={`min-w-0 truncate whitespace-nowrap rounded-chip px-1 py-2.5 text-[12.5px] transition-colors duration-[120ms] ${
                      status === s.id ? "bg-t1/[0.1] text-t1 ring-1 ring-inset ring-line-strong" : "bg-t1/[0.05] text-t2 hover:text-t1"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mb-1.5 mt-5 text-[12px] font-medium text-t3">
            Custom properties <span className="font-normal text-t4">· also added to the prompt</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {props.map(([key, value], i) => (
              <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_40px] gap-1.5">
                <input
                  aria-label="Property"
                  value={key}
                  onChange={(event) => setProps((all) => all.map((p, j) => (j === i ? [event.target.value, p[1]] : p)))}
                  placeholder="eyes"
                  className={`${field} min-w-0`}
                />
                <input
                  aria-label="Value"
                  value={value}
                  onChange={(event) => setProps((all) => all.map((p, j) => (j === i ? [p[0], event.target.value] : p)))}
                  placeholder="green"
                  className={`${field} min-w-0`}
                />
                <button
                  type="button"
                  aria-label="Remove property"
                  onClick={() => setProps((all) => all.filter((_, j) => j !== i))}
                  className="grid place-items-center rounded-chip text-t3 hover:bg-t1/[0.06] hover:text-t1"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setProps((all) => [...all, ["", ""]])}
              className="flex items-center gap-1.5 self-start rounded-full bg-t1/[0.06] px-3 py-1.5 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.1] hover:text-t1"
            >
              <Icon name="plus" size={13} />
              Add custom property
            </button>
          </div>
          {problem && <p className="mt-3 text-[13px] text-[#ff8f8f]">{problem}</p>}
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          {existing && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Delete element"
              className="grid h-9 w-9 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-[#ff6b6b]/10 hover:text-[#ff8f8f]"
            >
              <Icon name="trash" size={16} />
            </button>
          )}
          {existing && (
            <ConfirmPopup
              open={confirming}
              title={`Delete @${existing.name}?`}
              message="Prompts that call it will no longer find it. Its pictures stay in your studio."
              confirmLabel="Delete"
              onConfirm={() => {
                setConfirming(false);
                removeElement(existing.id);
                onClose();
              }}
              onClose={() => setConfirming(false)}
            />
          )}
          <span className="flex-1" />
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-[13px] text-t2 hover:text-t1">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="cta rounded-full px-5 py-2 text-[13px] font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : existing ? "Save" : "Create"}
          </button>
        </footer>
      </div>

      <MediaPicker
        open={picking}
        above
        accept="image"
        multiple
        taken={images}
        onPick={(urls) => setImages((all) => [...all, ...urls.filter((u) => !all.includes(u))].slice(0, MAX_ELEMENT_IMAGES))}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}
