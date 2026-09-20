"use client";

import { useEffect } from "react";

/**
 * The single-file build's stand-in for the WebGL loader.
 *
 * That loader only ever appears while a run is in flight, and the standalone
 * page cannot reach the API at all, so the shader is unreachable here — it
 * would only carry three.js, which doubles the file. The tile keeps the
 * gradient placeholder underneath instead.
 */
export function GenerationLoader({ onFinished }: { onFinished: () => void }) {
  useEffect(() => onFinished(), [onFinished]);
  return null;
}
