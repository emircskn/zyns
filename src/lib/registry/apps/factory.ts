/**
 * One-click "apps" (Higgsfield's Apps, Effects and templates) made on KIE
 * models: a few picture slots, a few options and a fixed instruction written
 * in our own words. A catalogue row becomes a Tool, so it gets the studio's
 * form, price estimate and history without a page of its own.
 */
import type { Choice, Field, ModelDef, Values } from "../types";
import { compact } from "../types";

export interface AppOption {
  key: string;
  label: string;
  /** [text put into the instruction, label shown]. A bare string is both. */
  choices: Array<string | [string, string]>;
}

export interface AppDef {
  id: string;
  name: string;
  /** Shown beside the name and used as the maker's group ("Face", "Ads"…). */
  group: string;
  tagline: string;
  /** Picture slots in order; a leading "?" marks an optional one. */
  slots: string[];
  options?: AppOption[];
  /** The instruction; `{key}` is replaced by the option of that key. */
  prompt: string;
  /** Video apps only: seconds, 5 when left out. */
  seconds?: number;
  /** Video apps only: the first slot as the first frame ("first", the usual), the first two as first and last ("frames"), or every slot as a reference ("refs"). */
  mode?: "first" | "frames" | "refs";
  /** Video-to-video apps: which Kie model carries the request (see videoEditApp). */
  engine?: "wan-replace" | "wan-edit" | "kling-motion" | "kling-reference";
  /** Image apps: the first picture is painted over to say where the change goes. */
  draw?: boolean;
}

/** A slot spec: "?" first marks it optional, then "video:" or "audio:" says what it takes (a picture otherwise). */
function slotOf(spec: string): { label: string; optional: boolean; accept: "image" | "video" | "audio" } {
  const optional = spec.startsWith("?");
  const rest = optional ? spec.slice(1) : spec;
  const kind = /^(video|audio):/.exec(rest)?.[1] as "video" | "audio" | undefined;
  return { label: kind ? rest.slice(kind.length + 1) : rest, optional, accept: kind ?? "image" };
}

const choice = (c: string | [string, string]): Choice => (Array.isArray(c) ? { value: c[0], label: c[1] } : { value: c, label: c });
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const urlOf = (v: unknown): string | undefined => (Array.isArray(v) ? v[0] : (v as string | undefined)) || undefined;

function fieldsOf(def: AppDef, video: boolean): Field[] {
  const slots: Field[] = def.slots.map((spec, i) => {
    const { label, optional, accept } = slotOf(spec);
    const base = { key: `slot${i}`, label: cap(label), placement: "input" as const, accept, required: !optional, ownSlot: true, tag: optional ? "Optional" : undefined };
    return accept === "image"
      ? { ...base, kind: "images" as const, maxItems: 1, minItems: optional ? 0 : 1 }
      : { ...base, kind: "media" as const };
  });
  const options: Field[] = (def.options ?? []).map((o) => ({
    key: o.key,
    label: o.label,
    kind: "select",
    placement: "bar",
    default: choice(o.choices[0]).value,
    choices: o.choices.map(choice),
  }));
  const note: Field = {
    key: "prompt",
    label: "Details",
    kind: "textarea",
    placement: "prompt",
    placeholder: def.draw ? "What should the painted area become?" : "Optional: anything else to say about the result",
  };
  const size: Field[] = video
    ? [
        { key: "engine", label: "Quality", kind: "segmented", placement: "bar", default: "bytedance/seedance-2", choices: [{ value: "bytedance/seedance-2", label: "Best" }, { value: "bytedance/seedance-2-fast", label: "Fast", hint: "Cheaper, up to 720p" }] },
        { key: "resolution", label: "Resolution", kind: "select", placement: "bar", default: "720p", choices: ["480p", "720p", "1080p"].map((r) => ({ value: r, label: r })) },
        { key: "aspect_ratio", label: "Shape", kind: "ratio", placement: "bar", default: "adaptive", choices: ["adaptive", "9:16", "16:9", "1:1", "3:4", "4:3", "21:9"].map((r) => ({ value: r, label: r === "adaptive" ? "Auto" : r })) },
      ]
    : [
        { key: "resolution", label: "Resolution", kind: "select", placement: "bar", default: "2K", choices: ["1K", "2K", "4K"].map((r) => ({ value: r, label: r })) },
      ];
  return [...slots, ...options, ...size, note];
}

function promptOf(def: AppDef, v: Values): string {
  let text = def.prompt;
  for (const o of def.options ?? []) text = text.replaceAll(`{${o.key}}`, String(v[o.key] ?? choice(o.choices[0]).value));
  return text.includes("{note}") ? text.replace("{note}", String(v.prompt ?? "").trim()) : `${text} ${v.prompt ?? ""}`.trim();
}

function validateOf(def: AppDef) {
  return (v: Values): string | null => {
    for (const [i, spec] of def.slots.entries()) {
      const { label, optional } = slotOf(spec);
      if (!optional && !urlOf(v[`slot${i}`])) return `Add the ${label.toLowerCase()}.`;
    }
    if (def.draw && !String(v.prompt ?? "").trim()) return "Describe what should change in the painted area.";
    return null;
  };
}

/** The picture slots' links, in order. */
const pictures = (def: AppDef, v: Values) => def.slots.flatMap((spec, i) => (slotOf(spec).accept === "image" ? [urlOf(v[`slot${i}`])] : [])).filter(Boolean) as string[];
const video = (def: AppDef, v: Values) => def.slots.flatMap((spec, i) => (slotOf(spec).accept === "video" ? [urlOf(v[`slot${i}`])] : []))[0];

