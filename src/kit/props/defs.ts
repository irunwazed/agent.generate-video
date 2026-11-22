// KIT PROPS: every hand-held object, how it is drawn, where it is gripped and its named HOLD STYLES.
// PURE module (drawing functions only run when called): the validator imports it in Node.
//
// Local frame of a prop, in PU (1 PU = 222 design units = one adult head):
//  - LONG props (rifle, spear, stick, sword...): +x runs along the shaft from the butt (x = 0) to the tip.
//    +y is the "underside" (trigger guard, blade edge, hammer face). Grips sit on the shaft.
//  - SMALL props (phone, cup, paper...): origin = where the hand holds it; the item is drawn upright (-y is up).
//  - BOX props (box, crate): origin = centre; grips on the left / right sides (two hands).
//  - BOW: origin = the bow grip, +x = shooting direction, limbs along y, string behind (-x).
// A HoldStyle pins one prop point (`pin`) to a body anchor (`at` + `pos`) and sets the prop angle; the arms then reach the grips (IK), so the
// ink-dot hands always sit ON the prop. A style uses the off grip ONLY when it names an `off` arm (two-hand styles do).
import { Pen, P2, INK, WHITE, rrect, ellPts, rad, lerp2 } from "../toon/pen";
import type { HoldStyle, PropState } from "../rig/types";

export const PU = 222;

export type PropClass = "long" | "blade" | "tool" | "small" | "box" | "bow" | "pistol" | "shield";
export type PropDef = {
  name: string;
  /** short description (docs / galleries) */
  label: string;
  cls: PropClass;
  grips: { main: P2; off?: P2 };
  /** named points in local PU: tip, muzzle, face (striking point), flame, centre... */
  points: Record<string, P2>;
  /** local bbox [x0, y0, x1, y1] in PU, all states (card sizing, prop cards) */
  bounds: [number, number, number, number];
  twoHand?: boolean;
  /** how it rests on a surface in the world: flat (lies flat), stand (upright), lie (long prop lying on its side) */
  rest: "flat" | "stand" | "lie";
  styles: Record<string, HoldStyle>;
  defStyle: string;
  /** dynamic off grip (bow string) */
  offGrip?: (st: PropState) => P2;
  draw: (p: Pen, U: number, st: PropState) => void;
};

const OLK = 0.026; // prop outline weight in PU (~0.8 x the character outline)
const WOOD = "#8a5530", WOOD_L = "#b07a48", STEEL = "#c9ced6", STEEL_D = "#7d848e", GUN = "#3d4148";
const BAMBOO = "#bcc468", BAMBOO_D = "#8f9a45";

/** helpers that draw in PU (multiply by U) */
const mk = (p: Pen, U: number) => {
  const ol = OLK * U;
  const P = (pts: P2[]): P2[] => pts.map(([x, y]) => [x * U, y * U]);
  return {
    ol, U,
    poly: (pts: P2[], fill: string | null, w = ol) => p.poly(P(pts), fill, w),
    rr: (x0: number, y0: number, x1: number, y1: number, r: number, fill: string, w = ol) => p.poly(rrect(x0 * U, y0 * U, x1 * U, y1 * U, r * U), fill, w),
    ell: (cx: number, cy: number, rx: number, ry: number, fill: string | null, w = ol, rot = 0) => p.poly(ellPts(cx * U, cy * U, rx * U, ry * U, 0, 360, rot), fill, w),
    line: (pts: P2[], w: number, col = INK) => p.stroke(P(pts), w * U, col),
    band: (pts: P2[], fill: string, w: number) => p.band(P(pts), fill, w * U, ol * 0.6, "round"),
    dot: (x: number, y: number, r: number, col = INK) => p.dot(x * U, y * U, r * U, col),
    text: (s: string, x: number, y: number, size: number, col = INK, maxW = 0) => p.text(s, x * U, y * U, size * U, col, 800, maxW * U),
  };
};

/** muzzle flash star at the tip (st.flash 0..1) */
const flash = (d: ReturnType<typeof mk>, at: P2, k: number) => {
  if (!k) return;
  const r = 0.34 * k, pts: P2[] = [];
  for (let i = 0; i < 14; i++) { const a = rad(i * (360 / 14)), rr = i % 2 ? r * 0.42 : r * (i % 4 ? 0.8 : 1.15); pts.push([at[0] + 0.12 * k + rr * Math.cos(a) * 1.2, at[1] + rr * Math.sin(a) * 0.8]); }
  d.poly(pts, "#ffd84a", d.ol * 0.8);
  d.ell(at[0] + 0.1 * k, at[1], 0.12 * k, 0.08 * k, WHITE, 0);
};

// =====================================================================================================================
// HOLD STYLE TABLES (canonical: facing screen-right; offsets in HH from the anchor; angles in degrees)
// Front-view anchors of an adult, relative to the feet: hip (0, -1.52), chest (0, -2.2), shoulderF (0.34, -2.38),
// shoulderB (-0.34, -2.38), head (0, -3.0). Arm length ~0.98 HH. Side view: one shoulder at ~(0.04, -2.37).
// =====================================================================================================================
const RIFLE_STYLES: Record<string, HoldStyle> = {
  order: { at: "ground", pos: [0.46, 0], pin: "butt", angle: -92, mainAt: 1.36, main: "F", off: null, note: "standing at attention: butt on the ground by the foot, hand high on the stock" },
  shoulder: { at: "shoulderF", pos: [-0.06, 0.55], pin: "butt", angle: -80, mainAt: 0.1, main: "F", note: "shoulder arms (marching): hand on the butt, barrel up over the shoulder" },
  port: { at: "chest", pos: [0.25, 0.55], pin: "main", angle: -125, main: "F", off: "B", note: "port arms: diagonal across the chest, both hands" },
  carry: { at: "shoulderF", pos: [0.2, 0.9], pin: "main", mainAt: 0.9, angle: 12, main: "F", note: "carried low in one hand at the balance point" },
  ready: { view: "side", at: "shoulderF", pos: [0.32, 0.5], pin: "main", angle: -12, main: "B", off: "F", body: { lean: 4, expr: "stern" }, note: "profile, low ready, both hands, muzzle slightly down" },
  aim: { view: "side", at: "shoulderF", pos: [0.1, 0.06], pin: "butt", angle: -1, offAt: 0.88, main: "B", off: "F", body: { lean: 6, headTilt: 10, expr: "aim" }, note: "profile, butt in the shoulder, cheek on the stock" },
  fire: { view: "side", at: "shoulderF", pos: [0.1, 0.06], pin: "butt", angle: -1, offAt: 0.88, main: "B", off: "F", body: { lean: 6, headTilt: 10, expr: "aim" }, st: { flash: 1 }, note: "aim + muzzle flash (use the aimFire action for recoil timing)" },
  kneel_aim: { view: "side", at: "shoulderF", pos: [0.1, 0.06], pin: "butt", angle: -1, offAt: 0.88, main: "B", off: "F", body: { lean: 4, headTilt: 10, expr: "aim", stance: "kneel" }, note: "kneeling, aiming" },
  raise: { at: "shoulderF", pos: [0.3, -0.72], pin: "main", mainAt: 0.75, angle: -82, main: "F", off: null, body: { expr: "battle", armB: { to: [-0.45, -0.72] } }, note: "rifle raised high in one hand (victory / protest)" },
  sling: { at: "chest", pos: [-0.02, 0.05], pin: "mid", angle: -62, main: null, off: null, layer: "back", note: "slung on the back, hands free" },
};

