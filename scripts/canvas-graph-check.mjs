// Self-check for src/lib/canvas/graph.ts: node scripts/canvas-graph-check.mjs
import assert from "node:assert/strict";
const { compile, problemWith } = await import("../src/lib/canvas/graph.ts");

const n = (id, kind, extra = {}) => ({ id, kind, x: 0, y: 0, ...extra });
const canvas = {
  id: "c1",
  name: "t",
  nodes: [n("t1", "text", { text: "a cat" }), n("p1", "image-in", { urls: ["u.png"] }), n("i1", "image"), n("v1", "video", { ratio: "9:16" })],
  links: [
    { from: "t1", to: "i1" },
    { from: "p1", to: "i1" },
    { from: "i1", to: "v1" },
    { from: "t1", to: "v1" },
  ],
};
const { recipe, slots } = compile(canvas);
assert.deepEqual(recipe.steps.map((s) => s.id), ["i1", "v1"], "image comes before the video it feeds");
assert.equal(recipe.steps[0].capability, "image-edit-multi");
assert.equal(recipe.steps[1].capability, "image-to-video");
assert.deepEqual(recipe.steps[1].params.images, ["{{steps.i1.output.url}}"]);
assert.equal(recipe.steps[1].params.aspect_ratio, "9:16");
assert.deepEqual(slots.p1, ["u.png"]);

assert.match(problemWith({ ...canvas, nodes: canvas.nodes.filter((x) => x.id !== "t1"), links: [] }) ?? "", /Add|needs/);
assert.match(problemWith({ ...canvas, links: [...canvas.links, { from: "v1", to: "i1" }] }) ?? "", /circle/);
assert.match(problemWith({ ...canvas, nodes: [n("v", "video")], links: [] }) ?? "", /picture/);
console.log("canvas graph ok");
