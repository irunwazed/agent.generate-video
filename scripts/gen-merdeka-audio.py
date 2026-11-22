#!/usr/bin/env python3
"""
Procedural SFX + Voiceover Master Mix Generator for:
"Alasan Indonesia Merdeka yang Sekolah Tidak Ajarkan" (3435 frames @ 30 fps = 114.50 s).

Uses the DSP & procedural synthesis modules in `skill/templates/audio/`
to synthesize frame-accurate SFX locked to `src/videos/merdeka/story.ts` and
normalize master audio to -15.0 LUFS (True Peak <= -1.2 dBTP) -> `public/merdeka_mix.wav`.
"""
import os
import sys
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
TOTAL_FRAMES = 3435
DUR = TOTAL_FRAMES / FPS  # 114.50 s
N = ns(DUR)
TARGET_LUFS = -15.0
CEIL_DBTP = -1.2

def fr(f):
    return float(f) / FPS

def find_ffmpeg():
    bundled = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
    if os.path.exists(bundled):
        return bundled
    return shutil.which("ffmpeg") or "ffmpeg"

def load_voice():
    mp3_path = os.path.join(ROOT, "public", "merdeka_vo.mp3")
    tmp_wav = os.path.join(ROOT, "public", "_merdeka_voice_48k.wav")
    ffmpeg_exe = find_ffmpeg()
    subprocess.run(
        [ffmpeg_exe, "-nostdin", "-y", "-hide_banner", "-loglevel", "error", "-i", mp3_path, "-ar", str(SR), "-ac", "2", tmp_wav],
        check=True,
    )
    x, _ = read_wav(tmp_wav)
    try:
        os.remove(tmp_wav)
    except OSError:
        pass
    out = np.zeros((2, N))
    m = min(N, x.shape[1])
    out[:, :m] = x[:, :m]
    return out

RNG = np.random.default_rng(1945)

def sfx_whoosh(dur=0.38, center_freq=650, pan_pos=0.0):
    n = ns(dur)
    t = tt(dur)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    noise = colored(n, RNG, -2.5)
    lo = max(60, center_freq * 0.5)
    hi = min(SR * 0.45, center_freq * 1.8)
    w = bp(noise, lo, hi) * env
    return pan(w, pan_pos)

def sfx_kick(dur=0.32, f0=120, f1=38):
    n = ns(dur)
    t = tt(dur)
    env = np.exp(-t * 14.0)
    f_inst = f1 + (f0 - f1) * np.exp(-t * 28.0)
    phi = 2 * np.pi * np.cumsum(f_inst) / SR
    sine = np.sin(phi) * env
    click = np.exp(-t * 180.0) * colored(n, RNG, 2.0)
    hit = sine * 0.85 + click * 0.25
    return st(hit)

def sfx_flash(dur=0.95):
    t = tt(dur)
    out = np.zeros(len(t))
    rise_dur = 0.45
    n_rise = int(rise_dur * SR)
    t_rise = t[:n_rise]
    rise_env = (t_rise / rise_dur) ** 3
    noise_rise = colored(n_rise, RNG, -2.0)
    rise_noise = bp(noise_rise, 350, 2200) * rise_env
    out[:n_rise] += rise_noise * 0.7

    n_tail = len(t) - n_rise
    t_tail = np.linspace(0, n_tail / SR, n_tail, endpoint=False)
    tail_env = np.exp(-t_tail * 4.5)
    sub = np.sin(2 * np.pi * (55 * np.exp(-t_tail * 8.0)) * t_tail) * tail_env * 0.9
    sparkle = lp(colored(n_tail, RNG, 1.0), 4500) * tail_env * 0.2
    out[n_rise:] += sub + sparkle
    return st(out)

def sfx_gavel(dur=0.45):
    n = ns(dur)
    t = tt(dur)
    crack = np.exp(-t * 120.0) * colored(n, RNG, 4.0)
    res = (np.sin(2 * np.pi * 380 * t) * 0.5 + np.sin(2 * np.pi * 820 * t) * 0.3) * np.exp(-t * 22.0)
    thud = np.sin(2 * np.pi * 95 * t) * np.exp(-t * 18.0) * 0.7
    return pan(crack * 0.4 + res * 0.4 + thud * 0.6, -0.25)

def sfx_bell(dur=1.2, f_bell=1180):
    n = ns(dur)
    t = tt(dur)
    strike = np.exp(-t * 140.0) * colored(n, RNG, 5.0) * 0.3
    m1 = np.sin(2 * np.pi * f_bell * t) * np.exp(-t * 3.2)
    m2 = np.sin(2 * np.pi * (f_bell * 1.58) * t) * np.exp(-t * 4.5) * 0.45
    m3 = np.sin(2 * np.pi * (f_bell * 2.32) * t) * np.exp(-t * 6.0) * 0.25
    return pan(strike + (m1 + m2 + m3) * 0.65, 0.25)

