"use client";

import { useEffect, useState } from "react";

/**
 * Stands in for a tile while its run is in flight: a diagonal sweep of lit
 * cells over the tile, with a few cells flickering on their own, which reads
 * as the model working.
 *
 * It is CSS only, and everything that moves is a transform or an opacity, so
 * the compositor carries it without a repaint. It replaced a WebGL shader
 * (img-fx) that copied its canvas into every tile on every frame; that held
 * Chrome's whole frame pipeline up for as long as a run was pending, so the
 * page froze on Generate and only came back once the run was done.
 *
 * When an image comes back it is fetched first, then the cells give way and
 * the picture underneath sharpens into place, so the reveal never shows an
 * empty frame. Video and audio have no still to wait for, so those just fade
 * the cells away. Either way the finished media sits underneath the whole
 * time, and what fades out is only this layer.
 */
export function GenerationLoader({
  url,
  reveal,
  failed,
  onFinished,
}: {
  /** The first result, once the run has one. */
  url?: string;
  /** Whether that result is a still worth waiting for before revealing. */
  reveal?: boolean;
  /** Stop on failure — there is nothing left to wait for. */
  failed?: boolean;
  onFinished: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  // Hand over once: after the still has loaded, or straight away.
  useEffect(() => {
    if (leaving) return;
    if (failed) {
      setLeaving(true);
      return;
    }
    if (!url) return;
    if (!reveal) {
      setLeaving(true);
      return;
    }
    let live = true;
    const go = () => live && setLeaving(true);
    const still = new Image();
    still.onload = go;
    // A dead link or a blocked host never loads; the tile shows its own
    // fallback then, so there is no point holding the cells over it.
    still.onerror = go;
    still.src = url;
    const guard = window.setTimeout(go, 8000);
    return () => {
      live = false;
      window.clearTimeout(guard);
    };
  }, [url, reveal, failed, leaving]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(onFinished, REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, onFinished]);

  return (
    <div aria-hidden className={`gen-loader ${leaving ? "is-leaving" : ""} ${leaving && reveal ? "is-revealing" : ""}`}>
      {/* The grid stays put and the light moves through it, so the cells
          light up in turn rather than sliding across the tile. */}
      <span className="gen-loader-cells">
        <span className="gen-loader-sweep" />
      </span>
      <span className="gen-loader-flicker" />
      <span className="gen-loader-flicker is-offbeat" />
    </div>
  );
}

/** Matches the longest transition on .gen-loader.is-leaving. */
const REVEAL_MS = 700;
