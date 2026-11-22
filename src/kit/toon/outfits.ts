// KIT TOON: the Outfit type + a library of ready outfits (generic Indonesian archetypes + the merdeka cast).
// Use them by name in a project: cast: { budi: OUTFITS.pejuang, siti: { ...OUTFITS.ibu, hatCol: "#8a3b5c" } }.
// Weapons are NOT outfit flags in the kit: give a character `hold: { prop: "rifle", style: "port" }` (see props).
import { INK } from "./pen";

export type Build = "adult" | "stout" | "kid" | "slim";
export type Outfit = {
  jacket: string; pants: string; boots: string;
  /** hat / hair style, see HATS in head.ts: hair, cap, peci, helmet, caping, headband, blangkon, hijab, wide, beret, bun,
   *  bald, shako, shako_tall, tophat, bonnet, headphones */
  hat?: string | null;
  hatCol?: string;      // colour of peci / helmet / caping / headband ("merahputih" = red over white) / hijab / wide / beret
  hatBadge?: string;    // star badge colour on a helmet
  hair?: string; cap?: string;
  belt?: string | null; buttons?: string; sash?: string; vest?: string; tie?: string; scarf?: string; noButtons?: boolean;
  bandolier?: string;   // one diagonal strap across the chest
  apron?: string;       // blacksmith / cook / shop apron over the torso
  sarong?: string;      // sarung / kain wrapped from the waist to the shins (over the trousers)
  dress?: string;       // long dress / kebaya skirt to the ankles
  pattern?: "stripes" | "batik" | "check"; patternCol?: string; // pattern on the jacket
  moustache?: string; beard?: string; skin?: string; glasses?: boolean;
  build?: Build;
  /** legacy merdeka flags: ignored by the kit rig (use hold / back props) */
  rifle?: boolean; sword?: boolean; astroChest?: boolean;
};

export const SKINS = ["#fcfaf5", "#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067"];
const W0 = "#fcfaf5"; // reference-style crisp white bean heads

export const OUTFITS = {
  // ---- Indonesian archetypes (generic people, not real persons) ----
  pejuang: { jacket: "#f4efe2", pants: "#2b2a30", boots: "#3a2a20", hat: "headband", hatCol: "merahputih", hair: "#1e1714", skin: W0, noButtons: true },
  pejuang_peci: { jacket: "#f4efe2", pants: "#2b2a30", boots: "#3a2a20", hat: "peci", skin: W0, noButtons: true },
  laskar: { jacket: "#6f7b4a", pants: "#3b3a2e", boots: "#2b1d14", hat: "headband", hatCol: "merahputih", hair: "#1e1714", bandolier: "#8a6a3a", skin: W0 },
  tni: { jacket: "#56683f", pants: "#3f4a30", boots: "#2b1d14", hat: "helmet", hatCol: "#4f5f36", belt: "#d8ccb0", buttons: "#d9c27a", skin: W0 },
  tentara_jepang: { jacket: "#a08a55", pants: "#7d6a40", boots: "#3a2a1e", hat: "helmet", hatCol: "#8f7b48", hatBadge: "#f2c94c", belt: "#5a4630", buttons: "#d9c27a", skin: W0 },
  perwira_jepang: { jacket: "#9c824e", pants: "#5e4e30", boots: "#2c1e16", hat: "shako_tall", buttons: "#e8c45a", sash: "#8c2d38", moustache: "#2b201a", build: "stout", skin: W0 },
  tentara_belanda: { jacket: "#4d5a3c", pants: "#404a34", boots: "#22201c", hat: "helmet", hatCol: "#3f4a32", belt: "#c9b98e", skin: "#ffe2c2" },
  petani: { jacket: "#c9b48a", pants: "#3b3328", boots: "#7a5a3a", hat: "caping", skin: W0, noButtons: true },
  santri: { jacket: "#f6f3ea", pants: "#2b2a30", boots: "#3a2a20", hat: "peci", sarong: "#2f6b4f", skin: W0, noButtons: true },
  ibu: { jacket: "#c95a6a", pants: "#3b2a30", boots: "#5a3b2a", hat: "bun", hair: "#2a1d18", dress: "#7a4a3a", pattern: "batik", patternCol: "#e8c47a", skin: W0 },
  ibu_hijab: { jacket: "#4f8a8a", pants: "#3b2a30", boots: "#5a3b2a", hat: "hijab", hatCol: "#e0a8b8", dress: "#355a6a", skin: W0 },
  nenek: { jacket: "#8a6a9a", pants: "#3b2a30", boots: "#5a3b2a", hat: "bun", hair: "#b8b4bc", glasses: true, dress: "#5a4a6a", skin: W0 },
  anak: { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#2a1d18", build: "kid", skin: W0, noButtons: true },
  pandai_besi: { jacket: "#8a5a3a", pants: "#3a2e26", boots: "#2b1d14", hat: "headband", hatCol: "#5a3a2a", hair: "#2a1d18", apron: "#6b4a30", moustache: "#2a1d18", build: "stout", skin: W0, noButtons: true },
  pedagang: { jacket: "#b8742e", pants: "#2e2a26", boots: "#3a2a20", hat: "peci", pattern: "batik", patternCol: "#5a2e12", build: "stout", skin: W0 },
  pegawai: { jacket: "#3a6ea5", pants: "#2b3442", boots: "#382419", hat: "hair", hair: "#241915", tie: "#c0392b", skin: W0 },
  bos: { jacket: "#2c2f3a", pants: "#24262e", boots: "#1a1410", hat: "hair", hair: "#9a9aa2", tie: "#b03a3a", build: "stout", moustache: "#5a5a62", skin: W0 },
  polisi: { jacket: "#2f4a7a", pants: "#24324f", boots: "#141018", hat: "cap", cap: "#24324f", belt: "#141018", buttons: "#e8c45a", skin: W0 },
  penjaga: { jacket: "#3a4a6a", pants: "#2a3246", boots: "#141018", hat: "cap", cap: "#2a3246", skin: W0 },
  pelaut: { jacket: "#f4f1ea", pants: "#2b3a5a", boots: "#2b1d14", hat: "cap", cap: "#d0312d", pattern: "stripes", patternCol: "#c0392b", skin: W0, noButtons: true },
  koki: { jacket: "#f8f6f0", pants: "#3a3a42", boots: "#2b2b30", hat: "hair", hair: "#2a1d18", apron: "#ffffff", skin: W0, noButtons: true },
  dokter: { jacket: "#f8f6f0", pants: "#3a4a5a", boots: "#2b2b30", hat: "hair", hair: "#3a2a20", glasses: true, tie: "#3a6ea5", skin: W0 },
  guru: { jacket: "#7a8a5a", pants: "#3a3a32", boots: "#3a2a20", hat: "peci", glasses: true, skin: W0 },
  koboi: { jacket: "#3fa58c", vest: "#8a5a34", pants: "#3a3a4a", boots: "#5a3a22", hat: "wide", hatCol: "#d8c08a", moustache: "#2a1d18", skin: W0, noButtons: true },
  raja: { jacket: "#b8323a", pants: "#3a2a30", boots: "#2b1d14", hat: "hair", hair: "#5a3a22", sash: "#e8c45a", beard: "#5a3a22", dress: "#8a2430", skin: W0 },
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
