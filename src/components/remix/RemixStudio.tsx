"use client";

import { BeforeAfter } from "@/components/remix/BeforeAfter";
import { Icon } from "@/components/Icon";
import { RemixComposer } from "@/components/remix/RemixComposer";
import { RemixHistory } from "@/components/remix/RemixHistory";
import { RemixPage } from "@/components/remix/RemixPage";
import { RestyleModelRow, StyleGrid, StyleRow, useRestyleStyle } from "@/components/remix/Restyle";
import { restoreRemix } from "@/lib/remix/reuse";
import { styleInput } from "@/lib/remix/styles";
import { useStudio, type Run } from "@/store/studio";

/** Back to the composer, where the next thing to do is. */
function toComposer() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function CardAction({
  label,
  short,
  icon,
  onClick,
}: {
  label: string;
  /** What a phone's narrow card has room for. */
  short?: string;
  icon: Parameters<typeof Icon>[0]["name"];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="flex h-8 items-center gap-1.5 rounded-full bg-t1/[0.07] px-3 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
    >
      <Icon name={icon} size={14} />
      <span className="hidden sm:inline">{label}</span>
      {short && <span className="sm:hidden">{short}</span>}
    </button>
  );
}

/** The Remix page with everything it holds wired in. */
export function RemixStudio({ onKeyClick }: { onKeyClick: () => void }) {
  const mode = useStudio((s) => s.remix.mode);
  const restyle = mode === "restyle";
  const { style, preset, needs } = useRestyleStyle();

  const stage = (run: Run, open: (url: string) => void) => (
    <>
      <BeforeAfter before={run.remix!.source} after={run.urls[0]} />
      <button
        type="button"
        onClick={() => open(run.urls[0])}
        aria-label="Open"
        title="Open"
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-transform duration-[120ms] active:scale-90"
      >
        <Icon name="expand" size={15} />
      </button>
    </>
  );

  const actions = (run: Run) => (
    <>
      {/* Same clip, new pictures: the next thing most people try. */}
      <CardAction
        label="Same source, other reference"
        short="Other refs"
        icon="layers"
        onClick={() => {
          restoreRemix(run, { keepRefs: false });
          toComposer();
        }}
      />
      <CardAction
        label="Again"
        icon="refresh"
        onClick={() => {
          restoreRemix(run);
          toComposer();
        }}
      />
    </>
  );

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
        history: { label: "History", body: <RemixHistory stage={stage} actions={actions} /> },
        ...(restyle ? { styles: { label: "Styles", body: <StyleGrid /> } } : {}),
      }}
    />
  );
}
