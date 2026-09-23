"use client";

import { useEffect, useRef, useState } from "react";
import { Control } from "@/components/controls";
import { Icon, type IconName } from "@/components/Icon";
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
import { CATEGORIES, MODELS, activeFields, getModel, type Category, type Field } from "@/lib/registry";
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
      <div className="rounded-panel border border-line bg-elevated p-3">
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
          half ? "h-full min-h-[100px] gap-2 py-3.5" : "gap-2.5 py-5"
        }`}
      >
        <span
          className={`grid place-items-center rounded-full bg-t1/[0.08] text-t2 ${half ? "h-9 w-9" : "h-10 w-10"}`}
        >
          <Icon name={kind === "image" ? "image" : kind === "video" ? "video" : "audio"} size={half ? 16 : 18} />
        </span>
        <span className={`text-t3 ${half ? "text-[13px] leading-snug" : "text-[14px]"}`}>
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

const SECTION_ICON: Record<Category, IconName> = {
  image: "image",
  video: "video",
  audio: "audio",
  tool: "tool",
};

/**
 * The model a section opens on: the one last used there, or else the first
 * the catalogue features, or else simply its first.
 */
function modelFor(category: Category): string | undefined {
  const remembered = useStudio.getState().modelByCategory[category];
  if (remembered && getModel(remembered)) return remembered;
  const own = MODELS.filter((m) => m.category === category);
  return (own.find((m) => m.featured) ?? own[0])?.id;
}

/**
 * The header's menu: the four kinds of thing to make, to move between
 * without leaving the composer.
 */
function SectionMenu({
  current,
  onPick,
  onClose,
}: {
  current: Category;
  onPick: (category: Category) => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="no-press anim-fade absolute inset-0 z-10 bg-canvas-deep/60"
      />
      <div
        role="menu"
        aria-label="Switch what to make"
        className="anim-pop absolute left-4 top-[calc(max(12px,env(safe-area-inset-top))+52px)] z-20 w-[min(280px,calc(100vw-32px))] rounded-panel border border-line bg-elevated p-1.5"
        style={{ boxShadow: "var(--shadow-pop)", transformOrigin: "top left" }}
      >
        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-t4">Create</p>
        {CATEGORIES.map((category) => {
          const on = category.id === current;
          return (
            <button
              key={category.id}
              type="button"
              role="menuitemradio"
              aria-checked={on}
              onClick={() => onPick(category.id)}
              className={`flex w-full items-center gap-3 rounded-card px-3 py-3 text-left transition-colors duration-[120ms] ${
                on ? "bg-t1/[0.08] text-t1" : "text-t2 active:bg-t1/[0.05]"
              }`}
            >
              <Icon name={SECTION_ICON[category.id]} size={19} className={on ? "" : "text-t3"} />
              <span className="min-w-0 flex-1 text-[15px] font-medium">{category.label}</span>
              {on && <Icon name="check" size={16} className="shrink-0" />}
            </button>
          );
        })}
      </div>
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
  const selectModel = useStudio((s) => s.selectModel);
  const setPage = useStudio((s) => s.setPage);
  const setValue = useStudio((s) => s.setValue);
  const [menu, setMenu] = useState(false);
  const menuOpen = useRef(false);
  menuOpen.current = menu;
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
      if (event.key !== "Escape" || pickerOpen || createOpen || settingsOpen) return;
      if (menuOpen.current) setMenu(false);
      else setComposer(false);
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

  // Named for the page the model belongs to, the way the rail names it:
  // IMAGE, VIDEO, AUDIO, TOOLS.
  const section = CATEGORIES.find((c) => c.id === model.category)?.label ?? model.category;

  // Another section keeps what has been written: the prompt goes with you to
  // its model, unless that model already has one of its own.
  function switchTo(category: Category) {
    setMenu(false);
    if (!model || category === model.category) return;
    const id = modelFor(category);
    const next = id ? getModel(id) : undefined;
    if (!id || !next) return;
    const text = firstPrompt ? ((values[firstPrompt.key] as string) ?? "").trim() : "";
    selectModel(id);
    setPage(category);
    if (!text) return;
    const state = useStudio.getState();
    const target = activeFields(next, state.valuesByModel[id] ?? {}).find((f) => f.placement === "prompt");
    if (target && !((state.valuesByModel[id]?.[target.key] as string) ?? "").trim()) setValue(target.key, text);
  }

  // Without a key the button is still the way forward: it asks for one.
  const disabled = !!apiKey && (busy || !!blocker);
  const why = apiKey ? blocker : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${section} composer`}
      className={`fixed inset-0 z-[60] flex flex-col bg-canvas md:hidden ${
        exiting ? "anim-sheet-out" : "anim-sheet"
      }`}
    >
      <header className="flex shrink-0 items-center gap-3 px-4 pb-2.5 pt-[max(12px,env(safe-area-inset-top))]">
        {/* Which kind of thing is being made, and the way to another. */}
        <button
          type="button"
          onClick={() => setMenu((was) => !was)}
          aria-haspopup="menu"
          aria-expanded={menu}
          className="relative z-30 flex min-w-0 items-center gap-2.5 transition-opacity duration-[150ms] active:opacity-70"
        >
          <ZynsMark size={30} />
          <span className="truncate text-[19px] font-semibold uppercase tracking-[-0.01em] text-t1">
            {section}
          </span>
          <Icon
            name="chevron"
            size={18}
            className="shrink-0 text-t3 transition-transform duration-[200ms]"
            style={{ transform: menu ? "rotate(180deg)" : "none" }}
          />
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-card bg-t1/[0.07] text-t1 transition-colors duration-[120ms] active:bg-t1/[0.12]"
        >
          <Icon name="close" size={18} />
        </button>
      </header>

      {menu && <SectionMenu current={model.category} onPick={switchTo} onClose={() => setMenu(false)} />}

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-4 pb-3 pt-1 [&>*]:shrink-0">
        <ModeStrip flush />

        {/* Two slots, a first and a last frame say, share a row: stacked,
            they pushed the prompt off a small phone's screen. */}
        {inputFields.length > 0 && (
          <div className={inputFields.length > 1 ? "grid grid-cols-2 gap-2.5" : ""}>
            {inputFields.map((field) => (
              <UploadSlot key={field.key} field={field} half={inputFields.length > 1} />
            ))}
          </div>
        )}

        <div className="rounded-panel border border-line bg-elevated">
          {promptFields.length > 0 && (
            <div className="px-4 pb-1.5 pt-3.5">
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
            className={`flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors duration-[120ms] active:bg-t1/[0.04] ${
              promptFields.length > 0 ? "border-t border-line" : ""
            }`}
          >
            <Icon name="layers" size={16} className="shrink-0 text-t3" />
            <span className="text-[13.5px] text-t3">Model</span>
            <span className="ml-auto flex min-w-0 items-center gap-2 text-[14px] text-t1">
              <VendorBadge model={model} size={20} />
              <span className="truncate">{model.name}</span>
              <Icon name="chevron" size={15} className="shrink-0 text-t3" />
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

      <footer className="shrink-0 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        {(barFields.length > 0 || batchable || panelFields.length > 0) && (
          <LargeChips.Provider value>
            {/* One row that scrolls sideways, as a phone's filter row does,
                rather than two that eat into the prompt. */}
            <div className="no-bar -mx-4 mb-2.5 flex items-center gap-2 overflow-x-auto px-4">
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
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-t1/[0.07] text-t2 transition-colors duration-[120ms] active:bg-t1/[0.12]"
                >
                  <Icon name="sliders" size={17} />
                </button>
              )}
            </div>
          </LargeChips.Provider>
        )}

        <button
          type="button"
          onClick={() => void generate()}
          disabled={disabled}
          className="cta flex h-12 w-full items-center justify-center gap-2 rounded-panel text-[15.5px] font-semibold active:scale-[0.99] disabled:opacity-40"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            !apiKey ? (
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
            )
          )}
        </button>
        {why && <p className="mt-1.5 text-center text-[12px] text-t4">{why}</p>}
      </footer>
    </div>
  );
}