def sfx_radio_tune(dur=0.65):
    n = ns(dur)
    t = tt(dur)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1))
    crackle = bp(colored(n, RNG, 1.5), 600, 3200) * env * 0.35
    whistle = np.sin(2 * np.pi * (1400 + 450 * np.sin(t * 14.0)) * t) * env * 0.22
    return pan(crackle + whistle, -0.3)

def sfx_typewriter(dur=0.55):
    n = ns(dur)
    out = np.zeros(n)
    for dt in [0.0, 0.11, 0.21, 0.34, 0.43]:
        i0 = int(dt * SR)
        L = min(int(0.06 * SR), n - i0)
        if L > 0:
            tt_c = np.linspace(0, L / SR, L, endpoint=False)
            click = np.exp(-tt_c * 190.0) * colored(L, RNG, 4.5)
            out[i0 : i0 + L] += click * 0.6
    return pan(out, -0.3)

def sfx_key_unlock(dur=0.75):
    n = ns(dur)
    t = tt(dur)
    clink1 = (np.sin(2 * np.pi * 1950 * t) * 0.5 + np.sin(2 * np.pi * 3120 * t) * 0.35) * np.exp(-t * 14.0)
    clank2 = np.sin(2 * np.pi * 420 * np.maximum(0, t - 0.18)) * np.exp(-np.maximum(0, t - 0.18) * 24.0) * (t >= 0.18) * 0.55
    click = np.exp(-t * 160.0) * colored(n, RNG, 5.0) * 0.3
    return pan(clink1 + clank2 + click, 0.3)

