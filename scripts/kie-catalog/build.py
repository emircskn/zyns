#!/usr/bin/env python3
"""
Builds src/lib/registry/generated/catalog.json from docs.kie.ai.

Every KIE model page embeds an OpenAPI document; this script pulls the page
index (llms.txt), downloads each English model page, extracts the request
schema and writes a trimmed catalogue the studio renders its controls from.

    python3 scripts/kie-catalog/build.py            # fetch + build
    python3 scripts/kie-catalog/build.py --cache /tmp/kiedocs   # reuse pages
    python3 scripts/kie-catalog/build.py --localise-only   # only re-apply the English text

Requires: pyyaml.
"""
import argparse, glob, json, os, re, sys, urllib.request
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor

import yaml

DOCS = "https://docs.kie.ai"
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "lib", "registry", "generated", "catalog.json")

# Pages whose `model` property carries neither enum nor default.
MODEL_OVERRIDES = {
    "market/kling/kling-3-0": "kling-3.0/video",
    "suno-api/generate-persona": "ai-music-api/generate-persona",
    "suno-api/recovery-audio": "ai-music-api/suno-recovery-audio",
    "veo3-api/get-veo-3-4k-video": "veo/get-4k-video",
}

def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read().decode("utf-8", "replace")

def load_pages(cache):
    os.makedirs(cache, exist_ok=True)
    index_path = os.path.join(cache, "llms.txt")
    if not os.path.exists(index_path):
        open(index_path, "w").write(fetch(f"{DOCS}/llms.txt"))
    crumbs, urls = {}, []
    for line in open(index_path):
        m = re.match(r"- (.*?)\[(.*?)\]\((https://docs\.kie\.ai/([^)]+))\.md\)", line)
        if not m or "/cn" in m.group(4) and m.group(4).startswith("cn"):
            continue
        key = m.group(4)
        if key.startswith("cn/") or key == "cn" or key.startswith("cnmarket"):
            continue
        crumbs[key] = (m.group(1).strip(), m.group(2).strip())
        urls.append((key, m.group(3) + ".md"))

    def get(item):
        key, url = item
        path = os.path.join(cache, key.replace("/", "__") + ".md")
        if not os.path.exists(path):
            try:
                open(path, "w").write(fetch(url))
            except Exception as ex:  # noqa: BLE001
                print("FAIL", url, ex, file=sys.stderr)
        return key, path

    with ThreadPoolExecutor(12) as pool:
        pages = list(pool.map(get, urls))
    return crumbs, pages

def clean(text, limit):
    text = re.sub(r"<[^>]+>", "", text or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]

def merge(schema):
    """Flatten allOf wrappers into (properties, required)."""
    if not isinstance(schema, dict):
        return {}, []
    props, req = {}, []
    for part in schema.get("allOf") or []:
        p, r = merge(part)
        props.update(p)
        req += r
    if "properties" in schema:
        props.update(schema["properties"])
        req += schema.get("required") or []
    return props, req

VOICE_PAIR = re.compile(r"([A-Za-z0-9]{20}) - (.+?)(?= [A-Za-z0-9]{20} - |$)")

def simplify(props, required):
    out = OrderedDict()
    for raw, p in (props or {}).items():
        if not isinstance(p, dict):
            continue
        name = raw.strip()
        e = OrderedDict(type=p.get("type"))
        for k in ("enum", "default", "minimum", "maximum", "maxLength", "minItems", "maxItems", "format"):
            if k in p:
                e[k] = p[k]
        if isinstance(p.get("items"), dict):
            it = p["items"]
            e["items"] = {k: it[k] for k in ("type", "enum", "format") if k in it}
            ip, ir = merge(it)
            if ip:
                e["items"]["properties"] = simplify(ip, ir)
                for sub in e["items"]["properties"].values():
                    sub["desc"] = sub["desc"][:120]
        desc = p.get("description") or ""
        # Voice lists ship as "ID - Name - flavour" inside the description.
        if e.get("enum") and "Available voices" in desc:
            body = re.sub(r"\s+", " ", desc.split("Available voices:", 1)[1])
            labels = {vid: label.strip() for vid, label in VOICE_PAIR.findall(body)}
            if labels:
                e["enumLabels"] = labels
        e["desc"] = clean(desc, 160)
        e["required"] = raw in required or name in required
        out[name] = e
    return out

