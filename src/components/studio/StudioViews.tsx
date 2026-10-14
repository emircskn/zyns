"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { GlideMark } from "@/components/GlideMark";
import { ConfirmPopup } from "@/components/ConfirmPopup";
import { DensitySlider, PhoneGridToggle, SelectToggle } from "@/components/DensityControl";
import { TileExtras, type TileExtrasValue } from "@/components/Gallery";
import { Icon, type IconName } from "@/components/Icon";
import { AppIcon, PlaceIcon } from "@/components/AppIcon";
import { SideCollapsed, useSideCollapsed } from "@/components/studio/sideCollapse";
import { ofApp, useStudioNav } from "@/components/studio/studioNav";
import { SortMenu, sortBy, type SortKey } from "@/components/studio/SortMenu";
import { Popover } from "@/components/Popover";
import { inFlight, pendingAsset, runAssets, uploadAsset, useAssets, type Asset } from "@/lib/assets";
import { AssetBrowser } from "@/components/AssetBrowser";
import { calledElements } from "@/lib/elements";
import { getModel } from "@/lib/registry";
import { thumbSrc, videoFrame } from "@/lib/storage/client";
import { studioReference } from "@/lib/studio/reuse";
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
        <img src={thumbSrc(cover, 256)} alt="" className="h-full w-full object-cover" />
      ) : (
        <AppIcon glyph="folder" tone="amber" size={24} className="h-full w-full" />
      )}
    </span>
  );
}

export function NavRow({
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
  const folded = useSideCollapsed();
  return (
    <button
      type="button"
      onClick={onClick}
      data-pill={pill}
      aria-current={on || undefined}
      aria-label={folded ? label : undefined}
      title={folded ? label : undefined}
      className={`relative flex h-9 items-center gap-2.5 rounded-[12px] py-1.5 text-left text-[14px] font-medium transition-colors duration-[200ms] ${folded ? "mx-auto w-9 shrink-0 justify-center px-0" : "w-full pl-1.5 pr-3"} ${
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
      {!folded && <span className="min-w-0 flex-1 truncate whitespace-nowrap">{label}</span>}
      {!folded && trailing}
    </button>
  );
}

/** Folds the side menu down to its icons, and opens it out again. */
export function FoldButton() {
  const folded = useSideCollapsed();
  const patchStudio = useStudio((s) => s.patchStudio);
  const label = folded ? "Expand menu" : "Collapse menu";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => patchStudio((st) => ({ sideCollapsed: !st.sideCollapsed }))}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.1] hover:text-t1 ${folded ? "mx-auto" : ""}`}
    >
      <Icon name="sidebar" size={17} />
    </button>
  );
}

/**
 * The head of the side menu, as Higgsfield's: Cinema Studio's own mark and
 * name, opening a menu back out to the rest of ZYNS (the page has no top
 * bar of its own while it fills the screen).
 */
function StudioSwitcher({ glyph, title }: { glyph: "film" | "box"; title: string }) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-[10px] bg-t1/[0.05] pl-1.5 pr-2">
      <AppIcon glyph={glyph} tone="lime" size={24} />
      <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[14.5px] font-semibold text-t1">{title}</span>
    </div>
  );
}

/** A heading in the side menu; a thin rule once it is folded to its icons. */
export function SideHeading({ label, children }: { label: string; children?: ReactNode }) {
  const folded = useSideCollapsed();
  if (folded) return <div aria-hidden className="mx-auto mb-1 mt-3 h-px w-6 shrink-0 bg-line" />;
  return (
    <div className="mt-4 flex items-center justify-between px-2 pb-1">
      <span className="text-[12px] font-medium text-t3">{label}</span>
      <span className="flex gap-0.5">{children}</span>
    </div>
  );
}

export const STUDIO_NAV: Array<{ id: StudioView; label: string; icon: IconName; place?: string }> = [
  { id: "home", label: "Home", icon: "home" },
  { id: "generations", label: "My generations", icon: "grid" },
  { id: "elements", label: "My elements", icon: "at" },
  { id: "favorites", label: "My favorites", icon: "heart" },
];

