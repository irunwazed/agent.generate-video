#!/usr/bin/env python3
"""
Procedural SFX + Voiceover Master Mix Generator for all 10 chapters of:
"Seandainya Jepang Masih Menjajah Indonesia" (43,397 frames @ 30 fps = 24m 06.5s).

Synthesizes per-chapter 48 kHz stereo master mixes (`public/seandainya/{stem}_mix.wav`)
with motivated procedural SFX (camera whooshes, impact kicks, Saketi-Bayah railway hammer clanks,
PETA/Guerrilla rifle shots & mortar explosion booms, tactical map pings, MacArthur SCAP gavel)
normalized to -15.0 LUFS (True Peak <= -1.2 dBTP).
"""
import os
import sys
import json
import shutil
import subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_TPL = os.path.join(ROOT, "skill", "templates", "audio")
sys.path.insert(0, AUDIO_TPL)

from dsp import (
    SR, ns, tt, colored, lp, bp, pan, st,
    integrated, true_peak, read_wav, write_wav,
)

FPS = 30.0
TARGET_LUFS = -15.0
CEIL_DBTP = -1.2
RNG = np.random.default_rng(19450817)

def find_ffmpeg():
    bundled = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
    if os.path.exists(bundled):
        return bundled
    return shutil.which("ffmpeg") or "ffmpeg"

def sfx_whoosh(dur=0.36, center_freq=650, pan_pos=0.0):
    n = ns(dur)
    t = tt(dur)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    noise = colored(n, RNG, -2.5)
    w = bp(noise, max(60, center_freq * 0.5), min(SR * 0.45, center_freq * 1.8)) * env
    return pan(w, pan_pos)

def sfx_kick(dur=0.34, f0=122, f1=38):
    n = ns(dur)
    t = tt(dur)
    env = np.exp(-t * 14.0)
    f_inst = f1 + (f0 - f1) * np.exp(-t * 28.0)
    phi = 2 * np.pi * np.cumsum(f_inst) / SR
    sine = np.sin(phi) * env
    click = np.exp(-t * 180.0) * colored(n, RNG, 2.0)
    return st(sine * 0.85 + click * 0.25)

def sfx_rail_hammer(dur=0.45):
    n = ns(dur)
    t = tt(dur)
    clank = (np.sin(2 * np.pi * 1420 * t) * 0.55 + np.sin(2 * np.pi * 2380 * t) * 0.35 + np.sin(2 * np.pi * 3190 * t) * 0.2) * np.exp(-t * 18.0)
    impact = np.exp(-t * 160.0) * colored(n, RNG, 4.0) * 0.4
    return pan(clank + impact, -0.25)

def sfx_rifle_shot(dur=0.38):
    n = ns(dur)
    t = tt(dur)
    crack = np.exp(-t * 95.0) * bp(colored(n, RNG, 2.5), 400, 4800) * 0.85
    thump = np.sin(2 * np.pi * (160 * np.exp(-t * 25.0) + 45) * t) * np.exp(-t * 18.0) * 0.65
    return pan(crack + thump, -0.2)

def sfx_mortar_boom(dur=0.85):
    n = ns(dur)
    t = tt(dur)
    rumble = lp(colored(n, RNG, -3.0), 320) * np.exp(-t * 4.2) * 0.8
    sub = np.sin(2 * np.pi * (85 * np.exp(-t * 10.0) + 32) * t) * np.exp(-t * 5.5) * 0.85
    debris = bp(colored(n, RNG, 1.0), 500, 3200) * np.exp(-t * 9.0) * 0.3
    return pan(rumble + sub + debris, 0.3)

def sfx_map_ping(dur=0.32, f=1380):
    t = tt(dur)
    env = np.exp(-t * 12.0)
    tone = (np.sin(2 * np.pi * f * t) * 0.7 + np.sin(2 * np.pi * (f * 1.5) * t) * 0.25) * env
    return pan(tone, 0.0)

def sfx_gavel(dur=0.45):
    n = ns(dur)
    t = tt(dur)
    crack = np.exp(-t * 120.0) * colored(n, RNG, 4.0)
    res = (np.sin(2 * np.pi * 380 * t) * 0.5 + np.sin(2 * np.pi * 820 * t) * 0.3) * np.exp(-t * 22.0)
    thud = np.sin(2 * np.pi * 95 * t) * np.exp(-t * 18.0) * 0.7
    return pan(crack * 0.4 + res * 0.4 + thud * 0.6, 0.0)

