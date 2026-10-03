"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { PillGroup } from "@/components/PillGroup";
import { BLURB } from "@/lib/remix/banner";
import { useStudio } from "@/store/studio";

/** Shown in place of the composer while there is no Higgsfield key: Genjutsu runs on it. */
export function NeedsHiggsfield({ onKeyClick }: { onKeyClick: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-panel border border-line bg-elevated px-5 py-8 text-center md:border-0 md:bg-transparent">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-t1/[0.08] text-t1">
        <Icon name="key" size={19} />
      </span>
      <p className="text-[15px] text-t1">This needs your Higgsfield key</p>
      <p className="max-w-[300px] text-[13px] leading-relaxed text-t3">
        Remix runs on Higgsfield&apos;s Genjutsu. Add your Higgsfield key ID and secret, and it is ready.
      </p>
      <button type="button" onClick={onKeyClick} className="cta mt-1 rounded-full px-5 py-2.5 text-[13.5px] font-medium">
        Add Higgsfield key
      </button>
    </div>
  );
}

export type RemixTab = "history" | "library" | "styles";

/**
 * Remix laid out the way the Video page is: on a desktop the composer is a
 * panel down the left, held in view while what was made scrolls beside it;
 * on a phone the page reads top to bottom, composer first.
 */
export function RemixPage({
  onKeyClick,
  composer,
  tabs,
  count,
}: {
  onKeyClick: () => void;
  /** The composer's body and its footer, laid into the panel. */
  composer?: ReactNode;
  tabs?: Partial<Record<RemixTab, { label: string; body: ReactNode }>>;
  /** How many remixes there are, for the strip over them. */
  count?: number;
}) {
  const mode = useStudio((s) => s.remix.mode);
  const hfKey = useStudio((s) => s.hfKey);
  const offered = (Object.keys(tabs ?? {}) as RemixTab[]).filter((t) => tabs?.[t]);
  const [tab, setTab] = useState<RemixTab>("history");
  const current = offered.includes(tab) ? tab : offered[0];

  return (
    <div className="anim-fade flex flex-1 flex-col md:flex-row md:gap-4 md:px-4 md:pt-4">
      {/* A phone has no header nav, so the page names itself, as the others do. */}
      <div className="px-4 pb-3 pt-1 md:hidden">
        <h2 className="text-[22px] leading-tight tracking-[-0.02em] text-t1">Remix</h2>
        <p className="text-[13px] text-t3">{BLURB[mode]}</p>
      </div>
      <aside className="flex w-full shrink-0 flex-col px-4 md:sticky md:top-[76px] md:h-[calc(100dvh-92px)] md:w-[340px] md:overflow-hidden md:rounded-panel md:border md:border-line md:bg-elevated md:px-0">
        {hfKey ? composer : <NeedsHiggsfield onKeyClick={onKeyClick} />}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        {offered.length > 0 && current && (
          <>
            {/* A slim strip over what is shown, as on the Video page. */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-6 md:min-h-[56px] md:px-1 md:py-2.5">
              <PillGroup
                plain
                value={current}
                onChange={setTab}
                items={offered.map((id) => ({ id, label: tabs![id]!.label }))}
              />
              {current === "history" && count ? (
                <p className="text-[13px] text-t3">
                  {count.toLocaleString()} {count === 1 ? "remix" : "remixes"}
                </p>
              ) : null}
            </div>
            <div key={current} className="anim-fade px-4 md:px-1">
              {tabs![current]!.body}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
