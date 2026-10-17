/**
 * Finds the files in the studio's R2 bucket that nothing points at any more
 * (media and the small pictures made from it), and deletes them when asked.
 *
 *   R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=… \
 *     node scripts/r2-orphans.mjs [--min-age-days 2] [--state zyns.json] [--delete]
 *
 * "Pointed at" is read from the shared libraries kept in the bucket itself
 * (library/*.json: runs, uploads, elements, copies), so every device's work
 * counts, not just one browser's. Without --delete it only reports.
 * --explain says why each file counts as in use (report only).
 * --notes-too also counts as unused a file that only has a "copy exists" note.
 * --state adds a browser's own saved state (copy(localStorage.zyns)) for work
 * not shared yet. Files newer than --min-age-days are never touched.
 */
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";

const KEY_IN_TEXT = /(?:media|test)\/([0-9a-f-]{36})\.[a-z0-9]{2,5}/g;

/** Every file id (the random part of a media name) the text mentions. */
export function referencedIds(text) {
  return new Set([...text.matchAll(KEY_IN_TEXT)].map((m) => m[1]));
}

/** The id a media file or its small picture belongs to; undefined for anything else. */
const idOf = (key) => key.match(/^(?:media\/|thumbs\/\d+\/)([0-9a-f-]{36})\.[a-z0-9]{2,5}$/)?.[1];

/** Objects ({key, size, modified}) in media/ or thumbs/ that nothing references and that are old enough. */
export function findOrphans(objects, ids, now, minAgeMs) {
  return objects.filter((o) => {
    const id = idOf(o.key);
    return id && !ids.has(id) && now - o.modified >= minAgeMs;
  });
}

/**
 * Who holds each file, from the parsed library documents: id -> [{how, label}].
 * how: "out" (a run's result), "in" (a run's reference), "own" (an upload or
 * element), "record" (only a note that a copy exists, which keeps nothing alive).
 */
export function holders(docs) {
  const map = new Map();
  const add = (id, how, label) => (map.get(id) ?? map.set(id, []).get(id)).push({ how, label });
  const day = (t) => (t ? new Date(t).toISOString().slice(0, 10) : "?");
  for (const doc of docs) {
    // A run names its files by where they came from; the copy notes say which stored file that is.
    const copies = Object.entries(doc.copies ?? {}).map(([url, c]) => [url, referencedIds(String(c.key ?? ""))]);
    const idsIn = (value) => {
      const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
      const found = referencedIds(text);
      for (const [url, ids] of copies) if (text.includes(url)) ids.forEach((i) => found.add(i));
      return found;
    };
    for (const r of doc.runs ?? []) {
      const label = `run ${String(r.id).slice(0, 8)} ${r.modelName ?? ""} ${day(r.createdAt)}${r.trashedAt ? " (Trash)" : ""} "${String(r.prompt ?? "").slice(0, 30)}"`;
      idsIn(r.urls).forEach((i) => add(i, "out", label));
      idsIn(r.values).forEach((i) => add(i, "in", label));
    }
    for (const u of doc.uploads ?? []) idsIn(u.url).forEach((i) => add(i, "own", `upload "${u.name ?? ""}" ${day(u.createdAt)}${u.trashedAt ? " (Trash)" : ""}`));
    for (const e of doc.elements ?? []) idsIn(e).forEach((i) => add(i, "own", `element ${e.name ?? ""}`));
    for (const c of doc.motionClips ?? []) idsIn(c).forEach((i) => add(i, "own", "motion clip"));
    for (const [, ids] of copies) ids.forEach((i) => add(i, "record", "copy note"));
    for (const k of Object.keys(doc.remotes ?? {})) referencedIds(k).forEach((i) => add(i, "record", "remote note"));
    idsIn(doc.favorites).forEach((i) => add(i, "record", "favorite"));
  }
  return map;
}

/** used: something shows it; inputOnly: only a run's reference; recordOnly: only notes; none: nothing. */
export function category(entries = []) {
  if (entries.some((e) => e.how === "out" || e.how === "own")) return "used";
  if (entries.some((e) => e.how === "in")) return "inputOnly";
  return entries.length ? "recordOnly" : "none";
}

export function parseList(xml) {
  const tag = (s, name) => s.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1];
  return {
    objects: [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((m) => ({
      key: tag(m[1], "Key"),
      size: Number(tag(m[1], "Size")),
      modified: Date.parse(tag(m[1], "LastModified")),
    })),
    next: tag(xml, "IsTruncated") === "true" ? tag(xml, "NextContinuationToken") : undefined,
  };
}

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const hmac = (k, d) => createHmac("sha256", k).update(d).digest();

