// KIT LOCATION GALLERY: one 1-frame shot per location with a small sample cast on its anchors.
// Render: npm run kit:locations  -> out/kit/locations/KitLocationsShort_000NN.jpg (frame N = location N in LOC_NAMES order)
import type { Project, ShotSpec, CastSpec, CamKey } from "../scene/types";
import { OUTFITS, randomPerson } from "../toon/outfits";
import { LOC, LOC_NAMES, LocName } from "../sets/locations";

type Sample = { cast?: Omit<CastSpec, "who">[] & { who?: string }[]; cam: Omit<CamKey, "f"> };
const c = (who: string, at: CastSpec["at"], rest: Partial<CastSpec> = {}): CastSpec => ({ who, at, ...rest });
const S: Record<LocName, { cast: CastSpec[]; cam: Omit<CamKey, "f"> }> = {
  kantor: { cast: [c("eko", "desk.chair", { pose: "sit_table", expr: "nervous" }), c("rina", "guest", { lookAt: "eko", hold: { prop: "hp", style: "look" } })], cam: { preset: "medium", on: [0.4, -0.6], dist: 3.6, lookY: 0.95 } },
  kantor_jendela: { cast: [c("eko", "desk.chair", { pose: "sit_table", expr: "think" })], cam: { preset: "full", on: [-0.2, -0.8], dist: 3.4, angle: -18 } },
  kafe: { cast: [c("eko", "table1.chair_a", { pose: "sit_side", facing: "right" }), c("rina", "table1.chair_b", { pose: "sit_side", facing: "left", hold: { prop: "kopi", style: "hold" } }), c("koki", "counter.back", { pose: "stand" })], cam: { preset: "wide", on: [0, -0.9], dist: 5.2, lookY: 1.0 } },
  meja_bundar: { cast: [c("koboi", "seat_back", { pose: "sit_table", expr: "nervous" }), c("eko", "seat_left", { pose: "sit_side", facing: "right" }), c("bos", "seat_right", { pose: "sit_side", facing: "left" })], cam: { preset: "medium", on: [0, -0.7], dist: 3.2, height: 1.7, lookY: 0.75 } },
  ruang_rapat: { cast: [0, 1, 2, 3, 4, 5].map((i) => c(`p${i}`, `seat_${i}`, { pose: "sit_chair", expr: i % 2 ? "smile" : "neutral" })), cam: { preset: "highDown", on: [0, -0.9], dist: 3.2 } },
  ruang_gelap: { cast: [c("eko", "stool", { pose: "sit_stool", hold: { prop: "sketsa", style: "high" }, expr: "smile" })], cam: { preset: "full", on: "eko", dist: 3.4 } },
  bengkel_pandai_besi: { cast: [c("smith", "smith", { hold: { prop: "palu", style: "raise" }, facing: "right", expr: "stern" })], cam: { preset: "medium", on: [0, -0.4], dist: 3.0, angle: 15 } },
  markas: { cast: [c("perwira", "desk.chair", { pose: "sit_table", expr: "stern" }), c("tni", "guard", { pose: "salute" })], cam: { preset: "full", on: [0.4, -0.8], dist: 4.2 } },
  laut: { cast: [], cam: { preset: "wide", on: "boat", dist: 9, height: 3 } },
  pantai: { cast: [c("eko", "left", { pose: "stand", hold: { prop: "ikan", style: "show" }, expr: "grin" }), c("rina", "right", { lookAt: "eko", hold: { prop: "payung", style: "open" } })], cam: { preset: "wide", on: [0, -0.5], dist: 6 } },
  gunung: { cast: [c("pejuang", "trail", { pose: "walk_side", facing: "left", hold: { prop: "tongkat", style: "cane" } })], cam: { preset: "wide", on: "trail", dist: 6.5, height: 1.6 } },
  hutan: { cast: [c("laskar", "behind_tree", { hold: { prop: "rifle", style: "kneel_aim" }, facing: "right" }), c("pejuang", "right", { hold: { prop: "bambu_runcing", style: "ready" }, facing: "left" })], cam: { preset: "wide", on: [0, -0.4], dist: 6 } },
  pohon_besar: { cast: [c("nenek", "bench", { pose: "sit_chair", expr: "smile_closed" }), c("anak", "right", { pose: "wave" })], cam: { preset: "wide", on: [0, -0.6], dist: 7.5, lookY: 2 } },
  padang_pasir: { cast: [c("koboi", "center", { pose: "hands_on_hips", expr: "stern" })], cam: { preset: "lowHero", on: "koboi", dist: 2.6 } },
  padang_rumput: { cast: [c("petani", "center", { hold: { prop: "cangkul", style: "shoulder" }, facing: "right", expr: "smile" })], cam: { preset: "wide", on: "petani", dist: 6 } },
  camping: { cast: [c("eko", "log_left", { pose: "sit_chair", lookAt: "fire" }), c("rina", "log_right", { pose: "sit_chair", lookAt: "fire", hold: { prop: "kopi", style: "hold" } })], cam: { preset: "wide", on: [0, -0.6], dist: 5.2, height: 1.4 } },
  kebun_bambu: { cast: [c("pejuang", "clearing", { hold: { prop: "bambu_runcing", style: "upright" }, expr: "stern" })], cam: { preset: "full", on: "pejuang", dist: 3.8 } },
  jalan_kota: { cast: [c("kota", "sidewalk", { pose: "walk_side", facing: "right", hold: { prop: "hp", style: "look" } }), c("kota2", "sidewalk_left", { pose: "stand" })], cam: { preset: "wide", on: [0, -1.4], dist: 7 } },
  gedung_malam: { cast: [], cam: { preset: "free", pos: [7, 6, 30], look: [0, 22, 0], fov: 40 } },
  gedung_tinggi: { cast: [c("eko", "entrance", { pose: "point_up" }), c("rina", [1.2, 5.6], { pose: "stand", lookAt: "eko" })], cam: { preset: "free", pos: [9, 2, 26], look: [0, 18, 0], fov: 44 } },
  pintu_masuk_gedung: { cast: [c("penjaga", "guard", { pose: "arms_crossed" }), c("nenek", "door", { hold: { prop: "koper", style: "low" }, expr: "smile" })], cam: { preset: "full", on: [-0.3, -0.3], dist: 4.6 } },
  rumah: { cast: [c("ibu", "door", { pose: "wave" }), c("anak", "yard", { pose: "cheer" })], cam: { preset: "wide", on: [0, -1.5], dist: 9, lookY: 1.6 } },
  teras: { cast: [c("eko", "chair_left", { pose: "sit_chair" }), c("nenek", "chair_right", { pose: "sit_chair", hold: { prop: "kopi", style: "hold" } })], cam: { preset: "medium", on: [0, -0.6], dist: 3.6, lookY: 1.05 } },
  rumah_dulu: { cast: [c("warga", "door", { pose: "stand" })], cam: { preset: "wide", on: [0, -2], dist: 11, lookY: 2.2 } },
  kampung: { cast: [c("petani", "road", { hold: { prop: "cangkul", style: "shoulder" }, facing: "right" }), c("ibu", "house_door", { pose: "wave" })], cam: { preset: "wide", on: [-0.8, -1.5], dist: 9.5, lookY: 1.8 } },
  lapangan_besar: { cast: [c("pahlawan", "flagpole", { pose: "salute" }), c("tni", "row_left", { hold: { prop: "rifle", style: "order" } }), c("tni2", "row_right", { hold: { prop: "rifle", style: "order" } })], cam: { preset: "wide", on: [0, -3], dist: 9, lookY: 2.5, height: 2.2 } },
  lapangan: { cast: [c("tni", "left", { hold: { prop: "rifle", style: "port" } }), c("pejuang", "right", { hold: { prop: "bambu_runcing", style: "carry" } })], cam: { preset: "wide", on: [0, 0], dist: 5.5 } },
  dek_kapal: { cast: [c("pelaut", "rail_left", { hold: { prop: "peti", style: "lift" }, facing: "left" }), c("pelaut2", "mast", { pose: "point", facing: "left" })], cam: { preset: "wide", on: [-0.6, -1], dist: 6.5, lookY: 1.4 } },
  pasar_antre: { cast: [...[0, 1, 2, 3, 4, 5].map((i) => c(`q${i}`, `queue_${i}`, { facing: "right", pose: i % 3 === 1 ? "arms_crossed" : "stand" })), c("pedagang", "stall.back", { pose: "stand" })], cam: { preset: "wide", on: [-0.8, -0.2], dist: 8 } },
  plaza_malam: { cast: [c("eko", "pedestal", { lookAt: "button", pose: "reach_fwd", expr: "nervous" })], cam: { preset: "full", on: [0.2, -0.5], dist: 3.6, height: 1.6 } },
  dinding_tangga: { cast: [c("pekerja", "rung_10", { pose: "climb_a" }), c("eko", "left", { pose: "point_up", expr: "shock" })], cam: { preset: "free", pos: [3.5, 1.6, 7], look: [0, 3.6, -0.3], fov: 50 } },
  halaman_malam: { cast: [c("anak", "yard", { pose: "cower", expr: "shock" })], cam: { preset: "wide", on: [0, -1.5], dist: 8, lookY: 1.4 } },
  medan_perang: { cast: [c("pahlawan", "leader_left", { hold: { prop: "bendera", style: "raise" }, facing: "right" }), c("perwira", "leader_right", { hold: { prop: "katana", style: "point" }, facing: "left" })], cam: { preset: "wide", on: [0, -2], dist: 9, height: 4.2, lookY: 0.4 } },
};

