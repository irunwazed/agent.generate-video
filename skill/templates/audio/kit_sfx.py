# Procedural SFX for the kit's action events (own numpy synthesis, cartoon-safe): every `kind` an action emits in
# out/<name>/sfx_events.json has a generator here. scripts/kit-sfx-mix.py places them on their exact frames.
#   SFX[kind](r) -> mono numpy array at dsp.SR;   GAIN[kind] = mix level (linear)
import numpy as np
from dsp import SR, ns, tt, lp, hp, bp, modal, fades, phase, colored, peq
import sfx_gen as G


def mix(*parts):
    """sum sounds of different lengths; a part may be (delay_seconds, sound)"""
    items = [(0.0, x) if not isinstance(x, tuple) else x for x in parts]
    n = max(ns(d) + len(x) for d, x in items)
    y = np.zeros(n)
    for d, x in items:
        y[ns(d):ns(d) + len(x)] += x
    return y


def _nz(r, d):
    return r.standard_normal(ns(d))


def burst(r, d, lo, hi, tau, gain=1.0):
    """band-limited noise hit with an exponential tail"""
    t = tt(d)
    return bp(_nz(r, d), lo, hi, 1) * np.exp(-t / tau) * gain


def boom(r, d, f0, tau, drop=0.5, gain=1.0):
    """low sine thump with a falling pitch (body of guns, explosions, thuds)"""
    t = tt(d)
    return np.sin(phase(f0 * (1 + drop * np.exp(-t / 0.03)))) * np.exp(-t / tau) * gain


def gunshot(r, big=1.0, d=0.9):
    t = tt(d)
    crack = hp(_nz(r, d), 1500) * np.exp(-t / 0.004) * 1.6
    body = lp(_nz(r, d), 1400, 2) * np.exp(-t / (0.05 * big)) * 2.0
    tail = bp(colored(ns(d), r, 0.8), 150, 2500, 1) * np.exp(-t / (0.25 * big)) * 0.5
    return fades(mix(crack, body, tail, boom(r, d, 70, 0.09 * big, 0.8, 1.2 * big)), 0.0, 0.1)


def explosion(r, big=1.0):
    d = 2.6
    t = tt(d)
    low = boom(r, d, 42, 0.45 * big, 1.2, 3.0)
    rumble = lp(colored(ns(d), r, 1.0), 300, 2) * (1 - np.exp(-t / 0.01)) * np.exp(-t / (0.7 * big)) * 2.5
    blast = bp(_nz(r, d), 200, 6000, 1) * np.exp(-t / 0.08) * 1.8
    crackle = hp(_nz(r, d) * (r.random(ns(d)) < 0.004), 1500) * np.exp(-t / 0.6) * 6.0
    return fades(low + rumble + blast + crackle, 0.0, 0.4)


def whoosh_s(r, d=0.28, lo=500, hi=3000):
    return G.whoosh(d, r, peak=d * 0.55, f_lo=lo, f_hi=hi, tail=d * 0.35)


def shing(r):
    """blade ring"""
    return mix(modal(0.6, [(2400, 0.5, 0.12), (3900, 0.35, 0.08), (6100, 0.2, 0.05)], r), burst(r, 0.6, 3000, 9000, 0.02, 0.4))


def thock(r, f=220):
    """wood knock"""
    return modal(0.35, [(f, 1.0, 0.05), (f * 2.3, 0.6, 0.03), (f * 4.1, 0.3, 0.015)], r) + burst(r, 0.35, 500, 4000, 0.006, 0.8)


def slap(r):
    return burst(r, 0.25, 600, 7000, 0.012, 1.4) + boom(r, 0.25, 110, 0.04, 0.4, 0.8)


def bonk(r):
    """cartoon head bonk: hollow knock with a rising pitch"""
    t = tt(0.4)
    return np.sin(phase(380 * (1 + 0.6 * (1 - np.exp(-t / 0.05))))) * np.exp(-t / 0.09) + burst(r, 0.4, 800, 5000, 0.005, 0.6)


def hiss(r, d, lo=2500, hi=9000, att=0.03, rel=0.08):
    t = tt(d)
    env = np.clip(t / att, 0, 1) * np.clip((d - t) / rel, 0, 1)
    return bp(_nz(r, d), lo, hi, 1) * env


def gurgle(r, d=1.2):
    t = tt(d)
    return mix(G.bubbles(d, r, 60 + 40 * np.sin(t * 9) ** 2, 250, 1400, (0.01, 0.04), np.clip(t / 0.05, 0, 1) * np.clip((d - t) / 0.1, 0, 1)), hiss(r, d, 600, 2500) * 0.15)


def rasp(r, d=0.32):
    """saw stroke"""
    t = tt(d)
    teeth = (np.sin(phase(np.full(len(t), 55.0))) > 0.6) * 1.0
    return bp(_nz(r, d) * (0.4 + teeth), 1500, 6000, 1) * np.sin(np.pi * t / d) * 0.9


def buzz(r, d=1.0):
    t = tt(d)
    saw = ((t * 190) % 1 - 0.5) * 2
    env = np.clip(t / 0.05, 0, 1) * np.clip((d - t) / 0.08, 0, 1)
    return (lp(saw, 2500) * 0.6 + bp(_nz(r, d), 2000, 7000, 1) * 0.15) * env


def ring_tone(r):
    t = tt(1.1)
    on = ((t % 0.5) < 0.38)
    return (np.sin(2 * np.pi * 1320 * t) + 0.6 * np.sin(2 * np.pi * 1760 * t)) * on * 0.35 * (1 - t / 1.2)


