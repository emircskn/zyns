"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { insertMention, mentionAtCaret } from "@/lib/mentions";
import type { Field } from "@/lib/registry";
import type { LibraryElement } from "@/lib/elements";
import { mediaSrc } from "@/lib/storage/client";
import { movesIn, putMove } from "@/lib/studio/compose";
import { previewOf } from "@/lib/studio/options";
import { useStudio } from "@/store/studio";

type Option =
  | { kind: "element"; key: string; label: string; thumb?: string; element: LibraryElement }
  | { kind: "move"; key: string; label: string; thumb?: string; value: string };

/** `#partial` at the caret, as `mentionAtCaret` finds `@partial`. */
function hashAtCaret(text: string, caret: number): { start: number; query: string } | null {
  const match = /(^|\s)#([^\s#]*)$/.exec(text.slice(0, caret));
  if (!match) return null;
  return { start: caret - match[2].length - 1, query: match[2] };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The element and move chips in the text, in order. */
function chipsIn(text: string, names: string[], move: Field | undefined): Array<{ start: number; end: number; kind: "element" | "move" }> {
  const chips: Array<{ start: number; end: number; kind: "element" | "move" }> = [];
  for (const name of names) {
    const re = new RegExp(`(^|[\\s(])@${escapeRegExp(name)}(?=$|[\\s.,!?;:)'"])`, "g");
    for (const match of text.matchAll(re)) {
      const start = (match.index ?? 0) + match[1].length;
      chips.push({ start, end: start + name.length + 1, kind: "element" });
    }
  }
  for (const m of movesIn(text, move)) chips.push({ start: m.start, end: m.end, kind: "move" });
  return chips.sort((a, b) => a.start - b.start);
}

/**
 * The composer's prompt. `@` calls an element from the library and `#` a
 * camera move; each lands as a chip, drawn in blue and taken out whole by
 * one Backspace. A textarea cannot hold chips, so the text is painted by a
 * copy laid exactly behind it, with each chip on its own background, while
 * the textarea keeps the caret and the typing (as the main prompt bar does).
 */
export function StudioPrompt({
  text,
  placeholder,
  onText,
  onElement,
  onMoveReplaced,
  onSubmit,
  move,
  inputRef,
  rows = 2,
}: {
  text: string;
  placeholder: string;
  onText: (text: string) => void;
  onElement?: (element: LibraryElement) => void;
  /** A second move took the place of the first. */
  onMoveReplaced?: () => void;
  onSubmit: () => void;
  /** The camera move field, when the model takes one; no `#` menu without it. */
  move?: Field;
  inputRef?: (node: HTMLTextAreaElement | null) => void;
  rows?: number;
}) {
  const elements = useStudio((s) => s.elements).filter((e) => e.kind !== "style");
  const ref = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [spot, setSpot] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null);
  const pendingCaret = useRef<number | null>(null);

  const names = elements.map((e) => e.name);
  const chips = chipsIn(text, names, move);
  const inChip = caret !== null && chips.some((c) => caret > c.start && caret <= c.end);
  const at = caret === null || inChip ? null : mentionAtCaret(text, caret);
  const hash = caret === null || inChip || !move ? null : hashAtCaret(text, caret);
  const token = at ?? hash;
  const q = (token?.query ?? "").toLowerCase();
  const options: Option[] = at
    ? elements
        .filter((e) => e.name.toLowerCase().startsWith(q))
        .map((e) => ({ kind: "element", key: e.id, label: e.name, thumb: e.images[0]?.storageUrl, element: e }))
    : hash
      ? (move?.choices ?? [])
          .filter((c) => c.value && (c.value.startsWith(q) || c.label.toLowerCase().includes(q)))
          .map((c) => ({ kind: "move", key: c.value, label: c.label, thumb: previewOf(move!.key, c.value)?.image, value: c.value }))
      : [];
  const open = !!token && options.length > 0 && dismissed !== token.start;

  useEffect(() => setCursor(0), [token?.query, token?.start]);

  useLayoutEffect(() => {
    const target = pendingCaret.current;
    const node = ref.current;
    if (target === null || !node) return;
    pendingCaret.current = null;
    node.focus();
    node.setSelectionRange(target, target);
    setCaret(target);
  });

  useLayoutEffect(() => {
    if (mirror.current && ref.current) mirror.current.scrollTop = ref.current.scrollTop;
  });

  useLayoutEffect(() => {
    if (!open) {
      setSpot(null);
      return;
    }
    const measure = () => {
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const margin = 12;
      const width = Math.min(260, window.innerWidth - 2 * margin);
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - margin - width));
      const view = window.visualViewport;
      const viewBottom = (view?.offsetTop ?? 0) + (view?.height ?? window.innerHeight);
      if (viewBottom - rect.bottom > 240) setSpot({ left, top: rect.bottom + 6, width });
      else setSpot({ left, bottom: window.innerHeight - rect.top + 6, width });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, text]);

  function pick(option: Option) {
    if (!token) return;
    const end = caret ?? text.length;
    if (option.kind === "element") {
      const next = insertMention(text, token.start, end, option.element.name);
      onText(next.text);
      pendingCaret.current = next.caret;
      onElement?.(option.element);
    } else {
      // The half-typed `#do` goes, and the chip lands where it was.
      const cleared = text.slice(0, token.start) + text.slice(end);
      const next = putMove(cleared, option.value, move, token.start);
      onText(next.text);
      pendingCaret.current = next.caret;
      if (next.replaced) onMoveReplaced?.();
    }
    setDismissed(null);
  }

  /** A chip goes whole: Backspace at its end (or Delete at its start) takes all of it. */
  function eraseChip(event: KeyboardEvent<HTMLTextAreaElement>) {
    const node = event.currentTarget;
    if (node.selectionStart !== node.selectionEnd) return false;
    const pos = node.selectionStart;
    const chip = chips.find((c) => (event.key === "Backspace" ? pos > c.start && pos <= c.end : pos >= c.start && pos < c.end));
    if (!chip) return false;
    event.preventDefault();
    const end = text[chip.end] === " " && (chip.start === 0 || text[chip.start - 1] === " ") ? chip.end + 1 : chip.end;
    onText(text.slice(0, chip.start) + text.slice(end));
    pendingCaret.current = chip.start;
    return true;
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.key === "Backspace" || event.key === "Delete") && !event.altKey && !event.metaKey && !event.ctrlKey) {
      if (eraseChip(event)) return;
    }
    if (open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((c) => (c + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pick(options[cursor] ?? options[0]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setDismissed(token?.start ?? null);
        return;
      }
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    }
  }

  const sync = () => ref.current && setCaret(ref.current.selectionStart);
  const type = "text-[16px] leading-[1.5] md:text-[14.5px]";
  const copy: ReactNode[] = [];
  if (chips.length > 0) {
    let last = 0;
    for (const chip of chips) {
      copy.push(text.slice(last, chip.start));
      copy.push(
        <span key={chip.start} className="mention-chip">
          {text.slice(chip.start, chip.end)}
        </span>,
      );
      last = chip.end;
    }
    copy.push(text.slice(last) + "​");
  }

  return (
    <div className="relative min-w-0 flex-1">
      {chips.length > 0 && (
        <div
          ref={mirror}
          aria-hidden
          className={`no-bar pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-t1 ${type}`}
        >
          {copy}
        </div>
      )}
      <textarea
        ref={(node) => {
          ref.current = node;
          inputRef?.(node);
        }}
        aria-label="Prompt"
        value={text}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => {
          onText(event.target.value);
          setCaret(event.target.selectionStart);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={sync}
        onClick={sync}
        onSelect={sync}
        onScroll={(event) => {
          if (mirror.current) mirror.current.scrollTop = event.currentTarget.scrollTop;
        }}
        onBlur={() => window.setTimeout(() => setCaret(null), 120)}
        className={`no-bar relative block max-h-[240px] min-h-[48px] w-full resize-none bg-transparent text-t1 outline-none placeholder:text-t4 field-sizing-content ${type} ${
          chips.length > 0 ? "text-transparent caret-t1" : ""
        }`}
      />
      {open &&
        spot &&
        createPortal(
          <div
            role="listbox"
            className="surface-pop anim-rise fixed z-[118] max-h-[min(340px,50vh)] overflow-y-auto rounded-panel p-1.5"
            style={{ left: spot.left, top: spot.top, bottom: spot.bottom, width: spot.width }}
          >
            <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-t3">
              {at ? "Your elements" : "Camera moves"}
            </div>
            {options.map((option, i) => (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={i === cursor}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(option)}
                onMouseEnter={() => setCursor(i)}
                className={`flex w-full items-center gap-2.5 rounded-card p-1.5 pr-3 text-left text-[13.5px] transition-colors duration-[120ms] ${
                  i === cursor ? "bg-t1 text-canvas" : "text-t2"
                }`}
              >
                {option.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={option.kind === "element" ? mediaSrc(option.thumb) : option.thumb}
                    alt=""
                    className={`h-8 shrink-0 bg-t1/[0.07] object-cover ${option.kind === "element" ? "w-8 rounded-full" : "w-12 rounded-[8px]"}`}
                  />
                ) : (
                  <span className="grid h-8 w-8 shrink-0 place-items-center">
                    <Icon name={option.kind === "element" ? "at" : "move"} size={16} />
                  </span>
                )}
                <span className="truncate">{option.kind === "element" ? `@${option.label}` : option.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
