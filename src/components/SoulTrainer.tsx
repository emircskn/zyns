"use client";

import { useEffect, useRef, useState } from "react";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";
import { Icon } from "@/components/Icon";
import { SOUL_MODELS, elementName, type LibraryElement } from "@/lib/elements";
import { createSoul, uploadFile } from "@/lib/higgsfield/transport";
import type { SoulVersion } from "@/lib/higgsfield/client";
import { makeMediaRef } from "@/lib/media";
import { mediaSrc, thumbSrc } from "@/lib/storage/client";
import { usePresence } from "@/lib/usePresence";
import { useStudio } from "@/store/studio";

/** Higgsfield takes up to a hundred; its own page stops at eighty. */
const MAX_PHOTOS = 80;

/** How a count or a size reads against what Higgsfield asks for (20+ photos, sharp ones). */
type Grade = "Bad" | "Fair" | "Good";
const countGrade = (n: number): Grade => (n >= 20 ? "Good" : n >= 10 ? "Fair" : "Bad");
const sizeGrade = (px: number): Grade => (px >= 1024 ? "Good" : px >= 512 ? "Fair" : "Bad");
const GRADE_TONE: Record<Grade, string> = {
  Bad: "bg-[#7a1f1f] text-[#ffb4b4]",
  Fair: "bg-[#6b5310] text-[#ffe08a]",
  Good: "bg-[#1f5a2c] text-[#a8f0b8]",
};

/** The short side of a picture, in pixels, once it has loaded. */
function shortSide(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(Math.min(img.naturalWidth, img.naturalHeight));
    img.onerror = () => resolve(0);
    img.src = mediaSrc(url);
  });
}

/**
 * Training a Soul ID: Higgsfield's own character for one Soul model, made
 * from many photos of one person. It lands among the library's characters,
 * on the Soul ID side, and is picked from that Soul model alone.
 */
export function SoulTrainer() {
  const trainer = useStudio((s) => s.soulTrainer);
  const close = useStudio((s) => s.openSoulTrainer);
  const { mounted, exiting } = usePresence(!!trainer, 240);
  const [shown, setShown] = useState(trainer);
  useEffect(() => {
    if (trainer) setShown(trainer);
  }, [trainer]);
  if (!mounted || !shown) return null;
  return <TrainerSheet start={shown.version} exiting={exiting} onClose={() => close(null)} />;
}

