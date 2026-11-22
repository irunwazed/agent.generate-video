// KIT TOON: heads, faces and hats (ported from merdeka toon.ts) + kit additions:
//  - a BACK view of the head (climbing, walking away, over-the-shoulder shots)
//  - hats: peci, helmet, caping, headband (incl. "merahputih"), blangkon, hijab, wide (brimmed hat), beret, bun
//  - expressions: angry, battle (war cry), aim (one eye shut), sad, think
import {
  P2, C3, Pen, INK, WHITE, SKIN, rad, rnd, rotPts, mul, shade, SH_SKIN, SH_CLOTH, SH_FELT, ellPts, rrect, taper,
} from "./pen";
import type { Outfit } from "./outfits";

const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
export const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick" | "angry" | "battle" | "aim" | "sad" | "think";
export const EXPRS: Expr[] = ["neutral", "smile", "smile_closed", "grin", "laugh", "stern", "angry", "battle", "aim", "think",
  "nervous", "shock", "sad", "relief", "relief_open", "whistle", "dazed", "pained", "lick"];
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral" | "angry" | "sad";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick" | "shout" | "flat";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; mouth: MouthK; tear?: boolean }> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
  angry: { eye: ["angry", "angry"], brow: [5, -3], mouth: "frown" },
  battle: { eye: ["angry", "angry"], brow: [6, -3], mouth: "shout" },
  aim: { eye: ["squeeze", "angry"], brow: [4, -2], mouth: "flat" },
  sad: { eye: ["sad", "sad"], brow: [-4, 4], mouth: "frown", tear: true },
  think: { eye: ["dot", "dot"], brow: [-3, 1], mouth: "flat" },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
