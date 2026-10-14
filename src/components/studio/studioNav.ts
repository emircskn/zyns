import { createContext, useContext } from "react";
import { isStudioRun } from "@/lib/studio/reuse";
import { useStudio, type Run } from "@/store/studio";

/** Where a studio's side menu and project pages are: its open page, project and folder. */
export interface StudioNavUi {
  view: string;
  projectId?: string;
  folderId?: string;
}

export interface StudioNavValue {
  ui: StudioNavUi;
  patch: (patch: Partial<StudioNavUi>) => void;
  /** What this studio made: its Generations, Favorites and Trash. */
  owns: (run: Run) => boolean;
  /** Its name, where the pages say whose Trash or work it is. */
  name: string;
  /** Whose projects it lists: Marketing Studio's are its own. */
  app?: "marketing";
}

/** Whether a project belongs to the studio showing it. */
export const ofApp = (nav: StudioNavValue) => (project: { app?: "marketing" }) => project.app === nav.app;

/**
 * Cinema Studio's menu, project pages and walls are shared with Marketing
 * Studio: each says here whose state they move and whose runs they show.
 * Without a provider they are Cinema Studio's.
 */
export const StudioNav = createContext<StudioNavValue | null>(null);

export function useStudioNav(): StudioNavValue {
  const given = useContext(StudioNav);
  const studio = useStudio((s) => s.studio);
  const patchStudio = useStudio((s) => s.patchStudio);
  return given ?? { ui: studio, patch: (p) => patchStudio(p as never), owns: isStudioRun, name: "Cinema Studio" };
}
