// KIT RUNTIME (render): one KitWorld per visible shot (ShotView). It builds ONLY that shot's location, then every
// frame turns the pure FrameState (model.ts) into three.js: sky / fog / sun / practical lights, character cards
// (solve -> drawRig into a pooled canvas sized to the pose), world props, contact shadows and effect cards.
// Ported from merdeka world.ts (sky dome, stars, moon, sun rig, actor / fx loop).
import * as THREE from "three";
import { Pen, P2 } from "../toon/pen";
import { ctex, rng } from "../core/paint";
import { LIGHTS, LOOK, LightName } from "../core/lights";
import { TONE, CHAR, untone } from "../core/shade";
import { CARD_AMB } from "../core/cardshade";
import { NOINK } from "../core/ink";
import { Pool, Actor, Fx, SU, faceYaw, worldToCard } from "../cast/actor";
import { solve } from "../rig/solve";
import { drawRig, drawPropAt } from "../rig/draw";
import { PROPS, PU } from "../props/defs";
import { fxShadow, fxContact, fxBurst, fxSplash, fxPuff, fxStars, fxRing, fxGlow } from "../fx/draw";
import { FX_DRAW } from "../fx/effects";
import { frameState, FrameState } from "./model";
import { shotCam } from "../camera/presets";
import type { Project, V3, PracticalSpec } from "./types";
import { buildVehicle, BuiltVehicle } from "../vehicles/build";
import { VEHICLES, vehicleToWorld } from "../vehicles/defs";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const q = (v: number, n = 60) => Math.round(v * n) / n;
const fkey = (o: unknown) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const toSrgb = (v: number) => { const c = Math.max(0, Math.min(1, v)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const LID = [0.5, 1, 1, 0.5];
/** blink state at frame f (every 0.5-2.1 s, 4 frames) */
const lidAt = (f: number, i: number) => {
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 600; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 48 * hh(i * 31 + n, 13)); }
  return 0;
};

