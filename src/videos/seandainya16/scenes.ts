// Scene recipes for "Seandainya" 16:9: each recipe turns (a, b, v) into a shot body (location, cast, props, actions, camera).
// v = running variant number: it rotates camera angles and mirrors layouts so repeated recipes do not look identical.
import type { ShotSpec, ActionSpec, CamKey, CastSpec } from "../../kit/scene/types";
import { LOC } from "../../kit/sets/locations";
import { ACTIONS } from "../../kit/actions/actions";

export type Body = Omit<ShotSpec, "id" | "a" | "b">;
type R = (a: number, b: number, v: number) => Body;

const L = {
  hq: LOC.markas(), sq: LOC.lapangan_besar({ flag: "id" }), sqJp: LOC.lapangan_besar({ flag: "jp" }),
  street: LOC.jalan_kota(), streetN: LOC.jalan_kota({ night: true }), streetJp: LOC.jalan_kota({ shops: ["NIPPON", "DAI", "TOKO", "KOPI", "BENGKEL"] }),
  bamboo: LOC.kebun_bambu(), sea: LOC.laut(), forest: LOC.hutan(), forestD: LOC.hutan({ dark: true }), kampung: LOC.kampung(), grass: LOC.padang_rumput(),
  camp: LOC.camping(), beach: LOC.pantai(), field: LOC.lapangan(), office: LOC.kantor({ wall: "cream" }), dark: LOC.ruang_gelap(), meet: LOC.ruang_rapat({ banner: "RAPAT" }),
  round: LOC.meja_bundar(), forge: LOC.bengkel_pandai_besi(), tower: LOC.gedung_tinggi(), battle: LOC.medan_perang({ rows: 8, cols: 5 }), mount: LOC.gunung(),
  desert: LOC.padang_pasir(), cafe: LOC.kafe(), porch: LOC.teras(), window: LOC.kantor_jendela(), deck: LOC.dek_kapal(), queue: LOC.pasar_antre({ stall: "BERAS" }),
};
const ang = (v: number) => [14, -14, 24, -24, 8, -8, 34, -34][v % 8];
const sgn = (v: number) => (v % 2 ? -1 : 1);
/** contact frame of an action inside [a, b): needs `pre` frames of wind-up before it */
const at = (a: number, b: number, pre: number, fr = 0.55) => Math.max(a + pre + 2, Math.round(a + (b - a) * fr));
const keep = (a: number, b: number, list: ActionSpec[]) => list.filter((x) => (ACTIONS[x.do] ? x.at - ACTIONS[x.do].pre >= a && x.at < b - 3 : false));
const cam = (a: number, preset: CamKey["preset"], on: CamKey["on"], o: Partial<CamKey> = {}): CamKey => ({ f: a, preset, on, push: 0.0025, ...o } as CamKey);

