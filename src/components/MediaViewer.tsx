"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/Icon";
import { VendorBadge } from "@/components/VendorMark";
import { MODELS, getModel, type Field, type ModelDef } from "@/lib/registry";
import { mediaKind } from "@/lib/upload";
import { usePresence } from "@/lib/usePresence";
import { useStudio, type Run } from "@/store/studio";

/** The first input a model takes a picture through, if it takes one at all. */
function imageInput(model: ModelDef): Field | undefined {
  return model.fields.find(
    (f) =>
      f.placement === "input" &&
      f.accept === "image" &&
      (f.kind === "images" || f.kind === "media"),
  );
}

/** Put `url` into that field, adding to a list or replacing a single slot. */
function attach(model: ModelDef, field: Field, url: string) {
  const { setValue } = useStudio.getState();
  if (field.kind !== "images") {
    setValue(field.key, url);
    return;
  }
  const current = useStudio.getState().valuesByModel[model.id]?.[field.key];
  const list = Array.isArray(current) ? current.filter((u) => typeof u === "string") : [];
  if (list.includes(url)) return;
  const room = field.maxItems ?? 10;
  setValue(field.key, [...list, url].slice(-room));
}

/** The pictures a run was given to work from, in the order it got them. */
function inputMedia(run: Run): string[] {
  const model = getModel(run.modelId);
  if (!model) return [];
  const urls: string[] = [];
  for (const field of model.fields) {
    if (field.placement !== "input") continue;
    const value = run.values[field.key];
    if (typeof value === "string") urls.push(value);
    else if (Array.isArray(value)) {
      for (const item of value) if (typeof item === "string") urls.push(item);
    }
  }
  return urls.filter((url) => /^https?:|^data:/.test(url));
}

function when(at: number) {
  return new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * What the run was: its model, the options that shaped it, and when it ran.
 * The options come from the same fields the prompt bar puts on its chips, so
 * a model that offers quality and size lists quality and size here.
 */
function detailsOf(run: Run): Array<{ label: string; value: string }> {
  const rows = [
    { label: "Model", value: run.modelName },
    { label: "Type", value: run.output },
    { label: "Ratio", value: run.ratio.replace(" / ", ":").replace("/", ":") },
  ];
  const model = getModel(run.modelId);
  if (model) {
    if (run.mode) {
      const mode = model.modes?.find((m) => m.id === run.mode);
      if (mode) rows.push({ label: "Mode", value: mode.label });
    }
    for (const field of model.fields) {
      if (field.placement !== "bar" || rows.length >= 7) continue;
      const value = run.values[field.key];
      if (value === undefined || value === null || value === "" || typeof value === "object") continue;
      if (rows.some((row) => row.label === field.label)) continue;
      const choice = field.choices?.find((c) => String(c.value) === String(value));
      rows.push({ label: field.label, value: choice?.label ?? String(value) });
    }
  }
  rows.push({ label: "Created", value: when(run.createdAt) });
  return rows;
}

function Stage({ url }: { url: string }) {
  const kind = mediaKind(url);
  if (kind === "video") {
    return <video src={url} controls autoPlay loop playsInline className="h-full w-full object-contain" />;
  }
  if (kind === "audio") {
    return (
      <div className="flex w-full max-w-[520px] flex-col items-center gap-5">
        <Icon name="audio" size={34} className="text-t3" />
        <audio src={url} controls autoPlay className="w-full" />
      </div>
    );
  }
  // Bare, with no card around it: a frame on a picture this size reads as a
  // border the picture does not have.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-full w-full object-contain" />;
}

function Action({
  icon,
  label,
  onClick,
  href,
  primary,
  danger,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
  danger?: boolean;
}) {
  const className = primary
    ? "cta flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12.5px] font-medium"
    : `flex w-full items-center justify-center gap-2 rounded-full bg-t1/[0.07] px-3 py-2 text-[12px] transition-colors duration-[120ms] ${
        danger ? "hover:bg-[#ff6b6b]/15" : "text-t2 hover:bg-t1/[0.12] hover:text-t1"
      }`;
  const tint = danger ? { color: "var(--danger)" } : undefined;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" download style={tint} className={className}>
        <Icon name={icon} size={13} />
        {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} style={tint} className={className}>
      <Icon name={icon} size={13} />
      {label}
    </button>
  );
}

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-3.5 last:border-b-0">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-t4">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

/**
 * The enlarged view: the media on the stage, and beside it everything the run
 * knows about itself with the things you can do to it. It is where a phone
 * gets its actions, since a tile there has no hover to reveal them.
 */
