# Generates the "Seandainya" VO via ElevenLabs (eleven_v3 + audio tags),
# one request per chapter, using the expressive SRT files as the source text.
# Also derives word-timing JSON (Merdeka pipeline format) and actual SRT
# directly from ElevenLabs character alignment.
# Resume-safe: chapters with an existing MP3 are skipped unless --force.
#
# Usage:
#   python scripts/gen-seandainya-vo-elevenlabs.py            # all chapters
#   python scripts/gen-seandainya-vo-elevenlabs.py --only 01  # one chapter
#   python scripts/gen-seandainya-vo-elevenlabs.py --force    # re-render all
import base64
import glob
import json
import os
import re
import sys
import time

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTS_DIR = os.path.join(ROOT, "voice", "seandainya_tts")
OUT_DIR = os.path.join(ROOT, "voice", "seandainya")

VOICE_ID = "3mAVBNEqop5UbHtD8oxQ"
MODEL_ID = "eleven_v4"
OUTPUT_FORMAT = "mp3_44100_128"

# our SRT tags -> eleven v4 natural-language audio tags ("" = strip, default delivery)
TAG_MAP = {
    "[whispering]": "[whispers]",
    "[laughter]": "[laughs]",
    "[somber]": "[sad]",
    "[excited]": "[excited]",
    "[serious]": "[serious]",
    "[determined]": "[determined]",
}
STRIP_LEFTOVER = re.compile(r"\[[a-z_]+\]", re.IGNORECASE)

API_BASE = "https://api.elevenlabs.io/v1"


