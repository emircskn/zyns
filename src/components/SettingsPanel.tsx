"use client";

import { useMemo, useState } from "react";
import { Control } from "@/components/controls";
import { Icon } from "@/components/Icon";
import { activeFields } from "@/lib/registry";
import { useModel, useStudio, useValues } from "@/store/studio";

/** Controls that already print their own help text under the widget. */
const SELF_DESCRIBING = new Set(["media", "images", "shots", "elements", "clips", "records", "list"]);

export function SettingsPanel() {
  const open = useStudio((s) => s.settingsOpen);
  const toggleSettings = useStudio((s) => s.toggleSettings);
  const resetValues = useStudio((s) => s.resetValues);
  const setValue = useStudio((s) => s.setValue);
  const model = useModel();
  const values = useValues();
  const [showPayload, setShowPayload] = useState(false);

  const groups = useMemo(() => {
    if (!model) return [];
    const fields = activeFields(model, values).filter((f) => f.placement === "panel");
    const map = new Map<string, typeof fields>();
    for (const field of fields) {
      const key = field.group ?? "Options";
      map.set(key, [...(map.get(key) ?? []), field]);
    }
    return [...map.entries()];
  }, [model, values]);

  const payload = useMemo(() => {
    if (!model) return "";
    try {
      const built = model.build(values);
      return JSON.stringify({ endpoint: built.endpoint, body: built.payload }, null, 2);
    } catch (error) {
      return `// Could not build the request yet\n// ${error instanceof Error ? error.message : error}`;
    }
  }, [model, values]);

  if (!model) return null;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close settings"
          onClick={() => toggleSettings(false)}
          className="anim-fade fixed inset-0 z-40 bg-canvas-deep/55 backdrop-blur-[3px]"
        />
      )}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-[min(400px,92vw)] flex-col border-l border-line bg-elevated"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform var(--d-slow) var(--ease)",
        }}
      >
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[14px] text-t1">{model.name}</h2>
            <p className="truncate text-[11.5px] text-t4">Advanced settings</p>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={resetValues}
              title="Reset to defaults"
              className="grid h-8 w-8 place-items-center rounded-full bg-t1/[0.07] text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.12]"
            >
              <Icon name="refresh" size={14} />
            </button>
            <button
              type="button"
              onClick={() => toggleSettings(false)}
              className="grid h-8 w-8 place-items-center rounded-full bg-t1/[0.07] text-t1 transition-colors duration-[120ms] hover:bg-t1/[0.12]"
              aria-label="Close"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          {groups.length === 0 && (
            <p className="text-[12.5px] leading-relaxed text-t4">
              This model exposes everything it supports in the prompt bar.
            </p>
          )}

          {groups.map(([group, fields], groupIndex) => (
            <section
              key={group}
              className="anim-swap mb-7 last:mb-0"
              style={{ animationDelay: `${groupIndex * 40}ms` }}
            >
              <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.1em] text-t4">
                {group}
              </h3>
              <div className="flex flex-col gap-5">
                {fields.map((field) => (
                  <div key={field.key}>
                    {field.kind !== "toggle" && field.kind !== "slider" && (
                      <label className="mb-2 block text-[12.5px] text-t2">{field.label}</label>
                    )}
                    <Control
                      field={field}
                      value={values[field.key]}
                      values={values}
                      onChange={(value) => setValue(field.key, value)}
                    />
                    {field.help && !SELF_DESCRIBING.has(field.kind) && (
                      <p className="mt-2 text-[11px] leading-snug text-t4">{field.help}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="mt-7 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setShowPayload((v) => !v)}
              className="flex w-full items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-t4 transition-colors hover:text-t1"
            >
              Request preview
              <Icon
                name="chevron"
                size={13}
                className="transition-transform duration-[200ms]"
                style={{ transform: showPayload ? "rotate(180deg)" : "none" }}
              />
            </button>
            {showPayload && (
              <pre className="anim-swap mt-3 max-h-72 overflow-auto rounded-card bg-canvas/60 p-3 font-mono text-[11px] leading-relaxed text-t2 ring-1 ring-inset ring-line">
                {payload}
              </pre>
            )}
          </section>
        </div>

        {model.docs && (
          <footer className="border-t border-line px-4 py-3">
            <a
              href={model.docs}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[12px] text-t4 transition-colors hover:text-t1"
            >
              <Icon name="link" size={13} /> KIE documentation
            </a>
          </footer>
        )}
      </aside>
    </>
  );
}
