// KIT SETS: architecture. room() builds an interior open toward the camera (+z): floor, back / left / right walls with
// window and door openings cut out, optional ceiling, skirting and wainscot. Plus doors, windows, stairs, ladders.
// Units: metres; the room is centred on x = 0, its back wall at z = -d/2, the open side at z = +d/2.
import * as THREE from "three";
import { Batch, V3, box, boxC, col, tex, glass, glow, quad, mat4 } from "./prims";
import { wallTex, tileTex, ceilingTex, woodPanelTex } from "./textures";
import { planksHD } from "../core/paint";

export type WallName = "back" | "left" | "right";
export type Opening = {
  wall: WallName; kind: "window" | "door" | "arch";
  /** centre along the wall (m): back wall -> x, side walls -> z */
  at: number; w: number; h: number;
  /** bottom of the opening above the floor (windows ~0.85; doors 0) */
  sill?: number;
  /** lit from inside (night exteriors) */
  lit?: boolean;
};
export type RoomOpts = {
  w: number; d: number; h?: number;
  /** material keys or a THREE material */
  wall?: THREE.Material; floor?: THREE.Material; ceiling?: THREE.Material | null;
  /** lower wall panelling (wainscot) material and height */
  wainscot?: THREE.Material; wainscotH?: number;
  openings?: Opening[];
  /** which walls exist (default all three) */
  walls?: WallName[];
  skirting?: string;
  frame?: string;
};
const T = 0.12;

/** a wall along x from x0 to x1 at z (normal +z), with rectangular openings [{c, w, y0, y1}] */
const wallX = (b: Batch, x0: number, x1: number, z: number, h: number, m: THREE.Material, holes: { c: number; w: number; y0: number; y1: number }[], thick = T) => {
  const hs = [...holes].sort((a, b2) => a.c - b2.c);
  let x = x0;
  for (const o of hs) {
    const l = o.c - o.w / 2, r = o.c + o.w / 2;
    if (l > x) box(b, [x, 0, z - thick], [l, h, z], m);
    if (o.y0 > 0) box(b, [l, 0, z - thick], [r, o.y0, z], m);
    if (o.y1 < h) box(b, [l, o.y1, z - thick], [r, h, z], m);
    x = r;
  }
  if (x < x1) box(b, [x, 0, z - thick], [x1, h, z], m);
};
/** the same along z at x (normal pointing to the room centre: sgn = +1 for the left wall, -1 for the right) */
const wallZ = (b: Batch, z0: number, z1: number, x: number, sgn: number, h: number, m: THREE.Material, holes: { c: number; w: number; y0: number; y1: number }[]) => {
  const hs = [...holes].sort((a, b2) => a.c - b2.c);
  const xa = sgn > 0 ? x - T : x, xb = sgn > 0 ? x : x + T;
  let z = z0;
  for (const o of hs) {
    const l = o.c - o.w / 2, r = o.c + o.w / 2;
    if (l > z) box(b, [xa, 0, z], [xb, h, l], m);
    if (o.y0 > 0) box(b, [xa, 0, l], [xb, o.y0, r], m);
    if (o.y1 < h) box(b, [xa, o.y1, l], [xb, h, r], m);
    z = r;
  }
  if (z < z1) box(b, [xa, 0, z], [xb, h, z1], m);
};

