"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { RunPoller } from "@/components/RunPoller";
import { ThemeSync } from "@/components/ThemeSync";
import { RecipeDriver } from "@/components/recipes/RecipeDriver";
import {
  capabilityOf,
  compile,
  isMaker,
  problemWith,
  sourcesOf,
  type Canvas,
  type CanvasNode,
  type NodeKind,
} from "@/lib/canvas/graph";
import { modelsForStep, startRecipe } from "@/lib/recipes/engine";
import { providerOf } from "@/lib/registry";
import { mediaSrc } from "@/lib/storage/client";
import { registerRecipe } from "@/recipes";
import { useStudio } from "@/store/studio";

const KEY = "zyns-canvas";
const WIDTH = 270;
const PORT_Y = 22;
const RATIOS = ["auto", "1:1", "9:16", "16:9", "4:3", "3:4"];

const KINDS: Array<{ kind: NodeKind; label: string; icon: IconName }> = [
  { kind: "text", label: "Text", icon: "pencil" },
  { kind: "image-in", label: "Image upload", icon: "image" },
  { kind: "video-in", label: "Video upload", icon: "video" },
  { kind: "audio-in", label: "Audio upload", icon: "audio" },
  { kind: "image", label: "Image", icon: "spark" },
  { kind: "video", label: "Video", icon: "film" },
];
const TITLE: Record<NodeKind, string> = {
  text: "Text",
  "image-in": "Image upload",
  "video-in": "Video upload",
  "audio-in": "Audio upload",
  image: "Image",
  video: "Video",
};

const uid = () => Math.random().toString(36).slice(2, 8);
const fresh = (): Canvas => ({ id: uid(), name: "Untitled canvas", nodes: [], links: [] });

function load(): Canvas[] {
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Canvas[];
    return list.length ? list : [fresh()];
  } catch {
    return [fresh()];
  }
}

const field = "w-full rounded-chip bg-t1/[0.05] px-2.5 py-2 text-[13px] text-t1 outline-none ring-1 ring-inset ring-edge";

