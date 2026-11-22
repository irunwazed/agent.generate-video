// KIT SETS: building blocks for procedural sets. Everything is a cached two-tone material + geometry merged into
// one mesh per material (Batch). World units are metres; y is up; the default camera looks from +z toward -z.
// Ported from merdeka build.ts (lam, Batch) + kit helpers: world-scaled UV boxes, cylinders, glow (emissive) parts.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twoTone } from "../core/shade";
import { NOINK } from "../core/ink";
import { rep } from "../core/paint";

export type V3 = [number, number, number];
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------- materials ----------------
const mats = new Map<string, THREE.Material>();
/** cached two-tone Lambert material */
export const lam = (key: string, make: () => THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(make())); mats.set(key, m); }
  return m;
};
/** flat colour material */
export const col = (hex: string) => lam("c" + hex, () => ({ color: hex }));
/** textured material; the texture repeats every `tile` metres on world-scaled UV geometry */
export const tex = (key: string, t: () => THREE.Texture, tile = 1, tint = "#ffffff") =>
  lam(`t:${key}:${tile}:${tint}`, () => ({ map: rep(t(), 1 / tile, 1 / tile), color: tint }));
/** self-lit glow (bulbs, neon, lit windows, fire): bright HDR colour -> bloom; never outlined, never shaded */
const glows = new Map<string, THREE.MeshBasicMaterial>();
export const glow = (hex: string, k = 2.2) => {
  const key = hex + k;
  let m = glows.get(key);
  if (!m) { const c = new THREE.Color(hex).multiplyScalar(k); m = new THREE.MeshBasicMaterial({ color: c, toneMapped: true, fog: false }); glows.set(key, m); }
  return m;
};
/** glass: light transparent tint, no ink */
export const glass = (hex = "#bfe0ee", opacity = 0.35) => {
  const key = "glass" + hex + opacity;
  let m = mats.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) { m = new THREE.MeshLambertMaterial({ color: hex, transparent: true, opacity, depthWrite: false }); mats.set(key, m); }
  return m;
};

const f32 = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.Float32BufferAttribute(out, a.itemSize);
};

/** merges every added geometry into one mesh per material */
export class Batch {
  private g = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const x = new THREE.BufferGeometry();
    x.setAttribute("position", f32(src.attributes.position));
    if (src.attributes.normal) x.setAttribute("normal", f32(src.attributes.normal)); else x.computeVertexNormals();
    x.setAttribute("uv", src.attributes.uv ? f32(src.attributes.uv) : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat);
    if (l) l.push(x); else this.g.set(mat, [x]);
  }
  build(parent: THREE.Object3D, cast = true) {
    for (const [mat, list] of this.g) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      const basic = (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial || mat.transparent;
      mesh.castShadow = cast && !basic; mesh.receiveShadow = !basic; mesh.matrixAutoUpdate = false;
      if (basic) mesh.layers.set(NOINK);
      parent.add(mesh);
    }
    this.g.clear();
  }
}

// ---------------- geometry ----------------
/** box geometry with UVs in metres (so textures tile at a constant world size) */
export const boxGeo = (w: number, h: number, d: number) => {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  const size: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * size[f][0], uv.getY(i) * size[f][1]); }
  return g;
};
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1);
export const mat4 = (p: V3, ry = 0, s: V3 = [1, 1, 1], rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(V(...p), Q.setFromEuler(E.set(rx, ry, rz, "YXZ")).clone(), S.set(...s).clone());
/** axis-aligned box from min corner to max corner (before rotation ry about its centre) */
export const box = (b: Batch, min: V3, max: V3, m: THREE.Material, ry = 0) => {
  const w = max[0] - min[0], h = max[1] - min[1], d = max[2] - min[2];
  b.add(boxGeo(w, h, d), m, mat4([(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], ry));
};
/** box by centre + size + yaw */
export const boxC = (b: Batch, c: V3, size: V3, m: THREE.Material, ry = 0, rx = 0, rz = 0) => b.add(boxGeo(...size), m, mat4(c, ry, [1, 1, 1], rx, rz));
/** cylinder standing on `base` (y up) */
export const cyl = (b: Batch, base: V3, r: number, h: number, m: THREE.Material, seg = 12, rTop = r) =>
  b.add(new THREE.CylinderGeometry(rTop, r, h, seg).translate(0, h / 2, 0), m, mat4(base));
/** cylinder between two points */
export const rod = (b: Batch, a: V3, c: V3, r: number, m: THREE.Material, seg = 8) => {
  const va = V(...a), vc = V(...c), d = vc.clone().sub(va), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg).translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
  b.add(g, m, new THREE.Matrix4().compose(va, q, V(1, 1, 1)));
};
export const sphere = (b: Batch, c: V3, r: number, m: THREE.Material, s: V3 = [1, 1, 1], seg = 14) => b.add(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 4)), m, mat4(c, 0, s));
/** flat quad facing +z (signs, pictures, windows) centred at c, rotated ry */
export const quad = (b: Batch, c: V3, w: number, h: number, m: THREE.Material, ry = 0) => {
  const g = new THREE.PlaneGeometry(w, h);
  b.add(g, m, mat4(c, ry));
};
/** horizontal quad (rug, floor decal, light pool) at height y */
export const flat = (b: Batch, c: V3, w: number, d: number, m: THREE.Material, ry = 0) =>
  b.add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m, mat4(c, ry));
/** extruded 2D shape (x, y) with depth along z, centred on z */
export const extrude = (b: Batch, pts: [number, number][], depth: number, m: THREE.Material, at: V3 = [0, 0, 0], ry = 0) => {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
  b.add(g, m, mat4(at, ry));
};
/** lathe (vases, barrels, lamp shades, domes) from a (radius, y) profile */
export const lathe = (b: Batch, prof: [number, number][], m: THREE.Material, at: V3 = [0, 0, 0], seg = 16, s: V3 = [1, 1, 1]) =>
  b.add(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg), m, mat4(at, 0, s));

/** a mesh that is NOT merged (animated parts: wheels, rotors, flags, flames) */
export const part = (geo: THREE.BufferGeometry, m: THREE.Material, p: V3 = [0, 0, 0], ry = 0) => {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(...p); mesh.rotation.y = ry;
  const basic = (m as THREE.MeshBasicMaterial).isMeshBasicMaterial || m.transparent;
  mesh.castShadow = !basic; mesh.receiveShadow = !basic;
  if (basic) mesh.layers.set(NOINK);
  return mesh;
};
