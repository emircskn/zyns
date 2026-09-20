"use client";

import { useEffect, useRef, useState } from "react";
import { ImageGeneration, type ImageGenerationHandle } from "img-fx";

/**
 * Stands in for a tile while its run is in flight: a diagonal gradient sweep
 * with per-cell flicker, which reads as the model working.
 *
 * When an image comes back it materialises cell-by-cell out of that same
 * sweep instead of cutting to it. Video and audio have no still frame to
 * dissolve into, so those just fade the sweep away. Either way the finished
 * media sits underneath the whole time, so what fades out is only the shader.
 */
export function GenerationLoader({
  url,
  reveal,
  failed,
  onFinished,
}: {
  /** The first result, once the run has one. */
  url?: string;
  /** Whether that result is a still we can dissolve into. */
  reveal?: boolean;
  /** Stop on failure — there is nothing left to wait for. */
  failed?: boolean;
  onFinished: () => void;
}) {
  const handle = useRef<ImageGenerationHandle>(null);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  // Hand over once: reveal the still through the sweep, or just step aside.
  useEffect(() => {
    if (done.current) return;
    if (failed) {
      done.current = true;
      setLeaving(true);
      return;
    }
    if (!url) return;
    done.current = true;
    if (!reveal) {
      setLeaving(true);
      return;
    }
    handle.current?.triggerReveal({ hold: "manual" });
    // If the texture never loads (CORS, a dead link) no phase ever lands, so
    // give the reveal a deadline rather than sitting on the finished media.
    const guard = window.setTimeout(() => setLeaving(true), 8000);
    return () => window.clearTimeout(guard);
  }, [url, reveal, failed]);

  // The fade only starts once the class that animates it has been rendered.
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(onFinished, 320);
    return () => window.clearTimeout(timer);
  }, [leaving, onFinished]);

  return (
    <ImageGeneration
      ref={handle}
      preset="sweep-gradient"
      theme="auto"
      images={reveal && url ? [url] : []}
      onCycle={(event) => {
        // The reveal has finished drawing; the real media is already behind us.
        if (event.phase === "visible") setLeaving(true);
      }}
      cardBg="transparent"
      className="transition-opacity duration-[320ms]"
      // The library's own stylesheet makes the root an inline-block, and being
      // unlayered it outranks any utility class — so the box has to be inline.
      style={{
        position: "absolute",
        inset: 0,
        display: "block",
        zIndex: 10,
        opacity: leaving ? 0 : 1,
      }}
      aria-hidden
    >
      <div style={{ width: "100%", height: "100%" }} />
    </ImageGeneration>
  );
}
