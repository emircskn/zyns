#!/usr/bin/env node
/**
 * Bundles the studio into dist/zyns.html — one self-contained file with
 * the catalogue, the UI and the styles inlined. Open it anywhere; enter a key.
 *
 *   npm run build:standalone
 */
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");

const js = await build({
  entryPoints: [path.join(root, "src/standalone/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  platform: "browser",
  jsx: "automatic",
  write: false,
  alias: {
    "@": path.join(root, "src"),
    // Swapped for a stub: see src/standalone/GenerationLoader.tsx.
    "@/components/GenerationLoader": path.join(root, "src/standalone/GenerationLoader.tsx"),
  },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});

const cssSource = await readFile(path.join(root, "src/app/globals.css"), "utf8");
const css = await postcss([tailwind()]).process(cssSource, {
  from: path.join(root, "src/app/globals.css"),
});

const bundle = js.outputFiles.find((f) => !f.path.endsWith(".css"));
if (!bundle) throw new Error("esbuild produced no JS output");
const script = bundle.text.replace(/<\/script/gi, "<\\/script");

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#0a0a0a" />
<title>ZYNS</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2225%22 fill=%22%230a0a0a%22/><path fill-rule=%22evenodd%22 fill=%22%23fafafa%22 d=%22M75 0C88.798 0 100 11.202 100 25L100 75C100 88.798 88.798 100 75 100L25 100C11.202 100 0 88.798 0 75L0 25C0 11.202 11.202 0 25 0ZM7.007 55.488C7.002 55.731 7.099 55.98 7.32 56.21L26.351 76.01C26.717 76.391 27.35 76.621 28.03 76.621L81.962 76.621C83.344 76.621 84.306 75.711 83.833 74.849L77.579 63.461C77.293 62.94 76.545 62.593 75.707 62.593L62.665 62.593C61.804 62.593 61.038 62.961 60.772 63.504L58.223 68.695C57.955 69.239 57.191 69.607 56.328 69.607L56.276 69.607C55.597 69.607 53.729 69.815 52.899 69.001L39.962 55.808C39.11 54.93 40.062 53.774 41.637 53.774L80.006 53.311C80.671 53.311 81.294 53.09 81.664 52.721L92.658 45.253C92.895 45.018 92.998 44.76 92.993 44.51C92.998 44.268 92.901 44.018 92.679 43.789L73.649 23.99C73.283 23.609 72.649 23.379 71.968 23.379L18.038 23.379C16.656 23.379 15.694 24.289 16.166 25.149L22.421 36.538C22.707 37.059 23.455 37.406 24.293 37.406L37.333 37.406C38.196 37.406 38.96 37.039 39.228 36.494L41.777 31.304C42.043 30.76 42.809 30.393 43.671 30.393L43.724 30.393C44.401 30.393 46.271 30.185 47.101 30.999L61.272 44.447C62.124 45.326 61.172 46.481 59.597 46.481L19.994 46.205C19.327 46.205 18.706 46.426 18.336 46.795L7.342 54.745C7.105 54.982 7.002 55.239 7.007 55.488Z%22/></svg>" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap" rel="stylesheet" />
<style>${css.css}</style>
</head>
<body>
<div id="root"></div>
<script>${script}</script>
</body>
</html>
`;

await mkdir(path.join(root, "dist"), { recursive: true });
const out = path.join(root, "dist/zyns.html");
await writeFile(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
