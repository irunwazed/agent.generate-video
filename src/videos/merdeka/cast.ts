// 2D Character Cast & Cartoon Effect Cards for "Alasan Indonesia Merdeka yang Sekolah Tidak Ajarkan" (1945–1949).
// Uses 3x supersampled (1800x3000) lit cardShade sprites, contact/cast shadow blobs, and NOINK layer 3.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxShadow, fxContact, fxBurst, fxStars,
  Outfit, FrontOpts, SideOpts, INK, RIFLEMAN,
  BUNG_KARNO_OUTFIT, BUNG_HATTA_OUTFIT, PETA_COMMANDER_OUTFIT, TAICHO_JEPANG_OUTFIT, PEMUDA_PEJUANG_OUTFIT,
} from "./toon";
import { FPS, SHOTS, clamp01, WorldState } from "./story";
import { LightName } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
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

// ---------------- sprite meshes ----------------
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

// ---------------- placements ----------------
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

// ---------------- blinks, expression swaps & micro-motion helpers ----------------
const LEAD = 2 / FPS;
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 48 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const liveTilt = (t: number, seed: number, amp = 2.6) => q(amp * Math.sin(t * 3.2 + seed), 30);
const liveHead = (t: number, seed: number, amp = 4.0) => q(amp * Math.sin(t * 2.4 + seed * 1.7) + (amp * 0.4) * Math.cos(t * 4.1 + seed), 30);

const hopY = (t: number, t0: number, dur = 0.42, height = 0.16): number => {
  const dt = t - t0;
  if (dt < -0.08 || dt > dur) return 0;
  if (dt < 0) return -0.025 * Math.sin(((dt + 0.08) / 0.08) * Math.PI);
  const u = dt / dur;
  return height * 4 * u * (1 - u);
};

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

/** Comic Floating Punchline Badge (560x260) — auto-fits text with generous internal padding */
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

  let mainSz = 50;
  g.font = `900 ${mainSz}px 'Segoe UI', Arial, sans-serif`;
  while (g.measureText(text).width > 456 && mainSz > 24) {
    mainSz -= 2;
    g.font = `900 ${mainSz}px 'Segoe UI', Arial, sans-serif`;
  }
  g.fillText(text, 272, 112);

  let subSz = 31;
  g.font = `800 ${subSz}px 'Segoe UI', Arial, sans-serif`;
  while (g.measureText(sub).width > 456 && subSz > 18) {
    subSz -= 2;
    g.font = `800 ${subSz}px 'Segoe UI', Arial, sans-serif`;
  }
  g.fillText(sub, 272, 174);
};

// ---------------- Historical Character Roster ----------------
const WHO_KARNO: Who  = { i: 1, o: BUNG_KARNO_OUTFIT,      okey: "karno" };
const WHO_HATTA: Who  = { i: 2, o: BUNG_HATTA_OUTFIT,      okey: "hatta" };
const WHO_PETA: Who   = { i: 3, o: PETA_COMMANDER_OUTFIT,  okey: "peta" };
const WHO_TAICHO: Who = { i: 4, o: TAICHO_JEPANG_OUTFIT,   okey: "taicho" };
const WHO_PEMUDA: Who = { i: 5, o: PEMUDA_PEJUANG_OUTFIT,  okey: "pemuda" };
const WHO_HEIHO: Who  = { i: 6, o: { ...RIFLEMAN, skin: "#fcfaf5" }, okey: "heiho" };

