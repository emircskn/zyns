"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/Icon";
import { Popover } from "@/components/Popover";
import { useNewFolder } from "@/lib/newProject";
import { FOLDER_COLORS, folderAndInside, useStudio, type Project, type ProjectFolder } from "@/store/studio";

/** A folder's mark: its folder icon in its own colour. */
export function FolderMark({ color, size = "h-6 w-6" }: { color?: string; size?: string }) {
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-[8px] ${color ? "" : "bg-t1/[0.07]"}`}
      style={color ? { backgroundColor: `${color}26`, color } : undefined}
    >
      <Icon name="folder" size={13} />
    </span>
  );
}

/** The folders in reading order (none from the Trash): each one followed by the ones inside it. */
export function folderRows(all: ProjectFolder[], byName = false): Array<{ folder: ProjectFolder; depth: number }> {
  // What is in the Trash is left out, and so is what is inside it.
  const folders = all.filter((f) => !f.trashedAt);
  const ids = new Set(folders.map((f) => f.id));
  const order = (list: ProjectFolder[]) => (byName ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list);
  const out: Array<{ folder: ProjectFolder; depth: number }> = [];
  const walk = (parent: string | undefined, depth: number) => {
    for (const folder of order(folders.filter((f) => (f.parentId && ids.has(f.parentId) ? f.parentId : undefined) === parent))) {
      out.push({ folder, depth });
      walk(folder.id, depth + 1);
    }
  };
  walk(undefined, 0);
  return out;
}

type Page = "main" | "color" | "move";

function MenuRow({
  icon,
  label,
  onClick,
  danger,
  more,
  dot,
  on,
  open,
  onHover,
  rowRef,
}: {
  icon?: IconName;
  label: string;
  onClick: () => void;
  danger?: boolean;
  more?: boolean;
  dot?: string;
  on?: boolean;
  /** Its side panel is out. */
  open?: boolean;
  onHover?: () => void;
  rowRef?: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={rowRef}
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      className={`flex w-full items-center gap-2.5 rounded-chip px-2.5 py-2 text-left text-[13.5px] transition-colors duration-[120ms] ${
        danger
          ? "text-[#ff8f8f] hover:bg-[#ff6b6b]/10"
          : on
            ? "bg-t1/[0.08] text-t1"
            : open
              ? "bg-t1/[0.06] text-t1"
              : "text-t2 hover:bg-t1/[0.06] hover:text-t1"
      }`}
    >
      {dot ? <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: dot }} /> : icon && <Icon name={icon} size={15} />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {more && <Icon name="chevron" size={13} className="-rotate-90 text-t4" />}
      {on && !more && <Icon name="check" size={13} className="text-t1" />}
    </button>
  );
}

/** Whether this screen has a pointer that hovers; a phone's finger does not. */
function canHover() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * A menu row's own panel beside the menu, as a desktop menu opens one on
 * hover. Drawn over everything, marked so the menu does not read a press
 * in it as a press outside.
 */
function SidePanel({ anchor, children, onEnter, onLeave }: { anchor: HTMLElement; children: ReactNode; onEnter: () => void; onLeave: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  useLayoutEffect(() => {
    const row = anchor.getBoundingClientRect();
    // The menu's own edge, so the panel sits beside the whole menu and not over it.
    const menu = (anchor.closest(".surface-pop") as HTMLElement | null)?.getBoundingClientRect() ?? row;
    const width = panel.current?.offsetWidth ?? 200;
    const height = panel.current?.offsetHeight ?? 0;
    const room = window.innerWidth - menu.right;
    const left = room >= width + 12 ? menu.right + 6 : Math.max(8, menu.left - width - 6);
    const view = window.visualViewport?.height ?? window.innerHeight;
    const top = Math.max(8, Math.min(row.top - 6, view - height - 8));
    setPlace({ left, top, maxHeight: view - 16 });
  }, [anchor]);
  return createPortal(
    <div
      ref={panel}
      data-popover-keep=""
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="surface-pop anim-rise no-bar fixed z-[95] w-[200px] overflow-y-auto rounded-panel p-1.5"
      style={place ? { left: place.left, top: place.top, maxHeight: place.maxHeight } : { left: -9999, top: 0 }}
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * What can be done to a folder: edit it, change its colour, add a folder
 * inside it, move it under another one, or delete it. With a mouse the
 * colours and the places to move to open beside the menu on hover; on a
 * phone they open in the menu itself, with a way back.
 */
export function FolderMenu({ project, folder, close }: { project: Project; folder: ProjectFolder; close: () => void }) {
  const [page, setPage] = useState<Page>("main");
  const [side, setSide] = useState<Exclude<Page, "main"> | null>(null);
  const rows = useRef<Record<string, HTMLButtonElement | null>>({});
  const leaving = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patchProject = useStudio((s) => s.patchProject);
  const ask = useNewFolder((s) => s.ask);
  const trashFolder = useStudio((s) => s.trashFolder);
  const folders = project.folders ?? [];
  const patch = (change: Partial<ProjectFolder>) =>
    patchProject(project.id, { folders: folders.map((f) => (f.id === folder.id ? { ...f, ...change } : f)) });

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
    leaving.current = setTimeout(() => setSide(null), 180);
  };
  const hover = (which: Exclude<Page, "main"> | null) => () => {
    if (!canHover()) return;
    stay();
    setSide(which);
  };
  const choose = (which: Exclude<Page, "main">) => () => (canHover() ? setSide((now) => (now === which ? null : which)) : setPage(which));

  const list = (which: Exclude<Page, "main">) => {
    if (which === "color")
      return FOLDER_COLORS.map((c) => (
        <MenuRow key={c.hex} dot={c.hex} label={c.name} on={(folder.color ?? "") === c.hex} onClick={() => (patch({ color: c.hex }), close())} />
      ));
    const inside = folderAndInside(folders, folder.id);
    return [
      <MenuRow key="top" icon="spark" label="All assets" on={!folder.parentId} onClick={() => (patch({ parentId: undefined }), close())} />,
      ...folderRows(folders)
        .filter(({ folder: f }) => !inside.has(f.id))
        .map(({ folder: f, depth }) => (
          <span key={f.id} className="block" style={{ paddingLeft: depth * 12 }}>
            <MenuRow dot={f.color ?? "var(--t3)"} label={f.name} on={folder.parentId === f.id} onClick={() => (patch({ parentId: f.id }), close())} />
          </span>
        )),
    ];
  };

  if (page !== "main") {
    return (
      <div className="flex flex-col">
        <button type="button" onClick={() => setPage("main")} className="mb-1 flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-t3 hover:text-t1">
          <Icon name="chevron" size={13} className="rotate-90" />
          {page === "color" ? "Color" : "Move to"}
        </button>
        {list(page)}
      </div>
    );
  }
  return (
    <div className="flex flex-col" onMouseLeave={side ? leave : undefined}>
      <MenuRow icon="pencil" label="Edit" onHover={hover(null)} onClick={() => (ask(project.id, { editId: folder.id }), close())} />
      <MenuRow
        icon="palette"
        label="Color"
        more
        open={side === "color"}
        rowRef={(node) => (rows.current.color = node)}
        onHover={hover("color")}
        onClick={choose("color")}
      />
      <MenuRow icon="folder-plus" label="Add folder" onHover={hover(null)} onClick={() => (ask(project.id, { parentId: folder.id }), close())} />
      <MenuRow
        icon="transfer"
        label="Move to"
        more
        open={side === "move"}
        rowRef={(node) => (rows.current.move = node)}
        onHover={hover("move")}
        onClick={choose("move")}
      />
      <span className="my-1 h-px bg-line" />
      {/* To the Trash, with what is in it: it can be brought back from there. */}
      <MenuRow icon="trash" label="Delete" danger onHover={hover(null)} onClick={() => (close(), trashFolder(project.id, folder.id))} />
      {side && rows.current[side] && (
        <SidePanel key={side} anchor={rows.current[side]!} onEnter={stay} onLeave={leave}>
          {list(side)}
        </SidePanel>
      )}
    </div>
  );
}

/**
 * The project menu's folders, under All assets: each with its colour and
 * count, and on hover a + (a folder inside it) and ⋯ (its menu).
 */
export function FolderTree({
  project,
  at,
  onOpen,
  count,
  q,
  byName,
}: {
  project: Project;
  at: string;
  onOpen: (id: string) => void;
  count: (id: string) => number;
  q: string;
  byName: boolean;
}) {
  const ask = useNewFolder((s) => s.ask);
  const folders = project.folders ?? [];
  const needle = q.trim().toLowerCase();
  // A search lists what matches, flat; otherwise the folders nest.
  const rows = needle
    ? folderRows(folders, byName).filter(({ folder }) => folder.name.toLowerCase().includes(needle)).map(({ folder }) => ({ folder, depth: 0 }))
    : folderRows(folders, byName);
  // Shown on hover, while its menu is open, and always where there is no hover.
  const hoverOnly =
    "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-has-[[aria-expanded=true]]:opacity-100 pointer-coarse:opacity-100";

  return (
    <>
      {rows.map(({ folder, depth }) => {
        const on = at === folder.id;
        return (
          <div key={folder.id} data-pill={folder.id} className="group relative shrink-0" style={{ marginLeft: depth * 14 }}>
            <button
              type="button"
              onClick={() => onOpen(folder.id)}
              aria-current={on || undefined}
              className={`relative flex h-9 w-full items-center gap-2.5 rounded-[12px] py-1.5 pl-1.5 pr-3 text-left text-[14px] font-medium transition-colors duration-[200ms] ${
                on ? "text-t1" : "text-t2 hover:bg-t1/[0.05] hover:text-t1"
              }`}
            >
              <FolderMark color={folder.color} />
              <span className="min-w-0 flex-1 truncate pr-12">{folder.name}</span>
              <span className="absolute right-3 font-mono text-[11.5px] text-t4 transition-opacity duration-[120ms] group-focus-within:opacity-0 group-hover:opacity-0 group-has-[[aria-expanded=true]]:opacity-0 pointer-coarse:opacity-0">
                {count(folder.id)}
              </span>
            </button>
            <span className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
              <button
                type="button"
                aria-label={`Add a folder in ${folder.name}`}
                onClick={() => ask(project.id, { parentId: folder.id })}
                className={`grid h-7 w-7 place-items-center rounded-full text-t3 transition-[opacity,color,background-color] duration-[120ms] hover:bg-t1/[0.08] hover:text-t1 ${hoverOnly}`}
              >
                <Icon name="plus" size={14} />
              </button>
              <Popover
                width={220}
                align="start"
                title={folder.name}
                trigger={(open) => (
                  <span
                    aria-label={`${folder.name} menu`}
                    className={`grid h-7 w-7 place-items-center rounded-full transition-[opacity,color,background-color] duration-[120ms] hover:bg-t1/[0.08] hover:text-t1 ${
                      open ? "bg-t1/[0.08] text-t1 opacity-100" : `text-t3 ${hoverOnly}`
                    }`}
                  >
                    <Icon name="more" size={15} />
                  </span>
                )}
              >
                {(close) => <FolderMenu project={project} folder={folder} close={close} />}
              </Popover>
            </span>
          </div>
        );
      })}
      {needle && rows.length === 0 && <p className="px-2 py-1.5 text-[12.5px] text-t4">No folder by that name</p>}
    </>
  );
}
