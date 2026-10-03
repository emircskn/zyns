"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { mediaSrc } from "@/lib/storage/client";
import { trimClip, trimType } from "@/lib/remix/trim";
import { uploadFile } from "@/lib/upload";
import { usePresence } from "@/lib/usePresence";
import { useStudio } from "@/store/studio";

function clock(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

/**
 * Picks the stretch of a clip a model gets: where it starts and how long it
 * runs, within what the model takes. The stretch plays on a loop while it is
 * chosen, then is recorded into a new clip of its own.
 */
export function Trimmer({
  open,
  url,
  duration,
  min = 0,
  max,
  onDone,
  onClose,
}: {
  open: boolean;
  url: string;
  duration: number;
  min?: number;
  max?: number;
  onDone: (url: string) => void;
  onClose: () => void;
}) {
  const { mounted, exiting } = usePresence(open, 240);
  const longest = Math.min(duration, max ?? duration);
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(longest);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const addUpload = useStudio((s) => s.addUpload);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);

  useEffect(() => {
    if (!open) return;
    setStart(0);
    setLength(Math.min(duration, max ?? duration));
    setProgress(null);
    setError(null);
    setNote(null);
  }, [open, duration, max]);

  const end = Math.min(duration, start + length);
  const room = Math.max(0, duration - (min || 0));

  // The chosen stretch, on a loop.
  useEffect(() => {
    const video = preview.current;
    if (!video || !open) return;
    if (video.currentTime < start || video.currentTime > end) video.currentTime = start;
    const loop = () => {
      if (video.currentTime >= end) video.currentTime = start;
    };
    video.addEventListener("timeupdate", loop);
    return () => video.removeEventListener("timeupdate", loop);
  }, [start, end, open]);

  if (!mounted || typeof document === "undefined") return null;

  async function trim() {
    setError(null);
    setNote(null);
    setProgress(0);
    try {
      const { file, silent } = await trimClip(url, start, end, setProgress);
      // Higgsfield's storage takes MP4; a browser that records only WebM goes through KIE's.
      const viaHiggsfield = !!hfKey && file.type === "video/mp4";
      const key = viaHiggsfield ? hfKey : apiKey;
      if (!key) throw new Error("This browser records WebM, which Higgsfield's storage does not take. Add a KIE key, or trim the clip before uploading.");
      const uploaded = await uploadFile(file, key, viaHiggsfield ? "higgsfield" : "kie");
      addUpload({
        id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: uploaded,
        kind: "video",
        name: file.name,
        createdAt: Date.now(),
      });
      if (silent) setNote("Trimmed without sound: the browser would not play it aloud.");
      onDone(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The clip could not be trimmed.");
    } finally {
      setProgress(null);
    }
  }

  const working = progress !== null;
  const tooShort = !!min && length < min - 0.05;

  return createPortal(
    <div className="fixed inset-0 z-[118] flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={working ? undefined : onClose}
        className={`absolute inset-0 bg-canvas-deep/80 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        role="dialog"
        aria-label="Trim the clip"
        className={`relative flex w-full flex-col overflow-y-auto bg-canvas sm:max-h-[90vh] sm:max-w-[620px] sm:rounded-panel sm:border sm:border-line ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))] sm:pt-4">
          <div>
            <p className="text-[16px] text-t1">Trim the clip</p>
            <p className="text-[12.5px] text-t3">
              {min ? `${min}` : "0"}–{max ? `${max}` : Math.floor(duration)} s for this model · the clip is {duration.toFixed(1)} s
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={working}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1 disabled:opacity-40"
          >
            <Icon name="close" size={17} />
          </button>
        </header>
        <div className="flex flex-col gap-4 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <video
            ref={preview}
            src={mediaSrc(url)}
            muted
            autoPlay
            playsInline
            className="max-h-[42vh] w-full rounded-card bg-canvas-deep object-contain"
          />
          {/* The whole clip, and the stretch kept. */}
          <div className="relative h-2 rounded-full bg-t1/[0.08]">
            <span
              className="absolute inset-y-0 rounded-full bg-t1"
              style={{ left: `${(start / duration) * 100}%`, width: `${((end - start) / duration) * 100}%` }}
            />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="flex justify-between text-[12.5px] text-t2">
              Starts at <span className="font-mono tabular-nums text-t1">{clock(start)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, room)}
              step={0.1}
              value={start}
              disabled={working}
              onChange={(event) => {
                const next = Number(event.target.value);
                setStart(next);
                setLength((was) => Math.min(was, duration - next, max ?? Infinity));
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="flex justify-between text-[12.5px] text-t2">
              Lasts <span className="font-mono tabular-nums text-t1">{length.toFixed(1)} s</span>
            </span>
            <input
              type="range"
              min={Math.min(min || 1, duration - start)}
              max={Math.min(max ?? duration, duration - start)}
              step={0.1}
              value={length}
              disabled={working}
              onChange={(event) => setLength(Number(event.target.value))}
            />
          </label>
          {tooShort && (
            <p className="text-[12.5px]" style={{ color: "var(--danger)" }}>
              Start earlier: from here the clip has less than {min} s left.
            </p>
          )}
          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-[12.5px] leading-snug" style={{ color: "var(--danger)" }}>
              <Icon name="alert" size={15} className="mt-px shrink-0" />
              {error}
            </p>
          )}
          {note && <p className="text-[12.5px] text-t3">{note}</p>}
          {!trimType() && <p className="text-[12.5px] text-t3">This browser cannot record video, so it cannot trim here.</p>}
          <button
            type="button"
            onClick={() => void trim()}
            disabled={working || tooShort || !trimType()}
            className="cta relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-panel text-[15px] font-semibold disabled:opacity-40"
          >
            {working ? (
              <>
                <span className="absolute inset-y-0 left-0 bg-canvas/10" style={{ width: `${(progress ?? 0) * 100}%` }} />
                <span className="relative">Trimming… {Math.round((progress ?? 0) * 100)}%</span>
              </>
            ) : (
              <>Use {clock(start)}–{clock(end)}</>
            )}
          </button>
          <p className="text-center text-[11.5px] text-t4">
            The stretch is played through once and saved as a new clip in your uploads; it takes as long as it lasts.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
