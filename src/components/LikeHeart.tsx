"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

const DOTS = 8;

/**
 * The heart a favourite is given with: it fills and springs on the press,
 * and throws a short burst of particles along vectors picked fresh each
 * time, so no two likes spray quite the same way.
 */
export function LikeHeart({
  liked,
  size = 18,
  onToggle,
  className = "",
  title,
  children,
}: {
  liked: boolean;
  size?: number;
  /** Called with what the state should become. */
  onToggle: (next: boolean) => void;
  /** The shape the whole control takes — a round button, or a panel tile. */
  className?: string;
  title?: string;
  /** A label beside the heart, where the control is a tile. */
  children?: ReactNode;
}) {
  const [bursting, setBursting] = useState(false);
  const particles = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function press() {
    const next = !liked;
    onToggle(next);
    if (!next) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Each dot gets its own vector, size and clock: a burst that is the same
    // every time reads as a sprite, not a spray.
    const node = particles.current;
    if (node) {
      [...node.children].forEach((dot, index) => {
        const spread = (Math.PI * 2 * index) / DOTS + (Math.random() - 0.5) * 0.5;
        const reach = 14 + Math.random() * 12;
        const style = (dot as HTMLElement).style;
        style.setProperty("--px", `${Math.cos(spread) * reach}px`);
        style.setProperty("--py", `${Math.sin(spread) * reach}px`);
        style.setProperty("--pdur", `${480 + Math.random() * 260}ms`);
        style.setProperty("--pdelay", `${Math.random() * 60}ms`);
        style.setProperty("--psize", `${0.7 + Math.random() * 0.9}`);
        style.setProperty("--p-end-scale", `${0.3 + Math.random() * 0.5}`);
      });
    }
    setBursting(false);
    // A frame between removing and re-adding the class, or a second like in
    // quick succession restarts nothing.
    requestAnimationFrame(() => {
      setBursting(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setBursting(false), 800);
    });
  }

  return (
    <button
      type="button"
      title={title}
      aria-pressed={liked}
      aria-label={title}
      className={`t-like ${bursting ? "is-bursting" : ""} ${className}`}
      data-liked={liked ? "true" : "false"}
      onClick={(event) => {
        // The heart is often inside something else that opens the media.
        event.stopPropagation();
        press();
      }}
    >
      <span className="t-like-icon inline-flex">
        <Icon name="heart" size={size} className="t-like-heart" />
      </span>
      <span ref={particles} aria-hidden className="t-like-particles">
        {Array.from({ length: DOTS }, (_, index) => (
          <i key={index} />
        ))}
      </span>
      {children}
    </button>
  );
}
