// Timeline of "Alasan Indonesia Merdeka yang Sekolah Tidak Ajarkan"
// 16 shots & 44+ multi-angle camera beats locked to voice/merdeka.srt (3435 frames @ 30 fps = 114.50 s).
// Follows skill/references/reports/motion.md & GUIDELINES.md:
// - Continuous slow push-ins (0.22-0.35%/f, 0.65%/f punch on emphasis words)
// - Symmetric smootherstep glides (18-26 f)
// - Hard cuts on dramatic reframes (Macro Prop Inserts, Low-Angle Dutch Tilts, High-Angle Cranes)
// - 7-frame sign-flipping impact kicks on punchline words; 4-frame white flash at FLASH_AT = 338.
import { LightName } from "./lights";

export const FPS = 30;
export const TOTAL = 3435;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export type ShotDef = {
  id: number;
  a: number;
  b: number;
  light: LightName;
  sunAz?: number;
  sunEl?: number;
};

export const SHOTS: ShotDef[] = [
  { id: 1,  a: 0,    b: 195,  light: "golden", sunAz: 52, sunEl: 38 }, // 0.0-6.5s: Hook "Jepang kalah perang." (HERO 1 at f=90)
  { id: 2,  a: 195,  b: 342,  light: "golden", sunAz: 50, sunEl: 38 }, // 6.5-11.4s: "15 Agustus 1945, Jepang menyerah tanpa syarat." -> FLASH_AT 338
  { id: 3,  a: 342,  b: 515,  light: "night",  sunAz: 46, sunEl: 36 }, // 11.4-17.2s: "kehilangan wewenang. Tapi Sekutu juga belum datang."
  { id: 4,  a: 515,  b: 775,  light: "night",  sunAz: 48, sunEl: 36 }, // 17.2-25.8s: "negeri ini berjalan tanpa penguasa... jaga status quo."
  { id: 5,  a: 775,  b: 1100, light: "day",    sunAz: 58, sunEl: 45 }, // 25.8-36.7s: "Dari 1943, Jepang melatih puluhan ribu pemuda di PETA dan Heiho." (HERO 2 at f=960)
  { id: 6,  a: 1100, b: 1240, light: "day",    sunAz: 54, sunEl: 43 }, // 36.7-41.3s: "Bukan karena sayang, tapi karena butuh tentara untuk perangnya."
  { id: 7,  a: 1240, b: 1468, light: "day",    sunAz: 56, sunEl: 44 }, // 41.3-48.9s: "kita tidak mulai dari nol... tahu cara mengorganisasi pasukan."
  { id: 8,  a: 1468, b: 1655, light: "golden", sunAz: 52, sunEl: 39 }, // 48.9-55.2s: "dini hari 16 Agustus, golongan muda membawa Soekarno-Hatta ke Rengasdengklok."
  { id: 9,  a: 1655, b: 1898, light: "golden", sunAz: 54, sunEl: 40 }, // 55.2-63.3s: "memaksa proklamasi segera... Dua hari kemudian, kemerdekaan diumumkan." (HERO 3 at f=1750)
  { id: 10, a: 1898, b: 2020, light: "night",  sunAz: 46, sunEl: 36 }, // 63.3-67.3s: "Lalu senjatanya? Datang dari gudang Jepang yang ditinggalkan."
  { id: 11, a: 2020, b: 2216, light: "night",  sunAz: 48, sunEl: 37 }, // 67.3-73.9s: "Di Surabaya, gudang Don Bosco... direbut di awal Oktober."
  { id: 12, a: 2216, b: 2435, light: "night",  sunAz: 48, sunEl: 37 }, // 73.9-81.2s: "Bekas PETA dan Heiho resmi jadi cikal bakal TNI, 5 Oktober 1945." (HERO 4 at f=2300)
  { id: 13, a: 2435, b: 2675, light: "golden", sunAz: 52, sunEl: 39 }, // 81.2-89.2s: "Untungnya, Jepang pernah melatih... Sialnya, itu memang rencana mereka..."
  { id: 14, a: 2675, b: 2922, light: "space",  sunAz: 48, sunEl: 36 }, // 89.2-97.4s: "dipertahankan empat setengah tahun. Lewat perang, diplomasi, tekanan dunia."
  { id: 15, a: 2922, b: 3100, light: "golden", sunAz: 52, sunEl: 40 }, // 97.4-103.3s: "27 Desember 1949, Belanda mengakuinya resmi." (HERO 5 at f=3000)
  { id: 16, a: 3100, b: TOTAL, light: "golden", sunAz: 54, sunEl: 42 }, // 103.3-114.5s: "meninggalkan kunci di pintu. Dan kita... yang membukanya."
];

