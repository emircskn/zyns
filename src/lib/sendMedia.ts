"use client";

/**
 * Media in a run's values, made ready for the service it goes to. Kept
 * files (an element's pictures, anything copied to storage) are handed to
 * that service, and a picture whose original may have expired by now goes
 * from its kept copy instead.
 */
import type { Provider, Values } from "@/lib/registry";
import { ensureRemoteUrl, storageKeyOf } from "@/lib/storage/client";
import { useStudio } from "@/store/studio";

/** After this long, a service's own copy of a file may be gone (KIE keeps uploads a day to three). */
const STALE_MS = 20 * 60 * 60_000;

function madeAt(url: string): number | undefined {
  const { uploads, runs } = useStudio.getState();
  return uploads.find((u) => u.url === url)?.createdAt ?? runs.find((r) => r.urls.includes(url))?.createdAt;
}

function needsHandover(url: string): boolean {
  if (storageKeyOf(url)) return true;
  if (!useStudio.getState().copies[url]) return false;
  const at = madeAt(url);
  return at === undefined || Date.now() - at > STALE_MS;
}

/** The values with every such URL replaced, and the URLs actually sent in their place. */
export async function readyMedia(values: Values, provider: Provider): Promise<{ values: Values; sent: string[] }> {
  const sent: string[] = [];
  const swap = async (value: unknown): Promise<unknown> => {
    if (typeof value === "string") {
      if (!needsHandover(value)) return value;
      const url = await ensureRemoteUrl(value, provider);
      sent.push(url);
      return url;
    }
    if (Array.isArray(value)) return Promise.all(value.map(swap));
    if (value && typeof value === "object") {
      const entries = await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await swap(v)] as const));
      return Object.fromEntries(entries);
    }
    return value;
  };
  return { values: (await swap(values)) as Values, sent };
}
