// Complete 32-Shot Narrative Timeline for "Seandainya Jepang Masih Menjajah Indonesia" (Channel: Seandainya)
// Locked to the 10 ElevenLabs v4 voiceover chapters (43,397 frames @ 30 fps = 24m 06.5s).
// Every shot switches the 3D background/map/battlefield (`setKind`) and cycles through multi-angle sub-beats
// (Wide Stage <-> Visual Map/Diagram Close-Up <-> Right Prop & Character Action MCU) every ~5.5 seconds.
import { LightName } from "./lights";
import { SetKind } from "./build";

export const FPS = 30;
export const TOTAL = 43397;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

export type ChapterDef = {
  num: number;
  stem: string;
  title: string;
  f_a: number;
  f_b: number;
};

export const CHAPTERS: ChapterDef[] = [
  { num: 1,  stem: "01_intro",                      title: "Intro: Seandainya 17 Agustus 1945 Kosong",       f_a: 0,     f_b: 2220  },
  { num: 2,  stem: "02_bab1a_pendudukan",           title: "Bab 1A: Pendudukan, Gun-Seikai & Romusha",       f_a: 2220,  f_b: 6578  },
  { num: 3,  stem: "03_bab1b_kelaparan_perlawanan", title: "Bab 1B: Kelaparan 1944, Mandor & Blitar",        f_a: 6578,  f_b: 10651 },
  { num: 4,  stem: "04_bab2_divergensi",            title: "Bab 2: Titik Divergensi & Peta Benteng",         f_a: 10651, f_b: 15705 },
  { num: 5,  stem: "05_bab3a_perang",               title: "Bab 3A: Perang Rakyat & Peta Titik Api",         f_a: 15705, f_b: 19192 },
  { num: 6,  stem: "06_bab3b_bertahan",             title: "Bab 3B: Balasan Kenpeitai & Blokade Laut",       f_a: 19192, f_b: 22600 },
  { num: 7,  stem: "07_bab4_twist",                 title: "Bab 4: Twist — Sang Penjajah Dijajah AS",        f_a: 22600, f_b: 29005 },
  { num: 8,  stem: "08_bab5_terburuk",              title: "Bab 5: Skenario Terburuk 35 Tahun (Korea)",      f_a: 29005, f_b: 34373 },
  { num: 9,  stem: "09_bab6_kemajuan",              title: "Bab 6: Kemajuan Jepang — Koloni vs Mitra",       f_a: 34373, f_b: 37589 },
  { num: 10, stem: "10_bab7_penutup",               title: "Bab 7: Keseimbangan Sejarah & 3 Pelajaran",      f_a: 37589, f_b: 43397 },
];

export type ShotDef = {
  id: number;
  a: number;
  b: number;
  setKind: SetKind;
  light: LightName;
  badgeTitle: string;
  badgeSub: string;
  badgeBg?: string;
  sunAz?: number;
  sunEl?: number;
};