/** Cinema Studio's own menu down the left: its pages, then its projects. */
export function StudioSidebar({
  items = STUDIO_NAV.map((n) => ({ id: n.id, label: n.label, place: n.id })),
  glyph = "film",
  extra,
}: {
  /** The studio's own pages at the top (Marketing Studio has its own). */
  items?: Array<{ id: string; label: string; place: string }>;
  glyph?: "film" | "box";
  /** Anything after the pages, before the projects (Marketing Studio's tools). */
  extra?: ReactNode;
} = {}) {
  const nav = useStudioNav();
  const studio = nav.ui;
  const patchStudio = nav.patch;
  const allProjects = useStudio((s) => s.projects).filter(ofApp(nav));
  const projects = liveProjects(allProjects);
  const trashedProjects = allProjects.length - projects.length;
  const askNewProject = useNewProject((s) => s.ask);
  const [q, setQ] = useState("");
  const [looking, setLooking] = useState(false);
  const [sort, setSort] = useState<SortKey>("last");
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  // A project last changed when the newest thing was made or uploaded into it.
  const changed = (p: Project) =>
    Math.max(p.createdAt, ...runs.filter((r) => r.projectId === p.id).map((r) => r.createdAt), ...uploads.filter((u) => u.projectId === p.id).map((u) => u.createdAt ?? 0));
  const order = sortBy<Project>(sort, (p) => ({ name: p.name, created: p.createdAt, changed: changed(p) }));
  const shown = projects
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || order(a, b))
    .slice(0, 8);

  const menu = useRef<HTMLDivElement>(null);
  const folded = useSideCollapsed();
  if (studio.view === "project" && studio.projectId) return <ProjectSidebar />;

  return (
    <div ref={menu} className="relative flex h-full flex-col gap-1 p-2">
      <GlideMark value={studio.view} className="rounded-[12px] bg-t1/[0.1]" deps={[folded]} />
      <div className={`flex gap-1.5 pb-1 ${folded ? "justify-center" : "items-start"}`}>
        {!folded && (
          <div className="min-w-0 flex-1">
            <StudioSwitcher glyph={glyph} title={nav.name} />
          </div>
        )}
        <FoldButton />
      </div>
      {items.map((item) => (
        <NavRow key={item.id} pill={item.id} icon={<PlaceIcon place={item.place} />} label={item.label} on={studio.view === item.id} onClick={() => patchStudio({ view: item.id })} />
      ))}
      {extra}
      <SideHeading label="Projects">
        <button type="button" aria-label="Search projects" onClick={() => setLooking((l) => !l)} className="grid h-6 w-6 place-items-center rounded-full text-t3 hover:text-t1">
          <Icon name="search" size={13} />
        </button>
        <SortMenu value={sort} onChange={setSort} label="Sort projects" />
      </SideHeading>
      {looking && !folded && (
        <input
          autoFocus
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search projects"
          className="mx-1 mb-1 h-8 rounded-full bg-t1/[0.06] px-3 text-[13px] text-t1 outline-none placeholder:text-t4"
        />
      )}
      <NavRow
        icon={<PlaceIcon place="newProject" />}
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
            <span className={`absolute right-1 top-1/2 -translate-y-1/2 ${folded ? "hidden" : ""}`}>
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
        icon={<PlaceIcon place="trash" />}
        label="Trash"
        on={studio.view === "trash"}
        onClick={() => patchStudio({ view: "trash" })}
        trailing={trashedProjects ? <span className="font-mono text-[11.5px] text-t4">{trashedProjects}</span> : undefined}
      />
      <NavRow pill="projects" icon={<PlaceIcon place="projects" />} label="All projects" on={studio.view === "projects"} onClick={() => patchStudio({ view: "projects" })} trailing={<Icon name="chevron" size={14} className="-rotate-90 text-t3" />} />
    </div>
  );
}

