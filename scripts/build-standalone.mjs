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

/**
 * There is no /public here — the file is opened straight off a disk — so
 * every asset the hero section asks for is read once and carried inline.
 * Both halves reference them: the markup through src=, the stylesheet
 * through the @font-face.
 */
const MIME = { ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };
const assets = new Map();
async function inline(text) {
  const refs = new Set(text.match(/\/originkit\/[\w./-]+/g) ?? []);
  for (const ref of refs) {
    if (!assets.has(ref)) {
      const file = path.join(root, "public", ref);
      const type = MIME[path.extname(ref)];
      if (!type) throw new Error(`no MIME type for ${ref}`);
      assets.set(ref, `data:${type};base64,${(await readFile(file)).toString("base64")}`);
    }
    text = text.split(ref).join(assets.get(ref));
  }
  return text;
}

// Without an outdir esbuild calls the one bundle <stdout>; be explicit all
// the same, so a stylesheet output could never be mistaken for the script.
const bundle = js.outputFiles.find((f) => !f.path.endsWith(".css"));
if (!bundle) throw new Error("esbuild produced no JS output");
const script = (await inline(bundle.text)).replace(/<\/script/gi, "<\\/script");
const styles = await inline(css.css);

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#0a0908" />
<title>ZYNS</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%227.5%22 fill=%22%230a0908%22/><g transform=%22translate(11.47 15.18) scale(0.08445) translate(-16 825)%22 fill=%22%23f5efe6%22><path d=%22M74-825L753-825L344-165L726-165L726 0L16 0L424-660L74-660L74-825Z%22/></g><rect x=%2276.89%22 y=%2270.94%22 width=%2213.13%22 height=%2214%22 fill=%22%23f5efe6%22/></svg>" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap" rel="stylesheet" />
<style>${styles}</style>
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
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB, ${assets.size} assets inlined)`);