export const LOCATIONS_PROJECT: Project = {
  name: "KitLocations", fps: 30,
  cast: {
    eko: OUTFITS.kantoran, rina: OUTFITS.ibu_hijab, koki: OUTFITS.koki, koboi: OUTFITS.koboi, bos: OUTFITS.bos, nenek: OUTFITS.nenek, anak: OUTFITS.anak_perempuan,
    smith: OUTFITS.pandai_besi, perwira: OUTFITS.perwira_jepang, tni: OUTFITS.tni, tni2: OUTFITS.tni, laskar: OUTFITS.laskar, pejuang: OUTFITS.pejuang, petani: OUTFITS.petani,
    kota: OUTFITS.orang_kota, kota2: OUTFITS.orang_kota_wanita, penjaga: OUTFITS.penjaga, ibu: OUTFITS.ibu, warga: OUTFITS.warga_dulu, pahlawan: OUTFITS.pahlawan,
    pelaut: OUTFITS.pelaut, pelaut2: { ...OUTFITS.pelaut, cap: "#2f5fa8" }, pedagang: OUTFITS.pedagang, pekerja: OUTFITS.pekerja_bangunan,
    ...Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`p${i}`, randomPerson(10 + i)])),
    ...Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`q${i}`, randomPerson(30 + i)])),
  },
  shots: LOC_NAMES.map((n, i): ShotSpec => ({ id: n, a: i, b: i + 1, location: LOC[n](), cast: S[n].cast, camera: [{ f: i, ...S[n].cam }] })),
};
export const LOCATION_COUNT = LOC_NAMES.length;
void (null as unknown as Sample);
