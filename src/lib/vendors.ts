/**
 * Visual identity per vendor: a monogram and a hue pair. These are designed
 * marks, not the vendors' own logos — consistent across all 19 vendors and
 * free of trademark baggage, while still reading at a glance.
 */
export interface VendorMark {
  /** One or two characters set in the mark. */
  glyph: string;
  /** Gradient stops for the tile. */
  from: string;
  to: string;
  /** Glyph colour on the tile. */
  ink?: string;
}

export const VENDORS: Record<string, VendorMark> = {
  Google: { glyph: "G", from: "#4285f4", to: "#34a853", ink: "#ffffff" },
  "Google DeepMind": { glyph: "DM", from: "#1a73e8", to: "#7c4dff", ink: "#ffffff" },
  ByteDance: { glyph: "BD", from: "#325ab4", to: "#20c5ff", ink: "#ffffff" },
  OpenAI: { glyph: "AI", from: "#0f0f0f", to: "#3d3d3d", ink: "#ffffff" },
  "Black Forest Labs": { glyph: "BF", from: "#1c1c1c", to: "#5a3d2b", ink: "#f5e9d6" },
  xAI: { glyph: "X", from: "#000000", to: "#2b2b2b", ink: "#ffffff" },
  Ideogram: { glyph: "Id", from: "#6b4df6", to: "#c05cff", ink: "#ffffff" },
  Alibaba: { glyph: "Al", from: "#ff6a00", to: "#ffb347", ink: "#1a0b00" },
  "Tongyi-MAI": { glyph: "Ty", from: "#615ced", to: "#a48bff", ink: "#ffffff" },
  Recraft: { glyph: "Rc", from: "#ff3d71", to: "#ff8a5b", ink: "#ffffff" },
  "Topaz Labs": { glyph: "Tz", from: "#0ea5e9", to: "#22d3ee", ink: "#04131a" },
  ElevenLabs: { glyph: "11", from: "#0b0b0b", to: "#3b3b3b", ink: "#ffffff" },
  Suno: { glyph: "Su", from: "#111111", to: "#ff5ec4", ink: "#ffffff" },
  Kuaishou: { glyph: "Kl", from: "#0d9488", to: "#34d399", ink: "#031a16" },
  MiniMax: { glyph: "Mx", from: "#e11d48", to: "#fb7185", ink: "#ffffff" },
  Runway: { glyph: "Rw", from: "#111111", to: "#4b4b4b", ink: "#ffffff" },
  PixVerse: { glyph: "Px", from: "#7c3aed", to: "#22d3ee", ink: "#ffffff" },
  Volcengine: { glyph: "Vo", from: "#1d4ed8", to: "#60a5fa", ink: "#ffffff" },
  InfiniTalk: { glyph: "In", from: "#0f766e", to: "#5eead4", ink: "#03201c" },
};

export function vendorMark(vendor: string): VendorMark {
  return VENDORS[vendor] ?? { glyph: vendor.slice(0, 2), from: "#3a3a45", to: "#6b6b78", ink: "#ffffff" };
}

/** Category accents, shared by the whole studio. */
export const ACCENT: Record<string, string> = {
  image: "#f2a33a", // amber
  video: "#d9632c", // copper
  audio: "#f0cf6b", // gold
  tool: "#a89f92", // ash
};

/** Deterministic hue offset so every family gets its own cover, not the category's. */
export function familyHue(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
