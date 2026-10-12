import type { AutoMode, Field, ModelDef, Values } from "./types";

const TEXT_MODE = /^(generate|text to (video|image))$/i;
// In order of preference: a model with both Edit and Image to image (Qwen)
// folds the one that edits and keeps the other as its own tab. Remix and
// Reference fold only on a still: for a video, a reference is not the frame
// it starts on, and that difference is worth its own tab.
const IMAGE_MODES: Array<{ label: RegExp; stills?: boolean }> = [
  { label: /^edit$/i },
  { label: /^image to video$/i },
  { label: /^image to image$/i },
  { label: /^frames to video$/i },
  { label: /^first frame$/i },
  { label: /^remix$/i, stills: true },
  { label: /^reference$/i, stills: true },
];

function takesPicture(field: Field): boolean {
  return (
    field.placement === "input" &&
    (field.kind === "images" || field.kind === "media") &&
    (field.accept ?? "image") === "image" &&
    !/mask/i.test(field.key)
  );
}

function shownIn(field: Field, values: Values, mode: string): boolean {
  return !field.when || field.when({ ...values, __mode: mode });
}

/**
 * The picture slot of the image mode that the text mode lacks, when that
 * slot is all the image mode asks for on top: an Edit that also needs a
 * mask painted is not "the same request with a picture", and folding it
 * would leave a run that cannot be sent the moment a picture went in.
 */
function slotFor(model: ModelDef, text: string, image: string): Field | undefined {
  // By key, not by field: a key both modes take (the prompt) can be two
  // fields, one per mode, and is not something the picture side adds.
  const textKeys = new Set(model.fields.filter((f) => shownIn(f, {}, text)).map((f) => f.key));
  const extra = model.fields.filter((f) => shownIn(f, {}, image) && !textKeys.has(f.key));
  const slot = extra.find(takesPicture);
  if (!slot) return undefined;
  return extra.some((f) => f.required && f.key !== slot.key) ? undefined : slot;
}

/**
 * Folds the pair into one tab where a model has it: the picture slot shows in
 * both modes, and the image mode leaves the strip. Everything else, fields,
 * build and validation, still reads the real mode, which `settleMode` keeps
 * in step with the slot.
 */
/** Which inputs a three-way tab shows: references (the default) or frames. */
export function inputsOf(values: Values): "refs" | "frames" {
  return values.__inputs === "frames" ? "frames" : "refs";
}

const isMedia = (f: Field) => f.placement === "input" && (f.kind === "images" || f.kind === "media");

/**
 * A video model's Reference mode, when it can join the folded tab: what it
 * adds over the text mode is media and nothing else it insists on.
 */
function refsFor(model: ModelDef, text: string, image: string): AutoMode["refs"] {
  if (model.output !== "video") return undefined;
  const ref = (model.modes ?? []).find((m) => m.id !== text && m.id !== image && /^reference$/i.test(m.label) && !m.action);
  if (!ref) return undefined;
  const keysIn = (mode: string) => new Set(model.fields.filter((f) => shownIn(f, {}, mode)).map((f) => f.key));
  const textKeys = keysIn(text);
  const frames = [...keysIn(image)].filter((k) => !textKeys.has(k));
  const extra = model.fields.filter((f) => shownIn(f, {}, ref.id) && !textKeys.has(f.key) && !frames.includes(f.key));
  const media = extra.filter(isMedia);
  if (media.length === 0 || extra.some((f) => f.required && !isMedia(f))) return undefined;
  return { mode: ref.id, fields: [...new Set(media.map((f) => f.key))], frames };
}

