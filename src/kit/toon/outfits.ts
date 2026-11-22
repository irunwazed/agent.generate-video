// KIT TOON: the Outfit type + a library of ready outfits (generic archetypes, not real persons).
// Use them by name in a project: cast: { budi: OUTFITS.pejuang, siti: { ...OUTFITS.ibu, hatCol: "#8a3b5c" } }.
// Weapons and tools are NOT outfit flags: give a character `hold: { prop: "rifle", style: "port" }` (see props).
// Gallery: npm run kit:gallery -> out/kit/gallery/KitCastGallery_*.jpg (every outfit, front / side / back).
import { INK } from "./pen";
import type { FlagName } from "./flags";

export type Build = "adult" | "stout" | "kid" | "slim" | "big";
export type Outfit = {
  jacket: string; pants: string; boots: string;
  /** hat / hair style (HATS in head.ts): hair, cap, peci, helmet, caping, headband, blangkon, hijab, wide, beret, bun, bald,
   *  hardhat, beanie, pigtails, long, crown, police, bandana, messy, fedora, shako, shako_tall, tophat, bonnet, headphones */
  hat?: string | null;
  hatCol?: string;      // colour of the hat ("merahputih" = red over white headband)
  hatBadge?: string;    // star badge colour on a helmet
  hair?: string; cap?: string;
  belt?: string | null; buttons?: string; sash?: string; vest?: string; tie?: string; scarf?: string; noButtons?: boolean;
  bandolier?: string;   // one diagonal strap across the chest
  apron?: string;       // blacksmith / cook / shop apron over the torso
  sarong?: string;      // sarung / kain wrapped from the waist to the shins
  dress?: string;       // long dress / kebaya skirt to the ankles
  pattern?: "stripes" | "batik" | "check" | "spots"; patternCol?: string; // pattern on the jacket
  /** national / faction flag patch: chest (front), shoulder (side), upper back (back) */
  flag?: FlagName;
  /** arm band colour ("merahputih" = red over white) */
  armband?: string;
  chain?: string;       // neck chain colour (gold chain of a gangster / thug)
  sleeveless?: boolean; // singlet / tank top: bare arms
  tattoo?: boolean;     // marks on bare arms (use with sleeveless)
  cigar?: boolean;
  shorts?: boolean;     // bare shins
  barefoot?: boolean;
  ragged?: boolean;     // patches and tears (beggar, castaway)
  mask?: "gas" | "cloth"; maskCol?: string;
  /** skeleton: skull head, ribcage, bone limbs (no clothes are drawn) */
  skeleton?: boolean;
  moustache?: string; beard?: string; skin?: string; glasses?: boolean | "sun";
  build?: Build;
  /** legacy merdeka flags: ignored by the kit rig (use hold / extra props) */
  rifle?: boolean; sword?: boolean; astroChest?: boolean;
};

export const SKINS = ["#fcfaf5", "#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067"];
const W0 = "#fcfaf5"; // reference-style crisp white bean heads

