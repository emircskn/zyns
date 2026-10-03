"use client";

import { useEffect, useState } from "react";
import { keepCopy, storageAvailable } from "@/lib/storage/client";
import { mediaKind } from "@/lib/upload";
import { useStudio, type Run } from "@/store/studio";
import { DEMO_PREFIX } from "@/lib/demo";
import { getModel } from "@/lib/registry";

/** How many copies go at once, so a long backlog does not flood the server. */
const AT_ONCE = 2;

/**
 * A moment after the page opens before copying starts: the shared library
 * is read first, so copies another device already made are not made again.
 */
const SETTLE_MS = 8000;

/** What a run was given to work from (references, first frames, clips). */
function inputsOf(run: Run): string[] {
  const model = getModel(run.modelId);
  if (!model) return [];
  const urls: string[] = [];
  for (const field of model.fields) {
    if (field.placement !== "input") continue;
    const value = run.values[field.key];
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === "string") urls.push(item);
      else if (item && typeof item === "object" && typeof (item as { url?: unknown }).url === "string") {
        urls.push((item as { url: string }).url);
      }
    }
  }
  return urls;
}

/**
 * Keeps lasting copies of everything the studio shows: every result, what
 * each run was given, every upload and everything liked. The services
 * delete their files after days (KIE after 14), and without a copy the
 * gallery and a run's inputs would turn to broken pictures. Newest first,
 * so what was just made is safe soonest. Mounted once by the studio shell.
 */
export function StorageKeeper() {
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  const favorites = useStudio((s) => s.favorites);
  const copies = useStudio((s) => s.copies);
  const hasKey = useStudio((s) => !!(s.apiKey || s.hfKey));
  const hydrated = useStudio((s) => s.hydrated);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => setSettled(true), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [hydrated]);

  useEffect(() => {
    if (!settled || !hasKey || !storageAvailable()) return;
    const kinds = new Map<string, "image" | "video" | "audio">();
    for (const upload of uploads) kinds.set(upload.url, upload.kind);
    const made: string[] = [];
    const given: string[] = [];
    for (const run of runs) {
      if (run.id.startsWith(DEMO_PREFIX)) continue;
      if (run.state === "success") for (const url of run.urls) made.push(url);
      given.push(...inputsOf(run));
    }
    const wanted = [...new Set([...made, ...uploads.map((u) => u.url), ...favorites, ...given])].filter(
      (url) => !copies[url] && !url.startsWith("demo") && /^https:\/\//i.test(url),
    );
    if (wanted.length === 0) return;
    let stopped = false;
    void (async () => {
      for (let i = 0; i < wanted.length && !stopped; i += AT_ONCE) {
        await Promise.all(wanted.slice(i, i + AT_ONCE).map((url) => keepCopy(url, kinds.get(url) ?? mediaKind(url))));
      }
    })();
    return () => {
      stopped = true;
    };
  }, [settled, runs, uploads, favorites, copies, hasKey]);

  return null;
}