export const XFADE: Record<number, number> = { 5: 6, 8: 6, 10: 6, 13: 6, 14: 6, 15: 8 };
export const FLASH_AT = 338;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) {
      return [
        { id: s.id - 1, alpha: 1 },
        { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) },
      ];
    }
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export type WorldState = {
  id: number;
  f: number;
  t: number;
  u: number;
  setKind: "vacuum" | "peta" | "rengas" | "armory" | "kmb";
  showStars: boolean;
  showMoon: boolean;
};

export const worldState = (id: number, f: number): WorldState => {
  const s = SHOTS[id - 1];
  const u = clamp01((f - s.a) / Math.max(1, s.b - s.a));
  const t = f / FPS;

  let setKind: WorldState["setKind"] = "vacuum";
  let showStars = false;
  let showMoon = false;

  if (id >= 1 && id <= 4) {
    setKind = "vacuum";
    showStars = id >= 3;
    showMoon = id >= 3;
  } else if ((id >= 5 && id <= 7) || id === 13) {
    setKind = "peta";
  } else if (id === 8 || id === 9) {
    setKind = "rengas";
  } else if (id >= 10 && id <= 12) {
    setKind = "armory";
    showStars = true;
    showMoon = true;
  } else {
    setKind = "kmb";
    showStars = id === 14;
  }

  return {
    id,
    f,
    t,
    u,
    setKind,
    showStars,
    showMoon,
  };
};

// ---------------- Reference Camera Engine ----------------
export type CamPose = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<CamPose> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };

const mix = (a: CamPose, b: CamPose, k: number): CamPose => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3,
  look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): CamPose => ({ fov: 38, roll: 0, ...c });
const run = (keys: Key[], f: number): CamPose => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 22)));
  }
  return cur;
};
const T = (f: number) => f / FPS;

