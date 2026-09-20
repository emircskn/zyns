"use client";

import { useEffect, useState } from "react";

/**
 * True on a screen that cannot hover — a phone or a tablet. Settled after
 * mount so the server-rendered markup and the client agree, and kept in sync
 * because a tablet with a keyboard attached can change its mind.
 */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: none)");
    const sync = () => setCoarse(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return coarse;
}
