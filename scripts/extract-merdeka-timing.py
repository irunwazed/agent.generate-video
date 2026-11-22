import os
import json
import time
import subprocess
import numpy as np
from scipy.io import wavfile
from faster_whisper import WhisperModel

t0 = time.time()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ffmpeg_exe = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
mp3_path = os.path.join(ROOT, "voice", "merdeka_vo.mp3")
tmp_wav = os.path.join(ROOT, "voice", "_tmp16k.wav")

subprocess.run(
    [ffmpeg_exe, "-nostdin", "-y", "-v", "error", "-i", mp3_path, "-ac", "1", "-ar", "16000", tmp_wav],
    check=True,
)
sr, data = wavfile.read(tmp_wav)
os.remove(tmp_wav)
audio = data.astype(np.float32) / 32768.0
dur = len(audio) / 16000.0
print(f"Loaded audio: {dur:.2f}s ({int(round(dur * 30))} frames @ 30fps)", flush=True)

model = WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=4, num_workers=1)
prompt = "Ada satu alasan Indonesia bisa merdeka. Jepang, Sekutu, status quo, PETA, Heiho, Soekarno-Hatta, Rengasdengklok, Surabaya, Don Bosco, TNI, Belanda."

cuts = [0.0, 26.0, 51.8, 74.0, 97.5, dur]
all_segs = []
all_words = []

for i in range(len(cuts) - 1):
    c0, c1 = cuts[i], cuts[i + 1]
    chunk = audio[int(c0 * 16000) : int(c1 * 16000)]
    segs, _ = model.transcribe(chunk, language="id", beam_size=2, word_timestamps=True, initial_prompt=prompt)
    for s in segs:
        s_start = round(c0 + s.start, 2)
        s_end = round(c0 + s.end, 2)
        s_text = s.text.strip()
        print(f"[{s_start:6.2f} -> {s_end:6.2f}] {s_text}", flush=True)
        seg_words = []
        for w in (s.words or []):
            w_obj = {
                "text": w.word.strip(),
                "start": round(c0 + w.start, 2),
                "end": round(c0 + w.end, 2),
                "type": "word",
            }
            seg_words.append(w_obj)
            all_words.append(w_obj)
        all_segs.append({"start": s_start, "end": s_end, "text": s_text, "words": seg_words})

raw_path = os.path.join(ROOT, "voice", "_raw_whisper_segs.json")
with open(raw_path, "w", encoding="utf-8") as f:
    json.dump({"duration": dur, "segments": all_segs, "words": all_words}, f, ensure_ascii=False, indent=2)

print(f"Done in {time.time() - t0:.2f}s — {len(all_segs)} segments, {len(all_words)} words", flush=True)
