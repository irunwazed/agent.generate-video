// KIT ACTIONS (pure): timed things a character does — pick up, throw, fire, slash, get hit, climb, sit down...
// An action is data in a shot: { who: "budi", do: "pickUp", prop: "hp", at: 288 }  (`at` = CONTACT frame = word onset:
// the grab, the shot, the hit, the release land exactly there). Timing rules (motion.md): anticipation ~3-8 f before
// the contact, a 1-2 f hit, settle 2-6 f after. Attacks with a `target` actor schedule the victim's `hit` reaction
// automatically (bullet +2 f, arrow by distance, blade / punch on the contact frame). Cartoon-safe: no blood.
import type { Project, ShotSpec, LocationDef, Place, V3, ActionSpec } from "../scene/types";
import type { ActorFrame, PropFrame, FxFrame, VehicleFrame } from "../scene/model";
import { PROPS } from "../props/defs";
import { POSES } from "../rig/poses";
import { VEHICLES, vehicleToWorld } from "../vehicles/defs";

export type ActionCtx = {
  project: Project; shot: ShotSpec; loc: LocationDef; f: number;
  actors: ActorFrame[]; props: PropFrame[]; fx: FxFrame[]; sfx: { f: number; kind: string }[];
  vehicles?: VehicleFrame[];
  /** shared state for location parts (dome lifted, button pressed): read by the location's update */
  state?: Record<string, number>;
  /** world point of an actor (chest) / prop / anchor / place */
  place: (p: Place) => V3;
};
export type ActionDef = {
  note: string;
  /** frames the action starts before / ends after the contact frame (validator, previews) */
  pre: number; post: number;
  /** what the action needs: a held prop, a world prop id, a target */
  needs?: ("hold" | "prop" | "target" | "to")[];
  run: (a: ActionSpec, ctx: ActionCtx, actor: ActorFrame) => void;
};
export const ACTIONS: Record<string, ActionDef> = {};
const def = (name: string, d: ActionDef) => { ACTIONS[name] = d; };

