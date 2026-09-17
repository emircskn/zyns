import {
  RES_720_1080,
  bool,
  choices,
  inMode,
  int,
  list,
  negativePromptField,
  promptField,
  ratios,
  seedField,
} from "./common";
import { compact, type ModelDef, type Values } from "./types";

const JOBS = "/api/v1/jobs/createTask";

/* ------------------------------------------------------------------ *
 * Google Veo 3.1 (dedicated endpoint)
 * ------------------------------------------------------------------ */
const veo3: ModelDef = {
  id: "veo3",
  name: "Veo 3.1",
  vendor: "Google DeepMind",
  category: "video",
  output: "video",
  badge: "AUDIO",
  tagline: "Cinematic motion with synchronised native audio, up to native 1080p.",
  tags: ["text to video", "image to video", "native audio"],
  docs: "https://docs.kie.ai/veo3-api/quickstart",
  modes: [
    { id: "text-to-video", label: "Text to video" },
    { id: "image-to-video", label: "Image to video", hint: "1 image, or start + end frame" },
  ],
  defaultMode: "text-to-video",
  fields: [
    promptField({ help: "Up to 2,000 characters. Describe camera, subject, lighting and sound." }),
    {
      key: "imageUrls",
      label: "Frames",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 2,
      required: true,
      when: inMode("image-to-video"),
      help: "One image: the video unfolds around it. Two: first = start frame, second = end frame.",
    },
    {
      key: "model",
      label: "Quality",
      kind: "segmented",
      placement: "bar",
      default: "veo3",
      choices: choices([
        ["veo3", "Quality", "Full Veo 3 model"],
        ["veo3_fast", "Fast", "Cost-efficient, quicker turnaround"],
      ]),
    },
    {
      key: "aspectRatio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "16:9",
      choices: ratios("16:9", "9:16", "Auto"),
      help: "Only 16:9 can be pulled at 1080p afterwards.",
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
      key: "enableFallback",
      label: "Content-policy fallback",
      kind: "toggle",
      placement: "panel",
      group: "Advanced",
      default: false,
      help: "Retries with a backup model when the prompt trips moderation. Fallback results cannot be upgraded to 1080p.",
    },
    {
      key: "watermark",
      label: "Watermark text",
      kind: "text",
      placement: "panel",
      group: "Output",
    },
    seedField({
      key: "seeds",
      min: 10000,
      max: 99999,
      help: "Veo accepts seeds between 10000 and 99999.",
    }),
  ],
  build(v) {
    return {
      endpoint: "/api/v1/veo/generate",
      poll: "veo",
      payload: compact({
        prompt: v.prompt,
        model: v.model || "veo3",
        aspectRatio: v.aspectRatio || "16:9",
        imageUrls: v.__mode === "image-to-video" ? list(v.imageUrls) : undefined,
        watermark: v.watermark,
        seeds: int(v.seeds),
        enableFallback: bool(v.enableFallback),
        enableTranslation: v.enableTranslation !== false,
      }),
    };
  },
};

/* ------------------------------------------------------------------ *
 * ByteDance Seedance 2.5
 * ------------------------------------------------------------------ */