function TrainerSheet({ start, exiting, onClose }: { start?: SoulVersion; exiting: boolean; onClose: () => void }) {
  const elements = useStudio((s) => s.elements);
  const hfKey = useStudio((s) => s.hfKey);
  const saveElement = useStudio((s) => s.saveElement);
  const sheetRef = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const swipe = useSwipeDismiss(sheetRef, onClose);
  // Straight to Higgsfield, which trains from them: not kept among the uploads.
  const [uploading, setUploading] = useState(0);

  const [photos, setPhotos] = useState<string[]>([]);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [version, setVersion] = useState<SoulVersion>(start ?? "cinema");
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !step) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  // Each photo measured once, for the quality line.
  useEffect(() => {
    for (const url of photos) {
      if (sizes[url] !== undefined) continue;
      void shortSide(url).then((px) => setSizes((all) => ({ ...all, [url]: px })));
    }
  }, [photos, sizes]);

  async function add(files: File[]) {
    const pictures = files.filter((f) => f.type.startsWith("image/")).slice(0, MAX_PHOTOS - photos.length);
    if (pictures.length === 0) return;
    if (!hfKey) return setProblem("Add your Higgsfield key first.");
    setProblem(null);
    setUploading((n) => n + pictures.length);
    await Promise.all(
      pictures.map(async (file) => {
        try {
          const url = await uploadFile(hfKey, file);
          setPhotos((all) => (all.includes(url) ? all : [...all, url].slice(0, MAX_PHOTOS)));
        } catch (error) {
          setProblem(error instanceof Error ? error.message : "A photo could not be sent.");
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
  }

  const slug = elementName(name);
  const taken = elements.some((e) => e.name === slug);
  const measured = photos.map((u) => sizes[u]).filter((px): px is number => px !== undefined && px > 0);
  // The smallest photo sets the bar, as Higgsfield's own count does.
  const quality = measured.length > 0 ? Math.min(...measured) : 0;
  const label = SOUL_MODELS.find((m) => m.version === version)?.label ?? "Soul";

  async function create() {
    if (!hfKey) return setProblem("Add your Higgsfield key first.");
    if (!slug) return setProblem("Give the character a name to call it by.");
    if (taken) return setProblem(`@${slug} is already an element.`);
    if (photos.length === 0) return setProblem("Add photos of the person.");
    setProblem(null);
    try {
      setStep("Starting training");
      const soul = await createSoul(hfKey, slug, version, photos);
      const cover = await makeMediaRef(photos[0], "image").catch(() => null);
      const element: LibraryElement = {
        id: crypto.randomUUID(),
        kind: "character",
        name: slug,
        images: cover ? [cover] : [],
        status: "ready",
        soul: { id: soul.id, version: soul.version, state: soul.state, error: soul.error },
        createdAt: Date.now(),
      };
      saveElement(element);
      onClose();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The character could not be started. Try again.");
    } finally {
      setStep(null);
    }
  }

  const field = "w-full rounded-chip bg-t1/[0.05] px-3.5 py-2.5 text-[15px] text-t1 outline-none ring-1 ring-inset ring-transparent placeholder:text-t4 focus:ring-line-strong md:text-[14px]";
  const badge = (grade: Grade) => <span className={`rounded-chip px-2 py-0.5 text-[11.5px] font-medium ${GRADE_TONE[grade]}`}>{grade}</span>;

  return (
    <div className="fixed inset-0 z-[119] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={() => !step && onClose()}
        className={`absolute inset-0 bg-canvas-deep/75 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-label="New Soul ID character"
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-panel border border-line bg-elevated sm:max-w-[520px] sm:rounded-panel ${
          exiting ? "anim-sheet-out" : "anim-sheet"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <span aria-hidden className="mx-auto -mb-2 mt-2 block h-1 w-9 shrink-0 rounded-full bg-t1/20 sm:hidden" />
        <header {...swipe} className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[17px] text-t1">New Soul ID character</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!!step}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-t1/[0.05] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
          >
            <Icon name="close" size={17} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(event) => {
              void add(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <p className="mb-1.5 text-[12px] font-medium text-t3">
            Photos <span className="font-normal text-t4">· up to {MAX_PHOTOS}</span>
          </p>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void add(Array.from(event.dataTransfer.files));
            }}
            className={`mb-3 grid grid-cols-4 gap-2 rounded-card p-1 transition-colors duration-[120ms] sm:grid-cols-5 ${
              dragging ? "bg-t1/[0.06] ring-1 ring-inset ring-line-strong" : ""
            }`}
          >
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => input.current?.click()}
                aria-label="Add photos"
                className="grid aspect-square place-items-center rounded-chip bg-t1/[0.06] ring-1 ring-inset ring-edge text-t3 transition-colors duration-[120ms] hover:text-t1"
              >
                {uploading > 0 ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Icon name="plus" size={20} />
                )}
              </button>
            )}
            {photos.map((url) => (
              <div key={url} className="relative aspect-square overflow-hidden rounded-chip bg-t1/[0.05] ring-1 ring-inset ring-edge">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbSrc(url, 256)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((all) => all.filter((u) => u !== url))}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            ))}
          </div>

          {photos.length > 0 && (
            <div className="mb-5 divide-y divide-line rounded-card bg-t1/[0.05]">
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px] text-t2">
                <span>Number of photos</span>
                <span className="flex items-center gap-2 text-t1">
                  {photos.length}/{MAX_PHOTOS} {badge(countGrade(photos.length))}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px] text-t2">
                <span>Quality</span>
                <span className="flex items-center gap-2 text-t1">
                  {quality > 0 ? `${quality}px` : "…"} {quality > 0 && badge(sizeGrade(quality))}
                </span>
              </div>
            </div>
          )}

          <label className="mb-1.5 block text-[12px] font-medium text-t3" htmlFor="soul-name">
            Name
          </label>
          <div className="relative mb-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-t4 md:text-[14px]">@</span>
            <input id="soul-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="emir" className={`${field} pl-7`} />
          </div>
          <p className="mb-4 min-h-[18px] text-[12px] text-t4">
            {taken ? `@${slug} is taken` : slug && slug !== name.trim().replace(/^@/, "") ? `Called as @${slug}` : ""}
          </p>

          <p className="mb-1.5 text-[12px] font-medium text-t3">
            Model <span className="font-normal text-t4">· the character works in this model only</span>
          </p>
          <div className="mb-5 grid grid-cols-3 gap-1.5">
            {SOUL_MODELS.map((m) => (
              <button
                key={m.version}
                type="button"
                onClick={() => setVersion(m.version)}
                aria-pressed={version === m.version}
                className={`rounded-chip px-2 py-2 text-[13px] transition-colors duration-[120ms] ${
                  version === m.version ? "bg-t1/[0.1] text-t1 ring-1 ring-inset ring-line-strong" : "bg-t1/[0.05] text-t2 hover:text-t1"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 rounded-card bg-t1/[0.05] px-3.5 py-3 text-[12.5px] leading-relaxed text-t2">
            <p className="flex gap-2">
              <Icon name="check" size={14} className="mt-0.5 shrink-0 text-[#7ee08f]" />
              20+ photos: one person, clear face, many angles.
            </p>
            <p className="flex gap-2">
              <Icon name="close" size={14} className="mt-0.5 shrink-0 text-[#ff8f8f]" />
              Avoid duplicates, group shots, filters, masks or sunglasses, and character sheets with several poses in one picture.
            </p>
          </div>
        </div>

        <footer className="border-t border-line px-5 py-4">
          {problem && <p className="mb-2 text-[12.5px] text-[#ff8f8f]">{problem}</p>}
          <button
            type="button"
            onClick={() => void create()}
            disabled={!!step || uploading > 0}
            className="cta flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-medium disabled:opacity-60"
          >
            {step ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {step}
              </>
            ) : (
              `Train for ${label}`
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