const SPEAR_STYLES: Record<string, HoldStyle> = {
  upright: { at: "ground", pos: [0.5, 0], pin: "butt", angle: -91, mainAt: 2.05, main: "F", off: null, note: "standing guard: butt on the ground, tip high above the head" },
  carry: { at: "shoulderF", pos: [-0.04, 0.5], pin: "main", mainAt: 1.25, angle: -74, main: "F", note: "on the shoulder while marching" },
  ready: { at: "chest", pos: [0.18, 0.6], pin: "main", mainAt: 1.0, offAt: 1.45, angle: -38, main: "F", off: "B", body: { expr: "stern" }, note: "guard: diagonal, both hands, tip forward-up" },
  charge: { view: "side", at: "hip", pos: [0.08, -0.22], pin: "main", mainAt: 1.0, offAt: 1.82, angle: -7, main: "B", off: "F", body: { lean: 10, stance: "lunge", expr: "battle" }, note: "profile charge: level, both hands, lunge" },
  thrust: { view: "side", at: "hip", pos: [0.42, -0.28], pin: "main", mainAt: 1.0, offAt: 1.82, angle: -5, main: "B", off: "F", body: { lean: 16, stance: "lunge", expr: "battle" }, note: "the stab itself (use the thrust action)" },
  raise: { at: "shoulderF", pos: [0.28, -0.66], pin: "main", mainAt: 1.8, offAt: 1.3, angle: -88, main: "F", off: "B", body: { expr: "battle" }, note: "raised up high, both hands (war cry)" },
};

const STICK_STYLES: Record<string, HoldStyle> = {
  cane: { at: "ground", pos: [0.55, 0], pin: "butt", angle: -97, mainAt: 1.6, main: "F", note: "walking stick: tip on the ground, hand on top" },
  diag: { at: "chest", pos: [0.2, 0.55], pin: "main", mainAt: 0.55, offAt: 1.1, angle: -122, main: "F", off: "B", note: "staff held across the body, both hands" },
  raise: { at: "shoulderF", pos: [0.4, -0.58], pin: "main", mainAt: 0.15, angle: -62, main: "F", body: { expr: "angry" }, note: "swing wind-up, stick up beside the head" },
  strike: { at: "shoulderF", pos: [0.68, 0.3], pin: "main", mainAt: 0.15, angle: 28, main: "F", body: { lean: 8, expr: "angry" }, note: "swing end / hit" },
  point: { at: "shoulderF", pos: [0.62, 0.22], pin: "main", mainAt: 0.1, angle: -12, main: "F", note: "pointing with the stick (teacher)" },
  carry: { at: "shoulderF", pos: [0.2, 0.9], pin: "main", mainAt: 0.85, angle: 10, main: "F", note: "carried at the side" },
  shoulder: { at: "shoulderF", pos: [-0.04, 0.5], pin: "main", mainAt: 0.5, angle: -70, main: "F", note: "on the shoulder" },
};

const SWORD_STYLES: Record<string, HoldStyle> = {
  sheathed: { at: "hip", pos: [-0.16, 0.0], pin: 0.38, angle: 112, main: null, layer: "front", st: { sheathed: 1 }, note: "in its scabbard at the hip, hands free" },
  hand_on_hilt: { at: "hip", pos: [-0.16, 0.0], pin: 0.38, angle: 112, mainAt: 0.2, main: "B", layer: "front", st: { sheathed: 1 }, note: "sheathed, hand resting on the hilt" },
  ready: { at: "chest", pos: [0.14, 0.62], pin: "main", angle: -62, main: "F", off: "B", body: { expr: "stern" }, note: "two hands in front of the belly, blade up-forward" },
  raise: { view: "side", at: "shoulderF", pos: [-0.32, 0.1], pin: "main", angle: -115, main: "F", off: "B", body: { lean: -8, expr: "battle" }, note: "wind-up over the back shoulder, blade up behind the head (slash action start)" },
  slash: { view: "side", at: "shoulderF", pos: [0.62, 0.42], pin: "main", angle: 22, main: "F", off: "B", body: { lean: 14, stance: "lunge", expr: "battle" }, note: "end of the cut (slash action end)" },
  point: { at: "shoulderF", pos: [0.72, 0.12], pin: "main", angle: -8, main: "F", body: { expr: "stern" }, note: "one hand, blade pointed at someone" },
  rest: { at: "chest", pos: [0.22, 0.42], pin: "main", angle: -72, main: "F", note: "blade resting on the shoulder" },
  low: { at: "shoulderF", pos: [0.22, 0.9], pin: "main", angle: 68, main: "F", note: "held low, point down" },
};

const PARANG_STYLES: Record<string, HoldStyle> = {
  low: { at: "shoulderF", pos: [0.2, 0.9], pin: "main", angle: 72, main: "F", note: "held low at the side, blade down" },
  ready: { at: "shoulderF", pos: [0.5, 0.45], pin: "main", angle: -28, main: "F", body: { expr: "stern" }, note: "held forward, blade up" },
  raise: { at: "shoulderF", pos: [0.42, -0.58], pin: "main", angle: -70, main: "F", body: { expr: "battle" }, note: "raised beside the head to chop (chop action start)" },
  chop: { at: "shoulderF", pos: [0.66, 0.36], pin: "main", angle: 38, main: "F", body: { lean: 10, expr: "battle" }, note: "end of the chop (chop action end; give a target to hit a point)" },
  show: { at: "chest", pos: [0.3, 0.1], pin: "main", angle: -75, main: "F", note: "held up, looking at the blade" },
  belt: { at: "hip", pos: [0.32, 0.06], pin: "mid", angle: 96, main: null, st: { sheathed: 1 }, note: "in its sheath at the belt" },
};

