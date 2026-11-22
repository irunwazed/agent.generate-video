// "Seandainya" 16:9, chapters 2-10: timelines of "end second : recipe[:variant]" per chapter, following the narration
// (voice/seandainya/*.srt). Chapter 1 is hand-built in project.ts. Recipes live in scenes.ts.
import type { Project, ShotSpec } from "../../kit/scene/types";
import { OUTFITS } from "../../kit/toon/outfits";
import { RECIPES } from "./scenes";
import { CAPTIONS } from "./captions";

/** frames per chapter (voice/seandainya/_chapters.json: f_b - f_a) and the audio stem */
export const CHAPTERS: { n: number; stem: string; frames: number; line: string }[] = [
  { n: 2, stem: "02_bab1a_pendudukan", frames: 4358, line: "4.8:map 15.4:surrender 23.8:map:2 27.1:occupy:3 31.5:occupy:0 36.7:control 42.3:control:1 47.8:bow 50.3:school 56.4:occupy:3 59.4:harvest 67:money 71.8:harvest:1 77.1:romusha 85:control:2 89.4:romusha:1 101:rail 112:rail:1 116.8:school:1 121.3:school:2 125.8:hunger 134.5:romusha:2 144.3:hunger:1" },
  { n: 3, stem: "03_bab1b_kelaparan_perlawanan", frames: 4073, line: "5:harvest:2 15.8:hunger:1 20.9:hunger 25.3:kenpeitai 34:kenpeitai:1 41.1:kenpeitai:2 46.5:revolt 55.2:hunger:3 62.2:revolt:1 69.8:revolt:2 77:harvest:3 83.2:gunfight 88.1:gunfight:1 98.9:radioSecret 104.5:radioSecret:1 106.9:map:1 113.4:rapat 117:rapat:1 121.3:rapat:2 130.4:flagRaise 134.8:window" },
  { n: 4, stem: "04_bab2_divergensi", frames: 5054, line: "4.7:map:4 10.6:atom 15:map:5 19.2:sub 24.9:isolated 31.4:atom:1 35.4:bow:1 39.6:map:6 42.6:map:7 46.9:map:8 49.9:map:9 57:isolated:1 61.4:battle 65.2:map:10 69.6:sub:1 73:map:11 75.6:romusha:3 80.7:harvest:4 85.8:factory 90.6:factory:1 93.2:occupy:6 98.8:occupy:3 101.7:map:12 106.7:factory:3 110.9:sub:2 115.5:occupy:4 121:map:13 124.9:sub:3 130.1:isolated:2 133.3:isolated:3 137.4:map:14 140.5:bow:2 145.9:bow:3 151:rapat:3 153.3:reflect:2 159.5:romusha:4 164.2:map:15" },
  { n: 5, stem: "05_bab3a_perang", frames: 3487, line: "3.2:revolt:3 9.6:gunfight:2 15.4:revolt:4 20.3:gunfight:3 23.2:camp 29.8:battle:1 35.3:camp:1 38.3:camp:2 44.1:sabotage 49.2:camp:3 54.3:control:3 55.5:map:16 61.7:marchAway 66:sabotage:1 70.2:revolt:5 72.9:sabotage:2 78.2:kenpeitai:3 85:revolt:6 91.6:radioSecret:2 96.8:river 102.4:river:1 104.5:map:17 111:torch 115.3:torch:1" },
  { n: 6, stem: "06_bab3b_bertahan", frames: 3408, line: "3:kenpeitai:4 8:kenpeitai:5 13:kenpeitai:6 16:hunger:4 23:kenpeitai:7 28:occupy:5 37:camp:4 39:isolated:4 49:marchAway:1 53:isolated:5 60:hunger:5 65:hunger:6 73:map:18 75:map:19 82:landing 87:landing:1 91:sub:4 96:battle:2 105:battle:3 107:map:20 113:sub:5" },
  { n: 7, stem: "07_bab4_twist", frames: 6405, line: "3:window:1 9:bow:4 15:isolated:6 20:defeated 31:tokyo 37:tokyo:1 43:tokyo:2 49:tokyo:3 53:defeated:1 59:hunger:7 66:hunger:8 73:defeated:2 79:sub:6 86:landing:2 92:map:21 100:isolated:7 107:isolated:8 114:map:22 122:radioSecret:3 130:window:2 135:map:23 145:torch:2 151:map:24 156:cheer 166:cheer:1 171:flagRaise:1 177:flagRaise:2 192:map:25 198:map:26 208:map:27 213:reflect:3" },
  { n: 8, stem: "08_bab5_terburuk", frames: 5368, line: "3:kenpeitai:8 8:bow:5 13:battle:4 17:colony 23:occupy:7 30:bow:6 34:school:3 37:control:4 40:control:5 45:romusha:5 49:romusha:6 51:control:6 57:school:4 60:map:28 64:school:5 66:control:7 72:school:6 76:harvest:5 80:harvest:6 83:colony:1 87:colony:2 93:colony:3 98:colony:4 102:factory:2 106:colony:5 109:hunger:9 112:colony:6 114:factory:3 119:colony:7 128:romusha:7 134:hunger:10 141:romusha:8 146:bow:7 151:romusha:9 157:tokyo:4 161:tokyo:5 166:partner 170:map:29 178:window:3" },
  { n: 9, stem: "09_bab6_kemajuan", frames: 3216, line: "3:talk 10:talk:1 15:modern 20:partner:1 26:modern:1 34:cafe 39:partner:2 44:cafe:1 50:bow:8 57:tokyo:6 61:modern:2 67:colony:8 70:colony:9 73:colony:10 75:school:7 80:colony:11 84:hunger:11 86:school:8 89:romusha:10 95:window:4 98:reflect:4 103:partner:3 106:modern:3" },
  { n: 10, stem: "10_bab7_penutup", frames: 5808, line: "4:reflect:5 7:romusha:11 11:occupy:8 17:hunger:12 20:kenpeitai:9 24:romusha:12 28:occupy:9 32:map:30 36:marchAway:2 39:marchAway:3 45:rapat:4 49:rapat:5 56:hunger:13 59:cheer:2 63:revolt:7 67:treaty 73:treaty:1 75:window:5 82:bow:9 86:revolt:8 90:gunfight:4 97:map:31 103:map:32 106:isolated:9 113:tokyo:7 115:window:6 123:school:9 126:hunger:14 130:reflect:6 134:reflect:7 138:torch:3 141:torch:4 147:rapat:6 151:treaty:2 156:flagRaise:3 160:torch:5 164:sabotage:3 167:map:33 171:camp:5 174:camp:6 179:treaty:3 181:treaty:4 184:talk:2 185:talk:3 190:talk:4 193:reflect:8" },
];

