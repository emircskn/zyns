"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The lines of an empty state, arriving one after the other. Shown a frame
 * after mount so the transition has a state to move from.
 */
export function Stagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return <div className={`t-stagger ${shown ? "is-shown" : ""} ${className}`}>{children}</div>;
}
