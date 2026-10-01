"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import type { Run } from "@/store/studio";
import { mediaSrc } from "@/lib/storage/client";

/** The first line of words in a value: a prompt, a script, or the text of a dialogue's turns. */
function firstLine(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !/^\[.*\]$/.test(l));
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const line = firstLine((item as { text?: unknown } | null)?.text);
      if (line) return line;
    }
  }
  return undefined;
}

/**
 * What a piece of sound is called on its tile: a song's own title, a made
 * voice's name, or else the first line of what was asked for (the prompt,
 * or the words spoken). Undefined when there is none, so the tile shows the
 * model alone rather than its name twice.
 */
export function audioTitle(run: Run | undefined, url: string | undefined): string | undefined {
  const track = run?.tracks?.find((t) => t.audio === url) ?? run?.tracks?.[0];
  if (track?.title?.trim()) return track.title.trim();
  if (run?.made?.name) return run.made.name;
  const values = run?.values ?? {};
  for (const key of ["prompt", "text", "script", "lyrics", "dialogue_turns", "dialogue", "inputs"]) {
    const line = firstLine(key === "prompt" ? run?.prompt || values.prompt : values[key]);
    if (line) return line;
  }
  return undefined;
}

/**
 * The face of a sound tile, on a plain surface: what made it in small type
 * at the top and what it is below; with nothing to call it, the model's
 * name takes the title's place, once.
 */
export function AudioFace({ title, source, compact }: { title?: string; source?: string; compact?: boolean }) {
  const heading = title ?? source ?? "Audio";
  const label = title ? source : undefined;
  return (
    <span
      className={`flex h-full w-full flex-col justify-between bg-surface bg-gradient-to-br from-t1/[0.07] to-transparent text-left ${
        compact ? "p-2" : "p-3"
      }`}
    >
      <span className={`flex min-w-0 items-center gap-1.5 text-t3 ${compact ? "text-[10.5px]" : "text-[11.5px]"}`}>
        <Icon name="audio" size={compact ? 12 : 14} className="shrink-0" />
        {label && <span className="truncate">{label}</span>}
      </span>
      {/* Room kept at the foot for the play button laid over it. */}
      {/* The clamp and the room are two boxes: padding inside a clamped
          line box shows the line it was meant to hide. */}
      <span className={`block ${compact ? "pb-10" : "pb-11"}`}>
        <span
          className={`font-medium leading-snug text-t1 ${
            compact ? "line-clamp-2 text-[12px]" : "line-clamp-3 text-[13.5px]"
          }`}
        >
          {heading}
        </span>
      </span>
    </span>
  );
}

/** One sound at a time across the studio: starting another stops this one. */
let playing: HTMLAudioElement | null = null;

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The tile's own play button, laid over it rather than inside the button
 * that opens the tile: the browser's player squeezed into a small square
 * came out as a lone grey play box, and a button inside a button is not
 * allowed anyway.
 */
export function AudioPlay({ url, className = "", compact }: { url: string; className?: string; compact?: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(false);
  const [time, setTime] = useState({ at: 0, length: NaN });

  useEffect(() => () => audio.current?.pause(), []);

  function toggle(event: React.MouseEvent) {
    event.stopPropagation();
    let node = audio.current;
    if (!node) {
      node = new Audio(mediaSrc(url));
      node.preload = "metadata";
      node.addEventListener("play", () => setOn(true));
      node.addEventListener("pause", () => setOn(false));
      node.addEventListener("ended", () => setOn(false));
      node.addEventListener("timeupdate", () => setTime({ at: node!.currentTime, length: node!.duration }));
      node.addEventListener("loadedmetadata", () => setTime({ at: node!.currentTime, length: node!.duration }));
      audio.current = node;
    }
    if (node.paused) {
      if (playing && playing !== node) playing.pause();
      playing = node;
      // A file that will not play (gone, or a format this browser lacks)
      // simply stays paused rather than throwing into the page.
      node.play().catch(() => setOn(false));
    } else {
      node.pause();
    }
  }

  const shown = on || time.at > 0 ? clock(time.at) : clock(time.length);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? "Pause" : "Play"}
      className={`flex h-8 items-center justify-center gap-1.5 rounded-full bg-t1 text-[12px] font-medium tabular-nums text-canvas transition-transform duration-[120ms] active:scale-95 ${
        compact ? "w-8" : "pl-2.5 pr-3"
      } ${className}`}
    >
      <Icon name={on ? "pause" : "play"} size={13} fill="currentColor" strokeWidth={0} />
      {!compact && (shown || (on ? "…" : "Play"))}
    </button>
  );
}