export const OUTFITS = {
  // ---- Indonesian history ----
  pejuang: { jacket: "#f4efe2", pants: "#2b2a30", boots: "#3a2a20", hat: "headband", hatCol: "merahputih", hair: "#1e1714", skin: W0, noButtons: true },
  pejuang_peci: { jacket: "#f4efe2", pants: "#2b2a30", boots: "#3a2a20", hat: "peci", armband: "merahputih", skin: W0, noButtons: true },
  pahlawan: { jacket: "#f4efe2", pants: "#2b2a30", boots: "#2b1d14", hat: "peci", armband: "merahputih", sash: "#d0312d", flag: "id", skin: W0, noButtons: true },
  laskar: { jacket: "#6f7b4a", pants: "#3b3a2e", boots: "#2b1d14", hat: "headband", hatCol: "merahputih", hair: "#1e1714", bandolier: "#8a6a3a", skin: W0 },
  warga_dulu: { jacket: "#c9a26a", pants: "#3a3028", boots: "#5a3b2a", hat: "blangkon", pattern: "batik", patternCol: "#6b3a1a", sarong: "#5a3a2a", skin: W0, barefoot: true },
  warga_dulu_wanita: { jacket: "#d07a5a", pants: "#3b2a30", boots: "#5a3b2a", hat: "bun", hair: "#1e1714", dress: "#5a3a2a", pattern: "batik", patternCol: "#f2d08a", skin: W0, barefoot: true },
  petani: { jacket: "#c9b48a", pants: "#3b3328", boots: "#7a5a3a", hat: "caping", skin: W0, noButtons: true, shorts: true, barefoot: true },
  santri: { jacket: "#f6f3ea", pants: "#2b2a30", boots: "#3a2a20", hat: "peci", sarong: "#2f6b4f", skin: W0, noButtons: true },
  ibu: { jacket: "#c95a6a", pants: "#3b2a30", boots: "#5a3b2a", hat: "bun", hair: "#2a1d18", dress: "#7a4a3a", pattern: "batik", patternCol: "#e8c47a", skin: W0 },
  ibu_hijab: { jacket: "#4f8a8a", pants: "#3b2a30", boots: "#5a3b2a", hat: "hijab", hatCol: "#e0a8b8", dress: "#355a6a", skin: W0 },
  nenek: { jacket: "#8a6a9a", pants: "#3b2a30", boots: "#5a3b2a", hat: "bun", hair: "#b8b4bc", glasses: true, dress: "#5a4a6a", skin: W0 },
  pandai_besi: { jacket: "#8a5a3a", pants: "#3a2e26", boots: "#2b1d14", hat: "headband", hatCol: "#5a3a2a", hair: "#2a1d18", apron: "#6b4a30", moustache: "#2a1d18", build: "stout", skin: W0, noButtons: true },
  pedagang: { jacket: "#b8742e", pants: "#2e2a26", boots: "#3a2a20", hat: "peci", pattern: "batik", patternCol: "#5a2e12", build: "stout", skin: W0 },
  raja: { jacket: "#b8323a", pants: "#3a2a30", boots: "#2b1d14", hat: "crown", hair: "#5a3a22", sash: "#e8c45a", beard: "#5a3a22", dress: "#8a2430", skin: W0 },
  // ---- soldiers with a flag patch (who is who at a glance) ----
  tni: { jacket: "#56683f", pants: "#3f4a30", boots: "#2b1d14", hat: "helmet", hatCol: "#4f5f36", belt: "#d8ccb0", buttons: "#d9c27a", flag: "id", skin: W0 },
  knil: { jacket: "#4d5a3c", pants: "#404a34", boots: "#22201c", hat: "helmet", hatCol: "#3f4a32", belt: "#c9b98e", flag: "nl", skin: "#ffe2c2" },
  tentara_belanda: { jacket: "#4d5a3c", pants: "#404a34", boots: "#22201c", hat: "helmet", hatCol: "#3f4a32", belt: "#c9b98e", flag: "nl", skin: "#ffe2c2" },
  tentara_jepang: { jacket: "#a08a55", pants: "#7d6a40", boots: "#3a2a1e", hat: "helmet", hatCol: "#8f7b48", hatBadge: "#f2c94c", belt: "#5a4630", buttons: "#d9c27a", flag: "jp", skin: W0 },
  perwira_jepang: { jacket: "#9c824e", pants: "#5e4e30", boots: "#2c1e16", hat: "shako_tall", buttons: "#e8c45a", sash: "#8c2d38", moustache: "#2b201a", build: "stout", flag: "jp", skin: W0 },
  sekutu_uk: { jacket: "#7a7448", pants: "#5e5a3a", boots: "#2b2018", hat: "helmet", hatCol: "#6a6a42", belt: "#c9b98e", flag: "uk", skin: "#ffe2c2" },
  sekutu_us: { jacket: "#6b6a44", pants: "#5a5a3c", boots: "#3a2a1e", hat: "helmet", hatCol: "#5e6a3e", belt: "#c9b98e", flag: "us", skin: "#ffe2c2" },
  sekutu_au: { jacket: "#7a6a48", pants: "#5e5238", boots: "#3a2a1e", hat: "wide", hatCol: "#8a7a52", belt: "#c9b98e", flag: "au", skin: "#ffe2c2" },
  tentara_merah: { jacket: "#8a3a34", pants: "#4a2a28", boots: "#22201c", hat: "helmet", hatCol: "#6a2a26", belt: "#d8ccb0", flag: "red", skin: W0 },
  tentara_biru: { jacket: "#34508a", pants: "#283a5e", boots: "#22201c", hat: "helmet", hatCol: "#26406a", belt: "#d8ccb0", flag: "blue", skin: W0 },
  // ---- modern / city ----
  orang_kota: { jacket: "#3a8a7a", pants: "#2f3e5a", boots: "#f4f1ea", hat: "hair", hair: "#241915", noButtons: true, skin: W0 },
  orang_kota_wanita: { jacket: "#e09a4a", pants: "#3a3a4a", boots: "#f4f1ea", hat: "long", hair: "#3a2318", noButtons: true, skin: W0 },
  kantoran: { jacket: "#3a6ea5", pants: "#2b3442", boots: "#382419", hat: "hair", hair: "#241915", tie: "#c0392b", skin: W0 },
  kantoran_wanita: { jacket: "#8a4a6a", pants: "#2b2a36", boots: "#2b2b30", hat: "hijab", hatCol: "#c8a8d8", noButtons: true, skin: W0 },
  pegawai: { jacket: "#3a6ea5", pants: "#2b3442", boots: "#382419", hat: "hair", hair: "#241915", tie: "#c0392b", skin: W0 },
  bos: { jacket: "#2c2f3a", pants: "#24262e", boots: "#1a1410", hat: "hair", hair: "#9a9aa2", tie: "#b03a3a", build: "stout", moustache: "#5a5a62", skin: W0 },
  bos_besar: { jacket: "#1e1e26", pants: "#1a1a20", boots: "#0e0c0c", hat: "bald", tie: "#c9a23a", build: "big", moustache: "#3a3a42", glasses: "sun", chain: "#e8c45a", cigar: true, skin: W0 },
  presiden: { jacket: "#22252e", pants: "#1e2028", boots: "#0e0c0c", hat: "peci", tie: "#d0312d", flag: "id", skin: W0 },
  preman: { jacket: "#2a2a30", pants: "#3a4a6a", boots: "#2b2b30", hat: "bandana", hatCol: "#c0392b", sleeveless: true, tattoo: true, chain: "#e8c45a", glasses: "sun", noButtons: true, skin: W0 },
  gangster: { jacket: "#2e2c34", pants: "#2a2830", boots: "#0e0c0c", hat: "fedora", pattern: "stripes", patternCol: "#3c3a44", tie: "#a8323a", glasses: "sun", cigar: true, skin: W0 },
  polisi: { jacket: "#2f4a7a", pants: "#24324f", boots: "#141018", hat: "cap", cap: "#24324f", belt: "#141018", buttons: "#e8c45a", skin: W0 },
  polisi_modern: { jacket: "#8a6a42", pants: "#5a4430", boots: "#141018", hat: "police", hatCol: "#5a4430", belt: "#141018", buttons: "#e8c45a", flag: "id", skin: W0 },
  penjaga: { jacket: "#3a4a6a", pants: "#2a3246", boots: "#141018", hat: "cap", cap: "#2a3246", skin: W0 },
  pekerja_bangunan: { jacket: "#e8762a", pants: "#3a4a6a", boots: "#5a3a22", hat: "hardhat", vest: "#f2c230", noButtons: true, skin: W0 },
  pengemis: { jacket: "#8a7a62", pants: "#5a5046", boots: "#7a6a5a", hat: "messy", hair: "#5a5048", ragged: true, beard: "#6a6058", barefoot: true, noButtons: true, skin: W0 },
  pelaut: { jacket: "#f4f1ea", pants: "#2b3a5a", boots: "#2b1d14", hat: "cap", cap: "#d0312d", pattern: "stripes", patternCol: "#c0392b", skin: W0, noButtons: true },
  koki: { jacket: "#f8f6f0", pants: "#3a3a42", boots: "#2b2b30", hat: "hair", hair: "#2a1d18", apron: "#ffffff", skin: W0, noButtons: true },
  dokter: { jacket: "#f8f6f0", pants: "#3a4a5a", boots: "#2b2b30", hat: "hair", hair: "#3a2a20", glasses: true, tie: "#3a6ea5", skin: W0 },
  guru: { jacket: "#7a8a5a", pants: "#3a3a32", boots: "#3a2a20", hat: "peci", glasses: true, skin: W0 },
  koboi: { jacket: "#3fa58c", vest: "#8a5a34", pants: "#3a3a4a", boots: "#5a3a22", hat: "wide", hatCol: "#d8c08a", moustache: "#2a1d18", skin: W0, noButtons: true },
  // ---- kids ----
  anak: { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#2a1d18", build: "kid", skin: W0, noButtons: true },
  anak_laki: { jacket: "#f6f3ea", pants: "#c0392b", boots: "#2b2b30", hat: "hair", hair: "#2a1d18", build: "kid", shorts: true, skin: W0, noButtons: true },
  anak_perempuan: { jacket: "#e07aa0", pants: "#5a4a8a", boots: "#f4f1ea", hat: "pigtails", hair: "#3a2318", build: "kid", dress: "#b85a8a", skin: W0, noButtons: true },
  // ---- other eras / fantasy ----
  orang_purba: { jacket: "#c98a3a", pants: "#8a5a2a", boots: "#c99067", hat: "messy", hair: "#3a2a1c", beard: "#3a2a1c", pattern: "spots", patternCol: "#5a3a1a", sleeveless: true, shorts: true, barefoot: true, noButtons: true, skin: "#f5c9a0" },
  tengkorak: { jacket: "#f3efe2", pants: "#f3efe2", boots: "#f3efe2", hat: "bald", skeleton: true },
  // ---- merdeka project cast (kept for reuse) ----
  bung_karno: { jacket: "#f5f1e6", pants: "#2b303a", boots: "#2b1d14", hat: "peci", tie: "#241726", glasses: true, skin: W0 },
  bung_hatta: { jacket: "#eee8d8", pants: "#2b303a", boots: "#2b1d14", hat: "hair", hair: "#241915", tie: "#8c2d38", glasses: true, skin: W0 },
  peta: { jacket: "#48633b", pants: "#32422b", boots: "#2b1d14", hat: "shako", belt: "#e6dec8", sash: "#c0392b", buttons: "#e0b84c", skin: W0 },
  pemuda_radio: { jacket: "#c0392b", vest: "#2c3e50", pants: "#222f3e", boots: "#382419", hat: "headphones", hair: "#1e272e", skin: W0, noButtons: true },
  // ---- the old bridge cast ----
  rifleman: { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0" },
  townsman: { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#4a3426", hat: "tophat", skin: SKINS[1] },
} satisfies Record<string, Outfit>;

export type OutfitName = keyof typeof OUTFITS;
export const OUTFIT_NAMES = Object.keys(OUTFITS) as OutfitName[];

/** deterministic variety for extras (queues, crowds): same archetype, different colours */
export const vary = (o: Outfit, i: number): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9", "#c9a03a", "#3a8a7a"];
  const hairs = ["#1e1714", "#3a2a20", "#5a3a22", "#2a1d18"];
  return { ...o, jacket: coats[(i * 3 + 1) % coats.length], hair: o.hair ? hairs[i % hairs.length] : o.hair, skin: o.skin };
};

const h01 = (seed: number, k: number) => { const x = Math.sin(seed * 91.7 + k * 47.3) * 43758.5453; return x - Math.floor(x); };
const pick = <T,>(seed: number, k: number, a: readonly T[]): T => a[Math.floor(h01(seed, k) * a.length) % a.length];
/** a random everyday person (figuran / crowds / queues), deterministic per seed */
export const randomPerson = (seed: number): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9", "#c9a03a", "#3a8a7a", "#d07a5a", "#e8e2d4", "#4a4a52"];
  const pants = ["#2f3e5a", "#3b3f52", "#2b2a30", "#4a3a2a", "#5a5a62"];
  const hairs = ["#1e1714", "#3a2a20", "#5a3a22", "#2a1d18", "#8a8890"];
  const hats = ["hair", "hair", "hair", "cap", "peci", "hijab", "long", "bun", "beanie", "wide", "bald", "caping"] as const;
  const hat = pick(seed, 1, hats);
  const female = hat === "hijab" || hat === "long" || hat === "bun";
  const o: Outfit = {
    jacket: pick(seed, 2, coats), pants: pick(seed, 3, pants), boots: pick(seed, 4, ["#2b2b30", "#5a3a22", "#f4f1ea", "#3a2a20"]),
    hat, hair: pick(seed, 5, hairs), cap: pick(seed, 6, coats), hatCol: pick(seed, 7, ["#e0a8b8", "#3f7a6a", "#c8a8d8", "#d8c08a", "#3a5a8a"]),
    build: pick(seed, 8, ["adult", "adult", "adult", "slim", "stout"] as const), skin: W0, noButtons: h01(seed, 9) < 0.5,
  };
  if (female && h01(seed, 10) < 0.6) o.dress = pick(seed, 11, ["#5a4a6a", "#355a6a", "#7a4a3a", "#3a5a4a"]);
  if (h01(seed, 12) < 0.25) { o.pattern = pick(seed, 13, ["stripes", "batik", "check"] as const); o.patternCol = pick(seed, 14, ["#ffffff", "#2a2a30", "#e8c47a"]); }
  if (h01(seed, 15) < 0.18) o.glasses = true;
  if (!female && h01(seed, 16) < 0.15) o.moustache = "#2a1d18";
  return o;
};
