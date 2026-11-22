# Render the action SFX of a kit project into one WAV, every sound on its exact frame.
#   npm run kit:sfx -- <name>                 (first: writes out/<name>/sfx_events.json)
#   python scripts/kit-sfx-mix.py <name> [--out public/<name>_sfx.wav] [--total <frames>]
# Needs numpy + scipy. Unknown event kinds are listed and skipped. Mix this under the voice / music bed, or set
# PROJECT.audio to the file for previews.
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "skill", "templates", "audio"))
from dsp import SR, rng, place, write_wav, pan  # noqa: E402
from kit_sfx import SFX, GAIN  # noqa: E402

args = sys.argv[1:]
if not args:
    print("usage: python scripts/kit-sfx-mix.py <video folder name> [--out path.wav] [--total frames]")
    sys.exit(2)
name = args[0]
opt = lambda k, d=None: args[args.index(k) + 1] if k in args and args.index(k) + 1 < len(args) else d
src = os.path.join("out", name, "sfx_events.json")
if not os.path.exists(src):
    print(f"{src} missing: run  npm run kit:sfx -- {name}  first")
    sys.exit(2)
data = json.load(open(src, encoding="utf8"))
fps, ev = data["fps"], data["events"]
total = int(opt("--total", 0)) or (max((e["f"] for e in ev), default=0) + fps * 3)
out = opt("--out", os.path.join("out", name, "sfx.wav"))
buf = np.zeros((2, int(total / fps * SR) + SR))
missing = {}
for i, e in enumerate(ev):
    fn = SFX.get(e["kind"])
    if fn is None:
        missing[e["kind"]] = missing.get(e["kind"], 0) + 1
        continue
    r = rng(1000 + i * 7 + e["f"])
    x = fn(r) * GAIN.get(e["kind"], 0.7)
    place(buf, pan(x, float(r.uniform(-0.15, 0.15))), e["f"] / fps)
peak = np.max(np.abs(buf)) or 1.0
buf *= min(1.0, 0.89 / peak)
os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
write_wav(out, buf, 16)
print(f"{len(ev)} events -> {out} ({total / fps:.1f} s)")
if missing:
    print("no generator for:", ", ".join(f"{k} x{v}" for k, v in missing.items()), "(add them to skill/templates/audio/kit_sfx.py)")
