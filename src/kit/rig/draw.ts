// KIT RIG DRAW: draws a solved figure (Joints) with the reference look: bean torso with thick-thin plum ink,
// noodle limbs (one stroke through the elbow), ink-dot hands that sit ON the props they grip.
// Layer order: back props -> legs -> (dress / sarong) -> arms behind -> torso -> props -> front arms -> grip dots
//              -> head -> above-head props + arms (cup at the mouth, phone at the ear, hand on the chin).
// Outfit extras drawn here: flag patch, armband, chain, sleeveless + tattoo, shorts, barefoot, ragged, skeleton.
import { Pen, P2, INK, SKIN, mix, mul, shade, SH_CLOTH, curve, rrect, Affine, affMul, rad, rnd, clamp, lerp2 } from "../toon/pen";
import { blobPts, Blob, headBlob, drawHead, thickAngle, Expr, lidOf, DEF_LIGHT, smoothClosed } from "../toon/head";
import { drawFlag } from "../toon/flags";
import type { Outfit } from "../toon/outfits";
import { PROPS, PU } from "../props/defs";
import { BUILD, SOLE } from "./solve";
import type { Joints, SolvedArm, SolvedProp, PropState } from "./types";

export type FaceOpts = {
  expr?: Expr; look?: number; blink?: boolean | number;
  /** canvas angle the key light comes FROM (final canvas; the drawing mirrors it itself) */
  light?: number;
  /** 0..1 soot on the face (after an explosion) */
  soot?: number;
};

const BONE = "#f3efe2";
const rotAff = (a: number, c: P2): Affine => {
  const co = Math.cos(a), s = Math.sin(a);
  return [co, s, -s, co, c[0] - c[0] * co + c[1] * s, c[1] - c[0] * s - c[1] * co];
};
export const baseAff = (J: Joints): Affine => {
  let m: Affine = J.mirror ? [-1, 0, 0, 1, 600, 0] : [1, 0, 0, 1, 0, 0];
  if (J.lie) {
    const r = J.lie[0], c = Math.cos(r), s = Math.sin(r), sg = Math.sign(r);
    m = affMul(m, [c, s, -s, c, 300 - 300 * c + SOLE * s - 1.6 * J.HH * sg, SOLE - 300 * s - SOLE * c - 0.42 * J.HH]);
  }
  return m;
};

const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};

/** fill a pattern inside the current clip region (torso / sarong) */
const pattern = (p: Pen, kind: string, col: string, x0: number, y0: number, x1: number, y1: number, u: number, seed = 1) => {
  if (kind === "stripes") for (let y = y0; y < y1; y += 14 * u) p.poly([[x0, y], [x1, y], [x1, y + 6 * u], [x0, y + 6 * u]], col, 0);
  else if (kind === "check") {
    for (let y = y0; y < y1; y += 16 * u) p.poly([[x0, y], [x1, y], [x1, y + 5 * u], [x0, y + 5 * u]], col, 0);
    for (let x = x0; x < x1; x += 16 * u) p.poly([[x, y0], [x + 5 * u, y0], [x + 5 * u, y1], [x, y1]], col, 0);
  } else if (kind === "batik") {
    let k = 0;
    for (let y = y0; y < y1; y += 15 * u) for (let x = x0 + ((k++ % 2) * 8) * u; x < x1; x += 16 * u) {
      p.ell(x, y, 4 * u, 4 * u, col, 0);
      p.ell(x, y, 1.6 * u, 1.6 * u, mix(col, "#ffffff", 0.5), 0);
    }
  } else if (kind === "spots") {
    let k = 0;
    for (let y = y0; y < y1; y += 17 * u) for (let x = x0 + ((k++ % 2) * 9) * u; x < x1; x += 19 * u) {
      const r = (4 + 3 * rnd(seed, x + y)) * u;
      p.ell(x + 3 * u * rnd(seed, x), y, r, r * 0.8, col, 0);
    }
  }
};

