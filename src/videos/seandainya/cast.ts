// 2D Character Cast & Cartoon Effect Cards for "Seandainya Jepang Masih Menjajah Indonesia" (Channel: Seandainya).
// Uses 3x supersampled (1800x3000) lit cardShade sprites, contact/cast shadow blobs, and NOINK layer 3.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxShadow, fxContact, fxBurst, fxStars,
  Outfit, FrontOpts, SideOpts, INK, RIFLEMAN,
  BUNG_KARNO_OUTFIT, BUNG_HATTA_OUTFIT, PETA_COMMANDER_OUTFIT, TAICHO_JEPANG_OUTFIT,
  PEMUDA_PEJUANG_OUTFIT, MACARTHUR_OUTFIT, ROMUSHA_PETANI_OUTFIT,
} from "./toon";
import { FPS, SHOTS, clamp01, WorldState } from "./story";
import { LightName } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
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
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
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
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
const ROOTS = new Set<THREE.Object3D>();

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}

export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else {
      this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0;
    }
  }
}

export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;

const tier = (d: number): [number, number, number] =>
  d < 8.5 ? [1800, 3000, 3.0] : d < 14 ? [1080, 1800, 1.8] : [480, 800, 0.8];

const SUN = new THREE.Vector3(0.5, 0.75, 0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: LightName = "golden";

const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 1200; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(18 + 45 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const liveTilt = (t: number, seed: number, amp = 2.6) => q(amp * Math.sin(t * 3.2 + seed), 30);
const liveHead = (t: number, seed: number, amp = 4.0) => q(amp * Math.sin(t * 2.4 + seed * 1.7) + (amp * 0.4) * Math.cos(t * 4.1 + seed), 30);

type Who = { i: number; o: Outfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, side: boolean, mirror: boolean, fo: FrontOpts, so: SideOpts, scale = 1): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const m = side && mirror, light = light2D(cam, m), seed = ((who.i * 5 + 3) % 7) + 1;
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror: m,
    draw: (p) => (side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

const CONTACT: Record<LightName, [number, number, number]> = {
  space: [0.18, 0.16, 0.32],
  night: [0.18, 0.16, 0.30],
  golden: [0.24, 0.20, 0.33],
  day: [0.20, 0.21, 0.33],
};
const TAIL: [number, number, number] = [0.38, 0.36, 0.56];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");

const blob = (out: Stage, x: number, _y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  const el = Math.asin(Math.min(0.99, Math.max(0.15, SUN.y)));
  const len = Math.min(2.2, Math.max(0.5, 1.4 / Math.tan(el))) * sc, h = len + 0.5 * sc, c = 0.3 * h;
  const tc = hexOf(TAIL, k);
  out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: 0.022, z: z + oz * 0.03 * sc, w: 0.54 * sc, h: 0.42 * sc, flat: true, rot });
};

const fxBadge = (p: Pen, text: string, sub: string, bg: string, fg: string) => {
  const g = p.g;
  g.fillStyle = INK;
  g.beginPath();
  g.roundRect(24, 34, 512, 196, 28);
  g.fill();

  g.fillStyle = bg;
  g.strokeStyle = INK;
  g.lineWidth = 10;
  g.beginPath();
  g.roundRect(16, 22, 512, 196, 28);
  g.fill();
  g.stroke();

  g.fillStyle = fg;
  g.textAlign = "center";

  let mainSz = 48;
  g.font = `900 ${mainSz}px 'Segoe UI', Arial, sans-serif`;
  while (g.measureText(text).width > 456 && mainSz > 22) {
    mainSz -= 2;
    g.font = `900 ${mainSz}px 'Segoe UI', Arial, sans-serif`;
  }
  g.fillText(text, 272, 112);

  let subSz = 30;
  g.font = `800 ${subSz}px 'Segoe UI', Arial, sans-serif`;
  while (g.measureText(sub).width > 456 && subSz > 16) {
    subSz -= 2;
    g.font = `800 ${subSz}px 'Segoe UI', Arial, sans-serif`;
  }
  g.fillText(sub, 272, 174);
};

/** Animated Rifle Muzzle Flash + Flying Bullet Tracers & Mortar Shell (640x360 canvas) for war_battle */
const fxWeaponFire = (p: Pen, phase: number) => {
  const g = p.g;
  // 1. Bright Golden Muzzle Flash Star at Left (x = 95, y = 210)
  g.fillStyle = "#ff4757";
  g.strokeStyle = INK;
  g.lineWidth = 6;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 68 : 26;
    const x = 95 + Math.cos(a) * r, y = 210 + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#fff3b0";
  g.beginPath(); g.arc(95, 210, 22, 0, Math.PI * 2); g.fill();

  // 2. Flying Bullet Tracers streaking left-to-right across the battlefield
  for (const [rowY, off] of [[185, 0.0], [225, 0.35], [155, 0.68]] as const) {
    const u = (phase + off) % 1.0;
    const bx = 140 + u * 420;
    // White-gold tracer streak
    g.strokeStyle = INK; g.lineWidth = 14;
    g.beginPath(); g.moveTo(bx - 55, rowY); g.lineTo(bx, rowY); g.stroke();
    g.strokeStyle = "#ffd43b"; g.lineWidth = 8;
    g.beginPath(); g.moveTo(bx - 55, rowY); g.lineTo(bx, rowY); g.stroke();
    // Bullet nose
    g.fillStyle = "#ff4757";
    g.beginPath(); g.arc(bx + 6, rowY, 9, 0, Math.PI * 2); g.fill(); g.stroke();
  }

  // 3. Arcing Mortar Shell flying along top parabola (from left mortar to right Kenpeitai fort)
  const mu = (phase * 0.85) % 1.0;
  const mx = 110 + mu * 460;
  const my = 180 - Math.sin(mu * Math.PI) * 135;
  g.save();
  g.translate(mx, my);
  g.rotate((mu - 0.5) * 1.1);
  g.fillStyle = "#2c3e50"; g.strokeStyle = INK; g.lineWidth = 6;
  g.beginPath(); g.roundRect(-22, -11, 44, 22, 10); g.fill(); g.stroke();
  g.fillStyle = "#ff6b6b";
  g.beginPath(); g.arc(18, 0, 9, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** Animated Tactical Map Target Ring & Pointer Arrow (256x256) for map_nusantara & map_asia */
const fxMapTarget = (p: Pen, phase: number) => {
  const g = p.g;
  const r1 = 52 + Math.sin(phase * Math.PI * 2) * 12;
  g.strokeStyle = INK; g.lineWidth = 12;
  g.beginPath(); g.arc(128, 128, r1, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = "#ffd43b"; g.lineWidth = 6;
  g.beginPath(); g.arc(128, 128, r1, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#ff4757";
  g.beginPath(); g.arc(128, 128, 14, 0, Math.PI * 2); g.fill(); g.stroke();
};

// ---------------- Character Roster ----------------
const WHO_KARNO: Who     = { i: 1, o: BUNG_KARNO_OUTFIT,      okey: "karno" };
const WHO_HATTA: Who     = { i: 2, o: BUNG_HATTA_OUTFIT,      okey: "hatta" };
const WHO_PETA: Who      = { i: 3, o: PETA_COMMANDER_OUTFIT,  okey: "peta" };
const WHO_TAICHO: Who    = { i: 4, o: TAICHO_JEPANG_OUTFIT,   okey: "taicho" };
const WHO_PEMUDA: Who    = { i: 5, o: PEMUDA_PEJUANG_OUTFIT,  okey: "pemuda" };
const WHO_HEIHO: Who     = { i: 6, o: { ...RIFLEMAN, skin: "#fcfaf5" }, okey: "heiho" };
const WHO_MACARTHUR: Who = { i: 7, o: MACARTHUR_OUTFIT,       okey: "macarthur" };
const WHO_ROMUSHA: Who   = { i: 8, o: ROMUSHA_PETANI_OUTFIT,  okey: "romusha" };

export const stage = (ws: WorldState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const { id, t, setKind } = ws;
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);

  const addChar = (
    who: Who,
    x: number,
    y: number,
    z: number,
    fo: FrontOpts,
    scale = 0.84,
    side = false,
    mirror = false,
    so: SideOpts = {}
  ) => {
    out.places.push(person(cam, who, x, y, z, side, mirror, fo, so, scale));
    blob(out, x, y, z, scale * 0.95);
  };

  // Floating Narrative Badge (on Map sets, place badge slightly higher at y = 2.66 so the full map is unobstructed)
  out.fx.push({
    key: `fx|badge|sa_${id}`,
    cw: 560, ch: 260,
    draw: (p) => fxBadge(p, s.badgeTitle, s.badgeSub, s.badgeBg ?? "#ffd43b", INK),
    x: 0.0,
    y: (setKind === "map_nusantara" || setKind === "map_asia" ? 2.66 : 2.68) + Math.sin(t * 3.6) * 0.025,
    z: setKind === "map_nusantara" || setKind === "map_asia" ? -2.45 : -0.95,
    w: 0.66, h: 0.30,
  });

  if (setKind === "map_nusantara" || setKind === "map_asia") {
    // MAP SPOTLIGHT MODE: ZERO CHARACTERS so 100% of the Map & 3D Islands fill the frame cleanly!
    const ph = q((t * 0.9) % 1.0, 16);
    out.fx.push({
      key: `fx|mapTarget|${ph}`,
      cw: 256, ch: 256,
      draw: (p) => fxMapTarget(p, ph),
      x: setKind === "map_nusantara" ? -0.18 : 0.42,
      y: setKind === "map_nusantara" ? 1.42 : 1.72,
      z: -2.72,
      w: 0.32, h: 0.32,
    });
  } else if (setKind === "war_battle") {
    // OUTDOOR BATTLEFIELD STAGE: Supriyadi PETA (left) & Guerrilla fighter (center) firing rifles & mortar at Kenpeitai (right)!
    addChar(WHO_PETA, -0.68, 0, -0.56, {
      mode: "march",
      phase: q(t * 1.6, 20),
      expr: "stern",
      blink: lidAt(t, 3),
      tilt: liveTilt(t, 3, 3.2) + 4,
      headTilt: liveHead(t, 3, 4.2) + 3,
      prop: "point_up",
      wave: q(Math.sin(t * 5.2), 10),
      look: 1,
      facing: 1,
    }, 0.78);

    addChar(WHO_HEIHO, -0.12, 0, -0.52, {
      mode: "march",
      phase: q(t * 1.6 + 0.5, 20),
      expr: "stern",
      blink: lidAt(t, 6),
      tilt: liveTilt(t, 6, 3.0) + 3,
      headTilt: liveHead(t, 6, 3.8),
      look: 1,
      facing: 1,
    }, 0.78);

    addChar(WHO_TAICHO, 0.68, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.5, 20),
      expr: "shock",
      blink: lidAt(t, 4),
      tilt: liveTilt(t, 4, 3.8) - 6,
      headTilt: liveHead(t, 4, 4.8) - 5,
      prop: "pointer",
      wave: q(Math.cos(t * 6.0), 10),
      look: -1,
      facing: -1,
    }, 0.78);

    // 1. Active Weapon Fire Animation: Rifle Muzzle Flash + Flying Bullet Tracers + Arcing Mortar Shell!
    const wf = q((t * 1.8) % 1.0, 16);
    out.fx.push({
      key: `fx|weap|${wf}`,
      cw: 640, ch: 360,
      draw: (p) => fxWeaponFire(p, wf),
      x: 0.14, y: 1.32, z: -0.42,
      w: 1.05, h: 0.58,
    });

    // 2. Mortar / Dynamite Explosion Burst on the Kenpeitai Fort
    const bt = q((t * 1.4) % 1.0, 16);
    out.fx.push({
      key: `fx|burst|war|${bt}`,
      cw: 500, ch: 500,
      draw: (p) => fxBurst(p, bt, "#ff9f43"),
      x: 0.82, y: 1.48, z: -1.65,
      w: 0.85, h: 0.85,
    });
  } else if (setKind === "romusha_saketi") {
    // OUTDOOR PLANTATION & SAKETI-BAYAH RAILWAY FORCED LABOR: Two Romusha workers hammering rails + Japanese overseer
    const strike1 = 0.5 + 0.5 * Math.sin(t * 5.5);
    const strike2 = 0.5 + 0.5 * Math.cos(t * 5.5);
    addChar(WHO_ROMUSHA, -0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.0, 20),
      expr: "pained",
      blink: lidAt(t, 8),
      tilt: liveTilt(t, 8, 2.4) + 5,
      headTilt: liveHead(t, 8, 3.5) + 4,
      prop: ["hammer", q(strike1, 12)],
      look: 1,
      facing: 1,
    }, 0.80);

    addChar(WHO_ROMUSHA, -0.04, 0, -0.52, {
      mode: "stand",
      phase: q(t * 1.1 + 0.3, 20),
      expr: "pained",
      blink: lidAt(t, 6),
      tilt: liveTilt(t, 6, 2.5) + 4,
      headTilt: liveHead(t, 6, 3.6) + 3,
      prop: ["hammer", q(strike2, 12)],
      look: 1,
      facing: 1,
    }, 0.80);

    addChar(WHO_TAICHO, 0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.2, 20),
      expr: id === 20 ? "dazed" : "stern",
      blink: lidAt(t, 4),
      tilt: liveTilt(t, 4, 2.8) - 3,
      headTilt: liveHead(t, 4, 4.0) - 3,
      prop: "pointer",
      wave: q(Math.cos(t * 4.2), 10),
      look: -1,
      facing: -1,
    }, 0.83);
  } else if (setKind === "tokyo_scap") {
    // TWIST TOKYO SCAP STAGE: Towering General MacArthur (scale 0.92) vs visibly smaller humbled Japanese Emperor/Commander (scale 0.72)!
    addChar(WHO_PEMUDA, -0.70, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.2, 20),
      expr: "grin",
      blink: lidAt(t, 5),
      tilt: liveTilt(t, 5, 2.8) + 3,
      headTilt: liveHead(t, 5, 3.8) + 3,
      prop: "mic",
      wave: q(Math.sin(t * 4.4), 10),
      look: 1,
      facing: 1,
    }, 0.83);

    addChar(WHO_MACARTHUR, 0.05, 0, -0.48, {
      mode: "stand",
      phase: q(t * 1.1, 20),
      expr: "stern",
      blink: lidAt(t, 7),
      tilt: liveTilt(t, 7, 2.2),
      headTilt: liveHead(t, 7, 3.2),
      prop: "gavel",
      wave: q(Math.sin(t * 3.6), 10),
      look: 1,
      facing: 1,
    }, 0.84);

    addChar(WHO_TAICHO, 0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 0.9, 20),
      expr: "nervous",
      blink: lidAt(t, 4),
      tilt: liveTilt(t, 4, 2.0) - 5,
      headTilt: liveHead(t, 4, 3.0) - 6,
      look: -1,
      facing: -1,
    }, 0.66);
  } else if (setKind === "colony_1950") {
    // WORST-CASE 35-YEAR COLONY STAGE (Korea / Manchukuo analogy)
    addChar(WHO_ROMUSHA, -0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.0, 20),
      expr: "pained",
      blink: lidAt(t, 8),
      tilt: liveTilt(t, 8, 2.4) + 3,
      headTilt: liveHead(t, 8, 3.4) + 3,
      look: 1,
      facing: 1,
    }, 0.82);

    addChar(WHO_PEMUDA, 0.0, 0, -0.48, {
      mode: "stand",
      phase: q(t * 1.1, 20),
      expr: "stern",
      blink: lidAt(t, 5),
      tilt: liveTilt(t, 5, 2.6),
      headTilt: liveHead(t, 5, 3.6),
      prop: "mic",
      wave: q(Math.sin(t * 4.0), 10),
      look: 1,
      facing: 1,
    }, 0.85);

    addChar(WHO_TAICHO, 0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.2, 20),
      expr: "stern",
      blink: lidAt(t, 4),
      tilt: liveTilt(t, 4, 2.8) - 3,
      headTilt: liveHead(t, 4, 3.8) - 3,
      prop: "pointer",
      wave: q(Math.cos(t * 4.2), 10),
      look: -1,
      facing: -1,
    }, 0.85);
  } else if (setKind === "modern_mitra") {
    // MODERN PARTNERSHIP & SOVEREIGN REPUBLIC STAGE
    addChar(WHO_PEMUDA, -0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.3, 20),
      expr: "grin",
      blink: lidAt(t, 5),
      tilt: liveTilt(t, 5, 2.8) + 3,
      headTilt: liveHead(t, 5, 3.8) + 3,
      prop: "mic",
      wave: q(Math.sin(t * 4.5), 10),
      look: 1,
      facing: 1,
    }, 0.84);

    addChar(WHO_KARNO, 0.0, 0, -0.48, {
      mode: "stand",
      phase: q(t * 1.2, 20),
      expr: "laugh",
      blink: lidAt(t, 1),
      tilt: liveTilt(t, 1, 2.6),
      headTilt: liveHead(t, 1, 3.8),
      prop: "key",
      wave: q(Math.sin(t * 4.2), 10),
      look: 1,
      facing: 1,
    }, 0.86);

    addChar(WHO_HATTA, 0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.1, 20),
      expr: "smile",
      blink: lidAt(t, 2),
      tilt: liveTilt(t, 2, 2.5) - 3,
      headTilt: liveHead(t, 2, 3.6) - 3,
      prop: "cert",
      wave: q(Math.cos(t * 4.0), 10),
      look: -1,
      facing: -1,
    }, 0.84);
  } else {
    // DEFAULT: calendar_1945 (17 Agustus 1945 Kosong & Sidang BPUPKI)
    addChar(WHO_PEMUDA, -0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.2, 20),
      expr: "stern",
      blink: lidAt(t, 5),
      tilt: liveTilt(t, 5, 2.6) + 3,
      headTilt: liveHead(t, 5, 3.8) + 3,
      prop: "mic",
      wave: q(Math.sin(t * 4.2), 10),
      look: 1,
      facing: 1,
    }, 0.83);

    addChar(WHO_KARNO, 0.0, 0, -0.48, {
      mode: "stand",
      phase: q(t * 1.1, 20),
      expr: "stern",
      blink: lidAt(t, 1),
      tilt: liveTilt(t, 1, 2.5),
      headTilt: liveHead(t, 1, 3.6),
      prop: "cert",
      wave: q(Math.sin(t * 3.8), 10),
      look: 1,
      facing: 1,
    }, 0.85);

    addChar(WHO_TAICHO, 0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.2, 20),
      expr: "stern",
      blink: lidAt(t, 4),
      tilt: liveTilt(t, 4, 2.8) - 3,
      headTilt: liveHead(t, 4, 4.0) - 3,
      prop: "pointer",
      wave: q(Math.cos(t * 4.2), 10),
      look: -1,
      facing: -1,
    }, 0.84);
  }

  return out;
};
