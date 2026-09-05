#!/usr/bin/env python3
"""Build a labelled contact sheet from a set of generated panels.

Used at the anchor review gate: the owner sees the whole set as one image
rather than opening eleven files.

    python3 utils/contact-sheet.py OUT.png LABEL=path.png [LABEL=path.png ...]
"""
import sys
from PIL import Image, ImageDraw, ImageFont

CELL_W, PAD, BG, FG = 620, 18, (18, 17, 15), (222, 218, 205)


def font(size):
    for p in ("/System/Library/Fonts/Supplemental/Georgia.ttf",
              "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
              "/Library/Fonts/Arial.ttf"):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main(argv):
    out_path, items = argv[1], [a.split("=", 1) for a in argv[2:]]
    cols = 3 if len(items) > 4 else 2
    label_h = 30

    tiles = []
    for label, path in items:
        im = Image.open(path).convert("RGB")
        h = round(im.height * CELL_W / im.width)
        tiles.append((label, im.resize((CELL_W, h), Image.LANCZOS)))

    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    row_h = [max(t.height for _, t in r) + label_h for r in rows]
    sheet = Image.new("RGB",
                      (cols * CELL_W + (cols + 1) * PAD,
                       sum(row_h) + (len(rows) + 1) * PAD), BG)
    draw = ImageDraw.Draw(sheet)
    f = font(19)

    y = PAD
    for r, rh in zip(rows, row_h):
        x = PAD
        for label, tile in r:
            sheet.paste(tile, (x, y))
            draw.text((x + 2, y + tile.height + 6), label, font=f, fill=FG)
            x += CELL_W + PAD
        y += rh + PAD

    sheet.save(out_path, quality=92)
    print(f"{out_path}  {sheet.width}x{sheet.height}  {len(tiles)} panels")


if __name__ == "__main__":
    main(sys.argv)