export function CanvasPage() {
  const hydrated = useStudio((s) => s.hydrated);
  const provider = useStudio((s) => s.provider);
  const recipeRuns = useStudio((s) => s.recipeRuns);
  const [canvases, setCanvases] = useState<Canvas[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [linking, setLinking] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  // The saved canvases, read once in the browser; saving is best effort.
  useEffect(() => setCanvases(load()), []);
  useEffect(() => {
    if (!canvases) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(canvases));
    } catch {
      /* private window or full: the canvas still works until the page closes */
    }
    // A run in flight carries on after a reload only if the engine can find its recipe.
    for (const c of canvases) {
      try {
        registerRecipe(compile(c).recipe);
      } catch {
        /* not runnable yet */
      }
    }
  }, [canvases]);

  const canvas = canvases?.[Math.min(current, (canvases?.length ?? 1) - 1)];
  const patch = useCallback(
    (change: (c: Canvas) => Canvas) => setCanvases((all) => all?.map((c, i) => (i === current ? change(c) : c)) ?? all),
    [current],
  );
  const patchNode = (id: string, change: Partial<CanvasNode>) =>
    patch((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === id ? { ...n, ...change } : n)) }));

  const add = (kind: NodeKind) =>
    patch((c) => ({ ...c, nodes: [...c.nodes, { id: `n${uid()}`, kind, x: 40 + (c.nodes.length % 4) * 330, y: 40 + Math.floor(c.nodes.length / 4) * 360, text: kind === "text" ? "" : undefined, urls: [] }] }));

  const link = (to: string) => {
    if (!linking || linking === to) return setLinking(null);
    patch((c) => {
      const target = c.nodes.find((n) => n.id === to);
      const exists = c.links.some((l) => l.from === linking && l.to === to);
      return target && isMaker(target) && !exists ? { ...c, links: [...c.links, { from: linking, to }] } : c;
    });
    setLinking(null);
  };

  // The newest run of this canvas, for what each node made.
  const run = useMemo(
    () => (canvas ? recipeRuns.filter((r) => r.recipeId === `canvas-${canvas.id}`).sort((a, b) => b.createdAt - a.createdAt)[0] : undefined),
    [recipeRuns, canvas],
  );

  const modelsOf = (node: CanvasNode) => {
    if (!canvas) return [];
    const step = { id: node.id, capability: capabilityOf(canvas, node), params: {} };
    return modelsForStep(step).filter((m) => providerOf(m) === provider);
  };

  function runAll() {
    if (!canvas) return;
    setMessage(null);
    try {
      const { recipe, slots } = compile(canvas);
      registerRecipe(recipe);
      const models: Record<string, string> = {};
      for (const node of canvas.nodes.filter(isMaker)) {
        const list = modelsOf(node);
        const chosen = list.find((m) => m.id === node.model) ?? list[0];
        if (!chosen) throw new Error(`No ${provider === "kie" ? "KIE" : "Higgsfield"} model can do this ${TITLE[node.kind]} node.`);
        models[node.id] = chosen.id;
      }
      startRecipe(recipe, { slots, choices: {} }, models);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start.");
    }
  }

  if (!hydrated || !canvas || !canvases) return <div className="min-h-dvh bg-canvas" />;

  const byId = new Map(canvas.nodes.map((n) => [n.id, n]));
  const pickNode = canvas.nodes.find((n) => n.id === picking);
  const problem = problemWith(canvas);

  return (
    <div className="flex h-dvh flex-col bg-canvas text-t1">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <a href="/" className="mr-1 text-[13px] text-t3 hover:text-t1">
          ← ZYNS
        </a>
        <select value={current} onChange={(e) => setCurrent(Number(e.target.value))} className="rounded-chip bg-t1/[0.05] px-2 py-1.5 text-[13px]">
          {canvases.map((c, i) => (
            <option key={c.id} value={i}>
              {c.name}
            </option>
          ))}
        </select>
        <input value={canvas.name} onChange={(e) => patch((c) => ({ ...c, name: e.target.value }))} aria-label="Canvas name" className="w-44 rounded-chip bg-t1/[0.05] px-2.5 py-1.5 text-[13px] outline-none" />
        <button type="button" onClick={() => (setCanvases([...canvases, fresh()]), setCurrent(canvases.length))} className="rounded-chip bg-t1/[0.06] px-2.5 py-1.5 text-[13px] hover:bg-t1/[0.12]">
          New
        </button>
        {canvases.length > 1 && (
          <button
            type="button"
            onClick={() => (setCanvases(canvases.filter((_, i) => i !== current)), setCurrent(0))}
            className="rounded-chip bg-t1/[0.06] px-2.5 py-1.5 text-[13px] text-t3 hover:bg-t1/[0.12]"
          >
            Delete
          </button>
        )}
        <span aria-hidden className="mx-1 h-4 w-px bg-line" />
        {KINDS.map((k) => (
          <button key={k.kind} type="button" onClick={() => add(k.kind)} className="flex items-center gap-1.5 rounded-chip bg-t1/[0.06] px-2.5 py-1.5 text-[13px] hover:bg-t1/[0.12]">
            <Icon name={k.icon} size={14} />
            {k.label}
          </button>
        ))}
        <button
          type="button"
          onClick={runAll}
          disabled={!!problem || run?.state === "running"}
          title={problem ?? undefined}
          className="cta ml-auto flex h-9 items-center gap-1.5 rounded-chip px-4 text-[13px] disabled:opacity-50"
        >
          <Icon name="play" size={14} />
          {run?.state === "running" ? "Running…" : "Run"}
        </button>
      </header>
      {(message || (problem && canvas.nodes.length > 0)) && <p className="px-4 py-1.5 text-[12.5px] text-t3">{message ?? problem}</p>}
      {linking && <p className="px-4 py-1.5 text-[12.5px] text-accent">Now click the left dot of the Image or Video node it should feed. Click the same dot again to cancel.</p>}

      <div className="relative flex-1 overflow-auto">
        <div
          className="relative"
          style={{ width: 3200, height: 2000, backgroundImage: "radial-gradient(var(--line, #2a2a2a) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const box = e.currentTarget.getBoundingClientRect();
            patchNode(drag.current.id, { x: Math.max(0, e.clientX - box.left - drag.current.dx), y: Math.max(0, e.clientY - box.top - drag.current.dy) });
          }}
          onPointerUp={() => (drag.current = null)}
        >
          <svg className="pointer-events-none absolute inset-0" width="3200" height="2000">
            {canvas.links.map((l) => {
              const a = byId.get(l.from);
              const b = byId.get(l.to);
              if (!a || !b) return null;
              const x1 = a.x + WIDTH;
              const y1 = a.y + PORT_Y;
              const x2 = b.x;
              const y2 = b.y + PORT_Y;
              return <path key={`${l.from}-${l.to}`} d={`M${x1},${y1} C${x1 + 80},${y1} ${x2 - 80},${y2} ${x2},${y2}`} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" />;
            })}
          </svg>

          {canvas.nodes.map((node) => {
            const state = run?.stepStates.find((s) => s.stepId === node.id);
            const made = state?.output?.urls[0];
            const from = sourcesOf(canvas, node);
            return (
              <div key={node.id} className="absolute rounded-card bg-[var(--popover,#161616)] ring-1 ring-inset ring-edge" style={{ left: node.x, top: node.y, width: WIDTH }}>
                <div
                  className="flex cursor-grab select-none items-center justify-between rounded-t-card px-3 py-2 active:cursor-grabbing"
                  onPointerDown={(e) => {
                    const box = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    drag.current = { id: node.id, dx: e.clientX - box.left, dy: e.clientY - box.top };
                  }}
                >
                  <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-t2">{TITLE[node.kind]}</span>
                  <button
                    type="button"
                    aria-label="Delete node"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => patch((c) => ({ ...c, nodes: c.nodes.filter((n) => n.id !== node.id), links: c.links.filter((l) => l.from !== node.id && l.to !== node.id) }))}
                    className="text-t4 hover:text-t1"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
                {isMaker(node) && (
                  <button
                    type="button"
                    aria-label="Input"
                    onClick={() => link(node.id)}
                    className={`absolute -left-2 top-4 h-4 w-4 rounded-full ring-2 ring-canvas ${linking ? "bg-accent" : "bg-t3"}`}
                  />
                )}
                <button
                  type="button"
                  aria-label="Output"
                  onClick={() => setLinking(linking === node.id ? null : node.id)}
                  className={`absolute -right-2 top-4 h-4 w-4 rounded-full ring-2 ring-canvas ${linking === node.id ? "bg-accent" : "bg-t3"}`}
                />
                <div className="flex flex-col gap-2 px-3 pb-3">
                  {node.kind === "text" && (
                    <textarea value={node.text ?? ""} onChange={(e) => patchNode(node.id, { text: e.target.value })} rows={4} placeholder="Describe what you want…" className={`${field} resize-none`} />
                  )}
                  {/-in$/.test(node.kind) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {(node.urls ?? []).map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={url} src={mediaSrc(url)} alt="" className="h-14 w-14 rounded-chip object-cover" />
                      ))}
                      <button type="button" onClick={() => setPicking(node.id)} className="grid h-14 w-14 place-items-center rounded-chip bg-t1/[0.06] text-t3 hover:text-t1" aria-label="Add media">
                        <Icon name="plus" size={18} />
                      </button>
                    </div>
                  )}
                  {isMaker(node) && (
                    <>
                      {from.length > 0 && (
                        <ul className="flex flex-col gap-0.5 text-[11.5px] text-t3">
                          {from.map((s) => (
                            <li key={s.id} className="flex items-center justify-between">
                              <span>← {TITLE[s.kind]}</span>
                              <button type="button" aria-label="Remove link" onClick={() => patch((c) => ({ ...c, links: c.links.filter((l) => !(l.from === s.id && l.to === node.id)) }))} className="text-t4 hover:text-t1">
                                <Icon name="close" size={11} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <select value={node.model ?? ""} onChange={(e) => patchNode(node.id, { model: e.target.value || undefined })} className={field}>
                        <option value="">Model: automatic</option>
                        {modelsOf(node).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <select value={node.ratio ?? "auto"} onChange={(e) => patchNode(node.id, { ratio: e.target.value })} className={field}>
                        {RATIOS.map((r) => (
                          <option key={r} value={r}>
                            Shape: {r}
                          </option>
                        ))}
                      </select>
                      {state && (
                        <p className="text-[11.5px] text-t3">
                          {state.status === "done" ? "Done" : state.status === "failed" ? `Failed: ${state.error ?? ""}` : state.status === "running" ? "Making…" : state.status}
                        </p>
                      )}
                      {made &&
                        (node.kind === "video" ? (
                          <video src={mediaSrc(made)} controls loop muted className="w-full rounded-chip" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaSrc(made)} alt="" className="w-full rounded-chip" />
                        ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <MediaPicker
        open={!!pickNode}
        accept={(pickNode?.kind.replace("-in", "") as "image" | "video" | "audio") ?? "image"}
        multiple={pickNode?.kind === "image-in"}
        onPick={(urls) => {
          if (pickNode) patchNode(pickNode.id, { urls: pickNode.kind === "image-in" ? [...(pickNode.urls ?? []), ...urls] : urls.slice(0, 1) });
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
      <RunPoller />
      <RecipeDriver />
      <ThemeSync />
    </div>
  );
}
