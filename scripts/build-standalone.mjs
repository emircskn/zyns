#!/usr/bin/env node
/**
 * Bundles the studio into dist/kie-studio.html — one self-contained file with
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

const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#0a0908" />
<title>KIE Studio</title>
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
const out = path.join(root, "dist/kie-studio.html");
await writeFile(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
