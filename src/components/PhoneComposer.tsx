"use client";

import { useEffect, useState } from "react";
import { Control } from "@/components/controls";
import { Icon } from "@/components/Icon";
import { ZynsMark } from "@/components/Logo";
import { MediaPicker } from "@/components/MediaPicker";
import {
  BatchChip,
  FieldChip,
  LargeChips,
  MentionStrip,
  ModeStrip,
  PromptField,
  useComposer,
} from "@/components/PromptBar";
import { VendorBadge } from "@/components/VendorMark";
import type { Field } from "@/lib/registry";
import { usePresence } from "@/lib/usePresence";
import { useStudio, useValues } from "@/store/studio";

/**
 * A reference slot before anything is in it: the whole width to aim a thumb
 * at, rather than the bar's small tile. Once it holds something it becomes
 * the ordinary control, which shows the thumbs and takes more.
 */
function UploadSlot({ field, half }: { field: Field; half?: boolean }) {
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const [picking, setPicking] = useState(false);
  const value = values[field.key];
  const many = field.kind === "images";
  const urls = many ? (Array.isArray(value) ? (value as string[]) : []) : value ? [value as string] : [];
  const media = field.kind === "images" || field.kind === "media";
  const kind = field.accept ?? "image";
  const noun = kind === "image" ? (many ? "images" : "an image") : kind === "video" ? "a video" : "audio";

  if (!media || urls.length > 0) {
    return (
      <div className="rounded-panel border border-line bg-elevated p-3.5">
        <Control
          field={field}
          value={value}
          values={values}
          compact
          lane
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
          half ? "h-full min-h-[118px] gap-2 py-4" : "gap-3 py-7"
        }`}
      >
        <span
          className={`grid place-items-center rounded-full bg-t1/[0.08] text-t2 ${half ? "h-10 w-10" : "h-12 w-12"}`}
        >
          <Icon name={kind === "image" ? "image" : kind === "video" ? "video" : "audio"} size={half ? 18 : 20} />
        </span>
        <span className={`text-t3 ${half ? "text-[13.5px] leading-snug" : "text-[14.5px]"}`}>
          {field.label && field.label.toLowerCase() !== "images" && field.label.toLowerCase() !== "image"
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
        onPick={(picked) => setValue(field.key, many ? [...urls, ...picked] : picked[0])}
        onClose={() => setPicking(false)}
      />
    </>
  );
}

/**
 * Where a phone writes a prompt. The docked box took a third of the screen
 * away from the gallery all the time; this takes all of it, but only while
 * something is being made, and gives it back the moment it is sent.
 */
export function PhoneComposer({ onKey }: { onKey: () => void }) {
  const open = useStudio((s) => s.composer);
  const setComposer = useStudio((s) => s.setComposer);
  const setCreateOpen = useStudio((s) => s.setCreateOpen);
  const togglePicker = useStudio((s) => s.togglePicker);
  const toggleSettings = useStudio((s) => s.toggleSettings);
  const apiKey = useStudio((s) => s.apiKey);
  const { mounted, exiting } = usePresence(open, 300);
  const {
    model,
    values,
    busy,
    error,
    setError,
    promptRef,
    promptFields,
    inputFields,
    barFields,
    panelFields,
    batchable,
    blocker,
    hint,
    mentionable,
    names,
    firstPrompt,
    insertToken,
    run,
  } = useComposer();

  const close = () => setComposer(false);

  useEffect(() => {
    if (!open) return;
    // Escape closes whatever is on top: a picker or catalogue opened from
    // here goes first, and the composer only when it is the top layer.
    function onEscape(event: KeyboardEvent) {
      const { pickerOpen, createOpen, settingsOpen } = useStudio.getState();
      if (event.key === "Escape" && !pickerOpen && !createOpen && !settingsOpen) setComposer(false);
    }
    document.addEventListener("keydown", onEscape);
    // The page under it must not scroll along with it.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = overflow;
    };
  }, [open, setComposer]);

  // Nothing to compose for without a model, and the breakpoint leaving the
  // phone takes the composer with it.
  useEffect(() => {
    if (open && !model) setComposer(false);
  }, [open, model, setComposer]);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const onChange = () => wide.matches && setComposer(false);
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [setComposer]);

  if (!mounted || !model) return null;

  async function generate() {
    if (!apiKey) return onKey();
    if (busy || blocker) return;
    // Sent, the composer steps aside so the run can be watched landing.
    if (await run()) close();
  }

  // Without a key the button is still the way forward: it asks for one.
  const disabled = !!apiKey && (busy || !!blocker);
  const why = apiKey ? blocker : "Generating needs your KIE API key";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Create ${model.output}`}
      className={`fixed inset-0 z-[60] flex flex-col bg-canvas md:hidden ${
        exiting ? "anim-sheet-out" : "anim-sheet"
      }`}
    >
      <header className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
        {/* Another kind of thing to make is the catalogue, not this screen. */}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex min-w-0 items-center gap-2.5 transition-opacity duration-[150ms] active:opacity-70"
        >
          <ZynsMark size={30} />
          <span className="truncate text-[19px] font-semibold uppercase tracking-[-0.01em] text-t1">
            Create {model.output}
          </span>
          <Icon name="chevron" size={18} className="shrink-0 text-t3" />
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-card bg-t1/[0.07] text-t1 transition-colors duration-[120ms] active:bg-t1/[0.12]"
        >
          <Icon name="close" size={19} />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-4 pt-1 [&>*]:shrink-0">
        <ModeStrip />

        {/* Two slots, a first and a last frame say, share a row: stacked,
            they pushed the prompt off a small phone's screen. */}
        {inputFields.length > 0 && (
          <div className={inputFields.length > 1 ? "grid grid-cols-2 gap-3" : ""}>
            {inputFields.map((field) => (
              <UploadSlot key={field.key} field={field} half={inputFields.length > 1} />
            ))}
          </div>
        )}

        <div className="rounded-panel border border-line bg-elevated">
          {promptFields.length > 0 && (
            <div className="px-4 pb-2 pt-4">
              {promptFields.map((field, index) => (
                <PromptField
                  key={field.key}
                  field={field}
                  index={index}
                  names={names}
                  large
                  onSubmit={() => void generate()}
                  inputRef={index === 0 ? (node) => (promptRef.current = node) : undefined}
                />
              ))}
              {mentionable && firstPrompt && (
                <MentionStrip
                  names={names}
                  text={(values[firstPrompt.key] as string) ?? ""}
                  onInsert={insertToken}
                  onDefine={() => toggleSettings(true)}
                />
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => togglePicker(true, model.category, true)}
            className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-[120ms] active:bg-t1/[0.04] ${
              promptFields.length > 0 ? "border-t border-line" : ""
            }`}
          >
            <Icon name="layers" size={18} className="shrink-0 text-t3" />
            <span className="text-[14.5px] text-t3">Model</span>
            <span className="ml-auto flex min-w-0 items-center gap-2 text-[15px] text-t1">
              <VendorBadge model={model} size={22} />
              <span className="truncate">{model.name}</span>
              <Icon name="chevron" size={17} className="shrink-0 text-t3" />
            </span>
          </button>
        </div>

        {error && (
          <div className="anim-pop flex items-start gap-2 rounded-card bg-[#ff6b6b]/10 px-3.5 py-2.5 text-[13px] text-[#ff8f8f] ring-1 ring-inset ring-[#ff6b6b]/25">
            <Icon name="alert" size={16} className="mt-px shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
              <Icon name="close" size={15} />
            </button>
          </div>
        )}
      </div>

      <footer className="shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        {(barFields.length > 0 || batchable || panelFields.length > 0) && (
          <LargeChips.Provider value>
            {/* One row that scrolls sideways, as a phone's filter row does,
                rather than two that eat into the prompt. */}
            <div className="no-bar -mx-4 mb-3 flex items-center gap-2 overflow-x-auto px-4">
              {barFields.map((field) => (
                <span key={field.key} className="shrink-0">
                  <FieldChip field={field} />
                </span>
              ))}
              {batchable && (
                <span className="shrink-0">
                  <BatchChip />
                </span>
              )}
              {panelFields.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleSettings(true)}
                  aria-label="Advanced settings"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-t1/[0.07] text-t2 transition-colors duration-[120ms] active:bg-t1/[0.12]"
                >
                  <Icon name="sliders" size={18} />
                </button>
              )}
            </div>
          </LargeChips.Provider>
        )}

        <button
          type="button"
          onClick={() => void generate()}
          disabled={disabled}
          className="cta flex h-14 w-full items-center justify-center gap-2.5 rounded-panel text-[17px] font-semibold active:scale-[0.99] disabled:opacity-40"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            !apiKey ? (
              <>
                <Icon name="key" size={18} />
                Add your API key
              </>
            ) : (
            <>
              Generate
              <Icon name="spark" size={17} fill="currentColor" strokeWidth={1.2} />
              {hint && <span className="font-mono text-[14px] font-medium tabular-nums opacity-70">{hint}</span>}
            </>
            )
          )}
        </button>
        {why && <p className="mt-2 text-center text-[12.5px] text-t4">{why}</p>}
      </footer>
    </div>
  );
}
