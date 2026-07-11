#!/usr/bin/env python3
"""Convert asset masters (PNG) to delivery WebP in game/public/art/."""
import os, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "assets")
DST = os.path.join(ROOT, "game", "public", "art")

SPECS = {  # category -> (max width, quality)
    "rooms": (1536, 78),
    "events": (1536, 78),
    "characters": (1536, 78),
    "items": (1024, 80),
    "ui": (1920, 82),
}

total = 0
for cat, (maxw, q) in SPECS.items():
    outdir = os.path.join(DST, cat)
    os.makedirs(outdir, exist_ok=True)
    for f in sorted(os.listdir(os.path.join(SRC, cat))):
        if not f.endswith(".png"):
            continue
        img = Image.open(os.path.join(SRC, cat, f))
        has_alpha = img.mode == "RGBA" and img.getextrema()[3][0] < 255
        img = img.convert("RGBA" if has_alpha else "RGB")
        if img.width > maxw:
            img = img.resize((maxw, round(img.height * maxw / img.width)), Image.LANCZOS)
        out = os.path.join(outdir, f[:-4] + ".webp")
        img.save(out, "WEBP", quality=q, method=6)
        total += 1
size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(DST) for f in fs)
print(f"{total} webp files, {size/1e6:.1f} MB total")
