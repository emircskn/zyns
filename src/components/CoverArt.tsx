"use client";

import type { CSSProperties } from "react";
import { familyHue } from "@/lib/vendors";
import type { Category } from "@/lib/registry";

/**
 * A cover for a model family. There is no real output to show, and a made-up
 * sample would pass itself off as the model's work, so each family gets its
 * own arrangement of light instead: layered radial greys and a faint film
 * grain. The studio has no brand colour, so neither do these.
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
  // The family only decides how bright its lights are, so the shelf reads as
  // one set: every cover is the same grey, lit from a different place.
  const step = familyHue(id) % 5;
  // The colours come from the theme: a dark field in dark mode, a pale one
  // in light, with the lights drawn the same way on both.
  const light = (alpha: number) => `rgb(var(--cover-light) / ${alpha.toFixed(2)})`;
  const accent = light(0.16 + step * 0.03);
  const a = light(0.3 - step * 0.03);
  const b = light(0.14 + step * 0.02);
  const c = light(0.1);
  return (
    <div
      className={`cover relative overflow-hidden ${className}`}
      style={{
        background:
          "linear-gradient(to top, rgb(var(--cover-shade) / var(--cover-shade-a)), transparent 55%, rgb(var(--cover-shade) / calc(var(--cover-shade-a) * 0.2))), var(--cover-base)",
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
            `radial-gradient(42% 46% at 30% 32%, ${accent}, transparent 68%)`,
            `radial-gradient(38% 42% at 74% 30%, ${a}, transparent 66%)`,
            `radial-gradient(48% 40% at 55% 84%, ${b}, transparent 70%)`,
            `radial-gradient(30% 30% at 18% 80%, ${c}, transparent 70%)`,
            `radial-gradient(60% 60% at 50% 50%, ${light(0.06)}, transparent 80%)`,
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
