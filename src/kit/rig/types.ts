// KIT RIG types: poses, hold styles, and the solved Joints. PURE (no DOM, no three) so the validator runs in Node.
//
// Coordinate conventions (read this before authoring poses / holds):
//  - design units: a standing adult is drawn with its feet at (300, 975); y grows DOWN.
//  - pose and hold offsets are in HH = the character's head height (~222 units for an adult); y down, so "up" is negative.
//  - CANONICAL frame: everything is authored as if the character faces SCREEN-RIGHT (+x). facing = -1 mirrors it.
//  - arm "F" = the arm on the facing side (front view: screen-right arm; side view: the NEAR arm, drawn over the body).
//    arm "B" = the other arm (front view: screen-left; side view: the FAR arm, drawn behind the body).
//  - prop units PU = 222 design units (one adult head). A prop's local +x runs along its shaft from butt to tip.
import type { P2 } from "../toon/pen";
import type { Expr } from "../toon/head";

export type View = "front" | "side" | "back";
export type Gait = "stand" | "march" | "walk" | "run" | "still";
export type Stance = "normal" | "wide" | "lunge" | "brace" | "kneel" | "crouch";
export type Anchor = "ground" | "hip" | "chest" | "shoulderF" | "shoulderB" | "head" | "mouth";

/** an arm: "hang" (rest), "swing" (walk cycle), or a hand target relative to an anchor (default: its own shoulder) */
export type ArmSpec = "hang" | "swing" | {
  to: P2; from?: Anchor | "shoulder";
  /** force the elbow side (+1 / -1); default picks the natural "out and down" side */
  bend?: number;
  /** draw over the torso (hand in front of the body) */
  front?: boolean;
  /** draw after the head (hand on chin, phone at ear) */
  above?: boolean;
};
/** a leg: foot target relative to the hip joint, in HH (y down); optional explicit knee (foreshortened legs) */
export type LegSpec = { to: P2; bend?: number; toe?: number; knee?: P2 };

export type Pose = {
  view?: View;
  gait?: Gait;
  /** hip height above the sole, in HH (standing ~1.52 for adults). Seated: seat height + 0.12. */
  hip?: number;
  hipX?: number;
  /** upper-body rotation about the hip, degrees (+ = toward the facing side) */
  lean?: number;
  headTilt?: number;
  headDy?: number;
  armF?: ArmSpec; armB?: ArmSpec;
  legF?: LegSpec; legB?: LegSpec;
  stance?: Stance;
  /** legs drawn seated (thighs forward); hip comes from `hip` */
  seated?: boolean;
  /** whole figure rotated to lie on the ground (+1 head to the facing side) */
  lying?: number;
  expr?: Expr;
};

export type PropState = {
  draw?: number; sheathed?: number; wave?: number; hot?: number; open?: number; tilt?: number; flash?: number;
  recoil?: number; arrow?: number; ribbon?: number; bayonet?: number; lit?: number;
};

export type HoldStyle = {
  /** where the pin point goes: anchor `at` + offset `pos` (HH, canonical, y down) */
  at: Anchor; pos: P2;
  /** which point of the prop is pinned there (default "main"); a number = position along the shaft (PU) */
  pin?: "butt" | "main" | "off" | "tip" | "mid" | "origin" | number;
  /** prop +x direction in degrees (canonical): 0 = toward the facing side, -90 = straight up, 90 = straight down */
  angle: number;
  /** grip positions along a long prop's shaft (PU): override the prop's default grips for this style */
  mainAt?: number; offAt?: number;
  /** which arm takes the main grip (default "F") / the off grip (default "B" for two-handed props, else none) */
  main?: "F" | "B" | null; off?: "F" | "B" | null;
  layer?: "front" | "back" | "mid";
  /** a style can force the view (aiming, drawing a bow and charging read only in profile) */
  view?: "front" | "side";
  flipY?: boolean;
  /** draw the prop and its arm after the head (cup at the mouth, phone at the ear) */
  aboveHead?: boolean;
  body?: { lean?: number; headTilt?: number; headDy?: number; stance?: Stance; expr?: Expr; armF?: ArmSpec; armB?: ArmSpec; hip?: number };
  st?: PropState;
  note?: string;
};

/** what a character holds this frame */
export type HoldIn = {
  prop: string;
  style: string;
  st?: PropState;
  /** final-canvas target for the prop's striking point / tip (strike, chop, dig) */
  target?: P2;
  /** blend from a free placement (where the prop lay in the world) to the style placement: k = 0 free .. 1 style */
  from?: { pos: P2; angle: number; k: number };
  /** extra offset of the pin (HH, canonical) and extra angle (deg): used by actions (recoil, thrust, swing) */
  nudge?: { pos?: P2; angle?: number };
};

export type SolvedArm = { id: "F" | "B"; S: P2; E: P2; Hd: P2; front: boolean; above: boolean; grip: boolean; far: boolean; stretch: number };
export type SolvedLeg = { hip: P2; knee: P2; foot: P2; toe: number; near: boolean };
export type SolvedProp = { name: string; aff: [number, number, number, number, number, number]; layer: "front" | "back" | "mid"; above: boolean; st: PropState };

export type Joints = {
  view: View; mirror: boolean; facing: number;
  u: number; HH: number; W: number; sole: number;
  /** upper-body rotation (radians) about pivot; arms / torso / head are in this local frame */
  lean: number; pivot: P2;
  hipY: number; torsoBot: number; chin: number; tcx: number;
  head: { cx: number; hc: number; tilt: number; a: number; b: number; seed: number };
  legs: SolvedLeg[];
  arms: SolvedArm[];
  props: SolvedProp[];
  /** whole-figure rotation for lying poses: [angle, cx, cy] */
  lie: [number, number, number] | null;
  seated: boolean;
  // ---- FINAL canvas outputs (after mirroring / lying) ----
  hands: { F: P2; B: P2 };
  points: Record<string, P2>;
  rect: [number, number, number, number];
  zones: { chin: number; headC: P2; headR: [number, number]; torsoW: number; torsoY: [number, number] };
  warnings: string[];
};
