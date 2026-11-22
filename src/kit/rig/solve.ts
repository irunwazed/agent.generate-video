// KIT RIG SOLVER (pure): Outfit + Pose + hold -> Joints (every point the drawing needs, plus final-canvas hands,
// prop points, card rect and shading zones). drawRig() in draw.ts only draws what this returns.
//
// Order: metrics -> hold style (may force the view, adds body tweaks) -> legs / hip -> upper body (lean) ->
// props placed by their style -> arms reach the grips with 2-bone IK -> mirror (facing -1) / lying -> rect.
import { P2, rad, clamp, lerp, lerp2, ik2, frameAff, applyAff, Affine, affMul, dist2 } from "../toon/pen";
import { headBlob } from "../toon/head";
import type { Outfit, Build } from "../toon/outfits";
import { PU, propDef, gripsFor, pinPoint, strikePoint, PropDef } from "../props/defs";
import type { Pose, HoldIn, HoldStyle, Joints, SolvedArm, SolvedLeg, SolvedProp, ArmSpec, Anchor, PropState, View } from "./types";

export const SOLE = 975;
export const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
  slim: { a: 114, torso: 1.12, legs: 1.45, tw: 0.7 },
  big: { a: 124, torso: 1.22, legs: 1.25, tw: 1.06 },
};
/** arm length in HH (shoulder to hand dot) */
export const ARM = 0.98;

export type SolveIn = {
  outfit: Outfit; pose: Pose; facing: -1 | 0 | 1; seed: number;
  /** gait phase in cycles (walk / march / idle sway) */
  phase?: number;
  hold?: HoldIn | null;
  /** extra carried props (sheathed sword, slung rifle) */
  extra?: HoldIn[];
  /** final-canvas hand targets (actions: reach for an object, press a button) with blend weights */
  reach?: { F?: P2; B?: P2; kF?: number; kB?: number };
};

const two = Math.PI * 2;
const UPPER: Anchor[] = ["chest", "shoulderF", "shoulderB", "head", "mouth"];
const rotP = (p: P2, a: number, c: P2): P2 => {
  const s = Math.sin(a), co = Math.cos(a), dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * co - dy * s, c[1] + dx * s + dy * co];
};
const angDiff = (a: number, b: number) => { let d = b - a; while (d > Math.PI) d -= two; while (d < -Math.PI) d += two; return d; };

type Placed = { def: PropDef; style: HoldStyle; st: PropState; aff: Affine; mainArm: "F" | "B" | null; offArm: "F" | "B" | null; main: P2; off?: P2 };