def load_api_key():
    env_path = os.path.join(ROOT, ".env")
    with open(env_path, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if line.startswith("ELEVENLABS_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
                if key:
                    return key
    raise SystemExit("ELEVENLABS_API_KEY tidak ditemukan di .env")


def parse_srt(path):
    cues = []
    with open(path, "r", encoding="utf-8") as f:
        blocks = [b.strip() for b in f.read().split("\n\n") if b.strip()]
    for block in blocks:
        lines = block.splitlines()
        if len(lines) < 2:
            continue
        text = " ".join(lines[2:]).strip()
        cues.append(text)
    return cues


def to_v3_text(cue_texts):
    out_lines = []
    for text in cue_texts:
        line = text
        for src, dst in TAG_MAP.items():
            line = line.replace(src, dst)
        line = STRIP_LEFTOVER.sub("", line).strip()
        if line:
            out_lines.append(line)
    return "\n\n".join(out_lines), out_lines


def normalize_word(w):
    return re.sub(r"[^\w]", "", w, flags=re.UNICODE).lower()


def words_from_alignment(alignment):
    chars = alignment.get("characters", [])
    starts = alignment.get("character_start_times_seconds", [])
    ends = alignment.get("character_end_times_seconds", [])
    words = []
    buf, start, end = [], None, None
    for ch, st, en in zip(chars, starts, ends):
        if ch.isspace():
            if buf:
                words.append({"text": "".join(buf).strip(), "start": round(start, 3), "end": round(end, 3)})
                buf, start, end = [], None, None
        else:
            if start is None:
                start = st
            end = en
            buf.append(ch)
    if buf:
        words.append({"text": "".join(buf).strip(), "start": round(start, 3), "end": round(end, 3)})
    return words


def match_cues_to_words(cue_texts, words):
    """Sequentially assign alignment words to cue lines -> real cue (start, end)."""
    wi = 0
    spans = []
    for cue in cue_texts:
        cue_words = [normalize_word(w) for w in cue.split() if normalize_word(w)]
        if not cue_words:
            spans.append(None)
            continue
        j = wi
        first, last = None, None
        matched = 0
        while j < len(words) and matched < len(cue_words):
            if normalize_word(words[j]["text"]) == cue_words[matched]:
                if first is None:
                    first = j
                last = j
                matched += 1
            j += 1
        if first is not None and matched == len(cue_words):
            spans.append((words[first]["start"], words[last]["end"]))
            wi = last + 1
        else:
            spans.append(None)
    return spans


def fmt_srt(t):
    total_ms = int(round(t * 1000))
    h = total_ms // 3600000
    m = (total_ms % 3600000) // 60000
    s = (total_ms % 60000) // 1000
    return f"{h:02d}:{m:02d}:{s:02d},{total_ms % 1000:03d}"


def main():
    args = sys.argv[1:]
    force = "--force" in args
    only = None
    if "--only" in args:
        only = args[args.index("--only") + 1]

    api_key = load_api_key()
    os.makedirs(OUT_DIR, exist_ok=True)
    headers = {"xi-api-key": api_key, "Content-Type": "application/json"}
    endpoint = f"{API_BASE}/text-to-speech/{VOICE_ID}/with-timestamps"

    srt_files = sorted(glob.glob(os.path.join(TTS_DIR, "*.srt")))
    if only:
        srt_files = [p for p in srt_files if os.path.basename(p).startswith(only)]
    if not srt_files:
        raise SystemExit("Tidak ada file SRT yang cocok.")

    used_chars = 0
    for srt_path in srt_files:
        stem = os.path.splitext(os.path.basename(srt_path))[0]
        mp3_path = os.path.join(OUT_DIR, f"{stem}.mp3")
        if not force and os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 50000:
            print(f"SKIP {stem} (sudah ada)", flush=True)
            continue

        cues = parse_srt(srt_path)
        text, plain_lines = to_v3_text(cues)
        n_chars = len(text)
        print(f"RENDER {stem} | {len(cues)} cues | {n_chars} chars | model={MODEL_ID}", flush=True)

        t0 = time.time()
        resp = requests.post(
            endpoint,
            headers=headers,
            json={"text": text, "model_id": MODEL_ID, "output_format": OUTPUT_FORMAT},
            timeout=600,
        )
        if resp.status_code == 401:
            body = resp.text
            if "quota_exceeded" in body:
                raise SystemExit("Kuota ElevenLabs habis (quota_exceeded). Top-up/upgrade plan, atau lanjutkan nanti — script resume otomatis.")
            raise SystemExit("401 Unauthorized — cek ELEVENLABS_API_KEY / permission di .env")
        if resp.status_code == 402:
            raise SystemExit("402 Payment Required — kuota ElevenLabs habis. Lanjutkan nanti (script resume otomatis).")
        if resp.status_code == 422:
            print(f"422 Unprocessable: {resp.text[:400]}", flush=True)
            raise SystemExit("Model menolak request (mungkin tag/parameter tidak valid).")
        if resp.status_code == 429:
            print("429 rate limit — tunggu 60 detik lalu jalankan ulang (resume otomatis).", flush=True)
            raise SystemExit("Kena rate limit.")
        if resp.status_code != 200:
            raise SystemExit(f"HTTP {resp.status_code}: {resp.text[:400]}")

        data = resp.json()
        audio = base64.b64decode(data["audio_base64"])
        with open(mp3_path, "wb") as f:
            f.write(audio)

        alignment = data.get("alignment") or {}
        words = words_from_alignment(alignment)

        # word-timing JSON (format pipeline Merdeka)
        full_text = " ".join(plain_lines)
        words_out = [
            {"text": w["text"], "start": round(w["start"], 2), "end": round(w["end"], 2), "type": "word"}
            for w in words
        ]
        with open(os.path.join(OUT_DIR, f"{stem}_words.json"), "w", encoding="utf-8") as f:
            json.dump([{"language_code": "ind", "text": full_text, "words": words_out}], f, ensure_ascii=False, indent=2)

        # actual SRT (clean text, real timestamps)
        spans = match_cues_to_words(plain_lines, words)
        srt_blocks = []
        next_start = None
        real_cues = []
        for idx, cue in enumerate(plain_lines):
            span = spans[idx] if idx < len(spans) else None
            if span is None:
                real_cues.append(None)
                continue
            real_cues.append(span)
        with open(os.path.join(OUT_DIR, f"{stem}.srt"), "w", encoding="utf-8") as f:
            idx = 1
            prev_end = 0.0
            for i, cue in enumerate(plain_lines):
                if real_cues[i] is None:
                    continue
                a, b = real_cues[i]
                if b - a < 0.5:
                    b = a + 0.5
                if a < prev_end:
                    a = prev_end + 0.02
                prev_end = b
                f.write(f"{idx}\n{fmt_srt(a)} --> {fmt_srt(b)}\n{cue}\n\n")
                idx += 1

        used_chars += n_chars
        dur = words[-1]["end"] if words else 0.0
        print(f"DONE {stem} in {time.time()-t0:.1f}s | audio {len(audio)/1024:.0f} KB | "
              f"durasi {dur:.1f}s | {len(words)} kata | kuota terpakai sesi ini: {used_chars} chars", flush=True)
        time.sleep(2)

    print("SELESAI — semua chapter yang dirender tersimpan di voice/seandainya/", flush=True)


if __name__ == "__main__":
    main()
