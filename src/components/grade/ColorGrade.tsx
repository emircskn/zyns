"use client";

import { Range } from "@/components/Range";
import { useEffect, useRef, useState } from "react";
import { ThemeSync } from "@/components/ThemeSync";

/**
 * Colour grading in the browser: no model, no credits. A picture is redrawn
 * on a canvas through the chosen look and sliders, and saved as a PNG.
 * shortcut: uses canvas `filter`, which Safari (before 18) ignores; grade on
 * the GPU (WebGL) if that matters.
 */
interface Look {
  exposure: number;
  contrast: number;
  saturation: number;
  warmth: number;
  mono: number;
  bloom: number;
  halation: number;
  haze: number;
  grain: number;
  vignette: number;
  /** Split tone: colour pushed into the shadows and the highlights, or none. */
  shadow?: string;
  light?: string;
}

const NONE: Look = { exposure: 0, contrast: 0, saturation: 0, warmth: 0, mono: 0, bloom: 0, halation: 0, haze: 0, grain: 0, vignette: 0 };
const PRESETS: Record<string, Partial<Look>> = {
  None: {},
  Natural: { contrast: 8, saturation: 6, warmth: 4 },
  "B&W Film": { mono: 100, contrast: 25, grain: 35, vignette: 25 },
  "Split Tone": { contrast: 12, saturation: -6, shadow: "#1f4e79", light: "#e8a456" },
  "Soft Skin": { contrast: -10, exposure: 6, warmth: 8, bloom: 25, saturation: -4 },
  Cinematic: { contrast: 22, saturation: -8, vignette: 35, shadow: "#0b3b4a", light: "#d98a3d" },
  "16mm Film": { contrast: 14, saturation: -12, grain: 60, halation: 25, warmth: 8, vignette: 20 },
  "Old Lens": { contrast: -8, haze: 35, bloom: 30, vignette: 45, warmth: 6, saturation: -10 },
};
const SLIDERS: Array<[keyof Look, string, number, number]> = [
  ["exposure", "Exposure", -50, 50],
  ["contrast", "Contrast", -50, 60],
  ["saturation", "Saturation", -100, 60],
  ["warmth", "Warmth", -50, 50],
  ["mono", "Black & white", 0, 100],
  ["bloom", "Bloom", 0, 100],
  ["halation", "Halation", 0, 100],
  ["haze", "Lens haze", 0, 100],
  ["grain", "Film grain", 0, 100],
  ["vignette", "Vignette", 0, 100],
];

function draw(canvas: HTMLCanvasElement, img: HTMLImageElement, l: Look) {
  const max = 1600;
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = (canvas.width = Math.round(img.naturalWidth * k));
  const h = (canvas.height = Math.round(img.naturalHeight * k));
  const ctx = canvas.getContext("2d")!;
  const base = 100 + l.exposure;
  ctx.filter = `brightness(${base}%) contrast(${100 + l.contrast}%) saturate(${100 + l.saturation}%) grayscale(${l.mono}%) sepia(${Math.max(0, l.warmth)}%) hue-rotate(${Math.min(0, l.warmth) * 0.6}deg)`;
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = "none";
  const layer = (compose: GlobalCompositeOperation, alpha: number, paint: () => void) => {
    ctx.save();
    ctx.globalCompositeOperation = compose;
    ctx.globalAlpha = alpha;
    paint();
    ctx.restore();
  };
  const snapshot = document.createElement("canvas");
  snapshot.width = w;
  snapshot.height = h;
  snapshot.getContext("2d")!.drawImage(canvas, 0, 0);
  if (l.shadow && l.light) {
    layer("soft-light", 0.55, () => {
      const g = ctx.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, l.shadow!);
      g.addColorStop(1, l.light!);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (l.bloom) layer("screen", l.bloom / 160, () => ((ctx.filter = `blur(${w / 90}px) brightness(115%)`), ctx.drawImage(snapshot, 0, 0)));
  if (l.halation) layer("screen", l.halation / 220, () => ((ctx.filter = `blur(${w / 60}px) sepia(1) saturate(6) hue-rotate(-25deg) brightness(130%)`), ctx.drawImage(snapshot, 0, 0)));
  if (l.haze) layer("lighten", l.haze / 300, () => ((ctx.fillStyle = "#d8d4cc"), ctx.fillRect(0, 0, w, h)));
  if (l.vignette) layer("multiply", l.vignette / 100, () => {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(30,30,30,1)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  if (l.grain) {
    const data = ctx.getImageData(0, 0, w, h);
    const amount = l.grain * 0.9;
    for (let i = 0; i < data.data.length; i += 4) {
      const n = (Math.random() - 0.5) * amount;
      data.data[i] += n;
      data.data[i + 1] += n;
      data.data[i + 2] += n;
    }
    ctx.putImageData(data, 0, 0);
  }
}

export function ColorGrade() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [look, setLook] = useState<Look>(NONE);
  const [preset, setPreset] = useState("None");

  useEffect(() => {
    if (img && canvas.current) draw(canvas.current, img, look);
  }, [img, look]);

  const open = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const next = new Image();
    next.onload = () => setImg(next);
    next.src = url;
  };
  const pick = (name: string) => {
    setPreset(name);
    setLook({ ...NONE, ...PRESETS[name] });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-t1 md:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-line p-4 md:w-[320px] md:border-b-0 md:border-r">
        <a href="/" className="text-[13px] text-t3 hover:text-t1">
          ← ZYNS
        </a>
        <h1 className="text-[20px] tracking-[-0.02em]">Color grading</h1>
        <label className="cta flex h-10 cursor-pointer items-center justify-center rounded-chip text-[13px]">
          {img ? "Change picture" : "Add a picture"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => open(e.target.files?.[0])} />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(PRESETS).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => pick(name)}
              className={`rounded-chip px-2.5 py-1.5 text-[12.5px] ${preset === name ? "bg-accent text-black" : "bg-t1/[0.06] text-t2 hover:bg-t1/[0.12]"}`}
            >
              {name}
            </button>
          ))}
        </div>
        {SLIDERS.map(([key, label, min, max]) => (
          <label key={key} className="flex flex-col gap-1 text-[12px] text-t3">
            <span className="flex justify-between">
              {label}
              <span className="font-mono text-t4">{look[key] as number}</span>
            </span>
            <Range min={min} max={max} value={look[key] as number} label={label} onChange={(n) => setLook({ ...look, [key]: n })} />
          </label>
        ))}
        <div className="flex gap-2">
          <button type="button" onClick={() => pick("None")} className="rounded-chip bg-t1/[0.06] px-3 py-2 text-[13px] hover:bg-t1/[0.12]">
            Reset
          </button>
          <button
            type="button"
            disabled={!img}
            onClick={() => {
              const a = document.createElement("a");
              a.href = canvas.current!.toDataURL("image/png");
              a.download = "graded.png";
              a.click();
            }}
            className="rounded-chip bg-t1/[0.06] px-3 py-2 text-[13px] hover:bg-t1/[0.12] disabled:opacity-40"
          >
            Download
          </button>
        </div>
      </aside>
      <main className="grid flex-1 place-items-center p-4">
        {img ? <canvas ref={canvas} className="max-h-[88dvh] max-w-full rounded-card" /> : <p className="text-[14px] text-t4">Add a picture to start.</p>}
      </main>
      <ThemeSync />
    </div>
  );
}
