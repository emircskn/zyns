"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Popover } from "@/components/Popover";
import { ConfirmPopup } from "@/components/ConfirmPopup";
import { Chip } from "@/components/PromptBar";
import { useNewProject } from "@/lib/newProject";
import { useStudio } from "@/store/studio";

/** The list of projects with a way to start a new one, shared by the composer and Assets. */
export function ProjectList({
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
  const askNewProject = useNewProject((s) => s.ask);
  const renameProject = useStudio((s) => s.renameProject);
  const removeProject = useStudio((s) => s.removeProject);
  // The project whose row is open for a new name or deleting, and whether
  // the delete has been asked for once already.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false);
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
      {projects.map((project) =>
        editing === project.id ? (
          <form
            key={project.id}
            className="flex items-center gap-1.5 px-1 py-0.5"
            onSubmit={(event) => {
              event.preventDefault();
              renameProject(project.id, draft);
              setEditing(null);
            }}
          >
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="Project name"
              className="min-w-0 flex-1 rounded-full bg-t1/[0.06] px-3 py-1.5 text-[13.5px] text-t1 outline-none"
            />
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${project.name}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-[#ff6b6b]/10 hover:text-[#ff8f8f]"
            >
              <Icon name="trash" size={15} />
            </button>
            <button type="submit" className="cta rounded-full px-3 py-1.5 text-[12.5px] font-medium">
              Save
            </button>
            <ConfirmPopup
              open={confirming}
              title={`Delete ${project.name}?`}
              message="What is in it stays in your studio; it just belongs to no project any more."
              confirmLabel="Delete"
              onConfirm={() => {
                setConfirming(false);
                removeProject(project.id);
                if (current === project.id) onPick(null);
                setEditing(null);
              }}
              onClose={() => setConfirming(false)}
            />
          </form>
        ) : (
          <div key={project.id} className="relative">
            <button
              type="button"
              className={`${row(current === project.id)} pr-11`}
              onClick={() => (onPick(project.id), close())}
            >
              <Icon name="folder" size={15} />
              <span className="truncate">{project.name}</span>
            </button>
            {/* Renaming and deleting, kept off the row itself so a tap on
                the name still simply picks it. */}
            <button
              type="button"
              aria-label={`Edit ${project.name}`}
              onClick={() => {
                setEditing(project.id);
                setDraft(project.name);
                setConfirming(false);
              }}
              className={`absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full transition-colors duration-[120ms] ${
                current === project.id ? "text-canvas/70 hover:text-canvas" : "text-t3 hover:bg-t1/[0.07] hover:text-t1"
              }`}
            >
              <Icon name="more" size={16} />
            </button>
          </div>
        ),
      )}
      <button
        type="button"
        className={row(false)}
        onClick={() =>
          // Its own window, over this menu; what is made is picked here.
          askNewProject((project) => {
            onPick(project.id);
            close();
          })
        }
      >
        <Icon name="plus" size={15} />
        New project
      </button>
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
