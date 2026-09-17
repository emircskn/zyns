"use client";

import type { CSSProperties } from "react";
import { ACCENT, familyHue } from "@/lib/vendors";
import type { Category } from "@/lib/registry";

/**
 * A cover for a model family. There is no real output to show — a made-up
 * sample would pass itself off as the model's work — so each family gets a
 * cinematic gradient keyed to its category colour and its own hue, drawn
 * with layered radial lights and a faint film grain.
 */
export function CoverArt({
  id,
  category,
  className = "",
  style,
  animate = false,
}: {
  id: string;
  category: Category;
  className?: string;
  style?: CSSProperties;
  animate?: boolean;
}) {
  const accent = ACCENT[category];
  const hue = familyHue(id);
  const a = `hsl(${hue} 82% 60% / 0.7)`;
  const b = `hsl(${(hue + 40) % 360} 85% 48% / 0.6)`;
  const c = `hsl(${(hue + 300) % 360} 70% 55% / 0.35)`;
  return (
    <div
      className={`cover relative overflow-hidden ${className}`}
      style={{ background: "#07070a", width: "100%", ...style }}
      aria-hidden="true"
    >
      <div
        className={animate ? "cover-drift" : undefined}
        style={{
          position: "absolute",
          top: "-30%",
          right: "-30%",
          bottom: "-30%",
          left: "-30%",
          backgroundImage: [
            `radial-gradient(42% 46% at 30% 32%, ${accent}d9, transparent 68%)`,
            `radial-gradient(38% 42% at 74% 30%, ${a}, transparent 66%)`,
            `radial-gradient(48% 40% at 55% 84%, ${b}, transparent 70%)`,
            `radial-gradient(30% 30% at 18% 80%, ${c}, transparent 70%)`,
            `radial-gradient(60% 60% at 50% 50%, ${accent}40, transparent 80%)`,
          ].join(","),
          filter: "blur(14px) saturate(125%)",
        }}
      />
      <div
        className="grain"
        style={{ position: "absolute", inset: 0, opacity: 0.38, mixBlendMode: "overlay" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0) 55%, rgba(0,0,0,0.12))",
        }}
      />
    </div>
  );
}