/** Inside a project: back, its name and menu, its brief, settings, elements, folders and Trash. */
export function ProjectSidebar() {
  const nav = useStudioNav();
  const studio = nav.ui;
  const patchStudio = nav.patch;
  const project = useStudio((s) => s.projects.find((p) => p.id === studio.projectId && !p.trashedAt));
  const patchProject = useStudio((s) => s.patchProject);
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  const askFolder = useNewFolder((s) => s.ask);
  const [q, setQ] = useState("");
  const [looking, setLooking] = useState(false);
  const [sort, setSort] = useState<SortKey>("first");
  const menu = useRef<HTMLDivElement>(null);
  const folded = useSideCollapsed();
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
      <GlideMark value={at || "all"} className="rounded-[12px] bg-t1/[0.1]" deps={[(project.folders ?? []).map((f) => `${f.id}:${f.parentId ?? ""}`).join(), looking, q, sort, folded]} />
      {folded && <FoldButton />}
      <div className="flex items-center gap-1">
      <NavRow
        icon={<PlaceIcon place="back" />}
        label="Back"
        onClick={() => {
          // Leaving the project: what is made next is no longer saved to it.
          useStudio.getState().setActiveProject(null);
          patchStudio({ view: "home" });
        }}
      />
      {!folded && <FoldButton />}
      </div>
      {folded ? (
        <div className="flex justify-center pb-1 pt-1" title={project.name}>
          <CoverThumb project={project} size="h-8 w-8 rounded-[10px]" />
        </div>
      ) : (
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
      )}
      <NavRow pill="brief" icon={<PlaceIcon place="brief" />} label="Project brief" on={at === "brief"} onClick={() => go("brief")} />
      <NavRow pill="settings" icon={<PlaceIcon place="settings" />} label="Settings" on={at === "settings"} onClick={() => go("settings")} />
      <NavRow pill="elements" icon={<PlaceIcon place="elements" />} label="Elements" on={at === "elements"} onClick={() => go("elements")} />
      <SideHeading label="Folders">
        <button type="button" aria-label="Search folders" onClick={() => setLooking((l) => !l)} className={`grid h-6 w-6 place-items-center rounded-full hover:text-t1 ${looking ? "text-t1" : "text-t3"}`}>
          <Icon name="search" size={13} />
        </button>
        <SortMenu value={sort} onChange={setSort} label="Sort folders" />
      </SideHeading>
      {looking && !folded && (
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
        icon={<PlaceIcon place="all" />}
        label="All assets"
        on={at === ""}
        onClick={() => go("")}
        trailing={<span className="font-mono text-[11.5px] text-t4">{all}</span>}
      />
      {/* The folders hang under All assets, as its parts. */}
      <div className={`no-bar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto ${folded ? "" : "pl-3"}`}>
        <FolderTree project={project} at={at} onOpen={go} count={inFolder} q={folded ? "" : q} sort={sort} />
        <NavRow
          icon={<PlaceIcon place="add" />}
          label="Add folder"
          onClick={() => askFolder(project.id)}
        />
      </div>
      <NavRow pill="trash" icon={<PlaceIcon place="trash" />} label="Trash" on={at === "trash"} onClick={() => go("trash")} trailing={trashed ? <span className="font-mono text-[11.5px] text-t4">{trashed}</span> : undefined} />
    </div>
  );
}

/**
 * A slim strip over a page's wall, as Assets has it: no title or count, only
 * what the page can do — `left` at the left edge (a phone's Select), the
 * rest at the right.
 */
export function ViewHead({ left, children }: { left?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-2 md:min-h-[56px] md:px-1 md:py-2.5">
      <div className="flex min-w-0 items-center gap-2">{left}</div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
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
      {/* The popover scrolls the list itself: a second scroller in here caught the swipe halfway. */}
      <div className="flex flex-col">
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


/**
 * Runs and uploads as one wall, as Assets lays it out: what is still being
 * made (or failed with nothing to show) as its loader, the rest as media,
 * newest first.
 */
function wallOf(runs: Run[], uploads: Upload[] = []): Asset[] {
  return [
    ...runs.filter((run) => !run.trashedAt).flatMap((run) =>
      inFlight(run) || (run.state === "failed" && run.urls.length === 0) ? [pendingAsset(run)] : runAssets(run),
    ),
    ...uploads.filter((u) => !u.trashedAt).map(uploadAsset),
  ].sort((a, b) => b.createdAt - a.createdAt);
}

/** Everything made in Cinema Studio, with Filter and View. */
export function GenerationsView({ favoritesOnly }: { favoritesOnly?: boolean }) {
  const nav = useStudioNav();
  const studioOnly = nav.owns;
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  const favorites = useStudio((s) => s.favorites);
  const downloaded = useStudio((s) => s.downloaded);
  const [filter, setFilter] = useState<GenFilter>(favoritesOnly ? { ...NO_FILTER, activity: "liked" } : NO_FILTER);
  const mine = runs.filter((r) => !r.trashedAt && studioOnly(r));
  const models = [...new Map(mine.map((r) => [r.modelId, { id: r.modelId, name: getModel(r.modelId)?.name ?? r.modelName }])).values()];
  const show = useMemo(() => (run: Run) => studioOnly(run) && matches(run, filter, favorites, downloaded), [studioOnly, filter, favorites, downloaded]);
  const count = mine.filter(show).length;
  // Deleting here moves to Cinema Studio's Trash, to restore for a while, never straight out.
  const extras: TileExtrasValue = useMemo(
    () => ({ onReference: studioReference, trash: true }),
    [],
  );
  const uploadsShown = filter.activity === "uploaded";
  const shownUploads = uploads.filter((u) => !u.trashedAt && (filter.type === "all" || u.kind === filter.type));

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <ViewHead
        left={
          <span className="md:hidden">
            <SelectToggle />
          </span>
        }
      >
        {/* Filter, then the layout: a phone's two, a desktop's tile size. */}
        <FilterMenu filter={filter} onChange={setFilter} models={models} />
        <span className="md:hidden">
          <PhoneGridToggle />
        </span>
        <DensitySlider />
      </ViewHead>
      <div className="md:px-1">
        {/* The same wall as Assets: Select, the layouts, the days, and the enlarged view stepping through them. */}
        {uploadsShown ? (
          shownUploads.length > 0 ? (
            <TileExtras.Provider value={extras}>
              <AssetBrowser assets={wallOf([], shownUploads)} />
            </TileExtras.Provider>
          ) : (
            <Empty text="No uploads yet." />
          )
        ) : count === 0 ? (
          <Empty text={favoritesOnly ? "Nothing liked yet. Tap the heart on a shot to keep it here." : `Nothing here yet. What you make in ${nav.name} shows up here.`} />
        ) : (
          <TileExtras.Provider value={extras}>
            <AssetBrowser assets={wallOf(runs.filter(show))} />
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
    return <img src={thumbSrc(url, 512)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />;
  if (url && mediaKind(url) === "video")
    return <video src={videoFrame(url)} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover opacity-80" />;
  return <Icon name="audio" size={24} className="text-t3" />;
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-16 text-center text-[13px] text-t3">{text}</p>;
}

/** Every project, as cards: a new one first. */
export function ProjectsView() {
  const projects = liveProjects(useStudio((s) => s.projects).filter(ofApp(useStudioNav())));
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <ProjectGrid className="grid-cols-2 px-4 pt-2 md:grid-cols-3 md:px-1 md:pt-4" />
    </div>
  );
}

/** Every project as a card, a new one first; `className` sets its columns. */
export function ProjectGrid({ className }: { className: string }) {
  const projects = liveProjects(useStudio((s) => s.projects).filter(ofApp(useStudioNav())));
  const askNewProject = useNewProject((s) => s.ask);
  const patchStudio = useStudioNav().patch;
  return (
    <div className={`grid gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => askNewProject((project) => patchStudio({ view: "project", projectId: project.id, folderId: "" }))}
        className="flex flex-col gap-2 text-left"
      >
        <span className="grid aspect-[16/10] w-full place-items-center rounded-card bg-t1/[0.05] transition-colors duration-[120ms] hover:bg-t1/[0.1]">
          <PlaceIcon place="newProject" size={48} />
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
          <img src={thumbSrc(cover, 768)} alt="" className="h-full w-full object-cover transition-transform duration-[300ms] group-hover:scale-[1.02]" />
        ) : (
          <span className="grid h-full w-full place-items-center">
            <PlaceIcon place="projects" size={44} className="opacity-80" />
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
      <span className="absolute right-2 top-2 rounded-full bg-black/45 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100 pointer-coarse:opacity-100">
        <ProjectMenuButton project={project} align="end" className="!text-white" />
      </span>
      {project.pinned && (
        <span className="pointer-events-none absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/45 text-white">
          <Icon name="pin" size={12} />
        </span>
      )}
    </div>
  );
}

/** Cinema Studio's own Trash: the projects deleted, kept a while. */
export function StudioTrash() {
  const nav = useStudioNav();
  const studioOnly = nav.owns;
  const projects = useStudio((s) => s.projects).filter(ofApp(nav));
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  const trashProject = useStudio((s) => s.trashProject);
  const removeProject = useStudio((s) => s.removeProject);
  const setTrashed = useStudio((s) => s.setTrashed);
  const removeRun = useStudio((s) => s.removeRun);
  const removeUpload = useStudio((s) => s.removeUpload);
  const items: TrashItem[] = [
    ...projects
      .filter((p) => p.trashedAt)
      .map((p) => ({
        key: p.id,
        kind: "project" as const,
        name: p.name,
        trashedAt: p.trashedAt!,
        preview: <ProjectTrashCover project={p} />,
        restore: () => trashProject(p.id, false),
        purge: () => removeProject(p.id),
      })),
    // What was deleted outside any project: a project's own Trash holds the rest.
    ...runs
      .filter((r) => r.trashedAt && !r.projectId && studioOnly(r))
      .map((r) => ({
        key: r.id,
        kind: "generation" as const,
        name: r.prompt || r.modelName,
        trashedAt: r.trashedAt!,
        preview: <TrashMedia url={r.urls[0]} />,
        restore: () => setTrashed(r.urls, false),
        purge: () => removeRun(r.id),
      })),
    ...uploads
      .filter((u) => u.trashedAt && !u.projectId)
      .map((u) => ({
        key: u.id,
        kind: "upload" as const,
        name: u.name || "Upload",
        trashedAt: u.trashedAt!,
        preview: <TrashMedia url={u.url} />,
        restore: () => setTrashed([u.url], false),
        purge: () => removeUpload(u.id),
      })),
  ];
  return (
    <TrashView
      items={items}
      tabs={[
        { id: "generation", label: "Generations" },
        { id: "upload", label: "Uploads" },
        { id: "project", label: "Projects" },
      ]}
      note={`Everything here can be restored for ${TRASH_DAYS} days, then it goes for good.`}
      purgeNote="It can no longer be restored."
    />
  );
}

function ProjectTrashCover({ project }: { project: Project }) {
  const cover = useCover(project);
  return cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={thumbSrc(cover, 512)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
  ) : (
    <FolderGlyph />
  );
}

/** A project open: its assets (all, or a folder's), its brief, settings, elements or Trash. */
export function ProjectView() {
  const askFolder = useNewFolder((s) => s.ask);
  const nav = useStudioNav();
  const studio = nav.ui;
  const project = useStudio((s) => s.projects.find((p) => p.id === studio.projectId && !p.trashedAt));
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  const elements = useStudio((s) => s.elements);
  const patchStudio = nav.patch;
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
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] ${folder === id ? "bg-t1/[0.1] text-t1 ring-1 ring-inset ring-line-strong" : "bg-t1/[0.07] text-t2"}`}
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
      {/* Only a folder has anything to put up here: its menu and Upload. */}
      {isAssets && (
      <ViewHead>
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
                      <img src={thumbSrc(a.url, 256)} alt="" className="h-full w-full object-cover" />
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
              message={`It goes to ${nav.name}'s Trash for ${TRASH_DAYS} days; what was made in it stays in your studio.`}
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
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-card bg-t1/[0.06] ring-1 ring-inset ring-edge text-t3 hover:text-t1"
              >
                <Icon name="plus" size={18} />
                <span className="text-[12px]">New element</span>
              </button>
              {called.map((element) => (
                <button key={element.id} type="button" onClick={() => openEditor({ id: element.id })} className="flex flex-col gap-1 text-left">
                  <span className="block aspect-square overflow-hidden rounded-card bg-surface-2 ring-1 ring-inset ring-edge">
                    {element.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbSrc(element.images[0].storageUrl, 384)} alt="" className="h-full w-full object-cover" />
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
          <TileExtras.Provider value={extras}>
            <AssetBrowser assets={wallOf(myRuns, myUploads)} />
          </TileExtras.Provider>
        )}
      </div>
    </div>
  );
}
