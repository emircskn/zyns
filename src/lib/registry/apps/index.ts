import type { ModelDef } from "../types";
import { imageApp, videoApp } from "./factory";
import { IMAGE_APPS } from "./images";
import { VIDEO_APPS } from "./videos";
import { EFFECT_APPS } from "./effects";

/** Every app (see factory.ts), ready to join the registry as Tools. */
export const appModels = (): ModelDef[] => [
  ...IMAGE_APPS.map(imageApp),
  ...VIDEO_APPS.map(videoApp),
  ...EFFECT_APPS.map(videoApp),
];