const seedance: ModelDef = {
  id: "seedance",
  name: "Seedance 2.5",
  vendor: "ByteDance",
  category: "video",
  output: "video",
  badge: "AUDIO",
  tagline: "Multimodal references, first/last-frame control and native audio.",
  tags: ["text to video", "image to video", "reference to video", "native audio"],
  docs: "https://docs.kie.ai/market/bytedance/seedance-2-5",
  modes: [
    { id: "text-to-video", label: "Text to video" },
    { id: "image-to-video", label: "Image to video", hint: "First / last frame" },
    { id: "reference-to-video", label: "Reference", hint: "Images, video and audio references" },
  ],
  defaultMode: "text-to-video",
  fields: [
    promptField(),
    {
      key: "first_frame_url",
      label: "First frame",
      kind: "media",
      placement: "input",
      accept: "image",
      required: true,
      when: inMode("image-to-video"),
    },
    {
      key: "last_frame_url",
      label: "Last frame",
      kind: "media",
      placement: "input",
      accept: "image",
      when: inMode("image-to-video"),
      help: "Optional. Requires a first frame.",
    },
    {
      key: "reference_image_urls",
      label: "Reference images",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 8,
      when: inMode("reference-to-video"),
    },
    {
      key: "reference_video_urls",
      label: "Reference videos",
      kind: "images",
      placement: "input",
      accept: "video",
      maxItems: 3,
      when: inMode("reference-to-video"),
    },
    {
      key: "reference_audio_urls",
      label: "Reference audio",
      kind: "images",
      placement: "input",
      accept: "audio",
      maxItems: 3,
      when: inMode("reference-to-video"),
    },
    {
      key: "resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "720p",
      choices: choices([["480p", "480p"], ["720p", "720p"], ["1080p", "1080p"]]),
    },
    {
      key: "aspect_ratio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "16:9",
      choices: ratios("16:9", "9:16", "1:1", "4:3", "3:4", "21:9"),
    },
    {
      key: "duration",
      label: "Duration",
      kind: "slider",
      placement: "bar",
      default: 5,
      min: 3,
      max: 15,
      step: 1,
      chip: (val) => `${val}s`,
    },
    {
      key: "generate_audio",
      label: "Native audio",
      kind: "toggle",
      placement: "bar",
      default: false,
      help: "Generates dialogue, effects and ambience with the video.",
    },
    {
      key: "return_last_frame",
      label: "Return last frame",
      kind: "toggle",
      placement: "panel",
      group: "Output",
      default: false,
      help: "Hands back the closing frame so you can chain another shot from it.",
    },
    {
      key: "extension_task_id",
      label: "Continue from task",
      kind: "text",
      placement: "panel",
      group: "Advanced",
      placeholder: "Previous Seedance task ID",
      help: "Experimental: carries semantic context forward. It does not guarantee frame-to-frame continuity.",
    },
  ],
  validate(v) {
    if (v.__mode === "image-to-video" && v.last_frame_url && !v.first_frame_url) {
      return "A last frame needs a first frame.";
    }
    if (
      v.__mode === "reference-to-video" &&
      list(v.reference_image_urls).length === 0 &&
      list(v.reference_video_urls).length === 0 &&
      list(v.reference_audio_urls).length === 0
    ) {
      return "Reference mode needs at least one reference image, video or audio file.";
    }
    return null;
  },
  build(v) {
    const m = v.__mode;
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: "bytedance/seedance-2-5",
        input: compact({
          prompt: v.prompt,
          first_frame_url: m === "image-to-video" ? v.first_frame_url : undefined,
          last_frame_url: m === "image-to-video" ? v.last_frame_url : undefined,
          reference_image_urls: m === "reference-to-video" ? list(v.reference_image_urls) : undefined,
          reference_video_urls: m === "reference-to-video" ? list(v.reference_video_urls) : undefined,
          reference_audio_urls: m === "reference-to-video" ? list(v.reference_audio_urls) : undefined,
          resolution: v.resolution,
          aspect_ratio: v.aspect_ratio,
          duration: int(v.duration),
          generate_audio: bool(v.generate_audio),
          return_last_frame: bool(v.return_last_frame) || undefined,
          extension_task_id: v.extension_task_id,
        }),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Kling 3.0
 * ------------------------------------------------------------------ */
const kling: ModelDef = {
  id: "kling",
  name: "Kling 3.0",
  vendor: "Kuaishou",
  category: "video",
  output: "video",
  badge: "MULTI-SHOT",
  tagline: "Multi-shot storytelling with native audio and consistent characters.",
  tags: ["text to video", "image to video", "native audio", "multi shot"],
  modes: [
    { id: "text-to-video", label: "Text to video" },
    { id: "image-to-video", label: "Image to video", hint: "Start / end frame" },
    { id: "multi-shot", label: "Multi-shot", hint: "Several scenes in one run" },
  ],
  defaultMode: "text-to-video",
  fields: [
    promptField({
      help: "For dialogue use the [Character name, voice style] format inside the prompt.",
    }),
    {
      key: "image_urls",
      label: "Frames",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 2,
      required: true,
      when: inMode("image-to-video"),
      help: "First image = start frame, second = end frame.",
    },
    {
      key: "multi_prompt",
      label: "Shots",
      kind: "shots",
      placement: "panel",
      group: "Multi-shot",
      when: inMode("multi-shot"),
      required: true,
      help: "Each shot has its own prompt and a duration of 1–12 seconds.",
    },
    {
      key: "kling_elements",
      label: "Elements",
      kind: "elements",
      placement: "panel",
      group: "Consistency",
      help: "Named characters or objects with reference media, kept consistent across shots.",
    },
    {
      key: "duration",
      label: "Duration",
      kind: "slider",
      placement: "bar",
      default: 5,
      min: 3,
      max: 15,
      step: 1,
      when: (v) => v.__mode !== "multi-shot",
      chip: (val) => `${val}s`,
    },
    {
      key: "aspect_ratio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "16:9",
      choices: ratios("16:9", "9:16", "1:1"),
      when: inMode("text-to-video", "multi-shot"),
    },
    {
      key: "mode",
      label: "Quality",
      kind: "segmented",
      placement: "bar",
      default: "std",
      choices: choices([
        ["std", "Standard", "Faster and cheaper"],
        ["pro", "Pro", "Professional quality"],
      ]),
    },
    {
      key: "sound",
      label: "Native audio",
      kind: "toggle",
      placement: "bar",
      default: false,
      help: "Multilingual speech, effects and ambience. Costs 2× credits.",
    },
  ],
  validate(v) {
    if (v.__mode === "multi-shot" && list(v.multi_prompt).length === 0) {
      return "Multi-shot mode needs at least one shot.";
    }
    return null;
  },
  creditHint(v) {
    return bool(v.sound) ? "2× credits (audio on)" : undefined;
  },
  build(v) {
    const multi = v.__mode === "multi-shot";
    const input: Record<string, unknown> = compact({
      prompt: v.prompt,
      duration: multi ? undefined : String(int(v.duration) ?? 5),
      aspect_ratio: v.__mode === "image-to-video" ? undefined : v.aspect_ratio || "16:9",
      mode: v.mode || "std",
      sound: bool(v.sound),
      image_urls: v.__mode === "image-to-video" ? list(v.image_urls) : undefined,
      kling_elements: list(v.kling_elements),
    });
    if (multi) {
      input.multi_shots = true;
      input.multi_prompt = list(v.multi_prompt);
    }
    return { endpoint: JOBS, poll: "jobs", payload: { model: "kling-3.0/video", input } };
  },
};

/* ------------------------------------------------------------------ *
 * MiniMax Hailuo 03 (H3)
 * ------------------------------------------------------------------ */
const hailuo: ModelDef = {
  id: "hailuo",
  name: "Hailuo 03",
  vendor: "MiniMax",
  category: "video",
  output: "video",
  tagline: "MiniMax H3 — text, frame-guided and multimodal reference video.",
  tags: ["text to video", "image to video", "reference to video"],
  docs: "https://docs.kie.ai/market/minimax-h3/reference-to-video",
  modes: [
    { id: "text-to-video", label: "Text to video" },
    { id: "image-to-video", label: "Image to video", hint: "First / last frame" },
    { id: "reference-to-video", label: "Reference", hint: "Up to 9 images, 3 videos, 3 audio" },
  ],
  defaultMode: "text-to-video",
  fields: [
    promptField(),
    {
      key: "imageUrl",
      label: "First frame",
      kind: "media",
      placement: "input",
      accept: "image",
      required: true,
      when: inMode("image-to-video"),
    },
    {
      key: "endImageUrl",
      label: "Last frame",
      kind: "media",
      placement: "input",
      accept: "image",
      when: inMode("image-to-video"),
      help: "Optional.",
    },
    {
      key: "referenceImageUrls",
      label: "Reference images",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 9,
      when: inMode("reference-to-video"),
    },
    {
      key: "referenceVideoUrls",
      label: "Reference videos",
      kind: "images",
      placement: "input",
      accept: "video",
      maxItems: 3,
      when: inMode("reference-to-video"),
    },
    {
      key: "referenceAudioUrls",
      label: "Reference audio",
      kind: "images",
      placement: "input",
      accept: "audio",
      maxItems: 3,
      when: inMode("reference-to-video"),
    },
    {
      key: "duration",
      label: "Duration",
      kind: "slider",
      placement: "bar",
      default: 5,
      min: 4,
      max: 15,
      step: 1,
      chip: (val) => `${val}s`,
    },
    {
      key: "aspectRatio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "16:9",
      choices: ratios("adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"),
      when: (v) => v.__mode !== "image-to-video",
      help: "'adaptive' is reference mode only. Image-to-video inherits the frame's ratio.",
    },
    {
      key: "resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "768p",
      choices: choices([["768p", "768p", "16 credits per second"]]),
      when: inMode("reference-to-video"),
    },
  ],
  validate(v) {
    const m = v.__mode;
    if (m === "text-to-video" && !v.aspectRatio) return "Text to video needs an aspect ratio.";
    if (m === "text-to-video" && v.aspectRatio === "adaptive") {
      return "'adaptive' is only supported in reference mode.";
    }
    if (
      m === "reference-to-video" &&
      list(v.referenceImageUrls).length === 0 &&
      list(v.referenceVideoUrls).length === 0 &&
      list(v.referenceAudioUrls).length === 0
    ) {
      return "Reference mode needs at least one reference file.";
    }
    return null;
  },
  creditHint(v) {
    if (v.__mode === "reference-to-video" && v.resolution === "768p") {
      const d = int(v.duration) ?? 5;
      return `${d * 16} credits`;
    }
    return undefined;
  },
  build(v) {
    const m = v.__mode;
    const input: Record<string, unknown> = { prompt: v.prompt, duration: int(v.duration) ?? 5 };
    let model: string;
    if (m === "image-to-video") {
      model = "minimax-h3/image-to-video";
      input.first_frame_url = v.imageUrl;
      if (v.endImageUrl) input.last_frame_url = v.endImageUrl;
    } else if (m === "reference-to-video") {
      model = "minimax-h3/reference-to-video";
      const imgs = list(v.referenceImageUrls);
      const vids = list(v.referenceVideoUrls);
      const auds = list(v.referenceAudioUrls);
      if (imgs.length) input.reference_image_urls = imgs;
      if (vids.length) input.reference_video_urls = vids;
      if (auds.length) input.reference_audio_urls = auds;
      if (v.aspectRatio) input.aspect_ratio = v.aspectRatio;
      if (v.resolution) input.resolution = v.resolution;
    } else {
      model = "minimax-h3/text-to-video";
      input.aspect_ratio = v.aspectRatio;
    }
    return { endpoint: JOBS, poll: "jobs", payload: { model, input } };
  },
};

/* ------------------------------------------------------------------ *
 * Wan 2.7 — Alibaba
 * ------------------------------------------------------------------ */
const wan: ModelDef = {
  id: "wan",
  name: "Wan 2.7",
  vendor: "Alibaba",
  category: "video",
  output: "video",
  tagline: "Four modes in one model, including audio-driven faces and video editing.",
  tags: ["text to video", "image to video", "reference to video", "video editing"],
  modes: [
    { id: "text-to-video", label: "Text to video" },
    { id: "image-to-video", label: "Image to video" },
    { id: "reference-to-video", label: "Reference" },
    { id: "video-edit", label: "Video edit" },
  ],
  defaultMode: "text-to-video",
  fields: [
    promptField({ help: "Up to 5,000 characters." }),
    {
      key: "audio_url",
      label: "Audio track",
      kind: "media",
      placement: "input",
      accept: "audio",
      when: inMode("text-to-video"),
      help: "Optional soundtrack for text-to-video.",
    },
    {
      key: "first_frame_url",
      label: "First frame",
      kind: "media",
      placement: "input",
      accept: "image",
      when: inMode("image-to-video"),
    },
    {
      key: "last_frame_url",
      label: "Last frame",
      kind: "media",
      placement: "input",
      accept: "image",
      when: inMode("image-to-video"),
    },
    {
      key: "first_clip_url",
      label: "First clip",
      kind: "media",
      placement: "input",
      accept: "video",
      when: inMode("image-to-video"),
      help: "Continue from an existing clip instead of a still frame.",
    },
    {
      key: "driving_audio_url",
      label: "Driving audio",
      kind: "media",
      placement: "input",
      accept: "audio",
      when: inMode("image-to-video"),
      help: "Drives facial expressions and lip movement.",
    },
    {
      key: "reference_image",
      label: "Reference images",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 5,
      when: inMode("reference-to-video"),
    },
    {
      key: "reference_video",
      label: "Reference videos",
      kind: "images",
      placement: "input",
      accept: "video",
      maxItems: 5,
      when: inMode("reference-to-video"),
    },
    {
      key: "reference_voice",
      label: "Voice reference",
      kind: "media",
      placement: "input",
      accept: "audio",
      when: inMode("reference-to-video"),
    },
    {
      key: "first_frame",
      label: "First frame",
      kind: "media",
      placement: "input",
      accept: "image",
      when: inMode("reference-to-video"),
    },
    {
      key: "video_url_edit",
      label: "Source video",
      kind: "media",
      placement: "input",
      accept: "video",
      required: true,
      when: inMode("video-edit"),
    },
    {
      key: "reference_image_edit",
      label: "Reference image",
      kind: "media",
      placement: "input",
      accept: "image",
      when: inMode("video-edit"),
    },
    {
      key: "audio_setting",
      label: "Audio handling",
      kind: "segmented",
      placement: "bar",
      default: "auto",
      choices: choices([
        ["auto", "Auto", "Regenerate the soundtrack"],
        ["origin", "Original", "Keep the source audio"],
      ]),
      when: inMode("video-edit"),
    },
    {
      key: "resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "1080p",
      choices: RES_720_1080,
    },
    {
      key: "ratio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "16:9",
      choices: ratios("16:9", "9:16", "1:1", "4:3", "3:4"),
    },
    {
      key: "duration",
      label: "Duration",
      kind: "slider",
      placement: "bar",
      default: 5,
      min: 2,
      max: 15,
      step: 1,
      chip: (val) => `${val}s`,
    },
    negativePromptField(),
    {
      key: "prompt_extend",
      label: "Prompt rewriting",
      kind: "toggle",
      placement: "panel",
      group: "Prompting",
      default: true,
      help: "Lets an LLM expand your prompt before generation.",
    },
    {
      key: "watermark",
      label: "Watermark",
      kind: "toggle",
      placement: "panel",
      group: "Output",
      default: false,
    },
    {
      key: "nsfw_checker",
      label: "NSFW filter",
      kind: "toggle",
      placement: "panel",
      group: "Safety",
      default: false,
    },
    seedField(),
  ],
  validate(v) {
    const m = v.__mode;
    if (m === "image-to-video" && !v.first_frame_url && !v.last_frame_url && !v.first_clip_url) {
      return "Image to video needs a first frame, last frame or first clip.";
    }
    if (m === "reference-to-video" && list(v.reference_image).length === 0 && list(v.reference_video).length === 0) {
      return "Reference mode needs at least one reference image or video.";
    }
    if (m === "video-edit" && !v.video_url_edit) return "Video edit needs a source video.";
    return null;
  },
  build(v) {
    const m = (v.__mode || "text-to-video") as string;
    const model = {
      "text-to-video": "wan/2-7-text-to-video",
      "image-to-video": "wan/2-7-image-to-video",
      "reference-to-video": "wan/2-7-r2v",
      "video-edit": "wan/2-7-videoedit",
    }[m] as string;
    const input: Record<string, unknown> = compact({
      prompt: v.prompt,
      negative_prompt: v.negative_prompt,
      audio_url: m === "text-to-video" ? v.audio_url : undefined,
      first_frame_url: m === "image-to-video" ? v.first_frame_url : undefined,
      last_frame_url: m === "image-to-video" ? v.last_frame_url : undefined,
      first_clip_url: m === "image-to-video" ? v.first_clip_url : undefined,
      driving_audio_url: m === "image-to-video" ? v.driving_audio_url : undefined,
      reference_image:
        m === "reference-to-video"
          ? list(v.reference_image)
          : m === "video-edit"
            ? v.reference_image_edit
            : undefined,
      reference_video: m === "reference-to-video" ? list(v.reference_video) : undefined,
      reference_voice: m === "reference-to-video" ? v.reference_voice : undefined,
      first_frame: m === "reference-to-video" ? v.first_frame : undefined,
      video_url: m === "video-edit" ? v.video_url_edit : undefined,
      audio_setting: m === "video-edit" ? v.audio_setting : undefined,
      seed: int(v.seed),
    });
    input.resolution = v.resolution || "1080p";
    input.ratio = v.ratio || "16:9";
    input.duration = int(v.duration) ?? 5;
    input.prompt_extend = v.prompt_extend !== false;
    input.watermark = bool(v.watermark);
    input.nsfw_checker = bool(v.nsfw_checker);
    return { endpoint: JOBS, poll: "jobs", payload: { model, input } };
  },
};

/* ------------------------------------------------------------------ *
 * HappyHorse 1.0
 * ------------------------------------------------------------------ */
const happyhorse: ModelDef = {
  id: "happyhorse",
  name: "HappyHorse 1.0",
  vendor: "Alibaba",
  category: "video",
  output: "video",
  tagline: "Long-form generation with up to nine reference images.",
  tags: ["text to video", "image to video", "reference to video", "video editing"],
  modes: [
    { id: "text-to-video", label: "Text to video" },
    { id: "image-to-video", label: "Image to video" },
    { id: "reference-to-video", label: "Reference", hint: "Up to 9 images" },
    { id: "video-edit", label: "Video edit" },
  ],
  defaultMode: "text-to-video",
  fields: [
    promptField({ help: "Up to 5,000 characters." }),
    {
      key: "image_urls",
      label: "Input image",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 1,
      required: true,
      when: inMode("image-to-video"),
    },
    {
      key: "reference_image",
      label: "Reference images",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 9,
      required: true,
      when: inMode("reference-to-video"),
    },
    {
      key: "video_url",
      label: "Source video",
      kind: "media",
      placement: "input",
      accept: "video",
      required: true,
      when: inMode("video-edit"),
    },
    {
      key: "reference_image_edit",
      label: "Edit references",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 5,
      when: inMode("video-edit"),
    },
    {
      key: "audio_setting",
      label: "Audio handling",
      kind: "segmented",
      placement: "bar",
      default: "auto",
      choices: choices([["auto", "Auto"], ["origin", "Original"]]),
      when: inMode("video-edit"),
    },
    {
      key: "resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "1080p",
      choices: RES_720_1080,
    },
    {
      key: "aspect_ratio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "16:9",
      choices: ratios("16:9", "9:16", "1:1", "4:3", "3:4"),
    },
    {
      key: "duration",
      label: "Duration",
      kind: "slider",
      placement: "bar",
      default: 5,
      min: 3,
      max: 15,
      step: 1,
      chip: (val) => `${val}s`,
    },
    seedField(),
  ],
  build(v) {
    const m = (v.__mode || "text-to-video") as string;
    const model = {
      "text-to-video": "happyhorse/text-to-video",
      "image-to-video": "happyhorse/image-to-video",
      "reference-to-video": "happyhorse/reference-to-video",
      "video-edit": "happyhorse/video-edit",
    }[m] as string;
    const input: Record<string, unknown> = compact({
      prompt: v.prompt,
      image_urls: m === "image-to-video" ? list(v.image_urls) : undefined,
      reference_image: m === "reference-to-video" ? list(v.reference_image) : undefined,
      video_url: m === "video-edit" ? v.video_url : undefined,
      reference_image_edit: m === "video-edit" ? list(v.reference_image_edit) : undefined,
      audio_setting: m === "video-edit" ? v.audio_setting : undefined,
      seed: int(v.seed),
    });
    input.resolution = v.resolution || "1080p";
    input.aspect_ratio = v.aspect_ratio || "16:9";
    input.duration = int(v.duration) ?? 5;
    return { endpoint: JOBS, poll: "jobs", payload: { model, input } };
  },
};

/* ------------------------------------------------------------------ *
 * Runway Aleph (dedicated endpoint)
 * ------------------------------------------------------------------ */
const runwayAleph: ModelDef = {
  id: "runway-aleph",
  name: "Runway Aleph",
  vendor: "Runway",
  category: "video",
  output: "video",
  tagline: "Prompt-driven video-to-video transformation of an existing clip.",
  tags: ["video editing", "style transfer"],
  docs: "https://docs.kie.ai/runway-api/quickstart",
  fields: [
    {
      key: "videoUrl",
      label: "Source video",
      kind: "media",
      placement: "input",
      accept: "video",
      required: true,
    },
    {
      key: "referenceImage",
      label: "Style reference",
      kind: "media",
      placement: "input",
      accept: "image",
      help: "Optional image that guides the look of the result.",
    },
    promptField({
      label: "Transformation",
      placeholder: "Describe how the clip should change…",
      help: "Up to 1,000 characters.",
    }),
    {
      key: "aspectRatio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "16:9",
      choices: ratios("16:9", "9:16", "4:3", "3:4", "1:1", "21:9"),
    },
    {
      key: "waterMark",
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
    seedField({ min: 1, max: 999999 }),
  ],
  build(v) {
    return {
      endpoint: "/api/v1/aleph/generate",
      poll: "aleph",
      payload: compact({
        prompt: v.prompt,
        videoUrl: v.videoUrl,
        waterMark: v.waterMark || "",
        uploadCn: bool(v.uploadCn),
        aspectRatio: v.aspectRatio || "16:9",
        seed: int(v.seed),
        referenceImage: v.referenceImage,
      }),
    };
  },
};

/* ------------------------------------------------------------------ *
 * Gemini Omni — video, characters and voices
 * ------------------------------------------------------------------ */
const geminiOmni: ModelDef = {
  id: "gemini-omni",
  name: "Gemini Omni",
  vendor: "Google",
  category: "video",
  output: "video",
  badge: "4K",
  tagline: "Reusable characters and voices across videos, up to 4K.",
  tags: ["text to video", "character", "voice"],
  modes: [
    { id: "video", label: "Video" },
    { id: "character", label: "Create character", hint: "Reusable identity" },
    { id: "audio", label: "Create voice", hint: "Reusable voice" },
  ],
  defaultMode: "video",
  fields: [
    promptField({ when: inMode("video"), help: "Up to 20,000 characters." }),
    {
      key: "image_urls",
      label: "Reference images",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 7,
      when: inMode("video"),
      help: "Images, clips and characters share a budget of 7 slots (a clip counts as 2).",
    },
    {
      key: "video_list",
      label: "Source clip",
      kind: "clips",
      placement: "panel",
      group: "Inputs",
      when: inMode("video"),
      help: "One clip with a start and end time in seconds.",
    },
    {
      key: "character_ids",
      label: "Character IDs",
      kind: "images",
      placement: "panel",
      group: "Inputs",
      maxItems: 3,
      when: inMode("video"),
      help: "IDs returned by the Create character mode.",
    },
    {
      key: "audio_ids",
      label: "Voice IDs",
      kind: "images",
      placement: "panel",
      group: "Inputs",
      maxItems: 3,
      when: inMode("video"),
      help: "IDs returned by the Create voice mode.",
    },
    {
      key: "duration",
      label: "Duration",
      kind: "segmented",
      placement: "bar",
      default: "8",
      choices: choices([["4", "4s"], ["6", "6s"], ["8", "8s"], ["10", "10s"]]),
      when: inMode("video"),
    },
    {
      key: "aspect_ratio",
      label: "Aspect ratio",
      kind: "ratio",
      placement: "bar",
      default: "16:9",
      choices: ratios("16:9", "9:16"),
      when: inMode("video"),
    },
    {
      key: "resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "1080p",
      choices: choices([["720p", "720p"], ["1080p", "1080p"], ["4k", "4K"]]),
      when: inMode("video"),
    },
    seedField({ when: inMode("video") }),
    {
      key: "descriptions",
      label: "Character description",
      kind: "textarea",
      placement: "prompt",
      required: true,
      when: inMode("character"),
      placeholder: "Describe the character's look, build, clothing and manner…",
    },
    {
      key: "character_image",
      label: "Character image",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 1,
      minItems: 1,
      required: true,
      when: inMode("character"),
      help: "Exactly one reference image.",
    },
    {
      key: "character_name",
      label: "Character name",
      kind: "text",
      placement: "bar",
      when: inMode("character"),
    },
    {
      key: "audio_id",
      label: "Audio ID",
      kind: "text",
      placement: "bar",
      required: true,
      when: inMode("audio"),
      help: "The uploaded audio sample this voice is built from.",
    },
    {
      key: "name",
      label: "Voice name",
      kind: "text",
      placement: "bar",
      required: true,
      when: inMode("audio"),
    },
    {
      key: "voice_description",
      label: "Voice description",
      kind: "textarea",
      placement: "prompt",
      when: inMode("audio"),
      placeholder: "Warm, mid-range, unhurried, slight rasp…",
    },
    {
      key: "example_dialogue",
      label: "Example line",
      kind: "text",
      placement: "panel",
      group: "Voice",
      when: inMode("audio"),
      help: "Up to 120 characters.",
    },
  ],
  validate(v) {
    const m = v.__mode;
    if (m === "character") {
      if (!v.descriptions) return "A character needs a description.";
      if (list(v.character_image).length !== 1) return "A character needs exactly one reference image.";
    }
    if (m === "audio" && (!v.audio_id || !v.name)) return "A voice needs an audio ID and a name.";
    if (m === "video") {
      const clip = list(v.video_list)[0] as { start?: number; ends?: number } | undefined;
      const quota = list(v.image_urls).length + (clip ? 2 : 0) + list(v.character_ids).length;
      if (quota > 7) return "Images, clips and characters together may not exceed 7 slots.";
      if (clip && !(Number(clip.ends) > Number(clip.start))) return "The clip's end time must be after its start.";
      if (!v.prompt) return "A prompt is required.";
    }
    return null;
  },
  build(v) {
    const m = v.__mode || "video";
    if (m === "audio") {
      return {
        endpoint: "/api/v1/omni/audio/create",
        poll: "jobs",
        payload: compact({
          audio_id: v.audio_id,
          name: v.name,
          voice_description: v.voice_description,
          example_dialogue: v.example_dialogue,
        }),
      };
    }
    if (m === "character") {
      return {
        endpoint: "/api/v1/omni/character/create",
        poll: "jobs",
        payload: compact({
          descriptions: v.descriptions,
          image_urls: list(v.character_image),
          audio_ids: list(v.audio_ids),
          character_name: v.character_name,
        }),
      };
    }
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: "gemini-omni-video",
        input: compact({
          prompt: v.prompt,
          image_urls: list(v.image_urls),
          audio_ids: list(v.audio_ids),
          video_list: list(v.video_list),
          character_ids: list(v.character_ids),
          duration: v.duration,
          aspect_ratio: v.aspect_ratio,
          resolution: v.resolution,
          seed: int(v.seed),
        }),
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * Avatars and lip sync
 * ------------------------------------------------------------------ */
const omnihuman: ModelDef = {
  id: "omnihuman",
  name: "OmniHuman 1.5",
  vendor: "ByteDance",
  category: "video",
  output: "video",
  tagline: "Animate a portrait, pet or character from a single image plus audio.",
  tags: ["talking avatar", "lip sync"],
  fields: [
    {
      key: "image_url",
      label: "Portrait",
      kind: "media",
      placement: "input",
      accept: "image",
      required: true,
    },
    {
      key: "audio_url",
      label: "Audio",
      kind: "media",
      placement: "input",
      accept: "audio",
      required: true,
      help: "Drives the performance. Keep it under 60 seconds.",
    },
    {
      key: "mask_url",
      label: "Subject masks",
      kind: "images",
      placement: "input",
      accept: "image",
      maxItems: 5,
      help: "Optional masks isolating the subject.",
    },
    promptField({ required: false, help: "Optional direction for expression and motion." }),
    {
      key: "output_resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "1080",
      choices: choices([["720", "720p"], ["1080", "1080p"]]),
    },
    {
      key: "pe_fast_mode",
      label: "Fast mode",
      kind: "toggle",
      placement: "bar",
      default: false,
      help: "Trades some fidelity for a quicker result.",
    },
    seedField({ default: -1, min: -1 }),
  ],
  build(v) {
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: "omnihuman-1-5",
        input: compact({
          image_url: v.image_url,
          audio_url: v.audio_url,
          mask_url: list(v.mask_url),
          prompt: v.prompt,
          output_resolution: v.output_resolution || "1080",
          pe_fast_mode: bool(v.pe_fast_mode),
          seed: int(v.seed) ?? -1,
        }),
      },
    };
  },
};

const klingAvatar: ModelDef = {
  id: "kling-avatar",
  name: "Kling Avatar",
  vendor: "Kuaishou",
  category: "video",
  output: "video",
  tagline: "Talking avatar from a portrait and an audio track.",
  tags: ["talking avatar", "lip sync"],
  fields: [
    {
      key: "image_url",
      label: "Portrait",
      kind: "media",
      placement: "input",
      accept: "image",
      required: true,
      help: "JPEG, PNG or WEBP up to 10 MB.",
    },
    {
      key: "audio_url",
      label: "Audio",
      kind: "media",
      placement: "input",
      accept: "audio",
      required: true,
      help: "MP3, WAV, AAC, MP4 or OGG up to 10 MB.",
    },
    promptField({
      required: true,
      placeholder: "A young woman speaking warmly to camera in a bright studio…",
      help: "Guides emotion, expression and scene. Up to 1,500 characters.",
    }),
    {
      key: "quality",
      label: "Quality",
      kind: "segmented",
      placement: "bar",
      default: "standard",
      choices: choices([
        ["standard", "Standard", "720p, faster"],
        ["pro", "Pro", "1080p, higher fidelity"],
      ]),
    },
  ],
  build(v) {
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: v.quality === "pro" ? "kling/ai-avatar-v1-pro" : "kling/v1-avatar-standard",
        input: { image_url: v.image_url, audio_url: v.audio_url, prompt: v.prompt },
      },
    };
  },
};

const infinitalk: ModelDef = {
  id: "infinitalk",
  name: "InfiniTalk",
  vendor: "InfiniTalk",
  category: "video",
  output: "video",
  tagline: "Long-form lip sync from a portrait and an audio file.",
  tags: ["lip sync", "talking avatar"],
  fields: [
    {
      key: "image_url",
      label: "Portrait",
      kind: "media",
      placement: "input",
      accept: "image",
      required: true,
    },
    {
      key: "audio_url",
      label: "Audio",
      kind: "media",
      placement: "input",
      accept: "audio",
      required: true,
    },
    promptField({
      required: true,
      placeholder: "A young woman talking on a podcast…",
      help: "Up to 1,500 characters.",
    }),
    {
      key: "resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "480p",
      choices: choices([
        ["480p", "480p", "Faster, cheaper"],
        ["720p", "720p", "Higher quality"],
      ]),
    },
    seedField({ min: 10000, max: 1000000 }),
  ],
  build(v) {
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: "infinitalk/from-audio",
        input: compact({
          image_url: v.image_url,
          audio_url: v.audio_url,
          prompt: v.prompt,
          resolution: v.resolution || "480p",
          seed: int(v.seed),
        }),
      },
    };
  },
};

