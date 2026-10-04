"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { GlideMark } from "@/components/GlideMark";
import { ConfirmPopup } from "@/components/ConfirmPopup";
import { DensitySlider, PhoneGridToggle, SelectToggle } from "@/components/DensityControl";
import { Gallery, TileExtras, type TileExtrasValue } from "@/components/Gallery";
import { Icon, type IconName } from "@/components/Icon";
import { MediaPreview } from "@/components/MediaViewer";
import { Popover } from "@/components/Popover";
import { useAssets } from "@/lib/assets";
import { calledElements } from "@/lib/elements";
import { getModel } from "@/lib/registry";
import { mediaSrc } from "@/lib/storage/client";
import { isStudioRun, studioReference } from "@/lib/studio/reuse";
import { mediaKind } from "@/lib/upload";
import { useNewFolder, useNewProject, useProjectDelete } from "@/lib/newProject";
import { FolderMenu, FolderTree, folderRows } from "@/components/studio/Folders";
import { FolderGlyph, TrashView, type TrashItem, type TrashKind } from "@/components/studio/Trash";
import { liveProjects, ProjectMenuButton } from "@/components/studio/ProjectActions";
import { useUploader } from "@/lib/useUploader";
import { TRASH_DAYS, useStudio, type Project, type Run, type StudioView, type Upload } from "@/store/studio";

/** A project's cover: the one chosen, or the first thing made in it. */
export function useCover(project: Project): string | undefined {
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  if (project.coverUrl) return project.coverUrl;
  const run = runs.find((r) => r.projectId === project.id && !r.trashedAt && r.urls[0] && mediaKind(r.urls[0]) === "image");
  return run?.urls[0] ?? uploads.find((u) => u.projectId === project.id && !u.trashedAt && u.kind === "image")?.url;
}