export function MediaViewer({
  url,
  run,
  upload,
  onClose,
}: {
  url: string | null;
  /** The run behind the media, when it came from one. */
  run?: Run;
  /** An uploaded file instead, which can only be looked at and removed. */
  upload?: { id: string; label: string };
  onClose: () => void;
}) {
  const { mounted, exiting } = usePresence(!!url, 220);
  const [shown, setShown] = useState(url);
  const [copied, setCopied] = useState<"url" | "prompt" | null>(null);
  const [confirming, setConfirming] = useState(false);

  const removeRun = useStudio((s) => s.removeRun);
  const removeUpload = useStudio((s) => s.removeUpload);
  const modelId = useStudio((s) => s.modelId);

  useEffect(() => {
    if (url) setShown(url);
  }, [url]);

  // A fresh preview never opens mid-confirmation.
  useEffect(() => {
    if (url) setConfirming(false);
  }, [url]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const refs = useMemo(() => (run ? inputMedia(run) : []), [run]);
  const details = useMemo(() => (run ? detailsOf(run) : []), [run]);
  const model = run ? getModel(run.modelId) : undefined;
  const active = getModel(modelId);
  const slot = active ? imageInput(active) : undefined;
  const isImage = shown ? mediaKind(shown) === "image" : false;

  // The video model this picture can be handed to: the one the video page was
  // last on when it takes a first frame, or the first one that does.
  const videoModel = useMemo(() => {
    if (!isImage) return undefined;
    const last = useStudio.getState().modelByCategory.video;
    const preferred = last ? getModel(last) : undefined;
    if (preferred && imageInput(preferred)) return preferred;
    return MODELS.find((m) => m.category === "video" && imageInput(m));
  }, [isImage]);

  if (!mounted || !shown || typeof document === "undefined") return null;

  async function copy(text: string, what: "url" | "prompt") {
    await navigator.clipboard?.writeText(text);
    setCopied(what);
    window.setTimeout(() => setCopied(null), 1400);
  }

  function turnToVideo() {
    if (!videoModel || !shown) return;
    const field = imageInput(videoModel);
    if (!field) return;
    useStudio.getState().selectModel(videoModel.id);
    attach(videoModel, field, shown);
    onClose();
  }

  function recreate() {
    if (!run) return;
    const store = useStudio.getState();
    store.selectModel(run.modelId);
    store.setValues({ ...run.values });
    onClose();
  }

  function reference() {
    if (!active || !slot || !shown) return;
    attach(active, slot, shown);
    onClose();
  }

  function remove() {
    if (run) removeRun(run.id);
    else if (upload) removeUpload(upload.id);
    onClose();
  }

  const title = run?.modelName ?? upload?.label ?? "Media";
  const subtitle = run
    ? `${model?.category ?? "run"} · ${run.urls.length > 1 ? `${run.urls.length} outputs` : "1 output"}`
    : "Uploaded";

  return createPortal(
    <div
      data-viewer="media"
      className={`fixed inset-0 z-[110] flex flex-col bg-canvas-deep md:flex-row ${
        exiting ? "anim-fade-out" : "anim-fade"
      }`}
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 md:p-8">
        <button
          type="button"
          className="no-press absolute inset-0 hidden md:block"
          aria-label="Close"
          onClick={onClose}
        />
        <div className={`relative flex h-full w-full flex-col items-center justify-center gap-3 ${exiting ? "" : "anim-zoom"}`}>
          <div className="flex min-h-0 w-full flex-1 items-center justify-center">
            <Stage url={shown} />
          </div>
          {run && run.urls.length > 1 && (
            <div className="no-bar flex shrink-0 gap-1.5 overflow-x-auto pb-0.5">
              {run.urls.map((one) => (
                <button
                  key={one}
                  type="button"
                  onClick={() => setShown(one)}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-chip ring-1 ring-inset transition-all duration-[120ms] ${
                    one === shown ? "ring-t1/70" : "ring-line hover:ring-line-strong"
                  }`}
                >
                  {mediaKind(one) === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={one} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center bg-surface-2">
                      <Icon name={mediaKind(one) === "video" ? "video" : "audio"} size={13} className="text-t3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* The actions never scroll away: on a phone the panel is a third of the
          screen, and Download and Delete are what it is open for. */}
      <aside className="flex h-[46vh] w-full shrink-0 flex-col border-t border-line bg-canvas md:h-auto md:w-[348px] md:border-l md:border-t-0">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          {model ? (
            <VendorBadge vendor={model.vendor} size={30} />
          ) : (
            <span className="grid h-[30px] w-[30px] place-items-center rounded-chip bg-t1/[0.07]">
              <Icon name="upload" size={13} className="text-t3" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-t1">{title}</p>
            <p className="truncate text-[11px] capitalize text-t4">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-t3 transition-colors duration-[120ms] hover:bg-t1/[0.07] hover:text-t1"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
        {run && (run.prompt || refs.length > 0) && (
          <Section
            title="Prompt"
            right={
              run.prompt ? (
                <button
                  type="button"
                  onClick={() => copy(run.prompt, "prompt")}
                  className="flex items-center gap-1.5 rounded-full bg-t1/[0.07] px-2.5 py-1 text-[11px] text-t3 transition-colors duration-[120ms] hover:text-t1"
                >
                  <Icon name={copied === "prompt" ? "check" : "copy"} size={11} />
                  Copy
                </button>
              ) : undefined
            }
          >
            <div className="rounded-card bg-t1/[0.028] p-3">
              {refs.length > 0 && (
                <div className="no-bar mb-2.5 flex gap-1.5 overflow-x-auto">
                  {refs.map((ref) => (
                    <a
                      key={ref}
                      href={ref}
                      target="_blank"
                      rel="noreferrer"
                      title="Open this input"
                      className="h-14 w-14 shrink-0 overflow-hidden rounded-chip ring-1 ring-inset ring-line transition-transform duration-[120ms] hover:scale-105"
                    >
                      {mediaKind(ref) === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ref} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center bg-surface-2">
                          <Icon name={mediaKind(ref) === "video" ? "video" : "audio"} size={14} className="text-t3" />
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              )}
              <p className="text-[12.5px] leading-relaxed text-t2">
                {run.prompt || <span className="text-t4">No prompt — this run worked from its inputs.</span>}
              </p>
            </div>
          </Section>
        )}

        {details.length > 0 && (
          <Section title="Details">
            <dl className="flex flex-col gap-1.5">
              {details.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-[12px] text-t4">{row.label}</dt>
                  <dd className="truncate text-right text-[12px] text-t2">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-line p-4">
          {videoModel && (
            <Action icon="video" label={`Turn to video · ${videoModel.name}`} primary onClick={turnToVideo} />
          )}
          <div className="flex gap-2">
            {run && <Action icon="refresh" label="Recreate" onClick={recreate} />}
            {slot && isImage && <Action icon="layers" label="Reference" onClick={reference} />}
          </div>
          {confirming ? (
            // Asked before it happens: a gallery is the only copy of what it
            // holds, and a tap on a phone is easy to make by accident.
            <div className="flex items-center gap-2 rounded-card bg-[#ff6b6b]/10 p-2 pl-3">
              <p className="flex-1 text-[12px]" style={{ color: "var(--danger)" }}>Delete this?</p>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full px-3 py-1.5 text-[12px] text-t3 transition-colors duration-[120ms] hover:text-t1"
              >
                No
              </button>
              <button
                type="button"
                onClick={remove}
                className="rounded-full bg-[#ff6b6b]/80 px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors duration-[120ms] hover:bg-[#ff6b6b]"
              >
                Yes, delete
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Action icon="download" label="Download" href={shown} />
              <Action
                icon={copied === "url" ? "check" : "copy"}
                label={copied === "url" ? "Copied" : "Copy URL"}
                onClick={() => copy(shown, "url")}
              />
              {(run || upload) && (
                <Action icon="trash" label="Delete" danger onClick={() => setConfirming(true)} />
              )}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

/**
 * A plain zoom, for places that already have their own actions around the
 * media — the picker's thumbnails. No panel, no frame: just the file, big.
 */
export function MediaPreview({
  url,
  onClose,
  z = 130,
}: {
  url: string | null;
  onClose: () => void;
  z?: number;
}) {
  const { mounted, exiting } = usePresence(!!url, 220);
  const [shown, setShown] = useState(url);

  useEffect(() => {
    if (url) setShown(url);
  }, [url]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted || !shown || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center bg-canvas-deep/95 p-4 backdrop-blur-xl md:p-10 ${
        exiting ? "anim-fade-out" : "anim-fade"
      }`}
      style={{ zIndex: z }}
    >
      <button type="button" className="no-press absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className={`relative flex h-full w-full items-center justify-center ${exiting ? "" : "anim-zoom"}`}>
        <Stage url={shown} />
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors duration-[120ms] hover:bg-white/20"
        aria-label="Close"
      >
        <Icon name="close" size={17} />
      </button>
    </div>,
    document.body,
  );
}
