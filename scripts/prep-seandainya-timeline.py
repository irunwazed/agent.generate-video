import os
import json
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(ROOT, "src", "videos", "seandainya"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "public", "seandainya"), exist_ok=True)

for fn in ["paint.ts", "shade.ts", "cardshade.ts", "ink.ts", "lensblur.ts", "grade.ts", "lights.ts", "toon.ts"]:
    shutil.copy2(
        os.path.join(ROOT, "src", "videos", "merdeka", fn),
        os.path.join(ROOT, "src", "videos", "seandainya", fn),
    )

with open(os.path.join(ROOT, "voice", "seandainya", "_chapters.json"), "r", encoding="utf-8") as f:
    chapters = json.load(f)

all_chunks = []
for ch in chapters:
    stem = ch["stem"]
    off = ch["start_s"]
    shutil.copy2(
        os.path.join(ROOT, "voice", "seandainya", f"{stem}.mp3"),
        os.path.join(ROOT, "public", "seandainya", f"{stem}.mp3"),
    )
    with open(os.path.join(ROOT, "voice", "seandainya", f"{stem}_words.json"), "r", encoding="utf-8") as f:
        wdata = json.load(f)[0]["words"]
    clean_words = []
    for w in wdata:
        if w.get("type") == "word" and w["text"].strip():
            clean_words.append({
                "text": w["text"].strip(),
                "start": round(off + w["start"], 2),
                "end": round(off + w["end"], 2),
            })
    i = 0
    while i < len(clean_words):
        w1 = clean_words[i]
        if i + 1 < len(clean_words):
            w2 = clean_words[i + 1]
            gap = w2["start"] - w1["end"]
            combined_len = len(w1["text"]) + len(w2["text"])
            has_punct = any(w1["text"].endswith(p) for p in [".", "?", "!", ":", ";", ","])
            if not has_punct and gap < 0.35 and combined_len <= 16:
                all_chunks.append({
                    "text": f"{w1['text']} {w2['text']}",
                    "start": w1["start"],
                    "end": w2["end"],
                })
                i += 2
                continue
        all_chunks.append({"text": w1["text"], "start": w1["start"], "end": w1["end"]})
        i += 1

for k in range(len(all_chunks) - 1):
    gap = all_chunks[k + 1]["start"] - all_chunks[k]["end"]
    if 0 < gap < 0.14:
        all_chunks[k]["end"] = round(all_chunks[k + 1]["start"] - 0.02, 2)

with open(os.path.join(ROOT, "src", "videos", "seandainya", "caption_chunks.json"), "w", encoding="utf-8") as f:
    json.dump(all_chunks, f, ensure_ascii=False, indent=2)

# Also print key cue timings per chapter from SRTs
def parse_srt_time(ts):
    h, m, rest = ts.split(":")
    s, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0

for ch in chapters:
    stem = ch["stem"]
    off = ch["start_s"]
    print(f"\n=== {stem} (offset {off:.2f}s, frames {ch['f_a']}..{ch['f_b']}) ===")
    srt_path = os.path.join(ROOT, "voice", "seandainya", f"{stem}.srt")
    with open(srt_path, "r", encoding="utf-8") as f:
        blocks = [b.strip() for b in f.read().split("\n\n") if b.strip()]
    for b in blocks:
        lines = b.splitlines()
        if len(lines) >= 3:
            t0_str, t1_str = lines[1].split(" --> ")
            t0 = off + parse_srt_time(t0_str.strip())
            t1 = off + parse_srt_time(t1_str.strip())
            f0 = int(round(t0 * 30))
            f1 = int(round(t1 * 30))
            txt = " ".join(lines[2:])
            print(f"  f={f0:5d}..{f1:5d} ({t0:6.1f}s) | {txt[:88]}")

print(f"\nSaved {len(all_chunks)} caption chunks -> src/videos/seandainya/caption_chunks.json")
