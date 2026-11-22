// KIT SCENE MODEL (pure): turns a project's data into what is on screen at a frame: where every actor stands, its
// pose / hold / facing, the world props, and the camera. The renderer (runtime.ts) draws it; the validator checks it.
import type { Project, ShotSpec, CastSpec, Place, V3, LocationDef, PropSpec, Anchor } from "./types";
import type { Pose, HoldIn, PropState } from "../rig/types";
import { poseOf } from "../rig/poses";
import { shotCam, activeKey, keyPose, CamPose, Subject } from "../camera/presets";
import { applyActions, ActionCtx } from "../actions/actions";
import { VEHICLES, vehiclePose, vehicleToWorld, VehiclePose, VehicleSpec } from "../vehicles/defs";

export const DEFAULT_SCALE = 0.84;
/** metres per HH (head height) for an adult card at scale 0.84 */
export const HH_M = 0.403;
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 997 + 1; };

export type ActorFrame = {
  id: string; who: string; spec: CastSpec;
  pos: V3; scale: number; seed: number;
  pose: Pose; hold: HoldIn | null; extra: HoldIn[];
  facing: -1 | 0 | 1;
  expr?: CastSpec["expr"]; soot: number;
  /** world-space hand targets set by actions (the renderer maps them onto the card) */
  reachW?: { F?: V3; B?: V3; kF?: number; kB?: number };
  /** strike target in world space (the renderer maps it onto the card) */
  targetW?: V3;
  /** prop placement blend from the world (pickUp): world point of the main grip + angle */
  fromW?: { pos: V3; angle: number; k: number };
  /** whole-card offsets from actions (knock back, jump), metres / degrees */
  lift: number; roll: number;
  /** hidden (boarded a vehicle, left the shot) */
  hidden?: boolean;
  /** world point the actor turns toward (set by actions: attacker faces the target) */
  lookAtW?: V3;
};
export type PropFrame = { id: string; prop: string; pos: V3; angle: number; flat: boolean; st: PropState; scale: number; hidden: boolean; spin?: number };
export type FxFrame = { kind: string; pos: V3; t: number; size: number; flat?: boolean; rot?: number; col?: string; prop?: string; /** contact moment 0..1 inside t (handInsert) */ tc?: number };
export type VehicleFrame = { id: string; spec: VehicleSpec; pose: VehiclePose };
export type FrameState = { shot: ShotSpec; f: number; actors: ActorFrame[]; props: PropFrame[]; vehicles: VehicleFrame[]; fx: FxFrame[]; cam: CamPose; sfx: { f: number; kind: string }[]; state: Record<string, number> };

export const shotIndexAt = (p: Project, f: number) => {
  for (let i = 0; i < p.shots.length; i++) if (f >= p.shots[i].a && f < p.shots[i].b) return i;
  return p.shots.length - 1;
};
export const totalFrames = (p: Project) => p.total ?? Math.max(...p.shots.map((s) => s.b));
/** which shots are visible at f (cross-fades) */
export const layersAt = (p: Project, f: number): { i: number; alpha: number }[] => {
  for (let i = 1; i < p.shots.length; i++) {
    const s = p.shots[i], x = s.xfade ?? 0;
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ i: i - 1, alpha: 1 }, { i, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ i: shotIndexAt(p, f), alpha: 1 }];
};

/** resolve a place: anchor name, prop id, actor id, [x, z] or [x, y, z] */
export const placeOf = (loc: LocationDef, p: Place | undefined, extra?: (name: string) => V3 | undefined): V3 => {
  if (p === undefined) return [0, 0, 0];
  if (typeof p === "string") {
    const a: Anchor | undefined = loc.anchors[p];
    if (a) return a.pos;
    const e = extra?.(p);
    if (e) return e;
    throw new Error(`unknown place "${p}" in location ${loc.name}. Anchors: ${Object.keys(loc.anchors).join(", ")}`);
  }
  return p.length === 2 ? [p[0], 0, p[1]] : p;
};

/** the pose of a cast entry (named or custom), with the seat height taken from a seat anchor */
export const castPose = (loc: LocationDef, c: CastSpec): Pose => {
  const base: Pose = typeof c.pose === "string" ? poseOf(c.pose) : c.pose ?? poseOf("stand");
  const anchor = typeof c.at === "string" ? loc.anchors[c.at] : undefined;
  if (base.seated && anchor?.seat !== undefined) {
    const s = (c.scale ?? DEFAULT_SCALE) / DEFAULT_SCALE;
    return { ...base, hip: anchor.seat / (HH_M * s) + 0.12 };
  }
  return base;
};