const AXE_STYLES: Record<string, HoldStyle> = {
  low: { at: "shoulderF", pos: [0.2, 0.9], pin: "main", angle: 76, main: "F", note: "held at the side, head down" },
  rest: { at: "chest", pos: [0.22, 0.4], pin: "main", angle: -72, main: "F", note: "resting on the shoulder" },
  raise: { at: "shoulderF", pos: [0.42, -0.58], pin: "main", angle: -70, main: "F", body: { expr: "stern" }, note: "raised beside the head (chop action start)" },
  chop: { at: "shoulderF", pos: [0.66, 0.36], pin: "main", angle: 38, main: "F", body: { lean: 10, expr: "stern" }, note: "end of the chop (give a target: wood, a tree)" },
};
const ARROW_STYLES: Record<string, HoldStyle> = {
  hold: { at: "chest", pos: [0.3, 0.3], pin: "mid", angle: -78, main: "F", note: "arrow held upright" },
  give: { at: "shoulderF", pos: [0.8, 0.3], pin: "mid", angle: -10, main: "F", note: "arrow held out" },
};
const HAMMER_STYLES: Record<string, HoldStyle> = {
  hold: { at: "shoulderF", pos: [0.2, 0.9], pin: "main", angle: 80, main: "F", note: "held at the side, head down" },
  rest: { at: "shoulderF", pos: [0.05, 0.35], pin: "main", angle: -95, main: "F", note: "resting on the shoulder" },
  raise: { at: "shoulderF", pos: [0.4, -0.55], pin: "main", angle: -75, main: "F", body: { expr: "stern" }, note: "raised beside the head (strike action start)" },
  strike: { at: "shoulderF", pos: [0.6, 0.5], pin: "main", angle: 12, main: "F", body: { lean: 8 }, note: "hit (strike action end; give a target so the face lands on it)" },
};
const SLEDGE_STYLES: Record<string, HoldStyle> = {
  hold: { at: "chest", pos: [-0.2, 0.65], pin: "main", angle: 20, offAt: 0.45, main: "B", off: "F", note: "two hands across the body, head down at the side" },
  raise: { view: "side", at: "shoulderF", pos: [-0.3, 0.12], pin: "main", angle: -118, main: "F", off: "B", body: { lean: -8, expr: "stern" }, note: "wind-up over the back shoulder" },
  strike: { view: "side", at: "hip", pos: [0.35, -0.2], pin: "main", angle: 32, main: "F", off: "B", body: { lean: 18 }, note: "hit (strike action end)" },
};
const HOE_STYLES: Record<string, HoldStyle> = {
  rest: { at: "ground", pos: [0.55, 0], pin: "butt", angle: -91, mainAt: 1.3, main: "F", note: "standing with the hoe upright" },
  shoulder: { at: "shoulderF", pos: [-0.05, 0.4], pin: "main", mainAt: 0.9, angle: -60, main: "F", note: "on the shoulder, going to the field" },
  raise: { view: "side", at: "shoulderF", pos: [-0.3, 0.12], pin: "main", angle: -120, main: "B", off: "F", body: { lean: -8 }, note: "wind-up over the back shoulder (dig action start)" },
  dig: { view: "side", at: "hip", pos: [0.24, -0.22], pin: "main", angle: 28, main: "B", off: "F", body: { lean: 18 }, note: "blade in the ground (dig action end)" },
};
const TONGS_STYLES: Record<string, HoldStyle> = {
  hold: { at: "chest", pos: [0.35, 0.55], pin: "main", angle: 18, main: "F", note: "holding the hot work over the anvil" },
  show: { at: "shoulderF", pos: [0.35, -0.1], pin: "main", angle: -40, main: "F", st: { hot: 1 }, note: "lifting the glowing blade to look at it" },
};
const TORCH_STYLES: Record<string, HoldStyle> = {
  up: { at: "shoulderF", pos: [0.32, -0.25], pin: "main", angle: -80, main: "F", st: { lit: 1 }, note: "held up, lighting the way" },
  low: { at: "shoulderF", pos: [0.24, 0.85], pin: "main", angle: -62, main: "F", st: { lit: 1 }, note: "carried at the side" },
};
const BROOM_STYLES: Record<string, HoldStyle> = {
  sweep: { view: "side", at: "chest", pos: [0.12, 0.2], pin: "main", mainAt: 0.2, offAt: 0.7, angle: 62, main: "B", off: "F", body: { lean: 10 }, note: "sweeping" },
  hold: { at: "ground", pos: [0.55, 0], pin: "tip", angle: 85, mainAt: 0.25, main: "F", note: "standing, broom upright (bristles on the ground)" },
};
const FLAG_STYLES: Record<string, HoldStyle> = {
  upright: { at: "ground", pos: [0.5, 0], pin: "butt", angle: -90, mainAt: 2.05, main: "F", note: "standing with the flag, pole on the ground" },
  raise: { at: "shoulderF", pos: [0.3, -0.68], pin: "main", mainAt: 1.1, angle: -80, main: "F", body: { expr: "battle", armB: { to: [-0.45, -0.7] } }, note: "flag raised high, other fist up" },
  carry: { at: "shoulderF", pos: [-0.04, 0.5], pin: "main", mainAt: 1.0, angle: -62, main: "F", note: "on the shoulder while marching" },
};
const BOW_STYLES: Record<string, HoldStyle> = {
  rest: { at: "shoulderF", pos: [0.22, 0.88], pin: "origin", angle: 0, main: "F", note: "bow held at the side" },
  nock: { view: "side", at: "shoulderF", pos: [0.62, 0.2], pin: "origin", angle: -20, main: "F", off: "B", st: { draw: 0.1, arrow: 1 }, body: { expr: "stern" }, note: "arrow on the string, not drawn yet" },
  draw: { view: "side", at: "shoulderF", pos: [0.9, -0.28], pin: "origin", angle: 0, main: "F", off: "B", st: { draw: 1, arrow: 1 }, body: { expr: "aim", headTilt: 4, armB: { to: [0, 0], bend: 1 } }, note: "full draw: bow arm straight, string hand at the jaw" },
  release: { view: "side", at: "shoulderF", pos: [0.9, -0.28], pin: "origin", angle: 0, main: "F", off: null, st: { draw: 0, arrow: 0 }, body: { expr: "aim", headTilt: 4, armB: { to: [-0.38, -0.3] } }, note: "just released: string straight, hand flicks back" },
};
const PISTOL_STYLES: Record<string, HoldStyle> = {
  low: { at: "shoulderF", pos: [0.22, 0.9], pin: "origin", angle: 75, main: "F", note: "pointed at the ground" },
  aim: { at: "shoulderF", pos: [0.9, 0.02], pin: "origin", angle: 0, main: "F", body: { expr: "aim" }, note: "one arm straight out to the facing side" },
  aim2: { view: "side", at: "shoulderF", pos: [0.84, 0.06], pin: "origin", angle: 0, main: "F", off: "B", body: { expr: "aim", headTilt: 4 }, note: "profile, two hands" },
  fire: { at: "shoulderF", pos: [0.9, 0.02], pin: "origin", angle: -4, main: "F", st: { flash: 1 }, body: { expr: "aim" }, note: "aim + muzzle flash" },
  up: { at: "shoulderF", pos: [0.28, -0.5], pin: "origin", angle: -90, main: "F", note: "pointed at the sky (warning shot)" },
  holster: { at: "hip", pos: [0.36, 0.12], pin: "origin", angle: 90, main: null, note: "in the holster at the hip" },
};
const SHIELD_STYLES: Record<string, HoldStyle> = {
  guard: { at: "chest", pos: [-0.08, 0.38], pin: "origin", angle: 0, main: "B", layer: "front", note: "held in front of the body by the back arm" },
  side: { at: "shoulderB", pos: [-0.22, 0.75], pin: "origin", angle: 0, main: "B", note: "held at the side" },
};
const SMALL_STYLES: Record<string, HoldStyle> = {
  hold: { at: "chest", pos: [0.32, 0.22], pin: "origin", angle: 0, main: "F", note: "held in front of the chest" },
  low: { at: "shoulderF", pos: [0.2, 0.9], pin: "origin", angle: 0, main: "F", note: "carried at the side" },
  show: { at: "shoulderF", pos: [0.5, -0.05], pin: "origin", angle: 0, main: "F", body: { expr: "smile" }, note: "shown forward at shoulder height" },
  high: { at: "shoulderF", pos: [0.45, -0.8], pin: "origin", angle: 0, main: "F", body: { expr: "smile" }, note: "held up high to show (idea, sketch, trophy)" },
  look: { at: "chest", pos: [0.24, -0.08], pin: "origin", angle: -8, main: "F", body: { headTilt: 6, headDy: 0.04 }, note: "looking at it (phone, letter, mirror)" },
  ear: { at: "head", pos: [0.4, 0.16], pin: "origin", angle: -12, main: "F", aboveHead: true, note: "phone at the ear" },
  mouth: { at: "mouth", pos: [0.14, 0.12], pin: "origin", angle: -25, main: "F", aboveHead: true, note: "drinking / eating / speaking into it" },
  give: { at: "shoulderF", pos: [0.85, 0.32], pin: "origin", angle: 0, main: "F", note: "held out to someone (handOver)" },
};
const BOX_STYLES: Record<string, HoldStyle> = {
  carry: { at: "chest", pos: [0, 0.72], pin: "origin", angle: 0, main: "F", off: "B", note: "carried in front with both hands" },
  lift: { at: "head", pos: [0, -0.5], pin: "origin", angle: 0, main: "F", off: "B", aboveHead: true, body: { expr: "pained" }, note: "lifted over the head" },
  head: { at: "head", pos: [0, -0.66], pin: "origin", angle: 0, main: null, off: null, aboveHead: true, note: "balanced on the head (junjung), hands free" },
  shoulder: { at: "shoulderF", pos: [0.06, -0.2], pin: "origin", angle: -10, main: "F", off: null, note: "on the shoulder (sack)" },
};

