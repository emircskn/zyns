"use client";

import { RemixComposer } from "@/components/remix/RemixComposer";
import { RemixHistory } from "@/components/remix/RemixHistory";
import { RemixPage } from "@/components/remix/RemixPage";
import { RestyleModelRow, StyleGrid, StyleRow, useRestyleStyle } from "@/components/remix/Restyle";
import { styleInput } from "@/lib/remix/styles";
import { useStudio } from "@/store/studio";

/** The Remix page with everything it holds wired in. */
export function RemixStudio({ onKeyClick }: { onKeyClick: () => void }) {
  const mode = useStudio((s) => s.remix.mode);
  const restyle = mode === "restyle";
  const { style, preset, needs } = useRestyleStyle();
  return (
    <RemixPage
      onKeyClick={onKeyClick}
      composer={
        <RemixComposer
          onKeyClick={onKeyClick}
          above={restyle ? <RestyleModelRow /> : undefined}
          below={restyle ? <StyleRow /> : undefined}
          style={restyle ? styleInput(style) : undefined}
          needsStyle={restyle ? needs : null}
          info={restyle ? { presetName: preset?.name ?? style?.name } : undefined}
        />
      }
      tabs={{
        history: { label: "History", body: <RemixHistory /> },
        ...(restyle ? { styles: { label: "Styles", body: <StyleGrid /> } } : {}),
      }}
    />
  );
}
