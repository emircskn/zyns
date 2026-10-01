"use client";

import { useState, type ReactNode } from "react";
import { AttachPanel } from "@/components/Attachments";
import { Control, InputLabel } from "@/components/controls";
import { CoverArt } from "@/components/CoverArt";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import {
  BatchChip,
  FieldChip,
  MentionStrip,
  ModeStrip,
  ModeTabs,
  PromptField,
  PromptFolds,
  TileChips,
  useComposer,
  useFoldedPrompts,
} from "@/components/PromptBar";
import { VendorBadge } from "@/components/VendorMark";
import { openingClip, videoDuration } from "@/lib/clips";
import type { Field, ModelDef } from "@/lib/registry";
import { mediaKind } from "@/lib/upload";
import { activeKey, useStudio, useValues } from "@/store/studio";
import { ProjectChip } from "@/components/ProjectMenu";
import { ModelMedia } from "@/components/ModelMedia";

/**
 * A reference slot before anything is in it: the whole width to aim a thumb
 * at, rather than the bar's small tile. Once it holds something it becomes
 * the ordinary control, which shows the thumbs and takes more.
 */
export function UploadSlot({ field, half }: { field: Field; half?: boolean }) {
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const [picking, setPicking] = useState(false);
  const value = values[field.key];
  const many = field.kind === "images";
  const clip = field.kind === "clips";
  const first = Array.isArray(value) ? (value[0] as { url?: string } | undefined) : undefined;
  const urls = clip
    ? first?.url
      ? [first.url]
      : []
    : many
      ? Array.isArray(value)
        ? (value as string[])
        : []
      : value
        ? [value as string]
        : [];
  const media = many || clip || field.kind === "media";

  // A clip starts as the video's opening stretch, measured once it loads.
  function chooseClip(url: string) {
    setValue(field.key, [openingClip(url, null)]);
    void videoDuration(url).then((seconds) => {
      const state = useStudio.getState();
      const now = state.valuesByModel[state.modelId]?.[field.key];
      const same = Array.isArray(now) && (now[0] as { url?: string } | undefined)?.url === url;
      if (seconds && same) state.setValue(field.key, [openingClip(url, seconds)]);
    });
  }
  const kind = field.accept ?? "image";
  const noun = kind === "image" ? (many ? "images" : "an image") : kind === "video" ? "a video" : "audio";

  if (!media || urls.length > 0) {
    return (
      <div className="rounded-panel border border-line bg-elevated p-3">
        <InputLabel field={field} />
        <Control
          field={field}
          value={value}
          values={values}
          compact
          lane
          roomy
          onChange={(next) => setValue(field.key, next)}
        />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPicking(true)}
        className={`flex w-full flex-col items-center justify-center rounded-panel border-[1.5px] border-dashed border-line-strong bg-t1/[0.02] px-3 text-center transition-colors duration-[150ms] active:bg-t1/[0.05] ${
          half ? "h-full min-h-[100px] gap-2 py-3.5" : "gap-2.5 py-5"
        }`}
      >
        <span
          className={`grid place-items-center rounded-full bg-t1/[0.08] text-t2 ${half ? "h-9 w-9" : "h-10 w-10"}`}
        >
          <Icon name={kind === "image" ? "image" : kind === "video" ? "video" : "audio"} size={half ? 16 : 18} />
        </span>
        <span className={`text-t3 ${half ? "text-[13px] leading-snug" : "text-[14px]"}`}>
          {field.label && !["images", "image", "video"].includes(field.label.toLowerCase())
            ? field.label
            : `Choose ${noun} to upload`}
          {many && field.maxItems ? <span className="text-t4"> (up to {field.maxItems})</span> : null}
        </span>
      </button>
      <MediaPicker
        open={picking}
        accept={kind}
        multiple={many}
        taken={urls}
        onPick={(picked) =>
          clip ? chooseClip(picked[0]) : setValue(field.key, many ? [...urls, ...picked] : picked[0])
        }
        onClose={() => setPicking(false)}
      />
    </>
  );
}

/** The input kinds that sit two to a row in the phone composer. */
export const SLOT_KINDS = new Set(["images", "media", "clips"]);


type Composer = ReturnType<typeof useComposer>;

/**
 * The model at the head of the composer, as a card: its latest result
 * behind its name when there is one, else its catalogue preview, else a
 * cover of light, and Change in the corner for the catalogue.
 */
