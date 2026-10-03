"use client";

import { useEffect, useRef, useState } from "react";
import { ComposerBody, GenerateButton } from "@/components/ComposerPanel";
import { Icon, type IconName } from "@/components/Icon";
import { ZynsMark } from "@/components/Logo";
import { useComposer } from "@/components/PromptBar";
import { ProviderSwitch } from "@/components/ProviderSwitch";
import { GenjutsuComposer } from "@/components/remix/RemixStudio";
import { GENJUTSU } from "@/lib/remix/targets";
import { CATEGORIES, categoriesFor, getModel, modelsFor, type Category } from "@/lib/registry";
import { usePresence } from "@/lib/usePresence";
import { activeKey, memoryKey, useStudio } from "@/store/studio";

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
  const { provider, modelByCategory } = useStudio.getState();
  const remembered = modelByCategory[memoryKey(provider, category)];
  if (remembered && getModel(remembered)) return remembered;
  const own = modelsFor(provider).filter((m) => m.category === category);
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
  const provider = useStudio((s) => s.provider);
  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="anim-fade absolute inset-0 z-10 bg-canvas-deep/60"
      />
      <div
        role="menu"
        aria-label="Switch what to make"
        className="anim-pop absolute left-4 top-[calc(max(12px,env(safe-area-inset-top))+52px)] z-20 flex w-[min(280px,calc(100vw-32px))] flex-col gap-1 rounded-panel border border-line bg-elevated p-2"
        style={{ boxShadow: "var(--shadow-pop)", transformOrigin: "top left" }}
      >
        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-t4">Create</p>
        {categoriesFor(provider).map((category) => {
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
  const [menu, setMenu] = useState(false);
  const menuOpen = useRef(false);
  menuOpen.current = menu;
  const apiKey = useStudio(activeKey);
  const { mounted, exiting } = usePresence(open, 300);
  const composer = useComposer();
  const { model, busy, blocker, run } = composer;

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

  // Another section has its own prompt: each category keeps what was last
  // written in it, so the text here stays here.
  function switchTo(category: Category) {
    setMenu(false);
    if (!model || category === model.category) return;
    const id = modelFor(category);
    if (!id || !getModel(id)) return;
    selectModel(id);
    setPage(category);
  }

  // Without a key the button is still the way forward: it asks for one.
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
          <span className="truncate text-[17px] font-semibold uppercase tracking-[-0.005em] text-t1">
            {section}
          </span>
          <Icon
            name="chevron"
            size={18}
            className="shrink-0 text-t3 transition-transform duration-[200ms]"
            style={{ transform: menu ? "rotate(180deg)" : "none" }}
          />
        </button>
        {/* Switching service here keeps the composer open on the same kind
            of work, with that service's model for it (or the page's first). */}
        <span className="ml-auto shrink-0">
          <ProviderSwitch
            size="xs"
            onSwitched={() => {
              const kind = modelsFor(useStudio.getState().provider).some((m) => m.category === model.category)
                ? model.category
                : "image";
              const id = modelFor(kind);
              if (id) {
                selectModel(id);
                setPage(kind);
              }
            }}
          />
        </span>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-t1/[0.07] text-t1 transition-colors duration-[120ms] active:bg-t1/[0.12]"
        >
          <Icon name="close" size={18} />
        </button>
      </header>

      {menu && <SectionMenu current={model.category} onPick={switchTo} onClose={() => setMenu(false)} />}

      {model.id === GENJUTSU ? (
        // Genjutsu is Remix's model: here it brings Remix's own composer.
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-1">
          <GenjutsuComposer
            scroll
            onKeyClick={onKey}
            onChangeModel={() => useStudio.getState().togglePicker(true, model.category, true)}
            onSent={close}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-4 pb-3 pt-1 [&>*]:shrink-0">
            <ComposerBody composer={composer} variant="phone" onSubmit={() => void generate()} />
          </div>

          <footer className="shrink-0 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
            <GenerateButton composer={composer} onClick={() => void generate()} />
            {why && <p className="mt-2 text-center text-[12.5px] text-t4">{why}</p>}
          </footer>
        </>
      )}
    </div>
  );
}