export function withAutoMode(model: ModelDef): ModelDef {
  if (model.autoMode) return model;
  const modes = model.modes ?? [];
  const text = modes.find((m) => TEXT_MODE.test(m.label));
  if (!text) return model;
  let image: (typeof modes)[number] | undefined;
  let slot: Field | undefined;
  for (const pattern of IMAGE_MODES) {
    if (pattern.stills && model.output !== "image") continue;
    image = modes.find((m) => m.id !== text.id && pattern.label.test(m.label));
    slot = image && slotFor(model, text.id, image.id);
    if (slot) break;
  }
  if (!image || !slot) return model;

  const refs = refsFor(model, text.id, image.id);
  const auto: AutoMode = { text: text.id, image: image.id, field: slot.key, ...(refs ? { refs } : {}) };
  const pair = new Set([text.id, image.id, ...(refs ? [refs.mode] : [])]);
  const imageId = image.id;
  // The pair's copy of the slot is optional (an empty slot is the text
  // mode, not a gap); any other mode that shows the same field (Veo's
  // Reference) keeps its own, required as it was.
  const elsewhere = modes.some((m) => !pair.has(m.id) && shownIn(slot!, {}, m.id));
  const fields = model.fields.flatMap((f) => {
    if (refs) return threeWay(f);
    if (f !== slot) return [f];
    const when = f.when;
    const folded: Field = {
      ...f,
      required: false,
      when: (v: Values) => pair.has(v.__mode) && (!when || when({ ...v, __mode: imageId })),
    };
    if (!elsewhere) return [folded];
    return [folded, { ...f, when: (v: Values) => !pair.has(v.__mode) && (!when || when(v)) }];
  });
  // Three ways: the frames and the references each show only on their side
  // of the switch, every one optional (empty is the text mode); a field the
  // text mode has too, or one outside the tab, is left as it was.
  function threeWay(f: Field): Field[] {
    const own = (mode: string) => shownIn(f, {}, mode);
    const group = refs!.fields.includes(f.key) && own(refs!.mode) ? "refs" : refs!.frames.includes(f.key) && own(imageId) ? "frames" : null;
    if (!group || own(text!.id)) return [f];
    const from = group === "refs" ? refs!.mode : imageId;
    const when = f.when;
    // Frames are two slots side by side, start and end, as Higgsfield lays them.
    const frame = group === "frames" ? { ownSlot: true, label: f.key === slot!.key ? "Start frame" : /last|end/i.test(f.key) ? "End frame" : f.label, ...(f.key !== slot!.key ? { tag: "Optional" } : {}) } : {};
    const folded: Field = {
      ...f,
      ...frame,
      required: false,
      when: (v: Values) => pair.has(v.__mode) && inputsOf(v) === group && (!when || when({ ...v, __mode: from })),
    };
    const outside = modes.some((m) => !pair.has(m.id) && own(m.id));
    return outside ? [folded, { ...f, when: (v: Values) => !pair.has(v.__mode) && (!when || when(v)) }] : [folded];
  }
  // Sending reads the slot too, so a run never goes out in the mode its
  // picture contradicts, whatever a stale saved mode says.
  const settled = (v: Values): Values => {
    if (!pair.has(v.__mode)) return v;
    const mode = modeFor(auto, v);
    return mode === v.__mode ? v : { ...v, __mode: mode };
  };
  return {
    ...model,
    fields,
    autoMode: auto,
    // The image mode stays listed, so a run made in it is still named by
    // it, but leaves the strip.
    modes: modes.map((m) => (m.id === imageId || m.id === refs?.mode ? { ...m, hidden: true } : m)),
    defaultMode: pair.has(model.defaultMode ?? "") ? text.id : model.defaultMode,
    build: (v) => model.build(settled(v)),
    validate: model.validate ? (v) => model.validate!(settled(v)) : undefined,
    creditHint: model.creditHint ? (v) => model.creditHint!(settled(v)) : undefined,
  };
}

/** The mode a folded tab sends in for these values: what is filled on the side shown. */
export function modeFor(auto: AutoMode, values: Values): string {
  if (auto.pick) return auto.pick(values);
  if (auto.refs) {
    if (inputsOf(values) === "refs") return auto.refs.fields.some((k) => hasPicture(values[k])) ? auto.refs.mode : auto.text;
    return auto.refs.frames.some((k) => hasPicture(values[k])) ? auto.image : auto.text;
  }
  return hasPicture(values[auto.field]) ? auto.image : auto.text;
}

export function hasPicture(value: unknown): boolean {
  return Array.isArray(value) ? value.some((v) => !!v) : !!value;
}

/** The tab the strip lights for these values: the pair's one tab for either of its modes. */
export function tabOf(model: ModelDef, values: Values): string {
  const mode = String(values.__mode ?? model.defaultMode ?? model.modes?.[0]?.id ?? "");
  return inFold(model.autoMode, mode) ? model.autoMode!.text : mode;
}

/** Whether a mode is one of those a folded tab stands for. */
export function inFold(auto: AutoMode | undefined, mode: unknown): boolean {
  if (!auto) return false;
  if (auto.members) return auto.members.includes(String(mode));
  return mode === auto.text || mode === auto.image || mode === auto.refs?.mode;
}

/**
 * A fold made by hand, for a model whose frames and references go out in
 * the same field (Veo 3.1's image_urls; Kling 3.0 Omni's, split again by
 * what goes with it). The tab shows slots of its own (Start frame, End
 * frame; images, a video) and, on the way out, puts what is in them where
 * the chosen mode wants it.
 */