// ---------------- helpers ----------------
const c01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const u = c01(x); return u * u * (3 - 2 * u); };
const easeOut = (x: number) => 1 - (1 - c01(x)) ** 3;
const span = (f: number, a: number, b: number) => c01((f - a) / Math.max(1, b - a));
/** effect time: 0..1 inside [a, b), -1 outside (so an effect is only drawn while it plays) */
const win = (f: number, a: number, b: number) => (f >= a && f < b ? (f - a) / Math.max(1, b - a) : -1);
const sc = (a: ActorFrame) => a.scale / 0.84;
const chest = (a: ActorFrame): V3 => [a.pos[0], a.pos[1] + 0.95 * sc(a) + a.lift, a.pos[2]];
const headW = (a: ActorFrame): V3 => [a.pos[0], a.pos[1] + 1.3 * sc(a) + a.lift, a.pos[2]];
const dirXZ = (from: V3, to: V3): [number, number] => { const dx = to[0] - from[0], dz = to[2] - from[2], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const fx = (ctx: ActionCtx, kind: string, pos: V3, t: number, size: number, extra: Partial<FxFrame> = {}) => { if (t >= 0 && t <= 1) ctx.fx.push({ kind, pos, t, size, ...extra }); };
const sfx = (ctx: ActionCtx, f: number, kind: string) => { ctx.sfx.push({ f: Math.round(f), kind }); };
const actorOf = (ctx: ActionCtx, id: unknown) => (typeof id === "string" ? ctx.actors.find((x) => x.id === id) : undefined);
const targetPoint = (ctx: ActionCtx, t: ActionSpec["target"]): V3 | null => {
  if (t === undefined) return null;
  const ac = actorOf(ctx, t);
  return ac ? chest(ac) : ctx.place(t as Place);
};
/** the muzzle / hand point of an actor, approximately (the exact one lives on the card) */
const handFront = (a: ActorFrame, toward: V3 | null, h = 0.98, fwd = 0.7): V3 => {
  const d = toward ? dirXZ(a.pos, toward) : [1, 0];
  return [a.pos[0] + d[0] * fwd * sc(a), a.pos[1] + h * sc(a) + a.lift, a.pos[2] + d[1] * fwd * sc(a)];
};
const heldProp = (a: ActorFrame) => a.hold?.prop;
const isBomb = (name: string) => name === "bom" || name === "dinamit" || name === "granat";
/** world prop by id (from shot.props), or null */
const worldProp = (ctx: ActionCtx, id: string | undefined) => (id ? ctx.props.find((p) => p.id === id) ?? null : null);
const ensureWorldProp = (ctx: ActionCtx, id: string, prop: string): PropFrame => {
  let p = worldProp(ctx, id);
  if (!p) { p = { id, prop, pos: [0, 0, 0], angle: 0, flat: false, st: {}, scale: 0.84, hidden: true }; ctx.props.push(p); }
  return p;
};
/** set the style of the held prop (keeps the prop) */
const setStyle = (a: ActorFrame, style: string, extra: Partial<NonNullable<ActorFrame["hold"]>> = {}) => {
  if (!a.hold) return;
  a.hold = { ...a.hold, style, ...extra };
};
/** blend between two styles of the held prop over [f0, f1] */
const swing = (a: ActorFrame, f: number, from: string, to: string, f0: number, f1: number) => {
  if (!a.hold) return;
  const k = span(f, f0, f1);
  a.hold = { ...a.hold, style: to, blendFrom: { style: from, k } };
};
const look = (a: ActorFrame, w: V3 | null) => { if (w) a.lookAtW = w; };

// =====================================================================================================================
// OBJECTS
// =====================================================================================================================
def("pickUp", { note: "reach for a world prop (shot.props id) and take it: { do: 'pickUp', prop: 'hp', style?: 'hold' }", pre: 10, post: 8, needs: ["prop"], run: (a, ctx, act) => {
  const p = worldProp(ctx, a.prop), f = ctx.f;
  if (!p) return;
  const pw: V3 = [p.pos[0], p.pos[1] + 0.04, p.pos[2]];
  look(act, pw);
  if (a.insert && f >= a.at - 10 && f < a.at) fx(ctx, "handInsert", pw, win(f, a.at - 10, a.at + 20), 0.55, { col: ctx.project.cast[act.who]?.jacket, prop: p.prop, tc: 10 / 30 });
  if (f < a.at - 10) return;
  if (f < a.at) {
    const k = smooth(span(f, a.at - 10, a.at));
    act.reachW = { F: pw, kF: k };
    act.pose = { ...act.pose, lean: (act.pose.lean ?? 0) + 6 * k, headTilt: (act.pose.headTilt ?? 0) + 6 * k };
    return;
  }
  const def2 = PROPS[p.prop];
  p.hidden = true;
  act.hold = { prop: p.prop, style: (a.style as string) ?? def2.defStyle, st: p.st };
  act.fromW = f < a.at + 7 ? { pos: pw, angle: p.angle, k: easeOut(span(f, a.at, a.at + 7)) } : undefined;
  if (a.insert) fx(ctx, "handInsert", pw, win(f, a.at - 10, a.at + 20), 0.55, { col: ctx.project.cast[act.who]?.jacket, prop: p.prop, tc: 10 / 30 });
  sfx(ctx, a.at, "grab");
} });
def("putDown", { note: "put the held prop on a place: { do: 'putDown', prop: 'hp', to: 'desk.top' }", pre: 8, post: 6, needs: ["hold", "to"], run: (a, ctx, act) => {
  const f = ctx.f, name = (a.prop as string) ?? heldProp(act);
  if (!name || !act.hold) return;
  const tw = ctx.place(a.to as Place);
  look(act, tw);
  if (f < a.at - 8) return;
  if (f < a.at) { act.fromW = { pos: [tw[0], tw[1] + 0.04, tw[2]], angle: 0, k: 1 - smooth(span(f, a.at - 8, a.at)) }; act.pose = { ...act.pose, lean: (act.pose.lean ?? 0) + 6 }; return; }
  const p = ensureWorldProp(ctx, a.prop ?? name, act.hold.prop);
  p.hidden = false; p.pos = tw; p.flat = PROPS[act.hold.prop]?.rest === "flat";
  act.hold = null;
  if (f < a.at + 6) act.reachW = { F: [tw[0], tw[1] + 0.05, tw[2]], kF: 1 - span(f, a.at, a.at + 6) };
  sfx(ctx, a.at, "place");
} });
def("handOver", { note: "give the held prop to another actor: { do: 'handOver', to: 'siti' }", pre: 10, post: 8, needs: ["hold", "to"], run: (a, ctx, act) => {
  const rec = actorOf(ctx, a.to), f = ctx.f;
  if (!rec || !act.hold && f < a.at) return;
  const mid = lerp3(chest(act), chest(rec), 0.5);
  look(act, chest(rec)); look(rec, chest(act));
  if (f < a.at - 10) return;
  if (f < a.at) { const k = smooth(span(f, a.at - 10, a.at)); setStyle(act, "give"); rec.reachW = { F: mid, kF: k }; return; }
  const h = act.hold ?? rec.hold;
  if (h) { rec.hold = { prop: h.prop, style: (a.style as string) ?? "hold", st: h.st }; if (f < a.at + 8) rec.fromW = { pos: mid, angle: 0, k: easeOut(span(f, a.at, a.at + 8)) }; }
  act.hold = null;
  sfx(ctx, a.at, "grab");
} });
/** projectile flight (thrown prop, arrow, shell) */
const flight = (ctx: ActionCtx, name: string, from: V3, to: V3, f0: number, frames: number, arc: number, spin: boolean) => {
  const f = ctx.f;
  if (f < f0 || f > f0 + frames) return false;
  const t = span(f, f0, f0 + frames), p = lerp3(from, to, t);
  p[1] += arc * 4 * t * (1 - t);
  const pr = ensureWorldProp(ctx, "__flying_" + name + f0, name);
  pr.hidden = false; pr.pos = p; pr.flat = false; pr.angle = spin ? (f - f0) * 47 : Math.atan2(-(to[1] - from[1]) - arc * 4 * (1 - 2 * t), Math.hypot(to[0] - from[0], to[2] - from[2])) * -57.3;
  return true;
};
const landing = (ctx: ActionCtx, at: V3, f: number, prop: string, attacker: string) => {
  const water = at[1] < -0.3 || /laut|pantai|kapal/.test(ctx.loc.name) && at[2] < -4.5;
  if (isBomb(prop)) { explode(ctx, at, f, attacker); return; }
  if (water) { fx(ctx, "splash", [at[0], Math.min(at[1], -0.05) + 0.6, at[2]], win(ctx.f, f, f + 18), 1.4); fx(ctx, "ring", [at[0], Math.min(at[1], 0) + 0.02, at[2]], win(ctx.f, f, f + 30), 1.8, { flat: true }); sfx(ctx, f, "splash"); }
  else { fx(ctx, "dust", [at[0], at[1] + 0.15, at[2]], win(ctx.f, f, f + 14), 0.6); sfx(ctx, f, "thud"); }
};
/** explosion at a point: fireball, smoke, debris, shake; blast hits actors within 2.6 m */
export const explode = (ctx: ActionCtx, at: V3, f: number, attacker = "") => {
  fx(ctx, "explosion", [at[0], at[1] + 1.0, at[2]], win(ctx.f, f, f + 26), 3.2);
  fx(ctx, "dust", [at[0], at[1] + 0.3, at[2]], win(ctx.f, f + 4, f + 30), 2.6);
  sfx(ctx, f, "explosion");
  (ctx.shot.kicks ??= []);
  if (!ctx.shot.kicks.some(([k]) => k === f)) ctx.shot.kicks.push([f, 2.2]);
  for (const v of ctx.actors) {
    if (v.id === attacker) continue;
    const d = Math.hypot(v.pos[0] - at[0], v.pos[2] - at[2]);
    if (d < 2.6) applyHit(ctx, v, { who: v.id, do: "hit", at: f + 1, kind: "blast", from: at as Place, fall: true });
  }
};
def("throw", { note: "throw the held prop (or a world prop id) at a target: { do: 'throw', target: [x, z] | 'sea_left' | 'actorId' }. Bombs explode on landing.", pre: 10, post: 8, needs: ["target"], run: (a, ctx, act) => {
  const f = ctx.f, tgt = targetPoint(ctx, a.target);
  const name = act.hold?.prop ?? (worldProp(ctx, a.prop)?.prop);
  if (!tgt || !name) return;
  look(act, tgt);
  const from = handFront(act, tgt, 1.3, 0.3), dist = Math.hypot(tgt[0] - from[0], tgt[2] - from[2]);
  const frames = Math.max(6, Math.round((dist / 8) * ctx.project.fps)), arc = Math.max(0.4, dist * 0.22);
  if (isBomb(name) && act.hold) act.hold = { ...act.hold, st: { ...(act.hold.st ?? {}), lit: 1, wave: f / 6 } };
  if (f < a.at - 10) return;
  if (f < a.at) {
    const k = smooth(span(f, a.at - 10, a.at - 2));
    if (act.hold && PROPS[name].styles.windup) setStyle(act, "windup");
    else act.pose = { ...act.pose, ...POSES.throw_windup, armF: { to: [-0.62 * k + 0.3 * (1 - k), -0.42] } };
    act.pose = { ...act.pose, lean: -8 * k };
    return;
  }
  act.hold = null;
  if (f < a.at + 8) act.pose = { ...act.pose, ...POSES.throw_release, lean: 14 * (1 - span(f, a.at, a.at + 8)) };
  sfx(ctx, a.at, "whoosh");
  const flying = flight(ctx, name, from, tgt, a.at, frames, arc, true);
  if (!flying && f > a.at + frames) landing(ctx, tgt, a.at + frames, name, act.id);
  else if (f === a.at + frames) landing(ctx, tgt, a.at + frames, name, act.id);
} });
def("lightFuse", { note: "light the fuse of a held bomb / dynamite (sparks until thrown)", pre: 4, post: 0, needs: ["hold"], run: (a, ctx, act) => {
  if (!act.hold || ctx.f < a.at) return;
  act.hold = { ...act.hold, st: { ...(act.hold.st ?? {}), lit: 1, wave: ctx.f / 6 } };
  sfx(ctx, a.at, "fuse");
} });
def("explode", { note: "an explosion at a place (shell hit, hidden bomb): { do: 'explode', who: any actor, target: [x, z] }", pre: 0, post: 26, needs: ["target"], run: (a, ctx) => {
  const t = targetPoint(ctx, a.target);
  if (t && ctx.f >= a.at && ctx.f <= a.at + 40) explode(ctx, [t[0], 0, t[2]], a.at);
  else if (t) sfx(ctx, a.at, "explosion");
} });

// =====================================================================================================================
// WEAPONS
// =====================================================================================================================
const GUNS: Record<string, { aim: string; fire: string; interval: number; sound: string }> = {
  rifle: { aim: "aim", fire: "fire", interval: 14, sound: "rifle" }, pistol: { aim: "aim", fire: "fire", interval: 8, sound: "pistol" },
  senapan_mesin: { aim: "hip_fire", fire: "fire", interval: 3, sound: "mg" },
};
def("aimFire", { note: "aim and fire the held gun (rifle / pistol / senapan_mesin): { do: 'aimFire', target?: 'enemy', times?: 1 }. Contact = first shot.", pre: 8, post: 10, needs: ["hold"], run: (a, ctx, act) => {
  const name = heldProp(act), g = name ? GUNS[name] : undefined, f = ctx.f;
  if (!g) return;
  const tgt = targetPoint(ctx, a.target);
  look(act, tgt ?? null);
  const times = (a.times as number) ?? (name === "senapan_mesin" ? 8 : 1), iv = (a.interval as number) ?? g.interval;
  if (f < a.at - 8) return;
  setStyle(act, g.aim);
  for (let i = 0; i < times; i++) {
    const fs = a.at + i * iv;
    sfx(ctx, fs, g.sound);
    if (f >= fs && f < fs + 8) {
      const k = 1 - span(f, fs, fs + 6), flash = f < fs + 2 ? 1 : 0;
      act.hold = { ...act.hold!, style: g.fire, st: { ...(act.hold!.st ?? {}), flash }, nudge: { pos: [-0.06 * k, -0.02 * k], angle: -5 * k } };
      const m = handFront(act, tgt, 1.0, 1.0);
      fx(ctx, "smoke", [m[0], m[1] + 0.05, m[2]], win(f, fs + 1, fs + 18), 0.45);
      if (tgt && f <= fs + 2) fx(ctx, "glow", lerp3(m, tgt, span(f, fs, fs + 2)), 0.5, 0.18, { col: "255,236,160" });
    }
  }
} });
def("reload", { note: "work the rifle bolt / reload (short, between shots)", pre: 0, post: 14, needs: ["hold"], run: (a, ctx, act) => {
  const f = ctx.f;
  if (!act.hold || f < a.at || f > a.at + 14) return;
  setStyle(act, "port");
  act.reachW = { B: chest(act), kB: Math.sin(span(f, a.at, a.at + 14) * Math.PI) * 0.5 };
  sfx(ctx, a.at, "reload");
} });
/** melee: from wind-up style to strike style, contact on `at`, hit the target */
const melee = (from: string, to: string, sound: string, kind: string, preF = 8) => (a: ActionSpec, ctx: ActionCtx, act: ActorFrame) => {
  const f = ctx.f, tgt = targetPoint(ctx, a.target);
  look(act, tgt);
  if (!act.hold || f < a.at - preF) return;
  if (f < a.at - 2) { swing(act, f, (a.style as string) ?? act.hold.style, from, a.at - preF, a.at - 4); }
  else if (f < a.at + 10) {
    swing(act, f, from, to, a.at - 2, a.at);
    if (tgt && (kind === "blunt" || kind === "chop") && !actorOf(ctx, a.target)) act.targetW = tgt;
  }
  else setStyle(act, to);
  sfx(ctx, a.at, sound);
  if (tgt && !actorOf(ctx, a.target)) {
    fx(ctx, (a.kind as string) === "sparks" || /anvil|paron/.test(String(a.target)) ? "sparks" : "impact", tgt, win(f, a.at, a.at + 8), 0.45);
  }
};
def("slash", { note: "sword / katana cut (raise -> slash), hits a target actor", pre: 8, post: 10, needs: ["hold"], run: melee("raise", "slash", "slash", "blade") });
def("chop", { note: "parang / axe chop (raise -> chop); target actor or a point (wood, rail)", pre: 8, post: 10, needs: ["hold"], run: melee("raise", "chop", "chop", "chop") });
def("strike", { note: "hammer / club / baton / stick hit (raise -> strike); target an actor or a point (anvil: sparks)", pre: 8, post: 10, needs: ["hold"], run: melee("raise", "strike", "hit", "blunt") });
def("thrust", { note: "spear / bambu runcing stab (charge -> thrust), lunge", pre: 8, post: 8, needs: ["hold"], run: (a, ctx, act) => {
  const f = ctx.f, tgt = targetPoint(ctx, a.target);
  look(act, tgt);
  if (!act.hold || f < a.at - 8) return;
  if (f < a.at - 1) { act.hold = { ...act.hold, style: "charge", nudge: { pos: [-0.1 * smooth(span(f, a.at - 8, a.at - 3)), 0] } }; }
  else if (f < a.at + 8) swing(act, f, "charge", "thrust", a.at - 1, a.at);
  sfx(ctx, a.at, "stab");
} });
def("punch", { note: "fist punch (jab / hook) at a target actor", pre: 6, post: 8, needs: ["target"], run: (a, ctx, act) => {
  const f = ctx.f, tgt = targetPoint(ctx, a.target);
  look(act, tgt);
  if (!tgt || f < a.at - 6 || f > a.at + 8) return;
  act.pose = { ...act.pose, view: "side", stance: "wide", lean: f < a.at ? -6 : 12, expr: "angry" };
  if (f < a.at - 1) act.reachW = { F: [act.pos[0], act.pos[1] + 1.05 * sc(act), act.pos[2]], kF: 0.6 };
  else act.reachW = { F: [tgt[0], tgt[1] + 0.25, tgt[2]], kF: 1 - span(f, a.at + 3, a.at + 8) };
  sfx(ctx, a.at, "punch");
} });
def("kick", { note: "kick at a target actor", pre: 6, post: 8, needs: ["target"], run: (a, ctx, act) => {
  const f = ctx.f, tgt = targetPoint(ctx, a.target);
  look(act, tgt);
  if (f < a.at - 6 || f > a.at + 8) return;
  const k = f < a.at ? -0.3 : 1 - span(f, a.at + 2, a.at + 8);
  act.pose = { ...act.pose, view: "side", lean: -10 * k, legF: { to: [0.95 * k + 0.1, 0.9 - 0.8 * Math.max(0, k)] }, expr: "angry" };
  sfx(ctx, a.at, "kick");
} });
def("drawRelease", { note: "bow / slingshot: nock, draw, release at the contact; the arrow flies to the target and sticks", pre: 16, post: 10, needs: ["hold"], run: (a, ctx, act) => {
  const f = ctx.f, name = heldProp(act), tgt = targetPoint(ctx, a.target);
  look(act, tgt);
  if (!act.hold || !name || f < a.at - 16) return;
  if (f < a.at) {
    const k = smooth(span(f, a.at - 16, a.at - 6));
    act.hold = { ...act.hold, style: "draw", st: { ...(act.hold.st ?? {}), draw: 0.1 + 0.9 * k, arrow: name === "busur" ? 1 : 0 }, blendFrom: { style: name === "busur" ? "nock" : "rest", k } };
    return;
  }
  setStyle(act, "release");
  sfx(ctx, a.at, name === "busur" ? "bow" : "sling");
  if (tgt) {
    const from = handFront(act, tgt, 1.15, 0.8), dist = Math.hypot(tgt[0] - from[0], tgt[2] - from[2]);
    const frames = Math.max(3, Math.round((dist / 22) * ctx.project.fps));
    flight(ctx, name === "busur" ? "panah" : "batu_bata", from, tgt, a.at, frames, dist * 0.04, false);
  }
} });

// =====================================================================================================================
// TOOLS & USING THINGS
// =====================================================================================================================
/** repeat two styles of the held tool `times` (period frames); a contact event on every cycle */
const cycle = (styleA: string, styleB: string, sound: string, fxKind: string | null, period = 10) => (a: ActionSpec, ctx: ActionCtx, act: ActorFrame) => {
  const f = ctx.f, n = (a.times as number) ?? 3, tgt = targetPoint(ctx, a.target);
  look(act, tgt);
  for (let i = 0; i < n; i++) sfx(ctx, a.at + i * period, sound);
  if (!act.hold || f < a.at - period / 2 || f > a.at + n * period) return;
  const ph = ((f - (a.at - period / 2)) % period) / period;
  const k = ph < 0.5 ? smooth(ph * 2) : 1 - smooth((ph - 0.5) * 2);
  act.hold = { ...act.hold, style: styleB, blendFrom: { style: styleA, k } };
  if (tgt && !actorOf(ctx, a.target) && (styleB === "strike" || styleB === "dig") && k > 0.8) act.targetW = tgt;
  if (fxKind && tgt) for (let i = 0; i < n; i++) fx(ctx, fxKind, tgt, win(f, a.at + i * period, a.at + i * period + 8), 0.4);
};
def("saw", { note: "saw back and forth (gergaji) `times`", pre: 5, post: 30, needs: ["hold"], run: cycle("saw", "saw_b", "saw", "dust", 8) });
def("dig", { note: "dig with a hoe / shovel `times` (target = the ground point)", pre: 5, post: 30, needs: ["hold"], run: cycle("raise", "dig", "dig", "dust", 14) });
def("hammer", { note: "hammer on a target `times` (anvil -> sparks)", pre: 5, post: 30, needs: ["hold"], run: cycle("raise", "strike", "clang", "sparks", 12) });
def("drill", { note: "drill (bor) with jitter and dust", pre: 2, post: 30, needs: ["hold"], run: (a, ctx, act) => {
  const f = ctx.f, d = (a.dur as number) ?? 30, tgt = targetPoint(ctx, a.target);
  look(act, tgt);
  sfx(ctx, a.at, "drill");
  if (!act.hold || f < a.at || f > a.at + d) return;
  act.hold = { ...act.hold, style: "drill", nudge: { pos: [0.006 * Math.sin(f * 2.7), 0.004 * Math.cos(f * 3.1)] } };
  if (tgt) fx(ctx, "dust", tgt, ((f - a.at) % 10) / 10, 0.3);
} });
def("sweep", { note: "sweep with a broom", pre: 2, post: 30, needs: ["hold"], run: cycle("hold", "sweep", "sweep", "dust", 12) });
/** switch to a "use" style for a duration (drink, read, call, look at the watch, pour, spray) */
const useFor = (style: string, sound: string | null, flash = false) => (a: ActionSpec, ctx: ActionCtx, act: ActorFrame) => {
  const f = ctx.f, d = (a.dur as number) ?? 30;
  if (sound) sfx(ctx, a.at, sound);
  if (!act.hold || f < a.at - 4 || f > a.at + d) return;
  act.hold = { ...act.hold, style, st: { ...(act.hold.st ?? {}), ...(flash ? { flash: f >= a.at ? 1 : 0, wave: f / 8 } : {}) } };
};
def("drink", { note: "cup / bottle to the mouth for `dur` frames", pre: 4, post: 30, needs: ["hold"], run: useFor("mouth", "sip") });
def("eat", { note: "food to the mouth", pre: 4, post: 30, needs: ["hold"], run: useFor("mouth", "eat") });
def("read", { note: "look at a held paper / letter / phone / map", pre: 4, post: 30, needs: ["hold"], run: useFor("look", "paper") });
def("phoneCall", { note: "phone at the ear", pre: 4, post: 60, needs: ["hold"], run: useFor("ear", "ring") });
def("checkTime", { note: "look at a watch / clock", pre: 4, post: 24, needs: ["hold"], run: useFor("look", "tick") });
def("showHigh", { note: "hold up a sketch / sign / trophy high (an idea!)", pre: 6, post: 30, needs: ["hold"], run: useFor("high", "pop") });
def("pour", { note: "pour from a jerrycan (fuel / water)", pre: 6, post: 40, needs: ["hold"], run: useFor("pour", "pour", true) });
def("spray", { note: "spray with a sprayer (insects, paint)", pre: 4, post: 40, needs: ["hold"], run: useFor("spray", "spray", true) });

// =====================================================================================================================
// WORLD INTERACTION & MOVEMENT
// =====================================================================================================================
def("pressButton", { note: "press a button / switch at a place (e.g. plaza 'button'); insert: true adds a giant hand close-up", pre: 8, post: 6, needs: ["target"], run: (a, ctx, act) => {
  const f = ctx.f, t = targetPoint(ctx, a.target);
  if (!t) return;
  look(act, t);
  if (f >= a.at) (ctx.state ??= {}).button = 1;
  if (f < a.at - 8 || f > a.at + 6) return;
  const k = f < a.at ? smooth(span(f, a.at - 8, a.at)) : 1 - span(f, a.at + 2, a.at + 6);
  act.reachW = { F: [t[0], t[1] + (f >= a.at && f < a.at + 3 ? -0.015 : 0.02), t[2]], kF: k };
  if (a.insert) fx(ctx, "handInsert", t, win(f, a.at - 8, a.at + 8), 0.5, { col: ctx.project.cast[act.who]?.jacket, tc: 0.5 });
  sfx(ctx, a.at, "click");
} });
def("liftLid", { note: "lift a glass dome / lid (plaza pedestal): the hand rises with it", pre: 8, post: 14, needs: ["target"], run: (a, ctx, act) => {
  const f = ctx.f, t = targetPoint(ctx, a.target);
  if (!t) return;
  look(act, t);
  const up = easeOut(span(f, a.at, a.at + 14));
  (ctx.state ??= {}).dome = f >= a.at ? up : 0;
  if (f < a.at - 8) return;
  const top: V3 = [t[0], t[1] + 0.42 + 0.5 * up, t[2]];
  act.reachW = { F: top, kF: f < a.at ? smooth(span(f, a.at - 8, a.at)) : 1 };
  sfx(ctx, a.at, "glass");
} });
def("walkTo", { note: "walk to a place, arriving at `at` (planted feet; side view when moving across the frame). dur = frames", pre: 30, post: 0, needs: ["to"], run: (a, ctx, act) => {
  const f = ctx.f, d = (a.dur as number) ?? 45, to = ctx.place(a.to as Place), from: V3 = [...act.pos] as V3;
  if (f >= a.at) { act.pos = [to[0], act.pos[1], to[2]]; return; }
  if (f < a.at - d) return;
  const t = span(f, a.at - d, a.at), dist = Math.hypot(to[0] - from[0], to[2] - from[2]);
  act.pos = [from[0] + (to[0] - from[0]) * t, from[1], from[2] + (to[2] - from[2]) * t];
  const run = a.kind === "run", side = Math.abs(to[0] - from[0]) > Math.abs(to[2] - from[2]);
  act.pose = { ...act.pose, view: side ? "side" : to[2] < from[2] ? "back" : "front", gait: run ? "run" : "walk", phase: (dist * t) / (run ? 1.1 : 0.66) };
  act.lookAtW = [to[0], 1, to[2]];
  for (let s = 0; s < dist / 0.66; s++) sfx(ctx, a.at - d + Math.round((s * d * 0.66) / dist), "step");
} });
def("climb", { note: "climb a ladder from the current rung to `to` (rung anchor), arriving at `at`", pre: 40, post: 0, needs: ["to"], run: (a, ctx, act) => {
  const f = ctx.f, d = (a.dur as number) ?? 40, to = ctx.place(a.to as Place), from: V3 = [...act.pos] as V3;
  if (f < a.at - d) { act.pose = { ...act.pose, ...POSES.climb_a }; return; }
  const t = span(f, a.at - d, a.at);
  act.pos = lerp3(from, to, t);
  act.pose = { ...act.pose, ...(Math.floor(f / 6) % 2 ? POSES.climb_a : POSES.climb_b) };
  for (let i = 0; i < d; i += 12) sfx(ctx, a.at - d + i, "rung");
} });
def("sitDown", { note: "sit down on a seat anchor at `at` (a small dip before)", pre: 6, post: 0, needs: ["to"], run: (a, ctx, act) => {
  const f = ctx.f, to = ctx.place(a.to as Place), an = typeof a.to === "string" ? ctx.loc.anchors[a.to] : undefined;
  if (f < a.at - 6) return;
  if (f < a.at) { act.pose = { ...act.pose, stance: "crouch", hip: 1.25 }; return; }
  act.pos = to;
  const s = sc(act);
  act.pose = { ...POSES.sit_chair, hip: (an?.seat ?? 0.355) / (0.403 * s) + 0.12 };
  sfx(ctx, a.at, "sit");
} });
def("standUp", { note: "stand up from a seat at `at`", pre: 0, post: 6, run: (a, ctx, act) => {
  if (ctx.f < a.at) return;
  act.pose = { ...POSES.stand };
  if (ctx.f < a.at + 6) act.pose = { ...act.pose, stance: "crouch", hip: 1.25 };
} });
def("wave", { note: "wave the hand for `dur` frames", pre: 0, post: 30, run: (a, ctx, act) => {
  const f = ctx.f, d = (a.dur as number) ?? 30;
  if (f < a.at || f > a.at + d) return;
  act.pose = { ...act.pose, armF: { to: [0.42 + 0.12 * Math.sin((f - a.at) * 0.6), -0.76] }, expr: act.pose.expr ?? "smile" };
} });
def("jump", { note: "jump up (joy / surprise) landing at at + 12", pre: 4, post: 12, run: (a, ctx, act) => {
  const f = ctx.f;
  if (f < a.at || f > a.at + 12) return;
  const t = span(f, a.at, a.at + 12);
  act.lift = 0.45 * 4 * t * (1 - t);
  act.pose = { ...act.pose, ...POSES.cheer };
  if (f === a.at + 12) sfx(ctx, f, "thud");
} });
def("board", { note: "get into a vehicle: disappears into it at `at` (pair with ride in the next shot)", pre: 0, post: 0, run: (a, ctx, act) => { if (ctx.f >= a.at) act.hidden = true; sfx(ctx, a.at, "door"); } });
def("tankFire", { note: "a tank (vehicle id in `prop`) fires at a target: recoil, muzzle flash, shell, explosion", pre: 0, post: 30, needs: ["target"], run: (a, ctx) => {
  const v = ctx.vehicles?.find((x) => x.id === a.prop), t = targetPoint(ctx, a.target), f = ctx.f;
  if (!v || !t) return;
  const m = vehicleToWorld(v.pose, VEHICLES[v.spec.kind].points?.muzzle ?? [3, 1.8, 0]);
  sfx(ctx, a.at, "cannon");
  fx(ctx, "muzzle", m, win(f, a.at, a.at + 3), 1.4);
  fx(ctx, "smoke", m, win(f, a.at + 1, a.at + 30), 2.2);
  const frames = Math.max(4, Math.round(Math.hypot(t[0] - m[0], t[2] - m[2]) / 40 * ctx.project.fps));
  if (f >= a.at && f <= a.at + frames) fx(ctx, "glow", lerp3(m, t, span(f, a.at, a.at + frames)), 0.5, 0.4, { col: "255,214,140" });
  if (f >= a.at + frames) explode(ctx, [t[0], 0, t[2]], a.at + frames);
  (ctx.shot.kicks ??= []);
  if (!ctx.shot.kicks.some(([k]) => k === a.at)) ctx.shot.kicks.push([a.at, 1.4]);
} });

// =====================================================================================================================
// HIT REACTIONS (cartoon-safe)
// =====================================================================================================================
/** apply a hit reaction to an actor: kind bullet | blade | arrow | punch | blunt | blast; fall = knocked down */
export const applyHit = (ctx: ActionCtx, v: ActorFrame, a: ActionSpec) => {
  const f = ctx.f, kind = (a.kind as string) ?? "punch";
  const src = a.from !== undefined ? (actorOf(ctx, a.from) ? chest(actorOf(ctx, a.from)!) : ctx.place(a.from as Place)) : null;
  const away = src ? dirXZ(src, v.pos) : [-1, 0] as [number, number];
  const hitPt: V3 = kind === "punch" || kind === "blunt" ? headW(v) : chest(v); // kick, bullet, blade, arrow: the body
  sfx(ctx, a.at, "hit_" + kind);
  if (f < a.at) return;
  const dt = f - a.at, fall = a.fall ?? (kind === "blast" || kind === "bullet");
  if (src) v.lookAtW = src;
  // impact effect at the hit point
  const fxk = kind === "blast" ? "dust" : kind === "blade" ? "impact" : "burst";
  fx(ctx, fxk, [hitPt[0] - away[0] * 0.1, hitPt[1], hitPt[2] - away[1] * 0.1], win(f, a.at, a.at + 8), kind === "blast" ? 1.2 : 0.55, { col: kind === "punch" ? "#ffffff" : undefined });
  if (kind === "arrow") v.extra = [...v.extra, { prop: "panah", style: "stuck" }];
  if (kind === "blast") v.soot = Math.max(v.soot, span(f, a.at, a.at + 2));
  const back = kind === "blast" ? 1.4 : kind === "punch" || kind === "blunt" || kind === "kick" ? 0.35 : 0.16;
  const push = easeOut(span(f, a.at, a.at + (kind === "blast" ? 14 : 4)));
  v.pos = [v.pos[0] + away[0] * back * push, v.pos[1], v.pos[2] + away[1] * back * push];
  if (kind === "blast" && dt < 14) v.lift = 0.9 * 4 * (dt / 14) * (1 - dt / 14);
  const sideSign = src ? (away[0] >= 0 ? 1 : -1) : 1;
  if (!fall) {
    // jolt + stagger, then recover
    if (dt < 12) { v.roll = sideSign * -10 * (1 - span(f, a.at + 2, a.at + 12)); v.pose = { ...v.pose, headTilt: (v.pose.headTilt ?? 0) - 12 * (1 - span(f, a.at, a.at + 10)), lean: -8 * (1 - span(f, a.at, a.at + 10)) }; v.expr = "pained"; }
    else if (dt < 24) v.expr = "pained";
    return;
  }
  // fall backward: tip over around the feet, land, then lie with dizzy stars
  const tip = kind === "blast" ? 14 : 8;
  v.expr = dt < tip ? "shock" : "ko";
  if (dt < tip) { v.roll = sideSign * -82 * smooth(span(f, a.at + 2, a.at + tip)); return; }
  v.roll = 0; v.lift = 0;
  v.hold = null;
  v.pose = { ...v.pose, lying: -sideSign, armF: undefined, armB: undefined, view: "front" };
  if (dt === tip) sfx(ctx, f, "thud");
  fx(ctx, "dust", [v.pos[0], v.pos[1] + 0.15, v.pos[2]], win(f, a.at + tip, a.at + tip + 14), 1.0);
  // dizzy stars circle the HEAD, which lands away from the attacker
  fx(ctx, "stars", [v.pos[0] + away[0] * 1.05 * sc(v), v.pos[1] + 0.38, v.pos[2] + away[1] * 1.05 * sc(v)], ((dt - tip) % 30) / 30, 0.5);
};
def("hit", { note: "get hit: { do: 'hit', kind: 'bullet'|'blade'|'arrow'|'punch'|'kick'|'blunt'|'blast', from?: attacker or place, fall?: true }", pre: 0, post: 40, run: (a, ctx, act) => applyHit(ctx, act, a) });

// =====================================================================================================================
/** which attacks hit their target actor, and with what delay / kind */
const HITS: Record<string, { kind: string; delay: (d: number, fps: number) => number }> = {
  aimFire: { kind: "bullet", delay: () => 2 }, slash: { kind: "blade", delay: () => 0 }, chop: { kind: "blade", delay: () => 0 },
  thrust: { kind: "blade", delay: () => 0 }, strike: { kind: "blunt", delay: () => 0 }, punch: { kind: "punch", delay: () => 0 },
  kick: { kind: "kick", delay: () => 0 }, drawRelease: { kind: "arrow", delay: (d, fps) => Math.max(3, Math.round((d / 22) * fps)) },
  throw: { kind: "blunt", delay: (d, fps) => Math.max(6, Math.round((d / 8) * fps)) },
};
/** apply every action of the shot, in contact order; attacks on actors add the victim's hit reaction */
export const applyActions = (ctx: ActionCtx) => {
  const list: ActionSpec[] = [...(ctx.shot.actions ?? [])];
  for (const a of ctx.shot.actions ?? []) {
    const h = HITS[a.do], victim = h && typeof a.target === "string" ? ctx.actors.find((x) => x.id === a.target) : undefined;
    const att = ctx.actors.find((x) => x.id === a.who);
    if (!h || !victim || !att || a.hit === false) continue;
    if (a.do === "throw" && att.hold && isBomb(att.hold.prop)) continue;
    const d = Math.hypot(victim.pos[0] - att.pos[0], victim.pos[2] - att.pos[2]);
    list.push({ who: victim.id, do: "hit", at: a.at + h.delay(d, ctx.project.fps), kind: (a.hitKind as string) ?? h.kind, from: a.who, fall: a.fall });
  }
  list.sort((x, y) => (x.do === "hit" ? 1 : 0) - (y.do === "hit" ? 1 : 0) || x.at - y.at);
  for (const a of list) {
    const d = ACTIONS[a.do];
    if (!d) continue;
    const actor = ctx.actors.find((x) => x.id === a.who);
    if (!actor && a.do !== "explode") continue;
    d.run(a, ctx, actor ?? ctx.actors[0]);
  }
};
export const ACTION_NAMES = Object.keys(ACTIONS);
