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
  ask: (onCreated?: (project: Project) => void) => void;
  close: () => void;
}>((set) => ({
  open: false,
  onCreated: null,
  ask: (onCreated) => set({ open: true, onCreated: onCreated ?? null }),
  close: () => set({ open: false }),
}));