export function ModelBanner({ model }: { model: ModelDef }) {
  const togglePicker = useStudio((s) => s.togglePicker);
  return (
    <div className="relative h-[124px] shrink-0 overflow-hidden rounded-panel bg-surface">
      <ModelMedia model={model} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <button
        type="button"
        onClick={() => togglePicker(true, model.category, true)}
        className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[12.5px] font-medium text-white backdrop-blur-md transition-colors duration-[120ms] hover:bg-black/70"
      >
        <Icon name="sliders" size={13} />
        Change
      </button>
      <div className="absolute inset-x-3.5 bottom-3 text-white">
        <p className="truncate text-[21px] font-bold uppercase leading-none tracking-[-0.02em]">{model.name}</p>
        <p className="mt-1.5 truncate text-[12px] text-white/75">
          {model.vendor} · {model.tagline}
        </p>
      </div>
    </div>
  );
}

/** Which model, named in a row of its own that opens the catalogue. */
function ModelRow({ model }: { model: ModelDef }) {
  const togglePicker = useStudio((s) => s.togglePicker);
  return (
    <button
      type="button"
      onClick={() => togglePicker(true, model.category, true)}
      className="flex w-full items-center gap-3 rounded-panel bg-t1/[0.05] px-3.5 py-2.5 text-left transition-colors duration-[120ms] hover:bg-t1/[0.08]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] text-t3">Model</span>
        <span className="flex items-center gap-1.5 text-[14.5px] font-medium text-t1">
          <span className="truncate">{model.name}</span>
          <VendorBadge model={model} size={15} bare />
        </span>
      </span>
      <Icon name="chevron" size={16} className="-rotate-90 shrink-0 text-t3" />
    </button>
  );
}

/** The drawer, as the last row: what it holds, and the way in. */
function AdvancedRow({ count }: { count: number }) {
  const toggleSettings = useStudio((s) => s.toggleSettings);
  return (
    <button
      type="button"
      onClick={() => toggleSettings(true)}
      className="flex w-full items-center gap-3 rounded-panel bg-t1/[0.05] px-3.5 py-3 text-left transition-colors duration-[120ms] hover:bg-t1/[0.08]"
    >
      <Icon name="sliders" size={17} className="shrink-0 text-t2" />
      <span className="flex-1 text-[14px] text-t1">Advanced</span>
      <span className="text-[12.5px] text-t3">
        {count} {count === 1 ? "option" : "options"}
      </span>
      <Icon name="chevron" size={16} className="-rotate-90 shrink-0 text-t3" />
    </button>
  );
}

const GRID_COLS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3"];

/**
 * The composer's body, shared by the phone's full-screen composer and the
 * desktop's side panel: the modes, the model, the media, the prompt with its
 * switches, and the options as a grid of tiles over the drawer's row.
 */
