/**
 * What a run will roughly cost, before it is sent.
 *
 * KIE's API cannot quote a task, so this reads a snapshot of the price list
 * its pricing page shows (generated/pricing.json, from
 * scripts/kie-catalog/pricing.py). That list names models and options in
 * free text ("bytedance/seedance-2-5, 720p no video", 63 per second), so
 * each model below says which row its request lands on. A model, or a set
 * of options, the list has no row for gets no estimate rather than a guess;
 * and a price can drift from the snapshot, which is why the studio shows
 * the estimate with "≈" and the charge KIE reports afterwards as the fact.
 */
import prices from "./generated/pricing.json";
import { getSpec } from "./auto";
import type { ModelDef, Values } from "./types";

interface Row {
  /** The model as the price list names it, in folded words. */
  m: string;
  /** The options the price applies to, in folded words. */
  d: string;
  /** Credits per unit. */
  c: number;
  /** "per second", "per image", "per video", "per request"… */
  u: string;
}

const ROWS = prices as Row[];

/** Lowercase words, the way pricing.py folds the list. */
function fold(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
}

/**
 * The row for a model whose options mention every token. Where several
 * match ("text to image" is also inside "text to image quality"), the one
 * with the fewest other words is the plain case.
 */
function row(model: string, ...tokens: Array<string | undefined>): Row | undefined {
  if (tokens.some((t) => t === undefined)) return undefined;
  const name = fold(model);
  const wanted = (tokens as string[]).map((t) => ` ${fold(t)} `);
  let best: Row | undefined;
  for (const r of ROWS) {
    if (r.m !== name) continue;
    const padded = ` ${r.d} `;
    if (!wanted.every((t) => padded.includes(t))) continue;
    if (!best || r.d.length < best.d.length) best = r;
  }
  return best;
}

interface Amount {
  /** Seconds of output, for prices per second. */
  seconds?: number;
  /** Items made in one request, for prices per image. */
  count?: number;
}

/** A row's price for this much output; undefined when the size is unknown. */
function charge(r: Row | undefined, { seconds, count }: Amount = {}): number | undefined {
  if (!r) return undefined;
  if (r.u.includes("second")) return seconds && seconds > 0 ? r.c * seconds : undefined;
  if (r.u.includes("image") && count) return r.c * count;
  return r.c;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Input = Record<string, any>;
type Rule = (i: Input) => number | undefined;

const lc = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : String(v).toLowerCase());
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const any = (v: unknown) => (Array.isArray(v) ? v.length > 0 : !!v);
/** "5" → "5.0s", the way the per-video rows spell a length. */
const secs = (v: unknown) => (num(v) ? `${num(v)!.toFixed(1)}s` : undefined);
const withAudio = (on: unknown) => (on ? "with audio" : "without audio");

/* ------------------------------------------------------------------ *
 * Rules, by the model id the request is sent with
 * ------------------------------------------------------------------ */

const perImage = (model: string, ...tokens: Array<string | undefined>): Rule => (i) =>
  charge(row(model, ...tokens), { count: num(i.num_images) ?? num(i.n) ?? 1 });

const seedance = (name: string): Rule => (i) =>
  charge(
    row(name, lc(i.resolution), any(i.reference_video_urls) ? "with video" : "no video"),
    { seconds: num(i.duration) },
  );

const perSecond = (name: string, ...tokens: Array<string | ((i: Input) => string | undefined)>): Rule => (i) =>
  charge(row(name, ...tokens.map((t) => (typeof t === "function" ? t(i) : t))), { seconds: num(i.duration) });

const geminiOmni = (name: string): Rule => (i) =>
  charge(
    any(i.video_list)
      ? row(name, "video", lc(i.resolution), "with video input")
      : row(name, "video", i.duration ? `${num(i.duration)}s` : undefined, lc(i.resolution), "no video input"),
  );

const suno = (...tokens: string[]): Rule => () => charge(row("suno", ...tokens));

/** ElevenLabs bills by the thousand characters of script. */
const perKiloChar = (tokens: string[], text: (i: Input) => string): Rule => (i) => {
  const r = row("elevenlabs text to speech", ...tokens) ?? row("elevenlabs v3", ...tokens);
  const chars = text(i).length;
  return r && chars > 0 ? (r.c * chars) / 1000 : undefined;
};