def process_chapter(ch, ffmpeg_exe):
    stem = ch["stem"]
    dur_s = round(ch["end_s"] - ch["start_s"], 2)
    N = ns(dur_s)

    mp3_path = os.path.join(ROOT, "voice", "seandainya", f"{stem}.mp3")
    tmp_wav = os.path.join(ROOT, "public", "seandainya", f"_{stem}_48k.wav")
    subprocess.run(
        [ffmpeg_exe, "-nostdin", "-y", "-hide_banner", "-loglevel", "error", "-i", mp3_path, "-ar", str(SR), "-ac", "2", tmp_wav],
        check=True,
    )
    x, _ = read_wav(tmp_wav)
    try:
        os.remove(tmp_wav)
    except OSError:
        pass

    voice = np.zeros((2, N))
    m = min(N, x.shape[1])
    voice[:, :m] = x[:, :m]

    sfx = np.zeros((2, N))
    def put(t_sec, w, gain_db=0.0):
        w2 = st(w) if w.ndim == 1 else w
        w2 = w2 * (10 ** (gain_db / 20.0))
        i0 = ns(t_sec)
        i1 = min(N, i0 + w2.shape[1])
        L = i1 - i0
        if L > 0:
            sfx[:, i0:i1] += w2[:, :L]

    # Chapter transition whoosh + sub kick at start & every 5.5s camera sub-beat
    put(0.05, sfx_whoosh(0.36, 650), -6.0)
    put(0.08, sfx_kick(0.34, 120, 40), -4.0)
    t_beat = 5.5
    b_idx = 1
    while t_beat < dur_s - 2.0:
        put(t_beat, sfx_whoosh(0.32, 620 + (b_idx % 3) * 140, pan_pos=(-0.25 if b_idx % 2 else 0.25)), -7.5)
        if "bab1a" in stem and t_beat > 65.0 and b_idx % 2 == 0:
            put(t_beat + 0.35, sfx_rail_hammer(), -6.0)
            put(t_beat + 0.90, sfx_rail_hammer(), -6.5)
        elif ("bab3a" in stem or "bab3b" in stem or "bab1b" in stem) and b_idx % 2 == 1:
            put(t_beat + 0.25, sfx_rifle_shot(), -6.5)
            put(t_beat + 0.65, sfx_rifle_shot(), -7.0)
            if b_idx % 3 == 0:
                put(t_beat + 1.10, sfx_mortar_boom(), -5.5)
        elif ("bab2" in stem or "bab4" in stem) and b_idx % 2 == 0:
            put(t_beat + 0.20, sfx_map_ping(0.32, 1380), -9.0)
        if "bab4" in stem and abs(t_beat - 27.5) < 3.0:
            put(t_beat + 0.40, sfx_gavel(), -4.5)
        t_beat += 5.5
        b_idx += 1

    mix = voice * 0.95 + sfx * 0.50
    lufs = integrated(mix)
    gain = 10 ** ((TARGET_LUFS - lufs) / 20.0)
    norm = mix * gain
    tp_db = true_peak(norm)
    if tp_db > CEIL_DBTP:
        norm = norm * (10 ** ((CEIL_DBTP - tp_db) / 20.0))

    out_wav = os.path.join(ROOT, "public", "seandainya", f"_{stem}_mix_tmp.wav")
    out_mp3 = os.path.join(ROOT, "public", "seandainya", f"{stem}_mix.mp3")
    write_wav(out_wav, norm, SR)
    subprocess.run(
        [ffmpeg_exe, "-nostdin", "-y", "-hide_banner", "-loglevel", "error", "-i", out_wav, "-c:a", "libmp3lame", "-b:a", "192k", out_mp3],
        check=True,
    )
    try:
        os.remove(out_wav)
    except OSError:
        pass
    print(f"Mixed {stem}_mix.mp3 ({dur_s:.1f}s) | {integrated(norm):.2f} LUFS | {true_peak(norm):.2f} dBTP", flush=True)

def main():
    ffmpeg_exe = find_ffmpeg()
    with open(os.path.join(ROOT, "voice", "seandainya", "_chapters.json"), "r", encoding="utf-8") as f:
        chapters = json.load(f)
    for ch in chapters:
        process_chapter(ch, ffmpeg_exe)
    print("All 10 Seandainya chapter audio mixes generated successfully!", flush=True)

if __name__ == "__main__":
    main()
