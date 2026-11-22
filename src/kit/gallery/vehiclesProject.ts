// KIT VEHICLE GALLERY: every vehicle in a fitting location with its riders (30 f each; some drive across).
// Render: npm run kit:vehicles  -> out/kit/vehicles/KitVehiclesShort_<15 + 30 i>.jpg
import type { Project, ShotSpec } from "../scene/types";
import { OUTFITS } from "../toon/outfits";
import { LOC } from "../sets/locations";
import { VEHICLE_NAMES, VehicleKind } from "../vehicles/defs";

const street = LOC.jalan_kota(), field = LOC.lapangan({ trees: 10 }), sea = LOC.laut(), grass = LOC.padang_rumput();
type Cfg = Pick<ShotSpec, "location" | "vehicles" | "cast" | "camera">;
const shot = (i: number, k: VehicleKind, cfg: (a: number) => Cfg): ShotSpec => ({ id: k, a: i * 30, b: i * 30 + 30, ...cfg(i * 30) });
const C: Record<VehicleKind, (a: number) => Cfg> = {
  motor: (a) => ({ location: street, vehicles: [{ id: "v", kind: "motor", at: [-3, 1.0], moves: [{ to: [3, 1.0], a, b: a + 30, ease: "linear" }] }],
    cast: [{ who: "kota", at: [0, 0], ride: { vehicle: "v", seat: "driver" } }, { who: "anak", at: [0, 0], ride: { vehicle: "v", seat: "back" } }],
    camera: [{ f: a, preset: "full", on: "v", dist: 5.2 }] }),
  mobil: (a) => ({ location: street, vehicles: [{ id: "v", kind: "mobil", at: [0, 1.0], color: "#2f7ac0" }], cast: [{ who: "kantor", at: [0, 0], ride: { vehicle: "v", seat: "driver" } }],
    camera: [{ f: a, preset: "full", on: "v", dist: 8.5, angle: 20 }] }),
  jip: (a) => ({ location: field, vehicles: [{ id: "v", kind: "jip", at: [0, 0] }], cast: [{ who: "tni", at: [0, 0], ride: { vehicle: "v", seat: "driver" } }, { who: "tni2", at: [0, 0], ride: { vehicle: "v", seat: "gunner" }, hold: { prop: "rifle", style: "port" } }],
    camera: [{ f: a, preset: "full", on: "v", dist: 8, angle: 25 }] }),
  mobil_polisi: (a) => ({ location: LOC.jalan_kota({ night: true }), vehicles: [{ id: "v", kind: "mobil_polisi", at: [-4, 1.0], siren: true, lights: true, moves: [{ to: [2, 1.0], a, b: a + 30, ease: "out" }] }],
    cast: [{ who: "polisi", at: [0, 0], ride: { vehicle: "v", seat: "driver" } }], camera: [{ f: a, preset: "full", on: [0, 1.0], dist: 9 }] }),
  truk: (a) => ({ location: field, vehicles: [{ id: "v", kind: "truk", at: [0, 0] }], cast: [{ who: "tni", at: [0, 0], ride: { vehicle: "v", seat: "driver" } }, { who: "tni2", at: [0, 0], ride: { vehicle: "v", seat: "cargo_0" } }],
    camera: [{ f: a, preset: "wide", on: "v", dist: 12, angle: 30 }] }),
  tank: (a) => ({ location: field, vehicles: [{ id: "v", kind: "tank", at: [0, 0], turret: 20 }], cast: [{ who: "tni", at: [0, 0], ride: { vehicle: "v", seat: "commander" }, pose: "point" }],
    camera: [{ f: a, preset: "wide", on: "v", dist: 12, angle: 35, height: 3 }] }),
  pesawat: (a) => ({ location: grass, vehicles: [{ id: "v", kind: "pesawat", at: [0, -2], alt: 0 }], cast: [{ who: "pilot", at: [0, 0], ride: { vehicle: "v", seat: "pilot" } }],
    camera: [{ f: a, preset: "wide", on: "v", dist: 15, angle: 30, height: 2.5 }] }),
  pesawat_tempur: (a) => ({ location: grass, vehicles: [{ id: "v", kind: "pesawat_tempur", at: [0, -2], alt: 6, moves: [{ to: [6, -2], a, b: a + 30, ease: "linear" }] }],
    cast: [{ who: "pilot", at: [0, 0], ride: { vehicle: "v", seat: "pilot" } }], camera: [{ f: a, preset: "wide", on: "v", dist: 20, height: 5 }] }),
  helikopter: (a) => ({ location: field, vehicles: [{ id: "v", kind: "helikopter", at: [0, -1], alt: 2.5 }], cast: [{ who: "pilot", at: [0, 0], ride: { vehicle: "v", seat: "pilot" } }],
    camera: [{ f: a, preset: "wide", on: "v", dist: 15, height: 3 }] }),
  kapal: (a) => ({ location: sea, vehicles: [{ id: "v", kind: "kapal", at: [0, -8] }], cast: [{ who: "pelaut", at: [0, 0], ride: { vehicle: "v", seat: "deck_1" }, pose: "wave" }],
    camera: [{ f: a, preset: "free", pos: [6, 4, 14], look: [0, 3, -8], fov: 40 }] }),
  perahu: (a) => ({ location: sea, vehicles: [{ id: "v", kind: "perahu", at: [0, -1] }], cast: [{ who: "petani", at: [0, 0], ride: { vehicle: "v", seat: "front" } }, { who: "anak", at: [0, 0], ride: { vehicle: "v", seat: "back" } }],
    camera: [{ f: a, preset: "full", on: "v", dist: 7, height: 1.8 }] }),
};
export const VEHICLES_PROJECT: Project = {
  name: "KitVehicles", fps: 30,
  cast: { kota: OUTFITS.orang_kota, anak: OUTFITS.anak_laki, kantor: OUTFITS.kantoran, tni: OUTFITS.tni, tni2: OUTFITS.tni, polisi: OUTFITS.polisi_modern,
    pilot: { ...OUTFITS.tni, hat: "helmet", hatCol: "#6a5a3a" }, pelaut: OUTFITS.pelaut, petani: OUTFITS.petani },
  shots: VEHICLE_NAMES.map((k, i) => shot(i, k, C[k])),
};
