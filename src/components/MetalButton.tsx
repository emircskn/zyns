"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MetalFx, useMetalBend } from "metal-fx";
import { useStudio } from "@/store/studio";

/**
 * The metal ring, on the one button that starts something.
 *
 * MetalFx paints a live liquid-metal ring around whatever it wraps and leaves
 * the child itself interactive, so the send button and the phone's create
 * button keep their own shape, fill and handlers. The settings are the ones
 * asked for: the chromatic preset, the circle ring, the inner rim, and the
 * halo off, so the ring reads as a rim on the button rather than a lamp on
 * the page. useMetalBend gives the ring its cursor dent.
 *
 * The theme comes from the studio rather than the OS, because the studio has
 * its own switch, and a ring tuned for a dark page reads as a smudge on a
 * light one. Browsers without WebGL2 render the plain child.
 */
export function MetalButton({ children, still: held }: { children: ReactNode; /** The ring without its movement. */ still?: boolean }) {
  const ring = useRef<HTMLDivElement>(null);
  const theme = useStudio((s) => s.theme);
  const [mounted, setMounted] = useState(false);
  // Someone who has asked for less motion keeps the metal, not the movement:
  // paused holds the last frame, so the ring is still there.
  const [still, setStill] = useState(false);
  // Held still, it does not dent under the finger either.
  const none = useRef<HTMLDivElement>(null);
  useMetalBend(held ? none : ring);

  // The ring is put on after the page has hydrated. MetalFx renders one
  // element on the server and another on the client, which React reports as a
  // hydration mismatch and then throws the subtree away; handing it the plain
  // button until the first effect runs keeps the two renders identical.
  useEffect(() => {
    setMounted(true);
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setStill(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);
  if (!mounted) return <>{children}</>;

  return (
    <MetalFx
      ref={ring}
      preset="chromatic"
      variant="circle"
      theme={theme}
      innerShadow
      strength={0.9}
      disableGlow
      paused={still || held}
      className="shrink-0"
    >
      {children}
    </MetalFx>
  );
}