def pop(r):
    t = tt(0.18)
    return np.sin(phase(500 + 900 * t / 0.18)) * np.exp(-t / 0.05)


def twang(r):
    t = tt(0.5)
    return mix(np.sin(phase(190 * (1 + 0.15 * np.exp(-t / 0.02)))) * np.exp(-t / 0.12) * 0.8, whoosh_s(r, 0.25, 900, 4000) * 0.4)


def cloth(r, d=0.25):
    return hiss(r, d, 700, 5000, 0.02, 0.1) * 0.5


def oof(r):
    return G.oof(r, ["oof", "ugh", "ow"][r.integers(3)]) * 0.9


def thud(r):
    return boom(r, 0.5, 70, 0.08, 0.5, 1.6) + burst(r, 0.5, 200, 2000, 0.03, 0.6)


SFX = {
    # objects
    "grab": lambda r: mix(cloth(r, 0.15), thock(r, 900) * 0.25),
    "place": lambda r: thock(r, 500) * 0.5,
    "whoosh": lambda r: whoosh_s(r, 0.35),
    "splash": lambda r: G.splash_big(r),
    "thud": thud,
    "fuse": lambda r: mix(hiss(r, 1.0, 3000, 9000) * (0.6 + 0.4 * (r.random(ns(1.0)) < 0.02))),
    "explosion": explosion,
    "cannon": lambda r: mix(gunshot(r, 2.5, 1.8), explosion(r, 0.6) * 0.5),
    # weapons
    "rifle": lambda r: gunshot(r, 1.0),
    "pistol": lambda r: gunshot(r, 0.6, 0.6),
    "mg": lambda r: gunshot(r, 0.5, 0.25),
    "reload": lambda r: np.concatenate([G.clink(r, 2600), np.zeros(ns(0.09)), G.clink(r, 1900)]),
    "slash": lambda r: mix(whoosh_s(r, 0.25, 900, 5000), shing(r) * 0.5),
    "chop": lambda r: mix(whoosh_s(r, 0.22), (0.12, thock(r, 180))),
    "hit": lambda r: mix(whoosh_s(r, 0.2) * 0.6, (0.1, thock(r, 260))),
    "stab": lambda r: mix(whoosh_s(r, 0.18, 700, 3500), (0.1, thud(r) * 0.5)),
    "punch": lambda r: mix(whoosh_s(r, 0.15, 600, 2500) * 0.7, (0.08, slap(r))),
    "kick": lambda r: mix(whoosh_s(r, 0.18, 400, 2000) * 0.7, (0.1, thud(r))),
    "bow": twang,
    "sling": lambda r: mix(twang(r) * 0.6, slap(r) * 0.3),
    # tools
    "saw": rasp,
    "dig": lambda r: mix(thud(r) * 0.6, burst(r, 0.3, 300, 3000, 0.04, 0.8)),
    "clang": lambda r: mix(modal(1.2, [(1180, 1.0, 0.35), (2650, 0.7, 0.22), (4150, 0.5, 0.12), (6400, 0.3, 0.06)], r), burst(r, 1.2, 2000, 9000, 0.004, 1.0)),
    "drill": lambda r: buzz(r, 1.0),
    "sweep": lambda r: hiss(r, 0.4, 1500, 7000, 0.1, 0.2) * 0.6,
    # using things
    "sip": lambda r: hiss(r, 0.35, 500, 2200, 0.05, 0.1) * 0.5,
    "eat": lambda r: burst(r, 0.2, 1500, 7000, 0.02, 0.8),
    "paper": lambda r: mix(hiss(r, 0.35, 2000, 9000, 0.02, 0.15) * (0.5 + (r.random(ns(0.35)) < 0.05))),
    "ring": ring_tone,
    "tick": lambda r: G.clink(r, 3200, 0.06) * 0.6,
    "pop": pop,
    "pour": gurgle,
    "spray": lambda r: hiss(r, 0.9, 3000, 10000),
    "click": lambda r: G.clink(r, 2800, 0.05),
    "glass": lambda r: modal(0.9, [(2900, 0.6, 0.25), (4700, 0.4, 0.15), (7300, 0.2, 0.08)], r),
    # movement
    "step": lambda r: G.stroll_step(r) * 0.7,
    "rung": lambda r: mix(G.clink(r, 900, 0.15) * 0.6, G.stroll_step(r) * 0.4),
    "sit": lambda r: mix(cloth(r, 0.2), thud(r) * 0.4),
    "door": lambda r: mix(thud(r) * 0.7, (0.05, G.clink(r, 2200))),
    # hit reactions (cartoon: impact + a grunt, no gore)
    "hit_bullet": lambda r: mix(burst(r, 0.2, 400, 4000, 0.01, 1.0), (0.06, oof(r))),
    "hit_blade": lambda r: mix(slap(r) * 0.7, (0.05, oof(r))),
    "hit_arrow": lambda r: mix(thock(r, 300), (0.07, oof(r))),
    "hit_punch": lambda r: mix(slap(r), (0.05, oof(r))),
    "hit_kick": lambda r: mix(thud(r), (0.05, oof(r))),
    "hit_blunt": lambda r: mix(bonk(r), (0.06, oof(r))),
    "hit_blast": lambda r: mix((0.25, oof(r))),
}
GAIN = {"explosion": 0.9, "cannon": 0.9, "rifle": 0.7, "pistol": 0.6, "mg": 0.45, "step": 0.35, "rung": 0.4, "splash": 0.6,
        "fuse": 0.25, "drill": 0.35, "saw": 0.4, "spray": 0.25, "pour": 0.4, "sweep": 0.3, "ring": 0.35, "tick": 0.4}
