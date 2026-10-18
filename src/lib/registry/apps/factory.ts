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
}

const choice = (c: string | [string, string]): Choice => (Array.isArray(c) ? { value: c[0], label: c[1] } : { value: c, label: c });
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const urlOf = (v: unknown): string | undefined => (Array.isArray(v) ? v[0] : (v as string | undefined)) || undefined;

function fieldsOf(def: AppDef, video: boolean): Field[] {
  const slots: Field[] = def.slots.map((label, i) => {
    const optional = label.startsWith("?");
    return {
      key: `slot${i}`,
      label: cap(optional ? label.slice(1) : label),
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 1,
      minItems: optional ? 0 : 1,
      required: !optional,
      ownSlot: true,
      tag: optional ? "Optional" : undefined,
    };
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
    placeholder: "Optional: anything else to say about the result",
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
  return `${text} ${v.prompt ?? ""}`.trim();
}

function validateOf(def: AppDef) {
  return (v: Values): string | null => {
    for (const [i, label] of def.slots.entries()) {
      if (!label.startsWith("?") && !urlOf(v[`slot${i}`])) return `Add the ${label.toLowerCase()}.`;
    }
    return null;
  };
}

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
    fields: fieldsOf(def, false),
    validate: validateOf(def),
    build: (v) => ({
      ...JOB,
      payload: {
        model: "nano-banana-pro",
        input: compact({
          prompt: promptOf(def, v),
          image_input: def.slots.map((_, i) => urlOf(v[`slot${i}`])).filter(Boolean),
          aspect_ratio: "auto",
          resolution: String(v.resolution ?? "2K"),
          output_format: "png",
        }),
      },
    }),
  };
}

/** A picture-to-video app, run on Seedance 2.0 (see `mode` for how the slots are sent). */
export function videoApp(def: AppDef): ModelDef {
  return {
    ...common,
    id: `app-${def.id}`,
    name: def.name,
    output: "video",
    tagline: def.tagline,
    tags: ["app", def.group.toLowerCase(), def.name.toLowerCase()],
    badge: def.group.toUpperCase(),
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
          reference_image_urls: def.mode === "refs" ? def.slots.map((_, i) => urlOf(v[`slot${i}`])).filter(Boolean) : undefined,
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