export const CAST = {
  karno: OUTFITS.bung_karno, hatta: OUTFITS.bung_hatta, pahlawan: OUTFITS.pahlawan, pejuang: OUTFITS.pejuang, laskar: OUTFITS.laskar, peta: OUTFITS.peta,
  warga: OUTFITS.warga_dulu, wanita: OUTFITS.warga_dulu_wanita, petani: OUTFITS.petani, anak: OUTFITS.anak_laki, guru: OUTFITS.guru, radio: OUTFITS.pemuda_radio,
  jepang: OUTFITS.tentara_jepang, perwira: OUTFITS.perwira_jepang, knil: OUTFITS.knil, belanda: OUTFITS.tentara_belanda, us: OUTFITS.sekutu_us, raja: OUTFITS.raja,
  kantor: OUTFITS.kantoran, kota: OUTFITS.orang_kota,
};

export const chapterProject = (n: number): Project => {
  const ch = CHAPTERS.find((c) => c.n === n)!;
  const items = ch.line.split(" ").map((s) => { const [t, name, v] = s.split(":"); return { sec: Number(t), name, v: v === undefined ? undefined : Number(v) }; });
  const shots: ShotSpec[] = [];
  let a = 0, run = 0;
  items.forEach((it, i) => {
    const b = i === items.length - 1 ? ch.frames : Math.min(ch.frames, Math.round(it.sec * 30));
    if (b - a < 20) return; // too short to show anything: the previous shot keeps running
    const recipe = RECIPES[it.name];
    if (!recipe) throw new Error(`chapter ${n}: unknown recipe "${it.name}"`);
    const body = recipe(a, b, it.v ?? run++);
    shots.push({ id: `c${n}_${String(shots.length + 1).padStart(2, "0")}_${it.name}`, a, b, ...body });
    a = b;
  });
  if (shots.length) shots[shots.length - 1].b = ch.frames;
  return { name: `Seandainya16Ch${String(n).padStart(2, "0")}`, fps: 30, width: 1920, height: 1080, audio: `seandainya/${ch.stem}_mix.mp3`, captions: CAPTIONS[n], cast: CAST, shots };
};
