"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { isDirect } from "@/lib/higgsfield/transport";
import { applyHiggsfieldCatalog } from "@/lib/registry";

/** Bumped when the live catalogue changed the Higgsfield models, so the studio draws them again. */
const useCatalogVersion = create<{ version: number }>(() => ({ version: 0 }));

let asked = false;

/**
 * Brings in Higgsfield's live catalogue once per visit: a parameter or
 * option Higgsfield added since the shipped snapshot shows up in its form
 * without a new release. The standalone build has no server to ask and
 * keeps the snapshot.
 */
export function useHiggsfieldCatalog(): number {
  useEffect(() => {
    if (asked || isDirect()) return;
    asked = true;
    fetch("/api/hf-catalog")
      .then((res) => (res.ok ? res.json() : null))
      .then((catalog) => {
        if (catalog && applyHiggsfieldCatalog(catalog)) useCatalogVersion.setState((s) => ({ version: s.version + 1 }));
      })
      .catch(() => {});
  }, []);
  return useCatalogVersion((s) => s.version);
}
