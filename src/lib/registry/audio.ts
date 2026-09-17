import { bool, choices, num, promptField } from "./common";
import { compact, type ModelDef } from "./types";

const JOBS = "/api/v1/jobs/createTask";

/* ------------------------------------------------------------------ *
 * Suno — music
 * ------------------------------------------------------------------ */
const suno: ModelDef = {
  id: "suno",
  name: "Suno",
  vendor: "Suno",
  category: "audio",
  output: "audio",
  badge: "V5.5",
  tagline: "Full songs with vocals, or instrumentals, from a description or your own lyrics.",
  tags: ["music generation", "lyrics", "instrumental"],
  docs: "https://docs.kie.ai/suno-api/quickstart",
  modes: [
    { id: "simple", label: "Simple", hint: "Describe the song, Suno writes the lyrics" },
    { id: "custom", label: "Custom", hint: "Your lyrics, your style, your title" },
  ],
  defaultMode: "simple",
  fields: [
    promptField({
      label: "Description",
      placeholder: "A dreamy synth-pop track about driving home at 3am…",
      help: "Max 500 characters in Simple mode.",
      when: (v) => v.__mode !== "custom",
    }),
    promptField({
      label: "Lyrics",
      placeholder: "[Verse 1]\nNeon on the dashboard…",
      help: "Used verbatim. 5,000 characters on V4.5+/V5, 3,000 on V3.5/V4.",
      when: (v) => v.__mode === "custom" && !bool(v.instrumental),
    }),
    {
      key: "model",
      label: "Model",
      kind: "select",
      placement: "bar",
      default: "V5",
      choices: choices([
        ["V5_5", "V5.5", "Most realistic, supports duration"],
        ["V5", "V5"],
        ["V4_5PLUS", "V4.5+"],
        ["V4_5", "V4.5"],
        ["V4", "V4"],
        ["V3_5", "V3.5"],
      ]),
    },
    {
      key: "instrumental",
      label: "Instrumental",
      kind: "toggle",
      placement: "bar",
      default: false,
      help: "No vocals.",
    },
    {
      key: "style",
      label: "Style",
      kind: "text",
      placement: "bar",
      required: true,
      when: (v) => v.__mode === "custom",
      placeholder: "dream pop, shoegaze, analog synths",
      help: "Required in Custom mode. 1,000 characters on V4.5+/V5, 200 on V3.5/V4.",
    },
    {
      key: "title",
      label: "Title",
      kind: "text",
      placement: "bar",
      required: true,
      when: (v) => v.__mode === "custom",
      placeholder: "Night Drive",
      help: "Required in Custom mode. Max 80 characters.",
    },
    {
      key: "duration",
      label: "Duration",
      kind: "slider",
      placement: "bar",
      min: 30,
      max: 300,
      step: 10,
      when: (v) => v.model === "V5_5",
      chip: (val) => `${val}s`,
      help: "V5.5 only.",
    },
    {
      key: "vocalGender",
      label: "Vocal gender",
      kind: "segmented",
      placement: "panel",
      group: "Vocals",
      choices: choices([["m", "Male"], ["f", "Female"]]),
      when: (v) => v.__mode === "custom" && !bool(v.instrumental),
      help: "Only takes effect in Custom mode.",
    },
    {
      key: "negativeTags",
      label: "Exclude styles",
      kind: "text",
      placement: "panel",
      group: "Style",
      placeholder: "heavy metal, autotune",
      help: "Max 200 characters.",
    },
    {
      key: "styleWeight",
      label: "Style adherence",
      kind: "slider",
      placement: "panel",
      group: "Style",
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      key: "weirdnessConstraint",
      label: "Experimentation",
      kind: "slider",
      placement: "panel",
      group: "Style",
      min: 0,
      max: 1,
      step: 0.01,
      help: "How far Suno may stray from the brief.",
    },
    {
      key: "audioWeight",
      label: "Audio weight",
      kind: "slider",
      placement: "panel",
      group: "Style",
      min: 0,
      max: 1,
      step: 0.01,
    },
  ],
  validate(v) {
    const custom = v.__mode === "custom";
    if (custom && (!v.style || !v.title)) return "Custom mode needs both a style and a title.";
    if (custom && !bool(v.instrumental) && !v.prompt) return "Custom mode needs lyrics unless the track is instrumental.";
    if (!custom && !v.prompt) return "Describe the song you want.";
    if (v.duration !== undefined && v.duration !== "" && v.model !== "V5_5") {
      return "Duration is only available on V5.5.";
    }
    return null;
  },
  build(v) {
    const custom = v.__mode === "custom";
    return {
      endpoint: "/api/v1/generate",
      poll: "suno",
      payload: compact({
        prompt: v.prompt,
        customMode: custom,
        instrumental: bool(v.instrumental),
        model: v.model || "V5",
        style: custom ? v.style : undefined,
        title: custom ? v.title : undefined,
        duration: v.model === "V5_5" ? num(v.duration) : undefined,
        negativeTags: v.negativeTags,
        vocalGender: custom ? v.vocalGender : undefined,
        styleWeight: num(v.styleWeight),
        weirdnessConstraint: num(v.weirdnessConstraint),
        audioWeight: num(v.audioWeight),
      }),
    };
  },
};

/* ------------------------------------------------------------------ *
 * ElevenLabs — text to speech
 * ------------------------------------------------------------------ */
const VOICES = [
  "Rachel", "Aria", "Roger", "Sarah", "Laura", "Charlie", "George",
  "Callum", "River", "Liam", "Charlotte", "Alice", "Matilda", "Will",
  "Jessica", "Eric", "Chris", "Brian", "Daniel", "Lily", "Bill",
];

