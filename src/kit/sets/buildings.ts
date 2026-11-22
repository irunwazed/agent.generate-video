// KIT SETS: buildings. house() in 5 styles, tower() with a window grid (some windows lit, optional floor numbers),
// skyline() for city backdrops, shopRow() for streets. Front faces +z (toward the default camera) at ry = 0.
import * as THREE from "three";
import { Batch, V3, box, boxC, col, tex, glow, quad, extrude, lathe, cyl, mat4 } from "./prims";
import { off } from "./furniture";
import { sign } from "./outdoor";
import { windowIn, doorIn } from "./arch";
import { ctex, roofHD, planksHD } from "../core/paint";
import { wallTex, gedekTex, thatchTex, woodPanelTex, brickTex, awningTex } from "./textures";

export type HouseStyle = "modern" | "kampung" | "joglo" | "kolonial" | "western";
/** gable roof (prism) along x, ridge height rh above y */
const gable = (b: Batch, c: V3, w: number, d: number, rh: number, m: THREE.Material, ry: number) =>
  extrude(b, [[-d / 2 - 0.25, 0], [d / 2 + 0.25, 0], [0, rh]], w + 0.4, m, c, ry + Math.PI / 2);

/** a house; returns named points (door, window, porch) in world space */
export const house = (b: Batch, at: V3, style: HouseStyle = "modern", o: { w?: number; d?: number; h?: number; wall?: string; roof?: string; ry?: number; lit?: boolean } = {}) => {
  const ry = o.ry ?? 0, w = o.w ?? 5, d = o.d ?? 4, P = (x: number, y: number, z: number) => off(at, ry, x, y, z);
  const lit = !!o.lit;
  if (style === "kampung") {
    const lift = 0.8, h = o.h ?? 2.3;
    for (const x of [-w / 2 + 0.15, 0, w / 2 - 0.15]) for (const z of [-d / 2 + 0.15, d / 2 - 0.15]) boxC(b, P(x, lift / 2, z), [0.15, lift, 0.15], col("#6b4426"), ry);
    boxC(b, P(0, lift, 0), [w + 0.2, 0.12, d + 0.2], tex("planksHD", planksHD, 1, "#b88a5a"), ry);
    boxC(b, P(0, lift + h / 2, 0), [w, h, d], tex("gedek", gedekTex, 1), ry);
    gable(b, P(0, lift + h, 0), w, d, 1.8, tex("thatch", thatchTex, 1.5), ry);
    doorIn(b, P(0.6, lift, d / 2 + 0.06), 0.85, 1.7, ry, "#7a4a2a", 0, lit);
    windowIn(b, P(-1.3, lift + 1.25, d / 2 + 0.06), 0.8, 0.7, ry, "#7a4a2a", lit);
    for (let i = 0; i < 4; i++) boxC(b, P(0.6, lift - 0.2 * i - 0.1, d / 2 + 0.25 + i * 0.22), [0.9, 0.06, 0.22], col("#8a5a34"), ry);
    return { door: P(0.6, 0, d / 2 + 1.1), window: P(-1.3, lift + 1.25, d / 2 + 0.1), porch: P(0, lift, d / 2 + 0.3) };
  }
  if (style === "joglo") {
    const h = o.h ?? 2.6;
    boxC(b, P(0, 0.15, 0), [w + 1.2, 0.3, d + 1.2], col("#b8a890"), ry);
    boxC(b, P(0, 0.3 + h / 2, -0.4), [w, h, d - 0.8], tex("wpanel#8a5a34", () => woodPanelTex("#8a5a34"), 0.6), ry);
    for (const x of [-w / 2 - 0.4, w / 2 + 0.4]) for (const z of [d / 2 + 0.3, -d / 2 - 0.3]) cyl(b, P(x, 0.3, z), 0.1, h, col("#6b4426"), 8);
    const m = tex("roofHD#8a3a2a", () => roofHD("#8a3a2a"), 1.2);
    lathe(b, [[w * 0.95, 0], [w * 0.5, 1.0], [w * 0.28, 2.2], [0.001, 2.5]], m, P(0, 0.3 + h, 0), 4, [1, 1, d / w]);
    doorIn(b, P(0, 0.3, d / 2 - 0.35), 1.2, 2.0, ry, "#6b3a1a", 0, lit);
    return { door: P(0, 0, d / 2 + 0.8), window: P(1.4, 1.5, d / 2 - 0.3), porch: P(0, 0.3, d / 2 + 0.2) };
  }
  if (style === "kolonial") {
    const h = o.h ?? 4.2, wall = tex("wall#f4f1ea", () => wallTex("#f4f1ea"), 2);
    boxC(b, P(0, 0.2, 0.4), [w + 0.6, 0.4, d + 1.4], col("#c9c3b0"), ry);
    boxC(b, P(0, 0.4 + h / 2, 0), [w, h, d], wall, ry);
    for (const x of [-w / 2 + 0.3, -w / 6, w / 6, w / 2 - 0.3]) cyl(b, P(x, 0.4, d / 2 + 0.9), 0.14, h - 0.3, col("#ffffff"), 12);
    boxC(b, P(0, 0.4 + h - 0.2, d / 2 + 0.9), [w + 0.2, 0.3, 0.4], col("#ffffff"), ry);
    const roof = tex("roofHD#b8643a", () => roofHD("#b8643a"), 1.2);
    lathe(b, [[w * 0.72, 0], [0.001, 2.0]], roof, P(0, 0.4 + h, 0), 4, [1, 1, (d + 0.4) / w]);
    for (const x of [-w / 3, w / 3]) { windowIn(b, P(x, 0.4 + 1.6, d / 2 + 0.06), 0.9, 1.6, ry, "#2f5a48", lit); boxC(b, P(x - 0.62, 0.4 + 1.6, d / 2 + 0.07), [0.3, 1.6, 0.04], col("#2f5a48"), ry); boxC(b, P(x + 0.62, 0.4 + 1.6, d / 2 + 0.07), [0.3, 1.6, 0.04], col("#2f5a48"), ry); }
    doorIn(b, P(0, 0.4, d / 2 + 0.06), 1.1, 2.4, ry, "#2f5a48", 0, lit);
    return { door: P(0, 0, d / 2 + 2.0), window: P(w / 3, 2.0, d / 2 + 0.1), porch: P(0, 0.4, d / 2 + 0.6) };
  }
  if (style === "western") {
    const h = o.h ?? 3.2, wood = tex("planksHD", planksHD, 1, o.wall ?? "#b0603a");
    boxC(b, P(0, h / 2, 0), [w, h, d], wood, ry);
    boxC(b, P(0, h + 0.8, d / 2 - 0.05), [w, 1.6, 0.12], wood, ry);
    boxC(b, P(0, 2.4, d / 2 + 0.8), [w, 0.08, 1.7], col("#7a4a2a"), ry, -0.08);
    for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) boxC(b, P(x, 1.2, d / 2 + 1.55), [0.1, 2.4, 0.1], col("#6b4426"), ry);
    boxC(b, P(0, 0.1, d / 2 + 0.8), [w, 0.2, 1.7], tex("planksHD", planksHD, 1, "#9a6a42"), ry);
    windowIn(b, P(-1.4, 1.4, d / 2 + 0.06), 1.2, 1.1, ry, "#f4f1ea", lit);
    doorIn(b, P(0.9, 0.2, d / 2 + 0.06), 1.0, 2.0, ry, "#6b3a1a", 0, lit);
    return { door: P(0.9, 0, d / 2 + 2.2), window: P(-1.4, 1.4, d / 2 + 0.1), porch: P(0, 0.2, d / 2 + 0.8), sign: P(0, h + 0.8, d / 2 + 0.05) };
  }
  // modern
  const h = o.h ?? 2.9, wall = tex("wall" + (o.wall ?? "#e8dcc0"), () => wallTex(o.wall ?? "#e8dcc0"), 2);
  boxC(b, P(0, h / 2, 0), [w, h, d], wall, ry);
  gable(b, P(0, h, 0), w, d, 1.5, tex("roofHD" + (o.roof ?? "#b8643a"), () => roofHD(o.roof ?? "#b8643a"), 1.2), ry);
  windowIn(b, P(-1.3, 1.45, d / 2 + 0.06), 1.1, 1.0, ry, "#f4f1ea", lit);
  windowIn(b, P(1.4, 1.45, d / 2 + 0.06), 1.1, 1.0, ry, "#f4f1ea", false);
  doorIn(b, P(0.1, 0, d / 2 + 0.06), 0.9, 2.0, ry, "#7a4a2a", 0, lit);
  boxC(b, P(0.1, 0.06, d / 2 + 0.45), [1.4, 0.12, 0.8], col("#c9c3b0"), ry);
  boxC(b, P(0, h + 0.9, -0.6), [0.4, 1.4, 0.4], tex("brick#b0563a", () => brickTex(), 0.8), ry);
  return { door: P(0.1, 0, d / 2 + 1.2), window: P(-1.3, 1.45, d / 2 + 0.1), porch: P(0.1, 0.12, d / 2 + 0.5) };
};

