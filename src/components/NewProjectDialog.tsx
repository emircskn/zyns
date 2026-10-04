"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { useNewProject } from "@/lib/newProject";
import { usePresence } from "@/lib/usePresence";
import { useStudio, type ProjectVisibility } from "@/store/studio";

/**
 * Starting a project: a small window over everything, on a phone as on a
 * desktop. Its name is written large in the middle, under it whether it is
 * private or public, and Create at the foot once it has a name.
 */
export function NewProjectDialog() {
  const open = useNewProject((s) => s.open);
  const onCreated = useNewProject((s) => s.onCreated);
  const close = useNewProject((s) => s.close);
  const addProject = useStudio((s) => s.addProject);
  const { mounted, exiting } = usePresence(open, 180);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");

  // Each time it opens, it starts blank and private.
  useEffect(() => {
    if (!open) return;
    setName("");
    setVisibility("private");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Only this closes: a window or menu under it stays open.
      event.stopPropagation();
      close();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  if (!mounted || typeof document === "undefined") return null;

  const create = () => {
    if (!name.trim()) return;
    const project = addProject(name, visibility);
    close();
    onCreated?.(project);
  };
  const isPrivate = visibility === "private";

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="New project"
      // Its own: a menu it was opened from must not read a press in here as a press outside.
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
        className={`relative flex w-full max-w-[480px] flex-col rounded-panel border border-line bg-elevated p-4 sm:p-5 ${
          exiting ? "anim-pop-out" : "anim-pop"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold text-t1">New project</h2>
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
          aria-label="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="My project"
          maxLength={80}
          className="mt-8 w-full bg-transparent text-center text-[28px] font-semibold tracking-[-0.02em] text-t1 outline-none placeholder:text-t4 sm:text-[32px]"
        />
        <button
          type="button"
          onClick={() => setVisibility(isPrivate ? "public" : "private")}
          aria-label={`${isPrivate ? "Private" : "Public"} project, tap to make it ${isPrivate ? "public" : "private"}`}
          className="mx-auto mt-4 flex items-center gap-2 rounded-full bg-t1/[0.07] px-3.5 py-2 text-[13.5px] font-medium text-t1 transition-[background-color,transform] duration-[120ms] hover:bg-t1/[0.12] active:scale-[0.97]"
        >
          <Icon name={isPrivate ? "lock" : "globe"} size={15} className="text-t3" />
          {isPrivate ? "Private project" : "Public project"}
        </button>

        <button
          type="submit"
          disabled={!name.trim()}
          className="cta mt-10 h-12 w-full rounded-card text-[15px] font-semibold disabled:opacity-40"
        >
          Create
        </button>
      </form>
    </div>,
    document.body,
  );
}