const elevenTts: ModelDef = {
  id: "elevenlabs-tts",
  name: "ElevenLabs Speech",
  vendor: "ElevenLabs",
  category: "audio",
  output: "audio",
  tagline: "Natural speech in 21 stock voices, with full delivery control.",
  tags: ["text to speech", "voiceover"],
  fields: [
    promptField({
      key: "text",
      label: "Script",
      placeholder: "Type what the voice should say…",
      help: "Max 5,000 characters.",
    }),
    {
      key: "voice",
      label: "Voice",
      kind: "select",
      placement: "bar",
      default: "Rachel",
      choices: VOICES.map((value) => ({ value, label: value })),
    },
    {
      key: "model",
      label: "Model",
      kind: "segmented",
      placement: "bar",
      default: "turbo",
      choices: choices([
        ["turbo", "Turbo", "Fastest, language enforcement"],
        ["multilingual", "Multilingual", "Reads surrounding context"],
      ]),
    },
    {
      key: "speed",
      label: "Speed",
      kind: "slider",
      placement: "bar",
      default: 1,
      min: 0.7,
      max: 1.2,
      step: 0.01,
      chip: (val) => `${val}×`,
    },
    {
      key: "stability",
      label: "Stability",
      kind: "slider",
      placement: "panel",
      group: "Delivery",
      default: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      help: "Lower is more expressive, higher is more consistent.",
    },
    {
      key: "similarity_boost",
      label: "Similarity",
      kind: "slider",
      placement: "panel",
      group: "Delivery",
      default: 0.75,
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      key: "style",
      label: "Style exaggeration",
      kind: "slider",
      placement: "panel",
      group: "Delivery",
      default: 0,
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      key: "language_code",
      label: "Language code",
      kind: "text",
      placement: "panel",
      group: "Language",
      placeholder: "en, tr, de…",
      help: "ISO 639-1. Turbo model only.",
      when: (v) => v.model !== "multilingual",
    },
    {
      key: "previous_text",
      label: "Preceding text",
      kind: "text",
      placement: "panel",
      group: "Context",
      help: "Multilingual model only — helps it pick the right intonation.",
      when: (v) => v.model === "multilingual",
    },
    {
      key: "next_text",
      label: "Following text",
      kind: "text",
      placement: "panel",
      group: "Context",
      when: (v) => v.model === "multilingual",
    },
    {
      key: "timestamps",
      label: "Word timestamps",
      kind: "toggle",
      placement: "panel",
      group: "Output",
      default: false,
    },
  ],
  build(v) {
    const multilingual = v.model === "multilingual";
    const input: Record<string, unknown> = {
      text: v.text,
      voice: v.voice || "Rachel",
      stability: num(v.stability) ?? 0.5,
      similarity_boost: num(v.similarity_boost) ?? 0.75,
      style: num(v.style) ?? 0,
      speed: num(v.speed) ?? 1,
      timestamps: bool(v.timestamps),
    };
    if (multilingual) {
      input.previous_text = v.previous_text || "";
      input.next_text = v.next_text || "";
    } else {
      input.language_code = v.language_code || "";
    }
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: multilingual
          ? "elevenlabs/text-to-speech-multilingual-v2"
          : "elevenlabs/text-to-speech-turbo-2-5",
        input,
      },
    };
  },
};

/* ------------------------------------------------------------------ *
 * ElevenLabs — sound effects
 * ------------------------------------------------------------------ */
const elevenSfx: ModelDef = {
  id: "elevenlabs-sfx",
  name: "ElevenLabs SFX",
  vendor: "ElevenLabs",
  category: "audio",
  output: "audio",
  tagline: "Describe a sound and get it back, loopable, up to 22 seconds.",
  tags: ["sound effects", "foley"],
  fields: [
    promptField({
      key: "text",
      label: "Sound",
      placeholder: "Heavy wooden door creaking open in a stone hallway…",
    }),
    {
      key: "duration_seconds",
      label: "Duration",
      kind: "slider",
      placement: "bar",
      min: 0.5,
      max: 22,
      step: 0.1,
      chip: (val) => `${val}s`,
      help: "Leave untouched to let the model pick the natural length.",
    },
    {
      key: "loop",
      label: "Loopable",
      kind: "toggle",
      placement: "bar",
      default: false,
      help: "Makes the effect loop seamlessly.",
    },
    {
      key: "prompt_influence",
      label: "Prompt influence",
      kind: "slider",
      placement: "panel",
      group: "Generation",
      default: 0.3,
      min: 0,
      max: 1,
      step: 0.01,
      help: "Higher values follow the prompt more literally, with less variation.",
    },
    {
      key: "output_format",
      label: "Output format",
      kind: "select",
      placement: "panel",
      group: "Output",
      default: "mp3_44100_192",
      choices: [
        "mp3_22050_32", "mp3_44100_32", "mp3_44100_64", "mp3_44100_96",
        "mp3_44100_128", "mp3_44100_192", "pcm_8000", "pcm_16000",
        "pcm_22050", "pcm_24000", "pcm_44100", "pcm_48000", "ulaw_8000",
        "alaw_8000", "opus_48000_32", "opus_48000_64", "opus_48000_96",
        "opus_48000_128", "opus_48000_192",
      ].map((value) => ({ value, label: value.replace(/_/g, " ") })),
    },
  ],
  build(v) {
    return {
      endpoint: JOBS,
      poll: "jobs",
      payload: {
        model: "elevenlabs/sound-effect-v2",
        input: compact({
          text: v.text,
          loop: bool(v.loop),
          duration_seconds: num(v.duration_seconds),
          prompt_influence: num(v.prompt_influence) ?? 0.3,
          output_format: v.output_format || "mp3_44100_192",
        }),
      },
    };
  },
};

export const AUDIO_MODELS: ModelDef[] = [suno, elevenTts, elevenSfx];
