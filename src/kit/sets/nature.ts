// KIT SETS: nature. Trees (round, pine, palm, banana, bamboo, cactus), bushes, flowers, rocks, grass tufts, scatter,
// terrain (hills, dunes, mountains), and the sea (animated ripple marks + shore foam). Cartoon low-poly, ink-outlined.
import * as THREE from "three";
import { Batch, V3, col, tex, sphere, cyl, flat, mat4, lathe, part, rod } from "./prims";
import { rng, waterNear } from "../core/paint";
import { rockTex } from "./textures";

export type TreeKind = "round" | "pine" | "palm" | "banana" | "bamboo" | "cactus" | "bush" | "dead";
const LEAF = ["#5aa83c", "#4c9a37", "#69b545", "#55a243", "#3f8f3c"];

export const tree = (b: Batch, at: V3, kind: TreeKind = "round", h = 4, seed = 1) => {
  const r = rng(seed * 97 + 13), leaf = col(LEAF[seed % LEAF.length]), bark = col("#8f5d3b");
  switch (kind) {
    case "round":
      cyl(b, at, 0.03 * h, 0.45 * h, bark, 8, 0.02 * h);
      sphere(b, [at[0], at[1] + 0.62 * h, at[2]], 0.3 * h, leaf, [1, 0.9, 1], 12);
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + r(); sphere(b, [at[0] + Math.cos(a) * 0.17 * h, at[1] + (0.52 + 0.1 * r()) * h, at[2] + Math.sin(a) * 0.17 * h], 0.2 * h, col(LEAF[(seed + i + 1) % LEAF.length]), [1, 0.9, 1], 10); }
      break;
    case "pine":
      cyl(b, at, 0.025 * h, 0.3 * h, bark, 6);
      for (let i = 0; i < 3; i++) lathe(b, [[0.26 * h * (1 - i * 0.22), 0], [0.001, 0.36 * h]], col(i % 2 ? "#3a7a40" : "#2f6a38"), [at[0], at[1] + (0.22 + i * 0.2) * h, at[2]], 9);
      break;
    case "palm": {
      // curved trunk + fronds
      const segs = 6, lean = (r() - 0.5) * 0.25 * h;
      let prev: V3 = at;
      for (let i = 1; i <= segs; i++) { const t = i / segs, p: V3 = [at[0] + lean * t * t, at[1] + 0.85 * h * t, at[2]]; rod(b, prev, p, 0.035 * h * (1.1 - 0.4 * t), col("#9a7a52"), 7); prev = p; }
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2, L = 0.42 * h, tip: V3 = [prev[0] + Math.cos(a) * L, prev[1] - 0.12 * h, prev[2] + Math.sin(a) * L];
        const mid: V3 = [prev[0] + Math.cos(a) * L * 0.5, prev[1] + 0.06 * h, prev[2] + Math.sin(a) * L * 0.5];
        const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...prev), new THREE.Vector3(...mid).add(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.09 * h)), new THREE.Vector3(...tip), new THREE.Vector3(...mid).add(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)).multiplyScalar(0.09 * h))]);
        g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
        b.add(g, col(i % 2 ? "#3f9a3c" : "#4caa44"));
      }
      sphere(b, prev, 0.06 * h, col("#6a5a2a"), [1, 1, 1], 8);
      break;
    }
    case "banana":
      cyl(b, at, 0.05 * h, 0.5 * h, col("#8aa04a"), 8, 0.04 * h);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + r(), top: V3 = [at[0], at[1] + 0.5 * h, at[2]];
        const g = new THREE.PlaneGeometry(0.16 * h, 0.55 * h).translate(0, 0.27 * h, 0);
        b.add(g, col(i % 2 ? "#5aa83c" : "#6ab84a"), new THREE.Matrix4().compose(new THREE.Vector3(...top), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, a, 0, "YXZ")), new THREE.Vector3(1, 1, 1)));
      }
      break;
    case "bamboo":
      for (let i = 0; i < 9; i++) {
        const x = at[0] + (r() - 0.5) * 0.9, z = at[2] + (r() - 0.5) * 0.9, hh = h * (0.75 + 0.35 * r());
        rod(b, [x, at[1], z], [x + (r() - 0.5) * 0.4, at[1] + hh, z + (r() - 0.5) * 0.3], 0.035, col(i % 2 ? "#a8b84a" : "#8fa040"), 6);
        sphere(b, [x, at[1] + hh * 0.92, z], 0.35, col(LEAF[i % 5]), [1.4, 0.6, 1.4], 8);
      }
      break;
    case "cactus":
      cyl(b, at, 0.16 * h * 0.25, 0.8 * h, col("#4a9a4a"), 10);
      sphere(b, [at[0], at[1] + 0.8 * h, at[2]], 0.04 * h, col("#4a9a4a"), [1, 1, 1], 10);
      for (const s of [-1, 1]) { rod(b, [at[0] + s * 0.03 * h, at[1] + (0.35 + 0.1 * s) * h, at[2]], [at[0] + s * 0.2 * h, at[1] + (0.38 + 0.1 * s) * h, at[2]], 0.03 * h, col("#4a9a4a"), 8); cyl(b, [at[0] + s * 0.2 * h, at[1] + (0.38 + 0.1 * s) * h, at[2]], 0.03 * h, 0.22 * h, col("#4a9a4a"), 8); }
      break;
    case "bush":
      for (let i = 0; i < 4; i++) sphere(b, [at[0] + (r() - 0.5) * 0.5 * h, at[1] + 0.25 * h, at[2] + (r() - 0.5) * 0.3 * h], 0.3 * h * (0.8 + 0.4 * r()), col(LEAF[(seed + i) % 5]), [1, 0.8, 1], 9);
      break;
    case "dead":
      cyl(b, at, 0.03 * h, 0.7 * h, col("#6a5040"), 6, 0.015 * h);
      for (let i = 0; i < 4; i++) { const a = i * 1.7 + r(), y = at[1] + (0.35 + 0.1 * i) * h; rod(b, [at[0], y, at[2]], [at[0] + Math.cos(a) * 0.3 * h, y + 0.2 * h, at[2] + Math.sin(a) * 0.3 * h], 0.012 * h, col("#6a5040"), 5); }
      break;
  }
};
export const rock = (b: Batch, at: V3, s = 0.6, color = "#8d8a86") => {
  const g = new THREE.IcosahedronGeometry(s, 0);
  b.add(g, tex("rock" + color, () => rockTex(color), 1.5), mat4([at[0], at[1] + s * 0.4, at[2]], s * 3, [1.2, 0.7, 1]));
};
export const flowers = (b: Batch, at: V3, n = 12, area = 2, seed = 3) => {
  const r = rng(seed), cols = ["#e2453c", "#f2c230", "#ffffff", "#c86ad8", "#ff8ab0"];
  for (let i = 0; i < n; i++) { const x = at[0] + (r() - 0.5) * area, z = at[2] + (r() - 0.5) * area; rod(b, [x, at[1], z], [x, at[1] + 0.18, z], 0.006, col("#3f8f3c"), 4); sphere(b, [x, at[1] + 0.2, z], 0.04, col(cols[i % 5]), [1, 0.7, 1], 6); }
};
/** scatter `n` things in a ring / box area around the set, keeping a clear zone around the stage */
export const scatter = (n: number, area: [number, number, number, number], seed: number, clear: [number, number, number, number] | null, fn: (x: number, z: number, i: number, r: () => number) => void) => {
  const r = rng(seed);
  for (let i = 0, tries = 0; i < n && tries < n * 20; tries++) {
    const x = area[0] + r() * (area[2] - area[0]), z = area[1] + r() * (area[3] - area[1]);
    if (clear && x > clear[0] && x < clear[2] && z > clear[1] && z < clear[3]) continue;
    fn(x, z, i++, r);
  }
};

