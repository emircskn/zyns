/**
 * Marketing Studio's styles, ours: Higgsfield's web app has a style catalogue
 * its public API does not offer, so a style here is its cover, sent to the
 * model as one more reference picture to take the look from. Covers live in
 * public/marketing-styles/<id>.webp.
 */
export type StyleGroup = "image" | "video";
export type StyleCategory = "product-shot" | "ads" | "marketplace";

export interface MarketingStyle {
  id: string;
  name: string;
  category: StyleCategory;
}

export const STYLE_CATEGORIES: Array<{ id: StyleCategory; label: string; group: StyleGroup; icon: "box" | "monitor" | "bag" }> = [
  { id: "product-shot", label: "Product shot", group: "image", icon: "box" },
  { id: "ads", label: "Ads", group: "image", icon: "monitor" },
  { id: "marketplace", label: "Marketplace", group: "image", icon: "bag" },
];

const s = (id: string, name: string, category: StyleCategory): MarketingStyle => ({ id, name, category });

export const MARKETING_STYLES: MarketingStyle[] = [
  s("closeup", "Closeup", "product-shot"),
  s("faceless", "Faceless", "product-shot"),
  s("full-body", "Full body", "product-shot"),
  s("editorial", "Editorial", "product-shot"),
  s("ugc", "UGC", "product-shot"),
  s("studio-white", "Studio white", "product-shot"),
  s("color-pop", "Color pop", "product-shot"),
  s("natural", "Natural", "product-shot"),
  s("usage", "Usage", "product-shot"),
  s("social-proof", "Social proof", "ads"),
  s("comparison", "Comparison", "ads"),
  s("problem-solution", "Problem → Solution", "ads"),
  s("dark", "Dark", "marketplace"),
  s("3d-surreal", "3D surreal", "marketplace"),
  s("pastel", "Pastel", "marketplace"),
  s("clean-studio", "Clean Studio", "marketplace"),
];

export const styleById = (id: string | null | undefined) => MARKETING_STYLES.find((x) => x.id === id) ?? null;
// From the site itself when this runs elsewhere (the standalone copy), as the model covers are.
export const styleCover = (id: string) => `${process.env.NEXT_PUBLIC_ASSET_BASE ?? ""}/marketing-styles/${id}.webp`;
