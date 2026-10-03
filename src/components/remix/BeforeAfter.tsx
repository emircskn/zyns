"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { mediaSrc } from "@/lib/storage/client";

/**
 * The source and the result in one frame, split by a handle you drag: the
 * source to its left, the result to its right. Both play together, muted,
 * on a loop, the source kept in step with the result.
 */
export function BeforeAfter({ before, after }: { before: string; after: string }) {
  const box = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLVideoElement>(null);
  const second = useRef<HTMLVideoElement>(null);
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);

  // The source follows the result, so the same moment is on both sides.
  useEffect(() => {
    const lead = second.current;
    const follow = first.current;
    if (!lead || !follow) return;
    const sync = () => {
      if (!follow.duration) return;
      const at = lead.currentTime % follow.duration;
      if (Math.abs(follow.currentTime - at) > 0.2) follow.currentTime = at;
      if (lead.paused !== follow.paused) void (lead.paused ? follow.pause() : follow.play().catch(() => {}));
    };
    lead.addEventListener("timeupdate", sync);
    lead.addEventListener("play", sync);
    lead.addEventListener("pause", sync);
    return () => {
      lead.removeEventListener("timeupdate", sync);
      lead.removeEventListener("play", sync);
      lead.removeEventListener("pause", sync);
    };
  }, [before, after]);

  function moveTo(clientX: number) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setSplit(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }

  return (
    <div
      ref={box}
      className="absolute inset-0 touch-pan-y select-none"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => dragging && moveTo(event.clientX)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      <video ref={first} src={mediaSrc(before)} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-contain" />
      <video
        ref={second}
        src={mediaSrc(after)}
        muted
        loop
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: `inset(0 0 0 ${split}%)` }}
      />
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">Before</span>
      <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">After</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/90" style={{ left: `${split}%` }}>
        <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg">
          <Icon name="chevron" size={14} strokeWidth={2.4} style={{ transform: "rotate(90deg)" }} />
          <Icon name="chevron" size={14} strokeWidth={2.4} style={{ transform: "rotate(-90deg)" }} />
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(split)}
        onChange={(event) => setSplit(Number(event.target.value))}
        aria-label="Compare the source and the result"
        className="sr-only"
      />
    </div>
  );
}
