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
  // Every cover lives in the amber-to-copper band, so the shelf reads as one
  // palette; the family hue only decides where in that band it sits.
  const hue = 12 + (familyHue(id) % 46);
  const a = `hsl(${hue} 88% 58% / 0.72)`;
  const b = `hsl(${hue + 18} 80% 42% / 0.6)`;
  const c = `hsl(${Math.max(hue - 14, 0)} 60% 30% / 0.5)`;
  return (
    <div
      className={`cover relative overflow-hidden ${className}`}
      style={{
        background:
          "linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0) 55%, rgba(0,0,0,0.12)) , #07070a",
        width: "100%",
        ...style,
      }}
      aria-hidden="true"
    >
      <div
        className={`cover-wash${animate ? " cover-drift" : ""}`}
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
        }}
      />
      <div
        className="grain"
        style={{ position: "absolute", inset: 0, opacity: 0.38, mixBlendMode: "overlay" }}
      />
    </div>
  );
}
