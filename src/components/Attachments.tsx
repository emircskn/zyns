"use client";

import { useState } from "react";
import { MediaThumb } from "@/components/controls";
import { Icon } from "@/components/Icon";
import { MediaPicker } from "@/components/MediaPicker";
import { attachMedia, kindOf, roomIn, urlsIn, type MediaKind } from "@/lib/attach";
import type { Field } from "@/lib/registry";
import { useStudio, useValues } from "@/store/studio";

/**
 * The bar's one way to add media: a picker over everything the model's file
 * fields still take, whose picks are filed by kind (see attachMedia). Opened
 * from the "+" chip or the add tile at the end of the attached row.
 */
export function useAttach(fields: Field[]) {
  const values = useValues();
  const [open, setOpen] = useState(false);
  const withRoom = fields.filter((f) => roomIn(f, values[f.key]) > 0);
  const kinds = [...new Set(withRoom.map(kindOf))];
  const taken = fields.flatMap((f) => urlsIn(f, values[f.key]));
  // The first field that still needs something, to name on the chip.
  const needed = fields.find((f) => f.required && urlsIn(f, values[f.key]).length === 0);

  const picker = (
    <MediaPicker
      open={open}
      accept={kinds.length ? kinds : ["image"]}
      multiple
      taken={taken}
      onPick={(urls, picked) => {
        attachMedia(urls.map((url, i) => ({ url, kind: picked[i] as MediaKind })));
      }}
      onClose={() => setOpen(false)}
    />
  );

  return { canAdd: kinds.length > 0, needed, open: () => setOpen(true), picker };
}

/** What is attached, as thumbs over the prompt, each named by its slot when there are several. */
export function AttachRow({ fields, onAdd, canAdd }: { fields: Field[]; onAdd: () => void; canAdd: boolean }) {
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const items = fields.flatMap((field) =>
    urlsIn(field, values[field.key]).map((url, index) => ({ field, url, index })),
  );
  if (items.length === 0) return null;
  const named = fields.length > 1;

  return (
    <div className="anim-swap no-bar -mx-1 mb-2 flex items-start gap-2 overflow-x-auto px-1 pb-1 pt-0.5">
      {/* First, so it is in reach however many are attached: at the end it
          went off the edge, and adding another meant scrolling to it. */}
      {canAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add media"
          className="grid h-14 w-14 shrink-0 place-items-center rounded-chip bg-t1/[0.05] text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.09] hover:text-t1"
        >
          <Icon name="plus" size={17} />
        </button>
      )}
      {items.map(({ field, url, index }) => (
        <div key={`${field.key}-${url}-${index}`} className="w-14 shrink-0">
          <MediaThumb
            url={url}
            onRemove={() =>
              setValue(
                field.key,
                field.kind === "images" ? urlsIn(field, values[field.key]).filter((_, i) => i !== index) : undefined,
              )
            }
          />
          {named && <p className="mt-1 truncate text-center text-[10.5px] leading-tight text-t4">{field.label}</p>}
        </div>
      ))}
    </div>
  );
}

/**
 * The "+" at the head of the chip row. While the model still needs a file
 * before it can run (an upscaler's picture), it says which.
 */
export function AddChip({ onClick, needed }: { onClick: () => void; needed?: Field }) {
  if (needed) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-t1/[0.07] pl-2.5 pr-3 text-[13px] text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.12] md:h-[34px]"
      >
        <Icon name="plus" size={16} />
        Add {needed.label.toLowerCase()}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add media"
      title="Add images, clips or audio"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-t1/[0.07] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1 md:h-[34px] md:w-[34px]"
    >
      <Icon name="plus" size={17} />
    </button>
  );
}

const KIND_WORD: Record<MediaKind, string> = { image: "images", video: "video", audio: "audio" };

/**
 * The phone composer's one upload area: a wide dashed box while nothing is
 * attached, and the attached media as large thumbs once something is, named
 * by slot when the model has several. Several boxes, one per slot, crowded
 * the prompt off a small screen.
 */
export function AttachPanel({ fields }: { fields: Field[] }) {
  const values = useValues();
  const setValue = useStudio((s) => s.setValue);
  const attach = useAttach(fields);
  if (fields.length === 0) return null;
  const items = fields.flatMap((field) =>
    urlsIn(field, values[field.key]).map((url, index) => ({ field, url, index })),
  );
  const kinds = [...new Set(fields.map(kindOf))];
  const only = fields.length === 1 ? fields[0] : undefined;
  const words = kinds.map((k) => KIND_WORD[k]);
  const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} or ${words[words.length - 1]}` : words[0];
  const label = only ? only.label : `Add ${list}`;
  const most = only?.kind === "images" && only.maxItems ? ` (up to ${only.maxItems})` : "";

  return (
    <>
      {items.length === 0 ? (
        <button
          type="button"
          onClick={attach.open}
          className="flex w-full flex-col items-center justify-center gap-2.5 rounded-panel border-[1.5px] border-dashed border-line-strong bg-t1/[0.02] px-3 py-5 text-center transition-colors duration-[150ms] active:bg-t1/[0.05]"
        >
          <span className="flex items-center gap-1.5">
            {kinds.map((kind) => (
              <span key={kind} className="grid h-10 w-10 place-items-center rounded-full bg-t1/[0.08] text-t2">
                <Icon name={kind === "image" ? "image" : kind === "video" ? "video" : "audio"} size={18} />
              </span>
            ))}
          </span>
          <span className="text-[14px] text-t3">
            {label}
            {most && <span className="text-t4">{most}</span>}
            {!fields.some((f) => f.required) && <span className="text-t4"> · optional</span>}
          </span>
        </button>
      ) : (
        <div className="no-bar flex gap-2.5 overflow-x-auto rounded-panel border border-line bg-elevated p-3">
          {/* First, so another can be added without scrolling to the end. */}
          {attach.canAdd && (
            <button
              type="button"
              onClick={attach.open}
              aria-label="Add media"
              className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-[20px] border-[1.5px] border-dashed border-line-strong bg-t1/[0.02] transition-colors duration-[150ms] active:bg-t1/[0.06]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-t1/[0.1] text-t1">
                <Icon name="plus" size={20} />
              </span>
            </button>
          )}
          {items.map(({ field, url, index }) => (
            <div key={`${field.key}-${url}-${index}`} className="w-[88px] shrink-0">
              <MediaThumb
                url={url}
                roomy
                onRemove={() =>
                  setValue(
                    field.key,
                    field.kind === "images" ? urlsIn(field, values[field.key]).filter((_, i) => i !== index) : undefined,
                  )
                }
              />
              {fields.length > 1 && (
                <p className="mt-1 truncate text-center text-[11.5px] leading-tight text-t4">{field.label}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {attach.picker}
    </>
  );
}