export const solve = (inp: SolveIn): Joints => {
  const o = inp.outfit, warnings: string[] = [];
  const Bd = BUILD[o.build ?? "adult"];
  const facingC = inp.facing === 0 ? 0 : 1, mirror = inp.facing === -1;
  const H = headBlob(inp.seed, Bd.a, facingC);
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const phase = inp.phase ?? 0;

  // ---- hold style: may force the view and adds body tweaks under the pose ----
  const holds: { h: HoldIn; def: PropDef; style: HoldStyle; st: PropState }[] = [];
  for (const h of [inp.hold, ...(inp.extra ?? [])]) {
    if (!h) continue;
    const def = propDef(h.prop);
    let style = def.styles[h.style];
    if (!style) { warnings.push(`prop "${h.prop}" has no style "${h.style}" (styles: ${Object.keys(def.styles).join(", ")}); using "${def.defStyle}"`); style = def.styles[def.defStyle]; }
    holds.push({ h, def, style, st: { ...(style.st ?? {}), ...(h.st ?? {}) } });
  }
  const primary = holds[0]?.h === inp.hold ? holds[0] : undefined;
  const sb = primary?.style.body ?? {};
  const pose: Pose = { ...(sb as Pose), ...Object.fromEntries(Object.entries(inp.pose).filter(([, v]) => v !== undefined)) };
  if (sb.stance && !inp.pose.stance) pose.stance = sb.stance;
  if (sb.armF && !inp.pose.armF) pose.armF = sb.armF;
  if (sb.armB && !inp.pose.armB) pose.armB = sb.armB;
  let view: View = pose.view ?? "front";
  if (primary?.style.view) view = primary.style.view;
  const side = view === "side";
  const gait = pose.gait ?? "stand";
  const stance = pose.stance ?? "normal";

  // ---- lower body ----
  const legs: SolvedLeg[] = [];
  const tall = (1 + Bd.torso + Bd.legs) * HH;
  let hipY: number, lean = pose.lean ?? 0, nearFwd = 0, sw = 0;
  const seated = !!pose.seated;
  const ankY = SOLE - 4 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const hipX = 300 + (pose.hipX ?? 0) * HH;
  // knee side: front view legs bend OUTWARD (bend = +s for the leg on side s), side view knees bend FORWARD (+1)
  const footTo = (spec: { to: P2; bend?: number; toe?: number; knee?: P2 }, hip: P2, near: boolean, defBend: number, defToe: number): SolvedLeg => {
    const foot: P2 = [hip[0] + spec.to[0] * HH, hip[1] + spec.to[1] * HH];
    const d = dist2(hip, foot), L = legLen;
    const knee: P2 = spec.knee ? [hip[0] + spec.knee[0] * HH, hip[1] + spec.knee[1] * HH]
      : d >= L - 1 ? lerp2(hip, foot, 0.5) : ik2(hip, foot, l1, l2, spec.bend ?? defBend);
    return { hip, knee, foot, toe: spec.toe !== undefined ? rad(spec.toe) : defToe, near };
  };
  if (!side) {
    // FRONT / BACK
    const L = gait === "march" ? 75 : gait === "walk" ? 33 : gait === "run" ? 95 : 0;
    const bob = gait === "march" ? 0.048 * tall * Math.cos(2 * two * phase) : gait === "walk" ? 0.032 * tall * Math.cos(2 * two * phase)
      : gait === "run" ? 0.06 * tall * Math.cos(2 * two * phase) : gait === "stand" ? 0.014 * tall * Math.cos(two * phase) : 0;
    sw = gait === "march" || gait === "walk" || gait === "run" ? Math.sin(two * phase) : 0;
    const sway = gait === "march" ? 2.2 * Math.sin(two * phase) : gait === "walk" ? 1.4 * Math.sin(two * phase) : gait === "stand" ? 0.7 * Math.sin(two * phase) : 0;
    lean += sway;
    if (seated) {
      hipY = SOLE - (pose.hip ?? 1.0) * HH;
      for (const s of [-1, 1]) {
        const hip: P2 = [hipX + s * 15 * u, hipY];
        const spec = s > 0 ? pose.legF : pose.legB;
        if (spec) legs.push(footTo(spec, hip, s > 0, s, s > 0 ? 0 : Math.PI));
        else {
          // thighs come toward the camera (foreshortened): knees wide at hip height, shins straight down
          const knee: P2 = [hipX + s * 0.36 * HH, hipY + 0.05 * HH], foot: P2 = [hipX + s * 0.33 * HH, Math.max(knee[1] + 0.2 * HH, ankY)];
          legs.push({ hip, knee, foot, toe: s > 0 ? 0 : Math.PI, near: s > 0 });
        }
      }
    } else if (stance === "kneel") {
      hipY = SOLE - 0.8 * HH;
      // back knee on the ground, front thigh out past the torso at hip height, shin straight down
      legs.push({ hip: [hipX - 15 * u, hipY], knee: [hipX - 0.26 * HH, SOLE - 9 * u], foot: [hipX - 0.5 * HH, SOLE - 6 * u], toe: Math.PI, near: false });
      legs.push({ hip: [hipX + 15 * u, hipY], knee: [hipX + 0.64 * HH, hipY - 0.03 * HH], foot: [hipX + 0.62 * HH, ankY], toe: 0, near: true });
    } else if (stance === "crouch" || pose.hip !== undefined) {
      hipY = SOLE - (pose.hip ?? 0.95) * HH;
      for (const s of [-1, 1]) {
        const hip: P2 = [hipX + s * 15 * u, hipY];
        const spec = (s > 0 ? pose.legF : pose.legB) ?? { to: [s * 0.2, (ankY - hipY) / HH] as P2 };
        legs.push(footTo(spec, hip, s > 0, s, s > 0 ? 0 : Math.PI));
      }
    } else {
      const torsoBot0 = SOLE - Bd.legs * HH + bob;
      hipY = torsoBot0 - 0.12 * HH;
      const wide = stance === "wide" ? 18 * u : stance === "brace" ? 14 * u : 0;
      if (stance === "brace") hipY += 0.08 * HH;
      for (const [s, ph] of [[-1, 0], [1, 0.5]] as const) {
        const spec = s > 0 ? pose.legF : pose.legB;
        const hip: P2 = [hipX + s * 15 * u, hipY];
        if (spec) { legs.push(footTo(spec, hip, s > 0, s, s > 0 ? 0 : Math.PI)); continue; }
        const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
        const fx = hipX + s * (22 * u + wide), fy = SOLE - 4 * u - up;
        const k: P2 = [(hip[0] + fx) / 2 + s * (1.5 * u + up * 0.16 + wide * 0.3), (hipY + fy) / 2 - up * 0.08];
        legs.push({ hip, knee: k, foot: [fx, fy], toe: s > 0 ? 0 : Math.PI, near: s > 0 });
      }
    }
  } else {
    // SIDE (profile, facing +x)
    if (seated) {
      hipY = SOLE - (pose.hip ?? 1.0) * HH;
      for (const near of [false, true]) {
        const hip: P2 = [hipX + (near ? 0 : -5 * u), hipY];
        const spec = near ? pose.legF : pose.legB;
        if (spec) { legs.push(footTo(spec, hip, near, 1, 0)); continue; }
        const knee: P2 = [hip[0] + 0.62 * HH, hipY + 0.03 * HH], foot: P2 = [knee[0] + 0.05 * HH, Math.min(ankY, knee[1] + l2)];
        legs.push({ hip, knee, foot, toe: 0, near });
      }
    } else if (gait === "march" || gait === "walk" || gait === "run") {
      const stride = gait === "walk" ? 0.8 : gait === "run" ? 1.35 : 1, stomp = gait === "walk" ? 0.6 : gait === "run" ? 1.4 : 1;
      const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
      const st = (ph: number) => {
        const c = (((phase + ph) % 1) + 1) % 1;
        if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
        const s = (c - 0.5) / 0.5;
        return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
      };
      const nL = st(0), fL = st(0.5), stc = nL.stance ? nL : fL;
      const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stc.s));
      hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stc.x * stc.x));
      for (const [Lg, near] of [[fL, false], [nL, true]] as const) {
        const hip: P2 = [hipX + (near ? 0 : -5 * u), hipY], ank: P2 = [hipX + Lg.x, ankY - Lg.h];
        legs.push({ hip, knee: ik2(hip, ank, l1, l2, 1), foot: ank, toe: Lg.stance ? 0 : rad(35 * Math.sin(Math.PI * Lg.s) * (1 - 1.6 * Lg.s)), near });
      }
      lean += (gait === "run" ? 10 : 4) + 3 * Math.cos(2 * two * phase);
      nearFwd = nL.x / (S / 2);
    } else if (stance === "lunge") {
      const fwd = 0.55 * HH, back = 0.5 * HH;
      hipY = ankY - Math.sqrt(Math.max(1, legLen * legLen - fwd * fwd)) * 0.97;
      for (const near of [false, true]) {
        const hip: P2 = [hipX + (near ? 0 : -5 * u), hipY], ank: P2 = [hipX + (near ? fwd : -back), ankY];
        legs.push({ hip, knee: ik2(hip, ank, l1, l2, 1), foot: ank, toe: near ? 0 : rad(-8), near });
      }
    } else if (stance === "kneel") {
      hipY = SOLE - 0.95 * HH;
      const hipF: P2 = [hipX, hipY], hipB: P2 = [hipX - 5 * u, hipY];
      legs.push({ hip: hipB, knee: [hipX - 0.12 * HH, SOLE - 9 * u], foot: [hipX - 0.58 * HH, SOLE - 6 * u], toe: Math.PI, near: false });
      const ank: P2 = [hipX + 0.42 * HH, ankY];
      legs.push({ hip: hipF, knee: ik2(hipF, ank, l1, l2, 1), foot: ank, toe: 0, near: true });
    } else if (stance === "crouch" || pose.hip !== undefined) {
      hipY = SOLE - (pose.hip ?? 0.9) * HH;
      for (const near of [false, true]) {
        const hip: P2 = [hipX + (near ? 0 : -5 * u), hipY];
        const spec = (near ? pose.legF : pose.legB) ?? { to: [near ? 0.18 : 0.05, (ankY - hipY) / HH] as P2 };
        legs.push(footTo(spec, hip, near, 1, 0));
      }
    } else {
      hipY = ankY - legLen * 0.995;
      for (const near of [false, true]) {
        const hip: P2 = [hipX + (near ? 0 : -5 * u), hipY];
        const spec = near ? pose.legF : pose.legB;
        if (spec) { legs.push(footTo(spec, hip, near, 1, 0)); continue; }
        const ank: P2 = [hipX + (near ? 4 : -4) * u + (stance === "wide" ? (near ? 0.25 : -0.25) * HH : 0), ankY];
        legs.push({ hip, knee: ik2(hip, ank, l1, l2, 1), foot: ank, toe: 0, near });
      }
    }
  }

  // ---- upper body (local frame, rotated by `lean` about the pivot) ----
  const pivot: P2 = [hipX, hipY];
  const leanR = rad(lean);
  const R = (p: P2) => rotP(p, leanR, pivot), Rinv = (p: P2) => rotP(p, -leanR, pivot);
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH;
  const Ta = side ? (o.build === "big" ? 0.42 : o.build === "stout" ? 0.36 : 0.31) * W : ((Bd.tw / 2) * W) / 1.06;
  const tcx = side ? hipX + 2 * u : hipX + 3 * u * facingC;
  const sh = (s: number): P2 => side ? [tcx + 0.05 * Ta + (s < 0 ? -3 * u : 0), chin + 0.14 * HH] : [tcx + s * 0.85 * Ta, chin + 0.12 * HH];
  const headDy = (pose.headDy ?? 0) * HH;
  const hcx = side ? hipX + 4 * u : hipX, hc = chin - H.b + headDy;
  const anchorLocal = (a: Anchor): P2 => {
    switch (a) {
      case "chest": return [tcx, chin + 0.3 * HH];
      case "shoulderF": return sh(1);
      case "shoulderB": return sh(-1);
      case "head": return [hcx, hc];
      case "mouth": return side ? [hcx + 33 * u, hc + 21 * u] : [hcx + 8 * u * facingC, hc + 20 * u];
      case "hip": return pivot;
      default: return [hipX, SOLE];
    }
  };
  const anchorCanon = (a: Anchor): P2 => (UPPER.includes(a) ? R(anchorLocal(a)) : anchorLocal(a));

  // ---- props ----
  const placed: Placed[] = [];
  let placedFromBlend: Affine | null = null;
  for (const { h, def, style, st } of holds) {
    const pinL = pinPoint(def, style, st), g = gripsFor(def, style, st);
    const upper = UPPER.includes(style.at);
    let ang = rad(style.angle + (upper ? lean : 0) + (h.nudge?.angle ?? 0));
    const nud = h.nudge?.pos ?? [0, 0];
    let pinC: P2 = [anchorCanon(style.at)[0] + (style.pos[0] + nud[0]) * HH, anchorCanon(style.at)[1] + (style.pos[1] + nud[1]) * HH];
    const flip = !!style.flipY;
    const affAt = (pin: P2, localPin: P2, a: number): Affine => {
      const m0 = frameAff([0, 0], a, flip, 1);
      const off = applyAff(m0, [localPin[0] * PU, localPin[1] * PU]);
      return frameAff([pin[0] - off[0], pin[1] - off[1]], a, flip, 1);
    };
    if (h.blendFrom && h.blendFrom.k < 1 && def.styles[h.blendFrom.style]) {
      // swing between two styles: interpolate the MAIN grip position and the angle (shortest way round)
      const s0 = def.styles[h.blendFrom.style], k = clamp(h.blendFrom.k, 0, 1);
      const up0 = UPPER.includes(s0.at), ang0 = rad(s0.angle + (up0 ? lean : 0));
      const pin0: P2 = [anchorCanon(s0.at)[0] + s0.pos[0] * HH, anchorCanon(s0.at)[1] + s0.pos[1] * HH];
      const a0 = affAt(pin0, pinPoint(def, s0, st), ang0), a1 = affAt(pinC, pinL, ang);
      const g0 = gripsFor(def, s0, st).main, g1 = gripsFor(def, style, st).main;
      const m0 = applyAff(a0, [g0[0] * PU, g0[1] * PU]), m1 = applyAff(a1, [g1[0] * PU, g1[1] * PU]);
      ang = ang0 + angDiff(ang0, ang) * k;
      const gm = lerp2(m0, m1, k), gl = lerp2(g0, g1, k);
      pinC = gm; void pinC;
      const tmp = affAt(gm, gl, ang);
      placedFromBlend = tmp;
    }
    let aff = placedFromBlend ?? affAt(pinC, pinL, ang);
    placedFromBlend = null;
    const toC = (m: Affine, lp: P2) => applyAff(m, [lp[0] * PU, lp[1] * PU]);
    if (h.target) {
      // strike: keep the style feel but put the striking point ON the target (canonical)
      // a target out of reach is pulled toward the shoulder until the grip can be held (the swing stops short)
      const tgt0: P2 = mirror ? [600 - h.target[0], h.target[1]] : h.target;
      const sp = strikePoint(def), armS = R(sh(style.main === "B" ? -1 : 1));
      let best: Affine = aff;
      for (let sc = 1; sc >= 0.35; sc -= 0.08) {
        const tgt: P2 = [armS[0] + (tgt0[0] - armS[0]) * sc, armS[1] + (tgt0[1] - armS[1]) * sc];
        let bestOver = Infinity, bestCost = Infinity, cand: Affine = aff;
        for (let da = -50; da <= 50; da += 5) {
          const a2 = ang + rad(da), m = affAt(tgt, sp, a2), mainC = toC(m, g.main);
          const over = Math.max(0, dist2(mainC, armS) - ARM * HH * 0.95);
          const cost = over * 4 + Math.abs(da) * 0.6;
          if (cost < bestCost) { bestCost = cost; cand = m; bestOver = over; }
        }
        best = cand;
        if (bestOver < 0.05 * HH) break;
        if (sc < 0.4) warnings.push(`${def.name}: strike target out of reach (${Math.round(dist2(tgt0, armS) / HH * 10) / 10} HH from the shoulder): move the actor closer`);
      }
      aff = best;
    }
    if (h.from && h.from.k < 1) {
      // blend from a free placement (main grip at from.pos, angle from.angle) to the style placement
      const k = clamp(h.from.k, 0, 1), styleMain = toC(aff, g.main);
      const fp: P2 = mirror ? [600 - h.from.pos[0], h.from.pos[1]] : h.from.pos;
      const fa = mirror ? Math.PI - rad(h.from.angle) : rad(h.from.angle);
      const curA = Math.atan2(aff[1], aff[0]);
      const a2 = fa + angDiff(fa, curA) * k;
      aff = affAt(lerp2(fp, styleMain, k), g.main, a2);
    }
    const mainArm = style.main === undefined ? "F" : style.main;
    const offArm = style.off ?? null;
    placed.push({ def, style, st, aff, mainArm, offArm, main: toC(aff, g.main), off: g.off ? toC(aff, g.off) : undefined });
  }

  // ---- arms ----
  const arms: SolvedArm[] = [];
  const handGrip = new Map<"F" | "B", { pt: P2; layer: string; above: boolean }>();
  for (const pl of placed) {
    if (pl.mainArm) handGrip.set(pl.mainArm, { pt: pl.main, layer: pl.style.layer ?? "front", above: !!pl.style.aboveHead });
    if (pl.offArm && pl.off) handGrip.set(pl.offArm, { pt: pl.off, layer: pl.style.layer ?? "front", above: !!pl.style.aboveHead });
  }
  const aLen = ARM * HH;
  for (const id of ["B", "F"] as const) {
    const s = id === "F" ? 1 : -1, S = sh(s);
    const spec: ArmSpec | undefined = id === "F" ? pose.armF : pose.armB;
    const grip = handGrip.get(id);
    let E: P2 | null = null, Hd: P2, front = false, above = false, bendForce: number | undefined;
    if (grip) Hd = Rinv(grip.pt);
    else if (spec && spec !== "hang" && spec !== "swing") {
      const base = spec.from && spec.from !== "shoulder" ? anchorLocal(spec.from) : S;
      Hd = [base[0] + spec.to[0] * HH, base[1] + spec.to[1] * HH];
      front = !!spec.front; above = !!spec.above; bendForce = spec.bend;
    } else if (!side) {
      const walk = spec === "swing" || (spec === undefined && (gait === "march" || gait === "walk" || gait === "run"));
      const fwd = walk ? s * sw : 0;
      const ex = tcx + s * (1.12 * Ta + 4 * u);
      const hx = ex + s * 3 * u - s * 6 * u * Math.max(0, fwd) + s * 4 * u * Math.max(0, -fwd);
      E = [ex, S[1] + 0.48 * HH];
      Hd = [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u];
    } else {
      const walk = spec === "swing" || (spec === undefined && (gait === "march" || gait === "walk" || gait === "run"));
      const angA = walk ? rad(30) * nearFwd * (id === "F" ? -1 : 1) : 0;
      E = [S[0] + Math.sin(angA) * aLen * 0.5, S[1] + Math.cos(angA) * aLen * 0.5];
      const a2 = angA + rad(16) * Math.sign(angA || 1);
      Hd = [E[0] + Math.sin(a2) * aLen * 0.5, E[1] + Math.cos(a2) * aLen * 0.5];
    }
    // action reach (final canvas -> canonical -> local), blended
    const rt = id === "F" ? inp.reach?.F : inp.reach?.B, rk = id === "F" ? inp.reach?.kF ?? 1 : inp.reach?.kB ?? 1;
    if (rt) {
      const c: P2 = mirror ? [600 - rt[0], rt[1]] : rt;
      Hd = lerp2(Hd, Rinv(c), clamp(rk, 0, 1));
      E = null;
    }
    let stretch = dist2(S, Hd) / aLen;
    if (stretch > 1.3) { const k = 1.3 / stretch; Hd = lerp2(S, Hd, k); warnings.push(`arm ${id} cannot reach (${stretch.toFixed(2)}x arm length)`); stretch = 1.3; }
    else if (stretch > 1.12) warnings.push(`arm ${id} stretched ${stretch.toFixed(2)}x`);
    if (!E) {
      const d = dist2(S, Hd);
      if (d >= aLen - 1) E = lerp2(S, Hd, 0.5);
      else {
        const c1 = ik2(S, Hd, aLen / 2, aLen / 2, 1), c2 = ik2(S, Hd, aLen / 2, aLen / 2, -1);
        if (bendForce) E = bendForce > 0 ? c1 : c2;
        else {
          const mid = lerp2(S, Hd, 0.5);
          const pref: P2 = side ? [-0.55, 1] : [s * 1, 0.75];
          const sc = (e: P2) => (e[0] - mid[0]) * pref[0] + (e[1] - mid[1]) * pref[1];
          E = sc(c1) >= sc(c2) ? c1 : c2;
        }
      }
    }
    const inTorso = Math.abs(Hd[0] - tcx) < Ta * 1.05 && Hd[1] > chin - 0.1 * HH && Hd[1] < torsoBot + 0.05 * HH;
    if (grip) { front = grip.layer !== "back"; above = grip.above; }
    if (side) front = id === "F";
    else if (!grip && !spec) front = false;
    else if (!grip && spec && typeof spec === "object" && spec.front === undefined) front = inTorso;
    arms.push({ id, S, E: E!, Hd, front, above, grip: !!grip, far: side && id === "B", stretch });
  }

  // ---- final mapping: mirror + lying ----
  let lie: [number, number, number] | null = null, lieAff: Affine | null = null;
  if (pose.lying) {
    lie = [rad(90 * Math.sign(pose.lying)), 300, SOLE];
    const r = lie[0], c = Math.cos(r), s2 = Math.sin(r);
    // rotate about the feet, then lift so the body rests on the ground and centre it on the card
    lieAff = [c, s2, -s2, c, 300 - 300 * c + SOLE * s2 - 1.6 * HH * Math.sign(pose.lying), SOLE - 300 * s2 - SOLE * c - 0.42 * HH];
  }
  const M0: Affine = affMul(mirror ? [-1, 0, 0, 1, 600, 0] : [1, 0, 0, 1, 0, 0], lieAff ?? [1, 0, 0, 1, 0, 0]);
  const fin = (p: P2) => applyAff(M0, p);
  const handF = arms.find((a) => a.id === "F")!, handB = arms.find((a) => a.id === "B")!;
  const points: Record<string, P2> = { head: fin(R([hcx, hc])), chest: fin(R(anchorLocal("chest"))), hip: fin(pivot), feet: fin([hipX, SOLE]), mouth: fin(R(anchorLocal("mouth"))) };
  const props: SolvedProp[] = placed.map((pl) => ({ name: pl.def.name, aff: pl.aff, layer: pl.style.layer ?? "front", above: !!pl.style.aboveHead, st: pl.st }));
  for (const pl of placed) for (const [k, lp] of Object.entries(pl.def.points)) points[`${pl.def.name}.${k}`] = fin(applyAff(pl.aff, [lp[0] * PU, lp[1] * PU]));

  // ---- card rect (final canvas) ----
  const xs: number[] = [], ys: number[] = [];
  const addC = (p: P2, r = 0) => { const q = fin(p); xs.push(q[0] - r, q[0] + r); ys.push(q[1] - r, q[1] + r); };
  const hatTop = ["shako_tall", "tophat"].includes(o.hat ?? "") ? 2.0 : ["shako", "caping", "helmet", "wide", "peci"].includes(o.hat ?? "") ? 1.6 : 1.2;
  const headC = R([hcx, hc]);
  addC([headC[0] - H.a * 1.35, headC[1] - H.b * hatTop - 20]); addC([headC[0] + H.a * 1.35, headC[1] + H.b * 1.4]);
  if (o.hat === "caping") { addC([headC[0] - W * 1.05, headC[1]]); addC([headC[0] + W * 1.05, headC[1]]); }
  addC(R([tcx - Ta * 1.5, chin])); addC(R([tcx + Ta * 1.5, torsoBot + 10]));
  for (const l of legs) { addC(l.hip, 20); addC(l.knee, 25); addC(l.foot, 40); }
  for (const a of arms) { addC(R(a.Hd), 25); addC(R(a.E ?? a.S), 20); }
  if (o.dress || o.sarong) { addC([hipX - 0.6 * W, SOLE]); addC([hipX + 0.6 * W, SOLE]); }
  for (const pl of placed) {
    const b = pl.def.bounds;
    for (const lp of [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]] as P2[]) addC(applyAff(pl.aff, [lp[0] * PU, lp[1] * PU]), 14);
    if (pl.st.flash) addC(applyAff(pl.aff, [(pl.def.points.muzzle ?? pl.def.points.tip ?? [0, 0])[0] * PU + 120, 0]), 90);
  }
  const m = 22, snap = 20;
  const rect: [number, number, number, number] = [
    Math.floor((Math.min(...xs) - m) / snap) * snap, Math.floor((Math.min(...ys) - m) / snap) * snap,
    Math.ceil((Math.max(...xs) + m) / snap) * snap, Math.ceil((Math.max(...ys) + m) / snap) * snap,
  ];

  const chinF = fin(R([hcx, chin])), hcF = fin(headC);
  return {
    view, mirror, facing: inp.facing, u, HH, W, sole: SOLE,
    lean: leanR, pivot, hipY, torsoBot, chin, tcx,
    head: { cx: hcx, hc, tilt: rad(pose.headTilt ?? 0), a: H.a, b: H.b, seed: inp.seed },
    legs, arms, props, lie, seated,
    hands: { F: fin(R(handF.Hd)), B: fin(R(handB.Hd)) },
    points, rect,
    zones: { chin: chinF[1], headC: hcF, headR: [H.a, H.b], torsoW: Ta, torsoY: [chinF[1], fin(R([tcx, torsoBot]))[1]] },
    warnings,
  };
};

/** canonical-canvas helpers for drawing */
export const lerpN = lerp;
