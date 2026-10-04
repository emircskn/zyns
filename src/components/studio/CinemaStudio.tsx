"use client";

import { useEffect, useRef } from "react";
import { GlideMark } from "@/components/GlideMark";
import { ElementsPage } from "@/components/ElementsPage";
import { Icon, type IconName } from "@/components/Icon";
import { NeedsHiggsfield } from "@/components/remix/RemixPage";
import { StudioComposer, useStudioUi } from "@/components/studio/StudioComposer";
import { GenerationsView, ProjectView, ProjectsView, STUDIO_NAV, StudioSidebar, StudioTrash } from "@/components/studio/StudioViews";
import { useStudio, type StudioView } from "@/store/studio";

/** The side menu's pages as a phone's chips, with the same icons. */
const PHONE_NAV: Array<{ id: StudioView; label: string; icon: IconName }> = [
  ...STUDIO_NAV.map((n) => ({ id: n.id, icon: n.icon, label: n.id === "home" ? "Home" : n.label.replace("My ", "").replace(/^./, (c) => c.toUpperCase()) })),
  { id: "projects", label: "Projects", icon: "folder" },
  { id: "trash", label: "Trash", icon: "trash" },
];

/**
 * Cinema Studio: its own menu down the left (its pages and projects), and
 * beside it the page chosen there. Home is a large title over the composer;
 * the other pages keep the composer docked at their foot. On a phone the
 * menu is a row of chips over the page.
 */
export function CinemaStudio({ onKeyClick }: { onKeyClick: () => void }) {
  const chips = useRef<HTMLDivElement>(null);
  const hfKey = useStudio((s) => s.hfKey);
  const studio = useStudioUi();
  const patchStudio = useStudio((s) => s.patchStudio);
  const setActiveProject = useStudio((s) => s.setActiveProject);
  const project = useStudio((s) => s.projects.find((p) => p.id === s.studio.projectId && !p.trashedAt));
  const view = studio.view === "project" && !project ? "projects" : studio.view;
  const inTrash = view === "trash" || (view === "project" && studio.folderId === "trash");

  // Inside a project, what is made is saved to it.
  useEffect(() => {
    if (view === "project" && project) setActiveProject(project.id);
  }, [view, project, setActiveProject]);

  // Image mode runs on any key; video mode needs Higgsfield's for Cinema Studio itself.
  const composer =
    !hfKey && studio.mode === "video" && studio.videoModelId === "hf-cinema-studio-4" ? (
      <div className="rounded-panel border border-line bg-elevated">
        <NeedsHiggsfield onKeyClick={onKeyClick} feature="Cinema Studio runs on Higgsfield. You can still pick another model, or switch to Image" />
        <div className="flex justify-center gap-2 pb-5">
          <button type="button" onClick={() => patchStudio({ mode: "image" })} className="rounded-full bg-t1/[0.07] px-4 py-2 text-[13px] text-t2 hover:text-t1">
            Switch to Image
          </button>
        </div>
      </div>
    ) : (
      <StudioComposer onKeyClick={onKeyClick} />
    );

  return (
    <div className="anim-fade flex flex-1 flex-col md:flex-row md:gap-4 md:px-4 md:pt-4">
      <aside className="hidden w-[229px] shrink-0 md:sticky md:top-[76px] md:block md:h-[calc(100dvh-92px)] md:overflow-hidden md:rounded-panel md:border md:border-line md:bg-elevated">
        <StudioSidebar />
      </aside>
      {/* A phone has no side menu or header nav: the page names itself and its parts are chips. */}
      <div className="px-4 pb-2 pt-1 md:hidden">
        <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1">Cinema Studio</h2>
        <div ref={chips} className="no-bar relative -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4">
          <GlideMark value={view === "project" ? "projects" : view} className="rounded-full bg-t1" />
          {PHONE_NAV.map((item) => (
            <button
              key={item.id}
              data-pill={item.id}
              type="button"
              onClick={() => patchStudio({ view: item.id })}
              aria-current={view === item.id || (item.id === "projects" && view === "project") || undefined}
              className={`relative flex h-8 shrink-0 items-center gap-1.5 rounded-full pl-3 pr-3.5 text-[13px] transition-colors duration-[var(--d-slow)] ease-[var(--ease)] active:scale-[0.97] ${
                view === item.id || (item.id === "projects" && view === "project") ? "text-canvas" : "bg-t1/[0.07] text-t2"
              }`}
            >
              <Icon name={item.icon} size={14} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        {view === "home" ? (
          <div key="home" className="anim-fade flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-10 pt-4 md:px-0 md:pt-10">
            <h1 className="studio-title text-center text-[34px] font-bold uppercase leading-[1.02] tracking-[-0.03em] md:text-[56px]">
              Direct every shot
            </h1>
            <div className="w-full max-w-[1040px]">{composer}</div>
          </div>
        ) : (
          <>
            {/* Keyed by the page, so each one fades in as the other pages do. */}
            <div key={view === "project" ? `project-${studio.projectId}` : view} className="anim-fade flex-1 pb-6">
              {view === "generations" ? (
                <GenerationsView />
              ) : view === "favorites" ? (
                <GenerationsView favoritesOnly />
              ) : view === "elements" ? (
                <ElementsPage />
              ) : view === "projects" ? (
                <ProjectsView />
              ) : view === "trash" ? (
                <StudioTrash />
              ) : (
                <ProjectView />
              )}
            </div>
            {/* Docked at the page's foot, as on Higgsfield's own pages; a phone keeps it on Home.
                A Trash is for bringing things back, and its bar takes the foot instead. */}
            {!inTrash && (
              <div className="sticky bottom-4 z-30 mx-auto hidden w-full max-w-[1040px] pb-2 md:block">
                <div className="rounded-panel" style={{ boxShadow: "var(--shadow-bar)" }}>
                  {composer}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
