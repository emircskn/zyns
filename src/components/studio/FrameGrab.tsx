"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { Sheet } from "@/components/remix/Restyle";
import { mediaSrc } from "@/lib/storage/client";
import { useUploader } from "@/lib/useUploader";

/**
 * Taking a still out of a clip: pick the clip, slide to the frame (or jump
 * to the first or the last one), and the frame comes in as a picture
 * reference. The frame is drawn in the browser and uploaded like any picture.
 */
export function FrameGrab({ open, onClose, onFrame }: { open: boolean; onClose: () => void; onFrame: (url: string) => void }) {
  const [clip, setClip] = useState<string | null>(null);
  const [length, setLength] = useState(0);
  const [at, setAt] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const uploader = useUploader("image");

  useEffect(() => {
    if (!open) {
      setClip(null);
      setProblem(null);
      setAt(0);
    }
  }, [open]);

  function seek(time: number) {
    const node = video.current;
    const t = Math.max(0, Math.min(length || 0, time));
    setAt(t);
    if (node) node.currentTime = t;
  }

  async function grab() {
    const node = video.current;
    if (!node || !node.videoWidth) return;
    setProblem(null);
    const canvas = document.createElement("canvas");
    canvas.width = node.videoWidth;
    canvas.height = node.videoHeight;
    canvas.getContext("2d")?.drawImage(node, 0, 0);
    let blob: Blob | null = null;
    try {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    } catch {
      blob = null;
    }
    if (!blob) return setProblem("This clip cannot be read here. Download it and upload it, then try again.");
    const file = new File([blob], `frame-${Math.round(at * 1000)}ms.png`, { type: "image/png" });
    await uploader.send([file], (urls) => {
      if (urls[0]) onFrame(urls[0]);
      onClose();
    });
  }

  return (
    <>
      <MediaPicker open={open && !clip} accept="video" onPick={(urls) => setClip(urls[0] ?? null)} onClose={() => !clip && onClose()} />
      <Sheet
        open={open && !!clip}
        title="Take a frame"
        sub="Slide to the moment you want, then use it as a picture"
        onClose={onClose}
        footer={
          <button
            type="button"
            onClick={() => void grab()}
            disabled={uploader.busy || !length}
            className="cta flex h-11 w-full items-center justify-center gap-2 rounded-panel text-[14.5px] font-semibold disabled:opacity-40"
          >
            {uploader.busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <>
                <Icon name="frame" size={16} />
                Use this frame
              </>
            )}
          </button>
        }
      >
        {clip && (
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-card bg-canvas-deep">
              <video
                ref={video}
                src={mediaSrc(clip)}
                crossOrigin="anonymous"
                muted
                playsInline
                preload="auto"
                onLoadedMetadata={(event) => setLength(event.currentTarget.duration || 0)}
                className="max-h-[50vh] w-full object-contain"
              />
            </div>
            <input
              type="range"
              aria-label="Frame"
              min={0}
              max={length || 0}
              step={0.04}
              value={at}
              onChange={(event) => seek(Number(event.target.value))}
              className="w-full accent-[var(--t1)]"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => seek(0)}
                  className="rounded-full bg-t1/[0.07] px-3 py-1.5 text-[12.5px] text-t2 hover:bg-t1/[0.12] hover:text-t1"
                >
                  First frame
                </button>
                <button
                  type="button"
                  onClick={() => seek(Math.max(0, length - 0.05))}
                  className="rounded-full bg-t1/[0.07] px-3 py-1.5 text-[12.5px] text-t2 hover:bg-t1/[0.12] hover:text-t1"
                >
                  Last frame
                </button>
              </div>
              <span className="font-mono text-[12px] tabular-nums text-t3">
                {at.toFixed(2)} / {length.toFixed(2)} s
              </span>
            </div>
            {(problem || uploader.error) && (
              <p role="alert" className="text-[12.5px]" style={{ color: "var(--danger)" }}>
                {problem ?? uploader.error}
              </p>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
