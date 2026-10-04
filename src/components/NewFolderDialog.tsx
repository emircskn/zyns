"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { useNewFolder } from "@/lib/newProject";
import { usePresence } from "@/lib/usePresence";
import { FOLDER_COLORS, useStudio } from "@/store/studio";

/**
 * A folder of the open project, new or being edited: the same small window
 * as a new project's. Its name large in the middle, a description to open
 * if wanted, a colour for its mark, and Create (or Save) at the foot once it
 * has a name. A new folder (inside another one, when asked from that one)
 * then opens.
 */
export function NewFolderDialog() {
  const projectId = useNewFolder((s) => s.projectId);
  const parentId = useNewFolder((s) => s.parentId);
  const editId = useNewFolder((s) => s.editId);
  const close = useNewFolder((s) => s.close);
  const project = useStudio((s) => s.projects.find((p) => p.id === projectId));
  const patchProject = useStudio((s) => s.patchProject);
  const patchStudio = useStudio((s) => s.patchStudio);
  const open = !!projectId;
  const { mounted, exiting } = usePresence(open, 180);
  const [name, setName] = useState("");
  const [describing, setDescribing] = useState(false);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(FOLDER_COLORS[0].hex);
  const editing = project?.folders?.find((f) => f.id === editId);
  const parent = project?.folders?.find((f) => f.id === parentId);

  // Each time it opens: blank for a new folder, as it is for one being edited.
  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setDescribing(!!editing?.description);
    setDescription(editing?.description ?? "");
    setColor(editing?.color ?? FOLDER_COLORS[0].hex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  if (!mounted || typeof document === "undefined") return null;

  const create = () => {
    if (!name.trim() || !project) return;
    if (editing) {
      const next = { ...editing, name: name.trim(), color, description: describing && description.trim() ? description.trim() : undefined };
      patchProject(project.id, { folders: (project.folders ?? []).map((f) => (f.id === editing.id ? next : f)) });
      close();
      return;
    }
    const folder = {
      id: `folder-${Date.now().toString(36)}`,
      name: name.trim(),
      color,
      createdAt: Date.now(),
      ...(parent ? { parentId: parent.id } : {}),
      ...(describing && description.trim() ? { description: description.trim() } : {}),
    };
    patchProject(project.id, { folders: [...(project.folders ?? []), folder] });
    patchStudio({ folderId: folder.id });
    close();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit folder" : "New folder"}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className={`absolute inset-0 bg-canvas-deep/60 backdrop-blur-sm ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
        className={`relative flex w-full max-w-[400px] flex-col rounded-panel border border-line bg-elevated p-4 sm:p-5 ${
          exiting ? "anim-pop-out" : "anim-pop"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-[17px] font-semibold text-t1">
            {editing ? "Edit folder" : "New folder"}
            {parent && !editing && <span className="font-normal text-t3"> in {parent.name}</span>}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
          >
            <Icon name="close" size={17} />
          </button>
        </div>

        <input
          autoFocus
          aria-label="Folder name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="My folder"
          maxLength={60}
          className="mt-8 w-full bg-transparent text-center text-[28px] font-semibold tracking-[-0.02em] text-t1 outline-none placeholder:text-t4 sm:text-[30px]"
        />

        <div className="mt-8 flex items-center justify-between gap-3 px-1">
          <span className="text-[13.5px] text-t3">Description</span>
          <button
            type="button"
            onClick={() => setDescribing((d) => !d)}
            aria-label={describing ? "Remove description" : "Add description"}
            aria-expanded={describing}
            className="grid h-7 w-7 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.07] hover:text-t1"
          >
            <Icon name={describing ? "minus" : "plus"} size={15} />
          </button>
        </div>
        {describing && (
          <textarea
            autoFocus
            aria-label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add description"
            maxLength={300}
            className="anim-fade mt-2 min-h-[104px] w-full resize-none rounded-card bg-t1/[0.05] px-3.5 py-3 text-[15px] text-t1 outline-none ring-1 ring-inset ring-transparent placeholder:text-t4 focus:ring-line-strong md:text-[14px]"
          />
        )}

        <div className="mt-4 flex items-center justify-between gap-3 px-1">
          <span className="text-[13.5px] text-t3">Color</span>
          <div role="radiogroup" aria-label="Color" className="flex gap-1.5">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={color === c.hex}
                aria-label={c.name}
                title={c.name}
                onClick={() => setColor(c.hex)}
                className={`h-[22px] w-[22px] rounded-full transition-transform duration-[120ms] active:scale-90 ${
                  color === c.hex ? "ring-2 ring-t1 ring-offset-2 ring-offset-[var(--elevated)]" : ""
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim()}
          className="cta mt-6 h-12 w-full rounded-card text-[15px] font-semibold disabled:opacity-40"
        >
          {editing ? "Save" : "Create"}
        </button>
      </form>
    </div>,
    document.body,
  );
}
