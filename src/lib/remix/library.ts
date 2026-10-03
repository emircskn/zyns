"use client";

import { readMediaMeta } from "@/lib/mediaMeta";
import { mediaSrc } from "@/lib/storage/client";
import { useStudio } from "@/store/studio";
import type { MotionClip } from "./types";

/** The name a clip gets from where it came from: its upload's file name, or what made it. */
function titleFor(url: string): string {
  const { uploads, runs } = useStudio.getState();
  const upload = uploads.find((u) => u.url === url);
  if (upload?.name) return upload.name.replace(/\.[a-z0-9]{2,4}$/i, "");
  const run = runs.find((r) => r.urls.includes(url));
  if (run) return run.prompt ? run.prompt.slice(0, 48) : run.modelName;
  return "Motion clip";
}

/** Keeps a clip in the Motion library (once), with its length read from the file. */
export async function saveMotionClip(url: string, tags: string[] = []): Promise<MotionClip> {
  const existing = useStudio.getState().motionClips.find((clip) => clip.url === url);
  if (existing) return existing;
  const meta = await readMediaMeta(mediaSrc(url), "video").catch(() => null);
  const clip: MotionClip = {
    id: `motion-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: titleFor(url),
    url,
    durationSec: meta?.durationSec,
    tags,
    createdAt: Date.now(),
  };
  useStudio.getState().addMotionClip(clip);
  return clip;
}

export function isMotionClip(url: string): boolean {
  return useStudio.getState().motionClips.some((clip) => clip.url === url);
}