export const SHOTS: ShotDef[] = [
  // ---- CHAPTER 1: 01_intro (0..2220) ----
  { id: 1,  a: 0,     b: 885,   setKind: "calendar_1945",  light: "golden", badgeTitle: "17 AGUSTUS 1945 KOSONG?",      badgeSub: "SEANDAINYA JEPANG TIDAK MENYERAH" }, // HERO 1 at f=120
  { id: 2,  a: 885,   b: 1655,  setKind: "map_nusantara",  light: "day",    badgeTitle: "4 PERTANYAAN BESAR",           badgeSub: "PERANG? KAPAN MERDEKA? LEBIH BAIK?" },
  { id: 3,  a: 1655,  b: 2220,  setKind: "calendar_1945",  light: "golden", badgeTitle: "BERDIRI DI ATAS FAKTA",        badgeSub: "ADA TWIST BESAR DI TENGAH CERITA!" },

  // ---- CHAPTER 2: 02_bab1a_pendudukan (2220..6578) ----
  { id: 4,  a: 2220,  b: 3170,  setKind: "map_nusantara",  light: "day",    badgeTitle: "8 MARET 1942: KALIJATI",       badgeSub: "SELURUH NUSANTARA JATUH KE JEPANG" },
  { id: 5,  a: 3170,  b: 4385,  setKind: "calendar_1945",  light: "golden", badgeTitle: "TONARIGUMI & GUN-SEIKAI",      badgeSub: "SEIKEREI WAJIB • UANG MILITER RUNTUH" },
  { id: 6,  a: 4385,  b: 5585,  setKind: "romusha_saketi", light: "golden", badgeTitle: "REL SAKETI–BAYAH (89 KM)",     badgeSub: "90.000 KORBAN ROMUSHA DI BANTEN!" }, // HERO 2 at f=5050
  { id: 7,  a: 5585,  b: 6578,  setKind: "romusha_saketi", light: "golden", badgeTitle: "300.000 ROMUSHA LUAR JAWA",    badgeSub: "HANYA ~70.000 YANG KEMBALI HIDUP" },

  // ---- CHAPTER 3: 03_bab1b_kelaparan_perlawanan (6578..10651) ----
  { id: 8,  a: 6578,  b: 7335,  setKind: "romusha_saketi", light: "golden", badgeTitle: "KELAPARAN JAWA 1944–1945",     badgeSub: "PADI DIRAMPAS • INDRAMAYU & CIREBON" },
  { id: 9,  a: 7335,  b: 8455,  setKind: "war_battle",     light: "golden", badgeTitle: "PERISTIWA MANDOR 1944",        badgeSub: "RAKYAT MELAWAN LEBIH DULU!" },
  { id: 10, a: 8455,  b: 9720,  setKind: "war_battle",     light: "day",    badgeTitle: "BLITAR 14 FEBRUARI 1945",      badgeSub: "SUPRIYADI & PETA BERONTAK TERBUKA!" },
  { id: 11, a: 9720,  b: 10651, setKind: "calendar_1945",  light: "golden", badgeTitle: "JANJI KOISO & BPUPKI",         badgeSub: "SEANDAINYA TANPA VACUUM OF POWER..." },

  // ---- CHAPTER 4: 04_bab2_divergensi (10651..15705) ----
  { id: 12, a: 10651, b: 11850, setKind: "map_asia",       light: "day",    badgeTitle: "TITIK DIVERGENSI 1945",        badgeSub: "SEANDAINYA BOM ATOM TERLAMBAT" },
  { id: 13, a: 11850, b: 13370, setKind: "romusha_saketi", light: "golden", badgeTitle: "BENTENG ASIA TENGGARA",        badgeSub: "BLOKADE LAUT → JEPANG MEMERAS RAKYAT" },
  { id: 14, a: 13370, b: 14770, setKind: "map_nusantara",  light: "day",    badgeTitle: "PETA BENTENG DAI-NIPPON",      badgeSub: "JAWA PUSAT • SUMATRA & KALIMANTAN BBM" }, // HERO 3 at f=13650
  { id: 15, a: 14770, b: 15705, setKind: "calendar_1945",  light: "golden", badgeTitle: "17 AGUSTUS TANPA MERDEKA",     badgeSub: "MERAH PUTIH TIDAK NAIK • KERJA PAKSA" },

  // ---- CHAPTER 5: 05_bab3a_perang (15705..19192) ----
  { id: 16, a: 15705, b: 17340, setKind: "war_battle",     light: "day",    badgeTitle: "PERANG RAKYAT SEMESTA!",       badgeSub: "SABOTASE MALAM & DESA DUA WAJAH" }, // HERO 4 at f=16560
  { id: 17, a: 17340, b: 18060, setKind: "war_battle",     light: "golden", badgeTitle: "JEMBATAN REL DIDINAMIT!",      badgeSub: "MARKAS KENPEITAI DISERBU GERILYA" },
  { id: 18, a: 18060, b: 19192, setKind: "map_nusantara",  light: "day",    badgeTitle: "TITIK API DI SEMUA PULAU",     badgeSub: "JAWA • SUMATRA • KALIMANTAN • MALUKU" },

  // ---- CHAPTER 6: 06_bab3b_bertahan (19192..22600) ----
  { id: 19, a: 19192, b: 20355, setKind: "war_battle",     light: "golden", badgeTitle: "TEROR BALASAN KENPEITAI",      badgeSub: "GERILYA TANPA MARKAS TAK BISA MATI!" },
  { id: 20, a: 20355, b: 21390, setKind: "romusha_saketi", light: "golden", badgeTitle: "PASUKAN JEPANG TERJEBAK!",     badgeSub: "MINYAK TIPIS • BENSIN CAMPUR ALKOHOL" },
  { id: 21, a: 21390, b: 22600, setKind: "map_asia",       light: "day",    badgeTitle: "SEKUTU REBUT PELABUHAN",       badgeSub: "LOGISTIK TOKYO PUTUS TOTAL!" },

  // ---- CHAPTER 7: 07_bab4_twist (22600..29005) ----
  { id: 22, a: 22600, b: 24380, setKind: "tokyo_scap",     light: "golden", badgeTitle: "TWIST: PENJAJAH DIJAJAH!",     badgeSub: "AS & MACARTHUR DUDUKI JEPANG (1945–1952)", badgeBg: "#2ecc71" }, // HERO 5 at f=23560
  { id: 23, a: 24380, b: 25840, setKind: "tokyo_scap",     light: "day",    badgeTitle: "MILITER JEPANG DIBUBARKAN",    badgeSub: "PASUKAN DI NUSANTARA JADI TERISOLASI" },
  { id: 24, a: 25840, b: 26965, setKind: "calendar_1945",  light: "golden", badgeTitle: "2 JALUR KEPEMIMPINAN RI",      badgeSub: "BAWAH TANAH & PEMERINTAH PENGASINGAN" },
  { id: 25, a: 26965, b: 29005, setKind: "map_asia",       light: "day",    badgeTitle: "MERDEKA: 1949 – 1953!",        badgeSub: "KEMERDEKAAN HANYA MUNDUR, BUKAN BATAL!", badgeBg: "#2ecc71" }, // HERO 6 at f=27400

  // ---- CHAPTER 8: 08_bab5_terburuk (29005..34373) ----
  { id: 26, a: 29005, b: 30710, setKind: "colony_1950",    light: "space",  badgeTitle: "CERMIN KOREA (1910–1945)",     badgeSub: "35 TAHUN: BAHASA & NAMA DIHAPUS!" },
  { id: 27, a: 30710, b: 32450, setKind: "colony_1950",    light: "night",  badgeTitle: "CERMIN MANCHUKUO & TAIWAN",    badgeSub: "MAJU UNTUK PENGUASA • RAKYAT KELAS DUA" }, // HERO 7 at f=32100
  { id: 28, a: 32450, b: 34373, setKind: "colony_1950",    light: "space",  badgeTitle: "KELAPARAN BERJALAN 35 TAHUN",  badgeSub: "ROMUSHA GENERASI BERIKUTNYA" },

  // ---- CHAPTER 9: 09_bab6_kemajuan (34373..37589) ----
  { id: 29, a: 34373, b: 36275, setKind: "modern_mitra",   light: "day",    badgeTitle: "KEMAJUAN JEPANG HARI INI",     badgeSub: "LAHIR DARI NEGARA DAGANG, BUKAN KOLONI!", badgeBg: "#2ecc71" }, // HERO 8 at f=35050
  { id: 30, a: 36275, b: 37589, setKind: "modern_mitra",   light: "golden", badgeTitle: "BERDIRI SEJAJAR MERDEKA!",     badgeSub: "MITRA MRT & TEKNOLOGI SETELAH MERDEKA", badgeBg: "#2ecc71" },

  // ---- CHAPTER 10: 10_bab7_penutup (37589..43397) ----
  { id: 31, a: 37589, b: 39780, setKind: "war_battle",     light: "golden", badgeTitle: "3,5 TAHUN PALING BRUTAL",      badgeSub: "PINTU TERBUKA KARENA RAKYAT MENEKANNYA!" },
  { id: 32, a: 39780, b: TOTAL, setKind: "modern_mitra",   light: "golden", badgeTitle: "3 PELAJARAN SEANDAINYA",       badgeSub: "MERDEKA KARENA PERLAWANAN RAKYAT!", badgeBg: "#2ecc71" },
];

