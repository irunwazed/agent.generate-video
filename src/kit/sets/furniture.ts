// KIT SETS: furniture and small set dressing, sized for the cartoon cast (adult card 1.41 m tall, hip 0.61 m).
// Every builder adds merged geometry to a Batch at `at` (floor point, metres) rotated `ry` (radians, 0 = front faces +z).
// Heights other code relies on (anchors, seated poses): SEAT_H chair seat, TABLE_H table top, COUNTER_H, STOOL_H.
import * as THREE from "three";
import { Batch, V3, box, boxC, cyl, col, tex, lathe, quad, flat, mat4, sphere, glow } from "./prims";
import { planksHD } from "../core/paint";
import { carpetTex, woodPanelTex, metalTex } from "./textures";
import { ctex } from "../core/paint";

export const SEAT_H = 0.355, TABLE_H = 0.62, COUNTER_H = 0.82, STOOL_H = 0.475, BENCH_H = 0.355;
const WOOD = "#9a6a42", WOOD_D = "#6b4426", METAL = "#5d636c";

/** rotate a local offset (x, z) by ry and add to `at` */
export const off = (at: V3, ry: number, x: number, y: number, z: number): V3 =>
  [at[0] + x * Math.cos(ry) + z * Math.sin(ry), at[1] + y, at[2] - x * Math.sin(ry) + z * Math.cos(ry)];

