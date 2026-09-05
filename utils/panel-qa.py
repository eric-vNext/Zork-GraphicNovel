#!/usr/bin/env python3
"""Automated defect scan for generated panels.

Three checks the Zork I build learned to need (docs/generated-asset-review.md):

  edge-band   a near-uniform pale band along an edge — the edit model echoing a
              baked border in its reference as a white "page margin". Hit 5 of
              the first 7 anchors on the Zork I run.
  dark-bar    a flat near-black band along an edge — a letterbox artifact;
              detected and trimmed programmatically last time.
  white-patch a large blown-out interior region. Often a legitimate highlight
              (an explosion, a sun shaft), so this one reports for review
              rather than failing.

    python3 utils/panel-qa.py IMAGE [IMAGE ...]

Exit status is 1 if any panel has an edge-band or dark-bar defect.
"""
import sys
from PIL import Image, ImageStat

BAND_MAX = 0.06      # inspect up to 6% of the dimension inwards
PALE, DARK = 232, 18  # luminance thresholds
FLAT = 6.0            # stddev below this counts as "flat"


def band_defect(im):
    """Return (edge, kind, thickness_px) for the worst edge band, or None."""
    w, h = im.size
    worst = None
    for edge in ("top", "bottom", "left", "right"):
        span = h if edge in ("top", "bottom") else w
        limit = max(2, int(span * BAND_MAX))
        thickness = 0
        kind = None
        for t in range(1, limit + 1):
            box = {"top": (0, 0, w, t), "bottom": (0, h - t, w, h),
                   "left": (0, 0, t, h), "right": (w - t, 0, w, h)}[edge]
            strip = im.crop(box)
            st = ImageStat.Stat(strip)
            mean, sd = st.mean[0], st.stddev[0]
            if sd < FLAT and mean > PALE:
                thickness, kind = t, "edge-band"
            elif sd < FLAT and mean < DARK:
                thickness, kind = t, "dark-bar"
            else:
                break
        if thickness >= 3 and (worst is None or thickness > worst[2]):
            worst = (edge, kind, thickness)
    return worst


def white_patch(im):
    """Fraction of the interior that is blown out."""
    w, h = im.size
    inner = im.crop((int(w * .08), int(h * .08), int(w * .92), int(h * .92)))
    px = inner.getdata()
    return sum(1 for v in px if v > 249) / len(px)


def main(paths):
    bad = 0
    for p in paths:
        im = Image.open(p).convert("L")
        name = p.rsplit("/", 3)[-2] if "/" in p else p
        band = band_defect(im)
        patch = white_patch(im)
        notes = []
        if band:
            notes.append(f"{band[1]} on {band[0]} edge, {band[2]}px")
            bad += 1
        if patch > 0.02:
            notes.append(f"blown interior {patch*100:.1f}% (review: may be a highlight)")
        print(f"{'FAIL' if band else 'ok  '}  {name:34s} {im.size[0]}x{im.size[1]}  "
              f"{'; '.join(notes) if notes else 'clean'}")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