const RULES: Record<string, Rule> = {
  /* Image */
  "nano-banana-2": (i) => charge(row("google nano banana 2", lc(i.resolution) ?? "1k")),
  "nano-banana-2-lite": () => charge(row("nano banana 2 lite", "1k")),
  "nano-banana-pro": (i) => charge(row("google nano banana pro", lc(i.resolution) === "4k" ? "4k" : "1 2k")),
  "google/nano-banana": () => charge(row("google nano banana", "text to image")),
  "google/nano-banana-edit": () => charge(row("google nano banana edit", "image to image")),
  "google/imagen4": () => charge(row("google imagen4", "default")),
  "google/imagen4-fast": () => charge(row("google imagen4", "fast")),
  "google/imagen4-ultra": () => charge(row("google imagen4", "ultra")),
  "seedream/5-pro-text-to-image": (i) => charge(row("seedream 5 pro", "text to image", i.quality === "high" ? "2k" : "1k")),
  "seedream/5-pro-image-to-image": (i) => charge(row("seedream 5 pro", "image to image", i.quality === "high" ? "2k" : "1k")),
  "seedream/5-pro-layer-decomposition": (i) =>
    charge(row("seedream 5 pro", "layer decomposition", i.size === "auto" ? undefined : lc(i.size))),
  "seedream/5-lite-text-to-image": () => charge(row("seedream 5.0 lite", "text to image")),
  "seedream/5-lite-image-to-image": () => charge(row("seedream 5.0 lite", "image to image")),
  "seedream/4.5-text-to-image": () => charge(row("seedream 4.5", "text to image")),
  "seedream/4.5-edit": () => charge(row("seedream 4.5", "image to image")),
  "gpt-image-2-text-to-image": (i) => charge(row("gpt image 2", "text to image", lc(i.resolution) ?? "1k")),
  "gpt-image-2-image-to-image": (i) => charge(row("gpt image 2", "image to image", lc(i.resolution) ?? "1k")),
  "gpt-image-2-5-flare-text-to-image": (i) => charge(row("gpt image 2 5 flare", "text to image", lc(i.resolution) ?? "1k")),
  "gpt-image-2-5-flare-image-to-image": (i) => charge(row("gpt image 2 5 flare", "image to image", lc(i.resolution) ?? "1k")),
  "gpt-image-2-5-sunburst-text-to-image": (i) =>
    charge(row("gpt image 2 5 sunburst", "text to image", lc(i.resolution) ?? "1k")),
  "gpt-image-2-5-sunburst-image-to-image": (i) =>
    charge(row("gpt image 2 5 sunburst", "image to image", lc(i.resolution) ?? "1k")),
  "gpt-image/1.5-text-to-image": (i) => charge(row("gpt image 1.5", "text to image", lc(i.quality) ?? "medium")),
  "gpt-image/1.5-image-to-image": (i) => charge(row("gpt image 1.5", "image to image", lc(i.quality) ?? "medium")),
  "4o-image-api": () => charge(row("openai 4o image", "text to image")),
  "flux-2/pro-text-to-image": (i) => charge(row("black forest labs flux 2 pro", "text to image", lc(i.resolution) ?? "1k")),
  "flux-2/pro-image-to-image": (i) => charge(row("black forest labs flux 2 pro", "image to image", lc(i.resolution) ?? "1k")),
  "flux-2/flex-text-to-image": (i) => charge(row("black forest labs flux 2 flex", "text to image", lc(i.resolution) ?? "1k")),
  "flux-2/flex-image-to-image": (i) =>
    charge(row("black forest labs flux 2 flex", "image to image", lc(i.resolution) ?? "1k")),
  "grok-imagine-image-2-0/text-to-image": () => charge(row("grok imagine image 2 0", "text to image")),
  "grok-imagine-image-2-0/image-edit": () => charge(row("grok imagine image 2 0", "image edit")),
  "grok-imagine/text-to-image": (i) => charge(row("grok imagine", i.enable_pro ? "text to image quality" : "text to image")),
  "grok-imagine/image-to-image": () => charge(row("grok imagine", "image to image")),
  "ideogram/v3-text-to-image": (i) => perImage("ideogram v3", "text to image", lc(i.rendering_speed) ?? "balanced")(i),
  "ideogram/v3-edit": (i) => perImage("ideogram v3 edit", lc(i.rendering_speed) ?? "balanced")(i),
  "ideogram/v3-remix": (i) => perImage("ideogram v3 remix", lc(i.rendering_speed) ?? "balanced")(i),
  "ideogram/character": (i) => perImage("ideogram character", lc(i.rendering_speed) ?? "balanced")(i),
  "ideogram/character-edit": (i) => perImage("ideogram character edit", lc(i.rendering_speed) ?? "balanced")(i),
  "ideogram/character-remix": (i) => perImage("ideogram character remix", lc(i.rendering_speed) ?? "balanced")(i),
  "qwen2/image-edit": () => charge(row("qwen2 image edit", "image to image")),
  "qwen3/text-to-image": (i) => charge(row("qwen image 3.0", "text to image", lc(i.resolution) ?? "1k")),
  "qwen3/image-to-image": (i) => charge(row("qwen image 3.0", "output", lc(i.resolution) ?? "1k")),
  "qwen3/pro-text-to-image": (i) => charge(row("qwen image 3.0 pro", "text to image", lc(i.resolution) ?? "1k")),
  "qwen3/pro-image-to-image": (i) => charge(row("qwen image 3.0 pro", "output", lc(i.resolution) ?? "1k")),
  "qwen2-1/text-to-image": (i) => charge(row("qwen image 2.1", "text to image", lc(i.resolution) ?? "1k")),
  "qwen2-1/image-to-image": (i) => charge(row("qwen image 2.1", "image to image", lc(i.resolution) ?? "1k")),
  // Four pictures unless told otherwise, per the docs.
  "wan/2-7-image": (i) => charge(row("wan 2.7 image"), { count: num(i.n) ?? 4 }),
  "wan/2-7-image-pro": (i) => charge(row("wan 2.7 image pro"), { count: num(i.n) ?? 4 }),
  "z-image": () => charge(row("qwen z image", "text to image")),

  /* Video */
  "bytedance/seedance-2-5": seedance("bytedance seedance 2 5"),
  "bytedance/seedance-2": seedance("bytedance seedance 2"),
  "bytedance/seedance-2-fast": seedance("bytedance seedance 2 fast"),
  "bytedance/seedance-2-mini": seedance("bytedance seedance 2 mini"),
  "bytedance/seedance-1.5-pro": (i) =>
    charge(row("bytedance seedance 1.5 pro", withAudio(i.generate_audio), lc(i.resolution)), {
      seconds: num(i.duration),
    }),
  "kling-3.0/video": (i) =>
    charge(
      row("kling 3.0", "video", withAudio(i.sound), { std: "720p", pro: "1080p", "4k": "4k" }[lc(i.mode) ?? "pro"]),
      { seconds: num(i.duration) },
    ),
  "kling/v3-turbo-text-to-video": perSecond("kling 3.0 turbo", "text to video", (i) => lc(i.resolution)),
  "kling/v3-turbo-image-to-video": perSecond("kling 3.0 turbo", "image to video", (i) => lc(i.resolution)),
  "kling-2.6/text-to-video": (i) => charge(row("kling 2.6", "text to video", withAudio(i.sound), secs(i.duration))),
  "kling-2.6/image-to-video": (i) => charge(row("kling 2.6", "image to video", withAudio(i.sound), secs(i.duration))),
  "kling/v2-5-turbo-text-to-video-pro": (i) => charge(row("kling 2.5 turbo", "text to video", secs(i.duration))),
  "kling/v2-1-standard": (i) => charge(row("kling 2.1", "video generation", "standard", secs(i.duration))),
  "kling/v2-1-pro": (i) => charge(row("kling 2.1", "video generation", "pro", secs(i.duration))),
  "kling/v2-1-master-text-to-video": (i) => charge(row("kling 2.1", "text to video", "master", secs(i.duration))),
  "kling/v2-1-master-image-to-video": (i) => charge(row("kling 2.1", "image to video", "master", secs(i.duration))),
  "minimax-h3/text-to-video": perSecond("minimax h3", "text to video", (i) => lc(i.resolution)),
  "minimax-h3/image-to-video": perSecond("minimax h3", "image to video", (i) => lc(i.resolution)),
  "minimax-h3/reference-to-video": perSecond("minimax h3", "reference to video", (i) => lc(i.resolution)),
  "hailuo/2-3-image-to-video-standard": (i) =>
    charge(row("hailuo 2.3", "image to video", "standard", secs(i.duration), lc(i.resolution))),
  "hailuo/2-3-image-to-video-pro": (i) =>
    charge(row("hailuo 2.3", "image to video", "pro", secs(i.duration), lc(i.resolution))),
  "hailuo/02-text-to-video-standard": (i) =>
    charge(row("hailuo 02", "text to video", "standard", secs(i.duration), "768p")),
  // The list has no image-to-video row at 6 s 768p; text-to-video's is the
  // same price wherever both are listed.
  "hailuo/02-image-to-video-standard": (i) =>
    charge(
      row("hailuo 02", "image to video", "standard", secs(i.duration), lc(i.resolution)) ??
        row("hailuo 02", "text to video", "standard", secs(i.duration), lc(i.resolution)),
    ),
  "hailuo/02-text-to-video-pro": () => charge(row("hailuo 02", "text to video", "pro")),
  "hailuo/02-image-to-video-pro": () => charge(row("hailuo 02", "image to video", "pro")),
  "wan/3-0-video": perSecond("wan 3.0 video", (i) => lc(i.resolution)),
  "wan/3-0-video-prime": perSecond("wan3.0 video prime", (i) => lc(i.resolution)),
  "wan/2-7-text-to-video": perSecond("wan 2.7 video", "text to video", (i) => lc(i.resolution)),
  "wan/2-7-image-to-video": perSecond("wan 2.7 video", "image to video", (i) => lc(i.resolution)),
  "wan/2-7-r2v": perSecond("wan 2.7 video", "r2v", (i) => lc(i.resolution)),
  // Duration 0 means "as long as the clip", which only KIE knows.
  "wan/2-7-videoedit": perSecond("wan 2.7 video", "videoedit", (i) => lc(i.resolution)),
  "wan/2-6-text-to-video": (i) => charge(row("wan 2.6", "text to video", secs(i.duration), lc(i.resolution))),
  "wan/2-6-image-to-video": (i) => charge(row("wan 2.6", "image to video", secs(i.duration), lc(i.resolution))),
  "wan/2-6-video-to-video": (i) => charge(row("wan 2.6", "video to video", secs(i.duration), lc(i.resolution))),
  "wan/2-5-text-to-video": (i) => charge(row("wan 2.5", "text to video", secs(i.duration), lc(i.resolution))),
  "wan/2-5-image-to-video": (i) => charge(row("wan 2.5", "image to video", secs(i.duration), lc(i.resolution))),
  "wan/2-2-a14b-text-to-video-turbo": (i) => charge(row("wan 2.2", "text to video", "5.0s", lc(i.resolution))),
  "wan/2-2-a14b-image-to-video-turbo": (i) => charge(row("wan 2.2", "image to video", "5.0s", lc(i.resolution))),
  "happyhorse-1-1/text-to-video": perSecond("happyhorse 1.1", "text to video", (i) => lc(i.resolution)),
  "happyhorse-1-1/image-to-video": perSecond("happyhorse 1.1", "image to video", (i) => lc(i.resolution)),
  "happyhorse-1-1/reference-to-video": perSecond("happyhorse 1.1", "reference to video", (i) => lc(i.resolution)),
  "happyhorse/text-to-video": perSecond("happyhorse 1.0", "text to video", (i) => lc(i.resolution)),
  "happyhorse/image-to-video": perSecond("happyhorse 1.0", "image to video", (i) => lc(i.resolution)),
  "happyhorse/reference-to-video": perSecond("happyhorse 1.0", "reference to video", (i) => lc(i.resolution)),
  "pixverse-v6/text-to-video": perSecond("pixverse v6", "text image to video", (i) => lc(i.quality), (i) =>
    i.generate_audio_switch ? "with audio" : "no audio"),
  "pixverse-v6/image-to-video": perSecond("pixverse v6", "text image to video", (i) => lc(i.quality), (i) =>
    i.generate_audio_switch ? "with audio" : "no audio"),
  "pixverse-v6/transition": perSecond("pixverse v6", "text image to video", (i) => lc(i.quality), (i) =>
    i.generate_audio_switch ? "with audio" : "no audio"),
  "pixverse-v6/reference-to-video": perSecond("pixverse v6", "reference to video", (i) => lc(i.quality), (i) =>
    i.generate_audio_switch ? "with audio" : "no audio"),
  // The price list spells the audio option "aiduo" on this one.
  "pixverse-v6/extend": perSecond("pixverse v6", "extend", (i) => lc(i.quality), (i) =>
    i.generate_audio_switch ? "with aiduo" : "no aiduo"),
  "grok-imagine/text-to-video": perSecond("grok imagine", "text to video", (i) => lc(i.resolution)),
  "grok-imagine/image-to-video": perSecond("grok imagine", "image to video", (i) => lc(i.resolution)),
  "grok-imagine-video-1-5-preview": perSecond("grok imagine video 1 5 preview", "image to video", (i) => lc(i.resolution)),
  "gemini-omni-video": geminiOmni("gemini omni video"),
  "google/gemini-omni-flash-1-1": geminiOmni("google gemini omni flash 1 1"),
  runway: (i) =>
    charge(row("runway", i.image_url ? "image to video" : "text to video", secs(i.duration), lc(i.quality))),
  "runway/gen4-aleph": () => charge(row("runway aleph")),

  /* Audio */
  "ai-music-api/generate": suno("generate music"),
  "ai-music-api/extend": suno("extend music"),
  "ai-music-api/upload-and-cover-audio": suno("upload and cover audio"),
  "ai-music-api/upload-and-extend-audio": suno("upload and extend audio"),
  "ai-music-api/add-vocals": suno("add vocals"),
  "ai-music-api/add-instrumental": suno("add instrumental"),
  "ai-music-api/mashup": suno("mashup"),
  "ai-music-api/replace-section": suno("replace music section"),
  "ai-music-api/sounds": suno("generate sounds"),
  "ai-music-api/generate-lyrics": suno("generate lyrics"),
  "ai-music-api/timeStamped-lyrics": suno("timestamped lyrics"),
  "ai-music-api/boost-music-style": suno("boost music style"),
  "ai-music-api/convert-to-wav-format": suno("convert to wav format"),
  "ai-music-api/create-music-video": suno("create music video"),
  "ai-music-api/cover-generate": suno("cover generate"),
  "ai-music-api/generate-persona": suno("generate persona"),
  "ai-music-api/generate-midi-from-audio": suno("generate midi from audio"),
  "elevenlabs/text-to-speech-turbo-2-5": perKiloChar(["turbo 2.5"], (i) => String(i.text ?? "")),
  "elevenlabs/text-to-speech-multilingual-v2": perKiloChar(["multilingual v2"], (i) => String(i.text ?? "")),
  "elevenlabs/text-to-dialogue-v3": perKiloChar(["text to dialogue"], (i) =>
    (Array.isArray(i.dialogue) ? i.dialogue : []).map((line: Input) => String(line?.text ?? "")).join("")),

  /* Tools */
  "recraft/remove-background": () => charge(row("recraft remove background")),
  "recraft/crisp-upscale": () => charge(row("recraft crisp upscale")),
  "topaz/image-upscale": (i) => charge(row("topaz image upscaler", "image upscale", String(i.upscale_factor) === "4" ? "4k" : "2k")),
};

/**
 * Credits one run of the model will take with these values, or undefined
 * when the price list cannot say. Options left unset are read at the
 * documented default, which is what KIE will use.
 */
export function estimateCredits(model: ModelDef, values: Values): number | undefined {
  let built;
  try {
    built = model.build(values);
  } catch {
    return undefined;
  }
  const payload = built.payload as { model?: string; input?: Input };
  const id = payload.model;
  if (!id || !RULES[id]) return undefined;
  const spec = getSpec(id);
  const input: Input = {};
  for (const [key, prop] of Object.entries(spec?.input ?? {})) {
    if (prop.default !== undefined && prop.default !== null) input[key] = prop.default;
  }
  Object.assign(input, payload.input ?? {});
  const credits = RULES[id](input);
  return credits !== undefined && Number.isFinite(credits) ? credits : undefined;
}

/** "≈63 cr", "≈0.5 cr", "Free". */
export function formatCredits(credits: number): string {
  if (credits === 0) return "Free";
  const n = credits >= 10 ? Math.round(credits) : Math.round(credits * 10) / 10;
  return `≈${n.toLocaleString("en-US")} cr`;
}
