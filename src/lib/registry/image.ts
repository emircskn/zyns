import {
  RES_1K_2K_4K,
  bool,
  choices,
  first,
  inMode,
  int,
  list,
  negativePromptField,
  num,
  promptField,
  ratios,
  seedField,
} from "./common";
import { compact, type ModelDef, type Values } from "./types";

const JOBS = "/api/v1/jobs/createTask";

/* ------------------------------------------------------------------ *
 * Nano Banana 2 — Google Gemini 3.1 Flash Image
 * ------------------------------------------------------------------ */
const nanoBanana: ModelDef = {
  id: "nano-banana",
  name: "Nano Banana 2",
  vendor: "Google",
  category: "image",
  output: "image",
  badge: "4K",
  tagline: "Gemini 3.1 Flash Image — fast, sharp text rendering, up to 14 references.",
  tags: ["text to image", "image editing", "character consistency"],
  docs: "https://docs.kie.ai/market/google/nano-banana-2-lite",
  modes: [
    { id: "generate", label: "Generate", hint: "Text to image" },
    { id: "edit", label: "Edit", hint: "Up to 14 reference images" },
  ],
  defaultMode: "generate",
  fields: [
    {
      key: "model",
      label: "Variant",
      kind: "segmented",
      placement: "bar",
      default: "nano-banana-2",
      choices: choices([
        ["nano-banana-2", "Pro", "4K, 14 refs, Google Search grounding"],
        ["nano-banana-2-lite", "Lite", "1K only, 10 refs, fastest"],
      ]),
    },
    promptField({ help: "Up to 20,000 characters." }),
    {
      key: "image_input",
      label: "Reference images",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 14,
      required: true,
      when: inMode("edit"),
      help: "Lite accepts at most 10 references.",
    },
    {
      key: "aspect_ratio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "1:1",
      choices: ratios(
        "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4",
        "9:16", "16:9", "21:9", "1:4", "4:1", "1:8", "8:1", "auto",
      ),
    },
    {
      key: "resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "1K",
      choices: choices([
        ["1K", "1K", "8 credits"],
        ["2K", "2K", "12 credits"],
        ["4K", "4K", "18 credits"],
      ]),
      when: (v) => v.model !== "nano-banana-2-lite",
    },
    {
      key: "output_format",
      label: "Output format",
      kind: "segmented",
      placement: "panel",
      group: "Output",
      default: "png",
      choices: choices([["png", "PNG"], ["jpg", "JPG"]]),
      when: (v) => v.model !== "nano-banana-2-lite",
    },
    {
      key: "google_search",
      label: "Google Search grounding",
      kind: "toggle",
      placement: "panel",
      group: "Advanced",
      default: false,
      help: "Grounds factual content (logos, landmarks, people) in live search results.",
      when: (v) => v.model !== "nano-banana-2-lite",
    },
  ],
  validate(v) {
    if (v.model === "nano-banana-2-lite" && list(v.image_input).length > 10) {
      return "Nano Banana 2 Lite accepts at most 10 reference images.";
    }
    return null;
  },
  creditHint(v) {
    if (v.model === "nano-banana-2-lite") return "≈4 credits";
    return { "1K": "≈8 credits", "2K": "≈12 credits", "4K": "≈18 credits" }[v.resolution as string];
  },
  build(v) {
    const lite = v.model === "nano-banana-2-lite";
    const refs = list(v.image_input);
    const input: Record<string, unknown> = compact({
      prompt: v.prompt,
      aspect_ratio: v.aspect_ratio,
    });
    if (lite) {
      input.image_urls = refs;
    } else {
      input.image_input = refs;
      if (v.output_format) input.output_format = v.output_format;
      if (v.resolution) input.resolution = v.resolution;
      if (bool(v.google_search)) input.google_search = true;
    }
    return { endpoint: JOBS, poll: "jobs", payload: { model: v.model || "nano-banana-2", input } };
  },
};

/* ------------------------------------------------------------------ *
 * ByteDance Seedream — V4 / 5 Lite / 5 Pro
 * ------------------------------------------------------------------ */
const isV4 = (v: Values) => v.version === "4";
const isV5Lite = (v: Values) => !v.version || v.version === "5-lite";
const isV5Pro = (v: Values) => v.version === "5-pro";