const discTex = () => ctex("kitMoonDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 54, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

const smoothstep = (u: number) => u * u * (3 - 2 * u);
export type WorldOut = { focus: THREE.Vector3; cInf: number; light: LightName; flash: number };

export class KitWorld {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private points: THREE.PointLight[] = [];
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private stars: THREE.Group; private moon: THREE.Sprite;
  private fog = new THREE.Fog("#b8d0ec", 30, 300);
  private locUpdate?: (f: number, t: number, state: Record<string, number>) => void;
  private culls: THREE.Object3D[] = [];
  private vehicles = new Map<string, BuiltVehicle>();
  private sunDir: THREE.Vector3;
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private sph = new THREE.Sphere();
  constructor(private project: Project, private shotIndex: number) {
    const R = this.root, shot = project.shots[shotIndex], loc = shot.location;
    // sky dome: 5-stop gradient by elevation
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(-0.15, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -2; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.stars = new THREE.Group();
    const sr = rng(88), starGeo = new THREE.SphereGeometry(1, 6, 6), starMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.3, 2.6), fog: false, depthWrite: false });
    for (let i = 0; i < 260; i++) {
      const th = sr() * Math.PI * 2, ph = Math.acos(2 * sr() - 1) * 0.6 + 0.12, d = 680;
      const sm = new THREE.Mesh(starGeo, starMat);
      sm.position.set(d * Math.sin(ph) * Math.cos(th), d * Math.cos(ph), d * Math.sin(ph) * Math.sin(th));
      sm.scale.setScalar(1.6 + sr() * 3.2); sm.layers.set(NOINK); this.stars.add(sm);
    }
    R.add(this.stars);
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(2.3, 2.2, 2.0), fog: false, depthWrite: false }));
    this.moon.layers.set(NOINK); this.moon.frustumCulled = false; R.add(this.moon);
    this.hemi = new THREE.HemisphereLight("#dcecff", "#b49a78", 0.5);
    this.sun = new THREE.DirectionalLight("#fff3e0", 3);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    for (let i = 0; i < 4; i++) { const p = new THREE.PointLight("#ffffff", 0, 6, 2); p.castShadow = false; this.points.push(p); R.add(p); }
    // the location
    const built = loc.build();
    R.add(built.root as THREE.Object3D);
    this.locUpdate = built.update;
    (built.root as THREE.Object3D).traverse((o) => { if (o.userData.cullN) this.culls.push(o); });
    for (const v of shot.vehicles ?? []) { const bv = buildVehicle(v.kind, v.color); bv.root.visible = false; R.add(bv.root); this.vehicles.set(v.id, bv); }
    // sun: fixed by the location, or camera-relative and frozen for the shot (lit from the side, never flat)
    const L = LIGHTS[shot.light ?? loc.light];
    if (loc.sunDir) this.sunDir = V(...loc.sunDir).normalize();
    else {
      let fx = 0, fz = 0;
      for (let f = shot.a; f < shot.b; f += 6) {
        const st = frameState(project, shotIndex, f), c = st.cam;
        const x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
        fx += x / n; fz += z / n;
      }
      const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
      const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
      const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
      this.sunDir = V(-hx * Math.cos(el), Math.sin(el), -hz * Math.cos(el)).normalize();
    }
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene): WorldOut {
    const p = this.project, shot = p.shots[this.shotIndex], loc = shot.location;
    const light: LightName = shot.light ?? loc.light, L = LIGHTS[light], K = LOOK[light];
    const st: FrameState = frameState(p, this.shotIndex, f), c = st.cam;
    // ---- camera ----
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.focus), camPos = cam.position.clone();
    const right = V().setFromMatrixColumn(cam.matrixWorld, 0);
    // ---- light rig ----
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const dist = camPos.distanceTo(focus), Rr = THREE.MathUtils.clamp(dist * 1.15 + 6, 10, 70);
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term;
    TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat; TONE.uPtK.value = L.ptK;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    CARD_AMB.uCharAmb.value = L.charAmb; CARD_AMB.uPtCardK.value = 0.55 * L.ptK;
    // ---- sky, stars, moon, fog ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(camPos); this.stars.position.copy(camPos);
    const night = loc.stars ?? (light === "night" || light === "night_street" || light === "space");
    this.stars.visible = night; this.moon.visible = night;
    if (night) { this.moon.position.copy(camPos).add(V(-0.35, 0.55, -1).normalize().multiplyScalar(600)); this.moon.scale.setScalar(36); }
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    // ---- vehicles: transform, wheels by distance, rotors, siren ----
    const t0 = f / p.fps;
    const vprac: PracticalSpec[] = [];
    for (const vf of st.vehicles) {
      const bv = this.vehicles.get(vf.id);
      if (!bv) continue;
      bv.root.visible = true;
      bv.root.position.set(vf.pose.pos[0], vf.pose.pos[1] + vf.pose.bob, vf.pose.pos[2]);
      bv.root.rotation.set(0, vf.pose.heading, 0, "YXZ");
      bv.body.rotation.x = vf.pose.bank;
      for (const w of bv.wheels) w.obj.rotation.z = -vf.pose.dist / w.r;
      for (const sp of bv.spin) sp.obj.rotation[sp.axis] = t0 * sp.rate;
      if (bv.turret) bv.turret.rotation.y = ((vf.spec.turret ?? 0) * Math.PI) / 180;
      if (bv.siren) { const on = Math.floor(t0 * 4) % 2; bv.siren[0].visible = vf.spec.siren !== false && on === 0; bv.siren[1].visible = vf.spec.siren !== false && on === 1; }
      if (vf.spec.siren) { const sp = VEHICLES[vf.spec.kind].points?.siren; if (sp) vprac.push({ pos: vehicleToWorld(vf.pose, sp), color: "#ff3030", intensity: 2.4, distance: 6, siren: 2 }); }
      if (vf.spec.lights) vprac.push({ pos: vehicleToWorld(vf.pose, [VEHICLES[vf.spec.kind].length / 2 + 0.6, 0.7, 0]), color: "#fff0c8", intensity: 1.8, distance: 6 });
    }
    // ---- practical lights: the 4 nearest to the focus ----
    const prac: PracticalSpec[] = [...(loc.practicals ?? []), ...(shot.practicals ?? []), ...vprac];
    prac.sort((a, b) => V(...a.pos).distanceTo(focus) - V(...b.pos).distanceTo(focus));
    const t = f / p.fps;
    this.points.forEach((pl, i) => {
      const s = prac[i];
      if (!s) { pl.intensity = 0; return; }
      pl.position.set(...s.pos); pl.distance = s.distance; pl.decay = 2;
      let k = 1;
      if (s.flicker) k = 1 - s.flicker * (0.5 + 0.5 * Math.sin(t * 23 + i * 1.7) * Math.sin(t * 9.3 + i)) * 0.6;
      if (s.siren) { const on = Math.floor(t * s.siren * 2) % 2; pl.color.set(on ? "#3a6cff" : "#ff3030"); } else pl.color.set(s.color);
      pl.intensity = s.intensity * k;
    });
    this.locUpdate?.(f, t, st.state);
    // dollhouse walls: hide every wall / ceiling the camera is behind
    for (const o of this.culls) {
      const n = o.userData.cullN as V3, pp = o.userData.cullP as V3;
      o.visible = (camPos.x - pp[0]) * n[0] + (camPos.y - pp[1]) * n[1] + (camPos.z - pp[2]) * n[2] > -0.02;
    }
    // ---- 2D shading direction for the cards (canvas angle the light comes from) ----
    const sx = this.sunDir.dot(right), sy = -this.sunDir.y;
    const light2D = Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    // ---- characters ----
    let ai = 0, fi = 0;
    const usedA: Actor[] = [], usedF: Fx[] = [];
    const fov = c.fov;
    for (const a of st.actors) {
      if (a.hidden) continue;
      const out = p.cast[a.who];
      if (!out) throw new Error(`cast "${a.who}" is not in project.cast`);
      const base = V(a.pos[0], a.pos[1] + a.lift, a.pos[2]);
      if (!this.frustum.intersectsSphere(this.sph.set(V(base.x, base.y + 1, base.z), 3.5))) continue;
      const yaw = faceYaw(base, camPos), sc2 = a.scale;
      const toCard = (w?: V3): P2 | undefined => (w ? worldToCard(base, yaw, sc2, V(...w), camPos) : undefined);
      const idle = a.pose.gait === undefined || a.pose.gait === "stand";
      const f2 = Math.floor(f / 2) * 2;
      const phase = idle ? q(f2 / p.fps * 0.9 + a.seed * 0.13, 20) : (a.pose as { phase?: number }).phase ?? q(f2 / p.fps * 1.6, 20);
      const hold = a.hold ? { ...a.hold, target: a.targetW ? toCard(a.targetW) : a.hold.target,
        from: a.fromW ? { pos: toCard(a.fromW.pos)!, angle: a.fromW.angle, k: a.fromW.k } : a.hold.from } : null;
      const reach = a.reachW ? { F: toCard(a.reachW.F), B: toCard(a.reachW.B), kF: a.reachW.kF, kB: a.reachW.kB } : undefined;
      const live = idle && !a.pose.lying ? q(2.4 * Math.sin(f2 / p.fps * 2.4 + a.seed * 1.7), 30) : 0;
      const pose = { ...a.pose, headTilt: (a.pose.headTilt ?? 0) + live };
      const sin = { outfit: out, pose, facing: a.facing, seed: a.seed, phase, hold, extra: a.extra, reach };
      const J = solve(sin);
      const face = { expr: a.expr ?? a.pose.expr ?? "neutral", blink: lidAt(f, a.seed * 13 + ai), light: light2D, soot: a.soot };
      const d = camPos.distanceTo(V(base.x, base.y + 1.1 * sc2, base.z));
      let k = THREE.MathUtils.clamp((6.2 / d) * (34 / fov) * (sc2 / 0.84), 0.45, 3.2);
      k = [0.45, 0.7, 1.0, 1.4, 1.9, 2.5, 3.2].reduce((bst, v) => (Math.abs(v - k) < Math.abs(bst - k) ? v : bst), 3.2);
      const [rx0, ry0, rx1, ry1] = J.rect;
      const maxDim = Math.max(rx1 - rx0, ry1 - ry0);
      if (maxDim * k > 4096) k = 4096 / maxDim;
      const w = Math.ceil(((rx1 - rx0) * k) / 32) * 32, h = Math.ceil(((ry1 - ry0) * k) / 32) * 32;
      const act = this.actor(ai++);
      act.r = this.pool.req(`${a.who}|${q(k, 10)}|${fkey(sin)}|${fkey(face)}`, w, h, (pen) => {
        pen.g.setTransform(k, 0, 0, k, -rx0 * k, -ry0 * k);
        drawRig(new Pen(pen.g), out, J, face);
      });
      act.setRect([rx0, ry0, rx0 + w / k, ry0 + h / k], J);
      act.mesh.visible = true;
      act.mesh.position.copy(base);
      act.mesh.rotation.set(0, yaw, a.roll * Math.PI / 180);
      act.mesh.scale.setScalar(sc2);
      act.mesh.castShadow = L.actorShadow;
      usedA.push(act);
      // contact + cast shadow blobs (lighter when seated / lifted)
      if (a.lift < 0.6) this.blobs(st, a.pos, sc2 * (a.pose.lying ? 1.8 : 1), L, (fi2) => { fi = fi2; }, fi, usedF, a.lift);
      fi = usedF.length;
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    // ---- world props (cards) ----
    for (const pr of st.props) {
      if (pr.hidden) continue;
      const def = PROPS[pr.prop];
      if (!def) throw new Error(`unknown prop "${pr.prop}"`);
      const [b0, b1, b2, b3] = def.bounds, m = PU * SU * pr.scale;
      const cw = (b2 - b0) * m, ch = (b3 - b1) * m;
      const pos = V(...pr.pos);
      if (!this.frustum.intersectsSphere(this.sph.set(pos, Math.max(cw, ch) + 0.5))) continue;
      const d = camPos.distanceTo(pos), k = THREE.MathUtils.clamp(1.2 / Math.max(0.3, d), 0.25, 1.6);
      const pw = Math.max(32, Math.ceil(((b2 - b0) * PU * k) / 16) * 16), ph = Math.max(32, Math.ceil(((b3 - b1) * PU * k) / 16) * 16);
      const e = this.fx(fi++);
      e.use("lit");
      e.r = this.pool.req(`prop|${pr.prop}|${q(k, 10)}|${fkey(pr.st)}`, pw, ph, (pen) => {
        const sx2 = pw / ((b2 - b0) * PU), sy2 = ph / ((b3 - b1) * PU);
        pen.g.setTransform(sx2, 0, 0, sy2, -b0 * PU * sx2, -b1 * PU * sy2);
        drawPropAt(new Pen(pen.g), pr.prop, 0, 0, 0, pr.st);
      });
      e.mesh.visible = true;
      if (pr.flat) {
        e.mesh.position.set(pos.x + ((b0 + b2) / 2) * m, pos.y + 0.006, pos.z + ((b1 + b3) / 2) * m);
        e.mesh.rotation.set(-Math.PI / 2, 0, -pr.angle * Math.PI / 180);
      } else {
        // standing card: the item's lowest point (bounds bottom) sits on pos, card faces the camera
        const yaw = faceYaw(pos, camPos), cx = ((b0 + b2) / 2) * m;
        e.mesh.position.set(pos.x + Math.cos(yaw) * cx, pos.y + ch / 2, pos.z - Math.sin(yaw) * cx);
        e.mesh.rotation.set(0, yaw, -pr.angle * Math.PI / 180);
      }
      e.mesh.scale.set(cw, ch, 1);
      usedF.push(e);
    }
    // ---- effect cards from actions ----
    for (const x of st.fx) {
      if (x.kind === "handInsert") { fi = this.handInsert(x, cam, camPos, fi, usedF); continue; }
      const dfx = FX_DRAW[x.kind];
      if (!dfx) continue;
      const pos = V(...x.pos);
      if (!this.frustum.intersectsSphere(this.sph.set(pos, x.size + 1))) continue;
      const e = this.fx(fi++);
      e.use(dfx.soft ? "soft" : "cut");
      e.r = this.pool.req(`fx|${x.kind}|${q(x.t, 30)}|${x.col ?? ""}`, dfx.w, dfx.h, (pen) => dfx.draw(pen, x.t, x.col));
      e.mesh.visible = true; e.mesh.position.copy(pos);
      if (x.flat) e.mesh.rotation.set(-Math.PI / 2, 0, x.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(x.rot ?? 0); }
      e.mesh.scale.set(x.size * (dfx.w / dfx.h), x.size, 1);
      usedF.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of usedA) a.bind();
    for (const e of usedF) e.bind();
    const flash = shot.flash ? Math.max(0, 1 - (f - shot.a) / 4) : 0;
    return { focus, cInf: c.dof, light, flash };
  }

  /** giant arm + ink-dot hand entering from the lower-right frame edge to the target (insert close-ups) */
  private handInsert(x: FrameState["fx"][number], cam: THREE.PerspectiveCamera, camPos: THREE.Vector3, fi: number, used: Fx[]) {
    // t runs over the whole insert window; tc = the contact moment inside it (hand arrives, then lifts the prop)
    const e = this.fx(fi++), t = x.t, tc = x.tc ?? 0.5, reach = smoothstep(Math.min(1, t / tc)), lift = Math.max(0, (t - tc) / (1 - tc));
    const held = t >= tc && !!x.prop;
    const col = x.col ?? "#3a6ea5", key = `hand|${col}|${x.prop ?? ""}|${held ? 1 : 0}`;
    e.use("cut");
    e.r = this.pool.req(key, 512, 512, (pen) => {
      const p2 = new Pen(pen.g);
      if (held) drawPropAt(p2, x.prop!, 250, 250, 0, {}, 330);
      p2.line([[540, 600], [340, 340], [250, 250]], col, 48);
      p2.dot(250, 250, 40);
    });
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const tgt = new THREE.Vector3(...x.pos).addScaledVector(up, 0.22 * lift * lift);
    const toCam = camPos.clone().sub(tgt).normalize();
    const s = x.size, off = (1 - reach) * 0.9 * s, k = 0.5 - 250 / 512;
    // the hand dot (canvas 250, 250 of 512) lands on the target; before contact the arm slides in from the lower right
    const c = tgt.clone().addScaledVector(right, k * s + off).addScaledVector(up, -k * s - off).addScaledVector(toCam, 0.05);
    e.mesh.visible = true; e.mesh.position.copy(c); e.mesh.quaternion.copy(cam.quaternion); e.mesh.scale.set(s, s, 1);
    used.push(e);
    return fi;
  }

  /** contact pool + cast-shadow tail under an actor (multiply blobs flat on the ground) */
  private blobs(_st: FrameState, at: V3, sc: number, L: (typeof LIGHTS)[LightName], _set: (n: number) => void, start: number, used: Fx[], lift: number) {
    let fi = start;
    const sd = this.sunDir, hl = Math.hypot(sd.x, sd.z) || 1, ox = -sd.x / hl, oz = -sd.z / hl, rot = Math.atan2(-ox, -oz);
    const el = Math.asin(Math.min(0.99, Math.max(0.15, sd.y)));
    const len = Math.min(2.2, Math.max(0.5, 1.4 / Math.tan(el))) * sc, h = len + 0.5 * sc, cc = 0.3 * h, fade = 1 - lift * 1.4;
    const tail = hexOf([0.4, 0.38, 0.56], fade), cont = hexOf(L.blob, fade);
    const add = (key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, z: number, w: number, hgt: number, y: number) => {
      const e = this.fx(fi++);
      e.use("blob");
      e.r = this.pool.req(key, cw, ch, draw);
      e.mesh.visible = true; e.mesh.position.set(x, y, z);
      e.mesh.rotation.set(-Math.PI / 2, 0, rot);
      e.mesh.scale.set(w, hgt, 1);
      used.push(e);
    };
    add(`blob|shadow|${tail}`, 128, 256, (p) => fxShadow(p, tail), at[0] + ox * cc, at[2] + oz * cc, 0.72 * sc, h, at[1] + 0.012);
    add(`blob|contact|${cont}`, 128, 128, (p) => fxContact(p, cont), at[0] + ox * 0.03 * sc, at[2] + oz * 0.03 * sc, 0.54 * sc, 0.42 * sc, at[1] + 0.016);
    void fxBurst; void fxSplash; void fxPuff; void fxStars; void fxRing; void fxGlow; void shotCam;
  }
}