/** Push-in factor since f0: subject grows ~rate per frame; `punch` raises it for the first n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 28) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 7, (n - i - 0.5) / 7));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<CamPose> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<CamPose> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });

// ---- Multi-Angle Beat Framings ----
// Shot 1 (0..195): Low-angle Dutch on Pemuda -> Whip-glide to HERO 1 (f=90) Markas Jepang Wide -> Hard cut MCU on Taicho ("Jepang kalah perang!")
const S1a = (f: number) => dolly([-0.64, 1.18, 3.05], [-0.55, 1.38, -0.65], pushK(f, 0, 0.0032, 0.0068, 18), { fov: 35, roll: -0.055 });
const S1b = (f: number) => dolly([0.0, 1.74, 5.85], [0.0, 1.34, -1.25], pushK(f, 42, 0.0020, 0.005, 22), { fov: 39, roll: 0.015 });
const S1c = (f: number) => dolly([0.52, 1.36, 2.65], [0.58, 1.42, -0.58], pushK(f, 148, 0.0038, 0.0085, 22), { fov: 33, roll: 0.065 });

// Shot 2 (195..342): Macro Insert on 1945 Philips Radio -> Whip-glide to Surrender Flag -> Dutch snap into White Flash at 338
const S2a = (f: number) => dolly([-0.68, 1.38, 2.25], [-0.80, 1.15, -2.05], pushK(f, 195, 0.0032, 0.007, 22), { fov: 33, roll: -0.05 });
const S2b = (f: number) => dolly([0.62, 1.48, 2.45], [0.78, 1.38, -2.05], pushK(f, 255, 0.0032, 0.007, 20), { fov: 34, roll: 0.05 });
const S2c = (f: number) => dolly([0.18, 1.38, 2.55], [0.0, 1.44, -0.50], pushK(f, 298, 0.0038, 0.0085, 22), { fov: 32, roll: -0.065 });

// Shot 3 (342..515): Night Vacuum of Power establishing -> Hard cut MCU on Pemuda listening to underground radio ("Sekutu juga belum datang")
const S3a = (f: number) => dolly([-0.48, 1.72, 5.45], [-0.05, 1.36, -1.25], pushK(f, 342, 0.0024), { fov: 39, roll: -0.03 });
const S3b = (f: number) => dolly([-0.42, 1.44, 2.75], [-0.58, 1.40, -0.58], pushK(f, 442, 0.0034, 0.0072, 22), { fov: 33, roll: 0.05 });

// Shot 4 (515..775): High-angle crane on "TANPA PENGUASA" board -> Lateral glide -> Hard cut ECU on frozen Taicho ("menunggu, jaga status quo")
const S4a = (f: number) => dolly([-0.35, 2.05, 3.35], [0.0, 1.85, -3.20], pushK(f, 515, 0.0028, 0.006, 22), { fov: 35, roll: -0.04 });
const S4b = (f: number) => dolly([0.38, 1.64, 4.75], [0.05, 1.38, -1.05], pushK(f, 605, 0.0024), { fov: 38, roll: 0.03 });
const S4c = (f: number) => dolly([0.54, 1.38, 2.48], [0.62, 1.38, -0.58], pushK(f, 695, 0.0035, 0.0075, 22), { fov: 32, roll: -0.055 });

// Shot 5 (775..1100): Low heroic push-in on PETA Camp -> Glide to HERO 2 (f=960) Wide PETA & Heiho Parade -> Hard cut Macro Insert on Rifle Rack
const S5a = (f: number) => dolly([-0.62, 1.16, 4.25], [-0.12, 1.48, -1.35], pushK(f, 775, 0.0026, 0.006, 24), { fov: 37, roll: -0.045 });
const S5b = (f: number) => dolly([0.0, 1.74, 5.80], [0.0, 1.34, -1.25], pushK(f, 895, 0.0020), { fov: 39, roll: 0.015 });
const S5c = (f: number) => dolly([0.68, 1.42, 2.35], [0.82, 1.25, -2.10], pushK(f, 1025, 0.0034, 0.0075, 22), { fov: 33, roll: 0.05 });

// Shot 6 (1100..1240): OTS behind Taicho watching PETA drill -> Hard cut Dutch MCU on Taicho ("butuh tentara untuk perangnya")
const S6a = (f: number) => dolly([0.62, 1.58, 4.35], [-0.18, 1.38, -1.05], pushK(f, 1100, 0.0026), { fov: 37, roll: 0.04 });
const S6b = (f: number) => dolly([0.48, 1.38, 2.65], [0.62, 1.42, -0.62], pushK(f, 1168, 0.0035, 0.0075, 22), { fov: 33, roll: -0.06 });

// Shot 7 (1240..1468): Heroic Low-Angle Dutch on Komandan PETA ("tidak mulai dari nol!") -> Crane glide across battalion formation
const S7a = (f: number) => dolly([-0.38, 1.12, 2.85], [-0.45, 1.44, -0.55], pushK(f, 1240, 0.0034, 0.0075, 24), { fov: 34, roll: -0.055 });
const S7b = (f: number) => dolly([0.32, 1.68, 4.95], [0.0, 1.36, -1.15], pushK(f, 1350, 0.0024), { fov: 38, roll: 0.03 });

// Shot 8 (1468..1655): Macro Insert on Rengasdengklok 04:00 Typewriter Desk -> Whip-glide to Pemuda & Soekarno-Hatta Two-Shot
const S8a = (f: number) => dolly([-0.68, 1.36, 2.25], [-0.80, 1.05, -2.05], pushK(f, 1468, 0.0032, 0.007, 22), { fov: 33, roll: -0.05 });
const S8b = (f: number) => dolly([0.42, 1.56, 4.45], [-0.05, 1.38, -0.95], pushK(f, 1545, 0.0026, 0.006, 24), { fov: 37, roll: 0.04 });

// Shot 9 (1655..1898): Tight MCU on Pemuda ("tanpa nunggu izin siapa-siapa!") -> Crane pull-back to HERO 3 (f=1750) Proklamasi Stage -> Low tilt on Bung Karno & Flag
const S9a = (f: number) => dolly([-0.48, 1.42, 2.55], [-0.62, 1.42, -0.58], pushK(f, 1655, 0.0035, 0.0075, 20), { fov: 33, roll: -0.06 });
const S9b = (f: number) => dolly([0.0, 1.74, 5.80], [0.0, 1.34, -1.25], pushK(f, 1715, 0.0020), { fov: 39, roll: 0.015 });
const S9c = (f: number) => dolly([0.38, 1.18, 2.85], [0.15, 1.52, -0.65], pushK(f, 1815, 0.0034, 0.0075, 22), { fov: 34, roll: 0.05 });

// Shot 10 (1898..2020): Armory reveal -> Hard cut Macro Insert on Don Bosco Japanese Weapon Crates ("Lalu senjatanya?")
const S10a = (f: number) => dolly([-0.52, 1.62, 4.85], [-0.08, 1.36, -1.15], pushK(f, 1898, 0.0028), { fov: 38, roll: -0.045 });
const S10b = (f: number) => dolly([-0.68, 1.42, 2.25], [-0.82, 1.18, -2.08], pushK(f, 1952, 0.0035, 0.0075, 20), { fov: 33, roll: 0.055 });

// Shot 11 (2020..2216): Wide diagonal Surabaya Armory -> Hard cut Low-Angle Dutch on Pemuda & Komandan PETA seizing Gudang Don Bosco
const S11a = (f: number) => dolly([0.62, 1.68, 5.15], [-0.05, 1.36, -1.15], pushK(f, 2020, 0.0025), { fov: 38, roll: 0.035 });
const S11b = (f: number) => dolly([-0.38, 1.14, 2.75], [-0.32, 1.42, -0.55], pushK(f, 2115, 0.0034, 0.0075, 24), { fov: 34, roll: -0.06 });

// Shot 12 (2216..2435): Crane to HERO 4 (f=2300) Wide TNI Formation & Don Bosco Armory -> Hard cut MCU on 5 Oktober 1945 TNI Podium
const S12a = (f: number) => dolly([0.0, 1.74, 5.80], [0.0, 1.34, -1.25], pushK(f, 2216, 0.0020), { fov: 39, roll: -0.015 });
const S12b = (f: number) => dolly([0.52, 1.38, 2.55], [0.68, 1.36, -1.25], pushK(f, 2358, 0.0035, 0.0075, 22), { fov: 33, roll: 0.055 });

// Shot 13 (2435..2675): Deadpan double line: "Untungnya..." (Heroic Komandan PETA) -> Hard cut "Sialnya..." (Dazed Taicho Kenji)
const S13a = (f: number) => dolly([-0.32, 1.44, 3.25], [-0.35, 1.40, -0.55], pushK(f, 2435, 0.0030, 0.0065, 24), { fov: 35, roll: -0.04 });
const S13b = (f: number) => dolly([0.48, 1.42, 2.48], [0.58, 1.42, -0.55], pushK(f, 2550, 0.0038, 0.0085, 24), { fov: 32, roll: 0.075 });

// Shot 14 (2675..2922): Crane push-in on "PERJUANGAN 4,5 TAHUN" board -> Two-shot of TNI & Diplomat Bung Hatta ("perang, diplomasi, tekanan dunia")
const S14a = (f: number) => dolly([-0.42, 1.92, 3.45], [0.0, 1.82, -3.20], pushK(f, 2675, 0.0028, 0.006, 24), { fov: 35, roll: -0.045 });
const S14b = (f: number) => dolly([0.44, 1.56, 4.45], [0.0, 1.38, -0.95], pushK(f, 2810, 0.0026, 0.006, 24), { fov: 37, roll: 0.04 });

// Shot 15 (2922..3100): Macro Insert on KMB Treaty Table & Gavel -> Pull-back to HERO 5 (f=3000) Wide KMB 1949 & Door of Independence
const S15a = (f: number) => dolly([-0.68, 1.38, 2.28], [-0.82, 1.05, -2.08], pushK(f, 2922, 0.0032, 0.007, 20), { fov: 33, roll: -0.05 });
const S15b = (f: number) => dolly([0.0, 1.74, 5.80], [0.0, 1.34, -1.25], pushK(f, 2968, 0.0020), { fov: 39, roll: 0.015 });

// Shot 16 (3100..3435): MCU on Bung Karno ("bukan Jepang yang memberi...") -> Hard cut Macro Insert on Giant Door & Golden Key ("kunci di pintu") -> Final Heroic Push-In ("kita yang membukanya!")
const S16a = (f: number) => dolly([-0.36, 1.46, 3.15], [-0.25, 1.40, -0.55], pushK(f, 3100, 0.0030, 0.0065, 22), { fov: 35, roll: -0.04 });
const S16b = (f: number) => dolly([0.68, 1.48, 2.25], [0.82, 1.42, -2.02], pushK(f, 3200, 0.0035, 0.0075, 22), { fov: 33, roll: 0.055 });
const S16c = (f: number) => zoom([0.08, 1.54, 3.65], [0.0, 1.40, -0.65], 36, pushK(f, 3304, 0.0032, 0.0075, 26), { roll: -0.03 });

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: S1a },
    { f: 42, dur: 20, s: S1b },    // Settles into HERO 1 at f=90
    { f: 148, cut: true, s: S1c }, // Hard cut on "Jepang kalah perang"
  ],
  2: [
    { f: 195, s: S2a },
    { f: 255, dur: 18, s: S2b },
    { f: 298, cut: true, s: S2c }, // Snap zoom into White Flash at 338
  ],
  3: [
    { f: 342, s: S3a },
    { f: 442, cut: true, s: S3b },
  ],
  4: [
    { f: 515, s: S4a },
    { f: 605, dur: 20, s: S4b },
    { f: 695, cut: true, s: S4c },
  ],
  5: [
    { f: 775, s: S5a },
    { f: 895, dur: 22, s: S5b },   // Settles into HERO 2 at f=960
    { f: 1025, cut: true, s: S5c },
  ],
  6: [
    { f: 1100, s: S6a },
    { f: 1168, cut: true, s: S6b },
  ],
  7: [
    { f: 1240, s: S7a },
    { f: 1350, dur: 22, s: S7b },
  ],
  8: [
    { f: 1468, s: S8a },
    { f: 1545, dur: 20, s: S8b },
  ],
  9: [
    { f: 1655, s: S9a },
    { f: 1715, dur: 18, s: S9b },  // Settles into HERO 3 at f=1750
    { f: 1815, cut: true, s: S9c },
  ],
  10: [
    { f: 1898, s: S10a },
    { f: 1952, cut: true, s: S10b },
  ],
  11: [
    { f: 2020, s: S11a },
    { f: 2115, cut: true, s: S11b },
  ],
  12: [
    { f: 2216, s: S12a },          // Settles into HERO 4 at f=2300
    { f: 2358, cut: true, s: S12b },
  ],
  13: [
    { f: 2435, s: S13a },
    { f: 2550, cut: true, s: S13b },
  ],
  14: [
    { f: 2675, s: S14a },
    { f: 2810, dur: 20, s: S14b },
  ],
  15: [
    { f: 2922, s: S15a },
    { f: 2968, dur: 18, s: S15b }, // Settles into HERO 5 at f=3000
  ],
  16: [
    { f: 3100, s: S16a },
    { f: 3200, cut: true, s: S16b },
    { f: 3304, dur: 20, s: S16c },
  ],
};

// Impact kicks on punchline words & hard angle cuts
export const KICKS: [number, number][] = [
  [1.40, 0.85],   // whip-glide to Hero 1 (f=42)
  [4.93, 1.25],   // "Jepang kalah perang" (f=148)
  [9.93, 1.10],   // "menyerah tanpa syarat" (f=298)
  [11.27, 1.45],  // FLASH_AT (f=338)
  [19.20, 1.10],  // "tanpa penguasa" (f=576)
  [23.17, 1.00],  // "jaga status quo" (f=695)
  [33.80, 1.15],  // "PETA dan Heiho" (f=1014)
  [43.20, 1.25],  // "tidak mulai dari nol" (f=1296)
  [53.00, 1.15],  // "Rengasdengklok" (f=1590)
  [57.20, 1.15],  // "tanpa nunggu izin" (f=1716)
  [65.07, 1.20],  // "gudang Jepang" (f=1952)
  [70.50, 1.20],  // "gudang Don Bosco" (f=2115)
  [78.60, 1.30],  // "5 Oktober 1945" (f=2358)
  [85.00, 1.20],  // "Sialnya, itu memang rencana mereka" (f=2550)
  [99.50, 1.20],  // "27 Desember 1949" (f=2985)
  [106.67, 1.15], // "meninggalkan kunci di pintu" (f=3200)
  [110.13, 1.25], // "kita... yang membukanya!" (f=3304)
];

const kickRoll = (t: number) => {
  let r = 0;
  for (const [t0, amp] of KICKS) {
    const dt = t - t0;
    if (dt >= 0 && dt < 0.25) r += amp * (1 - dt / 0.25) ** 2 * (Math.floor(dt * 32) % 2 ? -1 : 1) * 0.015;
  }
  return r;
};

export const camAt = (id: number, f: number): CamPose => {
  const c = run(CAMS[id], f);
  return { ...c, roll: c.roll + kickRoll(T(f)) };
};

// ---------------- Depth of Field Schedule ----------------
type DofKey = { f: number; cInf: number; focus?: (f: number) => V3 };
const DOFS: DofKey[] = [
  { f: 0,    cInf: 11, focus: () => [-0.55, 1.42, -0.65] },
  { f: 42,   cInf: 4,  focus: () => [0.0, 1.38, -0.60] },   // Crisp Hero 1 at f=90
  { f: 148,  cInf: 13, focus: () => [0.58, 1.42, -0.58] },
  { f: 195,  cInf: 11, focus: () => [-0.80, 1.15, -2.05] },
  { f: 298,  cInf: 13, focus: () => [0.0, 1.44, -0.50] },
  { f: 342,  cInf: 6,  focus: () => [0.0, 1.38, -0.85] },
  { f: 442,  cInf: 13, focus: () => [-0.58, 1.40, -0.58] },
  { f: 515,  cInf: 6,  focus: () => [0.0, 1.85, -3.20] },
  { f: 695,  cInf: 13, focus: () => [0.62, 1.38, -0.58] },
  { f: 775,  cInf: 7,  focus: () => [-0.12, 1.48, -1.35] },
  { f: 895,  cInf: 4,  focus: () => [0.0, 1.38, -0.60] },   // Crisp Hero 2 at f=960
  { f: 1025, cInf: 11, focus: () => [0.82, 1.25, -2.10] },
  { f: 1100, cInf: 8,  focus: () => [-0.18, 1.38, -1.05] },
  { f: 1168, cInf: 13, focus: () => [0.62, 1.42, -0.62] },
  { f: 1240, cInf: 12, focus: () => [-0.45, 1.44, -0.55] },
  { f: 1350, cInf: 6,  focus: () => [0.0, 1.36, -1.15] },
  { f: 1468, cInf: 11, focus: () => [-0.80, 1.05, -2.05] },
  { f: 1545, cInf: 7,  focus: () => [-0.05, 1.38, -0.95] },
  { f: 1655, cInf: 12, focus: () => [-0.62, 1.42, -0.58] },
  { f: 1715, cInf: 4,  focus: () => [0.0, 1.38, -0.60] },   // Crisp Hero 3 at f=1750
  { f: 1815, cInf: 11, focus: () => [0.15, 1.52, -0.65] },
  { f: 1898, cInf: 7,  focus: () => [-0.08, 1.36, -1.15] },
  { f: 1952, cInf: 12, focus: () => [-0.82, 1.18, -2.08] },
  { f: 2020, cInf: 6,  focus: () => [-0.05, 1.36, -1.15] },
  { f: 2115, cInf: 12, focus: () => [-0.32, 1.42, -0.55] },
  { f: 2216, cInf: 4,  focus: () => [0.0, 1.38, -0.60] },   // Crisp Hero 4 at f=2300
  { f: 2358, cInf: 11, focus: () => [0.68, 1.36, -1.25] },
  { f: 2435, cInf: 10, focus: () => [-0.35, 1.40, -0.55] },
  { f: 2550, cInf: 13, focus: () => [0.58, 1.42, -0.55] },
  { f: 2675, cInf: 6,  focus: () => [0.0, 1.82, -3.20] },
  { f: 2810, cInf: 8,  focus: () => [0.0, 1.38, -0.95] },
  { f: 2922, cInf: 11, focus: () => [-0.82, 1.05, -2.08] },
  { f: 2968, cInf: 4,  focus: () => [0.0, 1.38, -0.60] },   // Crisp Hero 5 at f=3000
  { f: 3100, cInf: 10, focus: () => [-0.25, 1.40, -0.55] },
  { f: 3200, cInf: 11, focus: () => [0.82, 1.42, -2.02] },
  { f: 3304, cInf: 9,  focus: () => [0.0, 1.40, -0.65] },
];

export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let cur = DOFS[0];
  for (const d of DOFS) {
    if (f < d.f) break;
    cur = d;
  }
  return cur;
};
