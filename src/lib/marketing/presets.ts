"use client";

/**
 * Marketing Studio's preset catalogue, read page by page from Higgsfield
 * with the person's own key and kept for the visit. Nothing about a preset
 * is written in the code: its id, name, kind and preview all come from here.
 */
import { create } from "zustand";
import { getMarketingPresets } from "@/lib/higgsfield/transport";
import type { MarketingPreset } from "./types";

interface Catalogue {
  items: MarketingPreset[];
  /** The next page's cursor; null once the last page is in. */
  cursor: string | null;
  done: boolean;
  loading: boolean;
  error: string | null;
  /** The key the pages were read with: another key starts over. */
  key: string | null;
  loadMore: (hfKey: string) => Promise<void>;
}

export const usePresetCatalogue = create<Catalogue>((set, get) => ({
  items: [],
  cursor: null,
  done: false,
  loading: false,
  error: null,
  key: null,
  async loadMore(hfKey) {
    const now = get();
    if (now.key !== hfKey) set({ items: [], cursor: null, done: false, error: null, key: hfKey });
    const state = get();
    if (state.loading || state.done) return;
    set({ loading: true, error: null });
    try {
      const page = await getMarketingPresets(hfKey, state.cursor ?? undefined);
      set((s) => {
        const known = new Set(s.items.map((i) => i.id));
        return {
          items: [...s.items, ...page.items.filter((i) => !known.has(i.id))],
          cursor: page.cursor,
          done: !page.cursor || page.items.length === 0,
          loading: false,
        };
      });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "The presets could not be loaded." });
    }
  },
}));

/** "product_shot" → "Product shot". */
export function typeLabel(type: string): string {
  const words = type.replace(/[_-]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1).toLowerCase() : "Other";
}

/** The kinds among the presets loaded so far, in the order they first appear. */
export function presetTypes(items: MarketingPreset[]): string[] {
  return [...new Set(items.map((i) => i.type))];
}
