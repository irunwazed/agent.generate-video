import os
import json
import difflib
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw_path = os.path.join(ROOT, "voice", "_raw_whisper_segs.json")
tts_path = os.path.join(ROOT, "voice", "merdeka_tts.txt")

with open(raw_path, "r", encoding="utf-8") as f:
    raw = json.load(f)

whisper_words = raw["words"]

with open(tts_path, "r", encoding="utf-8") as f:
    lines = [line.strip() for line in f.readlines() if line.strip()]

canon_words = []
line_word_ranges = []
for line_idx, line in enumerate(lines):
    toks = line.split()
    start_i = len(canon_words)
    for t in toks:
        canon_words.append({"text": t, "line": line_idx})
    line_word_ranges.append((line_idx, line, start_i, len(canon_words)))

def norm(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9]", "", s)
    return s

w_norms = [norm(w["text"]) for w in whisper_words]
c_norms = [norm(c["text"]) for c in canon_words]

sm = difflib.SequenceMatcher(None, c_norms, w_norms, autojunk=False)
aligned = [None] * len(canon_words)

for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1):
            aligned[i1 + k] = (whisper_words[j1 + k]["start"], whisper_words[j1 + k]["end"])
    elif tag in ("replace", "delete"):
        n_c = i2 - i1
        n_w = j2 - j1
        if n_w > 0:
            t_start = whisper_words[j1]["start"]
            t_end = whisper_words[j2 - 1]["end"]
            dur = max(0.08, (t_end - t_start) / max(1, n_c))
            for k in range(n_c):
                s = round(t_start + k * dur, 2)
                e = round(min(t_end, s + dur), 2)
                aligned[i1 + k] = (s, max(s + 0.06, e))

# Fill any remaining None (if delete occurred with n_w == 0)
for idx in range(len(aligned)):
    if aligned[idx] is None:
        prev_e = aligned[idx - 1][1] if idx > 0 and aligned[idx - 1] else 0.0
        next_s = prev_e + 0.25
        for nxt in range(idx + 1, len(aligned)):
            if aligned[nxt] is not None:
                next_s = aligned[nxt][0]
                break
        s = round(prev_e + 0.02, 2)
        e = round(max(s + 0.12, min(next_s - 0.02, s + 0.25)), 2)
        aligned[idx] = (s, e)

final_words = []
for idx, c in enumerate(canon_words):
    s, e = aligned[idx]
    final_words.append({
        "text": c["text"],
        "start": round(float(s), 2),
        "end": round(float(e), 2),
        "type": "word",
        "speaker_id": "speaker_0",
    })

out_json = [
    {
        "language_code": "ind",
        "language_probability": 0.99,
        "text": " ".join(lines),
        "words": final_words,
    }
]

json_out_path = os.path.join(ROOT, "voice", "merdeka.json")
with open(json_out_path, "w", encoding="utf-8") as f:
    json.dump(out_json, f, ensure_ascii=False, indent=2)

def fmt_srt(t):
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

srt_blocks = []
print("=== SENTENCE TIMELINE (30 FPS) ===")
for line_idx, line, i1, i2 in line_word_ranges:
    s = final_words[i1]["start"]
    e = final_words[i2 - 1]["end"]
    f_a = int(round(s * 30))
    f_b = int(round(e * 30))
    print(f"L{line_idx+1:02d} [{s:6.2f}s..{e:6.2f}s | f={f_a:4d}..{f_b:4d}] {line}")
    srt_blocks.append(f"{line_idx+1}\n{fmt_srt(s)} --> {fmt_srt(e)}\n{line}\n")

srt_out_path = os.path.join(ROOT, "voice", "merdeka.srt")
with open(srt_out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(srt_blocks))

# Build 1-2 word caption chunks (same logic as scripts/gen-chunks.py)
chunks = []
i = 0
while i < len(final_words):
    w1 = final_words[i]
    if i + 1 < len(final_words):
        w2 = final_words[i + 1]
        gap = w2["start"] - w1["end"]
        combined_len = len(w1["text"]) + len(w2["text"])
        has_terminal_punct = any(w1["text"].endswith(p) for p in [".", "?", "!", ":", ";", ","])
        if not has_terminal_punct and gap < 0.35 and combined_len <= 16:
            chunks.append({
                "text": f"{w1['text']} {w2['text']}",
                "start": w1["start"],
                "end": w2["end"],
            })
            i += 2
            continue
    chunks.append({
        "text": w1["text"],
        "start": w1["start"],
        "end": w1["end"],
    })
    i += 1

for k in range(len(chunks) - 1):
    gap = chunks[k + 1]["start"] - chunks[k]["end"]
    if 0 < gap < 0.14:
        chunks[k]["end"] = round(chunks[k + 1]["start"] - 0.02, 2)

chunks_path = os.path.join(ROOT, "voice", "merdeka_caption_chunks.json")
with open(chunks_path, "w", encoding="utf-8") as f:
    json.dump(chunks, f, ensure_ascii=False, indent=2)

print(f"\nSaved {len(final_words)} words -> voice/merdeka.json, {len(srt_blocks)} SRT cues -> voice/merdeka.srt, {len(chunks)} caption chunks -> voice/merdeka_caption_chunks.json")
