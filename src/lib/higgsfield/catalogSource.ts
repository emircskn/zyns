/**
 * Higgsfield's model catalogue, as the API console (open.higgsfield.ai) reads
 * it from dash.higgsfield.ai: every model family with its preview and price,
 * and every endpoint with its request schema and form hints.
 *
 * These endpoints need no key but are not documented, so the result is
 * cached by the /api/hf-catalog route, and a snapshot of it ships with the
 * app (src/lib/registry/hf/generated/catalog.json) for when they fail.
 *
 * Self-contained on purpose: scripts/refresh-hf-catalog.ts imports this file
 * directly under Node, without the app's path aliases.
 */

export const DASH = "https://dash.higgsfield.ai";

export interface SpecProp {
  type?: string;
  enum?: Array<string | number | boolean>;
  enumLabels?: Record<string, string>;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  format?: string;
  items?: { type?: string; enum?: unknown[]; format?: string; properties?: Record<string, SpecProp> };
  desc: string;
  required: boolean;
}

/** How Higgsfield's own form presents one field (its `ui_schema`). */
export interface UiHint {
  /** Tucked into the form's advanced section. */
  advanced?: boolean;
  widget?: string;
  title?: string;
  placeholder?: string;
  help?: string;
  /** Shown only while another field holds this value. */
  visibleWhen?: { field: string; equals: unknown };
}

export interface CatalogMedia {
  video?: string;
  poster?: string;
  image?: string;
}

export interface CatalogPrice {
  amount: number;
  original?: number;
  currency: string;
  unit: string;
  qualifier?: string;
}

export interface CatalogSpec {
  /** Higgsfield model ID, e.g. `bytedance/seedance-2.0/text-to-video`. */
  model: string;
  endpoint: string;
  doc: string;
  title: string;
  crumb: string;
  family: string;
  output: "image" | "video" | "audio";
  /** The request body's properties; Higgsfield bodies are flat. */
  top: Record<string, SpecProp>;
  notes: string[];
  /** The order Higgsfield's form lists the fields in. */
  order?: string[];
  ui?: Record<string, UiHint>;
  /** The mode's own name within its family ("Motion Transfer"). */
  variant?: string;
  operations?: string[];
  /** How the mode is priced, in Higgsfield's words. */
  pricing?: string;
  /** A sample prompt from Higgsfield's playground. */
  example?: string;
  banner?: CatalogMedia;
  preview?: CatalogMedia;
}

export interface CatalogFamily {
  name: string;
  desc: string;
  company?: string;
  preview?: CatalogMedia;
  price?: CatalogPrice;
}

export interface HfCatalog {
  source: string;
  fetchedAt?: string;
  count: number;
  families: Record<string, CatalogFamily>;
  specs: CatalogSpec[];
}

type Json = Record<string, unknown>;
type Fetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

/** A JSON Schema property as the registry reads it. `["string", "null"]` is an optional string. */
function propOf(raw: Json, required: boolean, before?: SpecProp): SpecProp {
  const type = Array.isArray(raw.type) ? raw.type.find((t) => t !== "null") : raw.type;
  const out: SpecProp = { desc: str(raw.description) ?? before?.desc ?? "", required };
  if (typeof type === "string") out.type = type;
  if (Array.isArray(raw.enum)) {
    out.enum = raw.enum.filter((v) => v !== null) as SpecProp["enum"];
    // Labels written for values Higgsfield still offers stay; the rest go.
    if (before?.enumLabels) {
      const kept = Object.entries(before.enumLabels).filter(([v]) => out.enum!.map(String).includes(v));
      if (kept.length > 0) out.enumLabels = Object.fromEntries(kept);
    }
  }
  if (raw.default !== undefined && raw.default !== null) out.default = raw.default;
  for (const key of ["minimum", "maximum", "maxLength", "minItems", "maxItems"] as const) {
    const n = num(raw[key]);
    if (n !== undefined) out[key] = n;
  }
  if (str(raw.format)) out.format = raw.format as string;
  const items = obj(raw.items);
  if (Object.keys(items).length > 0) {
    const nested = obj(items.properties);
    const nestedRequired = Array.isArray(items.required) ? (items.required as string[]) : [];
    out.items = {
      ...(str(items.type) ? { type: items.type as string } : {}),
      ...(Array.isArray(items.enum) ? { enum: items.enum } : {}),
      ...(str(items.format) ? { format: items.format as string } : {}),
      ...(Object.keys(nested).length > 0
        ? {
            properties: Object.fromEntries(
              Object.entries(nested).map(([k, v]) => [
                k,
                propOf(obj(v), nestedRequired.includes(k), before?.items?.properties?.[k]),
              ]),
            ),
          }
        : {}),
    };
  }
  return out;
}