export function ComposerBody({
  composer,
  onSubmit,
  variant,
}: {
  composer: Composer;
  onSubmit: () => void;
  variant: "side" | "phone";
}) {
  const {
    model,
    values,
    error,
    setError,
    promptRef,
    promptFields,
    attachFields,
    stripFields,
    barFields,
    panelFields,
    batchable,
    mentionable,
    definedInPanel,
    names,
    firstPrompt,
    insertToken,
  } = composer;
  const toggleSettings = useStudio((s) => s.toggleSettings);
  const prompts = useFoldedPrompts(promptFields, values, model?.id ?? "");
  if (!model) return null;
  const phone = variant === "phone";
  // Switches ride in the prompt box, the way its audio does on a clip; the
  // options that open a menu are the tiles under it.
  const toggles = barFields.filter((f) => f.kind === "toggle");
  const tiles = barFields.filter((f) => f.kind !== "toggle");
  const count = tiles.length + (batchable ? 1 : 0);

  return (
    <>
      {phone ? <ModeStrip flush fill /> : <ModeTabs />}
      <ModelBanner model={model} />

      <AttachPanel fields={attachFields} />
      {stripFields.length > 0 && (
        <div className={stripFields.length > 1 ? "grid grid-cols-2 gap-2.5" : ""}>
          {stripFields.map((field) => {
            // Clips pair up; a list, a script or a picker of earlier
            // results needs the whole width.
            const wide = !SLOT_KINDS.has(field.kind) || stripFields.filter((f) => SLOT_KINDS.has(f.kind)).length < 2;
            return (
              <div key={field.key} className={`min-w-0 ${wide && stripFields.length > 1 ? "col-span-2" : ""}`}>
                <UploadSlot field={field} half={!wide} />
              </div>
            );
          })}
        </div>
      )}

      {(promptFields.length > 0 || toggles.length > 0) && (
        <div className="rounded-panel bg-t1/[0.05] px-3.5 pb-2.5 pt-3">
          {prompts.shown.map((field, index) => (
            <PromptField
              key={field.key}
              field={field}
              index={index}
              names={names}
              large={phone}
              onSubmit={onSubmit}
              inputRef={index === 0 ? (node) => (promptRef.current = node) : undefined}
            />
          ))}
          <PromptFolds folded={prompts.folded} onOpen={prompts.open} />
          {mentionable && firstPrompt && (
            <MentionStrip
              names={names}
              text={(values[firstPrompt.key] as string) ?? ""}
              onInsert={insertToken}
              onDefine={definedInPanel ? () => toggleSettings(true) : undefined}
            />
          )}
          {toggles.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {toggles.map((field) => (
                <FieldChip key={field.key} field={field} />
              ))}
            </div>
          )}
        </div>
      )}

      <ModelRow model={model} />

      {count > 0 && (
        <TileChips.Provider value>
          <div className={`grid gap-2 ${GRID_COLS[Math.min(3, count)]}`}>
            {tiles.map((field) => (
              <div key={field.key} className="min-w-0">
                <FieldChip field={field} />
              </div>
            ))}
            {batchable && <BatchChip />}
            <div className="min-w-0 empty:hidden">
              <ProjectChip full />
            </div>
          </div>
        </TileChips.Provider>
      )}

      {panelFields.length > 0 && <AdvancedRow count={panelFields.length} />}

      {error && (
        <div className="anim-pop flex items-start gap-2 rounded-card bg-[#ff6b6b]/10 px-3.5 py-2.5 text-[13px] text-[#ff8f8f] ring-1 ring-inset ring-[#ff6b6b]/25">
          <Icon name="alert" size={16} className="mt-px shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
    </>
  );
}

/** The one button that sends, with what it will cost; without a key it asks for one. */
export function GenerateButton({
  composer,
  onClick,
  children,
}: {
  composer: Composer;
  onClick: () => void;
  children?: ReactNode;
}) {
  const apiKey = useStudio(activeKey);
  const { busy, blocker, hint } = composer;
  const disabled = !!apiKey && (busy || !!blocker);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={apiKey ? (blocker ?? undefined) : undefined}
      className="cta flex h-12 w-full items-center justify-center gap-2 rounded-panel text-[15.5px] font-semibold disabled:opacity-40"
    >
      {busy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : !apiKey ? (
        <>
          <Icon name="key" size={17} />
          Add your API key
        </>
      ) : (
        <>
          Generate
          <Icon name="spark" size={15} fill="currentColor" strokeWidth={1.2} />
          {hint && <span className="font-mono text-[13px] font-medium tabular-nums opacity-70">{hint}</span>}
        </>
      )}
      {children}
    </button>
  );
}

/**
 * The desktop's composer for pages that work like Higgsfield's video studio:
 * a panel down the left, held in view while the history scrolls beside it.
 */
export function SideComposer({ onKey }: { onKey: () => void }) {
  const composer = useComposer();
  const apiKey = useStudio(activeKey);
  const togglePicker = useStudio((s) => s.togglePicker);
  const category = useStudio((s) => s.category);
  const { model, busy, blocker, run } = composer;

  function generate() {
    if (!apiKey) return onKey();
    if (busy || blocker) return;
    void run();
  }

  return (
    <aside className="sticky top-[76px] hidden h-[calc(100dvh-92px)] w-[340px] shrink-0 flex-col overflow-hidden rounded-panel border border-line bg-elevated md:flex">
      {model ? (
        <>
          <div className="no-bar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3 [&>*]:shrink-0">
            <ComposerBody composer={composer} variant="side" onSubmit={generate} />
          </div>
          <div className="shrink-0 border-t border-line p-3">
            <GenerateButton composer={composer} onClick={generate} />
            <p className="mt-2 truncate text-center text-[11.5px] text-t4">{apiKey && blocker ? blocker : "⌘↵ to generate"}</p>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-[15px] text-t2">Choose a model to start</p>
          <button
            type="button"
            onClick={() => togglePicker(true, category, true)}
            className="cta rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          >
            Browse models
          </button>
        </div>
      )}
    </aside>
  );
}
