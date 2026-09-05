#!/usr/bin/env python3
"""Run the chained-edit protocol over a list of variant edges.

Each edge names its reference explicitly, so a chain is expressed by pointing
an edge at the previous edge's *output* rather than at the family base. Edges
run in order; a chain therefore has to appear after the edge it depends on.
"""
import json, os, subprocess, sys

failures: list[str] = []
from PIL import Image
import importlib.util

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = "/private/tmp/claude-501/-Volumes-Satechi-Dock-Code-Zork-GraphicNovel/684cac62-3f3e-4f29-82e4-1559eabe6ee1/scratchpad"
OUT = f"{SP}/variants"
GEN = os.path.expanduser("~/.claude/skills/media-gen/scripts/generate.py")

# The generator runs as a subprocess and shell exports do not survive between
# invocations, so the driver loads the key itself rather than trusting the
# environment it happens to be started in. A whole batch failed on this once.
if not os.environ.get("FAL_KEY"):
    for line in open(os.path.expanduser("~/.zshrc")):
        if line.strip().startswith("export FAL_KEY="):
            os.environ["FAL_KEY"] = line.split("=", 1)[1].strip().strip('"\'')
            break
    else:
        raise SystemExit("FAL_KEY not found in environment or ~/.zshrc")
spec = importlib.util.spec_from_file_location("qa", "utils/panel-qa.py")
qa = importlib.util.module_from_spec(spec); spec.loader.exec_module(qa)

FB = ("Full bleed to all four edges: no page, no border, no frame, no margin. "
      "No text or lettering.")

def resolve(ref):
    """A reference is either a delivered base or an earlier edge's output."""
    for cand in (f"assets/rooms/z2-{ref}.png", f"{OUT}/z2-{ref}.png"):
        if os.path.exists(cand):
            return cand
    raise SystemExit(f"reference not found: {ref}")

def run(name, ref, prompt, extra=""):
    dest = f"{OUT}/z2-{name}.png"
    if os.path.exists(dest):
        print(f"  {name}: exists, skipping"); return
    # A combinatorial state takes two references — one per axis at its
    # non-default value. Never more than two; beyond that they fight.
    refs = ref if isinstance(ref, list) else [ref]
    srcs = [resolve(r_) for r_ in refs]
    img_args = []
    for sfile in srcs:
        img_args += ["--input-image", sfile]
    src = srcs[0]
    r = subprocess.run([sys.executable, GEN, "image",
        "--model", "nano-banana-pro-edit", "--aspect-ratio", "3:2",
        "--resolution", "2K", *img_args,
        "--title", f"z2-{name}",
        "--prompt", f"{prompt} {extra} Everything else in the reference image is unchanged. {FB}"],
        capture_output=True, text=True)
    line = [l for l in r.stdout.splitlines() if l.startswith("{")]
    if not line:
        print(f"  {name}: FAILED\n{r.stdout[-300:]}{r.stderr[-300:]}")
        failures.append(name); return
    path = json.loads(line[-1])["image_path"]
    im = Image.open(path).convert("RGB")
    for _ in range(4):
        if not qa.band_defect(im.convert("L")): break
        im = qa.trim(im, im.convert("L"), (3, 2))
    os.makedirs(OUT, exist_ok=True)
    im.save(dest)
    print(f"  {name}: {im.size[0]}x{im.size[1]}  <- {', '.join(os.path.basename(x) for x in srcs)}")

EDGES = json.load(open(sys.argv[1]))
for e in EDGES:
    run(e["name"], e["ref"], e["prompt"], e.get("extra", ""))
# Exit non-zero on any failure: a batch that fails every edge must not look
# like a batch that succeeded.
if failures:
    raise SystemExit(f"{len(failures)} edge(s) failed: {', '.join(failures)}")
