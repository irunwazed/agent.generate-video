// KIT CAST (render): canvas pool, character cards sized to their pose, flat / billboard effect cards, and the
// card <-> world mapping. Ported from merdeka cast.ts (Pool, Actor, Fx) with kit changes:
//  - a card's plane is rewritten every frame to the solved Joints.rect (spears, raised flags and lying bodies fit)
//  - every card has its own cardShade zone uniforms (head / torso bands follow the pose)
//  - canvas sizes are bucketed (64 px) so the pool can reuse canvases across poses
import * as THREE from "three";
import { Pen, P2 } from "../toon/pen";
import { cardShade, blobMaterial, CARD_K, makeZones, CardZones } from "../core/cardshade";
import { NOINK } from "../core/ink";
import type { Joints } from "../rig/types";

/** metres per design unit at card scale 1 (a standing adult = 777 units = 1.68 m; kit default scale 0.84 -> 1.41 m) */
export const SU = 0.00216;
export const DEFAULT_SCALE = 0.84;

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  /** request a canvas of (w x h) px; draw(p) runs with the pen already in canvas pixels only when the key is new */
  req(key: string, w: number, h: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
    // keep the free list small (GPU memory)
    while (this.free.length > 24) { const e = this.free.shift()!; e.tex.dispose(); }
  }
}

let blankT: THREE.Texture | null = null;
/** 2x2 placeholder texture (lazy: this module must import fine in Node for the validator) */
const blankTex = () => { if (!blankT) { const c = document.createElement("canvas"); c.width = c.height = 2; blankT = new THREE.CanvasTexture(c); } return blankT; };

/** a character card: quad sized to a design-unit rect, origin at the feet (design (300, 975)) */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; zones: CardZones; r: Req | null = null;
  private geo: THREE.BufferGeometry;
  constructor(parent: THREE.Object3D) {
    this.zones = makeZones();
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blankTex(), alphaTest: 0.5, side: THREE.DoubleSide }), this.zones);
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blankTex(), alphaTest: 0.5, side: THREE.DoubleSide });
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
    this.geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
    this.geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2));
    this.geo.setIndex([0, 2, 1, 2, 3, 1]);
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false; this.mesh.frustumCulled = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  /** set the quad to the design rect [x0, y0, x1, y1] and the shading zones from the Joints */
  setRect(rect: [number, number, number, number], J: Joints | null) {
    const [x0, y0, x1, y1] = rect, a = this.geo.getAttribute("position") as THREE.BufferAttribute;
    const L = (x0 - 300) * SU, R = (x1 - 300) * SU, T = (975 - y0) * SU, B = (975 - y1) * SU;
    a.setXYZ(0, L, T, 0); a.setXYZ(1, R, T, 0); a.setXYZ(2, L, B, 0); a.setXYZ(3, R, B, 0);
    a.needsUpdate = true; this.geo.computeBoundingSphere();
    const w = x1 - x0, h = y1 - y0, z = this.zones;
    z.uUnit.value.set(1 / w, 1 / h);
    if (J) {
      const v = (y: number) => 1 - (y - y0) / h, uu = (x: number) => (x - x0) / w;
      z.uHeadZ.value.set(v(J.zones.chin), v(J.zones.headC[1]), J.zones.headR[1] / h, uu(J.zones.headC[0]));
      z.uBodyZ.value.set(J.zones.headR[0] / w, J.zones.torsoW / w, v(J.zones.torsoY[1]), v(J.zones.torsoY[0]));
    }
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}

/** effect / prop card: unit quad scaled to (w, h) metres; billboard, yaw-billboard or flat on the ground */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; lit: THREE.MeshLambertMaterial; r: Req | null = null;
  kind: "cut" | "soft" | "blob" | "lit" = "cut";
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blankTex(), alphaTest: 0.5, side: THREE.DoubleSide });
    this.soft = new THREE.MeshBasicMaterial({ map: blankTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blankTex());
    this.lit = cardShade(new THREE.MeshLambertMaterial({ map: blankTex(), alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false;
    parent.add(this.mesh);
  }
  use(kind: Fx["kind"]) {
    this.kind = kind;
    this.mesh.material = kind === "soft" ? this.soft : kind === "blob" ? this.blob : kind === "lit" ? this.lit : this.mat;
    this.mesh.renderOrder = kind === "blob" ? 0.5 : kind === "soft" ? 2 : 1;
  }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.kind === "blob" && t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
    this.mat.map = t; this.soft.map = t; this.blob.map = t; this.lit.map = t;
  }
}

// ---------------- card <-> world mapping ----------------
/** yaw that makes a card at `pos` face the camera horizontally */
export const faceYaw = (pos: THREE.Vector3, cam: THREE.Vector3) => Math.atan2(cam.x - pos.x, cam.z - pos.z);
/** design point (cx, cy) on a card at `pos` with `yaw` and `scale` -> world point */
export const cardToWorld = (pos: THREE.Vector3, yaw: number, scale: number, c: P2, out = new THREE.Vector3()) => {
  const dx = (c[0] - 300) * SU * scale, dy = (975 - c[1]) * SU * scale;
  return out.set(pos.x + Math.cos(yaw) * dx, pos.y + dy, pos.z - Math.sin(yaw) * dx);
};
const _d = new THREE.Vector3(), _n = new THREE.Vector3(), _h = new THREE.Vector3();
/** world point -> design point on the card plane, along the camera ray (so on screen the hand meets the object) */
export const worldToCard = (pos: THREE.Vector3, yaw: number, scale: number, w: THREE.Vector3, cam: THREE.Vector3): P2 => {
  _n.set(Math.sin(yaw), 0, Math.cos(yaw));
  _d.copy(w).sub(cam);
  const den = _d.dot(_n);
  const t = Math.abs(den) < 1e-6 ? 1 : _h.copy(pos).sub(cam).dot(_n) / den;
  _h.copy(cam).addScaledVector(_d, t).sub(pos);
  const lx = _h.x * Math.cos(yaw) - _h.z * Math.sin(yaw), ly = _h.y;
  return [300 + lx / (SU * scale), 975 - ly / (SU * scale)];
};