def input_schema(inp):
    """Return (union_props, variants). Variants exist only for oneOf inputs."""
    alts = inp.get("oneOf") or inp.get("anyOf")
    if alts:
        variants, union = [], OrderedDict()
        for alt in alts:
            props, req = merge(alt)
            simp = simplify(props, req)
            if not simp:
                continue
            variants.append({"title": alt.get("title") or clean(alt.get("description"), 60), "keys": list(simp), "required": [k for k, v in simp.items() if v["required"]]})
            for k, v in simp.items():
                union.setdefault(k, dict(v))
        if union:
            return union, variants
    props, req = merge(inp)
    return simplify(props, req), None

# A few pages under docs.kie.ai's English index are written in Chinese.
# Their text is shown in the studio (help lines, titles), so it is replaced
# here with a faithful English version; `localise` also fails the build if
# any other Chinese text turns up, so a new such page is caught, not shipped.
TITLES = {
    "seedream/5-pro-layer-decomposition": "Seedream 5.0 Pro Layer Decomposition",
    "happyhorse-1-1/image-to-video": "HappyHorse 1.1 Image to Video",
    "happyhorse-1-1/text-to-video": "HappyHorse 1.1 Text to Video",
    "happyhorse-1-1/reference-to-video": "HappyHorse 1.1 Reference to Video",
}

_HH_RATIOS = "Aspect ratio of the video. Options: 16:9, 9:16, 1:1, 4:3, 3:4, 4:5, 5:4, 9:21, 21:9."
DESCS = {
    "seedream/5-pro-layer-decomposition": {
        "prompt": "Optional prompt for how to split the layers. - With a prompt, the model splits out the elements it names - Without one, it finds the main elements in the image itself - Elements can be placed exactly with `x1 y1 x2 y2`, ideally in coordinates normalised to 0–1000",
        "image_url": "URL of the source image to split into layers. - Exactly one image - PNG, JPEG, WebP, BMP, TIFF or GIF - HEIC and HEIF are not supported - Up to 30 MB - 262,144–36,000,000 pixels in total - Aspect ratio between 1:16 and 16:1",
        "size": "Resolution tier of the output. The base image keeps the input's aspect ratio and each layer keeps its element's. - `auto`: picked from the input size - `1K`, `1.5K`, `2K`: that resolution tier",
        "output_format": "Format of the base image. Only the base image follows this; every split layer is always PNG.",
    },
    "happyhorse-1-1/image-to-video": {
        "prompt": "What the video should show, in any language. Up to 5,000 characters, or 2,500 Chinese characters.",
        "image_urls": "URL of the first-frame image. JPEG, JPG, PNG or WEBP; width and height at least 300 px; aspect ratio between 1:2.5 and 2.5:1; up to 20 MB.",
        "resolution": "Resolution of the video. Options: 720p, 1080p.",
        "duration": "Length of the video in seconds, a whole number from 3 to 15. Default 5.",
    },
    "happyhorse-1-1/text-to-video": {
        "prompt": "What the video should show, in any language. Up to 5,000 characters, or 2,500 Chinese characters.",
        "resolution": "Resolution of the video. Options: 720p, 1080p.",
        "aspect_ratio": _HH_RATIOS,
        "duration": "Length of the video in seconds.",
    },
    "happyhorse-1-1/reference-to-video": {
        "prompt": "The elements and visual style the video should have, in any language. Up to 5,000 characters, or 2,500 Chinese characters; longer text is cut off. Refer to reference images as [Image 1], [Image 2], in the order they were added, and say which object in the image you mean.",
        "reference_image": "URLs of the reference images. JPEG, JPG, PNG or WEBP; shortest side at least 400 px (720p or sharper recommended, as small, blurry or heavily compressed images lower the result); up to 20 MB each.",
        "resolution": "Resolution tier of the video. Options: 720p, 1080p.",
        "aspect_ratio": _HH_RATIOS,
        "duration": "Length of the video in seconds, a whole number from 3 to 15.",
    },
}

# Full-width punctuation that English pages pick up from Chinese editing.
WIDE = str.maketrans({"（": " (", "）": ") ", "：": ": ", "；": "; ", "，": ", ", "。": ". ", "「": ' "', "」": '" ', "、": ", "})
CJK = re.compile(r"[㐀-䶿一-鿿]")

