"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ProviderSwitch } from "@/components/ProviderSwitch";
import { refreshCredits } from "@/lib/generate";
import { getCredits, isDirect as kieDirect } from "@/lib/kie/transport";
import { isDirect as hfDirect, verifyKey } from "@/lib/higgsfield/transport";
import { useStudio } from "@/store/studio";
import { usePresence } from "@/lib/usePresence";

const INPUT =
  "w-full rounded-chip bg-t1/[0.055] px-4 py-3 font-mono text-[13px] text-t1 outline-none ring-1 ring-inset ring-transparent transition-all duration-[120ms] placeholder:text-t4 focus:bg-t1/[0.08] focus:ring-line-strong";

const LINK =
  "text-t1 underline decoration-line-strong underline-offset-[3px] transition-colors hover:decoration-t1";

/**
 * The keys, one per service, with the service in use chosen at the top.
 * KIE takes a single key; Higgsfield's comes in two parts, an ID and a
 * secret, kept together as "ID:secret".
 */
export function ApiKeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const provider = useStudio((s) => s.provider);
  const apiKey = useStudio((s) => s.apiKey);
  const hfKey = useStudio((s) => s.hfKey);
  const setApiKey = useStudio((s) => s.setApiKey);
  const setHfKey = useStudio((s) => s.setHfKey);
  const [draft, setDraft] = useState(apiKey);
  const [id, setId] = useState("");
  const [secret, setSecret] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mounted, exiting } = usePresence(open, 200);
  const higgsfield = provider === "higgsfield";
  const saved = higgsfield ? hfKey : apiKey;

  useEffect(() => {
    if (!open) return;
    setDraft(apiKey);
    const [savedId, ...rest] = hfKey.split(":");
    setId(savedId ?? "");
    setSecret(rest.join(":"));
    setError(null);
  }, [open, apiKey, hfKey]);

  // A switch of service is a fresh form: the other one's error means nothing here.
  useEffect(() => setError(null), [provider]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  /** Console hands out "KEY_ID:KEY_SECRET" in one go; accept it pasted whole. */
  function onIdChange(value: string) {
    const at = value.indexOf(":");
    if (at > 0 && !secret) {
      setId(value.slice(0, at).trim());
      setSecret(value.slice(at + 1).trim());
    } else {
      setId(value);
    }
  }

  async function saveKie() {
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

  async function saveHiggsfield() {
    const keyId = id.trim();
    const keySecret = secret.trim();
    if (!keyId && !keySecret) {
      setHfKey("");
      onClose();
      return;
    }
    if (!keySecret) {
      // Console lists a key by its ID (a UUID) and shows the secret only once,
      // when the key is created; people often have the first and not the second.
      setError(
        "A Higgsfield key has two parts. The ID is the UUID Console lists; the secret is shown only once, when the key is created. If you didn't copy it, create a new key.",
      );
      return;
    }
    if (!keyId) {
      setError("Add the key ID as well: the UUID Console lists next to the key.");
      return;
    }
    const key = `${keyId}:${keySecret}`;
    setChecking(true);
    setError(null);
    try {
      await verifyKey(key);
      setHfKey(key);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach Higgsfield.");
    } finally {
      setChecking(false);
    }
  }

  const save = () => void (higgsfield ? saveHiggsfield() : saveKie());
  const onEnter = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") save();
  };

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
          <h2 className="mb-3 text-[17px] text-t1">Make with</h2>
          <div className="mb-5">
            <ProviderSwitch size="lg" />
          </div>

          <h3 className="mb-2 text-[14px] text-t1">Your {higgsfield ? "Higgsfield" : "KIE"} API key</h3>
          {higgsfield ? (
            <p className="mb-5 text-[12.5px] leading-relaxed text-t3">
              {hfDirect()
                ? "The key is kept in this browser and sent straight to api.higgsfield.ai with each request. There is no server in between."
                : "The key is kept in this browser and sent with each request through this app's proxy, which passes it to Higgsfield and never stores or logs it."}{" "}
              Create one in{" "}
              <a href="https://console.higgsfield.ai" target="_blank" rel="noreferrer" className={LINK}>
                Higgsfield Console
              </a>
              .
            </p>
          ) : (
            <p className="mb-5 text-[12.5px] leading-relaxed text-t3">
              {kieDirect()
                ? "The key is kept in this browser and sent straight to api.kie.ai with each request. There is no server in between."
                : "The key is kept in this browser and sent with each request through this app's own proxy route. It is never stored on the server."}{" "}
              Get one at{" "}
              <a href="https://kie.ai/api-key" target="_blank" rel="noreferrer" className={LINK}>
                kie.ai/api-key
              </a>
              .
            </p>
          )}

          {higgsfield ? (
            <>
              <label className="mb-1.5 block text-[11.5px] text-t4" htmlFor="hf-key-id">
                Key ID
              </label>
              <input
                id="hf-key-id"
                type="text"
                value={id}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                placeholder="UUID, or paste ID:secret"
                onChange={(event) => onIdChange(event.target.value)}
                onKeyDown={onEnter}
                className={`mb-3 ${INPUT}`}
              />
              <label className="mb-1.5 block text-[11.5px] text-t4" htmlFor="hf-key-secret">
                Secret
              </label>
              <input
                id="hf-key-secret"
                type="password"
                value={secret}
                spellCheck={false}
                autoComplete="off"
                placeholder="Shown once when you create the key"
                onChange={(event) => setSecret(event.target.value)}
                onKeyDown={onEnter}
                className={`mb-3 ${INPUT}`}
              />
            </>
          ) : (
            <input
              type="password"
              value={draft}
              autoFocus
              spellCheck={false}
              placeholder="sk-…"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onEnter}
              className={`mb-3 ${INPUT}`}
            />
          )}

          {error && (
            <p className="anim-swap mb-3 flex items-start gap-1.5 text-[12px] text-[#ff8f8f]">
              <Icon name="alert" size={15} className="mt-px shrink-0" />
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-1.5">
            {saved && (
              <button
                type="button"
                onClick={() => {
                  if (higgsfield) {
                    setHfKey("");
                    setId("");
                    setSecret("");
                  } else {
                    setApiKey("");
                    setDraft("");
                  }
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
