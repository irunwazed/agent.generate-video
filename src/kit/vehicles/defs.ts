// KIT VEHICLES (pure): what vehicles exist, where their seats are, and where a vehicle is at any frame.
// Local frame of a vehicle: +x = forward (the nose), +y = up, +z = its RIGHT side. Heading 0 = nose toward world +x
// (screen-right for the default camera), so with heading 0 the vehicle's right side (driver in Indonesia) faces the
// camera. A cast member rides with  ride: { vehicle: "car1", seat: "driver" }.
import type { V3, Place } from "../scene/types";

export type SeatPose = "drive" | "ride" | "sit" | "stand" | "paddle";
export type Seat = { pos: V3; pose: SeatPose; /** steering wheel / handlebar point(s) the hands reach for */ hands?: V3; note?: string };
export type VehicleKind = "motor" | "mobil" | "jip" | "mobil_polisi" | "truk" | "tank" | "pesawat" | "pesawat_tempur" | "helikopter" | "kapal" | "perahu";
export type VehicleDef = {
  kind: VehicleKind; label: string; length: number; height: number;
  seats: Record<string, Seat>;
  /** default speed m/s for `moves` without a duration */
  speed: number; wheelR?: number; air?: boolean; water?: boolean;
  /** points: muzzle (tank), exhaust, nose... */
  points?: Record<string, V3>;
};

export const VEHICLES: Record<VehicleKind, VehicleDef> = {
  motor: { kind: "motor", label: "motorbike", length: 1.9, height: 1.1, speed: 8, wheelR: 0.3, seats: {
    driver: { pos: [-0.12, 0.62, 0], pose: "ride", hands: [0.5, 0.98, 0], note: "rider" }, back: { pos: [-0.55, 0.66, 0], pose: "ride", note: "pillion (bonceng)" } },
    points: { exhaust: [-0.85, 0.3, 0.15] } },
  mobil: { kind: "mobil", label: "car (sedan)", length: 4.0, height: 1.45, speed: 10, wheelR: 0.33, seats: {
    driver: { pos: [-0.05, 0.6, 0.36], pose: "drive", hands: [0.5, 1.05, 0.36] }, front: { pos: [-0.05, 0.6, -0.36], pose: "sit" },
    back_l: { pos: [-0.95, 0.6, 0.36], pose: "sit" }, back_r: { pos: [-0.95, 0.6, -0.36], pose: "sit" } }, points: { exhaust: [-2.0, 0.3, 0.4] } },
  jip: { kind: "jip", label: "military jeep (open top)", length: 3.4, height: 1.6, speed: 9, wheelR: 0.36, seats: {
    driver: { pos: [-0.05, 0.5, 0.36], pose: "drive", hands: [0.45, 1.0, 0.36] }, front: { pos: [-0.05, 0.5, -0.36], pose: "sit" },
    back: { pos: [-0.9, 0.55, 0], pose: "sit" }, gunner: { pos: [-1.0, 0.55, 0], pose: "stand" } }, points: { exhaust: [-1.7, 0.3, 0.4] } },
  mobil_polisi: { kind: "mobil_polisi", label: "police car (siren lights)", length: 4.2, height: 1.6, speed: 12, wheelR: 0.33, seats: {
    driver: { pos: [-0.05, 0.6, 0.36], pose: "drive", hands: [0.5, 1.05, 0.36] }, front: { pos: [-0.05, 0.6, -0.36], pose: "sit" }, back_l: { pos: [-0.95, 0.6, 0.36], pose: "sit" } },
    points: { siren: [-0.2, 1.62, 0] } },
  truk: { kind: "truk", label: "army truck (canvas cover)", length: 5.6, height: 2.8, speed: 8, wheelR: 0.45, seats: {
    driver: { pos: [1.7, 0.95, 0.4], pose: "drive", hands: [2.15, 1.5, 0.4] }, cargo_0: { pos: [-0.6, 1.1, 0.45], pose: "sit" }, cargo_1: { pos: [-1.4, 1.1, 0.45], pose: "sit" } } },
  tank: { kind: "tank", label: "tank (turret + gun)", length: 5.2, height: 2.4, speed: 4, wheelR: 0.32, seats: {
    commander: { pos: [-0.3, 1.35, 0.2], pose: "stand", note: "standing in the turret hatch (upper body shows)" } },
    points: { muzzle: [3.3, 1.85, 0] } },
  pesawat: { kind: "pesawat", label: "propeller plane", length: 7, height: 2.4, speed: 30, air: true, seats: { pilot: { pos: [0.4, 1.0, 0], pose: "sit" } }, points: { nose: [3.4, 1.3, 0] } },
  pesawat_tempur: { kind: "pesawat_tempur", label: "fighter jet", length: 9, height: 2.6, speed: 60, air: true, seats: { pilot: { pos: [1.6, 1.25, 0], pose: "sit" } }, points: { nose: [4.6, 1.2, 0], engine: [-4.4, 1.1, 0] } },
  helikopter: { kind: "helikopter", label: "helicopter", length: 8, height: 2.8, speed: 15, air: true, seats: {
    pilot: { pos: [0.9, 0.55, 0.25], pose: "sit" }, passenger: { pos: [-0.1, 0.55, 0.35], pose: "sit" } } },
  kapal: { kind: "kapal", label: "ship (steam / navy)", length: 16, height: 9, speed: 5, water: true, seats: {
    deck_0: { pos: [2, 1.8, 0.8], pose: "stand" }, deck_1: { pos: [0, 1.8, 0.8], pose: "stand" }, deck_2: { pos: [-2, 1.8, 0.8], pose: "stand" }, bridge: { pos: [-3.6, 3.9, 0.6], pose: "stand" } } },
  perahu: { kind: "perahu", label: "jukung outrigger canoe", length: 4.2, height: 0.9, speed: 2.5, water: true, seats: {
    front: { pos: [0.8, 0.12, 0], pose: "paddle" }, back: { pos: [-0.8, 0.12, 0], pose: "paddle" }, middle: { pos: [0, 0.12, 0], pose: "sit" } } },
};
export const VEHICLE_NAMES = Object.keys(VEHICLES) as VehicleKind[];

