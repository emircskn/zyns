/**
 * Marketing Studio's styles, ours: Higgsfield's web app has a style catalogue
 * its public API does not offer, so each style here is a direction written
 * into the prompt. Covers live in public/marketing-styles/<id>.webp.
 */
export type StyleGroup = "image" | "video";
export type StyleCategory = "product-shot" | "ads" | "marketplace" | "ugc" | "motion";

export interface MarketingStyle {
  id: string;
  name: string;
  category: StyleCategory;
  prompt: string;
}

export const STYLE_CATEGORIES: Array<{ id: StyleCategory; label: string; group: StyleGroup; icon: "box" | "monitor" | "grid" | "user" | "move" }> = [
  { id: "product-shot", label: "Product shot", group: "image", icon: "box" },
  { id: "ads", label: "Ads", group: "image", icon: "monitor" },
  { id: "marketplace", label: "Marketplace", group: "image", icon: "grid" },
  { id: "ugc", label: "UGC", group: "video", icon: "user" },
  { id: "motion", label: "Motion", group: "video", icon: "move" },
];

const s = (id: string, name: string, category: StyleCategory, prompt: string): MarketingStyle => ({ id, name, category, prompt });

export const MARKETING_STYLES: MarketingStyle[] = [
  s("closeup", "Closeup", "product-shot", "Close-up beauty shot of a smiling person holding the product near their face, bright clean light, white background, sharp focus on the product."),
  s("faceless", "Faceless", "product-shot", "A hand holding the product into frame against a bold plain colour background, no face shown, playful and graphic."),
  s("full-body", "Full body", "product-shot", "Full-body lifestyle shot of a person relaxing at home with the product, natural daylight, candid joyful mood."),
  s("editorial", "Editorial", "product-shot", "Fashion editorial portrait with the product styled in, soft studio light, pastel backdrop, magazine quality."),
  s("ugc", "UGC", "product-shot", "Casual phone-camera photo of a person carrying the product in everyday life, authentic user-generated look."),
  s("studio-white", "Studio white", "product-shot", "The product alone on seamless light grey studio sweep, soft shadow, crisp commercial packshot."),
  s("color-pop", "Color pop", "product-shot", "The product among bright colourful props on a saturated solid background, hard sunlight and bold shadows."),
  s("natural", "Natural", "product-shot", "The product placed outdoors on natural rock or wood with sea or landscape behind, golden daylight."),
  s("social-proof", "Social proof", "ads", "Social media ad layout: the product with a person using it and floating review cards around, headline at the top."),
  s("comparison", "Comparison", "ads", "Split-screen comparison ad: a plain generic alternative on one side, the product on the other, bold headline on each side."),
  s("problem-solution", "Problem → Solution", "ads", "Problem-solution ad: headline asking why switch, the product beside a simple checklist comparing it to others."),
  s("dark", "Dark", "marketplace", "Marketplace listing image on a black background with bold graphic type and neon accents around the product."),
  s("3d-surreal", "3D surreal", "marketplace", "Marketplace listing with the product among soft surreal 3D shapes in one muted colour, elegant minimal type."),
  s("pastel", "Pastel", "marketplace", "Marketplace listing on a pastel background with the product, short feature callouts and a price tag."),
  s("clean-studio", "Clean Studio", "marketplace", "Marketplace listing in clean studio light, product with key ingredients or parts around it, bold product name."),
];

export const styleById = (id: string | null | undefined) => MARKETING_STYLES.find((x) => x.id === id) ?? null;
export const styleCover = (id: string) => `/marketing-styles/${id}.webp`;
