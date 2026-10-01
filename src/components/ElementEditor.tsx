"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { ELEMENT_KINDS, MAX_ELEMENT_IMAGES, elementName, type ElementKind, type LibraryElement } from "@/lib/elements";
import { makeMediaRef, type MediaRef } from "@/lib/media";
import { mediaSrc } from "@/lib/storage/client";
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
  start: { id?: string; images?: string[] };
  exiting: boolean;
  onClose: () => void;
}) {
  const elements = useStudio((s) => s.elements);
  const saveElement = useStudio((s) => s.saveElement);
  const removeElement = useStudio((s) => s.removeElement);
  const existing = start.id ? elements.find((e) => e.id === start.id) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [kind, setKind] = useState<ElementKind>(existing?.kind ?? "character");
  const [notes, setNotes] = useState(existing?.notes ?? "");
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
      if (event.key === "Escape" && !picking) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, picking]);

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
    <div className="fixed inset-0 z-[112] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/75 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        role="dialog"
        aria-label={existing ? `Edit @${existing.name}` : "New element"}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-panel border border-line bg-elevated sm:max-w-[520px] sm:rounded-panel ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
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
                className={`rounded-chip px-2 py-2 text-[13px] transition-colors duration-[120ms] ${
                  kind === k.id ? "bg-t1 text-canvas" : "bg-t1/[0.05] text-t2 hover:text-t1"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          <p className="mb-1.5 text-[12px] font-medium text-t3">
            Pictures <span className="font-normal text-t4">· {images.length}/{MAX_ELEMENT_IMAGES}, the first is the cover</span>
          </p>
          <div className="mb-5 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {images.map((url, i) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-chip bg-t1/[0.05] ring-1 ring-inset ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaSrc(url)} alt="" className="h-full w-full object-cover" />
                {i === 0 ? (
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-px text-[10px] text-white backdrop-blur-md">
                    Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setImages((all) => [url, ...all.filter((u) => u !== url)])}
                    className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-px text-[10px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 max-md:opacity-100"
                  >
                    Make cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setImages((all) => all.filter((u) => u !== url))}
                  aria-label="Remove picture"
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md"
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
                <Icon name="plus" size={20} />
              </button>
            )}
          </div>

          <label className="mb-1.5 block text-[12px] font-medium text-t3" htmlFor="element-notes">
            Notes <span className="font-normal text-t4">· added to the prompt wherever it is called</span>
          </label>
          <textarea
            id="element-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Late twenties, short dark hair, round glasses"
            className={`${field} min-h-[84px] resize-none`}
          />
          {problem && <p className="mt-3 text-[13px] text-[#ff8f8f]">{problem}</p>}
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          {existing &&
            (confirming ? (
              <button
                type="button"
                onClick={() => {
                  removeElement(existing.id);
                  onClose();
                }}
                className="rounded-full bg-[#ff6b6b]/15 px-4 py-2 text-[13px] font-medium text-[#ff8f8f]"
              >
                Delete @{existing.name}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label="Delete element"
                className="grid h-9 w-9 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-[#ff6b6b]/10 hover:text-[#ff8f8f]"
              >
                <Icon name="trash" size={16} />
              </button>
            ))}
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
        accept="image"
        multiple
        taken={images}
        onPick={(urls) => setImages((all) => [...all, ...urls.filter((u) => !all.includes(u))].slice(0, MAX_ELEMENT_IMAGES))}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}
