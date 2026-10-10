/**
 * What a product page says about its product: name, pictures, description
 * and price. A Shopify store answers its own `<product-url>.json`; anything
 * else is read from the page's Open Graph tags and its JSON-LD `Product`.
 * Pure parsing, no fetching: the route does that.
 */

export interface ProductInfo {
  name: string;
  images: string[];
  description?: string;
  price?: string;
  url: string;
}

const MAX_IMAGES = 12;

function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n)));
}

function plain(html: string): string {
  return decode(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

function absolute(url: unknown, base: string): string | undefined {
  if (typeof url !== "string" || !url.trim()) return undefined;
  try {
    const parsed = new URL(url.trim().startsWith("//") ? `https:${url.trim()}` : url.trim(), base);
    return /^https?:$/.test(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

function unique(list: Array<string | undefined>): string[] {
  return [...new Set(list.filter((u): u is string => !!u))].slice(0, MAX_IMAGES);
}

/** A Shopify product's own JSON (`/products/x.json`). */
export function fromShopifyJson(body: unknown, url: string): ProductInfo | null {
  const product = (body as { product?: Record<string, unknown> } | null)?.product;
  if (!product || typeof product.title !== "string") return null;
  const images = Array.isArray(product.images) ? (product.images as Array<{ src?: unknown }>).map((i) => absolute(i?.src, url)) : [];
  const variant = Array.isArray(product.variants) ? (product.variants as Array<{ price?: unknown }>)[0] : undefined;
  return {
    name: product.title.trim(),
    images: unique(images),
    description: typeof product.body_html === "string" ? plain(product.body_html).slice(0, 600) || undefined : undefined,
    price: variant?.price !== undefined ? String(variant.price) : undefined,
    url,
  };
}

function meta(html: string, name: string): string[] {
  const out: string[] = [];
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = /\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (key?.toLowerCase() !== name) continue;
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (content) out.push(decode(content));
  }
  return out;
}

/** Every JSON-LD node on the page, `@graph`s and lists opened up. */
function jsonLd(html: string): Array<Record<string, unknown>> {
  const nodes: Array<Record<string, unknown>> = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    nodes.push(record);
    if (record["@graph"]) visit(record["@graph"]);
  };
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(match[1].trim()));
    } catch {
      // A broken block on the page is skipped, not fatal.
    }
  }
  return nodes;
}

function isProduct(node: Record<string, unknown>): boolean {
  const type = node["@type"];
  return Array.isArray(type) ? type.some((t) => String(t).toLowerCase() === "product") : String(type ?? "").toLowerCase() === "product";
}

function ldImages(value: unknown, base: string): Array<string | undefined> {
  if (Array.isArray(value)) return value.flatMap((v) => ldImages(v, base));
  if (value && typeof value === "object") return [absolute((value as Record<string, unknown>).url ?? (value as Record<string, unknown>).contentUrl, base)];
  return [absolute(value, base)];
}

function ldPrice(offers: unknown): string | undefined {
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (!offer || typeof offer !== "object") return undefined;
  const o = offer as Record<string, unknown>;
  const amount = o.price ?? o.lowPrice;
  if (amount === undefined || amount === null || amount === "") return undefined;
  return [String(amount), typeof o.priceCurrency === "string" ? o.priceCurrency : ""].filter(Boolean).join(" ");
}

/** A product page's HTML: JSON-LD first, then Open Graph, then the title. */
export function fromHtml(html: string, url: string): ProductInfo | null {
  const product = jsonLd(html).find(isProduct);
  const ogImages = [...meta(html, "og:image"), ...meta(html, "og:image:url"), ...meta(html, "og:image:secure_url")].map((u) => absolute(u, url));
  const name =
    (typeof product?.name === "string" && decode(product.name).trim()) ||
    meta(html, "og:title")[0]?.trim() ||
    plain(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  const images = unique([...(product ? ldImages(product.image, url) : []), ...ogImages]);
  if (!name && images.length === 0) return null;
  const description =
    (typeof product?.description === "string" && plain(product.description)) || meta(html, "og:description")[0] || meta(html, "description")[0];
  const price =
    ldPrice(product?.offers) ??
    ([meta(html, "product:price:amount")[0], meta(html, "product:price:currency")[0]].filter(Boolean).join(" ") || undefined);
  return { name: name || "Product", images, description: description?.slice(0, 600) || undefined, price, url };
}
