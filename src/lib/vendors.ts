/**
 * Visual identity per vendor: a monogram. These are designed marks, not the
 * vendors' own logos, so they stay consistent across all 19 vendors and free
 * of trademark baggage. The studio has no brand colour any more, so the tile
 * they sit on is drawn from the text ramp like everything else.
 */
export const VENDORS: Record<string, string> = {
  Google: "G",
  "Google DeepMind": "DM",
  ByteDance: "BD",
  OpenAI: "AI",
  "Black Forest Labs": "BF",
  xAI: "X",
  Ideogram: "Id",
  Alibaba: "Al",
  "Tongyi-MAI": "Ty",
  Recraft: "Rc",
  "Topaz Labs": "Tz",
  ElevenLabs: "11",
  Suno: "Su",
  Kuaishou: "Kl",
  MiniMax: "Mx",
  Runway: "Rw",
  PixVerse: "Px",
  Volcengine: "Vo",
  InfiniTalk: "In",
};

export function vendorMark(vendor: string): string {
  return VENDORS[vendor] ?? vendor.slice(0, 2);
}

/** Deterministic hue offset so every family gets its own cover, not the category's. */
export function familyHue(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
