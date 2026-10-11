"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { isDirect } from "@/lib/higgsfield/transport";
import { elementName, MAX_ELEMENT_IMAGES, type LibraryElement } from "@/lib/elements";
import type { ProductInfo } from "@/lib/marketing/productPage";
import { makeMediaRef } from "@/lib/media";
import { useStudio } from "@/store/studio";

/**
 * Product Link: paste a product page, and its name, pictures, description
 * and price come back. Pick the pictures worth keeping and save them as a
 * product element, which every composer can then use (`@name`, or as the
 * product in Marketing Studio).
 */
export function ProductLink({ onSaved }: { onSaved?: (element: LibraryElement) => void }) {
  const saveElement = useStudio((s) => s.saveElement);
  const elements = useStudio((s) => s.elements);
  const [url, setUrl] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");

  // The standalone file has no server of its own to read other sites with.
  if (isDirect()) {
    return <p className="rounded-card bg-t1/[0.04] px-3 py-3 text-[12.5px] text-t3">Product Link needs the ZYNS site: open it there to read a product page.</p>;
  }

  async function read() {
    const link = url.trim();
    if (!link || reading) return;
    setReading(true);
    setError(null);
    setProduct(null);
    try {
      const res = await fetch(`/api/marketing/product-link?url=${encodeURIComponent(link)}`);
      const body = (await res.json().catch(() => ({}))) as ProductInfo & { error?: string };
      if (!res.ok) throw new Error(body.error ?? `The page could not be read (HTTP ${res.status}).`);
      setProduct(body);
      setPicked(body.images.slice(0, Math.min(4, MAX_ELEMENT_IMAGES)));
      setName(elementName(body.name));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The page could not be read.");
    } finally {
      setReading(false);
    }
  }

  async function save() {
    if (!product || picked.length === 0 || saving) return;
    const base = elementName(name) || "product";
    // `@name` has to be one thing only.
    let unique = base;
    for (let n = 2; elements.some((e) => e.name === unique); n += 1) unique = `${base}-${n}`;
    setSaving(true);
    setError(null);
    try {
      // Each kept for good: a shop's picture links change and expire.
      const images = await Promise.all(picked.slice(0, MAX_ELEMENT_IMAGES).map((u) => makeMediaRef(u, "image")));
      const element: LibraryElement = {
        id: crypto.randomUUID(),
        kind: "product",
        name: unique,
        images,
        notes: product.description?.slice(0, 280),
        props: product.price ? { price: product.price } : undefined,
        status: "ready",
        createdAt: Date.now(),
      };
      saveElement(element);
      onSaved?.(element);
      setProduct(null);
      setUrl("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The product could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const toggle = (image: string) =>
    setPicked((now) => (now.includes(image) ? now.filter((u) => u !== image) : now.length < MAX_ELEMENT_IMAGES ? [...now, image] : now));

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void read();
        }}
        className="flex items-center gap-2 rounded-card bg-t1/[0.05] p-1.5 pl-3"
      >
        <Icon name="link" size={15} className="shrink-0 text-t4" />
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://shop.example/products/serum"
          aria-label="Product page link"
          inputMode="url"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-t1 outline-none placeholder:text-t4 md:text-[13.5px]"
        />
        <button type="submit" disabled={!url.trim() || reading} className="cta h-8 shrink-0 rounded-full px-3.5 text-[12.5px] font-medium disabled:opacity-40">
          {reading ? "Reading…" : "Read"}
        </button>
      </form>
      {!product && !error && (
        <p className="text-[12px] leading-relaxed text-t4">
          Shopify stores and most shops with product tags work. The pictures you pick are kept in your storage.
        </p>
      )}
      {error && <p className="text-[12.5px] text-[#ff8f8f]">{error}</p>}

      {product && (
        <div className="anim-fade flex flex-col gap-3">
          <div>
            <p className="text-[14px] text-t1">{product.name}</p>
            {product.price && <p className="text-[12.5px] text-t3">{product.price}</p>}
            {product.description && <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-t3">{product.description}</p>}
          </div>
          {product.images.length === 0 ? (
            <p className="text-[12.5px] text-t3">No pictures were found on that page.</p>
          ) : (
            <>
              <p className="text-[12px] text-t3">
                Pick the pictures to keep · {picked.length}/{Math.min(MAX_ELEMENT_IMAGES, product.images.length)}
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {product.images.map((image) => {
                  const on = picked.includes(image);
                  return (
                    <button
                      key={image}
                      type="button"
                      onClick={() => toggle(image)}
                      aria-pressed={on}
                      className="relative aspect-square overflow-hidden rounded-[10px] bg-t1/[0.05]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="" loading="lazy" className={`h-full w-full object-cover transition-opacity duration-[120ms] ${on ? "" : "opacity-45"}`} />
                      <span
                        aria-hidden
                        className={`absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full border transition-colors duration-[120ms] ${
                          on ? "border-accent bg-accent text-accent-ink" : "border-white/70 bg-black/30 text-transparent"
                        }`}
                      >
                        <Icon name="check" size={11} strokeWidth={2.6} />
                      </span>
                      {picked[0] === image && <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 text-[10px] text-white">Cover</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <label className="flex items-center gap-2 rounded-card bg-t1/[0.05] px-3 py-2">
            <span className="text-[14px] text-t3">@</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Product name"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-t1 outline-none md:text-[13.5px]"
            />
          </label>
          <button
            type="button"
            onClick={() => void save()}
            disabled={picked.length === 0 || saving || !elementName(name)}
            className="cta h-10 rounded-full text-[13.5px] font-medium disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save as product"}
          </button>
        </div>
      )}
    </div>
  );
}