export const drawRig = (p: Pen, o: Outfit, J: Joints, f: FaceOpts = {}) => {
  const u = J.u, HH = J.HH, W = J.W, side = J.view === "side", back = J.view === "back";
  const Bd = BUILD[o.build ?? "adult"], facingC = J.facing === 0 ? 0 : 1, seed = J.head.seed;
  const lightIn = f.light ?? DEF_LIGHT, light = J.mirror ? Math.PI - lightIn : lightIn;
  const thick = thickAngle(light), ow = 5 * u;
  const M0 = baseAff(J), Mup = affMul(M0, rotAff(J.lean, J.pivot));
  const hipX = J.pivot[0], skel = !!o.skeleton, skin = o.skin ?? SKIN;
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const legNear = mix(o.pants, INK, 0.55), legFar = mix(o.pants, INK, side ? 0.75 : 0.55);

  const drawProp = (sp: SolvedProp) => {
    const def = PROPS[sp.name];
    p.tf = affMul(M0, sp.aff);
    def.draw(p, PU, sp.st);
  };
  const armband = (pts: P2[]) => {
    if (!o.armband || skel) return;
    const seg = pts.slice(2, 5);
    if (o.armband === "merahputih") { p.band(seg.slice(0, 2), "#d0312d", 7.5 * u, 1.4 * u); p.band(seg.slice(1, 3), "#f6f1e7", 7.5 * u, 1.4 * u); }
    else p.band(seg, o.armband, 7.5 * u, 1.4 * u);
  };
  const drawArm = (a: SolvedArm, dotOnly = false) => {
    p.tf = Mup;
    const pts = curve(a.S, a.E, a.Hd);
    if (!dotOnly) {
      if (skel) { p.line(pts, BONE, 3.6 * u); p.ell(a.E[0], a.E[1], 3.6 * u, 3.6 * u, BONE, 1.4 * u); }
      else if (o.sleeveless) {
        p.line(pts, a.far ? shade(skin, 0.86) : skin, 3.6 * u);
        if (o.tattoo) { const q = pts[6], r = pts[7]; p.ell((q[0] + r[0]) / 2, (q[1] + r[1]) / 2, 2.4 * u, 3.4 * u, "#3a5a8a", 0); }
      } else p.stroke(pts, 5.2 * u, a.far ? farArm : armCol);
      armband(pts);
    }
    if (skel) p.ell(a.Hd[0], a.Hd[1], 5 * u, 5 * u, BONE, 1.6 * u);
    else p.dot(a.Hd[0], a.Hd[1], 5.5 * u);
  };

  // 1. back-layer props (slung rifle, flag on the back)
  for (const sp of J.props) if (sp.layer === "back") drawProp(sp);

  // 2. legs + feet
  p.tf = M0;
  const legs = [...J.legs].sort((a, b) => Number(a.near) - Number(b.near));
  for (const L of legs) {
    const col = L.near ? legNear : legFar;
    const pts = side ? [L.hip, L.knee, L.foot] : curve(L.hip, L.knee, L.foot);
    const kneeIdx = side ? 1 : 5;
    if (skel) { p.line(pts, BONE, 4.2 * u); p.ell(L.knee[0], L.knee[1], 4 * u, 4 * u, BONE, 1.4 * u); }
    else if (o.shorts) {
      p.stroke(pts.slice(0, kneeIdx + 1), 6.6 * u, col);
      p.line(pts.slice(kneeIdx), L.near ? skin : shade(skin, 0.86), 4 * u);
    } else p.stroke(pts, 5.8 * u, col);
    if (!Number.isNaN(L.toe)) {
      const fcol = skel ? BONE : o.barefoot ? (L.near ? skin : shade(skin, 0.86)) : L.near || o.boots === INK ? o.boots : shade(o.boots, 0.82);
      const c = Math.cos(L.toe), s = Math.sin(L.toe);
      footStroke(p, [L.foot[0] - 3 * u * c, L.foot[1] - 3 * u * s], [L.foot[0] + 13 * u * c, L.foot[1] + 13 * u * s + 0.5 * u], 7.5 * u, fcol);
    }
  }

  // 3. dress / sarong over the legs (not rotated)
  const standing = !J.seated && !J.lie;
  if (!skel && (o.dress || o.sarong) && standing) {
    const col = (o.dress ?? o.sarong)!, top = J.torsoBot - 0.22 * HH, hem = o.dress ? SOLE - 0.3 * HH : SOLE - 0.42 * HH;
    const wt = side ? 0.36 * W : 0.42 * W, wb = side ? 0.42 * W : 0.47 * W;
    const pts = smoothClosed([[hipX - wt, top], [hipX + wt, top], [hipX + wb, hem], [hipX - wb, hem]], 2);
    p.gradFill(pts, col, mul(col, SH_CLOTH), light);
    if (o.sarong && !o.dress) p.clip(pts, () => pattern(p, "check", shade(col, 0.72), hipX - wb, top, hipX + wb, hem, u));
    p.inkRing(pts, ow * 0.9, thick);
  } else if (!skel && (o.dress || o.sarong) && J.seated) {
    const col = (o.dress ?? o.sarong)!, kx = side ? hipX + 0.66 * HH : hipX;
    const pts = side ? smoothClosed([[hipX - 0.3 * W, J.hipY - 0.12 * HH], [kx, J.hipY - 0.06 * HH], [kx + 0.06 * HH, J.hipY + 0.2 * HH], [hipX - 0.3 * W, J.hipY + 0.14 * HH]], 2)
      : smoothClosed([[hipX - 0.5 * W, J.hipY - 0.1 * HH], [hipX + 0.5 * W, J.hipY - 0.1 * HH], [hipX + 0.55 * W, J.hipY + 0.32 * HH], [hipX - 0.55 * W, J.hipY + 0.32 * HH]], 2);
    p.gradFill(pts, col, mul(col, SH_CLOTH), light);
    p.inkRing(pts, ow * 0.9, thick);
  }

  // 4. arms behind the body
  for (const a of J.arms) if (!a.front && !a.above) drawArm(a);

  // 5. torso
  p.tf = Mup;
  const Ta = side ? (o.build === "big" ? 0.42 : o.build === "stout" ? 0.36 : 0.31) * W : ((Bd.tw / 2) * W) / 1.06;
  const T: Blob = side
    ? { a: Ta, b: 0.5 * (J.torsoBot - (J.chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06, rot: 0, noise: 0.006, seed: seed + 7 }
    : { a: Ta, b: 0.5 * (J.torsoBot - (J.chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" || o.build === "big" ? 0.18 : 0.12, asym: 0.04 * facingC, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = J.tcx, tcy = J.torsoBot - T.b, tp = blobPts(tcx, tcy, T), chin = J.chin, torsoBot = J.torsoBot;
  if (skel) drawSkeletonTorso(p, tcx, chin, torsoBot, Ta, HH, u, side);
  else {
    p.gradFill(tp, back && o.vest ? o.vest : o.jacket, mul(back && o.vest ? o.vest : o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      const x0 = tcx - 1.3 * Ta, x1 = tcx + 1.3 * Ta, y0 = chin - 0.3 * HH, y1 = torsoBot + 0.1 * HH;
      if (o.pattern) pattern(p, o.pattern, o.patternCol ?? shade(o.jacket, 0.7), x0, y0, x1, y1, u, seed);
      if (o.ragged) {
        for (const [dx, dy, w, h, c] of [[-0.45, 0.55, 0.36, 0.22, 0.78], [0.3, 0.25, 0.3, 0.26, 1.15]] as [number, number, number, number, number][]) {
          const px = tcx + dx * Ta, py = chin + dy * HH, pw = w * Ta, ph = h * HH;
          p.poly([[px, py], [px + pw, py + 2 * u], [px + pw - u, py + ph], [px + u, py + ph - u]], shade(o.jacket, c), 1.6 * u);
          for (let k = 0; k < 4; k++) p.stroke([[px + (k + 0.5) * pw / 4, py - 2 * u], [px + (k + 0.5) * pw / 4, py + 3 * u]], 1.1 * u);
        }
        // torn hem: a zigzag tear line with darker torn flaps below it
        const hy = torsoBot - 0.1 * HH, zz: P2[] = [];
        for (let i = 0; i <= 12; i++) zz.push([tcx - 1.1 * Ta + (2.2 * Ta * i) / 12, hy + (i % 2 ? 9 : -2) * u]);
        p.poly([...zz, [tcx + 1.2 * Ta, torsoBot + 0.3 * HH], [tcx - 1.2 * Ta, torsoBot + 0.3 * HH]], shade(o.jacket, 0.72), 0);
        p.stroke(zz, 1.8 * u);
      }
      if (side) {
        if (o.vest) p.poly([[tcx - 1.2 * Ta, chin], [tcx + 0.55 * Ta, chin], [tcx + 0.55 * Ta, torsoBot], [tcx - 1.2 * Ta, torsoBot]], o.vest, 0);
        if (o.apron) p.poly(rrect(tcx + 0.15 * Ta, chin + 0.2 * HH, tcx + 1.3 * Ta, torsoBot + 0.2 * HH, 6 * u), o.apron, 2 * u);
        if (o.belt) p.band([[tcx - 0.65 * Ta, chin - 0.05 * HH], [tcx + 0.75 * Ta, torsoBot - 0.1 * HH]], o.belt, 5.5 * u, 1.8 * u);
        if (o.bandolier) p.band([[tcx + 0.75 * Ta, chin - 0.05 * HH], [tcx - 0.65 * Ta, torsoBot - 0.1 * HH]], o.bandolier, 6 * u, 1.8 * u);
        if (o.sash) p.band([[tcx - 1.3 * Ta, torsoBot - 0.32 * HH], [tcx + 1.3 * Ta, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
        if (o.tie) p.poly([[tcx + 0.72 * Ta, chin + 0.02 * HH], [tcx + 0.95 * Ta, chin + 0.04 * HH], [tcx + 0.9 * Ta, chin + 0.6 * HH], [tcx + 0.78 * Ta, chin + 0.66 * HH]], o.tie, 1.6 * u);
        if (!o.noButtons && !o.dress && !o.tie && !o.apron) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * Ta, y, 3 * u, INK); p.dot(tcx + 0.8 * Ta, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
        return;
      }
      if (back) {
        if (o.belt) for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * Ta, chin - 0.05 * HH], [tcx + s * 0.8 * Ta, torsoBot - 0.1 * HH]], o.belt, 5.5 * u, 1.8 * u);
        if (o.bandolier) p.band([[tcx + 0.75 * Ta, chin - 0.05 * HH], [tcx - 0.8 * Ta, torsoBot - 0.1 * HH]], o.bandolier, 6 * u, 1.8 * u);
        if (o.sash) p.band([[tcx - 1.3 * Ta, torsoBot - 0.32 * HH], [tcx + 1.3 * Ta, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
        if (o.apron) p.stroke([[tcx - 1.2 * Ta, torsoBot - 0.45 * HH], [tcx + 1.2 * Ta, torsoBot - 0.45 * HH]], 2.5 * u, shade(o.apron, 0.8));
        return;
      }
      if (o.vest) {
        p.poly([[tcx - 0.85 * Ta, chin], [tcx + 0.85 * Ta, chin], [tcx + 0.85 * Ta, torsoBot], [tcx - 0.85 * Ta, torsoBot]], o.vest, 0);
        p.poly([[tcx - 16 * u, chin - 4 * u], [tcx + 16 * u, chin - 4 * u], [tcx, chin + 0.36 * HH]], o.jacket, 2.2 * u);
      }
      if (o.apron) {
        p.poly(rrect(tcx - 0.78 * Ta, chin + 0.22 * HH, tcx + 0.78 * Ta, torsoBot + 0.3 * HH, 8 * u), o.apron, 2.2 * u);
        p.stroke([[tcx - 0.5 * Ta, chin + 0.22 * HH], [tcx - 0.3 * Ta, chin - 0.05 * HH]], 2 * u, shade(o.apron, 0.7));
        p.stroke([[tcx + 0.5 * Ta, chin + 0.22 * HH], [tcx + 0.3 * Ta, chin - 0.05 * HH]], 2 * u, shade(o.apron, 0.7));
      }
      if (o.tie) {
        const tx = tcx + 2 * u * facingC;
        p.poly([[tx - 14 * u, chin - 4 * u], [tx + 14 * u, chin - 4 * u], [tx, chin + 0.16 * HH]], "#f8f6f0", 1.8 * u);
        p.poly([[tx - 4.5 * u, chin + 6 * u], [tx + 4.5 * u, chin + 6 * u], [tx + 7 * u, chin + 0.56 * HH], [tx, chin + 0.66 * HH], [tx - 7 * u, chin + 0.56 * HH]], o.tie, 1.8 * u);
      }
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * Ta, chin - 0.05 * HH], [tcx + s * 0.8 * Ta, torsoBot - 0.1 * HH]], o.belt, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * Ta, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.bandolier) {
        p.band([[tcx - 0.8 * Ta, chin - 0.05 * HH], [tcx + 0.8 * Ta, torsoBot - 0.1 * HH]], o.bandolier, 7 * u, 1.8 * u);
        for (let k = 0.15; k < 0.9; k += 0.14) {
          const x = tcx - 0.8 * Ta + 1.6 * Ta * k, y = chin - 0.05 * HH + (torsoBot - chin - 0.05 * HH) * k;
          p.dot(x, y, 2.2 * u, "#e8c45a");
        }
      }
      if (o.sash) p.band([[tcx - 1.3 * Ta, torsoBot - 0.32 * HH], [tcx + 1.3 * Ta, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      if (!o.noButtons && !o.tie && !o.apron) for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        if (o.vest && i === 0) continue;
        p.dot(tcx + 2 * u * facingC, y, 3 * u, INK); p.dot(tcx + 2 * u * facingC, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash && !side && !back) { const s = facingC || 1; p.poly([[tcx + s * 0.55 * Ta, torsoBot - 0.3 * HH], [tcx + s * 0.75 * Ta, torsoBot + 0.05 * HH], [tcx + s * 0.45 * Ta, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    if (o.scarf) p.poly(rrect(tcx - 0.55 * Ta, chin - 0.06 * HH, tcx + 0.55 * Ta, chin + 0.1 * HH, 5 * u), o.scarf, 2 * u);
    p.inkRing(tp, ow, thick);
    // chain + flag patch on top of the torso
    if (o.chain && !back) {
      if (side) p.arc(tcx + 0.55 * Ta, chin + 0.12 * HH, 0.35 * Ta, 0.22 * HH, 10, 170, 2.6 * u, o.chain);
      else { p.arc(tcx, chin + 0.02 * HH, 0.48 * Ta, 0.3 * HH, 15, 165, 2.6 * u, o.chain); p.ell(tcx, chin + 0.31 * HH, 4.5 * u, 4.5 * u, o.chain, 1.4 * u); }
    }
    if (o.flag) {
      const fw = 0.5 * Ta, fh = 0.33 * Ta;
      const [fx, fy] = side ? [tcx - 0.1 * Ta, chin + 0.1 * HH] : back ? [tcx - fw / 2, chin + 0.14 * HH] : [tcx - (facingC ? 0.7 : 0.62) * Ta, chin + 0.16 * HH];
      drawFlag(p, o.flag, fx, fy, fw, fh, 1.6 * u);
    }
  }

  // 6. props in front of the body (not above the head)
  for (const sp of J.props) if (sp.layer !== "back" && !sp.above) drawProp(sp);
  // 7. front arms, then 8. ink-dot hands of every gripping arm on top of its prop
  for (const a of J.arms) if (a.front && !a.above) drawArm(a);
  for (const a of J.arms) if (a.grip && !a.front && !a.above) drawArm(a, true);

  // 9. head (rotates with the body + its own tilt about the chin)
  const H0 = headBlob(seed, Bd.a, side ? 1 : facingC);
  const H: Blob = side ? { ...H0, asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) } : H0;
  const hx = J.head.cx, hc = J.head.hc;
  p.tf = J.head.tilt ? affMul(Mup, rotAff(J.head.tilt, [hx, chin])) : Mup;
  drawHead(p, o, H, hx, hc, {
    view: J.view, facing: facingC, expr: f.expr ?? "neutral", look: clamp(f.look ?? 0, -1, 1), lid: lidOf(f.blink), light, seed, soot: f.soot,
  });

  // 10. above-head props + arms
  for (const sp of J.props) if (sp.above) drawProp(sp);
  for (const a of J.arms) if (a.above) drawArm(a);
  p.tf = null;
};

/** skeleton torso: collar bone, spine, four rib pairs, pelvis (bone colour, ink outline) */
const drawSkeletonTorso = (p: Pen, tcx: number, chin: number, torsoBot: number, Ta: number, HH: number, u: number, side: boolean) => {
  const sx = side ? tcx - 0.2 * Ta : tcx;
  p.line([[sx, chin - 0.02 * HH], [sx + (side ? -0.1 * Ta : 0), torsoBot - 0.12 * HH]], BONE, 4.4 * u);
  if (!side) p.line([[tcx - 0.9 * Ta, chin + 0.1 * HH], [tcx + 0.9 * Ta, chin + 0.1 * HH]], BONE, 3.6 * u);
  for (let i = 0; i < 4; i++) {
    const y = chin + 0.2 * HH + i * 0.15 * HH, w = Ta * (0.92 - i * 0.12);
    for (const s of side ? [1] : [-1, 1]) {
      const pts = side ? curve([sx, y], [sx + 0.9 * w, y + 0.04 * HH], [sx + 0.7 * w, y + 0.12 * HH], 8)
        : curve([tcx, y], [tcx + s * w, y + 0.05 * HH], [tcx + s * 0.65 * w, y + 0.13 * HH], 8);
      p.line(pts, BONE, 3.2 * u);
    }
  }
  const py = torsoBot - 0.14 * HH;
  const pel: P2[] = side ? [[sx - 0.4 * Ta, py - 0.08 * HH], [sx + 0.5 * Ta, py - 0.1 * HH], [sx + 0.4 * Ta, py + 0.1 * HH], [sx - 0.3 * Ta, py + 0.12 * HH]]
    : [[tcx - 0.75 * Ta, py - 0.12 * HH], [tcx, py - 0.02 * HH], [tcx + 0.75 * Ta, py - 0.12 * HH], [tcx + 0.55 * Ta, py + 0.12 * HH], [tcx, py + 0.16 * HH], [tcx - 0.55 * Ta, py + 0.12 * HH]];
  p.poly(smoothClosed(pel, 2), BONE, 2.4 * u);
  void lerp2;
};

/** draw a prop alone (world prop cards, galleries): origin at (ox, oy) canvas, angle in degrees, scale = units per PU */
export const drawPropAt = (p: Pen, name: string, ox: number, oy: number, angleDeg: number, st: PropState = {}, scale = PU) => {
  const def = PROPS[name], a = rad(angleDeg), c = Math.cos(a) * (scale / PU), s = Math.sin(a) * (scale / PU);
  p.tf = [c, s, -s, c, ox, oy];
  def.draw(p, PU, st);
  p.tf = null;
};