function CoverThumb({ project, size }: { project: Project; size: string }) {
  const cover = useCover(project);
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden bg-t1/[0.07] text-t3 ${size}`}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaSrc(cover)} alt="" className="h-full w-full object-cover" />
      ) : (
        <Icon name="folder" size={14} />
      )}
    </span>
  );
}

function NavRow({
  icon,
  label,
  on,
  onClick,
  trailing,
  pill,
}: {
  icon: IconName | ReactNode;
  label: string;
  on?: boolean;
  onClick: () => void;
  trailing?: ReactNode;
  /** Its id for the menu's sliding highlight, which then draws the chosen one's ground. */
  pill?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-pill={pill}
      aria-current={on || undefined}
      className={`relative flex h-9 w-full items-center gap-2.5 rounded-[12px] py-1.5 pl-1.5 pr-3 text-left text-[14px] font-medium transition-colors duration-[200ms] ${
        on ? `${pill ? "" : "bg-t1/[0.1]"} text-t1` : "text-t2 hover:bg-t1/[0.05] hover:text-t1"
      }`}
    >
      {typeof icon === "string" ? (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[8px] bg-t1/[0.07]">
          <Icon name={icon as IconName} size={14} />
        </span>
      ) : (
        icon
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}

export const STUDIO_NAV: Array<{ id: StudioView; label: string; icon: IconName }> = [
  { id: "home", label: "Home", icon: "home" },
  { id: "generations", label: "My generations", icon: "grid" },
  { id: "elements", label: "My elements", icon: "at" },
  { id: "favorites", label: "My favorites", icon: "heart" },
];

/** Cinema Studio's own menu down the left: its pages, then its projects. */
export function StudioSidebar() {
  const studio = useStudio((s) => s.studio);
  const patchStudio = useStudio((s) => s.patchStudio);
  const allProjects = useStudio((s) => s.projects);
  const projects = liveProjects(allProjects);
  const trashedProjects = allProjects.length - projects.length;
  const askNewProject = useNewProject((s) => s.ask);
  const [q, setQ] = useState("");
  const [looking, setLooking] = useState(false);
  const [byName, setByName] = useState(false);
  const shown = projects
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (byName ? a.name.localeCompare(b.name) : b.createdAt - a.createdAt))
    .slice(0, 8);

  const menu = useRef<HTMLDivElement>(null);
  if (studio.view === "project" && studio.projectId) return <ProjectSidebar />;

  return (
    <div ref={menu} className="relative flex h-full flex-col gap-1 p-2">
      <GlideMark value={studio.view} className="rounded-[12px] bg-t1/[0.1]" />
      <p className="px-2 pb-1.5 pt-1 text-[15px] font-semibold tracking-[-0.01em] text-t1">Cinema Studio</p>
      {STUDIO_NAV.map((item) => (
        <NavRow key={item.id} pill={item.id} icon={item.icon} label={item.label} on={studio.view === item.id} onClick={() => patchStudio({ view: item.id })} />
      ))}
      <div className="mt-4 flex items-center justify-between px-2 pb-1">
        <span className="text-[12px] font-medium text-t3">Projects</span>
        <span className="flex gap-0.5">
          <button type="button" aria-label="Search projects" onClick={() => setLooking((l) => !l)} className="grid h-6 w-6 place-items-center rounded-full text-t3 hover:text-t1">
            <Icon name="search" size={13} />
          </button>
          <button type="button" aria-label={byName ? "Sort by newest" : "Sort by name"} onClick={() => setByName((b) => !b)} className={`grid h-6 w-6 place-items-center rounded-full hover:text-t1 ${byName ? "text-t1" : "text-t3"}`}>
            <Icon name="sort" size={13} />
          </button>
        </span>
      </div>
      {looking && (
        <input
          autoFocus
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search projects"
          className="mx-1 mb-1 h-8 rounded-full bg-t1/[0.06] px-3 text-[13px] text-t1 outline-none placeholder:text-t4"
        />
      )}
      <NavRow
        icon="plus"
        label="New project"
        onClick={() => askNewProject((project) => patchStudio({ view: "project", projectId: project.id, folderId: "" }))}
      />
      <div className="no-bar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {shown.map((project) => (
          <div key={project.id} className="group relative shrink-0">
            <NavRow
              icon={<CoverThumb project={project} size="h-6 w-6 rounded-[8px]" />}
              label={project.name}
              onClick={() => patchStudio({ view: "project", projectId: project.id, folderId: "" })}
              trailing={
                <span className="grid w-6 shrink-0 place-items-center text-t4 transition-opacity duration-[120ms] group-hover:opacity-0 group-focus-within:opacity-0 group-has-[[aria-expanded=true]]:opacity-0 pointer-coarse:opacity-0">
                  {project.pinned && <Icon name="pin" size={12} />}
                </span>
              }
            />
            <span className="absolute right-1 top-1/2 -translate-y-1/2">
              <ProjectMenuButton
                project={project}
                className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
              />
            </span>
          </div>
        ))}
      </div>
      <NavRow
        pill="trash"
        icon="trash"
        label="Trash"
        on={studio.view === "trash"}
        onClick={() => patchStudio({ view: "trash" })}
        trailing={trashedProjects ? <span className="font-mono text-[11.5px] text-t4">{trashedProjects}</span> : undefined}
      />
      <NavRow pill="projects" icon="folder" label="All projects" on={studio.view === "projects"} onClick={() => patchStudio({ view: "projects" })} trailing={<Icon name="chevron" size={14} className="-rotate-90 text-t3" />} />
    </div>
  );
}

/** Inside a project: back, its name and menu, its brief, settings, elements, folders and Trash. */
function ProjectSidebar() {
  const studio = useStudio((s) => s.studio);
  const patchStudio = useStudio((s) => s.patchStudio);
  const project = useStudio((s) => s.projects.find((p) => p.id === s.studio.projectId && !p.trashedAt));
  const patchProject = useStudio((s) => s.patchProject);
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  const askFolder = useNewFolder((s) => s.ask);
  const [q, setQ] = useState("");
  const [looking, setLooking] = useState(false);
  const [byName, setByName] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  if (!project) return null;

  const inProject = (x: { projectId?: string; trashedAt?: number }) => x.projectId === project.id && !x.trashedAt;
  const all = runs.filter(inProject).length + uploads.filter(inProject).length;
  const inFolder = (id: string) =>
    runs.filter((r) => inProject(r) && r.folderId === id).length + uploads.filter((u) => inProject(u) && u.folderId === id).length;
  const trashed =
    runs.filter((r) => r.projectId === project.id && r.trashedAt && !r.trashedWith).length +
    uploads.filter((u) => u.projectId === project.id && u.trashedAt && !u.trashedWith).length +
    (project.folders ?? []).filter((f) => f.trashedAt && !f.trashedWith).length;
  const at = studio.folderId ?? "";
  const go = (folderId: string) => patchStudio({ folderId });
  return (
    <div ref={menu} className="relative flex h-full flex-col gap-1 p-2">
      <GlideMark value={at || "all"} className="rounded-[12px] bg-t1/[0.1]" deps={[(project.folders ?? []).map((f) => `${f.id}:${f.parentId ?? ""}`).join(), looking, q, byName]} />
      <NavRow
        icon={
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[8px] bg-t1/[0.07]">
            <Icon name="chevron" size={14} className="rotate-90" />
          </span>
        }
        label="Back"
        onClick={() => {
          // Leaving the project: what is made next is no longer saved to it.
          useStudio.getState().setActiveProject(null);
          patchStudio({ view: "home" });
        }}
      />
      <div className="flex items-center gap-2 px-2 pb-2 pt-2">
        <CoverThumb project={project} size="h-8 w-8 rounded-[10px]" />
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-t1">{project.name}</p>
        <Popover
          width={200}
          align="end"
          title="Project"
          trigger={() => (
            <span aria-label="Project menu" className="grid h-7 w-7 place-items-center rounded-full text-t3 hover:bg-t1/[0.07] hover:text-t1">
              <Icon name="more" size={15} />
            </span>
          )}
        >
          {(close) => (
            <div className="flex flex-col">
              <button type="button" onClick={() => { go("settings"); close(); }} className="rounded-chip px-2.5 py-2 text-left text-[13px] text-t2 hover:bg-t1/[0.06] hover:text-t1">
                Rename and settings
              </button>
              <button type="button" onClick={() => { go("brief"); close(); }} className="rounded-chip px-2.5 py-2 text-left text-[13px] text-t2 hover:bg-t1/[0.06] hover:text-t1">
                Edit brief
              </button>
            </div>
          )}
        </Popover>
      </div>
      <NavRow pill="brief" icon="list" label="Project brief" on={at === "brief"} onClick={() => go("brief")} />
      <NavRow pill="settings" icon="sliders" label="Settings" on={at === "settings"} onClick={() => go("settings")} />
      <NavRow pill="elements" icon="at" label="Elements" on={at === "elements"} onClick={() => go("elements")} />
      <div className="mt-4 flex items-center justify-between px-2 pb-1">
        <span className="text-[12px] font-medium text-t3">Folders</span>
        <span className="flex gap-0.5">
          <button type="button" aria-label="Search folders" onClick={() => setLooking((l) => !l)} className={`grid h-6 w-6 place-items-center rounded-full hover:text-t1 ${looking ? "text-t1" : "text-t3"}`}>
            <Icon name="search" size={13} />
          </button>
          <button type="button" aria-label={byName ? "Sort folders by newest" : "Sort folders by name"} onClick={() => setByName((b) => !b)} className={`grid h-6 w-6 place-items-center rounded-full hover:text-t1 ${byName ? "text-t1" : "text-t3"}`}>
            <Icon name="sort" size={13} />
          </button>
        </span>
      </div>
      {looking && (
        <input
          autoFocus
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search folders"
          className="mx-1 mb-1 h-8 shrink-0 rounded-full bg-t1/[0.06] px-3 text-[13px] text-t1 outline-none placeholder:text-t4"
        />
      )}
      <NavRow
        pill="all"
        icon={
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[8px] bg-t1/[0.1] text-t1">
            <Icon name="spark" size={13} fill="currentColor" strokeWidth={1.2} />
          </span>
        }
        label="All assets"
        on={at === ""}
        onClick={() => go("")}
        trailing={<span className="font-mono text-[11.5px] text-t4">{all}</span>}
      />
      {/* The folders hang under All assets, as its parts. */}
      <div className="no-bar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pl-3">
        <FolderTree project={project} at={at} onOpen={go} count={inFolder} q={q} byName={byName} />
        <NavRow
          icon={
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-t1/[0.07]">
              <Icon name="plus" size={13} />
            </span>
          }
          label="Add folder"
          onClick={() => askFolder(project.id)}
        />
      </div>
      <NavRow pill="trash" icon="trash" label="Trash" on={at === "trash"} onClick={() => go("trash")} trailing={trashed ? <span className="font-mono text-[11.5px] text-t4">{trashed}</span> : undefined} />
    </div>
  );
}

/** A slim strip over a page's wall: its title, and what it can do. */
export function ViewHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-2 md:min-h-[56px] md:px-1 md:py-2.5">
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold text-t1">{title}</h2>
        {sub && <p className="text-[12.5px] text-t3">{sub}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function MenuButton({ icon, label, count }: { icon: IconName; label: string; count?: number }) {
  return (
    <span className="flex h-9 items-center gap-1.5 rounded-full bg-t1/[0.07] px-3.5 text-[13.5px] text-t1 md:h-8 md:bg-t1/[0.07] md:px-3 md:text-[13px] md:text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.1] hover:text-t1">
      <Icon name={icon} size={14} />
      {label}
      {count ? <span className="rounded-full bg-t1 px-1.5 text-[10.5px] font-semibold text-canvas">{count}</span> : null}
    </span>
  );
}

function Choice({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="flex items-center justify-between rounded-chip px-2.5 py-2 text-left text-[13px] text-t2 hover:bg-t1/[0.06] hover:text-t1"
    >
      {label}
      {on && <Icon name="check" size={14} className="text-t1" />}
    </button>
  );
}

export interface GenFilter {
  type: "all" | "image" | "video";
  model: string;
  date: "all" | "today" | "week" | "month";
  status: "all" | "done" | "running" | "failed";
  hideFailed: boolean;
  activity: "all" | "generated" | "uploaded" | "liked" | "downloaded";
  service: "all" | "kie" | "higgsfield";
}
export const NO_FILTER: GenFilter = { type: "all", model: "", date: "all", status: "all", hideFailed: false, activity: "all", service: "all" };

function activeFilters(f: GenFilter): number {
  return (
    Number(f.type !== "all") + Number(!!f.model) + Number(f.date !== "all") + Number(f.status !== "all") + Number(f.hideFailed) + Number(f.activity !== "all") + Number(f.service !== "all")
  );
}

/** Filter: by type, model, date, status, failed ones, and what was done with it. */
function FilterMenu({ filter, onChange, models }: { filter: GenFilter; onChange: (f: GenFilter) => void; models: Array<{ id: string; name: string }> }) {
  const set = (patch: Partial<GenFilter>) => onChange({ ...filter, ...patch });
  const group = (title: string, items: ReactNode) => (
    <div className="flex flex-col border-b border-line py-1 last:border-0">
      <p className="px-2.5 pb-0.5 pt-1.5 text-[11.5px] font-medium text-t3">{title}</p>
      {items}
    </div>
  );
  return (
    <Popover width={260} align="end" title="Filter" trigger={() => <MenuButton icon="sliders" label="Filter" count={activeFilters(filter)} />}>
      <div className="no-bar flex max-h-[min(520px,70vh)] flex-col overflow-y-auto">
        {group(
          "Type",
          (["all", "image", "video"] as const).map((t) => <Choice key={t} on={filter.type === t} label={t === "all" ? "All types" : t === "image" ? "Images" : "Videos"} onClick={() => set({ type: t })} />),
        )}
        {group(
          "Service",
          (
            [
              ["all", "All services"],
              ["kie", "KIE"],
              ["higgsfield", "Higgsfield"],
            ] as const
          ).map(([id, label]) => <Choice key={id} on={filter.service === id} label={label} onClick={() => set({ service: id })} />),
        )}
        {group("Model", [
          <Choice key="all" on={!filter.model} label="All models" onClick={() => set({ model: "" })} />,
          ...models.map((m) => <Choice key={m.id} on={filter.model === m.id} label={m.name} onClick={() => set({ model: m.id })} />),
        ])}
        {group(
          "Date range",
          (
            [
              ["all", "All time"],
              ["today", "Today"],
              ["week", "Last 7 days"],
              ["month", "Last 30 days"],
            ] as const
          ).map(([id, label]) => <Choice key={id} on={filter.date === id} label={label} onClick={() => set({ date: id })} />),
        )}
        {group(
          "Status",
          (
            [
              ["all", "Any status"],
              ["done", "Done"],
              ["running", "In progress"],
              ["failed", "Failed"],
            ] as const
          ).map(([id, label]) => <Choice key={id} on={filter.status === id} label={label} onClick={() => set({ status: id })} />),
        )}
        <button
          type="button"
          role="switch"
          aria-checked={filter.hideFailed}
          onClick={() => set({ hideFailed: !filter.hideFailed })}
          className="flex items-center justify-between border-b border-line px-2.5 py-2.5 text-left text-[13px] text-t2 hover:text-t1"
        >
          Hide failed
          <span className={`relative h-5 w-9 rounded-full transition-colors ${filter.hideFailed ? "bg-t1" : "bg-t1/[0.15]"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-canvas transition-[left] ${filter.hideFailed ? "left-[18px]" : "left-0.5"}`} />
          </span>
        </button>
        {group(
          "Activity",
          (
            [
              ["all", "All"],
              ["generated", "Generated"],
              ["uploaded", "Uploaded"],
              ["liked", "Liked"],
              ["downloaded", "Downloaded"],
            ] as const
          ).map(([id, label]) => <Choice key={id} on={filter.activity === id} label={label} onClick={() => set({ activity: id })} />),
        )}
        {activeFilters(filter) > 0 && (
          <button type="button" onClick={() => onChange(NO_FILTER)} className="mt-1 rounded-chip px-2.5 py-2 text-left text-[13px] text-t3 hover:text-t1">
            Clear filters
          </button>
        )}
      </div>
    </Popover>
  );
}

const DAY = 24 * 60 * 60 * 1000;

function matches(run: Run, f: GenFilter, favorites: string[], downloaded: string[]): boolean {
  if (f.type !== "all" && run.output !== f.type) return false;
  if (f.model && run.modelId !== f.model) return false;
  if (f.service !== "all" && (run.provider ?? "kie") !== f.service) return false;
  const age = Date.now() - run.createdAt;
  if (f.date === "today" && new Date(run.createdAt).toDateString() !== new Date().toDateString()) return false;
  if (f.date === "week" && age > 7 * DAY) return false;
  if (f.date === "month" && age > 30 * DAY) return false;
  if (f.status === "done" && run.state !== "success") return false;
  if (f.status === "failed" && run.state !== "failed") return false;
  if (f.status === "running" && (run.state === "success" || run.state === "failed")) return false;
  if (f.hideFailed && run.state === "failed") return false;
  if (f.activity === "liked" && !run.urls.some((u) => favorites.includes(u))) return false;
  if (f.activity === "downloaded" && !run.urls.some((u) => downloaded.includes(u))) return false;
  return true;
}

/** Uploads, as a grid of squares: for the Uploaded filter and a project's own files. */
function UploadGrid({ uploads, extras }: { uploads: Upload[]; extras?: { trash?: boolean } }) {
  const [preview, setPreview] = useState<string | null>(null);
  const setTrashed = useStudio((s) => s.setTrashed);
  if (uploads.length === 0) return null;
  return (
    <>
      <div className="grid grid-cols-3 gap-[3px] sm:grid-cols-5 lg:grid-cols-6">
        {uploads.map((upload) => (
          <div key={upload.id} className="group relative aspect-square overflow-hidden bg-surface">
            <button type="button" onClick={() => setPreview(upload.url)} className="block h-full w-full cursor-zoom-in">
              {upload.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaSrc(upload.url)} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : upload.kind === "video" ? (
                <video src={mediaSrc(upload.url)} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-t3">
                  <Icon name="audio" size={22} />
                </span>
              )}
            </button>
            <div className="hover-reveal absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {upload.kind === "image" && (
                <button type="button" title="Use as reference" aria-label="Use as reference" onClick={() => studioReference(upload.url)} className="grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md hover:bg-black/80">
                  <Icon name="layers" size={14} />
                </button>
              )}
              {extras?.trash && (
                <button type="button" title="Move to Trash" aria-label="Move to Trash" onClick={() => useProjectDelete.getState().open({ uploadIds: [upload.id] })} className="grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md hover:bg-[#ff6b6b]/80">
                  <Icon name="trash" size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <MediaPreview url={preview} onClose={() => setPreview(null)} />
    </>
  );
}

const studioOnly = (run: Run) => isStudioRun(run);

/** Everything made in Cinema Studio, with Filter and View. */
export function GenerationsView({ favoritesOnly }: { favoritesOnly?: boolean }) {
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  const favorites = useStudio((s) => s.favorites);
  const downloaded = useStudio((s) => s.downloaded);
  const [filter, setFilter] = useState<GenFilter>(favoritesOnly ? { ...NO_FILTER, activity: "liked" } : NO_FILTER);
  const mine = runs.filter((r) => !r.trashedAt && studioOnly(r));
  const models = [...new Map(mine.map((r) => [r.modelId, { id: r.modelId, name: getModel(r.modelId)?.name ?? r.modelName }])).values()];
  const show = useMemo(() => (run: Run) => studioOnly(run) && matches(run, filter, favorites, downloaded), [filter, favorites, downloaded]);
  const count = mine.filter(show).length;
  const extras: TileExtrasValue = useMemo(
    () => ({ onReference: studioReference }),
    [],
  );
  const uploadsShown = filter.activity === "uploaded";
  const shownUploads = uploads.filter((u) => !u.trashedAt && (filter.type === "all" || u.kind === filter.type));

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <ViewHead
        title={favoritesOnly ? "My favorites" : "My generations"}
        sub={uploadsShown ? `${shownUploads.length} uploads` : `${count.toLocaleString()} ${count === 1 ? "piece" : "pieces"}`}
      >
        {/* A phone: Select, Filter, then its two layouts, as Assets and Favorites have them. */}
        <span className="md:hidden">
          <SelectToggle />
        </span>
        <FilterMenu filter={filter} onChange={setFilter} models={models} />
        <span className="md:hidden">
          <PhoneGridToggle />
        </span>
        {/* A desktop: Filter, then the tile size, as Assets and Favorites have it. */}
        <DensitySlider />
      </ViewHead>
      <div className="md:px-1">
        {uploadsShown ? (
          shownUploads.length > 0 ? <UploadGrid uploads={shownUploads} /> : <Empty text="No uploads yet." />
        ) : count === 0 ? (
          <Empty text={favoritesOnly ? "Nothing liked yet. Tap the heart on a shot to keep it here." : "Nothing here yet. What you make in Cinema Studio shows up here."} />
        ) : (
          <TileExtras.Provider value={extras}>
            <Gallery filter={show} />
          </TileExtras.Provider>
        )}
      </div>
    </div>
  );
}

const TRASH_TABS: Array<{ id: TrashKind; label: string }> = [
  { id: "generation", label: "Generations" },
  { id: "upload", label: "Uploads" },
  { id: "folder", label: "Folders" },
];

/** A picture, clip or sound in the Trash, filling its card. */
function TrashMedia({ url }: { url?: string }) {
  if (url && mediaKind(url) === "image")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaSrc(url)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />;
  if (url && mediaKind(url) === "video")
    return <video src={mediaSrc(url)} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover opacity-80" />;
  return <Icon name="audio" size={24} className="text-t3" />;
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-16 text-center text-[13px] text-t3">{text}</p>;
}

/** Every project, as cards: a new one first. */
export function ProjectsView() {
  const projects = liveProjects(useStudio((s) => s.projects));
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <ViewHead title="My projects" sub={`${projects.length} ${projects.length === 1 ? "project" : "projects"}`} />
      <ProjectGrid className="grid-cols-2 px-4 md:grid-cols-3 md:px-1" />
    </div>
  );
}

/** Every project as a card, a new one first; `className` sets its columns. */
export function ProjectGrid({ className }: { className: string }) {
  const projects = liveProjects(useStudio((s) => s.projects));
  const askNewProject = useNewProject((s) => s.ask);
  const patchStudio = useStudio((s) => s.patchStudio);
  return (
    <div className={`grid gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => askNewProject((project) => patchStudio({ view: "project", projectId: project.id, folderId: "" }))}
        className="flex flex-col gap-2 text-left"
      >
        <span className="grid aspect-[16/10] w-full place-items-center rounded-card bg-t1/[0.05] transition-colors duration-[120ms] hover:bg-t1/[0.08]">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-t1/[0.1] text-t1">
            <Icon name="folder-plus" size={20} />
          </span>
        </span>
        <span className="text-[14px] font-medium text-t1">Create new project</span>
      </button>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onOpen={() => patchStudio({ view: "project", projectId: project.id, folderId: "" })} />
      ))}
    </div>
  );
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const cover = useCover(project);
  return (
    <div className="group relative min-w-0">
    <button type="button" onClick={onOpen} className="flex w-full min-w-0 flex-col gap-2 text-left">
      <span className="block aspect-[16/10] w-full overflow-hidden rounded-card bg-t1/[0.05]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaSrc(cover)} alt="" className="h-full w-full object-cover transition-transform duration-[300ms] group-hover:scale-[1.02]" />
        ) : (
          <span className="grid h-full w-full place-items-center text-t4">
            <Icon name="folder" size={24} />
          </span>
        )}
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[14px] font-medium text-t1">{project.name}</span>
        <span className="flex shrink-0 items-center gap-1 text-[12px] text-t3">
          <Icon name={project.visibility === "public" ? "globe" : "lock"} size={11} />
          {project.visibility === "public" ? "Public" : "Private"}
        </span>
      </span>
    </button>
      {/* Its menu, over the picture's corner: on hover, and always on a phone. */}
      <span className="absolute right-2 top-2 rounded-full bg-black/45 opacity-0 backdrop-blur-md transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100 pointer-coarse:opacity-100">
        <ProjectMenuButton project={project} align="end" className="!text-white" />
      </span>
      {project.pinned && (
        <span className="pointer-events-none absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md">
          <Icon name="pin" size={12} />
        </span>
      )}
    </div>
  );
}

