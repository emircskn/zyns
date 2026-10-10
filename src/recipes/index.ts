/**
 * Every recipe the studio offers, from the JSON files beside this one.
 * A new recipe is a new file here and a line below.
 */
import type { Recipe } from "@/lib/recipes/types";
import productMotion from "./marketing/product-motion.json";
import ugc from "./marketing/ugc.json";
import frameToMotion from "./test/frame-to-motion.json";

export const RECIPES: Recipe[] = [frameToMotion as Recipe, productMotion as Recipe, ugc as Recipe];

/** Marketing Studio's video recipes, in the order its Video mode offers them. */
export const MARKETING_RECIPES: Recipe[] = [productMotion as Recipe, ugc as Recipe];

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