export const stage = (ws: WorldState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const { id, t } = ws;
  LNAME = SHOTS[id - 1].light;
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

  if (id === 1 || id === 2 || id === 3 || id === 4) {
    // HERO SET 1: Markas Komando Jepang 15 Agustus 1945 (Vacuum of Power & Status Quo)
    // Left: Pemuda Pejuang with radio headphones & mic (monitoring 15 Agustus broadcast)
    // Center: Bung Karno holding Proklamasi / History scroll
    // Right: Taicho Kenji (Japanese Commander) shocked / nervous by unconditional surrender
    const shockJump = id === 1 ? hopY(t, 4.93, 0.38, 0.14) : id === 2 ? hopY(t, 9.93, 0.38, 0.14) : 0;

    addChar(WHO_PEMUDA, -0.66, 0, -0.60, {
      mode: "stand",
      phase: q(t * 1.3, 20),
      expr: id >= 3 ? "grin" : "smile",
      blink: lidAt(t, 5, [1.4, 7.2, 14.8]),
      tilt: liveTilt(t, 5, 2.8) + 3,
      headTilt: liveHead(t, 5, 4.0) + 3,
      prop: "mic",
      wave: q(Math.sin(t * 4.5), 10),
      look: 1,
      facing: 1,
    }, 0.82);

    addChar(WHO_KARNO, 0.0, 0, -0.48, {
      mode: "stand",
      phase: q(t * 1.1, 20),
      expr: id >= 3 ? "smile" : "stern",
      blink: lidAt(t, 1, [2.5, 9.0, 18.0]),
      tilt: liveTilt(t, 1, 2.5),
      headTilt: liveHead(t, 1, 3.6),
      prop: "cert",
      wave: q(Math.sin(t * 3.8), 10),
      look: t % 4 < 2 ? -1 : 1,
      facing: 1,
    }, 0.85);

    addChar(WHO_TAICHO, 0.64, shockJump, -0.58, {
      mode: id === 4 ? "sit" : "stand",
      phase: q(t * 1.2, 20),
      expr: id === 1 && t < 4.8 ? "stern" : id === 4 ? "nervous" : "shock",
      blink: lidAt(t, 4, [4.9, 9.9, 21.0]),
      tilt: liveTilt(t, 4, 3.2) - 4,
      headTilt: liveHead(t, 4, 4.5) - 4,
      prop: id === 4 ? "calc" : "pointer",
      wave: q(Math.cos(t * 4.8), 10),
      look: -1,
      facing: -1,
    }, 0.83);

    const badgeTitle = id === 1 ? "JEPANG KALAH PERANG!" : id === 2 ? "15 AGUSTUS 1945" : id === 3 ? "KEHILANGAN WEWENANG" : "VACUUM OF POWER";
    const badgeSub = id === 1 ? "ALASAN YANG JARANG DIBAHAS" : id === 2 ? "MENYERAH TANPA SYARAT!" : id === 3 ? "SEKUTU BELUM DATANG!" : "JAGA STATUS QUO";
    out.fx.push({
      key: `fx|badge|s${id}`,
      cw: 560, ch: 260,
      draw: (p) => fxBadge(p, badgeTitle, badgeSub, "#ffd43b", INK),
      x: 0.0, y: 2.54 + Math.sin(t * 3.6) * 0.03, z: -0.95,
      w: 0.68, h: 0.31,
    });
    if (id === 1 && t >= 4.90 && t < 5.35) {
      const bt = clamp01((t - 4.90) / 0.45);
      out.fx.push({
        key: `fx|burst|s1|${q(bt, 20)}`,
        cw: 500, ch: 500,
        draw: (p) => fxBurst(p, bt, "#ffd43b"),
        x: 0.64, y: 1.48, z: -0.72,
        w: 0.85, h: 0.85,
      });
    }
  } else if (id === 5 || id === 6 || id === 7 || id === 13) {
    // HERO SET 2: Kamp Pelatihan Militer PETA & Heiho 1943 (Shots 5, 6, 7 & Deadpan Shot 13)
    // Left: Komandan PETA (rifle + red sash)
    // Center: Heiho / PETA soldier drilling in step
    // Right: Taicho Kenji (confident in Shot 5-6, shocked/dazed in Shot 7 & Shot 13 when it backfires!)
    const isDeadpanBackfire = (id === 13 && t >= 85.0) || id === 7;
    const hopPeta = id === 7 ? hopY(t, 43.2, 0.40, 0.14) : 0;

    addChar(WHO_PETA, -0.64, hopPeta, -0.56, {
      mode: id === 5 ? "march" : "stand",
      phase: q(t * 1.4, 20),
      expr: id === 13 ? "grin" : "stern",
      blink: lidAt(t, 3, [28.0, 34.0, 43.2, 82.5]),
      tilt: liveTilt(t, 3, 2.8) + 2,
      headTilt: liveHead(t, 3, 3.8) + 2,
      prop: "point_up",
      wave: q(Math.sin(t * 4.5), 10),
      look: 1,
      facing: 1,
    }, 0.85);

    addChar(WHO_HEIHO, -0.04, 0, -0.52, {
      mode: id === 5 || id === 7 ? "march" : "stand",
      phase: q(t * 1.4 + 0.5, 20),
      expr: id === 7 || id === 13 ? "grin" : "stern",
      blink: lidAt(t, 6, [30.0, 45.0, 83.0]),
      tilt: liveTilt(t, 6, 2.5),
      headTilt: liveHead(t, 6, 3.5),
      look: 1,
      facing: 1,
    }, 0.83);

    addChar(WHO_TAICHO, 0.64, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.1, 20),
      expr: isDeadpanBackfire ? "dazed" : id === 6 ? "grin" : "stern",
      blink: lidAt(t, 4, [37.5, 42.0, 85.0]),
      tilt: liveTilt(t, 4, 3.2) - (isDeadpanBackfire ? 8 : 3),
      headTilt: liveHead(t, 4, 4.4) - 4,
      prop: "pointer",
      wave: q(Math.cos(t * 4.2), 10),
      look: -1,
      facing: -1,
    }, 0.83);

    const bTitle = id === 5 ? "PETA & HEIHO (1943)" : id === 6 ? "BUTUH TENTARA PERANG" : id === 7 ? "TIDAK MULAI DARI NOL!" : (t < 85.0 ? "UNTUNGNYA: DILATIH!" : "SIALNYA: SENJATA MAKAN TUAN!");
    const bSub = id === 5 ? "PULUHAN RIBU PEMUDA TERLATIH" : id === 6 ? "BUKAN KARENA SAYANG!" : id === 7 ? "SIAP ORGANISASI PASUKAN" : "RENCANA JEPANG JADI BERBALIK";
    out.fx.push({
      key: `fx|badge|s${id}_${t < 85.0 ? "a" : "b"}`,
      cw: 560, ch: 260,
      draw: (p) => fxBadge(p, bTitle, bSub, isDeadpanBackfire ? "#2ecc71" : "#ffd43b", INK),
      x: 0.0, y: 2.54 + Math.sin(t * 3.8) * 0.03, z: -0.95,
      w: 0.68, h: 0.31,
    });
  } else if (id === 8 || id === 9) {
    // HERO SET 3: Rumah Rengasdengklok & Panggung Proklamasi (16-17 Agustus 1945)
    // Left: Pemuda Menteng 31 urging immediate proclamation
    // Center: Bung Karno reading Naskah Proklamasi
    // Right: Bung Hatta standing beside Bung Karno
    const hopProk = id === 9 ? hopY(t, 60.5, 0.42, 0.14) : 0;

    addChar(WHO_PEMUDA, -0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.4, 20),
      expr: id === 8 ? "stern" : "grin",
      blink: lidAt(t, 5, [50.0, 56.0, 61.0]),
      tilt: liveTilt(t, 5, 3.0) + 3,
      headTilt: liveHead(t, 5, 4.2) + 3,
      prop: "point_up",
      wave: q(Math.sin(t * 5.0), 10),
      look: 1,
      facing: 1,
    }, 0.83);

    addChar(WHO_KARNO, 0.0, hopProk, -0.46, {
      mode: "stand",
      phase: q(t * 1.2, 20),
      expr: id === 9 && t >= 60.0 ? "laugh" : "stern",
      blink: lidAt(t, 1, [52.0, 58.0, 60.5]),
      tilt: liveTilt(t, 1, 2.6),
      headTilt: liveHead(t, 1, 3.8),
      prop: "cert",
      wave: q(Math.sin(t * 4.2), 10),
      look: 1,
      facing: 1,
    }, 0.86);

    addChar(WHO_HATTA, 0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.1, 20),
      expr: id === 9 ? "smile" : "neutral",
      blink: lidAt(t, 2, [51.5, 59.0]),
      tilt: liveTilt(t, 2, 2.4) - 2,
      headTilt: liveHead(t, 2, 3.5) - 2,
      prop: "cert",
      wave: q(Math.cos(t * 3.8), 10),
      look: -1,
      facing: -1,
    }, 0.83);

    out.fx.push({
      key: `fx|badge|s${id}`,
      cw: 560, ch: 260,
      draw: (p) => fxBadge(
        p,
        id === 8 ? "16 AGUSTUS 04:00 WIB" : "17 AGUSTUS 1945",
        id === 8 ? "SOEKARNO-HATTA KE RENGASDENGKLOK" : "PROKLAMASI TANPA IZIN JEPANG!",
        "#ffd43b",
        INK
      ),
      x: 0.0, y: 2.54 + Math.sin(t * 3.8) * 0.03, z: -0.95,
      w: 0.68, h: 0.31,
    });
    if (id === 9 && t >= 58.2 && t < 58.75) {
      const bt = clamp01((t - 58.2) / 0.55);
      out.fx.push({
        key: `fx|burst|s9|${q(bt, 20)}`,
        cw: 500, ch: 500,
        draw: (p) => fxBurst(p, bt, "#fff3b0"),
        x: 0.0, y: 1.52, z: -0.65,
        w: 0.90, h: 0.90,
      });
    }
  } else if (id === 10 || id === 11 || id === 12) {
    // HERO SET 4: Gudang Senjata Don Bosco Surabaya & Lahirnya TNI (1-5 Oktober 1945)
    // Left: Pemuda Surabaya holding warehouse key / seizing Don Bosco crates
    // Center: Komandan PETA / TNI Commander in formation
    // Right: Ex-Heiho / BKR soldier with rifle
    const hopTni = id === 12 ? hopY(t, 78.6, 0.42, 0.15) : 0;

    addChar(WHO_PEMUDA, -0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.3, 20),
      expr: "grin",
      blink: lidAt(t, 5, [64.5, 70.5, 76.0]),
      tilt: liveTilt(t, 5, 3.0) + 3,
      headTilt: liveHead(t, 5, 4.0) + 3,
      prop: "key",
      wave: q(Math.sin(t * 4.8), 10),
      look: 1,
      facing: 1,
    }, 0.83);

    addChar(WHO_PETA, 0.0, hopTni, -0.48, {
      mode: id === 12 ? "march" : "stand",
      phase: q(t * 1.4, 20),
      expr: id === 12 ? "laugh" : "grin",
      blink: lidAt(t, 3, [65.0, 71.0, 78.6]),
      tilt: liveTilt(t, 3, 2.8),
      headTilt: liveHead(t, 3, 3.8),
      prop: "point_up",
      wave: q(Math.sin(t * 4.5), 10),
      look: 1,
      facing: 1,
    }, 0.86);

    addChar(WHO_HEIHO, 0.66, 0, -0.58, {
      mode: id === 12 ? "march" : "stand",
      phase: q(t * 1.4 + 0.5, 20),
      expr: "grin",
      blink: lidAt(t, 6, [66.0, 72.0, 79.0]),
      tilt: liveTilt(t, 6, 2.6) - 3,
      headTilt: liveHead(t, 6, 3.6) - 3,
      look: -1,
      facing: -1,
    }, 0.83);

    const bTitle = id === 10 ? "GUDANG SENJATA JEPANG" : id === 11 ? "GUDANG DON BOSCO" : "5 OKTOBER 1945";
    const bSub = id === 10 ? "PERSENJATAAN PEJUANG RI" : id === 11 ? "DIREBUT DI SURABAYA!" : "EKS PETA & HEIHO → TNI!";
    out.fx.push({
      key: `fx|badge|s${id}`,
      cw: 560, ch: 260,
      draw: (p) => fxBadge(p, bTitle, bSub, id === 12 ? "#2ecc71" : "#ffd43b", INK),
      x: 0.0, y: 2.54 + Math.sin(t * 3.8) * 0.03, z: -0.95,
      w: 0.68, h: 0.31,
    });
    if (id === 12 && t >= 78.55 && t < 79.05) {
      const bt = clamp01((t - 78.55) / 0.50);
      out.fx.push({
        key: `fx|burst|s12|${q(bt, 20)}`,
        cw: 500, ch: 500,
        draw: (p) => fxBurst(p, bt, "#ffd43b"),
        x: 0.0, y: 1.52, z: -0.68,
        w: 0.90, h: 0.90,
      });
    }
  } else {
    // HERO SET 5: Perjuangan 4,5 Tahun, KMB 27 Desember 1949 & Pintu Kunci Kemerdekaan (Shots 14, 15, 16)
    // Left: Bung Hatta at KMB Treaty Table with Gavel
    // Center: Bung Karno with Proclamation / Sovereignty scroll
    // Right: Pemuda / Komandan PETA holding the Golden Key by the Ornate Door of Independence
    const hopFinal = id === 16 ? hopY(t, 110.2, 0.44, 0.15) : id === 15 ? hopY(t, 99.5, 0.40, 0.14) : 0;

    addChar(WHO_HATTA, -0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.1, 20),
      expr: id >= 15 ? "grin" : "stern",
      blink: lidAt(t, 2, [91.0, 99.5, 105.0]),
      tilt: liveTilt(t, 2, 2.5) + 3,
      headTilt: liveHead(t, 2, 3.6) + 3,
      prop: "gavel",
      wave: q(Math.sin(t * 4.4), 10),
      look: 1,
      facing: 1,
    }, 0.83);

    addChar(WHO_KARNO, 0.0, hopFinal, -0.48, {
      mode: "stand",
      phase: q(t * 1.2, 20),
      expr: id >= 15 ? "laugh" : "stern",
      blink: lidAt(t, 1, [92.0, 99.5, 110.2]),
      tilt: liveTilt(t, 1, 2.8),
      headTilt: liveHead(t, 1, 4.0),
      prop: "key",
      wave: q(Math.sin(t * 4.8), 10),
      look: 1,
      facing: 1,
    }, 0.86);

    addChar(WHO_PETA, 0.66, 0, -0.58, {
      mode: "stand",
      phase: q(t * 1.3, 20),
      expr: "grin",
      blink: lidAt(t, 3, [93.0, 100.0, 111.0]),
      tilt: liveTilt(t, 3, 2.8) - 3,
      headTilt: liveHead(t, 3, 3.8) - 3,
      prop: "key",
      wave: q(Math.cos(t * 4.6), 10),
      look: -1,
      facing: -1,
    }, 0.83);

    const bTitle = id === 14 ? "4,5 TAHUN PERJUANGAN" : id === 15 ? "27 DESEMBER 1949" : "KITA YANG MEMBUKANYA!";
    const bSub = id === 14 ? "PERANG • DIPLOMASI • TEKANAN DUNIA" : id === 15 ? "BELANDA AKUI KEDAULATAN RI!" : "KUNCI KEMERDEKAAN INDONESIA";
    out.fx.push({
      key: `fx|badge|s${id}`,
      cw: 560, ch: 260,
      draw: (p) => fxBadge(p, bTitle, bSub, id >= 15 ? "#2ecc71" : "#ffd43b", INK),
      x: 0.0, y: 2.54 + Math.sin(t * 3.8) * 0.03, z: -0.95,
      w: 0.68, h: 0.31,
    });
    if ((id === 15 && t >= 99.45 && t < 99.95) || (id === 16 && t >= 110.15 && t < 110.65)) {
      const t0 = id === 15 ? 99.45 : 110.15;
      const bt = clamp01((t - t0) / 0.50);
      out.fx.push({
        key: `fx|stars|s${id}|${q(bt, 20)}`,
        cw: 420, ch: 220,
        draw: (p) => fxStars(p, bt),
        x: 0.0, y: 1.84, z: -0.55,
        w: 0.72, h: 0.38,
      });
    }
  }

  return out;
};
