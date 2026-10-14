import { createContext, useContext } from "react";

/** Whether Cinema Studio's side menu is folded down to its icons. */
export const SideCollapsed = createContext(false);
export const useSideCollapsed = () => useContext(SideCollapsed);