export const FLASH_FRAMES = [595, 11724, 15705, 22600, 29005, 34373];

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

export type WorldState = {
  id: number;
  f: number;
  t: number;
  u: number;
  setKind: SetKind;
  showStars: boolean;
  showMoon: boolean;
};

export const worldState = (id: number, f: number): WorldState => {
  const s = SHOTS[id - 1];
  const u = clamp01((f - s.a) / Math.max(1, s.b - s.a));
  const t = f / FPS;
  const showStars = s.light === "night" || s.light === "space";
  const showMoon = s.light === "night" || s.light === "space";
  return { id, f, t, u, setKind: s.setKind, showStars, showMoon };
};

// ---------------- Dynamic Multi-Angle Camera Grammar ----------------
export type CamPose = { pos: V3; look: V3; fov: number; roll: number };

const pushK = (f: number, f0: number, rate: number, punch = 0, n = 24) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 7, (n - i - 0.5) / 7));
  return Math.exp(-s);
};

const dolly = (pos: V3, look: V3, k: number, fov = 38, roll = 0): CamPose => ({
  pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k],
  look,
  fov,
  roll,
});

const mixPose = (a: CamPose, b: CamPose, k: number): CamPose => ({
  pos: [a.pos[0] + (b.pos[0] - a.pos[0]) * k, a.pos[1] + (b.pos[1] - a.pos[1]) * k, a.pos[2] + (b.pos[2] - a.pos[2]) * k],
  look: [a.look[0] + (b.look[0] - a.look[0]) * k, a.look[1] + (b.look[1] - a.look[1]) * k, a.look[2] + (b.look[2] - a.look[2]) * k],
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});