const seedream: ModelDef = {
  id: "seedream",
  name: "Seedream 5",
  vendor: "ByteDance",
  category: "image",
  output: "image",
  tagline: "Precision editing, realistic portraits and multilingual text in one model.",
  tags: ["text to image", "image editing", "multilingual text"],
  modes: [
    { id: "generate", label: "Generate", hint: "Text to image" },
    { id: "edit", label: "Edit", hint: "Reference-driven editing" },
  ],
  defaultMode: "generate",
  fields: [
    {
      key: "version",
      label: "Version",
      kind: "segmented",
      placement: "bar",
      default: "5-lite",
      choices: choices([
        ["5-lite", "5 Lite", "2K/3K, fastest"],
        ["5-pro", "5 Pro", "Controlled 1K/2K, format + NSFW filter"],
        ["4", "V4", "Batch up to 6 images, 4K"],
      ]),
    },
    promptField({ help: "V4 accepts 5,000 characters; V5 Lite caps at 3,000." }),
    {
      key: "image_urls",
      label: "Reference images",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 14,
      required: true,
      when: inMode("edit"),
      help: "V4 accepts up to 10, V5 Pro up to 10, V4.5/Lite up to 14.",
    },
    {
      key: "image_size",
      label: "Image size",
      kind: "select",
      placement: "bar",
      default: "square_hd",
      when: isV4,
      choices: choices([
        ["square", "Square"],
        ["square_hd", "Square HD"],
        ["portrait_4_3", "Portrait 4:3"],
        ["portrait_3_2", "Portrait 3:2"],
        ["portrait_16_9", "Portrait 16:9"],
        ["landscape_4_3", "Landscape 4:3"],
        ["landscape_3_2", "Landscape 3:2"],
        ["landscape_16_9", "Landscape 16:9"],
        ["landscape_21_9", "Landscape 21:9"],
      ]),
    },
    {
      key: "image_resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "1K",
      choices: RES_1K_2K_4K,
      when: isV4,
    },
    {
      key: "max_images",
      label: "Batch size",
      kind: "slider",
      placement: "bar",
      default: 1,
      min: 1,
      max: 6,
      step: 1,
      when: isV4,
      chip: (val) => `${val}×`,
    },
    {
      key: "aspect_ratio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "1:1",
      choices: ratios("1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "21:9"),
      when: (v) => !isV4(v),
    },
    {
      key: "quality",
      label: "Quality",
      kind: "segmented",
      placement: "bar",
      default: "basic",
      choices: choices([
        ["basic", "Basic", "2K output"],
        ["high", "High", "3K output"],
      ]),
      when: (v) => !isV4(v),
    },
    {
      key: "output_format",
      label: "Output format",
      kind: "segmented",
      placement: "panel",
      group: "Output",
      default: "png",
      choices: choices([["png", "PNG"], ["jpeg", "JPEG"]]),
      when: isV5Pro,
    },
    {
      key: "nsfw_checker",
      label: "NSFW filter",
      kind: "toggle",
      placement: "panel",
      group: "Safety",
      default: false,
      when: isV5Pro,
    },
    seedField({ when: isV4, help: "V4 only. -1 (or empty) picks a random seed." }),
  ],
  validate(v) {
    const refs = list(v.image_urls).length;
    if (isV5Pro(v) && refs > 10) return "Seedream 5 Pro accepts at most 10 reference images.";
    if (isV4(v) && refs > 10) return "Seedream V4 accepts at most 10 reference images.";
    return null;
  },
  build(v) {
    const edit = list(v.image_urls).length > 0;
    let model: string;
    let input: Record<string, unknown>;
    if (isV5Pro(v)) {
      model = edit ? "seedream/5-pro-image-to-image" : "seedream/5-pro-text-to-image";
      input = {
        prompt: v.prompt,
        aspect_ratio: v.aspect_ratio || "1:1",
        quality: v.quality || "basic",
        output_format: v.output_format || "png",
        nsfw_checker: bool(v.nsfw_checker),
      };
    } else if (isV5Lite(v)) {
      model = edit ? "seedream/5-lite-image-to-image" : "seedream/5-lite-text-to-image";
      input = {
        prompt: v.prompt,
        aspect_ratio: v.aspect_ratio || "1:1",
        quality: v.quality || "basic",
      };
    } else {
      model = edit ? "bytedance/seedream-v4-edit" : "bytedance/seedream-v4-text-to-image";
      input = {
        prompt: v.prompt,
        image_size: v.image_size || "square_hd",
        image_resolution: v.image_resolution || "1K",
        max_images: int(v.max_images) ?? 1,
        seed: int(v.seed) ?? -1,
      };
    }
    if (edit) input.image_urls = list(v.image_urls);
    return { endpoint: JOBS, poll: "jobs", payload: { model, input } };
  },
};

/* ------------------------------------------------------------------ *
 * GPT Image 2 — OpenAI
 * ------------------------------------------------------------------ */
const gptImage2: ModelDef = {
  id: "gpt-image-2",
  name: "GPT Image 2",
  vendor: "OpenAI",
  category: "image",
  output: "image",
  tagline: "Instruction-following image model with up to 16 reference images.",
  tags: ["text to image", "image editing"],
  modes: [
    { id: "generate", label: "Generate" },
    { id: "edit", label: "Edit", hint: "Up to 16 references" },
  ],
  defaultMode: "generate",
  fields: [
    promptField({ help: "Up to 20,000 characters." }),
    {
      key: "input_urls",
      label: "Reference images",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 16,
      required: true,
      when: inMode("edit"),
    },
    {
      key: "aspect_ratio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "auto",
      choices: ratios("auto", "1:1", "9:16", "16:9", "4:3", "3:4"),
    },
    {
      key: "resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "1K",
      choices: RES_1K_2K_4K,
    },
  ],
  build(v) {
    const refs = list(v.input_urls);
    const input = compact({
      prompt: v.prompt,
      aspect_ratio: v.aspect_ratio,
      resolution: v.resolution,
      input_urls: refs,
    });
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: refs.length > 0 ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image",
        input,
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * FLUX Kontext — Black Forest Labs (dedicated endpoint)
 * ------------------------------------------------------------------ */
const fluxKontext: ModelDef = {
  id: "flux-kontext",
  name: "FLUX Kontext",
  vendor: "Black Forest Labs",
  category: "image",
  output: "image",
  tagline: "In-context image editing that keeps the rest of the frame untouched.",
  tags: ["text to image", "image editing"],
  modes: [
    { id: "generate", label: "Generate" },
    { id: "edit", label: "Edit", hint: "Single input image" },
  ],
  defaultMode: "generate",
  fields: [
    {
      key: "model",
      label: "Variant",
      kind: "segmented",
      placement: "bar",
      default: "flux-kontext-pro",
      choices: choices([
        ["flux-kontext-pro", "Pro", "Balanced speed and quality"],
        ["flux-kontext-max", "Max", "Highest fidelity"],
      ]),
    },
    promptField({ help: "English prompts give the most reliable results." }),
    {
      key: "inputImage",
      label: "Input image",
      kind: "media",
      placement: "input",
      accept: "image",
      required: true,
      when: inMode("edit"),
    },
    {
      key: "aspectRatio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "16:9",
      choices: ratios("21:9", "16:9", "4:3", "1:1", "3:4", "9:16"),
    },
    {
      key: "outputFormat",
      label: "Output format",
      kind: "segmented",
      placement: "bar",
      default: "jpeg",
      choices: choices([["jpeg", "JPEG"], ["png", "PNG"]]),
    },
    {
      key: "promptUpsampling",
      label: "Prompt upsampling",
      kind: "toggle",
      placement: "panel",
      group: "Prompting",
      default: false,
      help: "Expands short prompts before generating. Slower, usually richer.",
    },
    {
      key: "enableTranslation",
      label: "Auto-translate prompt",
      kind: "toggle",
      placement: "panel",
      group: "Prompting",
      default: true,
    },
    {
      key: "safetyTolerance",
      label: "Safety tolerance",
      kind: "slider",
      placement: "panel",
      group: "Safety",
      default: 6,
      min: 0,
      max: 6,
      step: 1,
      when: inMode("generate"),
      help: "0 is strictest.",
    },
    {
      // Editing is capped at 2 by the API, so it gets its own control rather
      // than a shared one that starts out invalid.
      key: "safetyTolerance",
      label: "Safety tolerance",
      kind: "slider",
      placement: "panel",
      group: "Safety",
      default: 2,
      min: 0,
      max: 2,
      step: 1,
      when: inMode("edit"),
      help: "0 is strictest. Editing accepts 0–2.",
    },
    {
      key: "watermark",
      label: "Watermark text",
      kind: "text",
      placement: "panel",
      group: "Output",
    },
    {
      key: "uploadCn",
      label: "Route uploads via China",
      kind: "toggle",
      placement: "panel",
      group: "Advanced",
      default: false,
    },
  ],
  validate(v) {
    if (v.__mode === "edit" && (num(v.safetyTolerance) ?? 6) > 2) {
      return "In edit mode FLUX Kontext only accepts a safety tolerance of 0–2.";
    }
    return null;
  },
  build(v) {
    const edit = v.__mode === "edit";
    return {
      endpoint: "/api/v1/flux/kontext/generate",
      poll: "flux",
      payload: compact({
        prompt: v.prompt,
        model: v.model || "flux-kontext-pro",
        aspectRatio: v.aspectRatio || "16:9",
        outputFormat: v.outputFormat || "jpeg",
        promptUpsampling: bool(v.promptUpsampling),
        enableTranslation: v.enableTranslation !== false,
        uploadCn: bool(v.uploadCn),
        safetyTolerance: edit
          ? Math.min(num(v.safetyTolerance) ?? 2, 2)
          : num(v.safetyTolerance) ?? 6,
        inputImage: edit ? v.inputImage : undefined,
        watermark: v.watermark,
      }),
    };
  },
};

/* ------------------------------------------------------------------ *
 * FLUX 2 — Black Forest Labs
 * ------------------------------------------------------------------ */
const flux2: ModelDef = {
  id: "flux-2",
  name: "FLUX 2",
  vendor: "Black Forest Labs",
  category: "image",
  output: "image",
  tagline: "Photoreal generation with 1–8 reference images for composition control.",
  tags: ["text to image", "image to image"],
  modes: [
    { id: "generate", label: "Generate" },
    { id: "edit", label: "Reference", hint: "1–8 reference images" },
  ],
  defaultMode: "generate",
  fields: [
    {
      key: "model_type",
      label: "Variant",
      kind: "segmented",
      placement: "bar",
      default: "pro",
      choices: choices([
        ["pro", "Pro", "Fast, reliable"],
        ["flex", "Flex", "More control and fine-tuning"],
      ]),
    },
    promptField({ help: "3–5,000 characters." }),
    {
      key: "input_urls",
      label: "Reference images",
      kind: "images",
      placement: "input",
      accept: "image",
      minItems: 1,
      maxItems: 8,
      required: true,
      when: inMode("edit"),
    },
    {
      key: "aspect_ratio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "1:1",
      choices: ratios("1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "auto"),
    },
    {
      key: "resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "1K",
      choices: choices([["1K", "1K"], ["2K", "2K"]]),
    },
  ],
  validate(v) {
    if (v.aspect_ratio === "auto" && list(v.input_urls).length === 0) {
      return "Aspect ratio 'auto' needs at least one reference image.";
    }
    return null;
  },
  build(v) {
    const refs = list(v.input_urls);
    const flex = v.model_type === "flex";
    const model = refs.length
      ? flex
        ? "flux-2/flex-image-to-image"
        : "flux-2/pro-image-to-image"
      : flex
        ? "flux-2/flex-text-to-image"
        : "flux-2/pro-text-to-image";
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model,
        input: compact({
          prompt: v.prompt,
          aspect_ratio: v.aspect_ratio || "1:1",
          resolution: v.resolution || "1K",
          input_urls: refs,
        }),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Qwen Image — Alibaba
 * ------------------------------------------------------------------ */
const qwenImage: ModelDef = {
  id: "qwen-image",
  name: "Qwen Image",
  vendor: "Alibaba",
  category: "image",
  output: "image",
  tagline: "Open-weights generation and editing with full sampler control.",
  tags: ["text to image", "image editing", "fine control"],
  modes: [
    { id: "generate", label: "Generate" },
    { id: "edit", label: "Edit", hint: "Single input image" },
  ],
  defaultMode: "generate",
  fields: [
    promptField(),
    {
      key: "image_url",
      label: "Input image",
      kind: "media",
      placement: "input",
      accept: "image",
      required: true,
      when: inMode("edit"),
    },
    {
      key: "image_size",
      label: "Image size",
      kind: "select",
      placement: "bar",
      default: "square_hd",
      choices: choices([
        ["square", "Square"],
        ["square_hd", "Square HD"],
        ["portrait_4_3", "Portrait 4:3"],
        ["portrait_16_9", "Portrait 16:9"],
        ["landscape_4_3", "Landscape 4:3"],
        ["landscape_16_9", "Landscape 16:9"],
      ]),
    },
    {
      key: "num_images",
      label: "Batch size",
      kind: "segmented",
      placement: "bar",
      default: "1",
      choices: choices([["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]]),
      when: inMode("edit"),
      chip: (val) => `${val}×`,
    },
    {
      key: "acceleration",
      label: "Acceleration",
      kind: "segmented",
      placement: "bar",
      default: "none",
      choices: choices([
        ["none", "None", "Best quality"],
        ["regular", "Regular"],
        ["high", "High", "Fastest"],
      ]),
    },
    {
      key: "num_inference_steps",
      label: "Steps",
      kind: "slider",
      placement: "panel",
      group: "Sampler",
      min: 2,
      max: 250,
      step: 1,
      help: "2–250 when generating, 2–49 when editing. Defaults: 30 / 25.",
    },
    {
      key: "guidance_scale",
      label: "Guidance (CFG)",
      kind: "slider",
      placement: "panel",
      group: "Sampler",
      min: 0,
      max: 20,
      step: 0.1,
      help: "Defaults: 2.5 when generating, 4 when editing.",
    },
    negativePromptField(),
    {
      key: "output_format",
      label: "Output format",
      kind: "segmented",
      placement: "panel",
      group: "Output",
      default: "png",
      choices: choices([["png", "PNG"], ["jpeg", "JPEG"]]),
    },
    {
      key: "enable_safety_checker",
      label: "Safety checker",
      kind: "toggle",
      placement: "panel",
      group: "Safety",
      default: false,
    },
    seedField(),
  ],
  validate(v) {
    const steps = num(v.num_inference_steps);
    if (v.__mode === "edit" && steps !== undefined && (steps < 2 || steps > 49)) {
      return "Edit mode accepts 2–49 inference steps.";
    }
    return null;
  },
  build(v) {
    const edit = v.__mode === "edit" && !!v.image_url;
    const input: Record<string, unknown> = compact({
      prompt: v.prompt,
      image_size: v.image_size || "square_hd",
      num_inference_steps: int(v.num_inference_steps) ?? (edit ? 25 : 30),
      guidance_scale: num(v.guidance_scale) ?? (edit ? 4 : 2.5),
      enable_safety_checker: bool(v.enable_safety_checker),
      output_format: v.output_format || "png",
      negative_prompt: v.negative_prompt || (edit ? "blurry, ugly" : " "),
      acceleration: v.acceleration || "none",
      seed: int(v.seed),
    });
    if (edit) {
      input.image_url = v.image_url;
      if (v.num_images) input.num_images = v.num_images;
    }
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: { model: edit ? "qwen/image-edit" : "qwen/text-to-image", input },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Z-Image — Tongyi-MAI
 * ------------------------------------------------------------------ */
const zImage: ModelDef = {
  id: "z-image",
  name: "Z-Image",
  vendor: "Tongyi-MAI",
  category: "image",
  output: "image",
  tagline: "Bilingual model with reliable Chinese and English text rendering.",
  tags: ["text to image", "text rendering"],
  fields: [
    promptField({ help: "Bilingual prompts (Chinese / English) are supported." }),
    {
      key: "aspect_ratio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "1:1",
      choices: ratios("1:1", "4:3", "3:4", "16:9", "9:16"),
    },
  ],
  build(v) {
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: "z-image",
        input: { prompt: v.prompt, aspect_ratio: v.aspect_ratio || "1:1" },
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Midjourney (dedicated endpoint — images and video)
 * ------------------------------------------------------------------ */
const mjVideo = (v: Values) => v.__mode === "mj_video" || v.__mode === "mj_video_hd";

const midjourney: ModelDef = {
  id: "midjourney",
  name: "Midjourney",
  vendor: "Midjourney",
  category: "image",
  output: "image",
  tagline: "Signature Midjourney aesthetic, plus style / omni references and video.",
  tags: ["text to image", "image to image", "style reference", "image to video"],
  modes: [
    { id: "mj_txt2img", label: "Text to image" },
    { id: "mj_img2img", label: "Image to image" },
    { id: "mj_style_reference", label: "Style reference" },
    { id: "mj_omni_reference", label: "Omni reference" },
    { id: "mj_video", label: "Video" },
    { id: "mj_video_hd", label: "Video HD" },
  ],
  defaultMode: "mj_txt2img",
  fields: [
    promptField({ help: "Up to 4,000 characters." }),
    {
      key: "fileUrls",
      label: "Reference images",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 5,
      required: true,
      when: (v) => v.__mode !== "mj_txt2img",
    },
    {
      key: "version",
      label: "Version",
      kind: "select",
      placement: "bar",
      default: "7",
      choices: choices([
        ["7", "v7"],
        ["6.1", "v6.1"],
        ["6", "v6"],
        ["niji6", "Niji 6"],
      ]),
    },
    {
      key: "aspectRatio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "1:1",
      choices: ratios("1:1", "9:16", "16:9", "4:3", "3:4", "21:9", "2:3", "3:2"),
    },
    {
      key: "speed",
      label: "Speed",
      kind: "segmented",
      placement: "bar",
      default: "fast",
      choices: choices([
        ["relax", "Relax", "Slowest, cheapest"],
        ["fast", "Fast"],
        ["turbo", "Turbo", "Fastest"],
      ]),
      when: (v) => !mjVideo(v) && v.__mode !== "mj_omni_reference",
    },
    {
      key: "motion",
      label: "Motion",
      kind: "segmented",
      placement: "bar",
      default: "high",
      choices: choices([
        ["low", "Low", "Subtle camera and subject motion"],
        ["high", "High", "Dynamic motion"],
      ]),
      when: mjVideo,
    },
    {
      key: "videoBatchSize",
      label: "Videos",
      kind: "slider",
      placement: "bar",
      default: 1,
      min: 1,
      max: 4,
      step: 1,
      when: mjVideo,
      chip: (val) => `${val}×`,
    },
    {
      key: "ow",
      label: "Omni weight",
      kind: "text",
      placement: "bar",
      placeholder: "1–1000",
      required: true,
      when: inMode("mj_omni_reference"),
      help: "How strongly the omni reference is applied.",
    },
    {
      key: "stylization",
      label: "Stylization",
      kind: "slider",
      placement: "panel",
      group: "Style",
      min: 0,
      max: 1000,
      step: 50,
      help: "Artistic style intensity (0–1000).",
    },
    {
      key: "weirdness",
      label: "Weirdness",
      kind: "slider",
      placement: "panel",
      group: "Style",
      min: 0,
      max: 3000,
      step: 100,
      help: "Creativity and unusualness (0–3000).",
    },
    {
      key: "variety",
      label: "Variety",
      kind: "slider",
      placement: "panel",
      group: "Style",
      min: 0,
      max: 100,
      step: 5,
      help: "Diversity between the four results (0–100).",
    },
    {
      key: "enableTranslation",
      label: "Auto-translate prompt",
      kind: "toggle",
      placement: "panel",
      group: "Prompting",
      default: false,
    },
    {
      key: "waterMark",
      label: "Watermark text",
      kind: "text",
      placement: "panel",
      group: "Output",
    },
  ],
  validate(v) {
    if (v.__mode === "mj_omni_reference" && !v.ow) return "Omni reference mode needs an omni weight.";
    if (v.__mode !== "mj_txt2img" && list(v.fileUrls).length === 0) {
      return "This Midjourney mode needs at least one reference image.";
    }
    return null;
  },
  build(v) {
    const taskType = v.__mode || "mj_txt2img";
    const video = taskType === "mj_video" || taskType === "mj_video_hd";
    const payload: Record<string, unknown> = compact({
      taskType,
      prompt: v.prompt,
      aspectRatio: v.aspectRatio || "1:1",
      version: v.version || "7",
      enableTranslation: bool(v.enableTranslation),
      fileUrls: list(v.fileUrls),
      variety: int(v.variety),
      stylization: int(v.stylization),
      weirdness: int(v.weirdness),
      waterMark: v.waterMark,
    });
    if (v.speed && !video && taskType !== "mj_omni_reference") payload.speed = v.speed;
    if (taskType === "mj_omni_reference" && v.ow) payload.ow = String(v.ow);
    if (video) {
      payload.motion = v.motion || "high";
      const batch = int(v.videoBatchSize);
      if (batch) payload.videoBatchSize = batch;
    }
    return { endpoint: "/api/v1/mj/generate", poll: "mj", payload };
  },
};

/* ------------------------------------------------------------------ *
 * Grok Imagine — xAI (image + video in one model)
 * ------------------------------------------------------------------ */
const grokImagine: ModelDef = {
  id: "grok-imagine",
  name: "Grok Imagine",
  vendor: "xAI",
  category: "image",
  output: "image",
  tagline: "Image 2.0 generation plus fast video, with a built-in upscaler.",
  tags: ["text to image", "image to image", "text to video", "image to video", "upscale"],
  modes: [
    { id: "text-to-image", label: "Text to image" },
    { id: "image-to-image", label: "Image to image", hint: "1–5 references" },
    { id: "text-to-video", label: "Text to video" },
    { id: "image-to-video", label: "Image to video", hint: "Exactly one image" },
    { id: "upscale", label: "Upscale", hint: "From a previous task ID" },
  ],
  defaultMode: "text-to-image",
  fields: [
    promptField({ when: (v) => v.__mode !== "upscale", required: false }),
    {
      key: "image_urls",
      label: "Reference images",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 5,
      when: (v) =>
        v.__mode === "image-to-image" || (v.__mode === "image-to-video" && !v.task_id),
      help: "Image to video accepts exactly one image.",
    },
    {
      key: "task_id",
      label: "Source task ID",
      kind: "text",
      placement: "bar",
      when: (v) =>
        v.__mode === "upscale" ||
        (v.__mode === "image-to-video" && list(v.image_urls).length === 0),
      placeholder: "Task ID of an earlier Grok run",
    },
    {
      key: "index",
      label: "Image index",
      kind: "slider",
      placement: "bar",
      min: 0,
      max: 5,
      step: 1,
      when: (v) => v.__mode === "image-to-video" && !!v.task_id,
      help: "Grok returns six images per task — pick which one animates.",
    },
    {
      key: "aspect_ratio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "1:1",
      when: (v) => ["text-to-image", "image-to-image", "text-to-video"].includes(v.__mode),
      choices: ratios("1:1", "2:3", "3:2", "16:9", "9:16", "auto"),
      help: "Video modes only accept 1:1, 2:3 and 3:2. 'auto' is image-to-image only.",
    },
    {
      key: "mode",
      label: "Style",
      kind: "segmented",
      placement: "bar",
      default: "normal",
      when: inMode("text-to-video", "image-to-video"),
      choices: choices([
        ["fun", "Fun"],
        ["normal", "Normal"],
        ["spicy", "Spicy", "Not available with uploaded images"],
      ]),
    },
  ],
  validate(v) {
    const m = v.__mode;
    const imgs = list(v.image_urls);
    const videoRatios = ["1:1", "2:3", "3:2"];
    const imageRatios = ["1:1", "2:3", "3:2", "16:9", "9:16"];
    if (m === "upscale" && !v.task_id) return "Upscale needs the task ID of a previous Grok run.";
    if (m === "image-to-image" && imgs.length === 0) return "Image to image needs 1–5 reference images.";
    if (m === "image-to-video" && imgs.length === 0 && !v.task_id) {
      return "Image to video needs one image or a source task ID.";
    }
    if (m === "image-to-video" && imgs.length > 1) return "Image to video accepts exactly one image.";
    if (m === "image-to-video" && imgs.length > 0 && v.task_id) {
      return "Provide either an image or a task ID, not both.";
    }
    if (m === "image-to-video" && v.mode === "spicy" && imgs.length > 0) {
      return "Spicy mode is not available with uploaded images.";
    }
    if (m === "text-to-video" && v.aspect_ratio && !videoRatios.includes(v.aspect_ratio)) {
      return "Text to video only accepts 1:1, 2:3 or 3:2.";
    }
    if (m === "text-to-image" && v.aspect_ratio && !imageRatios.includes(v.aspect_ratio)) {
      return "Text to image does not accept 'auto'.";
    }
    if (m !== "upscale" && !v.prompt && m !== "image-to-video") return "A prompt is required for this mode.";
    return null;
  },
  build(v) {
    const m = v.__mode || "text-to-image";
    const imgs = list(v.image_urls);
    let model: string;
    let input: Record<string, unknown> = {};
    switch (m) {
      case "upscale":
        model = "grok-imagine/upscale";
        input = { task_id: v.task_id };
        break;
      case "image-to-video":
        model = "grok-imagine/image-to-video";
        input = compact({
          image_urls: imgs,
          task_id: v.task_id,
          index: v.task_id ? int(v.index) : undefined,
          prompt: v.prompt,
          mode: v.mode || "normal",
        });
        break;
      case "text-to-video":
        model = "grok-imagine/text-to-video";
        input = {
          prompt: v.prompt,
          aspect_ratio: v.aspect_ratio || "1:1",
          mode: v.mode || "normal",
        };
        break;
      case "image-to-image":
        model = "grok-imagine-image-2-0/image-edit";
        input = { prompt: v.prompt, aspect_ratio: v.aspect_ratio || "1:1", image_urls: imgs };
        break;
      default:
        model = "grok-imagine-image-2-0/text-to-image";
        input = { prompt: v.prompt, aspect_ratio: v.aspect_ratio || "1:1" };
    }
    return { endpoint: JOBS, poll: "jobs", payload: { model, input } };
  },
};

/* ------------------------------------------------------------------ *
 * Utility image tools
 * ------------------------------------------------------------------ */
const ideogramReframe: ModelDef = {
  id: "ideogram-reframe",
  name: "Ideogram Reframe",
  vendor: "Ideogram",
  category: "tool",
  output: "image",
  tagline: "Outpaint an existing image into a different aspect ratio.",
  tags: ["reframe", "outpaint"],
  fields: [
    {
      key: "image_url",
      label: "Image",
      kind: "media",
      placement: "input",
      accept: "image",
      required: true,
      help: "JPEG, PNG or WEBP up to 10 MB.",
    },
    {
      key: "image_size",
      label: "Target size",
      kind: "select",
      placement: "bar",
      default: "square_hd",
      choices: choices([
        ["square", "Square"],
        ["square_hd", "Square HD"],
        ["portrait_4_3", "Portrait 4:3"],
        ["portrait_16_9", "Portrait 16:9"],
        ["landscape_4_3", "Landscape 4:3"],
        ["landscape_16_9", "Landscape 16:9"],
      ]),
    },
    {
      key: "rendering_speed",
      label: "Rendering",
      kind: "segmented",
      placement: "bar",
      default: "BALANCED",
      choices: choices([
        ["TURBO", "Turbo"],
        ["BALANCED", "Balanced"],
        ["QUALITY", "Quality"],
      ]),
    },
    {
      key: "style",
      label: "Style",
      kind: "segmented",
      placement: "bar",
      default: "AUTO",
      choices: choices([
        ["AUTO", "Auto"],
        ["GENERAL", "General"],
        ["REALISTIC", "Realistic"],
        ["DESIGN", "Design"],
      ]),
    },
    {
      key: "num_images",
      label: "Variants",
      kind: "segmented",
      placement: "bar",
      default: "1",
      choices: choices([["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]]),
      chip: (val) => `${val}×`,
    },
    seedField({ default: 0 }),
  ],
  build(v) {
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: "ideogram/v3-reframe",
        input: compact({
          image_url: v.image_url,
          image_size: v.image_size || "square_hd",
          rendering_speed: v.rendering_speed || "BALANCED",
          style: v.style || "AUTO",
          num_images: v.num_images || "1",
          seed: int(v.seed) ?? 0,
        }),
      },
    };
  },
};

const topazUpscale: ModelDef = {
  id: "topaz-upscale",
  name: "Topaz Upscale",
  vendor: "Topaz Labs",
  category: "tool",
  output: "image",
  tagline: "Enhance and upscale up to 8× — max 20,000 px per side.",
  tags: ["upscale", "enhance"],
  fields: [
    {
      key: "image_url",
      label: "Image",
      kind: "media",
      placement: "input",
      accept: "image",
      required: true,
      help: "JPEG, PNG or WEBP up to 10 MB.",
    },
    {
      key: "upscale_factor",
      label: "Factor",
      kind: "segmented",
      placement: "bar",
      default: "2",
      choices: choices([
        ["1", "1×", "Enhance only"],
        ["2", "2×"],
        ["4", "4×"],
        ["8", "8×"],
      ]),
    },
  ],
  build(v) {
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: "topaz/image-upscale",
        input: { image_url: v.image_url, upscale_factor: v.upscale_factor || "2" },
      },
    };
  },
};

const recraftRemoveBg: ModelDef = {
  id: "recraft-remove-bg",
  name: "Remove Background",
  vendor: "Recraft",
  category: "tool",
  output: "image",
  tagline: "Clean cutouts with transparent backgrounds.",
  tags: ["background removal"],
  fields: [
    {
      key: "image",
      label: "Image",
      kind: "media",
      placement: "input",
      accept: "image",
      required: true,
      help: "PNG, JPG or WEBP up to 5 MB, 256–4096 px.",
    },
  ],
  build(v) {
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: { model: "recraft/remove-background", input: { image: v.image } },
    };
  },
};

export const IMAGE_MODELS: ModelDef[] = [
  nanoBanana,
  seedream,
  gptImage2,
  fluxKontext,
  flux2,
  qwenImage,
  zImage,
  midjourney,
  grokImagine,
];

export const IMAGE_TOOLS: ModelDef[] = [topazUpscale, ideogramReframe, recraftRemoveBg];

export { first };
