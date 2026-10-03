"use client";

import { RemixComposer } from "@/components/remix/RemixComposer";
import { RemixHistory } from "@/components/remix/RemixHistory";
import { RemixPage } from "@/components/remix/RemixPage";

/** The Remix page with everything it holds wired in. */
export function RemixStudio({ onKeyClick }: { onKeyClick: () => void }) {
  return (
    <RemixPage
      onKeyClick={onKeyClick}
      composer={<RemixComposer onKeyClick={onKeyClick} />}
      tabs={{ history: { label: "History", body: <RemixHistory /> } }}
    />
  );
}
