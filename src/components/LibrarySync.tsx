"use client";

import { useEffect } from "react";
import { DEMO_PREFIX } from "@/lib/demo";
import { storageAvailable } from "@/lib/storage/client";
import { EMPTY_DOC, mergeDocs, normalizeDoc, sameDoc, type LibraryDoc } from "@/lib/sync/merge";
import { useStudio, type Run } from "@/store/studio";

/**
 * Keeps this device's library and the shared one in step, so whatever is
 * made or uploaded on the phone is on the desktop too, and the other way
 * round. Pulls when the page opens, when it comes back into view and every
 * half minute while it is in view; pushes a few seconds after a change.
 *
 * Runs still being sent stay on the device that sends them until a service
 * has them, so another device never sends the same one a second time.
 */

const BASE_KEY = "zyns-sync-base";
const PULL_MS = 30_000;
const PUSH_DELAY_MS = 2500;

/** Whether a run belongs in the shared library yet. */
const shared = (run: Run) => !run.id.startsWith(DEMO_PREFIX) && run.state !== "queued" && !run.held;

function keyHeaders(): Record<string, string> {
  const { apiKey, hfKey } = useStudio.getState();
  return { ...(apiKey ? { "x-kie-key": apiKey } : {}), ...(hfKey?.includes(":") ? { "x-hf-key": hfKey } : {}) };
}

/** Which library this device is on: a hash of the key that names it, so changing keys starts afresh. */
async function whoAmI(): Promise<string | null> {
  const { apiKey, hfKey } = useStudio.getState();
  const key = apiKey ? `kie:${apiKey}` : hfKey ? `higgsfield:${hfKey}` : "";
  if (!key || !crypto?.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Base {
  who: string;
  etag: string | null;
  doc: LibraryDoc;
}

function readBase(who: string): Base | null {
  try {
    const base = JSON.parse(localStorage.getItem(BASE_KEY) ?? "null") as Base | null;
    return base && base.who === who ? { ...base, doc: normalizeDoc(base.doc) } : null;
  } catch {
    return null;
  }
}

function writeBase(base: Base) {
  try {
    localStorage.setItem(BASE_KEY, JSON.stringify(base));
  } catch {
    // Out of room: the next sync merges against an older base, which only
    // costs a re-check, never a change.
  }
}

function localDoc(): LibraryDoc {
  const s = useStudio.getState();
  return {
    v: 1,
    runs: s.runs.filter(shared),
    uploads: s.uploads.filter((u) => !u.id.startsWith(DEMO_PREFIX)),
    projects: s.projects,
    elements: s.elements,
    favorites: s.favorites,
    copies: s.copies,
    remotes: s.remotes,
    deleted: s.deleted,
  };
}

let applying = false;

/** Puts a merged library in place, keeping what this device has that is not shared yet. */
function apply(doc: LibraryDoc) {
  const s = useStudio.getState();
  const unshared = s.runs.filter((run) => !shared(run) && !doc.deleted[run.id]);
  const demoUploads = s.uploads.filter((u) => u.id.startsWith(DEMO_PREFIX));
  applying = true;
  useStudio.setState({
    runs: [...unshared, ...doc.runs].sort((a, b) => b.createdAt - a.createdAt),
    uploads: [...demoUploads, ...doc.uploads].sort((a, b) => b.createdAt - a.createdAt),
    projects: doc.projects,
    elements: doc.elements,
    favorites: doc.favorites,
    copies: doc.copies,
    remotes: doc.remotes,
    deleted: doc.deleted,
    activeProjectId: s.activeProjectId && doc.deleted[s.activeProjectId] ? null : s.activeProjectId,
  });
  applying = false;
}

let running = false;
let again = false;
let lastPull = 0;

/**
 * One round: read the shared library, merge, put the result in place here
 * and, if it differs, save it back. `pull` reads even when nothing here has
 * changed; a change-triggered round with nothing new to say skips the trip
 * (a run's status checks touch the list without changing what is shared).
 */
async function syncOnce(pull = true): Promise<void> {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    const who = await whoAmI();
    const headers = keyHeaders();
    if (!who || Object.keys(headers).length === 0) return;
    const known = readBase(who);
    if (!pull && known && sameDoc(localDoc(), known.doc)) return;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch("/api/library", { headers, cache: "no-store" });
      if (!res.ok) return;
      const { doc: raw, etag } = (await res.json()) as { doc: unknown; etag: string | null };
      lastPull = Date.now();
      const remote = normalizeDoc(raw);
      const base = readBase(who)?.doc ?? EMPTY_DOC;
      // Read, merged and put in place in one step, so nothing done on this
      // device between the two can be written over.
      const local = localDoc();
      const merged = mergeDocs(base, local, remote);
      if (!sameDoc(merged, local)) apply(merged);
      if (raw && sameDoc(merged, remote)) {
        writeBase({ who, etag, doc: merged });
        return;
      }
      const put = await fetch("/api/library", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json", ...(etag ? { "x-if-match": etag } : {}) },
        body: JSON.stringify(merged),
      });
      // Another device saved in between: read theirs and merge again.
      if (put.status === 409) continue;
      if (!put.ok) return;
      const { etag: saved } = (await put.json()) as { etag: string | null };
      writeBase({ who, etag: saved, doc: merged });
      return;
    }
  } catch {
    // Offline, or the server is between deploys: the next pull tries again.
  } finally {
    running = false;
    if (again) {
      again = false;
      void syncOnce();
    }
  }
}

export function LibrarySync() {
  const hydrated = useStudio((s) => s.hydrated);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);

  useEffect(() => {
    if (!hydrated || !storageAvailable() || (!apiKey && !hfKey)) return;
    void syncOnce();

    // A change here goes out a moment later, once a burst of them settles.
    let timer: number | undefined;
    const unsubscribe = useStudio.subscribe((state, prev) => {
      if (applying) return;
      const changed =
        state.runs !== prev.runs ||
        state.uploads !== prev.uploads ||
        state.projects !== prev.projects ||
        state.elements !== prev.elements ||
        state.favorites !== prev.favorites ||
        state.copies !== prev.copies ||
        state.remotes !== prev.remotes ||
        state.deleted !== prev.deleted;
      if (!changed) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void syncOnce(false), PUSH_DELAY_MS);
    });

    const pull = () => {
      if (document.visibilityState === "visible" && Date.now() - lastPull > 5_000) void syncOnce();
    };
    document.addEventListener("visibilitychange", pull);
    const every = window.setInterval(pull, PULL_MS);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
      window.clearInterval(every);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [hydrated, apiKey, hfKey]);

  return null;
}
