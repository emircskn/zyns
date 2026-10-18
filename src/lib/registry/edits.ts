/**
 * Picture edits Higgsfield's web app has and its API does not (Relight,
 * Outpaint), made here as Tools on Nano Banana Pro's edit mode: the one
 * picture goes in, a fixed instruction about the one thing to change goes
 * with it, and the rest of the picture is told to stay as it is.
 */
import type { Choice, Field, ModelDef, Values } from "./types";

const RATIOS = ["1:1", "4:5", "3:4", "2:3", "9:16", "16:9", "3:2", "4:3", "5:4", "21:9"];
const choices = (list: Array<[string, string]>): Choice[] => list.map(([value, label]) => ({ value, label }));

const LIGHTS = choices([
  ["soft natural daylight from a window", "Daylight"],
  ["warm golden hour sunlight low on the horizon", "Golden hour"],
  ["a large studio softbox, clean and even", "Studio softbox"],
  ["dramatic side light with deep shadows", "Dramatic"],
  ["a bright rim light from behind that outlines the subject", "Rim light"],
  ["cool moonlight at night", "Moonlight"],
  ["colourful neon glow in magenta and cyan", "Neon"],
  ["warm candlelight, soft and flickering", "Candlelight"],
]);

const imageField: Field = {
  key: "image",
  label: "Picture",
  kind: "images",
  placement: "input",
  accept: "image",
  maxItems: 1,
  minItems: 1,
  required: true,
};
const notesField: Field = {
  key: "prompt",
  label: "Details",
  kind: "textarea",
  placement: "prompt",
  placeholder: "Optional: anything else to say about the result",
};

/** The base model's edit request for one picture, so the edit rides on Nano Banana Pro's own build. */
function viaBase(base: ModelDef, text: string, picture: string, ratio: string, resolution: string) {
  return base.build({ __mode: "edit", prompt: text, image_input: [picture], aspect_ratio: ratio, resolution, output_format: "png" } as Values);
}

const one = (v: Values): string | undefined => (Array.isArray(v.image) ? v.image[0] : v.image);

export function editToolModels(base: ModelDef | undefined): ModelDef[] {
  if (!base) return [];
  const common = { vendor: "ZYNS", category: "tool" as const, output: "image" as const, provider: "kie" as const, app: "apps" as const, runsOn: () => "Nano Banana Pro" };
  const resolution: Field = {
    key: "resolution",
    label: "Resolution",
    kind: "select",
    placement: "bar",
    default: "2K",
    choices: choices([["1K", "1K"], ["2K", "2K"], ["4K", "4K"]]),
  };

  const relight: ModelDef = {
    ...common,
    id: "edit-relight",
    name: "Relight",
    tagline: "Change the light on a picture and keep everything else.",
    tags: ["relight", "lighting", "edit"],
    badge: "STYLE",
    fields: [
      imageField,
      { key: "light", label: "Light", kind: "select", placement: "bar", default: LIGHTS[0].value, choices: LIGHTS },
      resolution,
      notesField,
    ],
    build: (v) => {
      const text = `Relight this picture with ${v.light}. Keep the subject, the composition, the colours of every object and all details exactly as they are; only the lighting and its shadows and reflections change. ${v.prompt ?? ""}`.trim();
      return viaBase(base, text, one(v) ?? "", "auto", String(v.resolution ?? "2K"));
    },
    validate: (v) => (one(v) ? null : "Add the picture to relight."),
  };

  const outpaint: ModelDef = {
    ...common,
    id: "edit-outpaint",
    name: "Outpaint",
    tagline: "Extend a picture to a new shape, continuing the scene past its edges.",
    tags: ["outpaint", "extend", "expand", "reframe", "aspect ratio", "edit"],
    badge: "CAMERA",
    fields: [
      imageField,
      { key: "aspect_ratio", label: "New shape", kind: "ratio", placement: "bar", default: "16:9", choices: choices(RATIOS.map((r) => [r, r])) },
      resolution,
      { ...notesField, placeholder: "Optional: what should appear in the new space" },
    ],
    build: (v) => {
      const text = `Extend this picture to a new aspect ratio by outpainting: continue the scene naturally past all of its edges with matching perspective, light, texture and style. The original picture stays exactly as it is, unchanged and unmoved. ${v.prompt ?? ""}`.trim();
      return viaBase(base, text, one(v) ?? "", String(v.aspect_ratio ?? "16:9"), String(v.resolution ?? "2K"));
    },
    validate: (v) => (one(v) ? null : "Add the picture to extend."),
  };

  return [relight, outpaint];
}