// =====================================================================================================================
// DRAWINGS
// =====================================================================================================================
const drawRifle = (p: Pen, U: number, st: PropState) => {
  const d = mk(p, U);
  if (st.bayonet) { d.poly([[1.72, -0.07], [2.12, -0.045], [1.72, -0.02]], STEEL, d.ol * 0.8); }
  d.band([[0.72, -0.05], [1.75, -0.04]], "#8d949c", 0.045);                    // barrel
  d.poly([[0.72, -0.035], [1.3, -0.03], [1.33, 0.02], [1.3, 0.045], [0.72, 0.05]], WOOD, d.ol);  // handguard
  d.poly([[0, -0.07], [0.42, -0.045], [0.45, 0.045], [0.14, 0.12], [0, 0.145]], WOOD, d.ol);    // stock
  d.line([[0.06, -0.02], [0.3, -0.03]], 0.012, WOOD_L);
  d.poly([[0.42, -0.06], [0.74, -0.06], [0.74, 0.05], [0.42, 0.05]], GUN, d.ol);                  // receiver
  d.line([[0.62, -0.06], [0.66, -0.13]], 0.025, GUN); d.dot(0.665, -0.135, 0.022, GUN);          // bolt
  p.stroke([[0.5 * U, 0.05 * U], [0.5 * U, 0.1 * U], [0.6 * U, 0.1 * U], [0.6 * U, 0.05 * U]], d.ol * 0.8);  // trigger guard
  for (const x of [1.02, 1.28]) d.line([[x, -0.065], [x, 0.05]], 0.02, STEEL_D);
  d.poly([[1.7, -0.06], [1.72, -0.1], [1.74, -0.06]], GUN, d.ol * 0.6);
  flash(d, [1.78, -0.04], st.flash ?? 0);
};
const drawPistol = (p: Pen, U: number, st: PropState) => {
  const d = mk(p, U);
  d.poly([[-0.03, 0.0], [0.07, 0.0], [0.05, 0.17], [-0.07, 0.17]], "#4a3a30", d.ol);
  d.rr(-0.06, -0.09, 0.42, 0.0, 0.015, GUN);
  d.line([[0.03, 0.0], [0.08, 0.05], [0.12, 0.0]], 0.015);
  flash(d, [0.44, -0.045], st.flash ?? 0);
};
const drawKatana = (p: Pen, U: number, st: PropState) => {
  const d = mk(p, U);
  if (st.sheathed) {
    d.poly([[0.39, -0.045], [1.52, -0.08], [1.55, -0.03], [1.52, 0.0], [0.39, 0.04]], "#2a2230", d.ol);
    d.line([[0.55, -0.05], [0.55, 0.04]], 0.018, "#c9a54a");
  } else {
    d.poly([[0.39, -0.03], [1.0, -0.045], [1.5, -0.085], [1.42, -0.01], [0.95, 0.02], [0.39, 0.03]], "#e3e8ee", d.ol);
    d.line([[0.45, 0.012], [1.35, -0.025]], 0.01, WHITE);
  }
  d.ell(0.38, 0, 0.03, 0.085, "#c9a54a");
  d.rr(0, -0.036, 0.37, 0.036, 0.02, "#2a2f4a");
  for (let x = 0.05; x < 0.34; x += 0.07) d.poly([[x, 0], [x + 0.035, -0.03], [x + 0.07, 0], [x + 0.035, 0.03]], "#e8dcc2", d.ol * 0.4);
};
const drawSword = (p: Pen, U: number, st: PropState) => {
  const d = mk(p, U);
  if (st.sheathed) d.poly([[0.32, -0.05], [1.36, -0.045], [1.42, 0], [1.36, 0.045], [0.32, 0.05]], "#5a3a2a", d.ol);
  else { d.poly([[0.32, -0.045], [1.25, -0.04], [1.42, 0], [1.25, 0.04], [0.32, 0.045]], "#e3e8ee", d.ol); d.line([[0.36, 0], [1.3, 0]], 0.01, STEEL_D); }
  d.rr(0.28, -0.14, 0.33, 0.14, 0.02, "#c9a54a");
  d.rr(0, -0.035, 0.28, 0.035, 0.02, "#5a3a2a");
  d.ell(-0.02, 0, 0.045, 0.045, "#c9a54a");
};
const drawParang = (p: Pen, U: number, st: PropState) => {
  const d = mk(p, U);
  if (st.sheathed) d.poly([[0.26, -0.06], [0.88, -0.05], [0.9, 0.06], [0.7, 0.15], [0.26, 0.09]], "#7a4e2c", d.ol);
  else {
    d.poly([[0.26, -0.045], [0.86, -0.04], [0.82, 0.03], [0.66, 0.12], [0.4, 0.1], [0.26, 0.06]], "#dfe4ea", d.ol);
    d.line([[0.3, -0.02], [0.8, -0.02]], 0.012, STEEL_D);
  }
  d.rr(0.24, -0.06, 0.3, 0.07, 0.01, "#9a9fa8");
  d.poly([[0, -0.04], [0.25, -0.05], [0.25, 0.06], [0.02, 0.06], [-0.03, 0.02]], "#6b3f22", d.ol);
};
const drawStick = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.band([[0, 0], [0.5, 0.012], [0.9, -0.01], [1.3, 0.01], [1.7, 0]], "#8a5a34", 0.05);
  d.ell(1.7, 0, 0.045, 0.04, "#6b4426");
};
const bamboo = (d: ReturnType<typeof mk>, len: number, cut: boolean) => {
  const w = 0.04, tipBase = cut ? len - 0.36 : len;
  d.poly([[0, -w], [tipBase, -w], [len, -w * 0.9], [cut ? tipBase : len, w], [0, w]], BAMBOO, d.ol);
  d.line([[0.02, w * 0.45], [tipBase - 0.05, w * 0.45]], 0.018, BAMBOO_D);
  for (let x = 0.42; x < tipBase - 0.05; x += 0.46) { d.line([[x, -w * 1.15], [x, w * 1.15]], 0.022, "#6e7a32"); }
  if (cut) d.poly([[tipBase, w * 0.9], [len, -w * 0.9], [tipBase + 0.05, -w * 0.2]], "#efe6b8", d.ol * 0.6);
};
const drawBambu = (p: Pen, U: number, st: PropState) => {
  const d = mk(p, U);
  bamboo(d, 3.8, true);
  if (st.ribbon ?? 1) {
    const x = 3.25, wv = Math.sin((st.wave ?? 0) * Math.PI * 2) * 0.03;
    d.poly([[x, 0.035], [x - 0.02, 0.32 + wv], [x + 0.08, 0.3 + wv], [x + 0.1, 0.035]], "#d0312d", d.ol * 0.7);
    d.poly([[x - 0.02, 0.32 + wv], [x - 0.04, 0.55 + wv * 2], [x + 0.06, 0.53 + wv * 2], [x + 0.08, 0.3 + wv]], WHITE, d.ol * 0.7);
  }
};
const drawTombak = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.band([[0, 0], [3.45, 0]], "#8a5a34", 0.06);
  d.poly([[3.42, -0.06], [3.62, -0.08], [3.85, 0], [3.62, 0.08], [3.42, 0.06]], STEEL, d.ol);
  d.rr(3.36, -0.045, 3.44, 0.045, 0.01, "#c0392b");
};
const drawBow = (p: Pen, U: number, st: PropState) => {
  const d = mk(p, U), k = st.draw ?? 0, nx = -0.25 - 0.62 * k;
  const limb: P2[] = [];
  for (let i = 0; i <= 16; i++) { const t = -1 + (2 * i) / 16; limb.push([-0.25 + 0.25 * Math.cos((t * Math.PI) / 2) - 0.03 * k * t * t, 0.85 * t]); }
  if (st.arrow) {
    const ax0 = nx, ax1 = Math.max(nx + 1.05, 0.32);
    d.line([[ax0, 0], [ax1, 0]], 0.02, "#c9a46a");
    d.poly([[ax1, -0.045], [ax1 + 0.12, 0], [ax1, 0.045]], STEEL_D, d.ol * 0.6);
    d.poly([[ax0 + 0.02, 0], [ax0 + 0.16, -0.06], [ax0 + 0.2, 0]], "#d0312d", d.ol * 0.5);
    d.poly([[ax0 + 0.02, 0], [ax0 + 0.16, 0.06], [ax0 + 0.2, 0]], "#d0312d", d.ol * 0.5);
  }
  d.line([limb[0], [nx, 0], limb[16]], 0.012, "#f2ead8");
  p.stroke(limb.map(([x, y]) => [x * U, y * U] as P2), 0.075 * U, INK);
  p.stroke(limb.map(([x, y]) => [x * U, y * U] as P2), 0.045 * U, "#8a5a34");
  d.rr(-0.04, -0.11, 0.035, 0.11, 0.02, "#5a3a22");
};
const drawArrow = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.line([[0, 0], [1.0, 0]], 0.02, "#c9a46a");
  d.poly([[1.0, -0.045], [1.12, 0], [1.0, 0.045]], STEEL_D, d.ol * 0.6);
  d.poly([[0.02, 0], [0.16, -0.06], [0.2, 0]], "#d0312d", d.ol * 0.5);
  d.poly([[0.02, 0], [0.16, 0.06], [0.2, 0]], "#d0312d", d.ol * 0.5);
};
const drawFlag = (p: Pen, U: number, st: PropState) => {
  const d = mk(p, U), ph = (st.wave ?? 0) * Math.PI * 2;
  d.band([[0, 0], [3.2, 0]], "#c9b48a", 0.05);
  d.ell(3.22, 0, 0.05, 0.05, "#e8c45a");
  const cloth = (x0: number, x1: number, col: string) => {
    const pts: P2[] = [];
    for (let i = 0; i <= 10; i++) { const y = 0.05 + (i / 10) * 0.95; pts.push([x1 + 0.05 * Math.sin(ph + i * 0.7) * (i / 10), y]); }
    for (let i = 10; i >= 0; i--) { const y = 0.05 + (i / 10) * 0.95; pts.push([x0 + 0.05 * Math.sin(ph + i * 0.7) * (i / 10), y]); }
    d.poly(pts, col, 0);
  };
  cloth(2.86, 3.17, "#d0312d"); cloth(2.55, 2.86, "#f6f1e7");
  const out: P2[] = [];
  for (let i = 0; i <= 10; i++) out.push([3.17 + 0.05 * Math.sin(ph + i * 0.7) * (i / 10), 0.05 + (i / 10) * 0.95]);
  for (let i = 10; i >= 0; i--) out.push([2.55 + 0.05 * Math.sin(ph + i * 0.7) * (i / 10), 0.05 + (i / 10) * 0.95]);
  d.poly(out, null, d.ol);
};
const drawHammer = (big: boolean) => (p: Pen, U: number) => {
  const d = mk(p, U), L = big ? 1.12 : 0.72, hw = big ? 0.12 : 0.075;
  d.band([[0, 0], [L, 0]], WOOD_L, big ? 0.06 : 0.05);
  d.rr(L - hw, -0.12 * (big ? 1.3 : 1), L + hw, 0.17 * (big ? 1.3 : 1), 0.02, "#5d636c");
};
const drawAxe = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.band([[0, 0], [0.95, 0]], WOOD_L, 0.05);
  d.poly([[0.8, -0.05], [0.96, -0.05], [1.0, 0.04], [0.98, 0.22], [0.74, 0.2]], "#aeb4bd", d.ol);
};
const drawHoe = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.band([[0, 0], [1.72, 0]], "#9a6a3c", 0.05);
  d.poly([[1.62, 0.02], [1.78, 0.02], [1.84, 0.36], [1.56, 0.36]], "#8a9098", d.ol);
};
const drawTongs = (p: Pen, U: number, st: PropState) => {
  const d = mk(p, U);
  d.line([[0, -0.03], [0.75, 0], [1.15, -0.04]], 0.022, "#3d4148");
  d.line([[0, 0.03], [0.75, 0], [1.15, 0.04]], 0.022, "#3d4148");
  d.dot(0.75, 0, 0.025, "#5d636c");
  if (st.hot ?? 1) { d.rr(1.1, -0.04, 1.6, 0.04, 0.02, "#ff8a2a", d.ol * 0.6); d.line([[1.15, 0], [1.55, 0]], 0.02, "#ffe08a"); }
};
const drawTorch = (p: Pen, U: number, st: PropState) => {
  const d = mk(p, U);
  bamboo(d, 0.85, false);
  d.rr(0.82, -0.06, 0.92, 0.06, 0.02, "#5a3a22");
  if (st.lit ?? 1) {
    const w = Math.sin((st.wave ?? 0) * Math.PI * 2) * 0.03;
    d.poly([[0.9, -0.09], [1.08, -0.1 + w], [1.3 + w, 0.0], [1.08, 0.1 + w], [0.9, 0.09]], "#ff9a2a", d.ol * 0.7);
    d.poly([[0.92, -0.045], [1.05, -0.04], [1.16 + w, 0], [1.05, 0.04], [0.92, 0.045]], "#ffe58a", 0);
  }
};
const drawBroom = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.band([[0, 0], [1.15, 0]], "#b08a5a", 0.04);
  for (let i = -5; i <= 5; i++) d.line([[1.12, i * 0.008], [1.65, i * 0.035]], 0.012, "#c9a45a");
  d.line([[1.15, -0.04], [1.15, 0.04]], 0.03, "#7a5a3a");
};
const drawShield = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.ell(0, 0, 0.42, 0.42, "#3fa58c");
  d.ell(0, 0, 0.3, 0.3, "#e8dcc2", d.ol * 0.7);
  d.ell(0, 0, 0.1, 0.1, "#c9a54a", d.ol * 0.7);
};
// ---- small props (origin = the hand) ----
const tilted = (p: Pen, st: PropState, fn: () => void) => {
  const t = st.tilt ?? 1;
  if (t >= 0.999) { fn(); return; }
  p.local([1, 0, 0, Math.max(0.15, t), 0, 0], fn);
};
const drawPhone = (p: Pen, U: number, st: PropState) => tilted(p, st, () => {
  const d = mk(p, U);
  d.rr(-0.085, -0.3, 0.085, 0.02, 0.025, "#1d1f26");
  d.rr(-0.065, -0.275, 0.065, -0.005, 0.012, st.lit ? "#9fe8ff" : "#5fb8e8", 0);
  d.line([[-0.03, -0.24], [0.03, -0.24]], 0.01, WHITE);
});
const drawPaper = (p: Pen, U: number, st: PropState) => tilted(p, st, () => {
  const d = mk(p, U);
  d.poly([[-0.12, -0.42], [0.2, -0.44], [0.22, 0.02], [-0.1, 0.03]], "#fbf7ec");
  for (let i = 0; i < 6; i++) d.line([[-0.06, -0.34 + i * 0.06], [0.14, -0.345 + i * 0.06]], 0.012, "#9aa0aa");
});
const drawSketch = (p: Pen, U: number, st: PropState) => tilted(p, st, () => {
  const d = mk(p, U);
  d.rr(-0.32, -0.62, 0.32, 0.02, 0.02, "#fbf7ec");
  for (let x = -0.26; x <= 0.27; x += 0.06) d.ell(x, -0.62, 0.014, 0.024, null, d.ol * 0.5);
  // the idea: a little machine with wheels + a lightbulb
  d.rr(-0.2, -0.32, 0.12, -0.18, 0.02, "#3fa58c", d.ol * 0.7);
  d.ell(-0.13, -0.16, 0.045, 0.045, INK, 0); d.ell(0.06, -0.16, 0.045, 0.045, INK, 0);
  d.ell(0.2, -0.45, 0.06, 0.07, "#ffd84a", d.ol * 0.6);
  d.line([[0.12, -0.25], [0.18, -0.38]], 0.012, "#d0312d");
  d.line([[-0.24, -0.08], [0.24, -0.08]], 0.014, "#d0312d");
});
const drawLetter = (p: Pen, U: number, st: PropState) => tilted(p, st, () => {
  const d = mk(p, U);
  d.rr(-0.18, -0.26, 0.2, 0.0, 0.01, "#f4ead2");
  d.line([[-0.18, -0.26], [0.01, -0.12], [0.2, -0.26]], 0.014);
  d.ell(0.01, -0.12, 0.035, 0.035, "#c0392b", d.ol * 0.5);
});
const drawBook = (p: Pen, U: number, st: PropState) => tilted(p, st, () => {
  const d = mk(p, U);
  d.rr(-0.14, -0.36, 0.16, 0.02, 0.015, "#8a2f3a");
  d.rr(-0.12, -0.34, -0.09, 0.0, 0.005, "#5a1f28", 0);
  d.rr(-0.04, -0.28, 0.1, -0.22, 0.01, "#e8c45a", d.ol * 0.4);
});
const drawMap = (p: Pen, U: number, st: PropState) => tilted(p, st, () => {
  const d = mk(p, U);
  d.poly([[-0.34, -0.46], [-0.11, -0.42], [0.12, -0.46], [0.34, -0.42], [0.34, 0.02], [0.12, -0.02], [-0.11, 0.02], [-0.34, -0.02]], "#f1e6c4");
  d.poly([[-0.25, -0.34], [-0.05, -0.38], [0.05, -0.2], [-0.12, -0.1], [-0.26, -0.18]], "#8cc07a", d.ol * 0.5);
  d.poly([[0.12, -0.3], [0.26, -0.33], [0.27, -0.12], [0.14, -0.14]], "#8cc07a", d.ol * 0.5);
  d.line([[-0.2, -0.28], [0.0, -0.22], [0.18, -0.24]], 0.012, "#d0312d");
});
const drawCup = (p: Pen, U: number, st: PropState) => tilted(p, st, () => {
  const d = mk(p, U);
  d.rr(-0.08, -0.2, 0.08, 0.02, 0.02, "#f4f1ea");
  d.rr(-0.07, -0.19, 0.07, -0.14, 0.01, "#4a2a18", 0);
  p.arc(0.08 * U, -0.09 * U, 0.04 * U, 0.05 * U, -90, 90, d.ol);
  if (st.lit ?? 1) d.line([[-0.02, -0.25], [0.02, -0.31], [-0.02, -0.37]], 0.012, WHITE);
});
const drawBowl = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.ell(0, -0.08, 0.16, 0.07, "#f4f1ea");
  d.ell(0, -0.11, 0.12, 0.05, "#fbf7ec", 0);
  d.poly([[-0.16, -0.08], [0.16, -0.08], [0.1, 0.02], [-0.1, 0.02]], "#f4f1ea");
};
const drawKey = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.ell(0, -0.06, 0.05, 0.05, "#e8c45a");
  d.line([[0, -0.11], [0, -0.3], [0.04, -0.3]], 0.02, "#e8c45a");
};
const drawMoney = (p: Pen, U: number, st: PropState) => tilted(p, st, () => {
  const d = mk(p, U);
  d.rr(-0.2, -0.16, 0.2, 0.02, 0.012, "#e0625a");
  d.ell(0, -0.07, 0.05, 0.05, "#f4d0c8", d.ol * 0.4);
  d.text("100", -0.12, -0.12, 0.05, "#7a1f1a");
});
const drawCoin = (p: Pen, U: number) => { const d = mk(p, U); d.ell(0, -0.06, 0.08, 0.08, "#f2c94c"); d.ell(0, -0.06, 0.05, 0.05, "#ffe28a", d.ol * 0.4); };
const drawMirror = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.band([[0, 0.06], [0, -0.16]], "#c9a54a", 0.045);
  d.ell(0, -0.34, 0.19, 0.2, "#c9a54a");
  d.ell(0, -0.34, 0.15, 0.16, "#bfe6f7", d.ol * 0.5);
  d.line([[-0.08, -0.4], [-0.02, -0.46]], 0.02, WHITE);
};
const drawBinoculars = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.rr(-0.14, -0.16, -0.02, 0.06, 0.03, "#2b2f38"); d.rr(0.02, -0.16, 0.14, 0.06, 0.03, "#2b2f38");
  d.ell(-0.08, -0.16, 0.05, 0.03, "#7fc6e8", d.ol * 0.5); d.ell(0.08, -0.16, 0.05, 0.03, "#7fc6e8", d.ol * 0.5);
};
const drawLantern = (p: Pen, U: number, st: PropState) => {
  const d = mk(p, U), lit = st.lit ?? 1;
  p.arc(0, 0.04 * U, 0.07 * U, 0.06 * U, 180, 360, d.ol);
  d.rr(-0.1, 0.06, 0.1, 0.1, 0.01, "#3d4148");
  d.rr(-0.09, 0.1, 0.09, 0.34, 0.04, lit ? "#ffe59a" : "#cfe2ea");
  if (lit) d.poly([[-0.025, 0.28], [0, 0.17], [0.025, 0.28]], "#ff9a2a", 0);
  d.rr(-0.11, 0.34, 0.11, 0.4, 0.01, "#3d4148");
};
const drawMic = (p: Pen, U: number) => { const d = mk(p, U); d.band([[0, 0.08], [0, -0.14]], INK, 0.03); d.ell(0, -0.2, 0.05, 0.065, "#b0bec5"); };
const drawMegaphone = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.poly([[-0.04, -0.05], [0.08, -0.07], [0.36, -0.17], [0.36, 0.13], [0.08, 0.03], [-0.04, 0.02]], "#f4f1ea");
  d.ell(0.36, -0.02, 0.04, 0.15, "#d0312d");
  d.line([[0, 0.02], [0.02, 0.1]], 0.03);
};
const drawRadio = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.rr(-0.24, -0.3, 0.24, 0.0, 0.03, "#8a5a34");
  d.ell(-0.1, -0.15, 0.08, 0.08, "#3d3226", d.ol * 0.6);
  d.rr(0.04, -0.24, 0.18, -0.16, 0.01, "#e8dcc2", d.ol * 0.5);
  d.line([[0.16, -0.3], [0.3, -0.52]], 0.012);
};
const drawBottle = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.poly([[-0.06, 0.02], [0.06, 0.02], [0.06, -0.24], [0.03, -0.3], [0.03, -0.38], [-0.03, -0.38], [-0.03, -0.3], [-0.06, -0.24]], "#6fa86a");
};
const drawBucket = (p: Pen, U: number) => {
  const d = mk(p, U);
  p.arc(0, 0.12 * U, 0.15 * U, 0.12 * U, 180, 360, d.ol);
  d.poly([[-0.16, 0.12], [0.16, 0.12], [0.12, 0.42], [-0.12, 0.42]], "#9aa3ad");
};
const drawBox = (wood: boolean) => (p: Pen, U: number) => {
  const d = mk(p, U);
  d.rr(-0.32, -0.25, 0.32, 0.25, 0.02, wood ? "#b07a48" : "#c9a06a");
  if (wood) { for (const y of [-0.08, 0.08]) d.line([[-0.3, y], [0.3, y]], 0.012, "#7a4e2c"); d.line([[-0.3, -0.23], [0.3, 0.23]], 0.02, "#8a5a34"); }
  else { d.rr(-0.06, -0.25, 0.06, 0.25, 0.0, "#e8d4a8", d.ol * 0.4); }
};
const drawSack = (p: Pen, U: number) => {
  const d = mk(p, U);
  d.poly([[-0.24, -0.2], [0.2, -0.24], [0.3, 0.0], [0.26, 0.24], [-0.26, 0.24], [-0.32, 0.0]], "#d8c08a");
  d.line([[-0.2, -0.16], [0.18, -0.2]], 0.014, "#a8905a");
};