/** A presigned URL (AWS SigV4, region "auto"), the same way the app signs its own. */
function sign(env, method, key, params = {}) {
  const host = `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${enc(env.R2_BUCKET)}${key ? `/${key.split("/").map(enc).join("/")}` : ""}`;
  const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const query = {
    ...params,
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${env.R2_ACCESS_KEY_ID}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": "600",
    "X-Amz-SignedHeaders": "host",
  };
  const q = Object.keys(query).sort().map((k) => `${enc(k)}=${enc(query[k])}`).join("&");
  const canonical = [method, path, q, `host:${host}`, "", "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, createHash("sha256").update(canonical).digest("hex")].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${env.R2_SECRET_ACCESS_KEY}`, day), "auto"), "s3"), "aws4_request");
  return `https://${host}${path}?${q}&X-Amz-Signature=${createHmac("sha256", signingKey).update(toSign).digest("hex")}`;
}

async function ok(res, what) {
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res;
}

async function listAll(env) {
  const all = [];
  let token;
  do {
    const res = await ok(await fetch(sign(env, "GET", "", { "list-type": "2", ...(token ? { "continuation-token": token } : {}) })), "list");
    const page = parseList(await res.text());
    all.push(...page.objects);
    token = page.next;
  } while (token);
  return all;
}

function explain(objects, docs) {
  const h = holders(docs);
  const mb = (n) => (n / 1048576).toFixed(1);
  const groups = { used: [], inputOnly: [], recordOnly: [], none: [] };
  for (const o of objects.filter((x) => x.key.startsWith("media/"))) {
    groups[category(h.get(idOf(o.key)))].push(o);
  }
  const total = (list) => `${list.length} files, ${mb(list.reduce((n, o) => n + o.size, 0))} MB`;
  console.log(`\nMedia in the bucket: ${Object.values(groups).flat().length}`);
  console.log(`  shown in the studio (a result, an upload or an element): ${total(groups.used)}`);
  console.log(`  held only as a reference of some run:                    ${total(groups.inputOnly)}`);
  console.log(`  only a note that a copy exists, nothing uses it:         ${total(groups.recordOnly)}`);
  console.log(`  in no library at all:                                    ${total(groups.none)}`);
  const show = (title, list) => {
    if (list.length === 0) return;
    console.log(`\n${title}`);
    for (const o of list.slice(0, 40)) {
      const who = [...new Set((h.get(idOf(o.key)) ?? []).filter((e) => e.how !== "record").map((e) => e.label))].slice(0, 2).join(" | ");
      console.log(`  ${o.key}  ${mb(o.size)} MB  ${new Date(o.modified).toISOString().slice(0, 10)}  ${who}`);
    }
    if (list.length > 40) console.log(`  … and ${list.length - 40} more`);
  };
  show("Held only as a reference of a run (delete the run and these go):", groups.inputOnly);
  show("Only a note that a copy exists, nothing uses them:", groups.recordOnly);
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => args.includes(name);
  const value = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
  const env = process.env;
  for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) {
    if (!env[k]) throw new Error(`Set ${k} first.`);
  }
  const minAgeMs = Number(value("--min-age-days", "2")) * 86_400_000;

  const objects = await listAll(env);
  const libraries = objects.filter((o) => /^library\/.+\.json$/.test(o.key));
  // Without a library to compare against, everything would look unused.
  if (libraries.length === 0 && !value("--state")) throw new Error("No library found in the bucket: nothing to compare with, stopping.");

  let ids = new Set();
  const docs = [];
  for (const lib of libraries) {
    const text = await (await ok(await fetch(sign(env, "GET", lib.key)), `read ${lib.key}`)).text();
    ids = new Set([...ids, ...referencedIds(text)]);
    try {
      docs.push(JSON.parse(text));
    } catch {
      console.log(`  (could not read ${lib.key} as a library, only counted)`);
    }
  }
  // A note that a copy exists keeps nothing alive; only something that shows the file does.
  if (flag("--notes-too")) {
    if (docs.length < libraries.length) throw new Error("A library could not be read, so --notes-too would be guessing: stopping.");
    ids = new Set([...holders(docs)].filter(([, e]) => ["used", "inputOnly"].includes(category(e))).map(([id]) => id));
  }
  if (value("--state")) ids = new Set([...ids, ...referencedIds(readFileSync(value("--state"), "utf8"))]);

  if (flag("--explain")) return explain(objects, docs);

  const orphans = findOrphans(objects, ids, Date.now(), minAgeMs);
  const mb = (n) => (n / 1048576).toFixed(1);
  const mediaCount = objects.filter((o) => o.key.startsWith("media/")).length;
  console.log(`${objects.length} objects, ${libraries.length} libraries, ${ids.size} files in use (${mediaCount} media in the bucket).`);
  console.log(`${orphans.length} unused (${mb(orphans.reduce((n, o) => n + o.size, 0))} MB), older than ${value("--min-age-days", "2")} days:`);
  for (const o of orphans.slice(0, 30)) console.log(`  ${o.key}  ${mb(o.size)} MB  ${new Date(o.modified).toISOString().slice(0, 10)}`);
  if (orphans.length > 30) console.log(`  … and ${orphans.length - 30} more`);

  if (!flag("--delete")) return console.log("\nNothing deleted. Add --delete to remove these.");
  if (orphans.length === 0) return;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nDelete these ${orphans.length} files for good? Type "sil" to confirm: `);
  rl.close();
  if (answer.trim() !== "sil") return console.log("Cancelled.");
  let done = 0;
  for (let i = 0; i < orphans.length; i += 8) {
    await Promise.all(
      orphans.slice(i, i + 8).map(async (o) => {
        const res = await fetch(sign(env, "DELETE", o.key), { method: "DELETE" });
        if (res.ok || res.status === 404) done++;
        else console.log(`  failed ${o.key}: HTTP ${res.status} ${(await res.text()).replace(/\s+/g, " ").slice(0, 300)}`);
      }),
    );
  }
  console.log(`Deleted ${done} of ${orphans.length}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
