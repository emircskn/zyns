/**
 * Every recipe the studio offers, from the JSON files beside this one.
 * A new recipe is a new file here and a line below.
 */
import type { Recipe } from "@/lib/recipes/types";
import productMotion from "./marketing/product-motion.json";
import ugc from "./marketing/ugc.json";
import hypermotion from "./marketing/hypermotion.json";
import motion2d from "./marketing/motion-2d.json";
import mixedMedia from "./marketing/mixed-media.json";
import saasMotion from "./marketing/saas-motion.json";
import { STYLE_RECIPES } from "./marketing/styles";
import dub from "./marketing/dub.json";
import frameToMotion from "./test/frame-to-motion.json";

export const RECIPES: Recipe[] = [frameToMotion as Recipe, productMotion as Recipe, ugc as Recipe, dub as unknown as Recipe];

/** Marketing Studio's video recipes, in the order its Video mode offers them. */
export const MARKETING_RECIPES: Recipe[] = [
  ugc as Recipe,
  productMotion as Recipe,
  hypermotion as Recipe,
  motion2d as Recipe,
  mixedMedia as Recipe,
  saasMotion as Recipe,
  ...STYLE_RECIPES,
];

/** Recipes made at run time (a canvas), found by the engine like the files' ones. */
const MADE = new Map<string, Recipe>();
export const registerRecipe = (recipe: Recipe) => void MADE.set(recipe.id, recipe);

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id) ?? MADE.get(id);
}
