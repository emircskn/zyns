import type { ModelDef } from "../types";
import { imageApp, videoApp, videoEditApp } from "./factory";
import { IMAGE_APPS } from "./images";
import { VIDEO_APPS } from "./videos";
import { EFFECT_APPS } from "./effects";
import { VIDEO_EDIT_APPS } from "./videoEdits";

/** Every app (see factory.ts), ready to join the registry as Tools. */
export const appModels = (): ModelDef[] => [
  ...IMAGE_APPS.map(imageApp),
  ...VIDEO_APPS.map((def) => videoApp(def)),
  ...EFFECT_APPS.map((def) => videoApp(def, "effects")),
  ...VIDEO_EDIT_APPS.map(videoEditApp),
];