export const chair = (b: Batch, at: V3, ry = 0, color = WOOD) => {
  const m = col(color), s = 0.42;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) boxC(b, off(at, ry, x * 0.18, SEAT_H / 2, z * 0.18), [0.04, SEAT_H, 0.04], m, ry);
  boxC(b, off(at, ry, 0, SEAT_H, 0), [s, 0.05, s], m, ry);
  boxC(b, off(at, ry, 0, SEAT_H + 0.3, -0.19), [s, 0.4, 0.04], m, ry);
};
export const officeChair = (b: Batch, at: V3, ry = 0, color = "#2f4a7a") => {
  const m = col(color), k = col("#2b2b30");
  for (let i = 0; i < 5; i++) { const a = (i * Math.PI * 2) / 5; boxC(b, off(at, ry, Math.cos(a) * 0.16, 0.04, Math.sin(a) * 0.16), [0.32, 0.04, 0.05], k, ry + a); }
  cyl(b, off(at, ry, 0, 0.04, 0), 0.03, SEAT_H - 0.06, k);
  boxC(b, off(at, ry, 0, SEAT_H, 0), [0.44, 0.08, 0.42], m, ry);
  boxC(b, off(at, ry, 0, SEAT_H + 0.34, -0.2), [0.42, 0.5, 0.07], m, ry);
};
export const stool = (b: Batch, at: V3, color = "#c0392b") => {
  cyl(b, at, 0.03, STOOL_H - 0.04, col(METAL));
  cyl(b, [at[0], at[1], at[2]], 0.18, 0.03, col(METAL));
  cyl(b, [at[0], at[1] + STOOL_H - 0.06, at[2]], 0.19, 0.07, col(color));
};
export const table = (b: Batch, at: V3, ry = 0, w = 1.2, d = 0.7, color = WOOD, round = false) => {
  const m = col(color);
  if (round) {
    cyl(b, [at[0], at[1] + TABLE_H - 0.05, at[2]], w / 2, 0.05, m, 28);
    cyl(b, at, 0.05, TABLE_H - 0.05, col(WOOD_D));
    cyl(b, at, 0.25, 0.04, col(WOOD_D), 16);
    return;
  }
  boxC(b, off(at, ry, 0, TABLE_H - 0.025, 0), [w, 0.05, d], m, ry);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) boxC(b, off(at, ry, x * (w / 2 - 0.06), (TABLE_H - 0.05) / 2, z * (d / 2 - 0.06)), [0.05, TABLE_H - 0.05, 0.05], col(WOOD_D), ry);
};
/** office desk with a drawer pedestal on the right */
export const desk = (b: Batch, at: V3, ry = 0, w = 1.3, d = 0.65, color = "#d8d4cc") => {
  const m = col(color), dk = col("#b8b2a6");
  boxC(b, off(at, ry, 0, TABLE_H - 0.025, 0), [w, 0.05, d], m, ry);
  boxC(b, off(at, ry, w / 2 - 0.22, (TABLE_H - 0.05) / 2, 0), [0.4, TABLE_H - 0.05, d - 0.04], dk, ry);
  for (let i = 0; i < 3; i++) boxC(b, off(at, ry, w / 2 - 0.22, 0.12 + i * 0.17, d / 2 - 0.015), [0.32, 0.12, 0.01], m, ry);
  boxC(b, off(at, ry, -w / 2 + 0.04, (TABLE_H - 0.05) / 2, 0), [0.05, TABLE_H - 0.05, d - 0.04], dk, ry);
  boxC(b, off(at, ry, 0, 0.32, -d / 2 + 0.02), [w - 0.1, 0.5, 0.02], dk, ry);
};
export const bench = (b: Batch, at: V3, ry = 0, w = 1.4, color = WOOD) => {
  const m = col(color);
  boxC(b, off(at, ry, 0, BENCH_H, 0), [w, 0.05, 0.36], m, ry);
  for (const x of [-1, 1]) boxC(b, off(at, ry, x * (w / 2 - 0.1), BENCH_H / 2, 0), [0.06, BENCH_H, 0.3], col(WOOD_D), ry);
};
export const sofa = (b: Batch, at: V3, ry = 0, w = 1.7, color = "#8a3a4a") => {
  const m = col(color);
  boxC(b, off(at, ry, 0, 0.2, 0), [w, 0.3, 0.75], m, ry);
  boxC(b, off(at, ry, 0, SEAT_H, 0.05), [w - 0.3, 0.12, 0.6], col("#9a4a5a"), ry);
  boxC(b, off(at, ry, 0, 0.6, -0.3), [w, 0.6, 0.18], m, ry);
  for (const x of [-1, 1]) boxC(b, off(at, ry, x * (w / 2 - 0.08), 0.42, 0), [0.16, 0.46, 0.75], m, ry);
};
export const counter = (b: Batch, at: V3, ry = 0, w = 2.4, color = "#6b4426", top = "#2f5a48") => {
  boxC(b, off(at, ry, 0, COUNTER_H / 2, 0), [w, COUNTER_H, 0.55], tex("wpanel" + color, () => woodPanelTex(color), 0.5), ry);
  boxC(b, off(at, ry, 0, COUNTER_H + 0.025, 0.02), [w + 0.06, 0.05, 0.62], col(top), ry);
};
export const shelf = (b: Batch, at: V3, ry = 0, w = 1.0, h = 1.8, color = WOOD, fill = true) => {
  const m = col(color);
  boxC(b, off(at, ry, -w / 2 + 0.02, h / 2, 0), [0.04, h, 0.32], m, ry);
  boxC(b, off(at, ry, w / 2 - 0.02, h / 2, 0), [0.04, h, 0.32], m, ry);
  boxC(b, off(at, ry, 0, h / 2, -0.15), [w, h, 0.02], col(WOOD_D), ry);
  const cols = ["#c0392b", "#2f5fa8", "#3f9a4a", "#e8c430", "#7a4a8a", "#e07a3a"];
  for (let i = 0; i <= 4; i++) {
    const y = 0.05 + (i * (h - 0.1)) / 4;
    boxC(b, off(at, ry, 0, y, 0), [w, 0.03, 0.32], m, ry);
    if (fill && i < 4) for (let k = 0; k < 7; k++) {
      const bw = 0.05 + ((k * 7 + i * 3) % 5) * 0.012, bh = 0.22 + ((k + i) % 3) * 0.04;
      boxC(b, off(at, ry, -w / 2 + 0.1 + k * 0.12, y + bh / 2 + 0.015, 0.02), [bw, bh, 0.22], col(cols[(k + i) % cols.length]), ry);
    }
  }
};
export const crate = (b: Batch, at: V3, s = 0.5, ry = 0) => {
  boxC(b, [at[0], at[1] + s / 2, at[2]], [s, s, s], tex("planksHD", planksHD, 0.6, "#d8b080"), ry);
  for (const y of [0.06, s - 0.06]) boxC(b, [at[0], at[1] + y, at[2]], [s + 0.02, 0.05, s + 0.02], col(WOOD_D), ry);
};
export const barrel = (b: Batch, at: V3, h = 0.7, color = "#9a6a3a") => {
  const r = h * 0.34;
  lathe(b, [[r * 0.82, 0], [r, h * 0.25], [r * 1.05, h * 0.5], [r, h * 0.75], [r * 0.82, h], [0.001, h]], col(color), at, 18);
  for (const y of [0.12, 0.88]) cyl(b, [at[0], at[1] + h * y - 0.02, at[2]], r * (y < 0.5 ? 0.95 : 0.95), 0.04, col(METAL), 18);
};
export const sack = (b: Batch, at: V3, s = 0.5, color = "#d8c08a") => sphere(b, [at[0], at[1] + s * 0.4, at[2]], s * 0.45, col(color), [1, 0.9, 0.8], 10);
export const rug = (b: Batch, at: V3, w: number, d: number, base = "#8a2f3a", border = "#e8c45a", ry = 0) =>
  flat(b, [at[0], at[1] + 0.005, at[2]], w, d, lam2("rug" + base + border, () => carpetTex(base, border)), ry);
