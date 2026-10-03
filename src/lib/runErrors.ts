/**
 * What usually helps when a model turns a run down, read off its own words.
 * Services word these differently ("blocked by safety review", "input was
 * rejected", "sensitive content"), and the reason itself is shown as it came.
 */
export function failureHint(message: string | undefined): string | undefined {
  if (!message) return undefined;
  if (/safety|moderat|nsfw|sensitive|content polic|inappropriate|flagged|prohibited|blocked|rejected|violat/i.test(message)) {
    return "The model's content filter turned this down. Rewording the prompt, or using a different picture, usually gets it through.";
  }
  if (/credit|balance|insufficient|top up/i.test(message)) {
    return "Top up the account on the service's site, then try again.";
  }
  if (/timed out|timeout/i.test(message)) {
    return "The service may be busy. Trying again in a little while usually works.";
  }
  return undefined;
}