export const lidOf = (b: boolean | number | undefined) => (b === true ? 1 : Number(b) || 0);

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "angry": p.ell(lx, ey + u, 4.2 * u, 4.6 * u, INK, 0); break;
    case "sad": p.ell(lx, ey + u, 3.8 * u, 5 * u, INK, 0); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      break;
    default: {
      const s: P2[] = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "flat": p.stroke([[mx - 6 * u * k, my], [mx + 6 * u * k, my]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "shout": { // war cry: tall open mouth, teeth band on top
      p.ell(mx, my + 3 * u, 11 * u * k, 13 * u, MOUTH, 3.2 * u);
      p.clip(ellPts(mx, my + 3 * u, 11 * u * k, 13 * u), () => p.poly(rrect(mx - 12 * u * k, my - 11 * u, mx + 12 * u * k, my - 5 * u, u), WHITE, 0));
      p.ell(mx, my + 3 * u, 11 * u * k, 13 * u, null, 3.2 * u);
      break;
    }
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
};

/** face (front / 3-4): u = 1 % of the head width W. Eyes 26u apart, brows 20u up, mouth 20u down, slid toward facing. */
export const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look);
    if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  mouth(p, F.mouth, mx, my, u);
  drawMoustache(p, moustache, mx, cy, u, stout);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
  if (F.tear) p.ell(fx + 13 * u * (facing || 1) + 2 * u, ey + 12 * u, 2.6 * u, 4.2 * u, "#9fd4ff", 1.6 * u);
};
const drawMoustache = (p: Pen, moustache: string | undefined, mx: number, cy: number, u: number, stout: boolean) => {
  if (moustache === "toothbrush") p.poly(rrect(mx - 6.5 * u, cy + 8.5 * u, mx + 6.5 * u, cy + 15.5 * u, 1.5 * u), INK, 0);
  else if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge */
export const faceSide = (p: Pen, hx: number, hy: number, W: number, expr: Expr, lid: number, brim: boolean, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
  if (F.tear) p.ell(ex + 2 * u, ey + 12 * u, 2.6 * u, 4.2 * u, "#9fd4ff", 1.6 * u);
};

// ---------------- hats ----------------
/** every hat name the kit draws (Outfit.hat) */
export const HATS = ["hair", "cap", "shako", "shako_tall", "tophat", "bonnet", "headphones", "peci", "helmet", "caping",
  "headband", "blangkon", "hijab", "wide", "beret", "bun", "bald", "astro", "alien", "kunti"] as const;
export type HatName = (typeof HATS)[number];
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
const hatCol = (o: Outfit, def: string) => o.hatCol ?? def;
/** hats that sit low on the brow (brows drawn lower) */
export const hasBrim = (o: Outfit) => ["shako", "shako_tall", "tophat", "peci", "helmet", "wide", "caping", "blangkon"].includes(o.hat ?? "");

/** parts of a hat that sit behind the head (bonnet, hijab drape, bun, long hair) */
export const hatBehind = (p: Pen, o: Outfit, H: { a: number; b: number; seed: number } & Blob, cx: number, hc: number, light: number, thick: number, ow: number, view: "front" | "side" | "back") => {
  const u = (2 * H.a) / 100, side = view === "side";
  if (o.hat === "bonnet") {
    const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
    p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
    p.inkRing(bb, ow * 0.85, thick);
  } else if (o.hat === "hijab") {
    const col = hatCol(o, "#3f7a6a");
    // drape: head outline grown + a cape over the shoulders
    const drape: P2[] = [
      [cx - H.a * 1.14, hc - H.b * 0.2], [cx - H.a * 1.08, hc - H.b * 0.9], [cx, hc - H.b * 1.16], [cx + H.a * 1.08, hc - H.b * 0.9],
      [cx + H.a * 1.14, hc - H.b * 0.2], [cx + H.a * 1.22, hc + H.b * 1.25], [cx, hc + H.b * 1.55], [cx - H.a * 1.22, hc + H.b * 1.25],
    ];
    const sm = smoothClosed(drape, 6);
    p.shadedFill(sm, col, mul(col, SH_CLOTH), light, H.a * 1.2);
    p.inkRing(sm, ow * 0.9, thick);
  } else if (o.hat === "bun" && view !== "back") {
    const col = o.hair ?? "#2a1d18";
    p.ell(cx + (side ? -H.a * 0.7 : 0), hc - H.b * (side ? 0.55 : 1.0), H.a * 0.36, H.b * 0.33, col, ow * 0.85);
  } else if (o.hat === "astro") {
    const dome = ellPts(cx, hc - 2 * (H.a / 50), H.a * 1.24, H.b * 1.25);
    p.shadedFill(dome, "#e4f2ff", "#9bb8dc", light, H.a * 1.24, 0.35);
    p.inkRing(dome, ow * 0.95, thick);
  } else if (o.hat === "kunti") {
    const hcol = o.hair ?? "#1a1423";
    const hairBack: P2[] = [[cx - H.a * 1.06, hc - H.b * 0.25], [cx + H.a * 1.06, hc - H.b * 0.25], [cx + H.a * 1.28, hc + H.b * 2.55],
      [cx + H.a * 0.85, hc + H.b * 2.75], [cx, hc + H.b * 2.45], [cx - H.a * 0.85, hc + H.b * 2.75], [cx - H.a * 1.28, hc + H.b * 2.55]];
    p.shadedFill(hairBack, hcol, mul(hcol, SH_FELT), light, H.a * 1.25, 0.35);
    p.poly(hairBack, null, ow * 0.9);
  }
  void u;
};

/** Chaikin smoothing of a closed polygon */
export const smoothClosed = (pts: P2[], it = 3): P2[] => {
  let q = pts;
  for (let k = 0; k < it; k++) {
    const r: P2[] = [];
    for (let i = 0; i < q.length; i++) {
      const a = q[i], b = q[(i + 1) % q.length];
      r.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    q = r;
  }
  return q;
};

/** contour of the head above y = cut (closed by the cut), for hair / caps */
const capArc = (hp: P2[], cx: number, hc: number, cut: number, extra?: (x: number, y: number) => boolean, grow = 1.03): P2[] => {
  const keep = (x: number, y: number) => y < cut || (!!extra && extra(x, y));
  const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
  return [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y)).map(([x, y]) => [cx + (x - cx) * grow, hc + (y - hc) * grow] as P2);
};

export const hatOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, seed: number, facing: number, view: "front" | "side" | "back") => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u, side = view === "side", back = view === "back";
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5));
  const R = (pts: P2[]) => rotPts(pts, a, cx, hc);
  const dg = (a * 180) / Math.PI;
  const sag = (yb: number, wb: number, s = 3): P2[] => {
    const base: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + s * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  const hat = o.hat ?? "";
  if (hat === "shako" || hat === "shako_tall") {
    const tall = hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      if (!back) {
        const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
        p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, dg);
        const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
        p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, dg);
        p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      }
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    }
  } else if (hat === "cap" || hat === "hair" || hat === "headband" || hat === "bun" || hat === "headphones") {
    const isCap = hat === "cap";
    const cut = back ? hc + 0.38 * H.b : crown + (isCap ? 0.3 : hat === "headphones" ? 0.36 : 0.42) * HH;
    const arc = capArc(hp, cx, hc, cut, side && !isCap ? (x, y) => x < cx - 6 * u && y < hc + 0.42 * H.b : undefined);
    if (arc.length >= 3) {
      if (!isCap) { const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0]; for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]); }
      const col = isCap ? (o.cap ?? hatCol(o, "#c0392b")) : (o.hair ?? "#2a1d18");
      p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
      p.poly(arc, null, ow);
      if (!isCap && !back) { const s = side ? -1 : facing || 1; p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u); }
      if (isCap && !back) {
        const col2 = shade(col, 0.8);
        if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), col2, ow);
        else { const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0]; p.ell(px, py, 32 * u, 0.06 * HH, col2, ow, 0, 180, dg); }
      }
    }
    if (hat === "bun" && back) p.ell(cx, hc - H.b * 0.55, H.a * 0.36, H.b * 0.33, o.hair ?? "#2a1d18", ow * 0.85);
    if (hat === "headband") {
      // ikat kepala: a band across the forehead, knot + tails on the far side. "merahputih" = red over white.
      const y = crown + 0.36 * HH, col = hatCol(o, "#d0312d"), rw = o.hatCol === "merahputih";
      const band = R([[cx - H.a * 1.04, y - 5 * u], [cx + H.a * 1.04, y - 5 * u], [cx + H.a * 1.04, y + 6 * u], [cx - H.a * 1.04, y + 6 * u]]);
      p.clip(hp, () => {
        if (rw) {
          p.poly(R([[cx - H.a * 1.1, y - 6 * u], [cx + H.a * 1.1, y - 6 * u], [cx + H.a * 1.1, y], [cx - H.a * 1.1, y]]), "#d0312d", 0);
          p.poly(R([[cx - H.a * 1.1, y], [cx + H.a * 1.1, y], [cx + H.a * 1.1, y + 6 * u], [cx - H.a * 1.1, y + 6 * u]]), "#f6f1e7", 0);
        } else p.poly(band, col, 0);
      });
      p.stroke(R([[cx - H.a * 1.02, y - 6 * u], [cx + H.a * 1.02, y - 6 * u]]), 1.4 * u);
      p.stroke(R([[cx - H.a * 1.02, y + 6.5 * u], [cx + H.a * 1.02, y + 6.5 * u]]), 1.4 * u);
      const kx = side ? -1 : back ? 1 : -(facing || 1);
      const [kx0, ky0] = R([[cx + kx * H.a * 0.98, y]])[0];
      p.ell(kx0, ky0, 5 * u, 5 * u, rw ? "#d0312d" : col, 1.6 * u);
      p.poly([[kx0, ky0], [kx0 + kx * 16 * u, ky0 + 22 * u], [kx0 + kx * 8 * u, ky0 + 24 * u]], rw ? "#f6f1e7" : col, 1.6 * u);
      p.poly([[kx0, ky0], [kx0 + kx * 22 * u, ky0 + 12 * u], [kx0 + kx * 18 * u, ky0 + 18 * u]], rw ? "#d0312d" : col, 1.6 * u);
    }
    if (hat === "headphones") {
      p.arc(cx, hc - 4 * u, H.a * 1.08, H.b * 1.08, 195, 345, 5.5 * u, "#2e323d");
      for (const s of [-1, 1]) { const [ex, ey] = R([[cx + s * (H.a * 1.03), hc + 4 * u]])[0]; p.ell(ex, ey, 9 * u, 16 * u, "#3c4250", ow * 0.8); }
    }
  } else if (hat === "peci") {
    // black songkok: a short flat-topped oval drum on the crown
    const col = hatCol(o, "#1d1b22"), yb = crown + 0.27 * HH, ht = 0.26 * HH, wb = 0.42 * W, wt = 0.39 * W;
    const off = side ? -4 * u : 0;
    const body = R([...sag(yb, wb, 4).reverse().map(([x, y]) => [x + off, y] as P2), [cx - wt + off, yb - ht], [cx + wt + off, yb - ht]]);
    p.shadedFill(body, col, shade(col, 0.6), light, wt, 0.4);
    p.poly(body, null, ow);
    p.stroke(R([[cx - wt * 0.8 + off, yb - ht + 5 * u], [cx + wt * 0.8 + off, yb - ht + 5 * u]]), 1.6 * u, "#4a4652");
  } else if (hat === "helmet") {
    // round army helmet: dome over the top half + a thin rim
    const col = hatCol(o, "#5b6b3a"), yb = crown + 0.4 * HH;
    const dome: P2[] = [];
    for (let i = 0; i <= 24; i++) { const t = Math.PI + (Math.PI * i) / 24; dome.push([cx + Math.cos(t) * H.a * 1.1, yb + Math.sin(t) * (0.5 * HH)]); }
    const D = R(dome);
    p.shadedFill(D, col, shade(col, 0.62), light, H.a * 1.1, 0.4);
    p.poly(D, null, ow);
    const rim = R(rrect(cx - H.a * 1.22, yb - 4 * u, cx + H.a * 1.22, yb + 5 * u, 4 * u));
    p.poly(rim, shade(col, 0.85), ow * 0.8);
    if (o.hatBadge && !back && !side) { const [bx, by] = R([[cx, yb - 0.24 * HH]])[0]; star(p, bx, by, 9 * u, o.hatBadge); }
  } else if (hat === "caping") {
    // wide conical farmer hat
    const col = hatCol(o, "#d9b26a"), yb = crown + 0.3 * HH, wb = 0.92 * W, apex = crown - 0.34 * HH;
    const cone = R([[cx - wb, yb], [cx, apex], [cx + wb, yb], [cx + wb * 0.55, yb + 7 * u], [cx - wb * 0.55, yb + 7 * u]]);
    p.shadedFill(cone, col, shade(col, 0.66), light, wb, 0.3);
    p.poly(cone, null, ow);
    for (const t of [-0.6, -0.3, 0, 0.3, 0.6]) p.stroke(R([[cx, apex + 6 * u], [cx + wb * t, yb + 3 * u]]), 1.4 * u, shade(col, 0.6));
  } else if (hat === "blangkon") {
    const col = hatCol(o, "#5b3a22"), cut = crown + 0.36 * HH;
    const arc = capArc(hp, cx, hc, cut, undefined, 1.05);
    if (arc.length >= 3) {
      p.shadedFill(arc, col, shade(col, 0.6), light, H.a, 0.35);
      p.clip(arc, () => { for (let i = -4; i <= 4; i++) p.stroke(R([[cx + i * 14 * u - 20 * u, crown], [cx + i * 14 * u + 20 * u, cut]]), 2 * u, "#c89a52"); });
      p.poly(arc, null, ow);
      if (side || back) p.ell(cx - (side ? H.a * 0.95 : 0), cut - (back ? 6 * u : 4 * u), 13 * u, 11 * u, col, ow * 0.85); // mondolan knot
    }
  } else if (hat === "hijab") {
    const col = hatCol(o, "#3f7a6a");
    if (back) { p.shadedFill(hp, col, mul(col, SH_CLOTH), light, H.a); p.inkRing(hp, ow, 0); return; }
    // frame the face: fabric = head outline minus an inner face oval
    const fcx = cx + (side ? 12 * u : 5 * u * facing), fcy = hc + 0.1 * H.b;
    const inner = ellPts(fcx, fcy, H.a * (side ? 0.66 : 0.78), H.b * 0.78);
    const g = p.g, outer = hp.map(([x, y]) => [cx + (x - cx) * 1.06, hc + (y - hc) * 1.06] as P2);
    const ring = new Path2D();
    outer.forEach(([x0, y0], i) => { const [x, y] = p.P(x0, y0); if (i) ring.lineTo(x, y); else ring.moveTo(x, y); });
    ring.closePath();
    inner.forEach(([x0, y0], i) => { const [x, y] = p.P(x0, y0); if (i) ring.lineTo(x, y); else ring.moveTo(x, y); });
    ring.closePath();
    g.fillStyle = col; g.fill(ring, "evenodd");
    p.poly(outer, null, ow);
    p.poly(inner, null, ow * 0.7);
  } else if (hat === "wide") {
    // brimmed hat (fedora / cowboy / sun hat)
    const col = hatCol(o, "#c9a46a"), yb = crown + 0.24 * HH, ht = 0.4 * HH, wb = 0.36 * W, wt = 0.3 * W;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht + 6 * u], [cx - wt * 0.3, yb - ht], [cx, yb - ht + 8 * u], [cx + wt * 0.3, yb - ht], [cx + wt, yb - ht + 6 * u]]);
    p.shadedFill(body, col, shade(col, 0.66), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.08 * HH], [cx + wt + 4 * u, yb - 0.08 * HH]]), shade(col, 0.55), 0.08 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, (side ? 0.62 : 0.72) * W, 0.07 * HH, shade(col, 0.9), ow, 0, 360, dg);
  } else if (hat === "beret") {
    const col = hatCol(o, "#7a1f2b"), yb = crown + 0.26 * HH;
    const B = R(ellPts(cx + 12 * u, yb - 0.1 * HH, H.a * 1.0, 0.2 * HH, 0, 360, -6));
    p.shadedFill(B, col, shade(col, 0.6), light, H.a, 0.35);
    p.poly(B, null, ow);
    const [tx, ty] = R([[cx + 10 * u, yb - 0.31 * HH]])[0];
    p.dot(tx, ty, 3.5 * u);
  } else if (hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = hatCol(o, "#2e2a36");
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, dg);
  } else if (hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
  } else if (hat === "alien") {
    for (const s of [-1, 1]) {
      const [ax0, ay0] = R([[cx + s * 18 * u, crown + 6 * u]])[0], [ax1, ay1] = R([[cx + s * 32 * u, crown - 28 * u]])[0];
      p.stroke([[ax0, ay0], [ax1, ay1]], 4.2 * u, INK);
      p.ell(ax1, ay1, 8.5 * u, 8.5 * u, "#38ff9c", ow * 0.8);
    }
  } else if (hat === "kunti") {
    const arc = capArc(hp, cx, hc, crown + 0.34 * HH);
    if (arc.length >= 3) { const hcol = o.hair ?? "#1a1423"; p.shadedFill(arc, hcol, mul(hcol, SH_FELT), light, H.a, 0.35); p.poly(arc, null, ow); }
  }
  // "bald" and "astro" draw nothing on top
};