export type VehicleMove = { to: Place; a: number; b: number; ease?: "inOut" | "linear" | "in" | "out" };
export type VehicleSpec = {
  id: string; kind: VehicleKind; at: Place;
  /** nose direction in degrees: 0 = world +x (screen-right), 90 = toward -z (away), -90 = toward the camera */
  heading?: number;
  /** height above the ground (planes / helicopters in the air) */
  alt?: number;
  /** straight-line moves between frames (the vehicle turns toward its motion) */
  moves?: VehicleMove[];
  color?: string; siren?: boolean; lights?: boolean;
  /** tank turret yaw (degrees, relative) */
  turret?: number;
};
export type VehiclePose = { pos: V3; heading: number; dist: number; speed: number; bank: number; pitch: number; bob: number };

const ease = (t: number, e: VehicleMove["ease"] = "inOut") => {
  const x = Math.max(0, Math.min(1, t));
  return e === "linear" ? x : e === "in" ? x * x : e === "out" ? 1 - (1 - x) * (1 - x) : x * x * (3 - 2 * x);
};
/** vehicle pose at frame f (pure). `place` resolves anchors / places to world points. */
export const vehiclePose = (v: VehicleSpec, f: number, place: (p: Place) => V3, fps = 30): VehiclePose => {
  const def = VEHICLES[v.kind];
  let p = place(v.at), heading = ((v.heading ?? 0) * Math.PI) / 180, dist = 0, speed = 0, bank = 0;
  const alt = v.alt ?? 0;
  for (const m of v.moves ?? []) {
    const to = place(m.to), dx = to[0] - p[0], dz = to[2] - p[2], L = Math.hypot(dx, dz);
    const segHeading = L > 0.01 ? Math.atan2(-dz, dx) : heading;
    if (f <= m.a) break;
    const t = ease((f - m.a) / Math.max(1, m.b - m.a), m.ease);
    const t2 = ease((f + 1 - m.a) / Math.max(1, m.b - m.a), m.ease);
    const turn = Math.min(1, (f - m.a) / 12);
    let dh = segHeading - heading; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    if (f < m.b) {
      p = [p[0] + dx * t, p[1] + (to[1] - p[1]) * t, p[2] + dz * t];
      dist += L * t; speed = (L * (t2 - t)) * fps;
      bank = def.air ? -dh * 0.4 * (1 - turn) : 0;
      heading = heading + dh * turn;
      return { pos: [p[0], p[1] + alt, p[2]], heading, dist, speed, bank, pitch: 0, bob: def.water ? Math.sin(f / fps * 2.2) * 0.04 : 0 };
    }
    p = [to[0], to[1], to[2]]; dist += L; heading = segHeading;
  }
  return { pos: [p[0], p[1] + alt, p[2]], heading, dist, speed, bank, pitch: 0, bob: def.water ? Math.sin(f / fps * 2.2) * 0.04 : 0 };
};
/** a local point of a vehicle -> world, for a pose */
export const vehicleToWorld = (vp: VehiclePose, local: V3): V3 => {
  const c = Math.cos(vp.heading), s = Math.sin(vp.heading);
  // local +x forward, +z right; world: heading h rotates +x toward -z (h = 90 deg -> nose at -z)
  return [vp.pos[0] + local[0] * c + local[2] * s, vp.pos[1] + local[1] + vp.bob, vp.pos[2] - local[0] * s + local[2] * c];
};