// ---------------- terrain ----------------
export const hillRing = (b: Batch, n = 9, r0 = 60, color = "#6fae4f", seed = 1, hScale = 0.32) => {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.62 + (0.76 * i) / (n - 1)) + Math.sin(i * 7.3 + seed) * 0.08, rr = r0 + 25 * (((i * 37 + seed * 11) % 5) / 5);
    sphere(b, [Math.cos(a) * rr, -3, -Math.abs(Math.sin(a)) * rr], 16 + 8 * ((i * 13 + seed) % 3), col(i % 2 ? color : "#5f9e45"), [1.8, hScale, 1], 16);
  }
};
/** big mountains on the horizon (snow caps optional) */
export const mountains = (b: Batch, n = 5, dist = 160, snow = true, color = "#6a8a7a", seed = 2) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.65 + (0.7 * i) / Math.max(1, n - 1)) + (r() - 0.5) * 0.1, d = dist + r() * 60, h = 45 + r() * 45, w = h * (1.1 + r() * 0.5);
    const x = Math.cos(a) * d, z = -Math.abs(Math.sin(a)) * d;
    lathe(b, [[w, 0], [w * 0.55, h * 0.45], [w * 0.18, h * 0.85], [0.001, h]], col(i % 2 ? color : "#5f7f70"), [x, -2, z], 7);
    if (snow) lathe(b, [[w * 0.18 * 1.06, h * 0.85 - 0.5], [0.001, h + 0.4]], col("#f4f6fa"), [x, -2, z], 7);
  }
};
/** desert dunes */
export const dunes = (b: Batch, n = 10, seed = 4, color = "#e6c788") => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 220, z = -20 - r() * 160; sphere(b, [x, -4, z], 14 + r() * 16, col(i % 2 ? color : "#dbb874"), [2.2, 0.36, 1.3], 14); }
};

