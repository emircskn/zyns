"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { SidePanel, canHover } from "@/components/SidePanel";
import { useNewProject } from "@/lib/newProject";
import { useStudio } from "@/store/studio";

/**
 * "Move to" in the enlarged view's menu: with a mouse the projects open
 * beside the menu on hover, each with how much it holds, and a new one can
 * be started from there; a phone opens its project window instead.
 */
export function MoveToProject({
  urls,
  current,
  onFallback,
  onDone,
}: {
  urls: string[];
  /** The project it is in now, if any. */
  current: string | null;
  /** Without hover: the project window. */
  onFallback: () => void;
  /** Filed: the menu closes. */
  onDone: () => void;
}) {
  const row = useRef<HTMLButtonElement>(null);
  const leaving = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const allProjects = useStudio((s) => s.projects);
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  const fileUnder = useStudio((s) => s.fileUnder);
  const askNewProject = useNewProject((s) => s.ask);
  const projects = allProjects.filter((p) => !p.trashedAt).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const held = (id: string) =>
    runs.filter((r) => r.projectId === id && !r.trashedAt).length + uploads.filter((u) => u.projectId === id && !u.trashedAt).length;

  useEffect(() => () => {
    if (leaving.current) clearTimeout(leaving.current);
  }, []);
  const stay = () => {
    if (leaving.current) clearTimeout(leaving.current);
    leaving.current = null;
  };
  // A moment's grace, so the pointer can cross from the row to its panel.
  const leave = () => {
    stay();
    leaving.current = setTimeout(() => setOpen(false), 180);
  };
  const pick = (projectId: string | null) => {
    fileUnder(urls, projectId);
    setOpen(false);
    onDone();
  };

  const item = "flex w-full items-center gap-2.5 rounded-chip px-2.5 py-2 text-left transition-colors duration-[120ms]";
  return (
    <>
      <button
        ref={row}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseEnter={() => {
          if (!canHover()) return;
          stay();
          setOpen(true);
        }}
        onMouseLeave={() => open && leave()}
        onClick={() => (canHover() ? setOpen((now) => !now) : onFallback())}
        className={`flex items-center gap-2.5 rounded-chip px-3 py-2 text-left text-[13.5px] transition-colors duration-[120ms] ${
          open ? "bg-t1/[0.07] text-t1" : "text-t2 hover:bg-t1/[0.07] hover:text-t1"
        }`}
      >
        <Icon name="transfer" size={15} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">Move to</span>
        <Icon name="chevron" size={13} className="-rotate-90 text-t4" />
      </button>
      {open && row.current && (
        <SidePanel anchor={row.current} width={240} layer="z-[125]" onEnter={stay} onLeave={leave}>
          <p className="px-2.5 pb-1.5 pt-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-t4">Projects</p>
          {current && (
            <button type="button" onClick={() => pick(null)} className={`${item} text-t2 hover:bg-t1/[0.06] hover:text-t1`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-t1/[0.06] text-t3">
                <Icon name="close" size={13} />
              </span>
              <span className="text-[13.5px]">No project</span>
            </button>
          )}
          {projects.map((project) => {
            const on = project.id === current;
            const count = held(project.id);
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => (on ? (setOpen(false), onDone()) : pick(project.id))}
                className={`${item} ${on ? "bg-t1/[0.08] text-t1" : "text-t2 hover:bg-t1/[0.06] hover:text-t1"}`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-t1/[0.07] text-t2">
                  <Icon name={project.visibility === "public" ? "globe" : "folder"} size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{project.name}</span>
                  <span className="block text-[11.5px] text-t4">
                    {count} {count === 1 ? "asset" : "assets"}
                  </span>
                </span>
                {on && <Icon name="check" size={14} className="shrink-0" />}
              </button>
            );
          })}
          {projects.length > 0 && <span className="my-1 block h-px bg-line" />}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDone();
              askNewProject((project) => fileUnder(urls, project.id));
            }}
            className={`${item} text-t2 hover:bg-t1/[0.06] hover:text-t1`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-t1/[0.06]">
              <Icon name="plus" size={14} />
            </span>
            <span className="text-[13.5px]">Create new project</span>
          </button>
        </SidePanel>
      )}
    </>
  );
}
