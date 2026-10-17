/**
 * Marketing Studio: product imagery on Higgsfield's Marketing Studio image
 * model, straight from a prompt or through one of its presets, and video
 * made from it by recipes whose every step's model is chosen when it runs.
 */

/** A preset as Higgsfield's catalogue gives it, cut to what the page shows. */
export interface MarketingPreset {
  id: string;
  name: string;
  /** Its kind in the catalogue (the gallery's categories come from these). */
  type: string;
  /** A picture or clip showing what it makes. */
  preview?: string;
  previewKind?: "image" | "video";
}

export type MarketingTab = "templates" | "generations" | "products";
export type MarketingTool = "create" | "product-link" | "ad-reference";
/** The page open from the side menu, as Cinema Studio's. */
export type MarketingView = "home" | "generations" | "favorites" | "products" | "ad-reference" | "product-link" | "projects" | "project" | "trash";

export interface MarketingUi {
  /** Pictures on Marketing Studio itself, or video by a recipe. */
  mode: "image" | "video";
  view: MarketingView;
  /** The project open on the project page, and the folder in it, as Cinema Studio's. */
  projectId?: string;
  folderId?: string;
  tab: MarketingTab;
  tool: MarketingTool;
  /** The Marketing Studio variant sent to ("" until one is picked). */
  modelId: string;
  prompt: string;
  /** The chosen preset, kept whole so its card shows before the catalogue loads. */
  preset: MarketingPreset | null;
  /** One of our styles (lib/marketing/styles), written into the prompt; never with a preset. */
  style: string | null;
  /** image_urls[0] with a preset: what is being sold. */
  product: string | null;
  /** image_urls[1] with a preset: who shows it. */
  avatar: string | null;
  /** Further pictures to edit from, without a preset (up to the model's limit). */
  refs: string[];
  resolution: string;
  aspect: string;
  quality: string;
  count: number;
  /** Ad Reference: the ad to take the layout of. */
  adReference: string | null;
  /** The video recipe open in the Video tab. */
  recipeId: string;
  /** Set by Recreate on a template's run: MarketingStudio opens that template's window with these, and clears it. */
  reopen?: TemplateStart;
}

/** A template's Recreate window as a finished run left it. */
export interface TemplateStart {
  template: { kind: "zyns"; styleId: string } | { kind: "hf"; preset: MarketingPreset };
  product: string | null;
  avatar: string | null;
  prompt: string;
  modelId: string;
  /** The run's own values: the model's settings are read from them. */
  values: Record<string, unknown>;
}

export const EMPTY_MARKETING: MarketingUi = {
  mode: "image",
  view: "home",
  tab: "templates",
  tool: "create",
  modelId: "",
  prompt: "",
  preset: null,
  style: null,
  product: null,
  avatar: null,
  refs: [],
  resolution: "",
  aspect: "",
  quality: "",
  count: 1,
  adReference: null,
  recipeId: "marketing-product-motion",
};

/** What a run made here was, for its card and for Recreate. */
export interface MarketingRunInfo {
  tool: "direct" | "preset" | "ad-reference";
  presetId?: string;
  presetName?: string;
  product?: string;
  avatar?: string;
  /** What the person wrote, apart from the style or template text our prompt adds. */
  prompt?: string;
  /** The "Choose style" style it was made with. */
  style?: string;
  /** Set when it came from a template: ours ("zyns", a cover to copy) or Higgsfield's (the preset). */
  template?: "zyns" | "hf";
  preset?: MarketingPreset;
  refs?: string[];
  adReference?: string;
}
