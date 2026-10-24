/** One colour of a palette as Wan takes it: a #RRGGBB and its share, "xx.xx%". */
export type Swatch = { hex: string; ratio: string };

export const percent = (ratio: string | undefined) => Number.parseFloat(ratio ?? "") || 0;

/** Shares, in hundredths, that add up to exactly 100.00% in proportion to `weights`. */
function shares(weights: number[]): string[] {
  const total = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => (total > 0 ? Math.floor((w / total) * 10000) : Math.floor(10000 / weights.length)));
  // The hundredths lost to rounding go to the largest colour.
  const largest = parts.indexOf(Math.max(...parts));
  parts[largest] += 10000 - parts.reduce((a, b) => a + b, 0);
  return parts.map((p) => `${(p / 100).toFixed(2)}%`);
}

/** The same colours with equal shares. */
export const evened = (swatches: Swatch[]): Swatch[] => {
  const next = shares(swatches.map(() => 1));
  return swatches.map((s, i) => ({ ...s, ratio: next[i] }));
};

/** The same colours scaled so their shares add up to 100.00%, which the API insists on. */
export const balanced = (swatches: Swatch[]): Swatch[] => {
  const next = shares(swatches.map((s) => Math.max(percent(s.ratio), 0)));
  return swatches.map((s, i) => ({ ...s, ratio: next[i] }));
};
