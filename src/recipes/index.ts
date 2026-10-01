/**
 * Every recipe the studio offers, from the JSON files beside this one.
 * A new recipe is a new file here and a line below.
 */
import type { Recipe } from "@/lib/recipes/types";
import frameToMotion from "./test/frame-to-motion.json";

export const RECIPES: Recipe[] = [frameToMotion as Recipe];

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