/** facade texture: floors x cols windows; `lit` = list of [floor, col] glowing windows (0 = ground floor) */
const towerTex = (key: string, floors: number, cols: number, wall: string, glassCol: string, numbers: boolean) =>
  ctex(`tower|${key}`, 512, Math.min(4096, Math.round((512 * floors) / cols * 1.1)), (g) => {
    const H = Math.min(4096, Math.round((512 * floors) / cols * 1.1)), fh = H / floors, cw = 512 / cols;
    g.fillStyle = wall; g.fillRect(0, 0, 512, H);
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
      const x = c * cw + cw * 0.12, y = H - (f + 1) * fh + fh * 0.18;
      g.fillStyle = glassCol; g.fillRect(x, y, cw * 0.76, fh * 0.64);
      g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x + 4, y + 4, cw * 0.18, fh * 0.56);
    }
    if (numbers) {
      g.fillStyle = "#f2c230"; g.font = `900 ${Math.round(fh * 0.55)}px 'Segoe UI', Arial`; g.textAlign = "center"; g.textBaseline = "middle";
      for (let f = 0; f < floors; f++) g.fillText(String(f + 1), cw * 0.5, H - (f + 0.5) * fh);
    }
  });
/** tower block: `floors` x `cols` windows on the front (+z) face; `lit` windows glow; returns window centre points */
export const tower = (b: Batch, at: V3, o: { floors: number; cols?: number; floorH?: number; w?: number; d?: number; wall?: string; glass?: string; lit?: [number, number][]; numbers?: boolean; ry?: number; key?: string }) => {
  const cols = o.cols ?? 4, fh = o.floorH ?? 3.2, w = o.w ?? cols * 2.2, d = o.d ?? w, H = o.floors * fh, ry = o.ry ?? 0;
  const t = towerTex(o.key ?? `${o.floors}x${cols}${o.wall}${o.glass}${o.numbers}`, o.floors, cols, o.wall ?? "#c9b89a", o.glass ?? "#5a8ab8", !!o.numbers);
  const front = new THREE.MeshLambertMaterial({ map: t }), side = col(o.wall ?? "#c9b89a");
  b.add(new THREE.BoxGeometry(w, H, d), side, mat4(off(at, ry, 0, H / 2, 0), ry));
  quad(b, off(at, ry, 0, H / 2, d / 2 + 0.012), w, H, front, ry);
  const pts: Record<string, V3> = {};
  for (const [f, c] of o.lit ?? []) {
    const p = off(at, ry, -w / 2 + (c + 0.5) * (w / cols), (f + 0.5) * fh + fh * 0.03, d / 2 + 0.02);
    quad(b, p, (w / cols) * 0.76, fh * 0.64, glow("#ffd48a", 1.9), ry);
    pts[`win_${f}_${c}`] = p;
  }
  return { top: off(at, ry, 0, H, 0), H, pts };
};
/** distant city skyline: boxes with tiny lit windows (night) or plain (day) */
export const skyline = (b: Batch, n = 14, dist = 90, night = true, seed = 3) => {
  for (let i = 0; i < n; i++) {
    const x = -dist + (2 * dist * i) / (n - 1) + Math.sin(i * 4.1 + seed) * 6, z = -dist - Math.abs(Math.sin(i * 2.3 + seed)) * 40;
    const h = 20 + Math.abs(Math.sin(i * 1.7 + seed)) * 55, w = 10 + (i % 3) * 5;
    const t = ctex(`sky|${night}|${i % 4}`, 128, 512, (g) => {
      g.fillStyle = night ? "#22284a" : "#9aa8c0"; g.fillRect(0, 0, 128, 512);
      for (let y = 8; y < 512; y += 22) for (let xx = 8; xx < 128; xx += 20) { const on = night ? ((xx * 7 + y * 3 + i) % 11) < 3 : ((xx + y) % 7) < 3; g.fillStyle = on ? (night ? "#ffd890" : "#c8d8ec") : night ? "#2e3560" : "#8a98b0"; g.fillRect(xx, y, 10, 12); }
    });
    const m = night ? new THREE.MeshBasicMaterial({ map: t, fog: true }) : new THREE.MeshLambertMaterial({ map: t });
    b.add(new THREE.BoxGeometry(w, h, w), m, mat4([x, h / 2 - 1, z]));
  }
};
/** a row of small shops along x (street side), facing +z; signs are small and diegetic */
export const shopRow = (b: Batch, at: V3, names: string[], w = 3.4, lit = false) => {
  const cols = ["#e8dcc0", "#b8d0c0", "#e8c0a8", "#c8c8e0", "#f0e0a0"];
  names.forEach((name, i) => {
    const x = at[0] + (i - (names.length - 1) / 2) * w, h = 3.4 + (i % 2) * 0.8;
    boxC(b, [x, h / 2, at[2]], [w - 0.05, h, 3], tex("wall" + cols[i % 5], () => wallTex(cols[i % 5]), 2));
    windowIn(b, [x - 0.6, 1.3, at[2] + 1.56], 1.2, 1.2, 0, "#f4f1ea", lit && i % 2 === 0);
    doorIn(b, [x + 0.9, 0, at[2] + 1.56], 0.8, 2.0, 0, "#6b4426", 0, lit && i % 2 === 1);
    boxC(b, [x, 2.45, at[2] + 1.9], [w - 0.4, 0.05, 0.8], tex("awn" + i, () => awningTex(["#d0312d", "#2f7a5a", "#2f5fa8", "#e8762a"][i % 4], "#f6f1e7"), 0.6), 0, 0.3);
    sign(b, [x, 2.9, at[2] + 1.56], name, Math.min(2.6, w - 0.6), 0.42, 0, ["#2f5a48", "#8a2430", "#24324f", "#5a3a22"][i % 4]);
  });
};
export { box, planksHD };