/** Cinema Studio's own Trash: the projects deleted, kept a while. */
export function StudioTrash() {
  const projects = useStudio((s) => s.projects);
  const trashProject = useStudio((s) => s.trashProject);
  const removeProject = useStudio((s) => s.removeProject);
  const items: TrashItem[] = projects
    .filter((p) => p.trashedAt)
    .map((p) => ({
      key: p.id,
      kind: "project" as const,
      name: p.name,
      trashedAt: p.trashedAt!,
      preview: <ProjectTrashCover project={p} />,
      restore: () => trashProject(p.id, false),
      purge: () => removeProject(p.id),
    }));
  return (
    <TrashView
      items={items}
      note={`Projects can be restored for ${TRASH_DAYS} days. Their work stays in Assets either way.`}
      purgeNote="It can no longer be restored. What was made in it stays in My Generations and Assets."
    />
  );
}

function ProjectTrashCover({ project }: { project: Project }) {
  const cover = useCover(project);
  return cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaSrc(cover)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
  ) : (
    <FolderGlyph />
  );
}

/** A project open: its assets (all, or a folder's), its brief, settings, elements or Trash. */
export function ProjectView() {
  const askFolder = useNewFolder((s) => s.ask);
  const studio = useStudio((s) => s.studio);
  const project = useStudio((s) => s.projects.find((p) => p.id === s.studio.projectId && !p.trashedAt));
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  const elements = useStudio((s) => s.elements);
  const patchStudio = useStudio((s) => s.patchStudio);
  const patchProject = useStudio((s) => s.patchProject);
  const renameProject = useStudio((s) => s.renameProject);
  const trashProject = useStudio((s) => s.trashProject);
  const fileUnder = useStudio((s) => s.fileUnder);
  const fileInFolder = useStudio((s) => s.fileInFolder);
  const setTrashed = useStudio((s) => s.setTrashed);
  const removeRun = useStudio((s) => s.removeRun);
  const removeUpload = useStudio((s) => s.removeUpload);
  const restoreFolder = useStudio((s) => s.restoreFolder);
  const leaveProject = useStudio((s) => s.leaveProject);
  const purgeFolder = useStudio((s) => s.purgeFolder);
  const openEditor = useStudio((s) => s.openElementEditor);
  const assets = useAssets();
  const uploader = useUploader(["image", "video", "audio"]);
  const [deleting, setDeleting] = useState(false);
  const folder = studio.folderId ?? "";
  const pid = project?.id;
  const show = useMemo(
    () => (run: Run) => run.projectId === pid && !run.trashedAt && (!folder || run.folderId === folder),
    [pid, folder],
  );
  const extras: TileExtrasValue = useMemo(
    () => ({
      trash: true,
      folders: (project?.folders ?? []).filter((f) => !f.trashedAt),
      onFolder: (url, id) => fileInFolder([url], id),
      onReference: studioReference,
    }),
    [project?.folders, fileInFolder],
  );
  if (!project) {
    return <Empty text="This project is gone." />;
  }
  const openFolder = project.folders?.find((f) => f.id === folder);
  const folderName = openFolder?.name;
  const isAssets = folder === "" || !!folderName;
  const myUploads = uploads.filter((u) => u.projectId === project.id && !u.trashedAt && (!folder || u.folderId === folder));
  const myRuns = runs.filter((r) => r.projectId === project.id && !r.trashedAt && (!folder || r.folderId === folder));
  // What went to the Trash with a folder is inside that folder's card, not beside it.
  const trashItems: TrashItem[] = [
    ...runs
      .filter((r) => r.projectId === project.id && r.trashedAt && !r.trashedWith)
      .map((r) => ({
        key: r.id,
        kind: "generation" as const,
        name: r.prompt.trim() || r.modelName,
        trashedAt: r.trashedAt!,
        preview: <TrashMedia url={r.urls[0]} />,
        restore: () => setTrashed(r.urls, false),
        purge: () => leaveProject(r.urls),
      })),
    ...uploads
      .filter((u) => u.projectId === project.id && u.trashedAt && !u.trashedWith)
      .map((u) => ({
        key: u.id,
        kind: "upload" as const,
        name: u.name || "Upload",
        trashedAt: u.trashedAt!,
        preview: <TrashMedia url={u.url} />,
        restore: () => setTrashed([u.url], false),
        purge: () => leaveProject([u.url]),
      })),
    ...(project.folders ?? [])
      .filter((f) => f.trashedAt && !f.trashedWith)
      .map((f) => ({
        key: f.id,
        kind: "folder" as const,
        name: f.name,
        trashedAt: f.trashedAt!,
        preview: <FolderGlyph color={f.color} />,
        restore: () => restoreFolder(project.id, f.id),
        purge: () => purgeFolder(project.id, f.id),
      })),
  ];
  const called = calledElements(runs.filter((r) => r.projectId === project.id).map((r) => r.prompt).join(" \n "), elements);
  const field = "w-full rounded-chip bg-t1/[0.05] px-3.5 py-2.5 text-[15px] text-t1 outline-none ring-1 ring-inset ring-transparent placeholder:text-t4 focus:ring-line-strong md:text-[14px]";

  const title =
    folder === "brief" ? "Project brief" : folder === "settings" ? "Settings" : folder === "elements" ? "Elements" : folder === "trash" ? "Trash" : (folderName ?? project.name);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* A phone has no side menu: the project's parts are a row of chips. */}
      <div className="no-bar flex gap-1.5 overflow-x-auto px-4 pb-2 md:hidden">
        {[
          { id: "", label: "All assets" },
          ...folderRows(project.folders ?? []).map(({ folder: f, depth }) => ({ id: f.id, label: depth ? `› ${f.name}` : f.name, color: f.color })),
          { id: "brief", label: "Brief" },
          { id: "settings", label: "Settings" },
          { id: "elements", label: "Elements" },
          { id: "trash", label: "Trash" },
        ].map(({ id, label, color }: { id: string; label: string; color?: string }) => (
          <button
            key={id || "all"}
            type="button"
            onClick={() => patchStudio({ folderId: id })}
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] ${folder === id ? "bg-t1 text-canvas" : "bg-t1/[0.07] text-t2"}`}
          >
            {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => askFolder(project.id)}
          className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-t1/[0.07] pl-2.5 pr-3 text-[12.5px] text-t2"
        >
          <Icon name="plus" size={13} />
          Add folder
        </button>
      </div>
      {folder !== "trash" && (
      <ViewHead title={title} sub={isAssets ? `${myRuns.length + myUploads.length} assets` : undefined}>
        {openFolder && (
          <Popover
            width={220}
            align="end"
            title={openFolder.name}
            trigger={(open) => (
              <span
                aria-label={`${openFolder.name} menu`}
                className={`grid h-8 w-8 place-items-center rounded-chip transition-colors duration-[120ms] hover:bg-t1/[0.1] hover:text-t1 ${open ? "bg-t1/[0.1] text-t1" : "bg-t1/[0.06] text-t2"}`}
              >
                <Icon name="more" size={15} />
              </span>
            )}
          >
            {(close) => <FolderMenu project={project} folder={openFolder} close={close} />}
          </Popover>
        )}
        {isAssets && (
          <button
            type="button"
            onClick={() => uploader.input.current?.click()}
            className="flex h-8 items-center gap-1.5 rounded-chip bg-t1/[0.06] px-3 text-[13px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.1] hover:text-t1"
          >
            {uploader.busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name="upload" size={14} />}
            Upload
          </button>
        )}
      </ViewHead>
      )}
      {openFolder?.description && <p className="-mt-1 max-w-[640px] whitespace-pre-line px-4 pb-3 text-[13px] leading-relaxed text-t3 md:px-1">{openFolder.description}</p>}
      <input
        ref={uploader.input}
        type="file"
        multiple
        hidden
        accept={uploader.accept}
        onChange={(event) => {
          const files = event.target.files;
          if (files) {
            void uploader.send(files, (urls) => {
              fileUnder(urls, project.id);
              if (folderName) fileInFolder(urls, folder);
            });
          }
          event.target.value = "";
        }}
      />
      <div key={folder || "all"} className="anim-fade px-4 md:px-1">
        {folder === "brief" ? (
          <textarea
            aria-label="Project brief"
            value={project.brief ?? ""}
            onChange={(event) => patchProject(project.id, { brief: event.target.value })}
            rows={10}
            placeholder="What this project is for: the story, the look, who it is for, what is still to make."
            className={`${field} min-h-[220px] max-w-[720px] resize-y leading-relaxed`}
          />
        ) : folder === "settings" ? (
          <div className="flex max-w-[520px] flex-col gap-5">
            <div>
              <label htmlFor="project-name" className="mb-1.5 block text-[12px] font-medium text-t3">
                Name
              </label>
              <input id="project-name" defaultValue={project.name} onBlur={(event) => renameProject(project.id, event.target.value)} className={field} />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-t3">Cover</p>
              <div className="grid grid-cols-5 gap-1.5">
                {assets
                  .filter((a) => a.projectId === project.id && a.kind === "image" && a.source !== "pending")
                  .slice(0, 15)
                  .map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => patchProject(project.id, { coverUrl: a.url })}
                      aria-pressed={project.coverUrl === a.url}
                      className={`aspect-square overflow-hidden rounded-chip ring-inset ${project.coverUrl === a.url ? "ring-2 ring-t1" : "ring-1 ring-line"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaSrc(a.url)} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
              </div>
              <p className="mt-1.5 text-[12px] text-t4">Pick from the pictures in the project. Without one, the first picture is used.</p>
            </div>
            <button
              type="button"
              onClick={() => setDeleting(true)}
              className="self-start rounded-full px-3.5 py-2 text-[13px] text-[#ff8f8f] transition-colors hover:bg-[#ff6b6b]/10"
            >
              Delete project
            </button>
            <ConfirmPopup
              open={deleting}
              title={`Delete ${project.name}?`}
              message={`It goes to Cinema Studio's Trash for ${TRASH_DAYS} days; what was made in it stays in your studio.`}
              confirmLabel="Delete"
              onConfirm={() => {
                setDeleting(false);
                trashProject(project.id, true);
                patchStudio({ view: "projects" });
              }}
              onClose={() => setDeleting(false)}
            />
          </div>
        ) : folder === "elements" ? (
          <div>
            <p className="mb-3 text-[12.5px] text-t3">Elements called in this project&apos;s prompts.</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <button
                type="button"
                onClick={() => openEditor({})}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong text-t3 hover:text-t1"
              >
                <Icon name="plus" size={18} />
                <span className="text-[12px]">New element</span>
              </button>
              {called.map((element) => (
                <button key={element.id} type="button" onClick={() => openEditor({ id: element.id })} className="flex flex-col gap-1 text-left">
                  <span className="block aspect-square overflow-hidden rounded-card bg-surface-2 ring-1 ring-inset ring-line">
                    {element.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaSrc(element.images[0].storageUrl)} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="truncate text-[12px] text-t2">@{element.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : folder === "trash" ? (
          // The Trash draws its own head, so it reaches the page's edges as the head above does.
          <div className="-mx-4 md:-mx-1">
            <TrashView
              items={trashItems}
              tabs={TRASH_TABS}
              note={`Items can be restored to this project for ${TRASH_DAYS} days.`}
              purgeNote="It can no longer be restored to this project. What was made stays in My Generations and Assets."
            />
          </div>
        ) : myRuns.length + myUploads.length === 0 ? (
          <Empty text={folderName ? "This folder is empty. Move work here from a tile's ⋯ menu." : "Nothing in this project yet. Choose it in the composer's project chip, and what you make is saved here."} />
        ) : (
          <div className="flex flex-col gap-6">
            {myRuns.length > 0 && (
              <TileExtras.Provider value={extras}>
                <Gallery filter={show} layout="square" />
              </TileExtras.Provider>
            )}
            {myUploads.length > 0 && (
              <section>
                <p className="mb-2 text-[12.5px] font-medium text-t3">Uploads</p>
                <UploadGrid uploads={myUploads} extras={{ trash: true }} />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
