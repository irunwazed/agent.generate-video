// KIT VEHICLES (render): procedural low-poly vehicles in the set style (two-tone + ink). Local frame: +x forward,
// +y up, +z the vehicle's right side. Wheels / rotors / propellers are separate parts so they can spin.
import * as THREE from "three";
import { Batch, V3, col, glow, boxC, cyl, sphere, lathe, extrude, mat4, part, rod, glass, quad } from "../sets/prims";
import { planksHD } from "../core/paint";
import { tex } from "../sets/prims";
import type { VehicleKind } from "./defs";

export type BuiltVehicle = {
  root: THREE.Group; body: THREE.Group;
  wheels: { obj: THREE.Object3D; r: number }[];
  spin: { obj: THREE.Object3D; axis: "x" | "y" | "z"; rate: number }[];
  turret?: THREE.Object3D; barrel?: THREE.Object3D;
  siren?: THREE.Mesh[];
};
const TIRE = "#2b2b30", HUB = "#c9ced6";

const wheel = (r: number, w: number, hub = HUB) => {
  const g = new THREE.Group();
  const t = part(new THREE.CylinderGeometry(r, r, w, 18).rotateX(Math.PI / 2), col(TIRE));
  const h = part(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 12).rotateX(Math.PI / 2), col(hub));
  const s = part(new THREE.BoxGeometry(r * 1.0, r * 0.14, w + 0.04), col("#7d848e"));
  g.add(t, h, s);
  return g;
};
const addWheels = (bv: BuiltVehicle, pts: V3[], r: number, w: number) => {
  for (const p of pts) { const wh = wheel(r, w); wh.position.set(...p); bv.body.add(wh); bv.wheels.push({ obj: wh, r }); }
};
/** windows: dark-blue glass panes on a box side */
const pane = (b: Batch, c: V3, w: number, h: number, ry: number) => quad(b, c, w, h, col("#3a5a7a"), ry);
/** see-through cabin: roof slab, 4 pillars, glass on the sides / front / back (riders inside stay visible) */
const cabin = (b: Batch, cx: number, y0: number, y1: number, len: number, wid: number, roof: THREE.Material) => {
  boxC(b, [cx, y1, 0], [len, 0.07, wid], roof);
  for (const x of [cx - len / 2 + 0.05, cx + len / 2 - 0.05]) for (const z of [wid / 2 - 0.04, -wid / 2 + 0.04]) boxC(b, [x, (y0 + y1) / 2, z], [0.08, y1 - y0, 0.08], roof);
  const g = glass("#cfe8f4", 0.28), h = y1 - y0 - 0.04, ym = (y0 + y1) / 2;
  for (const z of [wid / 2, -wid / 2]) quad(b, [cx, ym, z], len - 0.1, h, g, z > 0 ? 0 : Math.PI);
  quad(b, [cx + len / 2, ym, 0], wid - 0.1, h, g, Math.PI / 2); quad(b, [cx - len / 2, ym, 0], wid - 0.1, h, g, -Math.PI / 2);
};
/** lathe lying along +x (fuselages, hulls): profile [radius, position along x] */
const latheX = (b: Batch, prof: [number, number][], m: THREE.Material, at: V3, seg = 12, s: V3 = [1, 1, 1]) =>
  b.add(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg).rotateZ(-Math.PI / 2), m, mat4(at, 0, s));

