/**
 * Merging two devices' libraries. Each device remembers the library as it
 * last agreed with storage (the base); a change is whatever differs from
 * it. So an edit made on one side only wins over the untouched other side,
 * and only an edit made on both sides needs a rule.
 *
 * Deleting is never read off something being missing (a device keeps only
 * its most recent runs, and one it has not seen yet is missing too): it is
 * written down when it happens, and both sides' deletions are honoured.
 */
import type { LibraryElement } from "@/lib/elements";
import type { MotionClip } from "@/lib/remix/types";
import type { Project, RemoteUrls, Run, StoredCopy, Upload } from "@/store/studio";

export interface LibraryDoc {
  v: 1;
  runs: Run[];
  uploads: Upload[];
  projects: Project[];
  elements: LibraryElement[];
  /** Clips kept for their motion (Remix's library); left out by older versions. */
  motionClips: MotionClip[];
  favorites: string[];
  copies: Record<string, StoredCopy>;
  remotes: Record<string, RemoteUrls>;
  deleted: Record<string, number>;
}

export const EMPTY_DOC: LibraryDoc = {
  v: 1,
  runs: [],
  uploads: [],
  projects: [],
  elements: [],
  motionClips: [],
  favorites: [],
  copies: {},
  remotes: {},
  deleted: {},
};

/** Deletions are remembered this long; long enough for any device to hear of one. */
const FORGET_DELETIONS_MS = 120 * 24 * 60 * 60_000;

const RANK: Record<Run["state"], number> = { queued: 0, pending: 1, running: 2, failed: 3, success: 4 };

/** When both sides changed a run, the one further along wins (a finished run over a waiting one). */
function pickRun(local: Run, remote: Run): Run {
  return RANK[remote.state] > RANK[local.state] ? remote : local;
}

function mergeList<T extends { id: string; createdAt: number }>(
  base: T[],
  local: T[],
  remote: T[],
  deleted: Record<string, number>,
  pick: (local: T, remote: T) => T = (l) => l,
): T[] {
  const was = new Map(base.map((item) => [item.id, stable(item)]));
  const mine = new Map(local.map((item) => [item.id, item]));
  const theirs = new Map(remote.map((item) => [item.id, item]));
  const out: T[] = [];
  for (const id of new Set([...mine.keys(), ...theirs.keys()])) {
    if (deleted[id]) continue;
    const l = mine.get(id);
    const r = theirs.get(id);
    if (!l || !r) {
      out.push((l ?? r)!);
      continue;
    }
    const lj = stable(l);
    const rj = stable(r);
    const b = was.get(id);
    if (lj === rj || b === rj) out.push(l);
    else if (b === lj) out.push(r);
    else out.push(pick(l, r));
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/** A set merged three ways: kept where neither side removed it, added where either side added it. */
function mergeSet(base: string[], local: string[], remote: string[]): string[] {
  const was = new Set(base);
  const mine = new Set(local);
  const theirs = new Set(remote);
  const out: string[] = [];
  for (const item of new Set([...local, ...remote])) {
    const removed = was.has(item) && (!mine.has(item) || !theirs.has(item));
    if (!removed) out.push(item);
  }
  return out;
}

export function mergeDocs(base: LibraryDoc, local: LibraryDoc, remote: LibraryDoc, now = Date.now()): LibraryDoc {
  const deleted: Record<string, number> = {};
  for (const [id, at] of [...Object.entries(remote.deleted ?? {}), ...Object.entries(local.deleted ?? {})]) {
    if (now - at < FORGET_DELETIONS_MS) deleted[id] = Math.max(at, deleted[id] ?? 0);
  }
  return {
    v: 1,
    runs: mergeList(base.runs, local.runs, remote.runs ?? [], deleted, pickRun),
    uploads: mergeList(base.uploads, local.uploads, remote.uploads ?? [], deleted),
    projects: mergeList(base.projects, local.projects, remote.projects ?? [], deleted),
    elements: mergeList(base.elements, local.elements, remote.elements ?? [], deleted),
    motionClips: mergeList(base.motionClips, local.motionClips, remote.motionClips ?? [], deleted),
    favorites: mergeSet(base.favorites, local.favorites, remote.favorites ?? []),
    copies: { ...(remote.copies ?? {}), ...local.copies },
    remotes: { ...(remote.remotes ?? {}), ...local.remotes },
    deleted,
  };
}

/** JSON with every object's keys in order, so two equal libraries always read alike. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function sameDoc(a: LibraryDoc, b: LibraryDoc): boolean {
  return stable(a) === stable(b);
}

/** A stored library as this version reads it, whatever an older one left out. */
export function normalizeDoc(raw: unknown): LibraryDoc {
  const doc = (raw && typeof raw === "object" ? raw : {}) as Partial<LibraryDoc>;
  return {
    v: 1,
    runs: Array.isArray(doc.runs) ? doc.runs : [],
    uploads: Array.isArray(doc.uploads) ? doc.uploads : [],
    projects: Array.isArray(doc.projects) ? doc.projects : [],
    elements: Array.isArray(doc.elements) ? doc.elements : [],
    motionClips: Array.isArray(doc.motionClips) ? doc.motionClips : [],
    favorites: Array.isArray(doc.favorites) ? doc.favorites : [],
    copies: doc.copies && typeof doc.copies === "object" ? doc.copies : {},
    remotes: doc.remotes && typeof doc.remotes === "object" ? doc.remotes : {},
    deleted: doc.deleted && typeof doc.deleted === "object" ? doc.deleted : {},
  };
}