/** window frame + glass + sill in an opening; `c` = centre on the wall plane, ry = wall orientation */
export const windowIn = (b: Batch, c: V3, w: number, h: number, ry: number, frameCol = "#f4f1ea", lit = false) => {
  const fm = col(frameCol), s = 0.06;
  const P = (x: number, y: number, z = 0): V3 => [c[0] + x * Math.cos(ry) + z * Math.sin(ry), c[1] + y, c[2] - x * Math.sin(ry) + z * Math.cos(ry)];
  boxC(b, P(0, h / 2 - s / 2), [w, s, 0.1], fm, ry); boxC(b, P(0, -h / 2 + s / 2), [w, s, 0.1], fm, ry);
  boxC(b, P(-w / 2 + s / 2, 0), [s, h, 0.1], fm, ry); boxC(b, P(w / 2 - s / 2, 0), [s, h, 0.1], fm, ry);
  boxC(b, P(0, 0), [0.04, h, 0.08], fm, ry); boxC(b, P(0, 0), [w, 0.04, 0.08], fm, ry);
  boxC(b, P(0, -h / 2 - 0.02, 0.06), [w + 0.12, 0.05, 0.2], fm, ry);
  quad(b, P(0, 0, -0.02), w - 0.08, h - 0.08, lit ? glow("#ffd890", 1.6) : glass(), ry);
};
/** door frame + panel (closed, or `open` 0..1 swung inward) */
export const doorIn = (b: Batch, c: V3, w: number, h: number, ry: number, color = "#7a4a2a", open = 0, lit = false) => {
  const fm = col("#5a3a22"), s = 0.07;
  const P = (x: number, y: number, z = 0): V3 => [c[0] + x * Math.cos(ry) + z * Math.sin(ry), c[1] + y, c[2] - x * Math.sin(ry) + z * Math.cos(ry)];
  boxC(b, P(-w / 2 - s / 2, h / 2), [s, h + s, 0.16], fm, ry); boxC(b, P(w / 2 + s / 2, h / 2), [s, h + s, 0.16], fm, ry);
  boxC(b, P(0, h + s / 2), [w + 2 * s, s, 0.16], fm, ry);
  if (lit) quad(b, P(0, h / 2, -0.1), w, h, glow("#ffd890", 1.4), ry);
  const a = open * 1.3, hx = -w / 2;
  const pc = P(hx + (w / 2) * Math.cos(a), h / 2, -(w / 2) * Math.sin(a));
  boxC(b, pc, [w, h, 0.05], col(color), ry + a);
  const kn = P(hx + (w - 0.1) * Math.cos(a), 0.95, -(w - 0.1) * Math.sin(a) + 0.04);
  boxC(b, kn, [0.04, 0.04, 0.06], col("#e8c45a"), ry + a);
};

/** a group whose meshes hide when the camera is OUTSIDE its plane ("dollhouse" walls: side angles see in) */
const cullGroup = (root: THREE.Object3D, b: Batch, n: V3, p: V3) => {
  const g = new THREE.Group();
  g.userData.cullN = n; g.userData.cullP = p;
  b.build(g);
  root.add(g);
};
/** a room open toward +z. Pass `root` so the walls / ceiling become dollhouse parts (hidden when the camera is
 *  behind them); without it they are merged into `b` and always visible. */
