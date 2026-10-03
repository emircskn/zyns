"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { PillGroup } from "@/components/PillGroup";
import { getModel } from "@/lib/registry";
import { getSpec } from "@/lib/registry/hf/auto";
import { MODE_LABEL, MOTION, SWAP } from "@/lib/remix/targets";
import type { RemixMode } from "@/lib/remix/types";
import { useStudio } from "@/store/studio";

/** The catalogue's moving banner for a Genjutsu mode, from Higgsfield's live catalogue. */
function bannerOf(mode: RemixMode) {
  const genjutsu = getModel(MOTION.modelId);
  if (!genjutsu) return undefined;
  const endpoint = mode === "swap" ? SWAP : MOTION;
  try {
    const id = genjutsu.build({ __mode: endpoint.mode }).endpoint.replace(/^\//, "");
    const spec = getSpec(id);
    return spec?.banner ?? spec?.preview;
  } catch {
    return undefined;
  }
}

const BLURB: Record<RemixMode, string> = {
  motion: "Your characters, moving the way a clip moves.",
  swap: "Something in a clip, replaced by what you give it.",
  restyle: "The same clip, in another look.",
};

function Banner({ mode }: { mode: RemixMode }) {
  const media = bannerOf(mode === "restyle" ? "motion" : mode);
  return (
    <div className="relative overflow-hidden rounded-panel border border-line bg-surface-2">
      <div className="relative aspect-[16/7] w-full md:aspect-[16/4]">
        {media?.video ? (
          <video
            key={media.video}
            src={media.video}
            poster={media.poster}
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : media?.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
          <h1 className="text-[34px] font-black uppercase leading-none tracking-[-0.04em] text-white [text-shadow:0_2px_18px_rgb(0_0_0/0.45)] md:text-[44px]">
            Remix
          </h1>
          <p className="text-[12.5px] text-white/80 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]">
            {MODE_LABEL[mode]} · {BLURB[mode]}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Shown in place of the composer while there is no Higgsfield key: Genjutsu runs on it. */
export function NeedsHiggsfield({ onKeyClick }: { onKeyClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border border-line bg-elevated px-5 py-8 text-center">
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
 * Remix, Higgsfield's Genjutsu in the studio: a composer down the left (on
 * a phone, at the top), and beside it what was made here, the clips kept
 * for their motion and, in Restyle, the styles.
 */
export function RemixPage({
  onKeyClick,
  composer,
  tabs,
}: {
  onKeyClick: () => void;
  composer?: ReactNode;
  tabs?: Partial<Record<RemixTab, { label: string; body: ReactNode }>>;
}) {
  const mode = useStudio((s) => s.remix.mode);
  const hfKey = useStudio((s) => s.hfKey);
  const offered = (Object.keys(tabs ?? {}) as RemixTab[]).filter((t) => tabs?.[t]);
  const [tab, setTab] = useState<RemixTab>("history");
  const current = offered.includes(tab) ? tab : offered[0];

  return (
    <div className="anim-fade flex flex-1 flex-col gap-4 pb-6 md:flex-row md:items-start md:gap-5">
      {/* A phone reads the page top to bottom: what it is, then the composer. */}
      <div className="md:hidden">
        <Banner mode={mode} />
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-3 md:sticky md:top-[76px] md:max-h-[calc(100dvh-92px)] md:w-[380px] md:overflow-y-auto md:no-bar">
        {hfKey ? composer : <NeedsHiggsfield onKeyClick={onKeyClick} />}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="hidden md:block">
          <Banner mode={mode} />
        </div>
        {offered.length > 0 && current && (
          <>
            <PillGroup
              plain
              value={current}
              onChange={setTab}
              items={offered.map((id) => ({ id, label: tabs![id]!.label }))}
            />
            <div key={current} className="anim-fade">
              {tabs![current]!.body}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