function uiOf(raw: unknown): { order?: string[]; ui?: Record<string, UiHint> } {
  const schema = obj(raw);
  const order = Array.isArray(schema["ui:order"]) ? (schema["ui:order"] as string[]).filter((k) => k !== "*") : undefined;
  const ui: Record<string, UiHint> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key.startsWith("ui:")) continue;
    const entry = obj(value);
    const options = obj(entry["ui:options"]);
    const hint: UiHint = {};
    if (typeof options.advanced === "boolean") hint.advanced = options.advanced;
    if (str(entry["ui:widget"])) hint.widget = entry["ui:widget"] as string;
    if (str(entry["ui:title"])) hint.title = entry["ui:title"] as string;
    if (str(entry["ui:placeholder"])) hint.placeholder = entry["ui:placeholder"] as string;
    if (str(entry["ui:help"])) hint.help = entry["ui:help"] as string;
    const when = obj(options.visibleWhen);
    if (str(when.field)) hint.visibleWhen = { field: when.field as string, equals: when.equals };
    if (Object.keys(hint).length > 0) ui[key] = hint;
  }
  return { order, ui: Object.keys(ui).length > 0 ? ui : undefined };
}

function mediaOf(video: unknown, image: unknown): CatalogMedia | undefined {
  const v = obj(video);
  const i = obj(image);
  const out: CatalogMedia = {
    video: str(v.video_url) ?? (v.type === "video" ? str(v.url) : undefined),
    poster: str(v.thumbnail_url) ?? str(v.poster),
    image: str(i.url) ?? str(i.image_url) ?? str(i.thumbnail_url) ?? (v.type === "image" ? str(v.url) : undefined),
  };
  return out.video || out.poster || out.image ? JSON.parse(JSON.stringify(out)) : undefined;
}

const OUTPUTS = new Set(["image", "video", "audio"]);

/** One endpoint, from its detail; what the previous catalogue knew about it fills what the API leaves out. */
export function specOf(detail: Json, family: string, before?: CatalogSpec): CatalogSpec | null {
  const model = str(detail.slug);
  const schema = obj(detail.input_schema);
  const props = obj(schema.properties);
  if (!model || Object.keys(props).length === 0) return null;
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const output = str(detail.output_type);
  const { order, ui } = uiOf(detail.ui_schema);
  const playground = obj(obj(detail.playground).initial_values);
  return {
    model,
    endpoint: `/${model}`,
    doc: before?.doc ?? `${DASH}/models/${model}/llms.txt`,
    title: str(detail.title) ?? before?.title ?? model,
    crumb: str(obj(detail.family).title) ?? before?.crumb ?? str(detail.title) ?? model,
    family,
    output: output && OUTPUTS.has(output) ? (output as CatalogSpec["output"]) : before?.output ?? "image",
    top: Object.fromEntries(
      Object.entries(props).map(([key, raw]) => [key, propOf(obj(raw), required.includes(key), before?.top[key])]),
    ),
    notes: before?.notes ?? [],
    order,
    ui,
    variant: str(detail.variant_title),
    operations: Array.isArray(detail.operation_type) ? (detail.operation_type as string[]) : undefined,
    pricing: str(detail.pricing_description),
    example: str(playground.prompt),
    banner: mediaOf(detail.banner_media ?? detail.banner_video, detail.banner_image),
    preview: mediaOf(detail.preview_video, detail.preview_image),
  };
}

