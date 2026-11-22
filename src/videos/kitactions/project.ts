// Kit ACTION test (not a video): one 3 s clip per action family, contact frame at a + 45 unless noted.
// Stills:   npm run kit:render -- --comp KitActionsShort --mode stills --frames <a+30,a+45,a+60...> --out out/kitactions/stills/
// Previews: npm run kit:render -- --comp KitActionsShort --mode previews --clips <a-b,...> --scale 0.5 --out out/kitactions/previews/
// SFX:      npm run kit:sfx -- kitactions
import type { Project, ShotSpec } from "../../kit/scene/types";
import { OUTFITS } from "../../kit/toon/outfits";
import { LOC } from "../../kit/sets/locations";

const L = 90; // frames per clip
type Body = Omit<ShotSpec, "id" | "a" | "b">;
const clips: [string, (a: number) => Body][] = [
  // 0 pick up a phone (with a giant-hand insert), call, put it back
  ["pickup_put", (a) => ({
    location: LOC.kantor({ wall: "cream", window: "left" }),
    cast: [{ who: "eko", at: "guest", lookAt: "desk.top", expr: "smile" }],
    props: [{ id: "hp", prop: "hp", at: "desk.top", flat: true }],
    actions: [
      { who: "eko", do: "pickUp", prop: "hp", at: a + 30, insert: true },
      { who: "eko", do: "phoneCall", at: a + 44, dur: 24 },
      { who: "eko", do: "putDown", prop: "hp", to: "desk.top", at: a + 80 },
    ],
    camera: [{ f: a, preset: "medium", on: "eko", angle: -20, push: 0.003 }, { f: a + 22, preset: "insert", on: "hp" }, { f: a + 40, preset: "medium", on: "eko", angle: -20 }],
  })],
  // 1 throw a bottle overboard into the sea
  ["throw_sea", (a) => ({
    location: LOC.dek_kapal(),
    cast: [{ who: "pelaut", at: "rail_left", lookAt: "sea_left", hold: { prop: "botol", style: "hold" } }],
    actions: [{ who: "pelaut", do: "throw", target: "sea_left", at: a + 40 }],
    camera: [{ f: a, preset: "full", on: "pelaut", angle: 30, dist: 4.2, push: 0.003 }],
  })],
  // 2 light a bomb fuse, throw it, it explodes next to an enemy (blast, soot, fall)
  ["bomb", (a) => ({
    location: LOC.lapangan(),
    cast: [
      { who: "budi", at: [-1.1, 0.4], facing: "right", hold: { prop: "bom", style: "hold" }, expr: "battle" },
      { who: "knil", at: [1.5, -1.4], lookAt: "budi", hold: { prop: "rifle", style: "port" } },
    ],
    actions: [{ who: "budi", do: "lightFuse", at: a + 14 }, { who: "budi", do: "throw", target: [1.2, -1.5], at: a + 34 }],
    camera: [{ f: a, preset: "wide", on: ["budi", "knil"], angle: 10, push: 0.004 }],
  })],
  // 3 rifle shot, the victim falls (bullet: fall by default)
  ["gun_shot", (a) => ({
    location: LOC.lapangan(),
    cast: [
      { who: "joko", at: [-1.1, 0.2], facing: "right", hold: { prop: "rifle", style: "port" }, expr: "aim" },
      { who: "knil", at: [1.3, -0.6], lookAt: "joko", hold: { prop: "rifle", style: "port" } },
    ],
    actions: [{ who: "joko", do: "aimFire", target: "knil", at: a + 40 }],
    camera: [{ f: a, preset: "wide", on: ["joko", "knil"], angle: 12, push: 0.004 }, { f: a + 42, preset: "full", on: "knil", angle: -15, push: "punch" }],
  })],
  // 4 machine-gun burst at night, the target staggers (no fall)
  ["mg_burst", (a) => ({
    location: LOC.jalan_kota({ night: true }),
    cast: [
      { who: "gangster", at: [-1.4, -1.6], facing: "right", hold: { prop: "senapan_mesin", style: "hip_fire" }, expr: "angry" },
      { who: "polisi", at: [1.6, -1.9], lookAt: "gangster", expr: "shock" },
    ],
    actions: [{ who: "gangster", do: "aimFire", target: "polisi", times: 8, at: a + 30, fall: false }],
    camera: [{ f: a, preset: "wide", on: ["gangster", "polisi"], angle: -10, push: 0.004 }],
  })],
  // 5 katana slash, the victim falls
  ["sword_slash", (a) => ({
    location: LOC.hutan(),
    cast: [
      { who: "jepang", at: [-0.55, 0], lookAt: "budi", hold: { prop: "katana", style: "ready" }, expr: "battle" },
      { who: "budi", at: [0.6, -0.1], lookAt: "jepang", hold: { prop: "parang", style: "ready" }, expr: "stern" },
    ],
    actions: [{ who: "jepang", do: "slash", target: "budi", at: a + 45, fall: true }],
    camera: [{ f: a, preset: "twoShot", on: "jepang", to: "budi", angle: 8, push: 0.004 }],
  })],
  // 6 arrow: nock, draw, release; the arrow flies and sticks in the target (comedy, no blood)
  ["arrow", (a) => ({
    location: LOC.padang_rumput(),
    cast: [
      { who: "siti", at: [-1.4, 0.3], facing: "right", hold: { prop: "busur", style: "rest" }, expr: "aim" },
      { who: "knil", at: [1.6, -0.6], lookAt: "siti", hold: { prop: "rifle", style: "order" } },
    ],
    actions: [{ who: "siti", do: "drawRelease", target: "knil", at: a + 40 }],
    camera: [{ f: a, preset: "wide", on: ["siti", "knil"], angle: 10, push: 0.004 }],
  })],
  // 7 punch (stagger), then a kick (falls)
  ["punch", (a) => ({
    location: LOC.jalan_kota(),
    cast: [
      { who: "preman", at: [-0.5, -1.7], lookAt: "kota", expr: "angry" },
      { who: "kota", at: [0.55, -1.8], lookAt: "preman", expr: "nervous" },
    ],
    actions: [{ who: "preman", do: "punch", target: "kota", at: a + 30 }, { who: "preman", do: "kick", target: "kota", at: a + 58, fall: true }],
    camera: [{ f: a, preset: "twoShot", on: "preman", to: "kota", angle: -8, push: 0.004 }],
  })],
  // 8 blacksmith hammering the anvil (sparks) + a helper sawing
  ["forge_tools", (a) => ({
    location: LOC.bengkel_pandai_besi(),
    cast: [
      { who: "smith", at: "smith", lookAt: "anvil", hold: { prop: "palu", style: "hold" }, expr: "stern" },
      { who: "tukang", at: "helper", facing: "left", hold: { prop: "gergaji", style: "hold" } },
    ],
    actions: [{ who: "smith", do: "hammer", target: "anvil", times: 5, at: a + 20 }, { who: "tukang", do: "saw", times: 7, at: a + 24 }],
    camera: [{ f: a, preset: "full", on: ["smith", "tukang"], angle: 15, push: 0.003 }],
  })],
  // 9 digging with a hoe + drilling with a power drill
  ["dig_drill", (a) => ({
    location: LOC.lapangan({ path: false }),
    cast: [
      { who: "petani", at: [-1.0, 0], facing: "right", hold: { prop: "cangkul", style: "rest" } },
      { who: "tukang", at: [1.2, -0.3], facing: "left", hold: { prop: "bor", style: "hold" } },
    ],
    actions: [{ who: "petani", do: "dig", target: [-0.35, 0.05], times: 4, at: a + 20 }, { who: "tukang", do: "drill", target: [0.6, 0.95, -0.3], dur: 40, at: a + 30 }],
    camera: [{ f: a, preset: "full", on: ["petani", "tukang"], angle: 10, push: 0.004 }],
  })],
  // 10 pouring fuel from a jerrycan + spraying
  ["pour_spray", (a) => ({
    location: LOC.teras(),
    cast: [
      { who: "tukang", at: [-0.8, 0.2], facing: "right", hold: { prop: "jerigen", style: "low" } },
      { who: "ibu", at: [1.0, 0.1], facing: "left", hold: { prop: "semprotan", style: "hold" } },
    ],
    actions: [{ who: "tukang", do: "pour", at: a + 25, dur: 50 }, { who: "ibu", do: "spray", at: a + 35, dur: 40 }],
    camera: [{ f: a, preset: "full", on: ["tukang", "ibu"], push: 0.004 }],
  })],
  // 11 a motorbike rides across, a police car chases with the siren on
  ["ride", (a) => ({
    location: LOC.jalan_kota(),
    vehicles: [
      { id: "motor", kind: "motor", at: [-6, 0.6], moves: [{ to: [6, 0.6], a, b: a + 70, ease: "linear" }] },
      { id: "polisi_car", kind: "mobil_polisi", at: [-11, 1.6], siren: true, moves: [{ to: [3, 1.6], a, b: a + 90, ease: "linear" }] },
    ],
    cast: [
      { who: "kota", at: [0, 0], ride: { vehicle: "motor", seat: "driver" } },
      { who: "anak", at: [0, 0], ride: { vehicle: "motor", seat: "back" } },
      { who: "polisi", at: [0, 0], ride: { vehicle: "polisi_car", seat: "driver" } },
    ],
    camera: [{ f: a, preset: "follow", on: "motor", dist: 9 }],
  })],
  // 12 a tank fires at a far point: recoil, muzzle flash, shell, explosion
  ["tank_fire", (a) => ({
    location: LOC.lapangan({ trees: 10 }),
    vehicles: [{ id: "tank", kind: "tank", at: [-3, -2], turret: 0 }],
    cast: [{ who: "joko", at: [0, 0], ride: { vehicle: "tank", seat: "commander" }, pose: "point" }],
    actions: [{ who: "joko", do: "tankFire", prop: "tank", target: [4.5, -9], at: a + 30 }],
    camera: [{ f: a, preset: "free", pos: [-8, 3.4, 12], look: [0.6, 1.2, -4.5], fov: 40, push: 0.003 }],
  })],
  // 13 a helicopter lifts off
  ["heli_lift", (a) => ({
    location: LOC.lapangan(),
    vehicles: [{ id: "heli", kind: "helikopter", at: [0, -2], moves: [{ to: [0, 4, -2], a: a + 15, b: a + 85, ease: "in" }] }],
    cast: [{ who: "pilot", at: [0, 0], ride: { vehicle: "heli", seat: "pilot" } }],
    camera: [{ f: a, preset: "wide", on: [0, -2], dist: 16, height: 2.5, lookY: 2.2, push: 0.003 }],
  })],
  // 14 climbing a ladder
  ["climb", (a) => ({
    location: LOC.dinding_tangga(),
    cast: [{ who: "budi", at: "rung_0", pose: "climb_a" }],
    actions: [{ who: "budi", do: "climb", to: "rung_7", dur: 70, at: a + 80 }],
    camera: [{ f: a, preset: "full", on: "budi", dist: 4.4, angle: 25, push: 0.002 }],
  })],
  // 15 walk to the campfire log and sit down; then wave
  ["sit", (a) => ({
    location: LOC.camping(),
    cast: [{ who: "siti", at: [-2.4, 0.4], facing: "right", expr: "smile" }],
    actions: [{ who: "siti", do: "walkTo", to: [-1.0, -0.15], dur: 32, at: a + 36 }, { who: "siti", do: "sitDown", to: "log_left", at: a + 44 }, { who: "siti", do: "wave", at: a + 58, dur: 26 }],
    camera: [{ f: a, preset: "full", on: [-1.2, -0.4], dist: 4.6, angle: 10, push: 0.003 }],
  })],
  // 16 lift the glass dome, then press the red button (insert)
  ["dome_button", (a) => ({
    location: LOC.plaza_malam(),
    cast: [{ who: "kota", at: "pedestal", lookAt: "button", expr: "think" }],
    actions: [{ who: "kota", do: "liftLid", target: "button", at: a + 25 }, { who: "kota", do: "pressButton", target: "button", at: a + 62, insert: true }],
    camera: [{ f: a, preset: "medium", on: "kota", angle: 25, push: 0.003 }, { f: a + 50, preset: "insert", on: "button" }],
  })],
];

export const CLIP_LEN = L;
export const CLIP_NAMES = clips.map(([n]) => n);
export const PROJECT: Project = {
  name: "KitActions", fps: 30,
  // action SFX only (npm run kit:sfx -- kitactions && python scripts/kit-sfx-mix.py kitactions --out public/kitactions_sfx.wav)
  audio: "kitactions_sfx.wav",
  cast: {
    eko: OUTFITS.kantoran, pelaut: OUTFITS.pelaut, budi: OUTFITS.pejuang, knil: OUTFITS.knil, joko: OUTFITS.tni,
    gangster: OUTFITS.gangster, polisi: OUTFITS.polisi_modern, jepang: OUTFITS.tentara_jepang, siti: OUTFITS.laskar,
    preman: OUTFITS.preman, kota: OUTFITS.orang_kota, smith: OUTFITS.pandai_besi, tukang: OUTFITS.pekerja_bangunan,
    petani: OUTFITS.petani, ibu: OUTFITS.ibu, anak: OUTFITS.anak_laki,
    pilot: { ...OUTFITS.tni, hat: "helmet", hatCol: "#6a5a3a" },
  },
  shots: clips.map(([id, body], i) => ({ id, a: i * L, b: i * L + L, ...body(i * L) })),
};
