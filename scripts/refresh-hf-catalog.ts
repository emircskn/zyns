/**
 * Refreshes the Higgsfield catalogue snapshot that ships with the app, and
 * that /api/hf-catalog falls back to when dash.higgsfield.ai is unreachable.
 *
 *   node scripts/refresh-hf-catalog.ts
 *
 * Reports what changed; review the diff before committing it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fetchCatalog, type HfCatalog } from "../src/lib/higgsfield/catalogSource.ts";

const SNAPSHOT = new URL("../src/lib/registry/hf/generated/catalog.json", import.meta.url);

const previous = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as HfCatalog;
const next = await fetchCatalog((url) => fetch(url), previous);

const before = new Map(previous.specs.map((s) => [s.model, JSON.stringify(s.top)]));
const added = next.specs.filter((s) => !before.has(s.model)).map((s) => s.model);
const changed = next.specs.filter((s) => before.has(s.model) && before.get(s.model) !== JSON.stringify(s.top)).map((s) => s.model);

writeFileSync(SNAPSHOT, `${JSON.stringify(next, null, 1)}\n`);
console.log(`${next.specs.length} endpoints, ${Object.keys(next.families).length} families`);
if (added.length) console.log(`new: ${added.join(", ")}`);
if (changed.length) console.log(`schema changed: ${changed.join(", ")}`);