async function getJson(fetcher: Fetch, path: string): Promise<Json> {
  const res = await fetcher(`${DASH}${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return obj(await res.json());
}

/** Runs `work` over `items`, a few at a time. */
async function inBatches<T, R>(items: T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(work))));
  return out;
}

/**
 * Reads the whole catalogue. `previous` is the last good one: endpoints keep
 * their family, notes and hand-written labels from it, and an endpoint the
 * API stops listing is kept from it rather than vanishing from the studio.
 */
export async function fetchCatalog(fetcher: Fetch, previous: HfCatalog): Promise<HfCatalog> {
  const known = new Map(previous.specs.map((s) => [s.model, s]));

  const list = await getJson(fetcher, "/api/v2/app-models/?page_size=100");
  const slugs = (Array.isArray(list.results) ? list.results : []).map((r) => str(obj(r).slug)).filter(Boolean) as string[];
  if (slugs.length === 0) throw new Error("app-models: empty list");

  const details = await inBatches(slugs, 8, (slug) => getJson(fetcher, `/api/v2/app-models/${slug}/`));

  // An endpoint new to the studio joins the family of any sibling it knows.
  const familyOf = (detail: Json): string => {
    const slug = str(detail.slug)!;
    const before = known.get(slug);
    if (before) return before.family;
    const fam = obj(detail.family);
    const siblings = Array.isArray(fam.models) ? fam.models.map((m) => str(obj(m).slug)) : [];
    for (const sibling of siblings) {
      const found = sibling && known.get(sibling);
      if (found) return found.family;
    }
    return str(fam.slug) ?? slug.replace(/[^a-z0-9]+/gi, "-");
  };

  const specs: CatalogSpec[] = [];
  const seen = new Set<string>();
  for (const detail of details) {
    const slug = str(detail.slug);
    if (!slug || seen.has(slug)) continue;
    const spec = specOf(detail, familyOf(detail), known.get(slug));
    if (!spec) continue;
    seen.add(slug);
    specs.push(spec);
  }
  for (const spec of previous.specs) if (!seen.has(spec.model)) specs.push(spec);

  // Family previews and prices come from the catalogue's model cards, each
  // filed under the family of the endpoint it opens on.
  const families: Record<string, CatalogFamily> = JSON.parse(JSON.stringify(previous.families));
  const bySlug = new Map(specs.map((s) => [s.model, s]));
  for (const detail of details) {
    const spec = bySlug.get(str(detail.slug) ?? "");
    if (!spec || families[spec.family]) continue;
    families[spec.family] = { name: spec.crumb, desc: str(detail.og_description) ?? "" };
  }
  const cards: Json[] = [];
  for (let page = 1, more = true; more && page <= 5; page++) {
    const body = await getJson(fetcher, `/api/v2/catalog-models/${page > 1 ? `?page=${page}` : ""}`);
    if (Array.isArray(body.results)) cards.push(...body.results.map(obj));
    more = Boolean(body.next);
  }
  for (const card of cards) {
    if (card.catalog_type && card.catalog_type !== "model") continue;
    const entries = Array.isArray(card.entry_points) ? card.entry_points.map((e) => str(obj(e).mode_id)) : [];
    const spec = [str(card.default_mode_id), ...entries].map((id) => id && bySlug.get(id)).find(Boolean);
    if (!spec || !families[spec.family]) continue;
    const family = families[spec.family];
    const primary = obj(obj(card.pricing).primary);
    const amount = num(primary.amount);
    family.company = str(obj(card.company).name) ?? family.company;
    family.preview = mediaOf(card.preview_video, card.preview_image) ?? family.preview;
    if (amount !== undefined) {
      family.price = {
        amount,
        original: num(primary.original_amount),
        currency: str(primary.currency) ?? "USD",
        unit: str(primary.unit) ?? "",
        qualifier: str(primary.qualifier),
      };
    }
  }

  return { source: `${DASH}/api/v2`, fetchedAt: new Date().toISOString(), count: specs.length, families, specs };
}