// Exact Hero Still frames (always framed in crisp Wide Stage view so every board, map, prop, and character is visible)
const HERO_FRAMES = [120, 5050, 13650, 16560, 23560, 27400, 32100, 35050];

export const camAt = (id: number, f: number): CamPose => {
  const s = SHOTS[id - 1];
  const isMap = s.setKind === "map_nusantara" || s.setKind === "map_asia";

  // Near any Hero Still frame, hold the clean Wide Stage framing (or Dedicated Map Spotlight for map sets!)
  for (const hf of HERO_FRAMES) {
    if (Math.abs(f - hf) <= 35) {
      const k = pushK(f, hf - 35, 0.0012);
      if (isMap) {
        return dolly([0.0, 1.65, 3.10], [0.0, 1.58, -2.65], k, 38, 0.0);
      }
      return dolly([0.0, 1.74, 5.80], [0.0, 1.34, -1.25], k, 39, 0.012);
    }
  }

  // Divide each shot into 165-frame (~5.5s) multi-angle sub-beats so the camera never stays static:
  const localF = Math.max(0, f - s.a);
  const BEAT_LEN = 165;
  const beatIdx = Math.floor(localF / BEAT_LEN);
  const beatF = s.a + beatIdx * BEAT_LEN;
  const subF = localF % BEAT_LEN;

  const poseForBeat = (bIdx: number, frame: number, f0: number): CamPose => {
    const mode = bIdx % 4;
    if (isMap) {
      // Dedicated Map Spotlight angles (NO characters, zooming across the map & 3D islands!)
      if (mode === 0) return dolly([0.0, 1.65, 3.10], [0.0, 1.58, -2.65], pushK(frame, f0, 0.0016, 0.004, 22), 38, 0.0);
      if (mode === 1) return dolly([-0.24, 1.62, 2.50], [-0.20, 1.58, -2.80], pushK(frame, f0, 0.0018, 0.0045, 22), 35, -0.012);
      if (mode === 2) return dolly([0.24, 1.62, 2.50], [0.20, 1.56, -2.80], pushK(frame, f0, 0.0018, 0.0045, 22), 35, 0.012);
      return dolly([0.0, 1.78, 3.25], [0.0, 1.48, -2.55], pushK(frame, f0, 0.0016, 0.004, 22), 38, 0.0);
    }
    if (mode === 0) {
      return dolly([0.0, 1.74, 5.80], [0.0, 1.34, -1.25], pushK(frame, f0, 0.0018, 0.0045, 22), 39, 0.012);
    } else if (mode === 1) {
      return dolly([-0.62, 1.65, 3.55], [-0.74, 1.62, -2.65], pushK(frame, f0, 0.0022, 0.0055, 22), 35, -0.04);
    } else if (mode === 2) {
      return dolly([0.52, 1.44, 3.25], [0.55, 1.40, -1.25], pushK(frame, f0, 0.0024, 0.006, 22), 34, 0.045);
    } else {
      return dolly([-0.38, 1.28, 4.35], [0.05, 1.42, -1.15], pushK(frame, f0, 0.0020, 0.005, 22), 37, -0.035);
    }
  };

  const cur = poseForBeat(beatIdx, f, beatF);
  // Smooth 20-frame glide from previous beat on odd transitions; hard cut on even transitions
  if (beatIdx > 0 && subF < 20 && beatIdx % 2 === 1) {
    const prev = poseForBeat(beatIdx - 1, f, beatF - BEAT_LEN);
    return mixPose(prev, cur, glide(subF / 20));
  }

  // Subtle camera kick on shot transitions & dramatic beats
  let kick = 0;
  if (localF < 8) {
    const dt = localF / 8;
    kick = (1 - dt) ** 2 * (localF % 2 ? -1 : 1) * 0.016;
  }
  return { ...cur, roll: cur.roll + kick };
};

export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  const s = shotAt(f);
  if (s.setKind === "map_nusantara" || s.setKind === "map_asia") {
    return { cInf: 0, focus: () => [0.0, 1.62, -2.85] }; // Zero blur on map shots so 100% of map text is razor-sharp!
  }
  for (const hf of HERO_FRAMES) {
    if (Math.abs(f - hf) <= 35) return { cInf: 2, focus: () => [0.0, 1.38, -0.60] };
  }
  return { cInf: 4, focus: () => [0.0, 1.38, -0.65] };
};
