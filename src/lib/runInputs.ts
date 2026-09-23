import type { Values } from "@/lib/registry";

/**
 * A run's results, less anything it was given. The files a run was sent
 * (references, first frames, source clips) are never its output, whatever
 * shape a task report comes back in.
 */
export function withoutInputs(urls: string[], values: Values): string[] {
  const given = new Set<string>();
  const walk = (value: unknown) => {
    if (typeof value === "string") given.add(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(values);
  return urls.filter((url) => !given.has(url));
}