export interface FoldSpec {
  text: string;
  /** The array that takes [start, end], and the mode for one frame or two. */
  frames: { key: string; one: string; two: string };
  /** The arrays references go in. */
  images: { key: string; max: number };
  video?: { key: string; max: number };
  /** Reference modes by what they carry. */
  refs: Array<{ mode: string; images: boolean; video: boolean }>;
}

const START = "__start";
const END = "__end";
const REF_IMAGES = "__ref_images";
const REF_VIDEO = "__ref_video";

export function withFold(model: ModelDef, spec: FoldSpec): ModelDef {
  const members = [spec.text, spec.frames.one, spec.frames.two, ...spec.refs.map((r) => r.mode)];
  const inTab = (v: Values) => members.includes(String(v.__mode));
  const filled = (v: Values, key: string) => hasPicture(v[key]);

  const pick = (v: Values): string => {
    if (inputsOf(v) === "frames") {
      if (!filled(v, START)) return spec.text;
      return filled(v, END) ? spec.frames.two : spec.frames.one;
    }
    const images = filled(v, REF_IMAGES);
    const video = spec.video ? filled(v, REF_VIDEO) : false;
    if (!images && !video) return spec.text;
    return (spec.refs.find((r) => r.images === images && r.video === video) ?? spec.refs.find((r) => (video ? r.video : r.images)))?.mode ?? spec.text;
  };

  // What the hand-made slots hold, moved to where the chosen mode reads it.
  const compose = (v: Values): Values => {
    if (!inTab(v)) return v;
    const mode = pick(v);
    const out: Values = { ...v, __mode: mode };
    for (const key of [START, END, REF_IMAGES, REF_VIDEO]) delete out[key];
    if (mode === spec.frames.one || mode === spec.frames.two) {
      out[spec.frames.key] = [v[START], ...(mode === spec.frames.two ? [v[END]] : [])].filter(Boolean);
    } else if (mode !== spec.text) {
      const ref = spec.refs.find((r) => r.mode === mode);
      if (ref?.images) out[spec.images.key] = (v[REF_IMAGES] as string[] | undefined) ?? [];
      if (ref?.video && spec.video) out[spec.video.key] = (v[REF_VIDEO] as string[] | undefined) ?? [];
    }
    return out;
  };

  const side = (group: "refs" | "frames") => (v: Values) => inTab(v) && inputsOf(v) === group;
  const own: Field[] = [
    { key: START, label: "Start frame", kind: "media", placement: "input", accept: "image", ownSlot: true, when: side("frames") },
    { key: END, label: "End frame", kind: "media", placement: "input", accept: "image", ownSlot: true, tag: "Optional", when: side("frames") },
    { key: REF_IMAGES, label: spec.video ? "Images" : "Reference images", kind: "images", placement: "input", accept: "image", maxItems: spec.images.max, when: side("refs") },
    ...(spec.video
      ? [{ key: REF_VIDEO, label: "Video", kind: "images", placement: "input", accept: "video", maxItems: spec.video.max, when: side("refs") } as Field]
      : []),
  ];
  // The service's own fields leave the tab; the hand-made slots stand in for them.
  const taken = new Set([spec.frames.key, spec.images.key, ...(spec.video ? [spec.video.key] : [])]);
  const fields = [
    ...own,
    ...model.fields.map((f) => {
      if (!taken.has(f.key) || f.placement !== "input") return f;
      const when = f.when;
      return { ...f, when: (v: Values) => !inTab(v) && (!when || when(v)) };
    }),
  ];
  const auto: AutoMode = {
    text: spec.text,
    image: spec.frames.one,
    field: START,
    refs: { mode: spec.refs[0].mode, fields: [REF_IMAGES, ...(spec.video ? [REF_VIDEO] : [])], frames: [START, END] },
    members,
    pick,
  };
  return {
    ...model,
    fields,
    autoMode: auto,
    modes: (model.modes ?? []).map((m) => (m.id !== spec.text && members.includes(m.id) ? { ...m, hidden: true } : m)),
    defaultMode: members.includes(model.defaultMode ?? "") ? spec.text : model.defaultMode,
    build: (v) => model.build(compose(v)),
    validate: model.validate ? (v) => model.validate!(compose(v)) : undefined,
    creditHint: model.creditHint ? (v) => model.creditHint!(compose(v)) : undefined,
  };
}
