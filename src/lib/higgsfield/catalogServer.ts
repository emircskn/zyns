/**
 * The live Higgsfield catalogue, for the server: fetched from
 * dash.higgsfield.ai at most once an hour per instance, and the snapshot
 * shipped with the app whenever that fails.
 */
import snapshot from "@/lib/registry/hf/generated/catalog.json";
import { DASH, fetchCatalog, type HfCatalog } from "./catalogSource";
import { ENDPOINTS } from "./client";

const SNAPSHOT = snapshot as unknown as HfCatalog;
const FRESH_MS = 60 * 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

/** Set to a dead address to see the snapshot fallback at work. */
const ORIGIN = process.env.HF_CATALOG_ORIGIN || DASH;

let cached: { catalog: HfCatalog; at: number } | null = null;
let loading: Promise<HfCatalog> | null = null;

export interface LoadedCatalog {
  catalog: HfCatalog;
  /** False when this is the shipped snapshot, because the live catalogue could not be read. */
  live: boolean;
}

export async function loadCatalog(): Promise<LoadedCatalog> {
  if (cached && Date.now() - cached.at < FRESH_MS) return { catalog: cached.catalog, live: true };
  loading ??= fetchCatalog(
    (url) =>
      fetch(url.replace(DASH, ORIGIN), {
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }),
    cached?.catalog ?? SNAPSHOT,
  ).finally(() => {
    loading = null;
  });
  try {
    const catalog = await loading;
    cached = { catalog, at: Date.now() };
    return { catalog, live: true };
  } catch {
    // The last live copy if this instance has one, else the shipped one.
    return { catalog: cached?.catalog ?? SNAPSHOT, live: false };
  }
}

/** Whether the proxy may relay a submission to this endpoint: one the catalogue lists. */
export async function isKnownEndpoint(endpoint: string | undefined): Promise<boolean> {
  if (!endpoint) return false;
  if (ENDPOINTS.has(endpoint)) return true;
  const { catalog } = await loadCatalog();
  return catalog.specs.some((s) => s.endpoint === endpoint);
}
