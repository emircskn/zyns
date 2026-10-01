"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Popover } from "@/components/Popover";
import { Chip } from "@/components/PromptBar";
import { useStudio } from "@/store/studio";

/** The list of projects with a way to start a new one, shared by the composer and Assets. */
function ProjectList({
  current,
  noneLabel,
  onPick,
  close,
}: {
  current: string | null;
  noneLabel: string;
  onPick: (id: string | null) => void;
  close: () => void;
}) {
  const projects = useStudio((s) => s.projects);
  const addProject = useStudio((s) => s.addProject);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const row = (on: boolean) =>
    `flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-[13.5px] transition-colors duration-[120ms] ${
      on ? "bg-t1 text-canvas" : "text-t2 hover:bg-t1/[0.07] hover:text-t1"
    }`;

  return (
    <div className="flex flex-col gap-0.5 p-1.5">
      <button type="button" className={row(current === null)} onClick={() => (onPick(null), close())}>
        <Icon name="layers" size={15} />
        {noneLabel}
      </button>
      {projects.map((project) => (
        <button key={project.id} type="button" className={row(current === project.id)} onClick={() => (onPick(project.id), close())}>
          <Icon name="folder" size={15} />
          <span className="truncate">{project.name}</span>
        </button>
      ))}
      {naming ? (
        <form
          className="mt-1 flex items-center gap-1.5 px-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            const project = addProject(name);
            onPick(project.id);
            close();
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
            className="min-w-0 flex-1 rounded-full bg-t1/[0.06] px-3 py-1.5 text-[13.5px] text-t1 outline-none placeholder:text-t4"
          />
          <button type="submit" className="cta rounded-full px-3 py-1.5 text-[12.5px] font-medium">
            Add
          </button>
        </form>
      ) : (
        <button type="button" className={row(false)} onClick={() => setNaming(true)}>
          <Icon name="plus" size={15} />
          New project
        </button>
      )}
    </div>
  );
}

/**
 * The composer's "save to" choice: what is made (and uploaded) while a
 * project is chosen is filed under it. Shown once there is a project to
 * choose; they are started from Assets.
 */
export function ProjectChip({ full }: { full?: boolean }) {
  const projects = useStudio((s) => s.projects);
  const active = useStudio((s) => s.activeProjectId);
  const setActive = useStudio((s) => s.setActiveProject);
  if (projects.length === 0) return null;
  const project = projects.find((p) => p.id === active);
  return (
    <Popover
      full={full}
      title="Save to project"
      trigger={(open) => <Chip icon={<Icon name="folder" size={16} />} value={project?.name ?? "No project"} active={open} />}
    >
      {(close) => <ProjectList current={active} noneLabel="No project" onPick={setActive} close={close} />}
    </Popover>
  );
}

/** Assets' project filter, which also starts new projects. */
export function ProjectFilter({
  value,
  onChange,
  compact,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  /** A phone's: a round folder button, lit while a project is chosen. */
  compact?: boolean;
}) {
  const projects = useStudio((s) => s.projects);
  const project = projects.find((p) => p.id === value);
  return (
    <Popover
      align="end"
      title="Projects"
      trigger={(open) =>
        compact ? (
          <span
            aria-label={project ? `Project: ${project.name}` : "Projects"}
            className={`grid h-9 w-9 place-items-center rounded-full transition-colors duration-[120ms] ${
              project ? "bg-t1 text-canvas" : open ? "bg-t1/[0.12] text-t1" : "bg-t1/[0.07] text-t1"
            }`}
          >
            <Icon name="folder" size={16} />
          </span>
        ) : (
        <span
          className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors duration-[120ms] ${
            open || project ? "bg-t1/[0.12] text-t1" : "bg-t1/[0.05] text-t2 hover:text-t1"
          }`}
        >
          <Icon name="folder" size={15} />
          <span className="max-w-[160px] truncate">{project?.name ?? "All projects"}</span>
          <Icon name="chevron" size={14} className="text-t3" />
        </span>
        )
      }
    >
      {(close) => <ProjectList current={value} noneLabel="All projects" onPick={onChange} close={close} />}
    </Popover>
  );
}
