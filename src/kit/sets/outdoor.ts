// KIT SETS: outdoor set dressing and workshop pieces. Builders add to a Batch; animated ones (fire, flag) also add
// separate parts to `root` and return an updater (f, t) => void. All positions in metres, ry in radians.
import * as THREE from "three";
import { Batch, V3, box, boxC, col, tex, glow, cyl, rod, sphere, lathe, quad, part, mat4, extrude } from "./prims";
import { off } from "./furniture";
import { planksHD, ctex } from "../core/paint";
import { awningTex, brickTex, rockTex } from "./textures";
import { drawFlag, FlagName } from "../toon/flags";
import { Pen } from "../toon/pen";

export type Updater = (f: number, t: number, state?: Record<string, number>) => void;

export const fence = (b: Batch, a: V3, c: V3, kind: "picket" | "bamboo" | "iron" = "picket", h = 0.9, color = "#f4f1ea") => {
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx), n = Math.max(2, Math.round(L / (kind === "bamboo" ? 0.1 : 0.16)));
  const m = kind === "bamboo" ? col("#b8a858") : kind === "iron" ? col("#2b2f38") : col(color);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a[0] + dx * t, z = a[2] + dz * t;
    if (kind === "iron") rod(b, [x, a[1], z], [x, a[1] + h, z], 0.015, m, 5);
    else boxC(b, [x, a[1] + h / 2, z], [kind === "bamboo" ? 0.07 : 0.09, h + (kind === "picket" && i % 2 ? 0.06 : 0), 0.03], m, ry);
  }
  for (const y of kind === "iron" ? [0.15, h - 0.05] : [0.2, h - 0.2]) boxC(b, [(a[0] + c[0]) / 2, a[1] + y, (a[2] + c[2]) / 2], [L, 0.05, 0.04], m, ry);
};
export const gravestone = (b: Batch, at: V3, kind: "slab" | "cross" | "nisan" = "slab", ry = 0) => {
  const stone = col("#c9ccd2");
  if (kind === "cross") { boxC(b, [at[0], at[1] + 0.45, at[2]], [0.08, 0.9, 0.06], col("#e8e4da"), ry); boxC(b, [at[0], at[1] + 0.65, at[2]], [0.45, 0.08, 0.06], col("#e8e4da"), ry); return; }
  if (kind === "nisan") {
    box(b, [at[0] - 0.3, at[1], at[2] - 0.75], [at[0] + 0.3, at[1] + 0.12, at[2] + 0.75], col("#9a8a78"));
    for (const z of [-0.6, 0.6]) { boxC(b, [at[0], at[1] + 0.32, at[2] + z], [0.16, 0.4, 0.1], col("#f4f1ea"), ry); sphere(b, [at[0], at[1] + 0.52, at[2] + z], 0.08, col("#f4f1ea"), [1, 1, 1], 8); }
    return;
  }
  extrude(b, [[-0.26, 0], [0.26, 0], [0.26, 0.6], [0.18, 0.72], [0, 0.76], [-0.18, 0.72], [-0.26, 0.6]], 0.1, stone, at, ry);
};
/** market stall: counter, striped awning on posts, crates of fruit; returns the front-of-counter point */
export const marketStall = (b: Batch, at: V3, ry = 0, a = "#d0312d", c = "#f6f1e7", w = 2.2) => {
  const P = (x: number, y: number, z: number) => off(at, ry, x, y, z);
  boxC(b, P(0, 0.45, 0), [w, 0.9, 0.7], tex("planksHD", planksHD, 0.8, "#c89a68"), ry);
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) for (const z of [-0.4, 0.4]) boxC(b, P(x, 1.1, z), [0.07, 2.2, 0.07], col("#7a4a2a"), ry);
  boxC(b, P(0, 2.25, 0.05), [w + 0.3, 0.05, 1.2], tex("awn" + a + c, () => awningTex(a, c), 0.6), ry, 0.25);
  for (let i = 0; i < 9; i++) sphere(b, P(-w / 2 + 0.2 + (i % 5) * 0.4, 0.98, -0.15 + Math.floor(i / 5) * 0.25), 0.09, col(["#e2453c", "#f2c230", "#7ab83c", "#f08a2c"][i % 4]), [1, 1, 1], 8);
  return P(0, 0, 0.75);
};
/** A-frame tent */
export const tent = (b: Batch, at: V3, ry = 0, color = "#3f7a5a", w = 1.8, d = 2.2, h = 1.4) => {
  extrude(b, [[-w / 2, 0], [w / 2, 0], [0, h]], d, col(color), at, ry);
  extrude(b, [[-0.25, 0], [0.25, 0], [0, 0.7]], 0.02, col("#1e2a24"), off(at, ry, 0, 0, d / 2 + 0.01), ry);
};
const flameTex = () => ctex("kitFlame", 128, 256, (g) => {
  const gr = g.createRadialGradient(64, 200, 4, 64, 160, 110);
  gr.addColorStop(0, "rgba(255,250,200,1)"); gr.addColorStop(0.35, "rgba(255,190,60,1)"); gr.addColorStop(0.7, "rgba(255,110,30,0.9)"); gr.addColorStop(1, "rgba(255,80,20,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(64, 10); g.bezierCurveTo(110, 90, 120, 200, 64, 250); g.bezierCurveTo(8, 200, 18, 90, 64, 10); g.fill();
});
/** animated flame card (camera-facing is approximated by two crossed planes) */
export const flame = (root: THREE.Object3D, at: V3, s = 0.5): Updater => {
  const m = new THREE.MeshBasicMaterial({ map: flameTex(), transparent: true, depthWrite: false, color: new THREE.Color(2.2, 1.8, 1.4), fog: false, side: THREE.DoubleSide });
  const g = new THREE.PlaneGeometry(s * 0.6, s).translate(0, s / 2, 0);
  const a = part(g, m, at), c = part(g, m, at, Math.PI / 2);
  root.add(a, c);
  return (_f, t) => { const k = 1 + 0.12 * Math.sin(t * 17) + 0.08 * Math.sin(t * 29); a.scale.set(1, k, 1); c.scale.set(1, 1.05 * k, 1); };
};
export const campfire = (b: Batch, root: THREE.Object3D, at: V3): Updater => {
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + 0.4; rod(b, [at[0] + Math.cos(a) * 0.35, at[1] + 0.04, at[2] + Math.sin(a) * 0.35], [at[0] - Math.cos(a) * 0.1, at[1] + 0.18, at[2] - Math.sin(a) * 0.1], 0.045, col("#6a4026"), 6); }
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; sphere(b, [at[0] + Math.cos(a) * 0.5, at[1] + 0.06, at[2] + Math.sin(a) * 0.5], 0.1, col("#8d8a86"), [1, 0.7, 1], 6); }
  sphere(b, [at[0], at[1] + 0.05, at[2]], 0.18, glow("#ff7a2a", 1.8), [1.2, 0.4, 1.2], 8);
  return flame(root, [at[0], at[1] + 0.06, at[2]], 0.75);
};
/** flag pole with a waving cloth (flag texture from toon/flags) */
export const flagpole = (b: Batch, root: THREE.Object3D, at: V3, h = 6, flag: FlagName = "id", w = 1.4): Updater => {
  cyl(b, at, 0.05, h, col("#d8dde3"), 8, 0.035);
  sphere(b, [at[0], at[1] + h + 0.05, at[2]], 0.08, col("#e8c45a"), [1, 1, 1], 8);
  cyl(b, at, 0.35, 0.25, col("#c9c3b0"), 10);
  const t = ctex("flag_" + flag, 256, 170, (g) => drawFlag(new Pen(g), flag, 0, 0, 256, 170, 3));
  const geo = new THREE.PlaneGeometry(w, w * 0.66, 16, 1).translate(w / 2, 0, 0);
  const mesh = part(geo, new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }), [at[0] + 0.05, at[1] + h - w * 0.33 - 0.1, at[2]]);
  root.add(mesh);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute, base = Float32Array.from(pos.array as Float32Array);
  return (_f, tt) => {
    for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.setZ(i, 0.12 * (x / w) * Math.sin(tt * 5 - x * 4)); pos.setY(i, base[i * 3 + 1] - 0.05 * (x / w) * (1 + Math.sin(tt * 3))); }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
};
export const sandbags = (b: Batch, a: V3, c: V3, rows = 3) => {
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx), n = Math.max(1, Math.round(L / 0.55));
  for (let r = 0; r < rows; r++) for (let i = 0; i < n - (r % 2); i++) {
    const t = (i + 0.5 + (r % 2) * 0.5) / n;
    sphere(b, [a[0] + dx * t, a[1] + 0.12 + r * 0.2, a[2] + dz * t], 0.3, col(r % 2 ? "#b8a478" : "#c8b488"), [1, 0.38, 0.7], 8);
    void ry;
  }
};
export const anvil = (b: Batch, at: V3, ry = 0) => {
  cyl(b, at, 0.28, 0.45, tex("planksHD", planksHD, 0.5, "#a8784a"), 12);
  const top = off(at, ry, 0, 0.45, 0);
  extrude(b, [[-0.3, 0], [0.22, 0], [0.22, 0.08], [0.42, 0.14], [0.22, 0.2], [-0.3, 0.2], [-0.3, 0.12], [-0.12, 0.08], [-0.3, 0.06]], 0.16, col("#5d636c"), top, ry);
};
/** blacksmith forge: brick hearth with a glowing fire opening and a hood. Returns the fire point (practical light). */
export const forgeFurnace = (b: Batch, root: THREE.Object3D, at: V3, ry = 0): { fire: V3; update: Updater } => {
  const br = tex("brick#b0563a", () => brickTex(), 0.8);
  boxC(b, off(at, ry, 0, 0.5, 0), [1.4, 1.0, 1.0], br, ry);
  boxC(b, off(at, ry, 0, 1.55, -0.1), [1.5, 0.08, 1.2], col("#3d4148"), ry);
  boxC(b, off(at, ry, 0, 2.2, -0.2), [0.8, 1.3, 0.8], col("#4a4e56"), ry);
  boxC(b, off(at, ry, 0, 1.25, 0.05), [1.2, 0.5, 0.8], br, ry);
  const fire = off(at, ry, 0, 0.75, 0.48);
  quad(b, off(at, ry, 0, 0.75, 0.505), 0.7, 0.4, glow("#ff8a2a", 2.4), ry);
  const up = flame(root, off(at, ry, 0, 0.55, 0.3), 0.5);
  return { fire, update: up };
};
export const cannon = (b: Batch, at: V3, ry = 0) => {
  for (const s of [-1, 1]) { const w = off(at, ry, s * 0.32, 0.35, 0); b.add(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 14).rotateZ(Math.PI / 2), col("#7a4a2a"), mat4(w, ry)); }
  boxC(b, off(at, ry, 0, 0.45, -0.2), [0.45, 0.3, 1.0], col("#8a5a34"), ry);
  b.add(new THREE.CylinderGeometry(0.11, 0.17, 1.7, 14).rotateX(Math.PI / 2 - 0.12), col("#3d4148"), mat4(off(at, ry, 0, 0.72, 0.35), ry));
};
/** pedestal with a glass dome over a red button (dome is a separate part that a liftLid action can raise) */
export const pedestal = (b: Batch, root: THREE.Object3D, at: V3): { button: V3; dome: THREE.Object3D } => {
  lathe(b, [[0.55, 0], [0.55, 0.12], [0.42, 0.18], [0.4, 0.95], [0.5, 1.0], [0.5, 1.08], [0.001, 1.08]], col("#a8aab2"), at, 10);
  cyl(b, [at[0], at[1] + 1.08, at[2]], 0.38, 0.06, col("#d8a83a"), 24);
  cyl(b, [at[0], at[1] + 1.14, at[2]], 0.16, 0.05, col("#2b2b30"), 18);
  sphere(b, [at[0], at[1] + 1.2, at[2]], 0.12, col("#e2453c"), [1, 0.55, 1], 14);
  const dome = part(new THREE.SphereGeometry(0.34, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.3, 1), new THREE.MeshLambertMaterial({ color: "#d8f0ff", transparent: true, opacity: 0.3, depthWrite: false }), [at[0], at[1] + 1.14, at[2]]);
  root.add(dome);
  return { button: [at[0], at[1] + 1.24, at[2]], dome };
};
/** small diegetic sign (shop name, crate label, floor number): text painted on a board */
export const sign = (b: Batch, c: V3, text: string, w = 1.2, h = 0.35, ry = 0, bg = "#2f5a48", fg = "#f6efd8", tilt = 0) => {
  const t = ctex(`sign|${text}|${bg}|${fg}`, 512, Math.round((512 * h) / w), (g) => {
    const H = Math.round((512 * h) / w);
    g.fillStyle = bg; g.fillRect(0, 0, 512, H);
    g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(12, 12, 488, H - 24);
    let sz = Math.round(H * 0.55); g.font = `900 ${sz}px 'Segoe UI', Arial`;
    while (g.measureText(text).width > 440 && sz > 10) { sz -= 2; g.font = `900 ${sz}px 'Segoe UI', Arial`; }
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, H / 2 + 2);
  });
  boxC(b, c, [w, h, 0.05], col("#5a3a22"), ry, tilt);
  const m = new THREE.MeshLambertMaterial({ map: t });
  quad(b, [c[0] + Math.sin(ry) * 0.03, c[1], c[2] + Math.cos(ry) * 0.03], w - 0.04, h - 0.04, m, ry);
};
/** terrace / porch: deck floor, roof on posts along the front of a wall */
export const porch = (b: Batch, at: V3, w = 4, d = 1.6, h = 2.5, ry = 0) => {
  boxC(b, off(at, ry, 0, 0.12, 0), [w, 0.24, d], tex("planksHD", planksHD, 1, "#c8986a"), ry);
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) boxC(b, off(at, ry, x, 0.24 + h / 2, d / 2 - 0.1), [0.12, h, 0.12], col("#f4f1ea"), ry);
  boxC(b, off(at, ry, 0, h + 0.3, 0.05), [w + 0.3, 0.08, d + 0.4], col("#b8643a"), ry, -0.12);
  for (let i = 0; i < 4; i++) boxC(b, off(at, ry, 0, 0.12 - 0.06 * i, d / 2 + 0.15 + i * 0.25), [1.2, 0.06, 0.25], col("#b8987a"), ry);
};
export const well = (b: Batch, at: V3) => {
  lathe(b, [[0.6, 0], [0.6, 0.7], [0.5, 0.7], [0.5, 0.05]], tex("rock#9a9690", () => rockTex("#9a9690"), 1), at, 14);
  for (const s of [-1, 1]) boxC(b, [at[0] + s * 0.55, at[1] + 1.1, at[2]], [0.08, 1.3, 0.08], col("#7a4a2a"));
  boxC(b, [at[0], at[1] + 1.8, at[2]], [1.4, 0.1, 0.9], col("#8a3a2a"), 0, 0);
};
export const bell = (b: Batch, at: V3, ry = 0) => {
  boxC(b, off(at, ry, 0, 1.3, 0), [0.14, 2.6, 0.14], col("#7a4a2a"), ry);
  boxC(b, off(at, ry, 0.35, 2.5, 0), [0.8, 0.12, 0.14], col("#7a4a2a"), ry);
  lathe(b, [[0.24, 0], [0.2, 0.08], [0.14, 0.3], [0.08, 0.38], [0.001, 0.4]], col("#c9a23a"), off(at, ry, 0.6, 2.0, 0), 14);
};
export { flameTex };