/** five-point star badge */
export const star = (p: Pen, x: number, y: number, r: number, col: string) => {
  const pts: P2[] = [];
  for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.45 : r, b = rad(k * 36 - 90); pts.push([x + rr * Math.cos(b), y + rr * Math.sin(b)]); }
  p.poly(pts, col, r * 0.18);
};

export type HeadOpts = {
  view: "front" | "side" | "back"; facing: number; expr: Expr; look: number; lid: number; light: number; seed: number;
};
/** the whole head at (cx, hc): hat behind, skin, outline, hat on, face, glasses. Uses the pen's current transform. */
export const drawHead = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, ho: HeadOpts) => {
  const W = 2 * H.a, u = W / 100, ow = 5 * u, thick = thickAngle(ho.light), skin = o.skin ?? SKIN;
  hatBehind(p, o, H, cx, hc, ho.light, thick, ow, ho.view);
  const hp = blobPts(cx, hc, H);
  if (ho.view === "back") {
    // back of the head: skin outline, then hair / hat covers nearly all of it (a hijab drape covers it all)
    if (o.hat === "hijab") return;
    p.shadedFill(hp, skin, mul(skin, SH_SKIN), ho.light, H.a);
    p.inkRing(hp, ow, thick);
    if (o.hat === "hair" || o.hat === "headband" || o.hat === "bun" || o.hat === "headphones" || !o.hat || o.hat === "bald") {
      if (o.hat !== "bald") {
        const col = o.hair ?? "#2a1d18";
        const arc = capArc(hp, cx, hc, hc + 0.55 * H.b);
        if (arc.length >= 3) { p.shadedFill(arc, col, mul(col, SH_FELT), ho.light, H.a, 0.35); p.poly(arc, null, ow * 0.9); }
      }
    }
    hatOn(p, o, hp, H, cx, hc, ho.light, ho.seed, 0, "back");
    return;
  }
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), ho.light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, cx, hc, ho.light, ho.seed, ho.facing, ho.view);
  const brim = hasBrim(o);
  if (ho.view === "side") faceSide(p, cx, hc, W, ho.expr, ho.lid, brim, o.moustache, o.build === "stout");
  else faceFront(p, cx, hc, W, ho.expr, ho.facing, ho.look, ho.lid, brim, skin, o.moustache, o.build === "stout");
  if (o.glasses) {
    if (ho.view === "side") {
      const gx = cx + 27 * u, gy = hc + u;
      p.ell(gx, gy, 9.5 * u, 8.5 * u, null, 2.2 * u);
      p.stroke([[gx - 9.5 * u, gy - u], [cx - 10 * u, gy - 3 * u]], 2.2 * u);
    } else {
      const gx = cx + 8 * u * ho.facing + 5 * u * ho.look, gy = hc + 1 * u;
      p.ell(gx - 13 * u, gy, 9.5 * u, 8.5 * u, null, 2.2 * u);
      p.ell(gx + 13 * u, gy, 9.5 * u, 8.5 * u, null, 2.2 * u);
      p.stroke([[gx - 3.5 * u, gy - 1 * u], [gx + 3.5 * u, gy - 1 * u]], 2.2 * u, INK);
    }
  }
  if (o.beard) {
    const col = o.beard, chin = hc + H.b;
    const bx = ho.view === "side" ? cx + 18 * u : cx + 6 * u * ho.facing;
    p.clip(hp, () => p.ell(bx, chin - 4 * u, 0.62 * H.a, 0.42 * H.b, col, 0));
    p.inkRing(hp, ow, thick);
  }
};

export type { C3 };