def generate_sfx():
    sfx = np.zeros((2, N))

    def put(start_sec, mono_or_st_wave, gain_db=0.0):
        w = st(mono_or_st_wave) if mono_or_st_wave.ndim == 1 else mono_or_st_wave
        w = w * (10 ** (gain_db / 20.0))
        i0 = ns(start_sec)
        i1 = min(N, i0 + w.shape[1])
        L = i1 - i0
        if L > 0:
            sfx[:, i0:i1] += w[:, :L]

    # --- Shot 1 (0..195): Hook & "Jepang kalah perang"
    put(0.00, sfx_whoosh(0.32, 550, pan_pos=-0.3), -6.0)
    put(fr(42), sfx_whoosh(0.36, 750, pan_pos=0.0), -5.0)
    put(fr(148), sfx_kick(0.36, 125, 38), -2.5)  # "Jepang kalah perang"

    # --- Shot 2 (195..342): 15 Agustus 1945 Radio & White Flash
    put(fr(195), sfx_radio_tune(0.65), -6.5)
    put(fr(255), sfx_whoosh(0.32, 820, pan_pos=0.3), -6.0)
    put(fr(298), sfx_kick(0.34, 118, 40), -3.5)
    put(fr(338) - 0.45, sfx_flash(0.95), -2.5)   # FLASH_AT = 338

    # --- Shot 3 & 4 (342..775): Vacuum of Power & Status Quo
    put(fr(342), sfx_whoosh(0.38, 580, pan_pos=-0.2), -7.0)
    put(fr(442), sfx_radio_tune(0.50), -7.5)
    put(fr(515), sfx_whoosh(0.35, 680, pan_pos=0.0), -6.5)
    put(fr(576), sfx_kick(0.34, 115, 40), -3.5)  # "tanpa penguasa"
    put(fr(695), sfx_kick(0.32, 110, 42), -4.0)  # "jaga status quo"

    # --- Shot 5, 6, 7 (775..1468): Kamp Pelatihan PETA & Heiho 1943
    put(fr(775), sfx_whoosh(0.38, 620, pan_pos=-0.2), -6.0)
    put(fr(895), sfx_whoosh(0.35, 780, pan_pos=0.0), -5.5)
    put(fr(1014), sfx_kick(0.35, 120, 38), -3.0) # "PETA dan Heiho"
    put(fr(1025), sfx_whoosh(0.30, 950, pan_pos=0.3), -6.0)
    put(fr(1168), sfx_whoosh(0.30, 850, pan_pos=0.3), -6.5)
    put(fr(1240), sfx_whoosh(0.34, 720, pan_pos=-0.3), -6.0)
    put(fr(1296), sfx_kick(0.38, 130, 36), -2.5) # "tidak mulai dari nol"
    put(fr(1350), sfx_whoosh(0.35, 650, pan_pos=0.0), -6.5)

    # --- Shot 8 & 9 (1468..1898): Rengasdengklok & Proklamasi 17 Agustus 1945
    put(fr(1468), sfx_typewriter(0.55), -5.5)
    put(fr(1545), sfx_whoosh(0.34, 700, pan_pos=0.2), -6.5)
    put(fr(1590), sfx_kick(0.34, 118, 38), -3.0) # "Rengasdengklok"
    put(fr(1655), sfx_whoosh(0.32, 880, pan_pos=-0.3), -6.0)
    put(fr(1715), sfx_kick(0.35, 122, 38), -3.0) # "tanpa nunggu izin"
    put(fr(1815), sfx_bell(1.1, 1180), -6.5)     # "kemerdekaan diumumkan"

    # --- Shot 10, 11, 12 (1898..2435): Gudang Don Bosco Surabaya & Lahirnya TNI
    put(fr(1898), sfx_whoosh(0.36, 560, pan_pos=-0.3), -6.0)
    put(fr(1952), sfx_kick(0.36, 128, 36), -3.0) # "gudang Jepang"
    put(fr(2020), sfx_whoosh(0.34, 680, pan_pos=0.2), -6.5)
    put(fr(2115), sfx_kick(0.36, 125, 38), -3.0) # "gudang Don Bosco"
    put(fr(2216), sfx_whoosh(0.36, 740, pan_pos=0.0), -6.0)
    put(fr(2358), sfx_kick(0.40, 135, 35), -2.5) # "5 Oktober 1945"
    put(fr(2360), sfx_bell(1.0, 1320), -7.0)

    # --- Shot 13 (2435..2675): Deadpan "Untungnya / Sialnya"
    put(fr(2435), sfx_whoosh(0.34, 700, pan_pos=-0.2), -6.5)
    put(fr(2550), sfx_kick(0.38, 125, 38), -2.5) # "Sialnya, itu memang rencana mereka"

    # --- Shot 14 & 15 (2675..3100): Perjuangan 4,5 Tahun & KMB 27 Desember 1949
    put(fr(2675), sfx_whoosh(0.38, 580, pan_pos=-0.2), -6.5)
    put(fr(2810), sfx_whoosh(0.35, 720, pan_pos=0.2), -6.5)
    put(fr(2922), sfx_gavel(0.45), -4.0)         # KMB Treaty Gavel strike
    put(fr(2968), sfx_whoosh(0.34, 780, pan_pos=0.0), -6.0)
    put(fr(2985), sfx_kick(0.36, 122, 38), -3.0) # "27 Desember 1949"
    put(fr(2988), sfx_bell(1.1, 1420), -7.0)

    # --- Shot 16 (3100..3435): Analogi Kunci di Pintu & Kita yang Membukanya
    put(fr(3100), sfx_whoosh(0.34, 680, pan_pos=-0.2), -6.5)
    put(fr(3200), sfx_key_unlock(0.75), -5.0)    # "meninggalkan kunci di pintu"
    put(fr(3304), sfx_kick(0.38, 130, 36), -2.5) # "kita... yang membukanya!"
    put(fr(3308), sfx_key_unlock(0.75), -4.5)
    put(fr(3318), sfx_bell(1.2, 1480), -6.5)

    return sfx

def main():
    print("Loading Merdeka voiceover stem...")
    voice = load_voice()

    print("Generating procedural frame-accurate SFX stem...")
    sfx = generate_sfx()

    mix = voice * 0.95 + sfx * 0.55

    print("Normalizing master mix to target loudness (-15.0 LUFS)...")
    lufs = integrated(mix)
    print(f"Initial mix loudness: {lufs:.2f} LUFS")
    gain = 10 ** ((TARGET_LUFS - lufs) / 20.0)
    norm = mix * gain

    tp_db = true_peak(norm)
    print(f"Normalized True Peak: {tp_db:.2f} dBTP")
    if tp_db > CEIL_DBTP:
        reduction = 10 ** ((CEIL_DBTP - tp_db) / 20.0)
        norm = norm * reduction
        print(f"Limiter applied: reduced by {tp_db - CEIL_DBTP:.2f} dB -> {true_peak(norm):.2f} dBTP")

    out_wav = os.path.join(ROOT, "public", "merdeka_mix.wav")
    print(f"Writing master audio file -> {out_wav}...")
    write_wav(out_wav, norm, SR)
    print("Merdeka master audio mix generated successfully!")

if __name__ == "__main__":
    main()