// =====================================================================================================================
// CATALOGUE
// =====================================================================================================================
const long = (name: string, label: string, len: number, main: number, off: number | undefined, styles: Record<string, HoldStyle>,
  defStyle: string, draw: PropDef["draw"], pts: Record<string, P2> = {}, halfW = 0.15, extra: Partial<PropDef> = {}): PropDef => ({
  name, label, cls: "long", grips: { main: [main, 0], ...(off !== undefined ? { off: [off, 0] as P2 } : {}) },
  points: { butt: [0, 0], tip: [len, 0], mid: [len / 2, 0], ...pts }, bounds: [-0.1, -halfW, len + 0.25, halfW],
  twoHand: off !== undefined, rest: "lie", styles, defStyle, draw, ...extra,
});
const small = (name: string, label: string, draw: PropDef["draw"], bounds: PropDef["bounds"], rest: PropDef["rest"] = "flat", styles = SMALL_STYLES): PropDef => ({
  name, label, cls: "small", grips: { main: [0, 0] }, points: { centre: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2] },
  bounds, rest, styles, defStyle: "hold", draw,
});

export const PROPS: Record<string, PropDef> = {
  rifle: long("rifle", "senapan / rifle (two hands)", 1.75, 0.42, 0.95, RIFLE_STYLES, "order", drawRifle, { muzzle: [1.76, -0.045] }, 0.2),
  pistol: { name: "pistol", label: "pistol", cls: "pistol", grips: { main: [0.0, 0.06], off: [0.0, 0.1] }, points: { muzzle: [0.43, -0.045] }, bounds: [-0.1, -0.12, 0.8, 0.2], rest: "flat", styles: PISTOL_STYLES, defStyle: "low", draw: drawPistol },
  katana: long("katana", "katana / samurai sword", 1.5, 0.1, 0.27, SWORD_STYLES, "sheathed", drawKatana, { guard: [0.38, 0] }, 0.12),
  pedang: long("pedang", "straight sword", 1.42, 0.1, 0.24, SWORD_STYLES, "sheathed", drawSword, { guard: [0.3, 0] }, 0.16),
  parang: long("parang", "parang / golok (machete)", 0.88, 0.12, undefined, PARANG_STYLES, "low", drawParang, { edge: [0.62, 0.11] }, 0.16, { cls: "blade" }),
  tongkat: long("tongkat", "stick / walking stick", 1.72, 1.55, 1.0, STICK_STYLES, "cane", drawStick, {}, 0.08, { twoHand: false }),
  bambu_runcing: long("bambu_runcing", "bambu runcing (sharpened bamboo spear, merah-putih ribbon)", 3.8, 1.75, 1.1, SPEAR_STYLES, "upright", drawBambu, {}, 0.6, { twoHand: false }),
  tombak: long("tombak", "spear with a metal head", 3.85, 1.75, 1.1, SPEAR_STYLES, "upright", drawTombak, {}, 0.12, { twoHand: false }),
  bendera: long("bendera", "merah-putih flag on a pole", 3.25, 2.05, 1.5, FLAG_STYLES, "upright", drawFlag, { cloth: [2.86, 0.5] }, 1.05, { twoHand: false }),
  palu: long("palu", "hammer", 0.82, 0.12, undefined, HAMMER_STYLES, "hold", drawHammer(false), { face: [0.72, 0.17] }, 0.2, { cls: "tool" }),
  godam: long("godam", "sledgehammer (two hands)", 1.25, 0.12, 0.55, SLEDGE_STYLES, "hold", drawHammer(true), { face: [1.12, 0.22] }, 0.25, { cls: "tool" }),
  kapak: long("kapak", "axe", 1.0, 0.12, undefined, AXE_STYLES, "low", drawAxe, { edge: [0.9, 0.2] }, 0.24, { cls: "tool" }),
  cangkul: long("cangkul", "hoe (two hands)", 1.84, 0.2, 0.85, HOE_STYLES, "rest", drawHoe, { blade: [1.7, 0.36] }, 0.4, { cls: "tool" }),
  penjepit: long("penjepit", "blacksmith tongs with hot metal", 1.6, 0.1, undefined, TONGS_STYLES, "hold", drawTongs, { work: [1.35, 0] }, 0.1, { cls: "tool" }),
  obor: long("obor", "bamboo torch", 1.3, 0.25, undefined, TORCH_STYLES, "up", drawTorch, { flame: [1.08, 0] }, 0.14, { cls: "tool" }),
  sapu: long("sapu", "broom (sapu lidi)", 1.65, 0.2, 0.7, BROOM_STYLES, "hold", drawBroom, {}, 0.2, { cls: "tool" }),
  busur: { name: "busur", label: "bow + arrow", cls: "bow", grips: { main: [0, 0], off: [-0.25, 0] }, points: { nock: [-0.25, 0], tip: [0.45, 0] },
    bounds: [-0.95, -0.9, 0.7, 0.9], twoHand: true, rest: "lie", styles: BOW_STYLES, defStyle: "rest", draw: drawBow,
    offGrip: (st) => [-0.25 - 0.62 * (st.draw ?? 0), 0] },
  panah: long("panah", "arrow (flies after a bow release)", 1.12, 0.1, undefined, ARROW_STYLES, "hold", drawArrow, {}, 0.08),
  perisai: { name: "perisai", label: "round shield", cls: "shield", grips: { main: [0, 0] }, points: { centre: [0, 0] }, bounds: [-0.45, -0.45, 0.45, 0.45], rest: "stand", styles: SHIELD_STYLES, defStyle: "guard", draw: drawShield },
  hp: small("hp", "mobile phone", drawPhone, [-0.1, -0.32, 0.1, 0.04]),
  kertas: small("kertas", "sheet of paper / document", drawPaper, [-0.14, -0.46, 0.24, 0.05]),
  sketsa: small("sketsa", "sketchbook with an idea drawn on it", drawSketch, [-0.34, -0.66, 0.34, 0.04]),
  surat: small("surat", "letter / envelope", drawLetter, [-0.2, -0.28, 0.22, 0.02]),
  buku: small("buku", "book", drawBook, [-0.16, -0.38, 0.18, 0.04]),
  peta: small("peta", "map", drawMap, [-0.36, -0.48, 0.36, 0.04]),
  kopi: small("kopi", "glass of coffee", drawCup, [-0.1, -0.38, 0.14, 0.04], "stand"),
  piring: small("piring", "bowl / plate of food", drawBowl, [-0.18, -0.16, 0.18, 0.04], "stand"),
  kunci: small("kunci", "key", drawKey, [-0.06, -0.32, 0.06, 0.0]),
  uang: small("uang", "banknote (Rp 100.000)", drawMoney, [-0.22, -0.18, 0.22, 0.04]),
  koin: small("koin", "gold coin", drawCoin, [-0.09, -0.15, 0.09, 0.03]),
  cermin: small("cermin", "hand mirror", drawMirror, [-0.21, -0.56, 0.21, 0.08], "stand"),
  teropong: small("teropong", "binoculars", drawBinoculars, [-0.16, -0.2, 0.16, 0.08]),
  lampu: { ...small("lampu", "oil lantern (hangs from the hand)", drawLantern, [-0.12, -0.06, 0.12, 0.42], "stand"), points: { flame: [0, 0.24] } },
  mic: small("mic", "microphone", drawMic, [-0.06, -0.27, 0.06, 0.1]),
  corong: small("corong", "megaphone", drawMegaphone, [-0.06, -0.2, 0.42, 0.16]),
  radio: small("radio", "radio set", drawRadio, [-0.26, -0.54, 0.32, 0.02], "stand"),
  botol: small("botol", "bottle", drawBottle, [-0.07, -0.4, 0.07, 0.03], "stand"),
  ember: small("ember", "bucket", drawBucket, [-0.17, -0.02, 0.17, 0.44], "stand"),
  kardus: { name: "kardus", label: "cardboard box (two hands)", cls: "box", grips: { main: [0.31, 0], off: [-0.31, 0] }, points: { centre: [0, 0] }, bounds: [-0.34, -0.27, 0.34, 0.27], twoHand: true, rest: "stand", styles: BOX_STYLES, defStyle: "carry", draw: drawBox(false) },
  peti: { name: "peti", label: "small wooden crate (two hands)", cls: "box", grips: { main: [0.31, 0], off: [-0.31, 0] }, points: { centre: [0, 0] }, bounds: [-0.34, -0.27, 0.34, 0.27], twoHand: true, rest: "stand", styles: BOX_STYLES, defStyle: "carry", draw: drawBox(true) },
  karung: { name: "karung", label: "sack of rice", cls: "box", grips: { main: [0.28, 0.05], off: [-0.28, 0.05] }, points: { centre: [0, 0] }, bounds: [-0.34, -0.26, 0.32, 0.26], rest: "stand", styles: BOX_STYLES, defStyle: "shoulder", draw: drawSack },
};