const lam2 = (key: string, t: () => THREE.Texture) => tex(key, t, 1);
/** wall clock (on a wall facing +z rotated ry), centre at c */
export const wallClock = (b: Batch, c: V3, r = 0.22, ry = 0) => {
  const face = ctex("clockface", 256, 256, (g) => {
    g.fillStyle = "#fbf7ec"; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#241726"; g.lineCap = "round";
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.lineWidth = i % 3 ? 6 : 10; g.beginPath(); g.moveTo(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); g.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); g.stroke(); }
    g.lineWidth = 10; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 52); g.stroke();
    g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(180, 140); g.stroke();
  });
  const g = new THREE.CylinderGeometry(r, r, 0.05, 28).rotateX(Math.PI / 2);
  b.add(g, col("#b03a34"), mat4(c, ry));
  b.add(new THREE.CircleGeometry(r * 0.86, 28), lam2Basic("clockface", face), mat4([c[0] + Math.sin(ry) * 0.027, c[1], c[2] + Math.cos(ry) * 0.027], ry));
};
const lam2Basic = (key: string, t: THREE.Texture) => tex(key, () => t, 1);
/** picture frame on a wall */
export const frame = (b: Batch, c: V3, w: number, h: number, ry = 0, art = "#7ab0d0") => {
  boxC(b, c, [w, h, 0.04], col("#c9a54a"), ry);
  quad(b, [c[0] + Math.sin(ry) * 0.022, c[1], c[2] + Math.cos(ry) * 0.022], w * 0.82, h * 0.78, col(art), ry);
};
export const plant = (b: Batch, at: V3, h = 0.9) => {
  lathe(b, [[0.12, 0], [0.16, 0.3], [0.001, 0.3]], col("#b8643a"), at, 14);
  for (let i = 0; i < 5; i++) { const a = i * 1.3; sphere(b, [at[0] + Math.cos(a) * 0.1, at[1] + 0.3 + h * (0.4 + 0.12 * (i % 3)), at[2] + Math.sin(a) * 0.1], 0.18, col(i % 2 ? "#4c9a37" : "#5aa83c"), [1, 1.2, 1], 8); }
};
/** lamps: desk / pendant / floor / street. Returns the bulb position (put a practical light there). */
export const lamp = (b: Batch, at: V3, kind: "desk" | "pendant" | "floor" | "street" | "wall", ry = 0, color = "#ffe9a8"): V3 => {
  const dark = col("#3d4148");
  if (kind === "desk") {
    cyl(b, at, 0.09, 0.03, dark, 12); cyl(b, [at[0], at[1] + 0.03, at[2]], 0.015, 0.32, dark, 6);
    lathe(b, [[0.03, 0.12], [0.14, 0], [0.001, 0.0]], col("#c9a54a"), [at[0], at[1] + 0.24, at[2]], 16);
    sphere(b, [at[0], at[1] + 0.26, at[2]], 0.04, glow(color, 2.6), [1, 1, 1], 8);
    return [at[0], at[1] + 0.24, at[2]];
  }
  if (kind === "pendant") {
    cyl(b, [at[0], at[1] - 0.6, at[2]], 0.008, 0.6, dark, 4);
    lathe(b, [[0.02, 0.0], [0.2, -0.16], [0.001, -0.16]], col("#2f5a48"), [at[0], at[1] - 0.6, at[2]], 18);
    sphere(b, [at[0], at[1] - 0.74, at[2]], 0.05, glow(color, 2.8), [1, 1, 1], 8);
    return [at[0], at[1] - 0.78, at[2]];
  }
  if (kind === "floor") {
    cyl(b, at, 0.16, 0.03, dark, 14); cyl(b, at, 0.015, 1.5, dark, 6);
    lathe(b, [[0.12, 0.0], [0.2, -0.24], [0.001, -0.24]], col("#e8dcc2"), [at[0], at[1] + 1.62, at[2]], 16);
    sphere(b, [at[0], at[1] + 1.48, at[2]], 0.05, glow(color, 2.6), [1, 1, 1], 8);
    return [at[0], at[1] + 1.45, at[2]];
  }
  if (kind === "wall") {
    boxC(b, at, [0.08, 0.14, 0.05], dark, ry);
    const c = off(at, ry, 0, 0.05, 0.1);
    sphere(b, c, 0.06, glow(color, 2.6), [1, 1, 1], 8);
    return c;
  }
  cyl(b, at, 0.06, 3.4, dark, 8);
  const head = off(at, ry, 0, 3.4, 0.3);
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6).rotateX(Math.PI / 2).translate(0, 0, 0.15), dark, mat4([at[0], at[1] + 3.38, at[2]], ry));
  lathe(b, [[0.04, 0.0], [0.18, -0.1], [0.001, -0.1]], dark, head, 14);
  sphere(b, [head[0], head[1] - 0.1, head[2]], 0.07, glow(color, 3), [1, 1, 1], 8);
  return [head[0], head[1] - 0.14, head[2]];
};
export { box, cyl, metalTex };
