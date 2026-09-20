import type { Run, Upload } from "@/store/studio";

/**
 * Sample media, so the studio can be looked at with a full gallery before an
 * API key exists. Everything is drawn here as an SVG data URI rather than
 * fetched: the standalone build has no network, and a demo that needs one is
 * no demo at all.
 *
 * The stills stand in for video and audio too — a real clip cannot be
 * embedded this way — so what these show is the layout, not the output.
 */
const PALETTES = [
  ["#f2a33a", "#7a2f12", "#1b1208"],
  ["#123a5c", "#2f7fa8", "#08131c"],
  ["#7a1f3d", "#d8724f", "#160a10"],
  ["#1f4437", "#8fbf8a", "#081310"],
  ["#3a2f6b", "#a892d8", "#0d0a18"],
  ["#5c4a12", "#d8c56b", "#15110a"],
];

function still(seed: number, ratio: string): string {
  const [a, b, c] = PALETTES[seed % PALETTES.length];
  const [w, h] = ratio.split("/").map((n) => Math.round(Number(n.trim()) * 420));
  const angle = (seed * 47) % 360;
  const cx = 20 + ((seed * 29) % 60);
  const cy = 20 + ((seed * 53) % 60);
  // Intrinsic size as well as a viewBox: without it the browser has to guess
  // how big the still is, and the lightbox sizes itself off that guess.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0" stop-color="${c}"/><stop offset="0.55" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient>
    <radialGradient id="r" cx="${cx}%" cy="${cy}%" r="60%">
      <stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <filter id="n"><feTurbulence baseFrequency="0.9" numOctaves="2" seed="${seed}"/>
      <feColorMatrix type="saturate" values="0"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#r)"/>
  <circle cx="${(cx / 100) * w}" cy="${(cy / 100) * h}" r="${Math.min(w, h) * 0.2}" fill="#fff" opacity="0.14"/>
  <rect width="${w}" height="${h}" filter="url(#n)" opacity="0.14"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SHOTS: { model: string; name: string; output: Run["output"]; ratio: string; prompt: string }[] = [
  { model: "nano-banana-2", name: "Nano Banana 2", output: "image", ratio: "2 / 3", prompt: "a lighthouse swallowed by fog, long lens" },
  { model: "nano-banana-2", name: "Nano Banana 2", output: "image", ratio: "1 / 1", prompt: "ceramic still life on a windowsill, hard morning light" },
  { model: "seedream-4", name: "Seedream 4.0", output: "image", ratio: "3 / 2", prompt: "empty diner at 4am, sodium light, 35mm" },
  { model: "seedream-4", name: "Seedream 4.0", output: "image", ratio: "2 / 3", prompt: "portrait against a painted backdrop, single softbox" },
  { model: "qwen-image", name: "Qwen Image", output: "image", ratio: "16 / 9", prompt: "salt flats at dusk, one road, no horizon" },
  { model: "ideogram-v3", name: "Ideogram V3", output: "image", ratio: "1 / 1", prompt: "record sleeve, heavy grain, two colours only" },
  { model: "kling-3-omni", name: "Kling 3.0 Omni", output: "video", ratio: "16 / 9", prompt: "slow push through a doorway into rain" },
  { model: "kling-3-omni", name: "Kling 3.0 Omni", output: "video", ratio: "9 / 16", prompt: "handheld follow down a stairwell" },
  { model: "suno-music", name: "Suno", output: "audio", ratio: "1 / 1", prompt: "slow dub, tape hiss, no vocals" },
  { model: "elevenlabs-speech", name: "ElevenLabs Speech", output: "audio", ratio: "1 / 1", prompt: "a narrator, close mic, unhurried" },
  { model: "topaz", name: "Topaz Upscale", output: "image", ratio: "3 / 2", prompt: "upscale · 4×" },
  { model: "recraft", name: "Recraft", output: "image", ratio: "1 / 1", prompt: "remove background" },
];

/** Runs that look like a week of work, newest first. */
export function demoRuns(): Run[] {
  const now = Date.now();
  return SHOTS.map((shot, i) => ({
    id: `demo-${i}`,
    modelId: shot.model,
    modelName: shot.name,
    poll: "",
    prompt: shot.prompt,
    ratio: shot.ratio,
    output: shot.output,
    state: "success" as const,
    urls: [still(i + 3, shot.ratio)],
    createdAt: now - i * 5_400_000,
    values: {},
  }));
}

export function demoUploads(): Upload[] {
  const now = Date.now();
  return [0, 1, 2].map((i) => ({
    id: `demo-up-${i}`,
    url: still(i + 40, "1 / 1"),
    kind: "image" as const,
    name: `reference-${i + 1}.png`,
    createdAt: now - i * 9_000_000,
  }));
}

export const DEMO_PREFIX = "demo-";