export const room = (b: Batch, o: RoomOpts, root?: THREE.Object3D) => {
  const h = o.h ?? 2.7, w = o.w, d = o.d, x0 = -w / 2, x1 = w / 2, zb = -d / 2, zf = d / 2;
  const wallM = o.wall ?? tex("wall#e8e2d4", () => wallTex("#e8e2d4"), 2);
  const floorM = o.floor ?? tex("tile#d8d2c4", () => tileTex("#d8d2c4", "#c8c0b0"), 1.2);
  const walls = o.walls ?? ["back", "left", "right"];
  const ops = o.openings ?? [];
  const holes = (wn: WallName) => ops.filter((x) => x.wall === wn).map((x) => ({ c: x.at, w: x.w, y0: x.sill ?? (x.kind === "window" ? 0.85 : 0), y1: (x.sill ?? (x.kind === "window" ? 0.85 : 0)) + x.h }));
  box(b, [x0 - 0.5, -0.1, zb - 0.5], [x1 + 0.5, 0, zf + 2], floorM);
  const bw = root ? { back: new Batch(), left: new Batch(), right: new Batch(), top: new Batch() } : null;
  if (walls.includes("back")) wallX(bw?.back ?? b, x0, x1, zb, h, wallM, holes("back"));
  if (walls.includes("left")) wallZ(bw?.left ?? b, zb, zf, x0, 1, h, wallM, holes("left"));
  if (walls.includes("right")) wallZ(bw?.right ?? b, zb, zf, x1, -1, h, wallM, holes("right"));
  if (o.ceiling !== null) box(bw?.top ?? b, [x0 - 0.2, h, zb - 0.2], [x1 + 0.2, h + 0.1, zf - 0.6], o.ceiling ?? tex("ceiling", ceilingTex, 1.2));
  // skirting + wainscot
  const sk = col(o.skirting ?? "#6b4426"), wn = o.wainscot, wh = o.wainscotH ?? 0.9;
  if (walls.includes("back")) { const t = bw?.back ?? b; box(t, [x0, 0, zb], [x1, 0.1, zb + 0.02], sk); if (wn) box(t, [x0, 0, zb], [x1, wh, zb + 0.015], wn); }
  if (walls.includes("left")) { const t = bw?.left ?? b; box(t, [x0, 0, zb], [x0 + 0.02, 0.1, zf], sk); if (wn) box(t, [x0, 0, zb], [x0 + 0.015, wh, zf], wn); }
  if (walls.includes("right")) { const t = bw?.right ?? b; box(t, [x1 - 0.02, 0, zb], [x1, 0.1, zf], sk); if (wn) box(t, [x1 - 0.015, 0, zb], [x1, wh, zf], wn); }
  // openings: frames, glass, doors
  for (const op of ops) {
    const y0 = op.sill ?? (op.kind === "window" ? 0.85 : 0);
    const c: V3 = op.wall === "back" ? [op.at, y0 + op.h / 2, zb - T / 2] : op.wall === "left" ? [x0 - T / 2, y0 + op.h / 2, op.at] : [x1 + T / 2, y0 + op.h / 2, op.at];
    const ry = op.wall === "back" ? 0 : op.wall === "left" ? Math.PI / 2 : -Math.PI / 2;
    if (op.kind === "window") windowIn(b, c, op.w, op.h, ry, o.frame, op.lit);
    const wb = bw ? (op.wall === "back" ? bw.back : op.wall === "left" ? bw.left : bw.right) : b;
    if (op.kind === "window") windowIn(wb, c, op.w, op.h, ry, o.frame, op.lit);
    else if (op.kind === "door") doorIn(wb, [c[0], 0, c[2]], op.w, op.h, ry, "#7a4a2a", 0, op.lit);
  }
  if (root && bw) {
    cullGroup(root, bw.back, [0, 0, 1], [0, 0, zb - T]);
    cullGroup(root, bw.left, [1, 0, 0], [x0 - T, 0, 0]);
    cullGroup(root, bw.right, [-1, 0, 0], [x1 + T, 0, 0]);
    cullGroup(root, bw.top, [0, -1, 0], [0, h + 0.1, 0]);
  }
  return { h, x0, x1, zb, zf };
};

/** straight stairs going up toward -z from `at` (bottom front edge) */
export const stairs = (b: Batch, at: V3, w: number, steps: number, rise = 0.17, run = 0.28, color = "#b8a890") => {
  const m = tex("planksHD", planksHD, 1, color);
  for (let i = 0; i < steps; i++) box(b, [at[0] - w / 2, at[1], at[2] - (i + 1) * run], [at[0] + w / 2, at[1] + (i + 1) * rise, at[2] - i * run], m);
};
/** ladder leaning on a wall: rails from `at` up to height h (top at z offset -lean) */
export const ladder = (b: Batch, at: V3, h: number, w = 0.45, lean = 0.12, color = "#9aa3ad") => {
  const m = col(color), n = Math.floor(h / 0.3);
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(at[0] + s * w / 2, at[1], at[2]), c = new THREE.Vector3(at[0] + s * w / 2, at[1] + h, at[2] - lean);
    const L = a.distanceTo(c), g = new THREE.BoxGeometry(0.05, L, 0.05).translate(0, L / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize());
    b.add(g, m, new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1)));
  }
  for (let i = 1; i <= n; i++) { const t = i / (n + 0.5); boxC(b, [at[0], at[1] + h * t, at[2] - lean * t], [w, 0.04, 0.04], m); }
  return { rungs: [...Array(n).keys()].map((i) => { const t = (i + 1) / (n + 0.5); return [at[0], at[1] + h * t, at[2] - lean * t] as V3; }) };
};
export { mat4, woodPanelTex };
