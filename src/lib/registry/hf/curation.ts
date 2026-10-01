/**
 * The product lines the studio offers, and how each one's documented
 * endpoints fold into modes and tiers. Every endpoint ID here must exist in
 * generated/catalog.json — the adapter throws at startup otherwise, so a
 * stale ID never ships silently.
 *
 * Rules kept throughout:
 *  - A separately published model is its own family.
 *  - `modes` are input styles (text, a first frame, references, an edit).
 *  - `tiers` are the same workflow at another quality, where Higgsfield
 *    publishes each quality as its own endpoint.
 *
 * Soul ID training, trained-character references and Marketing Studio
 * presets need their own flows and are left out for now.
 */
import type { Family, ModeSpec } from "./auto";
import type { Values } from "../types";

const m = (id: string, label: string, model: string, extra: Partial<ModeSpec> = {}): ModeSpec => ({
  id,
  label,
  model,
  ...extra,
});

/** Tiered modes: `model` is the first tier's endpoint. */
const tiered = (id: string, label: string, tiers: Record<string, string>, extra: Partial<ModeSpec> = {}) =>
  m(id, label, Object.values(tiers)[0], { tiers, ...extra });

/** Trained Soul ID characters need a training flow the studio doesn't have yet. */
const SOUL_ID = ["custom_reference_id", "custom_reference_strength"];

/** Kling's custom shots only mean something with multi-shot on. */
const SHOT_FIELDS: Family["fields"] = {
  multi_prompt: { when: (v) => v.multi_shots === true },
};

/** Text, a first frame, or a set of references: the common video trio. */
const trio = (base: string, extra: { t2v?: Partial<ModeSpec>; i2v?: Partial<ModeSpec>; ref?: Partial<ModeSpec> } = {}) => [
  m("text-to-video", "Text to video", `${base}/text-to-video`, extra.t2v),
  m("image-to-video", "Image to video", `${base}/image-to-video`, { hint: "Animate a first frame", ...extra.i2v }),
  m("reference-to-video", "Reference", `${base}/reference-to-video`, {
    hint: "Images, videos or audio as references",
    ...extra.ref,
  }),
];

/**
 * Wan 3.0 references can also be a document or a public web page, given
 * by link (the picker holds pictures, clips and sound, not documents).
 * One or the other: sent together, the document wins without a word.
 */
const WAN_THREE_FIELDS: Family["fields"] = {
  image_urls: { label: "Reference images" },
  video_urls: { label: "Reference videos" },
  file_url: { kind: "text", accept: undefined, label: "Document link", placeholder: "https://…/brief.pdf" },
  link_url: { kind: "text", placement: "input", label: "Web page", placeholder: "https://…" },
};
function wanThreeSource(v: Values): string | null {
  return v.file_url && v.link_url ? "Use a document or a web page, not both." : null;
}

/** Marketing Studio: text to image, or edit up to 16 images. */
const marketingModes = (model: string): ModeSpec[] => [
  m("generate", "Generate", model, { hide: ["image_urls", "preset_id", "enhance_prompt"] }),
  m("edit", "Edit", model, {
    hint: "Up to 16 product or model images",
    hide: ["preset_id", "enhance_prompt"],
    require: ["image_urls"],
  }),
];

const recraft = (id: string, name: string, model: string, tagline: string): Family => ({
  id,
  name,
  vendor: "Recraft",
  category: "image",
  output: "image",
  tagline,
  modes: [m("generate", "Generate", model)],
  fields: {
    colors: {
      placeholder: '[{ "rgb": [232, 93, 4] }, { "rgb": [20, 20, 20] }]',
      help: "Palette to lean on, as RGB triples.",
    },
    background_color: { placeholder: '{ "rgb": [245, 240, 230] }', help: "Background as an RGB triple." },
  },
});

const MOTION_CONTROL_FIELDS: Family["fields"] = {
  character_orientation: {
    kind: "segmented",
    placement: "bar",
    choices: [
      { value: "video", label: "Follow video" },
      { value: "image", label: "Follow image" },
    ],
  },
};

