// "Seandainya" 16:9 (1920x1080) rebuilt on the kit. Chapter 1 (Intro, 0-2220 f = 74 s). Shot frames follow the
// narration lines in voice/seandainya/01_intro.srt (30 fps); each shot's location / cast / action illustrates its line.
// Preview:  npm run kit:render -- --comp Seandainya16Short --mode previews --clips 0-2219 --scale 0.5 --out out/seandainya16/previews/
import type { Project, ShotSpec } from "../../kit/scene/types";
import { OUTFITS } from "../../kit/toon/outfits";
import { LOC } from "../../kit/sets/locations";
import { CAPTIONS } from "./captions";

const square = LOC.lapangan_besar({ flag: "id" });
const squareJp = LOC.lapangan_besar({ flag: "jp" });
const hq = LOC.markas();
const street = LOC.jalan_kota();
const bamboo = LOC.kebun_bambu();
const sea = LOC.laut();

const S = (id: string, a: number, b: number, rest: Omit<ShotSpec, "id" | "a" | "b">): ShotSpec => ({ id, a, b, ...rest });

export const PROJECT: Project = {
  name: "Seandainya16", fps: 30, width: 1920, height: 1080,
  audio: "seandainya/01_intro_mix.mp3",
  captions: CAPTIONS[1],
  cast: {
    karno: OUTFITS.bung_karno, pahlawan: OUTFITS.pahlawan, pejuang: OUTFITS.pejuang, laskar: OUTFITS.laskar, warga: OUTFITS.warga_dulu,
    wanita: OUTFITS.warga_dulu_wanita ?? OUTFITS.ibu, radio: OUTFITS.pemuda_radio, jepang: OUTFITS.tentara_jepang, perwira: OUTFITS.perwira_jepang,
    petani: OUTFITS.petani, pelaut: OUTFITS.pelaut,
  },
  shots: [
    // 1. "Bayangkan kalender 17 Agustus 1945... kita merdeka" (0 - 8.4 s)
    S("merdeka", 0, 252, {
      location: square,
      cast: [
        { who: "pahlawan", id: "p1", at: "row_left", facing: "right" }, { who: "laskar", id: "p2", at: "row_right", facing: "left" },
        { who: "warga", id: "w1", at: [-2.8, 1.2], lookAt: "flagpole", expr: "smile" }, { who: "wanita", id: "w2", at: [2.9, 1.0], lookAt: "flagpole", expr: "smile" },
        { who: "karno", at: "center", lookAt: "flagpole", pose: "salute" },
      ],
      camera: [{ f: 0, preset: "wide", on: [0, -1.2], dist: 8.5, height: 2.4, push: 0.0018 }],
    }),
    // 2. "Bendera dikibarkan, proklamasi dibacakan" (8.4 - 15 s)
    S("bendera", 252, 450, {
      location: square,
      cast: [{ who: "karno", at: [0.9, 0.2], pose: "salute", lookAt: "flagpole" }, { who: "pejuang", at: [-0.9, 0.3], pose: "salute", lookAt: "flagpole" }],
      camera: [{ f: 252, preset: "free", pos: [1.6, 0.5, -0.8], look: [0.1, 4.6, -5], fov: 52, push: 0.001 }, { f: 345, preset: "lowHero", on: ["karno", "pejuang"], dist: 4.6, lookY: 1.2, push: 0.003 }],
    }),
    // 3. "Tapi di video ini, kita buka kemungkinan yang jarang dibahas" (15 - 19.7 s)
    S("kemungkinan", 450, 590, {
      location: hq,
      cast: [{ who: "radio", at: "desk.chair", pose: "sit_table", lookAt: "desk.top", expr: "think" }],
      props: [{ id: "peta", prop: "peta", at: "desk.top", flat: true }],
      camera: [{ f: 450, preset: "medium", on: "radio", angle: 18, push: 0.003 }],
    }),
    // 4. "Seandainya hari itu Jepang tidak menyerah ... tetap koloni Kekaisaran Jepang" (19.7 - 29.3 s)
    S("jepang_bertahan", 590, 880, {
      location: squareJp,
      cast: [
        { who: "perwira", at: "center", facing: "left", pose: "hands_up", expr: "angry" },
        { who: "jepang", id: "j1", at: [-1.8, 0.8], facing: "right", hold: { prop: "rifle", style: "shoulder" } },
        { who: "jepang", id: "j2", at: [1.8, 0.9], facing: "left", hold: { prop: "rifle", style: "shoulder" } },
        { who: "warga", at: [3.8, 1.8], facing: "left", pose: "cower", expr: "nervous" },
      ],
      camera: [{ f: 590, preset: "wide", on: [0, -1], dist: 8, height: 1.8, push: 0.002 }, { f: 735, preset: "close", on: "perwira", angle: -15, push: "punch" }],
    }),
    // 5. "satu aturan mainnya: tidak berimajinasi kosong" (29.3 - 34 s)
    S("aturan", 880, 1030, {
      location: hq,
      cast: [{ who: "radio", at: "desk.chair", pose: "sit_table", hold: { prop: "peta", style: "show" }, expr: "stern" }],
      camera: [{ f: 880, preset: "medium", on: "radio", angle: -15, push: 0.003 }],
    }),
    // 6. "jangkar di kejadian nyata... kamu bisa menguji sendiri" (34 - 43.1 s): the map, close-up
    S("jangkar", 1030, 1300, {
      location: hq,
      cast: [{ who: "radio", at: "desk.chair", pose: "sit_table", lookAt: "desk.top", expr: "think" }],
      props: [{ id: "peta", prop: "peta", at: "desk.top", flat: true }],
      actions: [{ who: "radio", do: "pickUp", prop: "peta", at: 1130, insert: true }, { who: "radio", do: "read", at: 1150, dur: 120 }],
      camera: [{ f: 1030, preset: "insert", on: "peta" }, { f: 1075, preset: "medium", on: "radio", angle: 12 }, { f: 1180, preset: "close", on: "radio", angle: -10, push: 0.002 }],
    }),
    // 7. "Pertanyaannya banyak, dan kita jawab satu per satu" (43.6 - 46.7 s)
    S("pertanyaan", 1300, 1410, {
      location: street,
      cast: [
        { who: "warga", at: [-1.2, -1.6], lookAt: "wanita", pose: "think" }, { who: "wanita", at: [0.5, -1.7], lookAt: "warga", expr: "nervous" },
        { who: "petani", at: [2.1, -1.5], lookAt: "warga", pose: "think" },
      ],
      camera: [{ f: 1300, preset: "wide", on: ["warga", "wanita", "petani"], height: 1.6, push: 0.002 }],
    }),
    // 8. "Apakah rakyat akan berperang melawan Jepang?" (47 - 50 s)
    S("rakyat_melawan", 1410, 1500, {
      location: bamboo,
      cast: [
        { who: "pejuang", id: "a", at: [-2.2, 0.2], facing: "right", hold: { prop: "bambu_runcing", style: "charge" }, expr: "battle" },
        { who: "laskar", id: "b", at: [-0.4, -0.4], facing: "right", hold: { prop: "bambu_runcing", style: "charge" }, expr: "battle" },
        { who: "pahlawan", id: "c", at: [1.3, 0.1], facing: "right", hold: { prop: "parang", style: "raise" }, expr: "angry" },
      ],
      camera: [{ f: 1410, preset: "wide", on: ["a", "b", "c"], angle: 12, height: 1.3, push: 0.003 }],
    }),
    // 9. "Kapan kemerdekaan datang? ... masih dijajah sampai hari ini?" (50 - 55.5 s)
    S("masih_dijajah", 1500, 1665, {
      location: street,
      cast: [
        { who: "jepang", id: "j1", at: [-1.4, -1.6], facing: "right", hold: { prop: "rifle", style: "shoulder" } },
        { who: "jepang", id: "j2", at: [1.6, -1.6], facing: "left", hold: { prop: "rifle", style: "shoulder" } },
        { who: "warga", at: [0.1, -1.0], lookAt: "j1", pose: "cower", expr: "nervous" },
      ],
      camera: [{ f: 1500, preset: "full", on: ["j1", "warga", "j2"], height: 1.0, push: 0.002 }, { f: 1590, preset: "lowHero", on: "warga", dist: 3.2 }],
    }),
    // 10. "semua ini kita tancapkan pada fakta... sejarah alternatif berdiri di atas sejarah nyata" (55.5 - 62.2 s)
    S("fakta", 1665, 1865, {
      location: hq,
      cast: [{ who: "pahlawan", at: "guard", lookAt: "map", pose: "point", expr: "stern" }, { who: "radio", at: "desk.chair", pose: "sit_table", lookAt: "map" }],
      camera: [{ f: 1665, preset: "twoShot", on: "pahlawan", to: "radio", angle: 10, push: 0.002 }, { f: 1760, preset: "free", pos: [-0.2, 1.55, 1.2], look: [-1.1, 1.5, -2.1], fov: 40, push: 0.002 }],
    }),
    // 11. "ikuti sampai selesai... ada satu twist" (62.2 - 74 s)
    S("twist", 1865, 2220, {
      location: sea,
      vehicles: [{ id: "kapal", kind: "kapal", at: [-14, -14], heading: 0, moves: [{ to: [10, -14], a: 1865, b: 2220, ease: "linear" }] }],
      cast: [{ who: "pelaut", at: [0, 0], ride: { vehicle: "kapal", seat: "bridge" }, pose: "point" }],
      camera: [{ f: 1865, preset: "free", pos: [-2, 3, 14], look: [-3, 4, -14], fov: 38, push: 0.0012 }, { f: 2100, preset: "follow", on: "kapal", dist: 22, height: 6, dur: 60 }],
    }),
  ],
};
