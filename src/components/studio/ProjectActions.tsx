"use client";

import { Icon, type IconName } from "@/components/Icon";
import { Popover } from "@/components/Popover";
import { useNewFolder, useNewProject } from "@/lib/newProject";
import { useStudio, type Project } from "@/store/studio";

function Row({ icon, label, onClick, danger }: { icon: IconName; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-chip px-2.5 py-2 text-left text-[13.5px] transition-colors duration-[120ms] ${
        danger ? "text-[#ff8f8f] hover:bg-[#ff6b6b]/10" : "text-t2 hover:bg-t1/[0.06] hover:text-t1"
      }`}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}

/**
 * What can be done to a project from a list of them: keep it at the top,
 * edit its name and privacy, start a folder in it, or send it to the Trash
 * (from where it can be brought back).
 */
export function ProjectMenu({ project, close }: { project: Project; close: () => void }) {
  const patchProject = useStudio((s) => s.patchProject);
  const trashProject = useStudio((s) => s.trashProject);
  const patchStudio = useStudio((s) => s.patchStudio);
  const edit = useNewProject((s) => s.edit);
  const askFolder = useNewFolder((s) => s.ask);
  return (
    <div className="flex flex-col">
      <Row icon="pin" label={project.pinned ? "Unpin" : "Pin to top"} onClick={() => (patchProject(project.id, { pinned: !project.pinned }), close())} />
      <Row icon="pencil" label="Edit" onClick={() => (edit(project.id), close())} />
      <Row
        icon="folder-plus"
        label="Add folder"
        onClick={() => {
          // The folder opens inside its project.
          patchStudio({ view: "project", projectId: project.id, folderId: "" });
          askFolder(project.id);
          close();
        }}
      />
      <span className="my-1 h-px bg-line" />
      <Row
        icon="trash"
        label="Delete"
        danger
        onClick={() => {
          trashProject(project.id, true);
          if (useStudio.getState().studio.projectId === project.id && useStudio.getState().studio.view === "project") patchStudio({ view: "projects" });
          close();
        }}
      />
    </div>
  );
}

/** The ⋯ that opens a project's menu; `className` says when it shows. */
export function ProjectMenuButton({ project, className = "", align = "start" }: { project: Project; className?: string; align?: "start" | "end" }) {
  return (
    <Popover
      width={210}
      align={align}
      title={project.name}
      trigger={(open) => (
        <span
          aria-label={`${project.name} menu`}
          className={`grid h-7 w-7 place-items-center rounded-full transition-[opacity,color,background-color] duration-[120ms] hover:bg-t1/[0.08] hover:text-t1 ${
            open ? "bg-t1/[0.08] text-t1 opacity-100" : `text-t3 ${className}`
          }`}
        >
          <Icon name="more" size={15} />
        </span>
      )}
    >
      {(close) => <ProjectMenu project={project} close={close} />}
    </Popover>
  );
}

/** Live projects (not in the Trash), pinned ones first. */
export function liveProjects(projects: Project[]): Project[] {
  return projects.filter((p) => !p.trashedAt).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
}