export const PROP_NAMES = Object.keys(PROPS);
export const propDef = (name: string): PropDef => {
  const d = PROPS[name];
  if (!d) throw new Error(`unknown prop "${name}". Known: ${PROP_NAMES.join(", ")}`);
  return d;
};
/** grip positions for a style (long props can move the grips along the shaft) */
export const gripsFor = (d: PropDef, s: HoldStyle, st: PropState): { main: P2; off?: P2 } => {
  const main: P2 = s.mainAt !== undefined ? [s.mainAt, 0] : d.grips.main;
  let off: P2 | undefined = s.offAt !== undefined ? [s.offAt, 0] : d.grips.off;
  if (d.offGrip) off = d.offGrip(st);
  return { main, off };
};
/** local point of a pin name */
export const pinPoint = (d: PropDef, s: HoldStyle, st: PropState): P2 => {
  const pin = s.pin ?? "main", g = gripsFor(d, s, st);
  if (typeof pin === "number") return [pin, 0];
  if (pin === "main") return g.main;
  if (pin === "off") return g.off ?? g.main;
  if (pin === "origin") return [0, 0];
  if (pin === "butt") return d.points.butt ?? [0, 0];
  if (pin === "tip") return d.points.tip ?? [0, 0];
  return d.points.mid ?? lerp2(d.points.butt ?? [0, 0], d.points.tip ?? [0, 0], 0.5);
};
/** the striking point used when a style is given a target (hammer face, blade edge, spear tip, hoe blade) */
export const strikePoint = (d: PropDef): P2 => d.points.face ?? d.points.edge ?? d.points.blade ?? d.points.work ?? d.points.tip ?? d.points.muzzle ?? [0, 0];