const wanAnimate: ModelDef = {
  id: "wan-animate",
  name: "Wan Animate",
  vendor: "Alibaba",
  category: "video",
  output: "video",
  tagline: "Transfer motion onto a character, or swap the character in a clip.",
  tags: ["character animation", "character replacement"],
  fields: [
    {
      key: "video_url",
      label: "Reference video",
      kind: "media",
      placement: "input",
      accept: "video",
      required: true,
      help: "MP4, MOV or MKV up to 10 MB and 30 seconds.",
    },
    {
      key: "image_url",
      label: "Character image",
      kind: "media",
      placement: "input",
      accept: "image",
      required: true,
      help: "Resized and centre-cropped to the video's aspect ratio.",
    },
    {
      key: "mode",
      label: "Mode",
      kind: "segmented",
      placement: "bar",
      default: "animate",
      choices: choices([
        ["animate", "Animate", "Motion and expressions move onto your image"],
        ["replace", "Replace", "Your character replaces the one in the video"],
      ]),
    },
    {
      key: "resolution",
      label: "Resolution",
      kind: "segmented",
      placement: "bar",
      default: "480p",
      choices: choices([["480p", "480p"], ["580p", "580p"], ["720p", "720p"]]),
    },
  ],
  build(v) {
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: v.mode === "replace" ? "wan/2-2-animate-replace" : "wan/2-2-animate-move",
        input: {
          video_url: v.video_url,
          image_url: v.image_url,
          resolution: v.resolution || "480p",
        },
      },
    };
  },
};

export const VIDEO_MODELS: ModelDef[] = [
  veo3,
  seedance,
  kling,
  hailuo,
  wan,
  happyhorse,
  geminiOmni,
  runwayAleph,
  wanAnimate,
  omnihuman,
  klingAvatar,
  infinitalk,
];

export type { Values };