export const buildVehicle = (kind: VehicleKind, color?: string): BuiltVehicle => {
  const root = new THREE.Group(), body = new THREE.Group(), b = new Batch();
  root.add(body);
  const bv: BuiltVehicle = { root, body, wheels: [], spin: [] };
  const C = (d: string) => col(color ?? d);
  switch (kind) {
    case "mobil": case "mobil_polisi": {
      const police = kind === "mobil_polisi", main = police ? col("#f4f1ea") : C("#c0392b");
      boxC(b, [0, 0.62, 0], [4.0, 0.62, 1.7], main);
      cabin(b, -0.2, 0.93, 1.44, 2.2, 1.5, police ? col("#f4f1ea") : main);
      if (police) { boxC(b, [0.1, 0.62, 0.86], [1.6, 0.5, 0.02], col("#1e2a4a")); boxC(b, [0.1, 0.62, -0.86], [1.6, 0.5, 0.02], col("#1e2a4a")); }
      for (const z of [0.55, -0.55]) { boxC(b, [2.0, 0.66, z], [0.04, 0.16, 0.3], glow("#fff4c8", 1.6)); boxC(b, [-2.0, 0.66, z], [0.04, 0.14, 0.3], glow("#ff4a3a", 1.4)); }
      boxC(b, [2.02, 0.42, 0], [0.08, 0.14, 1.72], col("#7d848e")); boxC(b, [-2.02, 0.42, 0], [0.08, 0.14, 1.72], col("#7d848e"));
      if (police) {
        boxC(b, [-0.2, 1.47, 0], [0.3, 0.08, 1.1], col("#2b2b30"));
        const red = part(new THREE.BoxGeometry(0.26, 0.14, 0.45), glow("#ff3030", 2.6), [-0.2, 1.57, 0.28]);
        const blue = part(new THREE.BoxGeometry(0.26, 0.14, 0.45), glow("#3a6cff", 2.6), [-0.2, 1.57, -0.28]);
        body.add(red, blue); bv.siren = [red, blue];
      }
      addWheels(bv, [[1.3, 0.33, 0.8], [1.3, 0.33, -0.8], [-1.3, 0.33, 0.8], [-1.3, 0.33, -0.8]], 0.33, 0.24);
      break;
    }
    case "jip": {
      const m = C("#5b6b3a");
      boxC(b, [0, 0.72, 0], [3.4, 0.55, 1.6], m);
      boxC(b, [1.15, 0.98, 0], [1.0, 0.06, 1.5], m);
      boxC(b, [0.62, 1.3, 0], [0.04, 0.6, 1.5], col("#3d4148"));
      pane(b, [0.64, 1.32, 0], 1.3, 0.45, Math.PI / 2);
      for (const z of [0.4, -0.4]) boxC(b, [-0.2, 0.72, z], [0.5, 0.5, 0.5], col("#4a5a30"));
      const sp = wheel(0.34, 0.2); sp.rotation.y = Math.PI / 2; sp.position.set(-1.78, 0.9, 0); body.add(sp);
      boxC(b, [1.72, 0.7, 0], [0.06, 0.3, 1.2], col("#3d4148"));
      addWheels(bv, [[1.1, 0.36, 0.82], [1.1, 0.36, -0.82], [-1.1, 0.36, 0.82], [-1.1, 0.36, -0.82]], 0.36, 0.26);
      break;
    }
    case "truk": {
      const m = C("#5b6b3a");
      boxC(b, [1.85, 0.75, 0], [1.6, 0.7, 2.0], m);
      cabin(b, 1.85, 1.1, 1.9, 1.6, 2.0, m);
      boxC(b, [-0.9, 0.75, 0], [3.8, 0.25, 2.1], col("#4a3a2a"));
      extrude(b, [[-1.0, 0], [1.0, 0], [1.0, 0.9], [0.6, 1.4], [-0.6, 1.4], [-1.0, 0.9]], 3.7, col("#7a7a52"), [-0.9, 0.88, 0], Math.PI / 2);
      addWheels(bv, [[1.9, 0.45, 1.0], [1.9, 0.45, -1.0], [-1.6, 0.45, 1.0], [-1.6, 0.45, -1.0], [-0.6, 0.45, 1.0], [-0.6, 0.45, -1.0]], 0.45, 0.3);
      break;
    }
    case "motor": {
      const m = C("#c0392b");
      rod(b, [0.55, 0.3, 0], [0.38, 0.95, 0], 0.035, col("#3d4148"));
      rod(b, [-0.55, 0.3, 0], [0.0, 0.55, 0], 0.04, col("#3d4148"));
      boxC(b, [0.05, 0.6, 0], [0.75, 0.28, 0.3], m);
      boxC(b, [-0.35, 0.72, 0], [0.7, 0.08, 0.28], col("#2b2b30"));
      rod(b, [0.4, 0.98, -0.32], [0.4, 0.98, 0.32], 0.025, col("#2b2b30"));
      boxC(b, [0.62, 0.85, 0], [0.12, 0.14, 0.18], glow("#fff4c8", 1.4));
      rod(b, [-0.7, 0.32, 0.16], [-0.1, 0.36, 0.16], 0.045, col("#9aa3ad"));
      addWheels(bv, [[0.6, 0.3, 0], [-0.6, 0.3, 0]], 0.3, 0.12);
      break;
    }
    case "tank": {
      const m = C("#5b6b3a");
      extrude(b, [[-2.5, 0.35], [2.3, 0.35], [2.6, 0.8], [2.2, 1.2], [-2.4, 1.2], [-2.6, 0.8]], 2.4, m, [0, 0, 0], 0);
      for (const z of [1.25, -1.25]) {
        boxC(b, [0, 0.5, z], [5.0, 0.75, 0.5], col("#3a3d34"));
        for (let i = 0; i < 6; i++) { const wh = part(new THREE.CylinderGeometry(0.3, 0.3, 0.52, 14).rotateX(Math.PI / 2), col("#4a4d44"), [-2 + i * 0.8, 0.42, z]); body.add(wh); bv.wheels.push({ obj: wh, r: 0.3 }); }
      }
      const tur = new THREE.Group(); tur.position.set(-0.3, 1.2, 0); body.add(tur);
      const tb = new Batch(); lathe(tb, [[1.05, 0], [1.0, 0.45], [0.75, 0.62], [0.001, 0.62]], m, [0, 0, 0], 10); tb.build(tur);
      const bar = new THREE.Group(); bar.position.set(0.8, 0.32, 0); tur.add(bar);
      const bb = new Batch(); rod(bb, [0, 0, 0], [2.6, 0, 0], 0.1, col("#3a3d34"), 10); cyl(bb, [2.5, -0.13, 0], 0.13, 0.26, col("#2b2b30"), 10); bb.build(bar);
      bv.turret = tur; bv.barrel = bar;
      break;
    }
    case "pesawat": {
      const m = C("#d8c8a0");
      latheX(b, [[0.001, -3.2], [0.4, -2.4], [0.62, 0.2], [0.6, 2.4], [0.45, 3.2], [0.001, 3.3]], m, [0, 1.25, 0], 12);
      boxC(b, [0.6, 1.1, 0], [1.4, 0.12, 9.5], m);
      boxC(b, [-3.0, 1.5, 0], [0.8, 0.08, 3.0], m); boxC(b, [-3.1, 2.0, 0], [0.8, 1.0, 0.08], col("#c0392b"));
      sphere(b, [0.6, 1.85, 0], 0.4, glass("#bfe0ee", 0.5), [1.6, 0.8, 0.9], 10);
      for (const z of [1.2, -1.2]) cyl(b, [0.8, 0, z], 0.04, 1.0, col("#3d4148"), 6);
      addWheels(bv, [[0.8, 0.22, 1.2], [0.8, 0.22, -1.2]], 0.22, 0.14);
      const pr = new THREE.Group(); pr.position.set(3.35, 1.25, 0);
      pr.add(part(new THREE.BoxGeometry(0.05, 2.0, 0.16), col("#2b2b30")), part(new THREE.ConeGeometry(0.16, 0.3, 10).rotateZ(-Math.PI / 2), col("#c0392b"), [0.1, 0, 0]));
      body.add(pr); bv.spin.push({ obj: pr, axis: "x", rate: 40 });
      break;
    }
    case "pesawat_tempur": {
      const m = C("#8a9aa8");
      latheX(b, [[0.001, -4.4], [0.5, -4.2], [0.65, -1.0], [0.55, 2.4], [0.001, 4.8]], m, [0, 1.2, 0], 10);
      extrude(b, [[-2.2, 0], [1.4, 0], [-1.6, 4.2], [-2.6, 4.2]], 0.1, m, [0, 1.05, 0], 0);
      extrude(b, [[-2.2, 0], [1.4, 0], [-1.6, -4.2], [-2.6, -4.2]], 0.1, m, [0, 1.05, 0], 0);
      for (const z of [0.45, -0.45]) extrude(b, [[-4.4, 0], [-3.2, 0], [-4.2, 1.6], [-4.7, 1.6]], 0.08, m, [0, 1.4, z], 0);
      sphere(b, [1.6, 1.75, 0], 0.4, glass("#8ac0e0", 0.55), [2.2, 0.8, 0.9], 10);
      const ab = part(new THREE.ConeGeometry(0.42, 1.4, 12).rotateZ(Math.PI / 2), glow("#ff9a3a", 2.4), [-5.0, 1.2, 0]);
      body.add(ab);
      break;
    }
    case "helikopter": {
      const m = C("#3f6a4a");
      // opaque rear body + a big glass bubble in front: the pilot shows through it
      sphere(b, [-0.25, 1.15, 0], 0.95, m, [1.25, 1.0, 0.95], 14);
      sphere(b, [0.85, 1.12, 0], 0.86, glass("#cfe8f4", 0.32), [1.3, 0.95, 1.02], 14);
      boxC(b, [0.7, 0.3, 0], [1.9, 0.1, 1.3], m);
      rod(b, [-0.8, 1.3, 0], [-4.4, 1.6, 0], 0.16, m, 8);
      boxC(b, [-4.4, 2.0, 0], [0.6, 0.9, 0.08], m);
      for (const z of [0.7, -0.7]) { rod(b, [-0.8, 0.05, z], [1.4, 0.05, z], 0.05, col("#3d4148"), 6); rod(b, [0.4, 0.05, z], [0.4, 0.5, z * 0.8], 0.04, col("#3d4148"), 6); }
      cyl(b, [0.3, 2.15, 0], 0.08, 0.35, col("#3d4148"), 8);
      const rot = new THREE.Group(); rot.position.set(0.3, 2.5, 0);
      for (const a of [0, Math.PI / 2]) { const bl = part(new THREE.BoxGeometry(7.6, 0.04, 0.24), col("#2b2b30")); bl.rotation.y = a; rot.add(bl); }
      body.add(rot); bv.spin.push({ obj: rot, axis: "y", rate: 30 });
      const tr = new THREE.Group(); tr.position.set(-4.45, 2.0, 0.08);
      tr.add(part(new THREE.BoxGeometry(1.1, 0.12, 0.03), col("#2b2b30")));
      body.add(tr); bv.spin.push({ obj: tr, axis: "z", rate: 45 });
      break;
    }
    case "kapal": {
      const m = C("#3d4a5a");
      extrude(b, [[-8, 1.9], [7, 1.9], [8.4, 2.6], [8.0, 1.2], [6.5, -0.6], [-7.6, -0.6], [-8, 0.6]], 4.0, m, [0, 0, 0], 0);
      boxC(b, [-0.2, 1.88, 0], [15.4, 0.08, 3.9], tex("planksHD", planksHD, 1.2, "#c8986a"));
      boxC(b, [-3.6, 2.9, 0], [3.2, 2.0, 2.8], col("#f4f1ea"));
      for (let i = 0; i < 4; i++) for (const z of [1.41, -1.41]) quad(b, [-4.6 + i * 0.7, 3.2, z], 0.4, 0.4, col("#3a5a7a"), z > 0 ? 0 : Math.PI);
      boxC(b, [-3.6, 4.0, 0], [3.6, 0.15, 3.1], col("#c9c3b0"));
      cyl(b, [-1.2, 2.0, 0], 0.55, 3.2, col("#c0392b"), 14); cyl(b, [-1.2, 5.0, 0], 0.6, 0.35, col("#2b2b30"), 14);
      cyl(b, [3.2, 2.0, 0], 0.09, 6.5, col("#6b4426"), 8);
      for (const z of [2.0, -2.0]) boxC(b, [-0.2, 2.25, z * 0.98], [15.6, 0.6, 0.06], col("#c9ced6"));
      break;
    }
    case "perahu": {
      const m = C("#c0392b");
      latheX(b, [[0.001, -2.1], [0.32, -1.4], [0.42, 0], [0.32, 1.4], [0.001, 2.2]], m, [0, 0.12, 0], 10, [1, 0.6, 1]);
      boxC(b, [0, 0.27, 0], [3.4, 0.05, 0.5], col("#f2c230"));
      for (const z of [1.5, -1.5]) { rod(b, [-1.4, 0.05, z], [1.4, 0.05, z], 0.07, col("#c8b06a"), 6); for (const x of [-0.8, 0.8]) rod(b, [x, 0.3, 0], [x, 0.1, z], 0.035, col("#8a6a3a"), 5); }
      break;
    }
  }
  b.build(body);
  return bv;
};
