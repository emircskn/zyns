"use client";

import { useEffect, useRef, useState } from "react";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { ConfirmPopup } from "@/components/ConfirmPopup";
import { InfoDot } from "@/components/InfoDot";
import { Popover } from "@/components/Popover";
import {
  ELEMENT_KINDS,
  ELEMENT_STATUSES,
  KIND_PREFIX,
  LEGACY_STATUS_LABEL,
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
 * Making or changing an element, laid out as Higgsfield's: the pictures on a
 * wide stage, the details (category, name, version, id, description, status,
 * custom properties) in a column beside it.
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

type Prop = { key: string; value: string; multi: boolean };

const rowCls = "flex w-full items-center gap-2.5 rounded-chip px-2.5 py-2 text-left text-[14px] transition-colors duration-[120ms]";

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

  const [title, setTitle] = useState(existing ? (existing.title ?? existing.name) : "");
  const [handle, setHandle] = useState(existing?.name ?? "");
  // The id follows category, name and version until it is written over.
  const [ownHandle, setOwnHandle] = useState(!!existing);
  const [kind, setKind] = useState<ElementKind>(existing?.kind ?? start.kind ?? "character");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [version, setVersion] = useState(existing?.version ?? "");
  const [status, setStatus] = useState<ElementStatus | undefined>(existing?.status);
  const [props, setProps] = useState<Prop[]>(Object.entries(existing?.props ?? {}).map(([key, value]) => ({ key, value, multi: false })));
  const [newProp, setNewProp] = useState<{ multi: boolean; name: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const uploader = useUploader("image");
  // Pictures by the address shown; those already kept carry their MediaRef.
  const [images, setImages] = useState<string[]>(
    existing ? existing.images.map((ref) => ref.storageUrl) : (start.images ?? []).slice(0, MAX_ELEMENT_IMAGES),
  );
  const [shown, setShown] = useState(0);
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

  const auto = title.trim() ? elementName([KIND_PREFIX[kind], title, version].filter((part) => part.trim()).join(" ")) : "";
  const slug = ownHandle ? elementName(handle) : auto;
  const taken = elements.some((e) => e.name === slug && e.id !== existing?.id);
  const current = images[Math.min(shown, images.length - 1)];

  function addImages(urls: string[]) {
    setImages((all) => [...all, ...urls.filter((u) => !all.includes(u))].slice(0, MAX_ELEMENT_IMAGES));
  }

  async function save() {
    if (!title.trim() && !slug) return setProblem("Give it a name.");
    if (!slug) return setProblem("Give it an id to call it by.");
    if (taken) return setProblem(`@${slug} is already an element.`);
    // A Soul ID character is used by its id; a picture is only its cover.
    if (images.length === 0 && !existing?.soul) return setProblem("Add at least one picture.");
    setProblem(null);
    setSaving(true);
    try {
      const known = new Map((existing?.images ?? []).map((ref) => [ref.storageUrl, ref]));
      const refs: MediaRef[] = [];
      for (const url of images) refs.push(known.get(url) ?? (await makeMediaRef(url, "image")));
      const kept = props.filter((p) => p.key.trim() && p.value.trim());
      const element: LibraryElement = {
        id: existing?.id ?? crypto.randomUUID(),
        kind,
        name: slug,
        title: title.trim() || undefined,
        images: refs,
        notes: notes.trim() || undefined,
        version: version.trim() || undefined,
        status,
        props: kept.length ? Object.fromEntries(kept.map((p) => [p.key.trim(), p.value.trim()])) : undefined,
        soul: existing?.soul,
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

  const field = "w-full rounded-card bg-t1/[0.06] px-3.5 py-3 text-[15px] text-t1 outline-none ring-1 ring-inset ring-transparent placeholder:text-t4 focus:ring-line-strong md:text-[14px]";
  const label = "mb-1.5 mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-t1";
  const kindNow = ELEMENT_KINDS.find((k) => k.id === kind)!;
  const statusNow = ELEMENT_STATUSES.find((x) => x.id === status);

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
        className={`relative flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-panel border border-line bg-elevated sm:h-[min(860px,94dvh)] sm:max-w-[1180px] sm:rounded-panel ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        {/* The grip: says it can be pulled down. */}
        <span aria-hidden className="mx-auto -mb-2 mt-2 block h-1 w-9 shrink-0 rounded-full bg-t1/20 sm:hidden" />
        <header {...swipe} className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
          <h2 className="text-[16px] font-semibold text-t1">{existing ? `Edit @${existing.name}` : "New element"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
          >
            <Icon name="close" size={17} />
          </button>
        </header>

        <div className="mx-2 grid min-h-0 flex-1 grid-rows-[minmax(220px,38%)_minmax(0,1fr)] overflow-hidden rounded-card bg-black/25 md:mx-3 md:grid-cols-[minmax(0,1fr)_340px] md:grid-rows-1">
          {/* The stage: a drop box while empty, then the picture large with the others under it. */}
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
              if (files.length > 0) void uploader.send(files, addImages);
            }}
            className="flex min-h-0 flex-col p-4 md:p-6"
          >
            {images.length === 0 ? (
              <button
                type="button"
                onClick={() => setPicking(true)}
                className={`m-auto flex h-full max-h-[290px] w-full max-w-[510px] flex-col items-center justify-center gap-4 rounded-card border border-dashed text-[14px] font-semibold text-t1 transition-colors duration-[120ms] ${
                  dragging ? "border-t1/50 bg-t1/[0.1]" : "border-t1/20 bg-t1/[0.04] hover:bg-t1/[0.07]"
                }`}
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-t1/[0.1] ring-1 ring-inset ring-t1/15">
                  {uploader.busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name="upload" size={22} />}
                </span>
                Drop pictures here to add to element
              </button>
            ) : (
              <>
                <div className={`relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-card transition-colors duration-[120ms] ${dragging ? "bg-t1/[0.1]" : "bg-t1/[0.04]"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaSrc(current)} alt="" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="no-bar mt-3 flex shrink-0 items-center gap-2 overflow-x-auto">
                  {images.map((url, i) => (
                    <div
                      key={url}
                      onClick={() => setShown(i)}
                      className={`group relative h-[64px] w-[64px] shrink-0 cursor-pointer overflow-hidden rounded-chip bg-t1/[0.05] ring-1 ring-inset ${url === current ? "ring-2 ring-accent" : "ring-edge"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbSrc(url, 256)} alt="" className="h-full w-full object-cover" />
                      {i === 0 ? (
                        <span className="absolute bottom-0.5 left-0.5 rounded-full bg-black/60 px-1.5 py-px text-[9.5px] text-white">Cover</span>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setImages((all) => [url, ...all.filter((u) => u !== url)]);
                            setShown(0);
                          }}
                          className="absolute bottom-0.5 left-0.5 rounded-full bg-black/60 px-1.5 py-px text-[9.5px] text-white opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100"
                        >
                          Make cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setImages((all) => all.filter((u) => u !== url));
                        }}
                        aria-label="Remove picture"
                        className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
                      >
                        <Icon name="close" size={11} />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_ELEMENT_IMAGES && (
                    <button
                      type="button"
                      onClick={() => setPicking(true)}
                      aria-label="Add pictures"
                      className="grid h-[64px] w-[64px] shrink-0 place-items-center rounded-chip bg-t1/[0.06] text-t3 ring-1 ring-inset ring-edge transition-colors duration-[120ms] hover:text-t1"
                    >
                      {uploader.busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name="plus" size={20} />}
                    </button>
                  )}
                  <span className="ml-1 shrink-0 text-[12px] text-t4">{images.length}/{MAX_ELEMENT_IMAGES} · the first is the cover</span>
                </div>
              </>
            )}
          </div>

          {/* The details. */}
          <div className="min-h-0 overflow-y-auto border-t border-line px-4 pb-4 pt-1 md:border-l md:border-t-0">
            <p className={label.replace("mt-4", "mt-3")}>Category</p>
            <Popover
              width={310}
              title="Select category"
              full
              trigger={(open) => (
                <span className={`flex items-center gap-2.5 ${field} ${open ? "ring-line-strong" : ""}`}>
                  <Icon name={kindNow.icon} size={15} className="shrink-0 text-t3" />
                  <span className="flex-1 font-medium">{kindNow.label}</span>
                  <Icon name="chevron" size={16} className={`text-t3 transition-transform ${open ? "rotate-180" : ""}`} />
                </span>
              )}
            >
              {(close) =>
                ELEMENT_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => {
                      setKind(k.id);
                      close();
                    }}
                    className={`${rowCls} ${kind === k.id ? "bg-t1/[0.08] text-t1" : "text-t2 hover:bg-t1/[0.06] hover:text-t1"}`}
                  >
                    <span className="flex-1 font-medium">{k.label}</span>
                    {kind === k.id && <Icon name="check" size={14} />}
                  </button>
                ))
              }
            </Popover>

            <label className={label} htmlFor="element-name">Name</label>
            <input id="element-name" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter element name" autoFocus={!existing} className={field} />
            <p className="mt-1.5 text-[12px] text-t4">The display name, e.g. Cal, Oli, Elena</p>

            <p className={label}>
              Version <InfoDot text="Use versions to keep different takes of the same element under one name." />
            </p>
            <input aria-label="Version" value={version} onChange={(event) => setVersion(event.target.value)} placeholder="e.g. v1" className={field} />

            <p className={label}>
              Element ID <InfoDot text="Auto-generated from category, name and version. Edit it to use your own — it stops updating once you do." />
            </p>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-t3 md:text-[14px]">@</span>
              <input
                aria-label="Element ID"
                value={ownHandle ? handle : auto}
                onChange={(event) => {
                  setOwnHandle(true);
                  setHandle(event.target.value);
                }}
                placeholder="e.g. char-oli-v1"
                className={`${field} pl-8`}
              />
            </div>
            {slug && taken && <p className="mt-1.5 text-[12px] text-[#ff8f8f]">@{slug} is taken</p>}

            <label className={label} htmlFor="element-notes">Description</label>
            <textarea id="element-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Describe this element (optional)" className={`${field} min-h-[88px] resize-none`} />

            <p className={label}>Status</p>
            <Popover
              width={310}
              title="Select status"
              full
              trigger={(open) => (
                <span className={`flex items-center gap-2.5 ${field} ${open ? "ring-line-strong" : ""}`}>
                  <StatusDot color={statusNow?.dot} />
                  <span className="flex-1 font-medium">{statusNow?.label ?? (status && LEGACY_STATUS_LABEL[status]) ?? "No status"}</span>
                  <Icon name="chevron" size={16} className={`text-t3 transition-transform ${open ? "rotate-180" : ""}`} />
                </span>
              )}
            >
              {(close) => (
                <>
                  {[{ id: undefined, label: "No status", dot: undefined }, ...ELEMENT_STATUSES].map((x) => (
                    <button
                      key={x.id ?? "none"}
                      type="button"
                      onClick={() => {
                        setStatus(x.id);
                        close();
                      }}
                      className={`${rowCls} ${status === x.id ? "bg-t1/[0.08] text-t1" : "text-t2 hover:bg-t1/[0.06] hover:text-t1"}`}
                    >
                      <StatusDot color={x.dot} />
                      <span className="flex-1 font-medium">{x.label}</span>
                      {status === x.id && <Icon name="check" size={14} />}
                    </button>
                  ))}
                </>
              )}
            </Popover>

            <p className="mb-2 mt-5 border-t border-line pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-t4">Custom properties</p>
            <div className="flex flex-col gap-3">
              {props.map((prop, i) => (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between text-[13px] font-semibold text-t1">
                    {prop.key}
                    <button type="button" aria-label="Remove property" onClick={() => setProps((all) => all.filter((_, j) => j !== i))} className="grid h-6 w-6 place-items-center rounded-full text-t3 hover:bg-t1/[0.08] hover:text-t1">
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                  {prop.multi ? (
                    <TagInput value={prop.value} onChange={(value) => setProps((all) => all.map((p, j) => (j === i ? { ...p, value } : p)))} className={field} />
                  ) : (
                    <input
                      aria-label={prop.key}
                      value={prop.value}
                      onChange={(event) => setProps((all) => all.map((p, j) => (j === i ? { ...p, value: event.target.value } : p)))}
                      placeholder="Value"
                      className={field}
                    />
                  )}
                </div>
              ))}
              {newProp ? (
                <div className="rounded-card bg-t1/[0.05] p-3 ring-1 ring-inset ring-edge">
                  <p className="mb-2 text-[12px] text-t3">{newProp.multi ? "Multi-select" : "Text"} property name</p>
                  <input
                    autoFocus
                    value={newProp.name}
                    onChange={(event) => setNewProp({ ...newProp, name: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && newProp.name.trim()) {
                        setProps((all) => [...all, { key: newProp.name.trim(), value: "", multi: newProp.multi }]);
                        setNewProp(null);
                      }
                    }}
                    placeholder="Property name"
                    className={field}
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setNewProp(null)} className="rounded-chip bg-t1/[0.08] py-2 text-[13px] font-medium text-t1 hover:bg-t1/[0.14]">
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newProp.name.trim()}
                      onClick={() => {
                        setProps((all) => [...all, { key: newProp.name.trim(), value: "", multi: newProp.multi }]);
                        setNewProp(null);
                      }}
                      className="rounded-chip bg-t1/[0.2] py-2 text-[13px] font-medium text-t1 hover:bg-t1/[0.28] disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <Popover
                  width={220}
                  full
                  trigger={() => (
                    <span className="flex items-center gap-2 rounded-chip px-1 py-2 text-[13.5px] text-t2 transition-colors duration-[120ms] hover:text-t1">
                      <Icon name="plus" size={14} />
                      Add custom property
                    </span>
                  )}
                >
                  {(close) => (
                    <>
                      {[
                        { multi: false, label: "Text", icon: "pencil" as const },
                        { multi: true, label: "Multi-select", icon: "list" as const },
                      ].map((x) => (
                        <button
                          key={x.label}
                          type="button"
                          onClick={() => {
                            setNewProp({ multi: x.multi, name: "" });
                            close();
                          }}
                          className={`${rowCls} text-t1 hover:bg-t1/[0.06]`}
                        >
                          <Icon name={x.icon} size={15} className="text-t3" />
                          <span className="font-medium">{x.label}</span>
                        </button>
                      ))}
                    </>
                  )}
                </Popover>
              )}
            </div>
            {problem && <p className="mt-3 text-[13px] text-[#ff8f8f]">{problem}</p>}
          </div>
        </div>

        <footer className="flex shrink-0 items-center gap-2 px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">
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
          <button type="button" onClick={onClose} className="rounded-full bg-t1/[0.08] px-5 py-2.5 text-[14px] font-semibold text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.14]">
            Cancel
          </button>
          <button type="button" onClick={() => void save()} disabled={saving} className="cta rounded-full px-6 py-2.5 text-[14px] font-semibold disabled:opacity-60">
            {saving ? "Saving…" : existing ? "Save" : "Create"}
          </button>
        </footer>
      </div>

      <MediaPicker open={picking} above accept="image" multiple taken={images} onPick={addImages} onClose={() => setPicking(false)} />
    </div>
  );
}

function StatusDot({ color }: { color?: string }) {
  return color ? (
    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
  ) : (
    <span className="h-3 w-3 shrink-0 rounded-full border border-dashed border-t3" />
  );
}

/** A comma-joined list kept as chips: Enter or a comma adds one, × takes one out. */
function TagInput({ value, onChange, className }: { value: string; onChange: (value: string) => void; className: string }) {
  const [text, setText] = useState("");
  const tags = value.split(",").map((t) => t.trim()).filter(Boolean);
  const add = () => {
    const next = text.trim();
    if (next && !tags.includes(next)) onChange([...tags, next].join(", "));
    setText("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-t1/[0.1] py-1 pl-2.5 pr-1.5 text-[12.5px] text-t1">
              {tag}
              <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(tags.filter((t) => t !== tag).join(", "))} className="grid h-4 w-4 place-items-center rounded-full text-t3 hover:text-t1">
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => (event.key === "Enter" || event.key === ",") && (event.preventDefault(), add())}
        onBlur={add}
        placeholder="Add an option, then Enter"
        className={className}
      />
    </div>
  );
}