export const headHeight = (pose: Pose, scale: number) => {
  const s = scale / DEFAULT_SCALE;
  if (pose.lying) return 0.25 * s;
  if (pose.seated) return (pose.hip ?? 1) * HH_M * s + 0.62 * s;
  if (pose.stance === "kneel" || pose.stance === "crouch") return 0.85 * s;
  return 1.21 * s;
};

/** everything on screen for shot i at absolute frame f */
export const frameState = (p: Project, i: number, f: number): FrameState => {
  const shot = p.shots[i], loc = shot.location;
  const propSpecs = new Map<string, PropSpec>((shot.props ?? []).map((x) => [x.id, x]));
  const propPos = (ps: PropSpec): V3 => {
    const a = typeof ps.at === "string" ? loc.anchors[ps.at] : undefined;
    const b = placeOf(loc, ps.at);
    return [b[0], b[1] + (ps.y ?? a?.top ?? 0), b[2]];
  };
  // ---- vehicles (pure motion along their moves) ----
  const vehicles: VehicleFrame[] = (shot.vehicles ?? []).map((v) => ({ id: v.id, spec: v, pose: vehiclePose(v, f, (pl) => placeOf(loc, pl), p.fps) }));
  // ---- actors (static placement), then actions move / pose them ----
  const actors: ActorFrame[] = (shot.cast ?? []).map((c) => {
    const scale = c.scale ?? DEFAULT_SCALE;
    const pos = placeOf(loc, c.at, (n) => (propSpecs.has(n) ? propPos(propSpecs.get(n)!) : undefined));
    return {
      id: c.id ?? c.who, who: c.who, spec: c, pos: [pos[0], pos[1], pos[2]], scale, seed: hash(c.id ?? c.who) % 7 + 1,
      pose: castPose(loc, c), hold: c.hold ?? null, extra: c.extra ?? [], facing: 0, expr: c.expr, soot: c.soot ?? 0, lift: 0, roll: 0,
    };
  });
  // riders: placed on their vehicle seat, seated pose, hands on the wheel / handlebar
  for (const a of actors) {
    const r = a.spec.ride;
    if (!r) continue;
    const vf = vehicles.find((v) => v.id === r.vehicle);
    if (!vf) throw new Error(`actor "${a.id}" rides "${r.vehicle}" which is not in shot.vehicles`);
    const def = VEHICLES[vf.spec.kind], st = def.seats[r.seat];
    if (!st) throw new Error(`vehicle ${vf.spec.kind} has no seat "${r.seat}" (seats: ${Object.keys(def.seats).join(", ")})`);
    const w = vehicleToWorld(vf.pose, st.pos), s2 = a.scale / DEFAULT_SCALE;
    if (st.pose === "stand") { a.pos = w; a.pose = { ...a.pose, view: a.pose.view ?? "front" }; }
    else {
      a.pos = [w[0], w[1] - 0.355 * s2, w[2]];
      a.pose = { ...a.pose, view: "side", seated: true, hip: 1.0, gait: "still" };
      if (st.hands) { const hw = vehicleToWorld(vf.pose, st.hands); a.reachW = { F: hw, B: [hw[0], hw[1] + 0.02, hw[2]], kF: 1, kB: 1 }; }
      else if (st.pose === "paddle") a.pose = { ...a.pose, armF: { to: [0.55, 0.35] }, armB: { to: [0.4, 0.45] } };
      else a.pose = { ...a.pose, armF: { to: [0.45, -0.05], from: "hip" } };
    }
  }
  const props: PropFrame[] = (shot.props ?? []).map((ps) => ({
    id: ps.id, prop: ps.prop, pos: propPos(ps), angle: ps.angle ?? 0, flat: ps.flat ?? false, st: ps.st ?? {}, scale: ps.scale ?? DEFAULT_SCALE, hidden: false,
  }));
  const fx: FxFrame[] = [], sfx: { f: number; kind: string }[] = [];
  const subjBase = (name: string): Subject | null => {
    const a = actors.find((x) => x.id === name);
    if (a) return { base: [a.pos[0], a.pos[1] + a.lift, a.pos[2]], head: headHeight(a.pose, a.scale) };
    const vh = vehicles.find((x) => x.id === name);
    if (vh) { const d = VEHICLES[vh.spec.kind]; return { base: [vh.pose.pos[0], vh.pose.pos[1], vh.pose.pos[2]], head: d.height * 0.6, point: [vh.pose.pos[0], vh.pose.pos[1] + d.height * 0.5, vh.pose.pos[2]] }; }
    const pr = props.find((x) => x.id === name);
    if (pr) return { base: [pr.pos[0], pr.pos[1], pr.pos[2]], head: 0, point: [pr.pos[0], pr.pos[1] + 0.06, pr.pos[2]] };
    return null;
  };
  const state: Record<string, number> = {};
  const ctx: ActionCtx = { project: p, shot, loc, f, actors, props, fx, sfx, vehicles, state, place: (pl) => {
    if (typeof pl === "string") {
      const s = subjBase(pl);
      if (s) return s.point ?? [s.base[0], s.base[1] + s.head * 0.8, s.base[2]];
      // surfaces (table / desk / anvil tops): actions aim at the top, not the floor under it
      const an = loc.anchors[pl];
      if (an?.top !== undefined) return [an.pos[0], an.pos[1] + an.top, an.pos[2]];
    }
    return placeOf(loc, pl);
  } };
  applyActions(ctx);
  // ---- camera ----
  const subj = (t: string | V3 | [number, number] | undefined): Subject => {
    if (t === undefined) {
      const a = actors[0];
      return a ? { base: a.pos, head: headHeight(a.pose, a.scale) } : { base: [0, 0, 0], head: 1 };
    }
    if (typeof t === "string") {
      const s = subjBase(t);
      if (s) return s;
      const an = loc.anchors[t];
      if (an) return { base: an.pos, head: 1.1, point: an.top !== undefined ? [an.pos[0], an.pos[1] + an.top, an.pos[2]] : undefined };
      throw new Error(`camera subject "${t}" is not an actor, prop or anchor`);
    }
    const v: V3 = t.length === 2 ? [t[0], 0, t[1]] : t;
    return { base: v, head: 1.1, point: t.length === 3 ? v : undefined };
  };
  const aspect = (p.width ?? 1080) / (p.height ?? 1920);
  const cam = shotCam(shot, f, (t) => subj(t), loc.front ?? 0, aspect);
  // ---- facing: decided once per camera key (no flicker during a glide) ----
  const k = activeKey(shot, f);
  const kc = keyPose(k, k.f, (t) => subj(t), loc.front ?? 0, aspect);
  const fx3 = kc.look[0] - kc.pos[0], fz3 = kc.look[2] - kc.pos[2], fl = Math.hypot(fx3, fz3) || 1;
  const right: [number, number] = [-fz3 / fl, fx3 / fl];
  // a seated card stands in the seat's centre plane, so the seat (log, chair, bench) would cut through the legs:
  // move it a little toward the camera (the thighs come forward over the seat edge)
  for (const a of actors) {
    if (!a.pose.seated || a.spec.ride) continue;
    const dx = cam.pos[0] - a.pos[0], dz = cam.pos[2] - a.pos[2], L = Math.hypot(dx, dz) || 1;
    a.pos = [a.pos[0] + (dx / L) * 0.17, a.pos[1], a.pos[2] + (dz / L) * 0.17];
  }
  for (const a of actors) {
    const c = a.spec;
    if (a.facing !== 0) continue;
    let fc: -1 | 0 | 1 = 0;
    if (c.ride) {
      const vf = vehicles.find((v) => v.id === c.ride!.vehicle)!;
      const fx2 = Math.cos(vf.pose.heading), fz2 = -Math.sin(vf.pose.heading);
      a.facing = fx2 * right[0] + fz2 * right[1] >= 0 ? 1 : -1;
      continue;
    }
    if (c.facing === "left") fc = -1;
    else if (c.facing === "right") fc = 1;
    else if (a.lookAtW || c.lookAt !== undefined) {
      const t = a.lookAtW ?? ctx.place(c.lookAt!), dx = (t[0] - a.pos[0]) * right[0] + (t[2] - a.pos[2]) * right[1];
      fc = Math.abs(dx) < 0.12 ? 0 : dx > 0 ? 1 : -1;
    }
    if (c.facing === "away") a.pose = { ...a.pose, view: "back" };
    if (fc === 0 && (a.pose.view === "side" || a.hold && sideHold(a.hold))) fc = 1;
    a.facing = fc;
  }
  return { shot, f, actors, props, vehicles, fx, cam, sfx, state };
};
const sideHold = (_h: HoldIn) => false;