export const RECIPES: Record<string, R> = {
  /** someone stands at the wall map and points at it (war news, borders); half the time the camera ends on the map itself */
  map: (a, b, v) => ({
    location: L.hq,
    cast: [{ who: v % 2 ? "perwira" : "radio", id: "p", at: [-0.55, -1.25], facing: "left", pose: v % 3 ? "point" : "think", lookAt: "map", expr: "think" }],
    camera: [cam(a, "medium", "p", { angle: ang(v) / 2, dist: 3.1, lookY: 1.35 }),
      ...(b - a > 170 && v % 2 === 0 ? [cam(a + Math.round((b - a) * 0.6), "free", undefined, { pos: [-0.5, 1.5, -0.1], look: [-1.1, 1.5, -2.1], fov: 38, dur: 30 })] : [])],
  }),
  surrender: (a, b, v) => ({
    location: L.hq,
    cast: [{ who: "perwira", at: "desk.chair", pose: "sit_boss", expr: "smile" }, { who: "knil", at: "guard", facing: "left", pose: "hands_up", expr: "nervous" }],
    props: [{ id: "kertas", prop: "kertas", at: "desk.top", flat: true }],
    camera: [cam(a, "twoShot", "knil", { to: "perwira", angle: ang(v) })],
  }),
  occupy: (a, b, v) => ({
    location: v % 3 === 0 ? L.streetJp : L.street,
    cast: [
      { who: "jepang", id: "j1", at: [-1.9, -1.6], facing: "right", hold: { prop: "rifle", style: "shoulder" } }, { who: "jepang", id: "j2", at: [1.9, -1.6], facing: "left", hold: { prop: "rifle", style: "shoulder" } },
      { who: "warga", at: [-0.3 * sgn(v), -1.1], lookAt: "j1", pose: "cower", expr: "nervous" }, { who: "wanita", at: [0.7, -1.0], lookAt: "j2", pose: "cower", expr: "nervous" },
    ],
    camera: [cam(a, v % 2 ? "wide" : "full", ["j1", "j2"], { angle: ang(v), height: 1.4 })],
  }),
  bow: (a, b, v) => ({
    location: L.sqJp,
    cast: [-2.6, -1.3, 0, 1.3, 2.6].map((x, i): CastSpec => ({ who: i % 2 ? "wanita" : "warga", id: "w" + i, at: [x, 1.4 - (i % 2) * 0.5], facing: "away", pose: "salute" }))
      .concat([{ who: "jepang", at: [3.9, 0.4], facing: "left", hold: { prop: "tongkat", style: "cane" } }]),
    camera: [cam(a, "wide", [0, 0.8], { dist: 6.5, height: 1.5, angle: ang(v) / 2, lookY: 1.6 })].map((k) => ({ ...k, on: [0, 0.8] as [number, number] })),
  }),
  control: (a, b, v) => ({
    location: L.kampung,
    cast: [{ who: "jepang", id: "j", at: [0.2, 0.2], facing: "left", pose: "point", expr: "angry" }, { who: "warga", at: [-1.5, 0.5], lookAt: "j", expr: "nervous" }, { who: "petani", at: [-2.6, 0.7], lookAt: "j" }, { who: "wanita", at: [-3.5, 0.9], lookAt: "j" }],
    camera: [cam(a, "wide", ["j", "wanita"], { angle: ang(v), height: 1.5 })],
  }),
  school: (a, b, v) => ({
    location: L.office,
    cast: [{ who: "guru", id: "g", at: "desk.front", pose: "point", lookAt: "guest" }, { who: "anak", id: "k1", at: [-1.2, 0.9], lookAt: "g" }, { who: "anak", id: "k2", at: [1.4, 0.8], lookAt: "g", expr: "think" }],
    camera: [cam(a, "full", ["k1", "g", "k2"], { angle: ang(v), height: 1.3 })],
  }),
  money: (a, b, v) => {
    const t = at(a, b, 10);
    return {
      location: L.office,
      cast: [{ who: "perwira", id: "o", at: "desk.chair", pose: "sit_boss", expr: "smile" }, { who: "warga", id: "w", at: "desk.front", facing: "right", hold: { prop: "kantong_uang", style: "give" }, expr: "nervous" }],
      actions: keep(a, b, [{ who: "w", do: "handOver", to: "o", at: t }]),
      camera: [cam(a, "twoShot", "w", { to: "o", angle: ang(v) })],
    };
  },
  harvest: (a, b, v) => {
    const t = at(a, b, 10);
    return {
      location: L.kampung,
      cast: [{ who: "petani", id: "t", at: [-1.1, 0.5], facing: "right", hold: { prop: "karung", style: "carry" }, expr: "sad" }, { who: "jepang", id: "j", at: [1.1, 0.4], facing: "left", pose: "point", expr: "angry" }],
      actions: keep(a, b, [{ who: "t", do: "handOver", to: "j", at: t, style: "carry" }]),
      camera: [cam(a, "full", ["t", "j"], { angle: ang(v), height: 1.3 })],
    };
  },
  /** forced labour: a line of workers carrying loads past a guard */
  romusha: (a, b, v) => {
    const dir = sgn(v), d = Math.max(30, b - a - 14);
    const walkers = [0, 1, 2].map((i): CastSpec => ({ who: i === 1 ? "petani" : "warga", id: "r" + i, at: [-dir * (2.2 + i * 0.9), 0.5], facing: dir > 0 ? "right" : "left", hold: { prop: i === 1 ? "kardus" : "karung", style: "carry" }, pose: "walk_side", expr: "sad" }));
    const acts = walkers.map((w, i): ActionSpec => ({ who: w.id!, do: "walkTo", to: [dir * (2.0 - i * 0.9), 0.5], at: b - 6, dur: d, kind: "walk" }));
    return {
      location: v % 2 ? L.grass : L.kampung,
      cast: [...walkers, { who: "jepang", id: "g", at: [0, -1.3], facing: dir > 0 ? "left" : "right", hold: { prop: "tongkat", style: "cane" }, expr: "angry" }],
      actions: keep(a, b, acts),
      camera: [cam(a, "wide", [0, 0.2], { dist: 9, height: 1.6, angle: ang(v) / 2 })].map((k) => ({ ...k, on: [0, 0.2] as [number, number] })),
    };
  },
  rail: (a, b, v) => ({
    location: L.grass,
    cast: [{ who: "warga", id: "d1", at: [-1.5, 0.3], facing: "right", hold: { prop: "sekop", style: "rest" }, expr: "sad" }, { who: "petani", id: "d2", at: [0.9, 0.2], facing: "right", hold: { prop: "cangkul", style: "rest" }, expr: "sad" },
      { who: "jepang", id: "g", at: [3.4, 0.0], facing: "left", hold: { prop: "tongkat", style: "cane" }, expr: "angry" }],
    actions: keep(a, b, [{ who: "d1", do: "dig", target: [-0.85, 0.3], times: 4, at: a + 22 }, { who: "d2", do: "dig", target: [1.55, 0.2], times: 4, at: a + 30 }]),
    camera: [cam(a, "full", ["d1", "d2", "g"], { angle: ang(v), height: 1.2 })],
  }),
  hunger: (a, b, v) => ({
    location: v % 2 ? L.kampung : L.queue,
    cast: v % 2 ? [{ who: "wanita", id: "m", at: [-0.6, 0.5], hold: { prop: "piring", style: "low" }, expr: "sad" }, { who: "anak", at: [0.5, 0.6], lookAt: "m", expr: "sad" }, { who: "petani", at: [2.0, 0.8], pose: "cower", expr: "sad" }]
      : [0, 1, 2, 3].map((i): CastSpec => ({ who: i % 2 ? "wanita" : "warga", id: "q" + i, at: `queue_${i}`, facing: "left", expr: "sad", lookAt: "stall.front" })),
    camera: [cam(a, "wide", v % 2 ? ["m", "anak"] as unknown as string[] : ["q0", "q3"], { angle: ang(v) })],
  }),
  kenpeitai: (a, b, v) => ({
    location: L.streetN,
    cast: [{ who: "perwira", id: "k", at: [-1.2, -1.6], facing: "right", pose: "point", expr: "angry" }, { who: "warga", id: "w", at: [0.5, -1.7], lookAt: "k", pose: "hands_up", expr: "nervous" }, { who: "jepang", id: "j", at: [2.0, -1.6], facing: "left", hold: { prop: "rifle", style: "shoulder" } }],
    camera: [cam(a, "full", ["k", "w", "j"], { angle: ang(v), height: 1.3 })],
  }),
  /** villagers rush a soldier with bamboo spears */
  revolt: (a, b, v) => {
    const t = at(a, b, 8);
    return {
      location: L.bamboo,
      cast: [{ who: "pejuang", id: "a", at: [-1.9, 0.3], facing: "right", hold: { prop: "bambu_runcing", style: "charge" }, expr: "battle" }, { who: "laskar", id: "b", at: [-0.3, -0.3], facing: "right", hold: { prop: "bambu_runcing", style: "charge" }, expr: "battle" },
        { who: "jepang", id: "j", at: [1.3, -0.1], facing: "left", hold: { prop: "rifle", style: "port" }, expr: "shock" }],
      actions: keep(a, b, [{ who: "b", do: "thrust", target: "j", at: t, fall: true }]),
      camera: [cam(a, "wide", ["a", "b", "j"], { angle: ang(v), height: 1.3 })],
    };
  },
  /** a rifleman shoots at a soldier (cartoon: he falls, stars) */
  gunfight: (a, b, v) => {
    const t = at(a, b, 8);
    return {
      location: v % 2 ? L.field : L.forest,
      cast: [{ who: "peta", id: "s", at: [-1.5, 0.2], facing: "right", hold: { prop: "rifle", style: "port" }, expr: "aim" }, { who: "jepang", id: "j", at: [1.3, -0.3], facing: "left", hold: { prop: "rifle", style: "port" } }],
      actions: keep(a, b, [{ who: "s", do: "aimFire", target: "j", at: t }]),
      camera: [cam(a, "wide", ["s", "j"], { angle: ang(v), height: 1.3 })],
    };
  },
  radioSecret: (a, b, v) => ({
    location: L.dark,
    cast: [{ who: "radio", id: "r", at: "stool", pose: "sit_stool", hold: { prop: "radio", style: "ear" }, expr: "think" }, { who: "karno", id: "k", at: "side", facing: "left", expr: "think" }],
    camera: [cam(a, "full", ["r", "k"], { angle: ang(v), height: 1.2 })],
  }),
  rapat: (a, b, v) => ({
    location: L.meet,
    cast: [{ who: "hatta", at: "seat_1", pose: "sit_chair", lookAt: "center" }, { who: "karno", at: "seat_2", pose: "sit_chair", lookAt: "center", expr: "stern" }, { who: "radio", at: "seat_3", pose: "sit_chair", lookAt: "center" }],
    camera: [cam(a, "wide", "center", { angle: ang(v) / 2, dist: 5.2, height: 1.8 })],
  }),
  /** a bomber crosses the sea and the horizon flashes */
  atom: (a, b, v) => ({
    location: L.sea,
    vehicles: [{ id: "p", kind: "pesawat", at: [-14, -9], alt: 7, moves: [{ to: [12, -9], a, b, ease: "linear" }] }],
    cast: [],
    actions: keep(a, b, [{ who: "x", do: "explode", target: [3, -18], at: at(a, b, 2, 0.7) }]),
    camera: [cam(a, "free", undefined, { pos: [-1, 2.2, 9], look: [1, 3.2, -10], fov: 40, push: 0.001 })],
  }),
  sub: (a, b, v) => ({
    location: L.sea,
    vehicles: [{ id: "s", kind: "kapal", at: [-7 * sgn(v), -9], heading: v % 2 ? 180 : 0, moves: [{ to: [7 * sgn(v), -9], a, b, ease: "linear" }] }],
    cast: [],
    actions: keep(a, b, [{ who: "x", do: "explode", target: [1 * sgn(v), -9], at: at(a, b, 2, 0.6) }]),
    camera: [cam(a, "free", undefined, { pos: [-2, 3, 14], look: [0, 3, -9], fov: 40, push: 0.001 })],
  }),
  sabotage: (a, b, v) => {
    const t = at(a, b, 12, 0.6);
    return {
      location: L.forestD,
      cast: [{ who: "pejuang", id: "p", at: [-1.6, 0.4], facing: "right", hold: { prop: "bom", style: "hold" }, expr: "battle" }, { who: "jepang", id: "j", at: [3.6, -1.4], facing: "left", hold: { prop: "rifle", style: "port" } }],
      actions: keep(a, b, [{ who: "p", do: "lightFuse", at: t - 14 }, { who: "p", do: "throw", target: [3.2, -1.5], at: t }]),
      camera: [cam(a, "wide", ["p", "j"], { angle: sgn(v) * 6, height: 1.5, dist: 8 })],
    };
  },
  camp: (a, b, v) => ({
    location: L.camp,
    cast: [{ who: "pejuang", at: "log_left", facing: "right", pose: "sit_side", expr: "think" }, { who: "laskar", at: "log_right", facing: "left", pose: "sit_side" }],
    camera: [cam(a, "wide", "fire", { angle: ang(v), height: 1.4, dist: 5.6 })],
  }),
  marchAway: (a, b, v) => {
    const d = Math.max(30, b - a - 10);
    const ids = [0, 1, 2];
    return {
      location: L.forest,
      cast: ids.map((i): CastSpec => ({ who: i ? "laskar" : "pejuang", id: "m" + i, at: [-1.4 + i * 1.4, 1.2], hold: { prop: "rifle", style: "shoulder" } })),
      actions: keep(a, b, ids.map((i): ActionSpec => ({ who: "m" + i, do: "walkTo", to: [-1.0 + i * 1.0, -5], at: b - 5, dur: d }))),
      camera: [cam(a, "wide", [0, -1], { dist: 8.5, height: 1.7, angle: sgn(v) * 4 })].map((k) => ({ ...k, on: [0, -1] as [number, number] })),
    };
  },
  battle: (a, b, v) => ({
    location: L.battle,
    cast: [{ who: "pahlawan", id: "l1", at: "leader_left", facing: "right", hold: { prop: "bendera", style: "raise" }, expr: "battle" }, { who: "perwira", id: "l2", at: "leader_right", facing: "left", pose: "point", expr: "angry" }],
    camera: [cam(a, "wide", ["l1", "l2"], { angle: ang(v), height: 1.6 })],
  }),
  landing: (a, b, v) => {
    const d = Math.max(30, b - a - 10);
    return {
      location: L.beach,
      vehicles: [{ id: "ship", kind: "kapal", at: [7, -22] }],
      cast: [0, 1, 2].map((i): CastSpec => ({ who: "us", id: "u" + i, at: [2.6 - i * 0.8, -4.3], hold: { prop: "rifle", style: "shoulder" } })),
      actions: keep(a, b, [0, 1, 2].map((i): ActionSpec => ({ who: "u" + i, do: "walkTo", to: [-0.2 - i * 0.9, 0.6], at: b - 5, dur: d }))),
      camera: [cam(a, "wide", [0, -1.5], { dist: 10.5, height: 2.0, angle: ang(v) / 2 })].map((k) => ({ ...k, on: [0, -1.5] as [number, number] })),
    };
  },
  river: (a, b, v) => ({
    location: L.sea,
    vehicles: [{ id: "boat", kind: "perahu", at: [-6, -2], moves: [{ to: [6, -2], a, b, ease: "linear" }] }],
    cast: [{ who: "pejuang", id: "f", at: [0, 0], ride: { vehicle: "boat", seat: "front" } }, { who: "laskar", id: "g", at: [0, 0], ride: { vehicle: "boat", seat: "back" } }],
    camera: [cam(a, "follow", "boat", { dist: 8, height: 1.6 })],
  }),
  tokyo: (a, b, v) => ({
    location: L.office,
    cast: [{ who: "us", id: "mac", at: [-0.8, 0.5], facing: "right", pose: "arms_crossed", scale: 0.95, expr: "stern" }, { who: "raja", id: "hiro", at: [0.4, 0.5], facing: "left", scale: 0.6, expr: "nervous" }],
    camera: [cam(a, "twoShot", "mac", { to: "hiro", angle: ang(v), height: 0.9 })],
  }),
  defeated: (a, b, v) => ({
    location: L.street,
    cast: [{ who: "us", id: "u", at: [-1.4, -1.5], facing: "right", hold: { prop: "rifle", style: "ready" }, expr: "stern" }, { who: "jepang", id: "j1", at: [0.5, -1.6], lookAt: "u", pose: "hands_up", expr: "nervous" }, { who: "jepang", id: "j2", at: [1.7, -1.5], lookAt: "u", pose: "hands_up", expr: "nervous" }],
    camera: [cam(a, "full", ["u", "j1", "j2"], { angle: ang(v), height: 1.3 })],
  }),
  isolated: (a, b, v) => ({
    location: L.desert,
    cast: [{ who: "jepang", id: "j1", at: [-1.2, 0.2], pose: "cower", expr: "sad" }, { who: "jepang", id: "j2", at: [0.3, -0.4], pose: "think", expr: "sad" }, { who: "perwira", id: "o", at: [1.7, 0.1], facing: "left", pose: "think", expr: "sad" }],
    camera: [cam(a, "wide", ["j1", "j2", "o"], { angle: ang(v), height: 3.2, dist: 8 })],
  }),
  window: (a, b, v) => ({
    location: L.window,
    cast: [{ who: "karno", id: "k", at: "desk.chair", pose: "sit_table", lookAt: "window", expr: "think" }],
    camera: [cam(a, "medium", "k", { angle: ang(v) })],
  }),
  cheer: (a, b, v) => ({
    location: L.sq,
    cast: [{ who: "pahlawan", id: "h", at: "row_left", facing: "right", pose: "fist_up", expr: "smile" }, { who: "pejuang", id: "p", at: [0.6, -0.5], pose: "cheer", expr: "smile" }, { who: "warga", id: "w1", at: [-2.4, 1.0], pose: "cheer", expr: "smile" }, { who: "wanita", id: "w2", at: [2.5, 0.9], pose: "cheer", expr: "smile" }, { who: "anak", id: "k", at: [1.5, 1.4], pose: "cheer", expr: "smile" }],
    camera: [cam(a, "wide", ["w1", "w2", "h"], { angle: ang(v), height: 1.8, push: 0.0008 })],
  }),
  flagRaise: (a, b, v) => ({
    location: L.sq,
    cast: [{ who: "pejuang", id: "p", at: [-0.6, 0.4], facing: "right", hold: { prop: "bendera", style: "raise" }, expr: "smile" }, { who: "karno", id: "k", at: [0.9, 0.3], pose: "salute", lookAt: "flagpole", expr: "stern" }, { who: "warga", id: "w", at: [-2.0, 1.0], pose: "salute", lookAt: "flagpole" }],
    camera: [cam(a, "lowHero", ["p", "k"], { angle: ang(v), dist: 5 })],
  }),
  colony: (a, b, v) => ({
    location: L.tower,
    cast: [{ who: "warga", id: "w1", at: [-2.4, 5.6], facing: "right", hold: { prop: "karung", style: "carry" }, expr: "sad" }, { who: "petani", id: "w2", at: [-0.8, 5.8], facing: "right", hold: { prop: "karung", style: "carry" }, expr: "sad" }, { who: "jepang", id: "g", at: [1.8, 5.6], facing: "left", hold: { prop: "tongkat", style: "cane" } }],
    camera: [cam(a, "wide", ["w1", "w2", "g"], { angle: ang(v) / 2, height: 1.1, dist: 9 })],
  }),
  factory: (a, b, v) => ({
    location: L.forge,
    cast: [{ who: "petani", id: "s", at: "smith", lookAt: "anvil", hold: { prop: "palu", style: "hold" }, expr: "sad" }, { who: "jepang", id: "g", at: "helper", facing: "left", pose: "point", expr: "angry" }],
    actions: keep(a, b, [{ who: "s", do: "hammer", target: "anvil", times: 5, at: a + 26 }]),
    camera: [cam(a, "full", ["s", "g"], { angle: ang(v), height: 1.2 })],
  }),
  modern: (a, b, v) => ({
    location: L.tower,
    cast: [{ who: "kantor", id: "a", at: [-1.2, 5.6], facing: "right", expr: "smile" }, { who: "kota", id: "b", at: [0.4, 5.5], facing: "left", expr: "smile" }, { who: "kantor", id: "c", at: [2.4, 6.0], facing: "left", hold: { prop: "koper", style: "low" } }],
    camera: [cam(a, "wide", ["a", "b", "c"], { angle: ang(v) / 2, height: 1.4, dist: 9 })],
  }),
  partner: (a, b, v) => {
    const t = at(a, b, 10);
    return {
      location: L.round,
      cast: [{ who: "kantor", id: "a", at: "seat_left", pose: "sit_table", lookAt: "table.top" }, { who: "kota", id: "b", at: "seat_right", pose: "sit_table", lookAt: "table.top", expr: "smile" }],
      props: [{ id: "kertas", prop: "kertas", at: "table.top", flat: true }],
      actions: keep(a, b, [{ who: "a", do: "pickUp", prop: "kertas", at: t }]),
      camera: [cam(a, "twoShot", "a", { to: "b", angle: ang(v) })],
    };
  },
  cafe: (a, b, v) => ({
    location: L.cafe,
    cast: [{ who: "anak", id: "a", at: "table1.chair_a", pose: "sit_table", hold: { prop: "hp", style: "look" }, expr: "smile" }, { who: "kota", id: "b", at: "table1.chair_b", pose: "sit_table", lookAt: "a", expr: "smile" }],
    camera: [cam(a, "twoShot", "a", { to: "b", angle: ang(v) })],
  }),
  schoolKid: (a, b, v) => ({
    location: L.porch,
    cast: [{ who: "anak", id: "k", at: "chair_left", pose: "sit_table", hold: { prop: "buku", style: "look" } }, { who: "wanita", id: "m", at: "chair_right", pose: "sit_table", lookAt: "k", expr: "smile" }],
    camera: [cam(a, "twoShot", "k", { to: "m", angle: ang(v) })],
  }),
  treaty: (a, b, v) => ({
    location: L.round,
    cast: [{ who: "karno", id: "k", at: "seat_left", pose: "sit_table", lookAt: "table.top", expr: "stern" }, { who: "belanda", id: "n", at: "seat_right", pose: "sit_table", lookAt: "table.top", expr: "nervous" }],
    props: [{ id: "kertas", prop: "kertas", at: "table.top", flat: true }],
    camera: [cam(a, "twoShot", "k", { to: "n", angle: ang(v) })],
  }),
  torch: (a, b, v) => ({
    location: [L.mount, L.forestD, L.bamboo][v % 3],
    light: v % 3 ? undefined : "golden",
    cast: [{ who: "pejuang", id: "p", at: [-0.4, 0.5], hold: { prop: "obor", style: "up" }, pose: "fist_up", expr: "battle" }, { who: "laskar", id: "q", at: [1.3, 0.4], facing: "left", hold: { prop: "bambu_runcing", style: "upright" }, expr: "stern" }],
    camera: [cam(a, "lowHero", ["p", "q"], { angle: ang(v) / 2, dist: 5 })],
  }),
  talk: (a, b, v) => ({
    location: L.porch,
    cast: [{ who: "radio", id: "r", at: [0, 0.4], pose: v % 2 ? "point" : "stand", expr: "smile" }],
    camera: [cam(a, "medium", "r", { angle: ang(v) / 2 })],
  }),
  reflect: (a, b, v) => ({
    location: L.sq, light: "golden",
    cast: [{ who: "pahlawan", id: "p", at: [0, 0.6], hold: { prop: "bendera", style: "upright" }, expr: "stern" }],
    camera: [cam(a, "lowHero", "p", { angle: ang(v), dist: 4.4 })],
  }),
};
export type RecipeName = keyof typeof RECIPES;
