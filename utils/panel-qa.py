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
    python3 utils/panel-qa.py --fix OUTDIR IMAGE [IMAGE ...]

`--fix` trims the detected bands and re-crops to the panel's target aspect,
writing the result into OUTDIR. Naming the defect in the prompt does not stop
it — the Zork II anchor pass produced page borders on 8 of 11 images and again
on 5 of 8 after the style block was rewritten to forbid them three ways. Zork I
reached the same conclusion and trimmed programmatically; this is that fix.

Exit status is 1 if any panel has an edge-band or dark-bar defect.
"""
import sys
import numpy as np
from PIL import Image, ImageStat

# Thresholds, widened after the Zork II anchor pass. The first version looked
# only 6% inwards and treated "dark" as luminance < 18; three anchors carried
# flat bars 15-20% of the frame wide at luminance 19-39 and were reported clean.
# Flatness (a near-zero stddev over a whole strip) is what actually identifies a
# bar — illustrated content is never that uniform — so the luminance windows are
# generous and the stddev test does the work.
BAND_MAX = 0.28       # inspect up to 28% of the dimension inwards
PALE, DARK = 225, 52  # luminance thresholds
STEP = 8.0            # minimum brightness step across the boundary
STRAIGHT = 0.95       # fraction of rows crossing the boundary the same way
MIN_BAR = 10          # ignore anything thinner than this


def band_defect(im):
    """Return (edge, kind, thickness_px) for the worst edge bar, or None.

    Detection is by the *straightness of the boundary*, not by tone or
    flatness. A pasted bar ends at a perfectly straight line: every row crosses
    it in the same direction. Painted content — a dark ceiling, a soft sky, fog
    — never does, because its boundary is irregular.

    Measured on a hand-labelled set from the Zork II runs, the two classes do
    not overlap: real bars scored agreement 1.00 (stairway, pearl room, narrow
    tunnel), while the title screen's sky, the mist room, the foot bridge's fog,
    the great cavern's shadow and the cool room all scored 0.53-0.60.

    Three earlier versions keyed on flatness instead and each missed a class of
    bar: wider than the search window, outside a narrow luminance window, and
    built from two stacked tones.
    """
    a = np.asarray(im, dtype=np.float32)
    worst = None

    for edge in ("top", "bottom", "left", "right"):
        m = {"left": a, "right": a[:, ::-1],
             "top": a.T, "bottom": a.T[:, ::-1]}[edge]
        span = m.shape[1]

        for x in range(MIN_BAR, int(span * BAND_MAX)):
            lo = m[:, x - 4:x - 1].mean(axis=1)
            hi = m[:, x + 1:x + 4].mean(axis=1)
            d = hi - lo
            step = abs(float(d.mean()))
            if step < STEP:
                continue
            agree = float((np.sign(d) == np.sign(d.mean())).mean())
            if agree < STRAIGHT:
                continue
            if worst is None or x > worst[2]:
                mean = float(m[:, :x].mean())
                kind = ("edge-band" if mean > PALE else
                        "dark-bar" if mean < DARK else "flat-bar")
                worst = (edge, kind, x)
            break
    return worst


def pale_ground(im):
    """Item plates sit on a dark vignette; pale corners mean the object was
    painted on a white sheet. The straight-boundary bar test cannot see this,
    because a painted wash edge is irregular rather than straight — 4 of the
    first 30 Zork II item plates came back this way and scanned clean."""
    a = np.asarray(im, dtype=np.float32)
    h, w = a.shape
    k = max(4, int(min(h, w) * 0.06))
    corners = [a[:k, :k], a[:k, -k:], a[-k:, :k], a[-k:, -k:]]
    return float(np.mean([c.mean() for c in corners]))


def page_ground(im):
    """Largest fraction of any single edge that is pale.

    A painting mounted on a white sheet has at least one edge almost entirely
    pale; a full-bleed illustration does not, even a bright one. Measured on a
    labelled set from the Zork II runs: page grounds scored 0.93-1.00, while
    the brightest legitimate panels — the depository's curtain wall and the
    marble hall — topped out at 0.62. The threshold sits at 0.80, which is
    conservative on purpose: it never fires on real artwork, and a thin strip
    along one edge can still slip under it and needs the eye.
    """
    a = np.asarray(im, dtype=np.float32)
    h, w = a.shape
    t = max(3, int(min(h, w) * 0.015))
    edges = (a[:t, :], a[-t:, :], a[:, :t], a[:, -t:])
    return max(float((e > 205).mean()) for e in edges)


def white_patch(im):
    """Fraction of the interior that is blown out."""
    w, h = im.size
    inner = im.crop((int(w * .08), int(h * .08), int(w * .92), int(h * .92)))
    px = inner.getdata()
    return sum(1 for v in px if v > 249) / len(px)


def crop_to_artwork(im_rgb, im_l, aspect):
    """Crop a page-mounted painting down to the painting itself.

    Cheaper and more reliable than rerolling: the artwork is the non-pale
    region, so its bounding box is the crop. Three rerolls of one event panel
    failed to shake the white sheet; this fixed it in one pass.
    """
    a = np.asarray(im_l, dtype=np.float32)
    # A row belongs to the artwork if most of it is non-pale. Using .any()
    # fails: a single ink speck or the printed frame line in the page margin
    # is enough to claim the row, and the crop then does nothing.
    mask = a < 205
    rows = np.where(mask.mean(axis=1) > 0.5)[0]
    cols = np.where(mask.mean(axis=0) > 0.5)[0]
    if not len(rows) or not len(cols):
        return im_rgb
    pad = 4
    box = (max(0, int(cols[0]) + pad), max(0, int(rows[0]) + pad),
           min(im_rgb.width, int(cols[-1]) - pad), min(im_rgb.height, int(rows[-1]) - pad))
    if box[2] - box[0] < 64 or box[3] - box[1] < 64:
        return im_rgb
    out = im_rgb.crop(box)
    w, h = out.size
    want_w, want_h = aspect
    if w * want_h > h * want_w:
        nw = round(h * want_w / want_h); x = (w - nw) // 2
        out = out.crop((x, 0, x + nw, h))
    else:
        nh = round(w * want_h / want_w); y = (h - nh) // 2
        out = out.crop((0, y, w, y + nh))
    return out


def trim(im_rgb, im_l, aspect):
    """Trim every detected edge band, then re-crop to `aspect` from the centre."""
    box = [0, 0, im_l.size[0], im_l.size[1]]
    for _ in range(4):  # one band can hide another behind it
        sub = im_l.crop(tuple(box))
        d = band_defect(sub)
        if not d:
            break
        edge, _kind, t = d
        if edge == "top":
            box[1] += t
        elif edge == "bottom":
            box[3] -= t
        elif edge == "left":
            box[0] += t
        else:
            box[2] -= t
    # A drawn frame is textured, so the flat-band loop above stops just inside
    # it and leaves a hairline of page or ink. Once any band has been found,
    # take a further fixed inset; the compositions have enough margin to spare.
    if box != [0, 0, im_l.size[0], im_l.size[1]]:
        inset_x = round(im_l.size[0] * 0.022)
        inset_y = round(im_l.size[1] * 0.022)
        box = [box[0] + inset_x, box[1] + inset_y, box[2] - inset_x, box[3] - inset_y]

    out = im_rgb.crop(tuple(box))
    w, h = out.size
    want_w, want_h = aspect
    if w * want_h > h * want_w:          # too wide, trim the sides
        nw = round(h * want_w / want_h)
        x = (w - nw) // 2
        out = out.crop((x, 0, x + nw, h))
    else:                                 # too tall, trim top and bottom
        nh = round(w * want_h / want_w)
        y = (h - nh) // 2
        out = out.crop((0, y, w, y + nh))
    return out


def main(paths):
    bad = 0
    for p in paths:
        im = Image.open(p).convert("L")
        name = p.rsplit("/", 3)[-2] if "/" in p else p
        band = band_defect(im)
        patch = white_patch(im)
        square = abs(im.size[0] / im.size[1] - 1) < 0.02
        notes = []
        failed = bool(band)
        if square and pale_ground(im) > 120:
            notes.append(f"pale ground (corner mean {pale_ground(im):.0f}) — item plate on a white sheet")
            failed = True
        pg = page_ground(im)
        if pg >= 0.80:
            notes.append(f"page ground ({pg:.2f} of one edge is pale) — artwork mounted on a sheet")
            failed = True
        if band:
            notes.insert(0, f"{band[1]} on {band[0]} edge, {band[2]}px")
        if failed:
            bad += 1
        if patch > 0.02:
            notes.append(f"blown interior {patch*100:.1f}% (review: may be a highlight)")
        print(f"{'FAIL' if failed else 'ok  '}  {name:34s} {im.size[0]}x{im.size[1]}  "
              f"{'; '.join(notes) if notes else 'clean'}")
    return 1 if bad else 0


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--fix":
        import os
        outdir, files = args[1], args[2:]
        os.makedirs(outdir, exist_ok=True)
        for f in files:
            rgb = Image.open(f).convert("RGB")
            aspect = (16, 9) if abs(rgb.width / rgb.height - 16 / 9) < .05 else (3, 2)
            # Trim until the scan is clean: one pass removes the outermost band,
            # and a pale page border can hide a dark bar behind it. Re-cropping
            # to the target aspect can also reintroduce an edge.
            fixed = rgb
            for _ in range(4):
                if not band_defect(fixed.convert("L")):
                    break
                fixed = trim(fixed, fixed.convert("L"), aspect)
            name = f.rsplit("/", 2)[-2].replace("2026-09-04-", "") + ".png"
            dest = os.path.join(outdir, name)
            fixed.save(dest)
            print(f"{name:26s} {rgb.size[0]}x{rgb.size[1]} -> {fixed.size[0]}x{fixed.size[1]}"
                  f"  ({100 - round(100 * fixed.width * fixed.height / (rgb.width * rgb.height))}% trimmed)")
        raise SystemExit(0)
    raise SystemExit(main(args))