const JOB = { endpoint: "/api/v1/jobs/createTask", poll: "jobs" as const };
const common = { vendor: "ZYNS", category: "tool" as const, provider: "kie" as const };

/** A picture-to-picture app, run on Nano Banana Pro's edit mode. */
export function imageApp(def: AppDef): ModelDef {
  return {
    ...common,
    id: `app-${def.id}`,
    name: def.name,
    output: "image",
    tagline: def.tagline,
    tags: ["app", def.group.toLowerCase(), def.name.toLowerCase()],
    badge: def.group.toUpperCase(),
    app: "apps",
    draw: def.draw,
    runsOn: () => "Nano Banana Pro",
    fields: fieldsOf(def, false),
    validate: validateOf(def),
    build: (v) => ({
      ...JOB,
      payload: {
        model: "nano-banana-pro",
        input: compact({
          prompt: promptOf(def, v),
          image_input: [...pictures(def, v), ...(def.draw && v.mask ? [v.mask] : [])],
          aspect_ratio: String(v.aspect_ratio ?? "auto"),
          resolution: String(v.resolution ?? "2K"),
          output_format: "png",
        }),
      },
    }),
  };
}

/** A picture-to-video app, run on Seedance 2.0 (see `mode` for how the slots are sent). */
export function videoApp(def: AppDef, app: "apps" | "effects" = "apps"): ModelDef {
  return {
    ...common,
    id: `app-${def.id}`,
    name: def.name,
    output: "video",
    tagline: def.tagline,
    tags: ["app", def.group.toLowerCase(), def.name.toLowerCase()],
    badge: def.group.toUpperCase(),
    app,
    runsOn: (v) => (v.engine === "bytedance/seedance-2-fast" ? "Seedance 2.0 Fast" : "Seedance 2.0"),
    fields: fieldsOf(def, true),
    validate: validateOf(def),
    build: (v) => {
      const fast = v.engine === "bytedance/seedance-2-fast";
      return {
      ...JOB,
      payload: {
        model: fast ? "bytedance/seedance-2-fast" : "bytedance/seedance-2",
        input: compact({
          prompt: promptOf(def, v),
          first_frame_url: def.mode === "refs" ? undefined : urlOf(v.slot0),
          last_frame_url: def.mode === "frames" ? urlOf(v.slot1) : undefined,
          reference_image_urls: def.mode === "refs" ? pictures(def, v) : undefined,
          generate_audio: true,
          resolution: fast && v.resolution === "1080p" ? "720p" : String(v.resolution ?? "720p"),
          aspect_ratio: String(v.aspect_ratio ?? "adaptive"),
          duration: def.seconds ?? 5,
        }),
      },
      };
    },
  };
}

/**
 * A video-in, video-out app. The first video slot is the clip to change; the
 * first picture slot (when there is one) is the person, object or product
 * that goes into it.
 */
export function videoEditApp(def: AppDef): ModelDef {
  const resolutions = def.engine === "wan-replace" ? ["480p", "580p", "720p"] : def.engine === "kling-reference" ? ["720p", "1080p"] : ["720p", "1080p"];
  const fields = fieldsOf(def, true).filter((f) => !["engine", "aspect_ratio", "resolution"].includes(f.key));
  const extra: Field[] = [
    { key: "resolution", label: "Resolution", kind: "select", placement: "bar", default: "720p", choices: resolutions.map((r) => ({ value: r, label: r })) },
    ...(def.engine === "kling-reference"
      ? [{ key: "seconds", label: "Seconds", kind: "select" as const, placement: "bar" as const, default: "8", choices: ["5", "8", "10", "15"].map((r) => ({ value: r, label: `${r}s` })) }]
      : []),
  ];
  return {
    ...common,
    id: `app-${def.id}`,
    name: def.name,
    output: "video",
    tagline: def.tagline,
    tags: ["app", def.group.toLowerCase(), def.name.toLowerCase()],
    badge: def.group.toUpperCase(),
    app: "apps",
    runsOn: () => ({ "wan-replace": "Wan 2.2 Animate", "wan-edit": "Wan 2.7 VideoEdit", "kling-motion": "Kling 3.0 Motion Control", "kling-reference": "Kling 3.0 Omni" })[def.engine ?? "wan-edit"],
    fields: [...fields.slice(0, -1), ...extra, fields[fields.length - 1]],
    validate: validateOf(def),
    build: (v) => {
      const clip = video(def, v);
      const picture = pictures(def, v)[0];
      const resolution = String(v.resolution ?? "720p");
      const text = promptOf(def, v);
      const input =
        def.engine === "wan-replace"
          ? { video_url: clip, image_url: picture, resolution }
          : def.engine === "kling-motion"
            ? { input_urls: [picture], video_urls: [clip], mode: resolution === "1080p" ? "1080p" : "720p", character_orientation: "video", prompt: text }
            : def.engine === "kling-reference"
              ? { prompt: text, video_urls: [clip], image_urls: pictures(def, v), resolution, duration: Number(v.seconds ?? 8), aspect_ratio: "9:16", audio: true }
              : { prompt: text, video_url: clip, reference_image: picture, resolution, audio_setting: "auto" };
      const model = { "wan-replace": "wan/2-2-animate-replace", "kling-motion": "kling-3.0/motion-control", "kling-reference": "kling-3.0-omni/reference-to-video", "wan-edit": "wan/2-7-videoedit" }[def.engine ?? "wan-edit"];
      return { ...JOB, payload: { model, input: compact(input) } };
    },
  };
}
