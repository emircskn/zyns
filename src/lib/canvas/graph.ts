/**
 * Canvas graphs: nodes joined by links, compiled into a recipe the recipe
 * engine already knows how to run. Text and upload nodes become the recipe's
 * slots; Image and Video nodes become its steps, in an order where every
 * node comes after the nodes that feed it.
 */
import type { Capability } from "@/lib/registry/capabilities";
import type { Recipe, Slot, Step } from "@/lib/recipes/types";

export type NodeKind = "text" | "image-in" | "video-in" | "audio-in" | "image" | "video";

export interface CanvasNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** Text node: the words. */
  text?: string;
  /** Upload nodes: what was added. */
  urls?: string[];
  /** Image and Video nodes: the model, and the shape ("auto" leaves it to the model). */
  model?: string;
  ratio?: string;
}

export interface CanvasLink {
  from: string;
  to: string;
}

export interface Canvas {
  id: string;
  name: string;
  nodes: CanvasNode[];
  links: CanvasLink[];
}

export const isMaker = (node: CanvasNode) => node.kind === "image" || node.kind === "video";

/** The nodes feeding `node`, in the order they were linked. */
export const sourcesOf = (canvas: Canvas, node: CanvasNode): CanvasNode[] =>
  canvas.links.filter((l) => l.to === node.id).flatMap((l) => canvas.nodes.find((n) => n.id === l.from) ?? []);

/** Makers in an order where each follows its makers; throws on a loop. */
function order(canvas: Canvas): CanvasNode[] {
  const makers = canvas.nodes.filter(isMaker);
  const done = new Set<string>();
  const out: CanvasNode[] = [];
  while (out.length < makers.length) {
    const next = makers.find((m) => !done.has(m.id) && sourcesOf(canvas, m).filter(isMaker).every((s) => done.has(s.id)));
    if (!next) throw new Error("The links go around in a circle.");
    done.add(next.id);
    out.push(next);
  }
  return out;
}

/** What a maker does, by what feeds it. */
export function capabilityOf(canvas: Canvas, node: CanvasNode): Capability {
  const from = sourcesOf(canvas, node);
  const has = (kind: NodeKind) => from.some((s) => s.kind === kind || (kind === "image-in" && s.kind === "image"));
  if (node.kind === "image") return has("image-in") ? "image-edit-multi" : "text-to-image";
  return from.some((s) => s.kind === "audio-in") ? "lipsync-from-audio" : "image-to-video";
}

/** A message for what is missing before the canvas can run, or null. */
export function problemWith(canvas: Canvas): string | null {
  const makers = canvas.nodes.filter(isMaker);
  if (makers.length === 0) return "Add an Image or Video node first.";
  try {
    order(canvas);
  } catch (error) {
    return (error as Error).message;
  }
  for (const maker of makers) {
    const from = sourcesOf(canvas, maker);
    const name = maker.kind === "image" ? "Image" : "Video";
    if (maker.kind === "image" && !from.some((s) => s.kind === "text")) return `${name} node needs a Text node linked to it.`;
    if (maker.kind === "video" && !from.some((s) => s.kind === "image-in" || s.kind === "image")) return `${name} node needs a picture linked to it.`;
    for (const s of from) {
      if (s.kind === "text" && !s.text?.trim()) return "A Text node linked to a maker is empty.";
      if (/-in$/.test(s.kind) && !s.urls?.length) return "An upload node linked to a maker has nothing in it.";
    }
  }
  return null;
}

/** The recipe a canvas runs as, with the inputs it was filled with. */
export function compile(canvas: Canvas): { recipe: Recipe; slots: Record<string, unknown> } {
  const bad = problemWith(canvas);
  if (bad) throw new Error(bad);
  const slots: Slot[] = [];
  const values: Record<string, unknown> = {};
  for (const node of canvas.nodes) {
    if (node.kind === "text") {
      slots.push({ key: node.id, type: "text", label: "Text", required: false });
      values[node.id] = node.text ?? "";
    } else if (/-in$/.test(node.kind)) {
      const type = node.kind.replace("-in", "") as "image" | "video" | "audio";
      slots.push({ key: node.id, type, label: type, required: false } as Slot);
      values[node.id] = type === "image" ? node.urls ?? [] : node.urls?.[0];
    }
  }
  const steps: Step[] = order(canvas).map((maker) => {
    const from = sourcesOf(canvas, maker);
    const ref = (n: CanvasNode) => (isMaker(n) ? `{{steps.${n.id}.output.url}}` : `{{slots.${n.id}}}`);
    const params: Step["params"] = {
      prompt: from.filter((s) => s.kind === "text").map(ref).join(" "),
      images: from.filter((s) => s.kind === "image-in" || s.kind === "image").map(ref),
    };
    const audio = from.find((s) => s.kind === "audio-in");
    if (audio) params.audio = ref(audio);
    if (maker.ratio && maker.ratio !== "auto") params.aspect_ratio = maker.ratio;
    return { id: maker.id, label: maker.kind === "image" ? "Image" : "Video", capability: capabilityOf(canvas, maker), params };
  });
  return {
    recipe: { id: `canvas-${canvas.id}`, name: canvas.name, category: "effect", description: "A canvas", output: "video", slots, choices: [], steps },
    slots: values,
  };
}