// ---------------- sea ----------------
/** animated sea: base colour plane + scrolling ripple marks; returns an updater */
export const sea = (root: THREE.Object3D, y = 0, size = 600, base = "#3a9ac4", deep = "#2a78a8"): ((f: number, t: number) => void) => {
  const g = new THREE.PlaneGeometry(size, size, 1, 1).rotateX(-Math.PI / 2);
  const cv = document.createElement("canvas"); cv.width = 4; cv.height = 256;
  const c2 = cv.getContext("2d")!, gr = c2.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, deep); gr.addColorStop(0.5, base); gr.addColorStop(1, "#5cc0dc"); c2.fillStyle = gr; c2.fillRect(0, 0, 4, 256);
  const grad = new THREE.CanvasTexture(cv); grad.colorSpace = THREE.SRGBColorSpace;
  const baseMesh = part(g, col(base), [0, y, 0]);
  baseMesh.receiveShadow = true;
  root.add(baseMesh);
  const marks = waterNear().clone(); marks.wrapS = marks.wrapT = THREE.RepeatWrapping; marks.repeat.set(size / 6, size / 6); marks.needsUpdate = true;
  const mm = new THREE.MeshBasicMaterial({ map: marks, transparent: true, opacity: 0.55, depthWrite: false, color: "#e8f8ff" });
  const markMesh = part(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), mm, [0, y + 0.01, 0]);
  root.add(markMesh);
  void grad;
  return (_f, t) => { marks.offset.set(t * 0.04, t * 0.025); markMesh.position.y = y + 0.01 + 0.015 * Math.sin(t * 1.3); };
};
/** white foam strip along the shore line (z = zShore), animated */
export const shoreFoam = (root: THREE.Object3D, zShore: number, width = 300): ((f: number, t: number) => void) => {
  const m = new THREE.MeshBasicMaterial({ color: "#f4fbff", transparent: true, opacity: 0.85, depthWrite: false });
  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) { const me = part(new THREE.PlaneGeometry(width, 0.35).rotateX(-Math.PI / 2), m, [0, 0.03, zShore - i * 0.9]); root.add(me); meshes.push(me); }
  return (_f, t) => meshes.forEach((me, i) => { me.position.z = zShore - i * 0.9 - 0.4 * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 1.2)); });
};
export { flat };