const STD_PRO = {
  label: "Quality",
  choices: [
    { value: "std", label: "Standard" },
    { value: "pro", label: "Pro" },
  ],
};

export const FAMILIES: Family[] = [
  /* ============================================================== *
   * IMAGE
   * ============================================================== */
  {
    id: "soul-2",
    featured: true,
    prompts: [
      "Editorial portrait in soft daylight, linen shirt, film grain",
      "Street style on a wet Tokyo crossing at night, flash photography",
    ],
    name: "Soul 2.0",
    vendor: "Higgsfield",
    category: "image",
    output: "image",
    badge: "NEW",
    tagline: "Higgsfield's fashion and editorial photo model, one or four at a time.",
    modes: [
      m("generate", "Generate", "higgsfield-ai/soul/v2/standard", { hide: [...SOUL_ID, "style_id", "style_strength"] }),
      m("edit", "Edit", "higgsfield-ai/soul/v2/image-to-image", {
        hint: "Restyle a photo",
        hide: [...SOUL_ID, "style_id", "style_strength"],
      }),
    ],
  },
  {
    id: "soul-cinema",
    featured: true,
    prompts: [
      "A detective under a sodium streetlight, rain, anamorphic flare",
      "Wide shot of a lone rider crossing salt flats at dusk",
    ],
    name: "Soul Cinema",
    vendor: "Higgsfield",
    category: "image",
    output: "image",
    tagline: "Stills that look lifted from a film: cinematic light, lenses and grade.",
    modes: [m("generate", "Generate", "higgsfield-ai/soul/cinema", { hide: SOUL_ID })],
  },
  {
    id: "soul",
    name: "Soul",
    vendor: "Higgsfield",
    category: "image",
    output: "image",
    tagline: "The original Soul: realistic people and places.",
    modes: [m("generate", "Generate", "higgsfield-ai/soul/standard", { hide: [...SOUL_ID, "style_id", "style_strength"] })],
  },
  {
    id: "marketing-studio-flare",
    name: "Marketing Studio 2.5 Flare",
    vendor: "Higgsfield",
    category: "image",
    output: "image",
    badge: "4K",
    tagline: "Campaign and product images, generated or edited from up to 16 references.",
    modes: marketingModes("marketing-studio/image/flare"),
  },
  {
    id: "marketing-studio-sunburst",
    name: "Marketing Studio 2.5 Sunburst",
    vendor: "Higgsfield",
    category: "image",
    output: "image",
    badge: "4K",
    tagline: "The Sunburst take on Marketing Studio: bright, commercial product imagery.",
    modes: marketingModes("marketing-studio/image/sunburst"),
  },
  {
    id: "marketing-studio-2",
    name: "Marketing Studio 2.0",
    vendor: "Higgsfield",
    category: "image",
    output: "image",
    tagline: "The first Marketing Studio image model, for ads, posters and listings.",
    modes: marketingModes("marketing-studio/image"),
  },
  {
    id: "grok-image-2",
    featured: true,
    prompts: [
      "A car park roof at golden hour, nobody about, 35mm",
      "Retro sci-fi paperback cover, a lighthouse on a red planet",
    ],
    name: "Grok Image 2.0",
    vendor: "xAI",
    category: "image",
    output: "image",
    tagline: "xAI's image model: generate, or edit with up to ten references.",
    modes: [
      m("generate", "Generate", "xai/grok-imagine-image-2.0", { hide: ["image_urls"] }),
      m("edit", "Edit", "xai/grok-imagine-image-2.0", { hint: "Up to 10 references", require: ["image_urls"] }),
    ],
  },
  {
    id: "ideogram-4",
    name: "Ideogram 4.0",
    vendor: "Ideogram",
    category: "image",
    output: "image",
    tagline: "Typography that holds up: posters, logos and layouts, or remix an image.",
    modes: [
      m("generate", "Generate", "ideogram/v4.0", { hide: ["image_url", "image_weight"] }),
      m("remix", "Remix", "ideogram/v4.0", { hint: "Start from an image", require: ["image_url"] }),
    ],
  },
  {
    id: "qwen-image-3",
    name: "Qwen Image 3",
    vendor: "Alibaba",
    category: "image",
    output: "image",
    tagline: "Alibaba's image model with prompt reasoning; edits from up to three images.",
    modes: [
      m("generate", "Generate", "alibaba/qwen-image-3/text-to-image"),
      m("edit", "Edit", "alibaba/qwen-image-3/edit", { hint: "One to three references" }),
    ],
  },
  recraft(
    "recraft-v4-1-pro",
    "Recraft V4.1 Pro",
    "recraft/v4.1/pro/text-to-image",
    "Design-grade 2K images with palette and background control.",
  ),
  recraft("recraft-v4-1", "Recraft V4.1", "recraft/v4.1/text-to-image", "Design-grade images at 1K with palette control."),
  recraft(
    "recraft-v4-1-utility-pro",
    "Recraft V4.1 Utility Pro",
    "recraft/v4.1/utility/pro/text-to-image",
    "Recraft's utility model at 2K: icons, assets and clean product shots.",
  ),
  recraft(
    "recraft-v4-1-utility",
    "Recraft V4.1 Utility",
    "recraft/v4.1/utility/text-to-image",
    "Recraft's utility model at 1K, for quick assets.",
  ),
  {
    id: "z-image-turbo",
    name: "Z-Image Turbo",
    vendor: "Tongyi-MAI",
    category: "image",
    output: "image",
    tagline: "Fast 1K and 2K images with optional prompt rewriting.",
    modes: [m("generate", "Generate", "z-image/turbo")],
  },

  /* ============================================================== *
   * VIDEO
   * ============================================================== */
  {
    id: "cinema-studio-4",
    featured: true,
    prompts: [
      "A courier cycles through a night market, lanterns swinging, camera tracking alongside",
      "Two strangers share an umbrella at a tram stop, rain, first glance",
    ],
    name: "Cinema Studio 4.0",
    vendor: "Higgsfield",
    category: "video",
    output: "video",
    badge: "30s",
    tagline: "Direct a shot: camera, lens, light, era and grade, with up to 50 references.",
    modes: [
      m("generate", "Generate", "higgsfield/cinema-studio/4.0", {
        hint: "Text, or text with image, video and audio references",
      }),
    ],
    fields: {
      image_urls: { label: "Reference images" },
      video_urls: { label: "Reference videos" },
    },
  },
  {
    id: "seedance-2-5",
    featured: true,
    prompts: [
      "Rain on a bus window, the city sliding past, reflections of neon",
      "A paper boat drifts down a flooded street at dawn, camera following low",
    ],
    name: "Seedance 2.5",
    vendor: "ByteDance",
    category: "video",
    output: "video",
    badge: "30s",
    tagline: "Up to 30-second clips from text, a frame or references, plus edit and extend.",
    modes: [
      m("text-to-video", "Text to video", "bytedance/seedance-2.5/text-to-video"),
      m("image-to-video", "Image to video", "bytedance/seedance-2.5/image-to-video", {
        hint: "First frame, optionally a last frame",
      }),
      m("reference-to-video", "Reference", "bytedance/seedance-2.5/reference-to-video", {
        hint: "Images, videos and audio as references",
      }),
      m("video-edit", "Edit video", "bytedance/seedance-2.5/video-edit", { hint: "Change a clip with a prompt" }),
      m("video-extend", "Extend video", "bytedance/seedance-2.5/video-extend", { hint: "Continue a clip" }),
    ],
    fields: {
      video_url: { label: "Source video" },
      video_urls: { label: "Reference videos" },
      image_urls: { label: "Reference images" },
    },
  },
  {
    id: "seedance-2",
    name: "Seedance 2.0",
    vendor: "ByteDance",
    category: "video",
    output: "video",
    badge: "4K",
    tagline: "ByteDance's video model up to 4K, from text, frames or references.",
    modes: trio("bytedance/seedance-2.0", { i2v: { hint: "First frame, optionally a last frame" } }),
    fields: { image_urls: { label: "Reference images" }, video_urls: { label: "Reference videos" } },
  },
  {
    id: "kling-3",
    featured: true,
    prompts: [
      "Drone rises over a terraced tea plantation at sunrise, mist in the valleys",
      "A lighthouse in a storm, then the keeper lighting a lamp inside",
    ],
    name: "Kling 3.0",
    vendor: "Kuaishou",
    category: "video",
    output: "video",
    badge: "MULTI-SHOT",
    tagline: "Multi-shot storytelling with native audio, in Standard, Pro, 4K and Turbo.",
    tier: {
      label: "Quality",
      choices: [
        { value: "std", label: "Standard" },
        { value: "pro", label: "Pro" },
        { value: "4k", label: "4K" },
        { value: "turbo", label: "Turbo", hint: "Faster, no native audio" },
      ],
    },
    modes: [
      tiered("text-to-video", "Text to video", {
        std: "kling-video/v3.0/std/text-to-video",
        pro: "kling-video/v3.0/pro/text-to-video",
        "4k": "kling-video/v3.0/4k/text-to-video",
        turbo: "kling-video/v3.0-turbo/text-to-video",
      }, { require: ["prompt"] }),
      tiered(
        "image-to-video",
        "Image to video",
        {
          std: "kling-video/v3.0/std/image-to-video",
          pro: "kling-video/v3.0/pro/image-to-video",
          "4k": "kling-video/v3.0/4k/image-to-video",
          turbo: "kling-video/v3.0-turbo/image-to-video",
        },
        // Kling wants a top-level prompt even when the shots carry their own.
        { hint: "First frame, optionally a last frame", require: ["prompt"] },
      ),
    ],
    fields: SHOT_FIELDS,
  },
  {
    id: "kling-o3",
    name: "Kling O3",
    vendor: "Kuaishou",
    category: "video",
    output: "video",
    tagline: "Kling's omni model: frames, image or video references, and video editing.",
    modes: [
      m("image-reference", "Reference", "kling-video/o3/image-reference", {
        hint: "Images and elements as references",
        require: ["prompt"],
      }),
      m("first-last-frame", "Frames", "kling-video/o3/first-last-frame", {
        hint: "First and last frame",
        require: ["prompt"],
      }),
      m("video-reference", "Video reference", "kling-video/o3/video-reference", { hint: "Borrow from a clip" }),
      m("video-edit", "Edit video", "kling-video/o3/video-edit", { hint: "Change a 3–10 s clip" }),
    ],
    fields: { ...SHOT_FIELDS, video_urls: { label: "Source video" } },
  },
  {
    id: "kling-omni",
    name: "Kling Omni",
    vendor: "Kuaishou",
    category: "video",
    output: "video",
    tagline: "Create and edit with image and video references in one model.",
    modes: [
      m("image-reference", "Reference", "kling-video/omni/image-reference", { hint: "Images and elements" }),
      m("first-last-frame", "Frames", "kling-video/omni/first-last-frame", { hint: "First and last frame" }),
      m("video-reference", "Video reference", "kling-video/omni/video-reference", { hint: "Borrow from a clip" }),
      m("video-edit", "Edit video", "kling-video/omni/video-edit", { hint: "Change a 3–10 s clip" }),
    ],
    fields: { video_urls: { label: "Source video" } },
  },
  {
    id: "kling-2-6",
    name: "Kling 2.6",
    vendor: "Kuaishou",
    category: "video",
    output: "video",
    tagline: "Kling 2.6 Pro with native sound, from text or a first frame.",
    modes: [
      m("text-to-video", "Text to video", "kling-video/v2.6/pro/text-to-video"),
      m("image-to-video", "Image to video", "kling-video/v2.6/pro/image-to-video"),
    ],
  },
  {
    id: "kling-2-5-turbo",
    name: "Kling 2.5 Turbo",
    vendor: "Kuaishou",
    category: "video",
    output: "video",
    tagline: "Quick, affordable Kling clips of five or ten seconds.",
    tier: STD_PRO,
    modes: [
      m("text-to-video", "Text to video", "kling-video/v2.5-turbo/pro/text-to-video"),
      tiered("image-to-video", "Image to video", {
        std: "kling-video/v2.5-turbo/standard/image-to-video",
        pro: "kling-video/v2.5-turbo/pro/image-to-video",
      }),
    ],
  },
  {
    id: "wan-3-prime",
    featured: true,
    prompts: [
      "A dog shakes off river water in slow motion, sun behind it",
      "Paper lanterns rise over a dark lake, a crowd watching from the shore",
    ],
    name: "Wan 3.0 Prime",
    vendor: "Alibaba",
    category: "video",
    output: "video",
    badge: "30s",
    tagline: "Alibaba's top Wan: 30-second 1080p clips with sound and multimodal references.",
    modes: trio("alibaba/wan-3.0-prime"),
    fields: WAN_THREE_FIELDS,
    validate: wanThreeSource,
  },
  {
    id: "wan-3",
    name: "Wan 3.0",
    vendor: "Alibaba",
    category: "video",
    output: "video",
    tagline: "Wan 3.0: 1080p clips up to 30 seconds with native audio.",
    modes: trio("alibaba/wan-3.0"),
    fields: WAN_THREE_FIELDS,
    validate: wanThreeSource,
  },
  {
    id: "wan-2-7",
    name: "Wan 2.7",
    vendor: "Alibaba",
    category: "video",
    output: "video",
    tagline: "Wan 2.7 with audio-driven motion, first and last frames and references.",
    modes: trio("wan/v2.7"),
    fields: { image_urls: { label: "Reference images" }, video_urls: { label: "Reference videos" } },
  },
  {
    id: "wan-2-6",
    name: "Wan 2.6",
    vendor: "Alibaba",
    category: "video",
    output: "video",
    tagline: "Wan 2.6: multi-shot prompts, audio input and video references.",
    modes: trio("wan/v2.6", { ref: { hint: "Up to three reference videos" } }),
    fields: { video_urls: { label: "Reference videos" } },
  },
  {
    id: "happy-horse-1-1",
    name: "HappyHorse 1.1",
    vendor: "Alibaba",
    category: "video",
    output: "video",
    tagline: "Alibaba's HappyHorse at 1080p, from text, a frame or references.",
    modes: trio("alibaba/happy-horse/v1.1"),
    fields: { image_urls: { label: "Reference images" } },
  },
  {
    id: "happy-horse-1",
    name: "HappyHorse 1.0",
    vendor: "Alibaba",
    category: "video",
    output: "video",
    tagline: "The first HappyHorse: text, first-frame and reference video.",
    modes: trio("alibaba/happy-horse"),
    fields: { image_urls: { label: "Reference images" } },
  },
  {
    id: "minimax-h3",
    name: "MiniMax H3",
    vendor: "MiniMax",
    category: "video",
    output: "video",
    badge: "2K",
    tagline: "2K video from text, frames or multimodal references.",
    modes: trio("minimax/h3", { i2v: { hint: "First frame, optionally a last frame" } }),
    fields: {
      image_urls: { label: "Reference images" },
      video_urls: { label: "Reference videos" },
    },
  },
  {
    id: "hailuo-2-3",
    name: "Hailuo 2.3",
    vendor: "MiniMax",
    category: "video",
    output: "video",
    tagline: "MiniMax Hailuo 2.3 Standard: expressive motion in six or ten seconds.",
    modes: [
      m("text-to-video", "Text to video", "minimax/hailuo-2.3/standard/text-to-video"),
      m("image-to-video", "Image to video", "minimax/hailuo-2.3/standard/image-to-video"),
    ],
  },
  {
    id: "ltx-2-5",
    name: "LTX-2.5",
    vendor: "Lightricks",
    category: "video",
    output: "video",
    badge: "4K",
    tagline: "Lightricks' LTX with camera moves, audio and up to 4K at 50 fps.",
    tier: {
      label: "Speed",
      choices: [
        { value: "fast", label: "Fast", hint: "Up to 4K" },
        { value: "pro", label: "Pro", hint: "Up to 1080p" },
      ],
    },
    modes: [
      tiered("text-to-video", "Text to video", {
        fast: "lightricks/ltx-2.5/text-to-video/fast",
        pro: "lightricks/ltx-2.5/text-to-video/pro",
      }),
      tiered(
        "image-to-video",
        "Image to video",
        {
          fast: "lightricks/ltx-2.5/image-to-video/fast",
          pro: "lightricks/ltx-2.5/image-to-video/pro",
        },
        { hint: "First frame, optionally a last frame" },
      ),
    ],
  },
  {
    id: "pixverse-v6",
    name: "PixVerse V6",
    vendor: "PixVerse",
    category: "video",
    output: "video",
    tagline: "PixVerse V6 with native sound, one to fifteen seconds.",
    modes: [
      m("text-to-video", "Text to video", "pixverse/v6/text-to-video"),
      m("image-to-video", "Image to video", "pixverse/v6/image-to-video", { hint: "First frame, optionally a last frame" }),
    ],
  },
  {
    id: "grok-video-1-5",
    name: "Grok Imagine Video 1.5",
    vendor: "xAI",
    category: "video",
    output: "video",
    tagline: "xAI's video model: text, a first frame, or images and audio as references.",
    modes: [
      m("text-to-video", "Text to video", "xai/grok-imagine-video/v1.5/reference-to-video", {
        hide: ["image_url", "image_urls", "audio_url"],
      }),
      m("image-to-video", "Image to video", "xai/grok-imagine-video/v1.5/reference-to-video", {
        hide: ["image_urls", "audio_url"],
        require: ["image_url"],
      }),
      m("reference-to-video", "Reference", "xai/grok-imagine-video/v1.5/reference-to-video", {
        hint: "Up to 7 images and an audio track, at 480p or 720p",
        hide: ["image_url"],
      }),
    ],
    fields: { image_url: { label: "First frame" }, image_urls: { label: "Reference images" } },
  },

  /* ============================================================== *
   * TOOLS: motion and edits on a clip you bring
   * ============================================================== */
  {
    id: "genjutsu",
    name: "Genjutsu",
    vendor: "Higgsfield",
    category: "video",
    output: "video",
    tagline: "Move a character with a clip's motion, or swap an object inside a video.",
    modes: [
      m("motion-transfer", "Motion transfer", "higgsfield/genjutsu/motion-transfer/v1.0", {
        hint: "A 4 s+ clip drives your images",
      }),
      m("object-swap", "Object swap", "higgsfield/genjutsu/object-swap/v1.0", { hint: "Replace an object in a clip" }),
    ],
    fields: {
      video_url: { label: "Source video" },
      image_urls: { label: "Reference images" },
    },
  },
  {
    id: "kling-3-motion-control",
    name: "Kling 3.0 Motion Control",
    vendor: "Kuaishou",
    category: "video",
    output: "video",
    tagline: "Take the motion from a video and put it on the character in your image.",
    tier: STD_PRO,
    modes: [
      tiered("motion-control", "Motion control", {
        std: "kling-video/v3/motion-control/std",
        pro: "kling-video/v3/motion-control/pro",
      }),
    ],
    fields: { ...MOTION_CONTROL_FIELDS, video_url: { label: "Motion video" }, image_url: { label: "Character" } },
  },
  {
    id: "kling-2-6-motion-control",
    name: "Kling 2.6 Motion Control",
    vendor: "Kuaishou",
    category: "video",
    output: "video",
    tagline: "Kling 2.6 motion transfer from a video onto an image.",
    tier: STD_PRO,
    modes: [
      tiered("motion-control", "Motion control", {
        std: "kling-video/motion-control/std",
        pro: "kling-video/motion-control/pro",
      }),
    ],
    fields: { ...MOTION_CONTROL_FIELDS, video_url: { label: "Motion video" }, image_url: { label: "Character" } },
  },
];