def localise(specs):
    """English titles and descriptions for every spec, or a failed build."""
    left = []
    def tidy(text):
        return re.sub(r"\s+", " ", text.translate(WIDE)).replace("( ", "(").replace(" )", ")").strip()
    def walk(props, model, path):
        for key, p in (props or {}).items():
            desc = DESCS.get(model, {}).get(key) if not path else None
            p["desc"] = tidy(desc if desc is not None else p.get("desc") or "")
            if CJK.search(p["desc"]):
                left.append(f"{model} {'.'.join(path + [key])}")
            walk(((p.get("items") or {}).get("properties")), model, path + [key])
    for s in specs:
        model = s["model"] or s["doc"]
        s["title"] = TITLES.get(model, s["title"] or "")
        if CJK.search(s["title"]):
            left.append(f"{model} title")
        walk(s.get("input"), model, [])
        walk(s.get("top"), model, [])
    if left:
        raise SystemExit("Chinese text left in the catalogue; add it to TITLES/DESCS:\n  " + "\n  ".join(left))
    return specs

def write(specs):
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"source": f"{DOCS}/llms.txt", "count": len(specs), "specs": specs}, open(OUT, "w"), separators=(",", ":"))
    print(f"wrote {OUT}: {len(specs)} specs")

def build(cache):
    crumbs, pages = load_pages(cache)
    specs = []
    for key, path in pages:
        if not os.path.exists(path):
            continue
        text = open(path).read()
        # Descriptions inside the spec embed their own code fences (indented);
        # the block's closing fence is the one at column 0.
        m = re.search(r"^```yaml\n(.*?)^```\s*$", text, re.S | re.M)
        if not m:
            continue
        try:
            doc = yaml.safe_load(m.group(1))
        except Exception as ex:  # noqa: BLE001
            print("YAML", key, ex, file=sys.stderr)
            continue
        for endpoint, ops in (doc.get("paths") or {}).items():
            for method, op in ops.items():
                if method.lower() != "post":
                    continue
                body = (((op.get("requestBody") or {}).get("content") or {}).get("application/json") or {})
                props, req = merge(body.get("schema") or {})
                mp = props.get("model") or {}
                model = (mp.get("enum") or [None])[0] or mp.get("default") or (mp.get("examples") or [None])[0]
                if not model and isinstance(body.get("example"), dict):
                    model = body["example"].get("model")
                model = MODEL_OVERRIDES.get(key, model)
                if endpoint.startswith(("/claude", "/codex", "/grok/", "/gemini", "/gpt-", "/api/v1/responses", "/api/file", "/api/v1/chat", "/api/v1/common", "/api/v1/jobs/recordInfo")):
                    continue
                inp = props.get("input")
                # Only request bodies count: a page may also document response
                # envelopes as POST-shaped schemas, and those carry no `input`
                # and no `model`.
                if not isinstance(inp, dict) and "model" not in props and not endpoint.startswith("/api/v1/omni"):
                    continue
                union, variants = input_schema(inp) if isinstance(inp, dict) else (None, None)
                top = None
                if not inp:
                    top = simplify({k: v for k, v in props.items() if k not in ("model", "callBackUrl")}, req)
                crumb, title = crumbs.get(key, ("", op.get("summary")))
                specs.append(OrderedDict(
                    model=model, endpoint=endpoint, doc=f"{DOCS}/{key}", title=title or op.get("summary"),
                    crumb=crumb, input=union, variants=variants, top=top,
                ))
    # A few pages document the same model twice; keep the richer schema.
    by = OrderedDict()
    for s in specs:
        k = s["model"] or s["doc"]
        richness = len(json.dumps(s["input"] or {})) or len(json.dumps(s["top"] or {})) // 4
        if k not in by or richness > by[k]["_r"]:
            s["_r"] = richness
            by[k] = s
    for s in by.values():
        s.pop("_r", None)
    specs = list(by.values())
    write(localise(specs))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.join(os.path.dirname(__file__), ".cache"))
    ap.add_argument("--localise-only", action="store_true",
                    help="apply the English text to the existing catalogue without fetching the docs")
    args = ap.parse_args()
    if args.localise_only:
        write(localise(json.load(open(OUT))["specs"]))
    else:
        build(args.cache)
