"use client";

import { useEffect, useState } from "react";
import { getEstimate } from "@/lib/higgsfield/transport";
import { resolveAutoRatioNow } from "@/lib/autoRatio";
import type { ModelDef, Values } from "@/lib/registry";
import { useStudio } from "@/store/studio";

/** Answers had or on the way, by endpoint and payload: settings flip back and forth. */
const cache = new Map<string, Promise<string | null>>();

function format(credits: number | null): string | null {
  if (credits === null) return null;
  const n = credits >= 10 ? Math.round(credits) : Math.round(credits * 10) / 10;
  return `${n.toLocaleString("en-US")} cr`;
}

/**
 * What the run as set up would cost, from Higgsfield's estimate endpoint.
 * Asked only once the values would pass validation, a moment after the last
 * change, and never without a key. Null while unknown. KIE models are priced
 * from KIE's own list instead; pass none here for them.
 */
export function useEstimate(model: ModelDef | undefined, values: Values, blocker: string | null): string | null {
  const apiKey = useStudio((s) => s.hfKey);
  const [hint, setHint] = useState<string | null>(null);

  let request: { endpoint: string; payload: Record<string, unknown> } | null = null;
  if (model && apiKey && !blocker) {
    try {
      request = model.build(resolveAutoRatioNow(model, values));
    } catch {
      request = null;
    }
  }
  const signature = request ? `${request.endpoint} ${JSON.stringify(request.payload)}` : "";

  useEffect(() => {
    if (!signature || !request) {
      setHint(null);
      return;
    }
    let live = true;
    const { endpoint, payload } = request;
    const ask = () => {
      let pending = cache.get(signature);
      if (!pending) {
        pending = getEstimate(apiKey, endpoint, payload).then(
          (estimate) => format(estimate.credits),
          () => {
            // An estimate is a courtesy: a refusal never blocks the run, and
            // submitting surfaces the real reason. Forget it so it's asked again.
            cache.delete(signature);
            return null;
          },
        );
        cache.set(signature, pending);
      }
      void pending.then((text) => live && setHint(text));
    };
    const timer = cache.has(signature) ? (ask(), undefined) : setTimeout(ask, 450);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // `request` is derived from `signature`; the signature is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, apiKey]);

  return hint;
}
