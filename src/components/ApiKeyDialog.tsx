"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { refreshCredits } from "@/lib/generate";
import { getCredits, isDirect } from "@/lib/kie/transport";
import { usePresence } from "@/lib/usePresence";
import { useStudio } from "@/store/studio";

export function ApiKeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const apiKey = useStudio((s) => s.apiKey);
  const setApiKey = useStudio((s) => s.setApiKey);
  const [draft, setDraft] = useState(apiKey);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mounted, exiting } = usePresence(open, 200);

  useEffect(() => {
    if (open) {
      setDraft(apiKey);
      setError(null);
    }
  }, [open, apiKey]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  async function save() {
    const key = draft.trim();
    if (!key) {
      setApiKey("");
      onClose();
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const credits = await getCredits(key);
      setApiKey(key);
      if (credits !== null) useStudio.getState().setCredits(credits);
      void refreshCredits();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach KIE.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-canvas-deep/75 backdrop-blur-md ${exiting ? "anim-fade-out" : "anim-fade"}`}
      />
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-panel border border-line bg-elevated ${
          exiting ? "anim-pop-out" : "anim-pop"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="pending-surface h-1 w-full" />
        <div className="p-6">
          <span className="mb-5 grid h-10 w-10 place-items-center rounded-chip bg-t1/[0.07] text-t1">
            <Icon name="key" size={18} />
          </span>
          <h2 className="mb-2 text-[17px] text-t1">Your KIE API key</h2>
          <p className="mb-5 text-[12.5px] leading-relaxed text-t3">
            {isDirect()
              ? "The key is kept in this browser and sent straight to api.kie.ai with each request. There is no server in between."
              : "The key is kept in this browser and sent with each request through this app's own proxy route. It is never stored on the server."}{" "}
            Get one at{" "}
            <a
              href="https://kie.ai/api-key"
              target="_blank"
              rel="noreferrer"
              className="text-t1 underline decoration-line-strong underline-offset-[3px] transition-colors hover:decoration-t1"
            >
              kie.ai/api-key
            </a>
            .
          </p>

          <input
            type="password"
            value={draft}
            autoFocus
            spellCheck={false}
            placeholder="sk-…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void save();
            }}
            className="mb-3 w-full rounded-chip bg-t1/[0.055] px-4 py-3 font-mono text-[13px] text-t1 outline-none ring-1 ring-inset ring-transparent transition-all duration-[120ms] placeholder:text-t4 focus:bg-t1/[0.08] focus:ring-line-strong"
          />

          {error && (
            <p className="anim-swap mb-3 flex items-start gap-1.5 text-[12px] text-[#ff8f8f]">
              <Icon name="alert" size={15} className="mt-px shrink-0" />
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-1.5">
            {apiKey && (
              <button
                type="button"
                onClick={() => {
                  setApiKey("");
                  setDraft("");
                  onClose();
                }}
                className="rounded-full bg-t1/[0.07] px-4 py-2 text-[12.5px] text-t2 transition-colors duration-[120ms] hover:bg-t1/[0.12] hover:text-t1"
              >
                Remove key
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={checking}
              className="cta flex items-center gap-2 rounded-full px-5 py-2 text-[12.5px] hover:scale-[1.03] disabled:opacity-50"
            >
              {checking && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
              )}
              {checking ? "Verifying" : "Save key"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
