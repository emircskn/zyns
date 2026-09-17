"use client";

import { useMemo, useState } from "react";
import { Control } from "@/components/controls";
import { Icon } from "@/components/Icon";
import { activeFields } from "@/lib/registry";
import { useModel, useStudio, useValues } from "@/store/studio";

/** Controls that already print their own help text under the widget. */
const SELF_DESCRIBING = new Set(["media", "images", "shots", "elements", "clips"]);

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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-[min(400px,92vw)] flex-col border-l border-white/8 bg-ink-900 transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-semibold text-white">{model.name}</h2>
            <p className="truncate text-[11.5px] text-ink-400">Advanced settings</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetValues}
              title="Reset to defaults"
              className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-white/8 hover:text-white"
            >
              <Icon name="refresh" size={15} />
            </button>
            <button
              type="button"
              onClick={() => toggleSettings(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-white/8 hover:text-white"
              aria-label="Close"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {groups.length === 0 && (
            <p className="text-[12.5px] text-ink-400">
              This model exposes everything it supports in the prompt bar.
            </p>
          )}

          {groups.map(([group, fields]) => (
            <section key={group} className="mb-6 last:mb-0">
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                {group}
              </h3>
              <div className="flex flex-col gap-4">
                {fields.map((field) => (
                  <div key={field.key}>
                    {field.kind !== "toggle" && field.kind !== "slider" && (
                      <label className="mb-1.5 block text-[12.5px] font-medium text-ink-200">
                        {field.label}
                      </label>
                    )}
                    <Control
                      field={field}
                      value={values[field.key]}
                      values={values}
                      onChange={(value) => setValue(field.key, value)}
                    />
                    {field.help && !SELF_DESCRIBING.has(field.kind) && (
                      <p className="mt-1.5 text-[11px] leading-snug text-ink-400">{field.help}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="mt-6 border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={() => setShowPayload((v) => !v)}
              className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-400 hover:text-white"
            >
              Request preview
              <Icon
                name="chevron"
                size={14}
                className={`transition-transform ${showPayload ? "rotate-180" : ""}`}
              />
            </button>
            {showPayload && (
              <pre className="mt-2.5 max-h-72 overflow-auto rounded-xl bg-black/40 p-3 text-[11px] leading-relaxed text-ink-200 ring-1 ring-inset ring-white/8">
                {payload}
              </pre>
            )}
          </section>
        </div>

        {model.docs && (
          <footer className="border-t border-white/8 px-4 py-3">
            <a
              href={model.docs}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-white"
            >
              <Icon name="link" size={14} /> KIE documentation
            </a>
          </footer>
        )}
      </aside>
    </>
  );
}
