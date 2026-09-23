#!/usr/bin/env python3
"""
Builds src/lib/registry/generated/pricing.json from KIE's public price list.

KIE's documented API has no way to ask what a task will cost. Its pricing
page (kie.ai/pricing) reads an unauthenticated list instead, one row per
model and option set, e.g. "bytedance/seedance-2-5, 720p no video" at
63 credits per second. The studio estimates a run from a snapshot of that
list, taken here, so a change to the undocumented endpoint can never break
the app: rerun this to pick up new prices.

    python3 scripts/kie-catalog/pricing.py

Each row keeps the part of the description before the first comma as `m`
(the model as KIE's price list names it) and the rest as `d`, both folded
to lowercase words, plus the price `c` and the unit `u`. Chat models are
left out; the studio does not run them.
"""
import json, os, re, sys, urllib.request

API = "https://api.kie.ai/client/v1/model-pricing/page"
PAGE_SIZE = 100  # the endpoint refuses anything larger
KINDS = {"image", "video", "music"}
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "lib", "registry", "generated", "pricing.json")


def fold(text):
    """Lowercase words: every run of punctuation or space becomes one space."""
    return re.sub(r"[^a-z0-9.]+", " ", text.lower()).strip()


def page(n):
    body = json.dumps({"pageNum": n, "pageSize": PAGE_SIZE}).encode()
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    if data.get("code") != 200:
        raise SystemExit(f"price list refused page {n}: {data.get('msg')}")
    return data["data"]


def main():
    rows, n = [], 1
    while True:
        data = page(n)
        records = data.get("records") or []
        rows.extend(records)
        if len(records) < PAGE_SIZE:
            break
        n += 1

    out = []
    for r in rows:
        if r.get("interfaceType") not in KINDS:
            continue
        name, _, rest = r["modelDescription"].strip().partition(",")
        try:
            credits = float(r["creditPrice"])
        except (TypeError, ValueError):
            continue
        out.append({
            "m": fold(name),
            "d": fold(rest),
            "c": int(credits) if credits.is_integer() else credits,
            "u": fold(r.get("creditUnit") or ""),
        })

    # One row per line, so a price change reads as a one-line diff.
    with open(OUT, "w") as f:
        f.write("[\n" + ",\n".join(json.dumps(r, ensure_ascii=False) for r in out) + "\n]\n")
    print(f"{len(out)} media prices (of {len(rows)} rows) -> {os.path.relpath(OUT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
