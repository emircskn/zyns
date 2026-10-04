import { create } from "zustand";
import type { Project } from "@/store/studio";

/**
 * The "New project" window, asked for from anywhere (a menu, the side
 * menu, the projects page) and drawn once over everything. Whoever asked is
 * told of the project made, even if the menu it came from has closed.
 */
export const useNewProject = create<{
  open: boolean;
  onCreated: ((project: Project) => void) | null;
  /** The project being edited instead, when it is one already there. */
  editId: string | null;
  ask: (onCreated?: (project: Project) => void) => void;
  edit: (projectId: string) => void;
  close: () => void;
}>((set) => ({
  open: false,
  onCreated: null,
  editId: null,
  ask: (onCreated) => set({ open: true, onCreated: onCreated ?? null, editId: null }),
  edit: (editId) => set({ open: true, onCreated: null, editId }),
  close: () => set({ open: false }),
}));

/**
 * The folder window, for the project that is open: a new folder (under
 * another, when `parentId` is given) or, with `editId`, one already there.
 */
export const useNewFolder = create<{
  projectId: string | null;
  parentId: string | null;
  editId: string | null;
  ask: (projectId: string, options?: { parentId?: string; editId?: string }) => void;
  close: () => void;
}>((set) => ({
  projectId: null,
  parentId: null,
  editId: null,
  ask: (projectId, options) => set({ projectId, parentId: options?.parentId ?? null, editId: options?.editId ?? null }),
  close: () => set({ projectId: null }),
}));

/**
 * Deleting work from a project: to that project's Trash (it stays in My
 * Generations and Assets), or, with the box ticked, out of the studio for good.
 */
export const useProjectDelete = create<{
  ask: { runIds: string[]; uploadIds: string[]; onDone?: () => void } | null;
  open: (ask: { runIds?: string[]; uploadIds?: string[]; onDone?: () => void }) => void;
  close: () => void;
}>((set) => ({
  ask: null,
  open: ({ runIds = [], uploadIds = [], onDone }) => set({ ask: { runIds, uploadIds, onDone } }),
  close: () => set({ ask: null }),
}));
