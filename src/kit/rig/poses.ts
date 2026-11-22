// KIT POSES: named body poses. Use them by name in a project (pose: "sit_chair"); add a hold for objects
// (hold: { prop: "rifle", style: "port" }) and actions for motion (actions: [{ do: "pickUp", ... }]).
// Offsets are in HH (head heights), canonical = facing screen-right; see rig/types.ts for the conventions.
import type { Pose } from "./types";

export type PoseInfo = { pose: Pose; note: string };

const P: Record<string, PoseInfo> = {
  // ---- standing ----
  stand: { pose: { gait: "stand" }, note: "standing, idle breathing sway (default)" },
  still: { pose: { gait: "still" }, note: "standing perfectly still (statues, frozen moment)" },
  stand_side: { pose: { view: "side" }, note: "standing in profile" },
  back: { pose: { view: "back" }, note: "standing, seen from behind" },
  point: { pose: { armF: { to: [0.88, -0.08] }, expr: "stern" }, note: "pointing at something on the facing side" },
  point_up: { pose: { armF: { to: [0.3, -0.86] }, expr: "smile" }, note: "index up: an idea / attention" },
  wave: { pose: { armF: { to: [0.42, -0.76] }, expr: "smile" }, note: "hand up to wave (use the wave action to animate)" },
  explain: { pose: { armF: { to: [0.62, 0.36] }, expr: "smile" }, note: "open-hand gesture while talking" },
  present: { pose: { armF: { to: [0.9, 0.06] }, expr: "smile" }, note: "presenting something with the arm out" },
  think: { pose: { armF: { to: [0.1, 0.56], from: "head", above: true }, headTilt: 6, expr: "think" }, note: "hand on the chin, thinking" },
  arms_crossed: { pose: { armF: { to: [-0.2, 0.22], from: "chest", front: true }, armB: { to: [0.2, 0.28], from: "chest", front: true }, expr: "stern" }, note: "arms crossed over the chest" },
  hands_on_hips: { pose: { armF: { to: [0.42, -0.1], from: "hip" }, armB: { to: [-0.42, -0.1], from: "hip" }, expr: "smile" }, note: "hands on the hips, confident" },
  hands_up: { pose: { armF: { to: [0.32, -0.8] }, armB: { to: [-0.32, -0.8] }, expr: "shock" }, note: "hands up: surrender / caught" },
  cheer: { pose: { armF: { to: [0.45, -0.82] }, armB: { to: [-0.45, -0.82] }, expr: "grin" }, note: "both arms up, celebrating" },
  fist_up: { pose: { armF: { to: [0.28, -0.86] }, expr: "battle" }, note: "fist raised: merdeka! / protest" },
  shrug: { pose: { armF: { to: [0.56, 0.16] }, armB: { to: [-0.56, 0.16] }, headTilt: 6, expr: "nervous" }, note: "shrugging, no idea" },
  facepalm: { pose: { armF: { to: [0.02, 0.06], from: "head", above: true }, headTilt: -6, headDy: 0.05, expr: "pained" }, note: "hand over the face" },
  salute: { pose: { armF: { to: [0.26, -0.14], from: "head", above: true }, expr: "stern" }, note: "military salute (hand at the brow)" },
  cower: { pose: { stance: "crouch", hip: 1.15, armF: { to: [0.12, 0.42], from: "head", front: true }, armB: { to: [-0.12, 0.42], from: "head", front: true }, expr: "shock" }, note: "ducking, arms up to protect the head" },
  // ---- moving ----
  walk: { pose: { gait: "walk" }, note: "walking toward / away from the camera (front view)" },
  march: { pose: { gait: "march" }, note: "marching in step (front view)" },
  run: { pose: { gait: "run" }, note: "running (front view)" },
  walk_side: { pose: { view: "side", gait: "walk" }, note: "walking across the frame (profile): use for sideways moves, never slide a front view" },
  march_side: { pose: { view: "side", gait: "march" }, note: "marching across the frame" },
  run_side: { pose: { view: "side", gait: "run" }, note: "running across the frame" },
  walk_away: { pose: { view: "back", gait: "walk" }, note: "walking away from the camera" },
  // ---- seated ----
  sit_chair: { pose: { seated: true, hip: 1.0, armF: { to: [0.26, -0.02], from: "hip", front: true }, armB: { to: [-0.26, -0.02], from: "hip", front: true } }, note: "sitting on a chair, hands on the lap (front)" },
  sit_side: { pose: { view: "side", seated: true, hip: 1.0, armF: { to: [0.5, -0.04], from: "hip" } }, note: "sitting on a chair, profile" },
  sit_table: { pose: { seated: true, hip: 1.0, armF: { to: [0.3, -0.5], from: "hip", front: true }, armB: { to: [-0.3, -0.5], from: "hip", front: true } }, note: "sitting at a table, hands on the table top" },
  sit_boss: { pose: { view: "side", seated: true, hip: 1.05, lean: -14, legF: { to: [1.25, -0.45] }, legB: { to: [1.18, -0.4] }, armF: { to: [-0.24, 0.1], from: "head" }, armB: { to: [-0.3, 0.05], from: "head" }, expr: "smile" }, note: "leaning back, feet up on the desk, hands behind the head" },
  sit_stool: { pose: { seated: true, hip: 1.3, armF: { to: [0.3, -0.02], from: "hip", front: true }, armB: { to: [-0.3, -0.02], from: "hip", front: true } }, note: "sitting on a high stool / bar stool" },
  sit_floor: { pose: { seated: true, hip: 0.2, legF: { to: [-0.06, 0.14], knee: [0.5, 0.04] }, legB: { to: [0.06, 0.14], knee: [-0.5, 0.04] }, armF: { to: [0.4, 0.0], from: "hip", front: true }, armB: { to: [-0.4, 0.0], from: "hip", front: true } }, note: "sitting cross-legged on the floor (lesehan)" },
  // ---- low ----
  kneel: { pose: { stance: "kneel" }, note: "one knee on the ground (front)" },
  kneel_side: { pose: { view: "side", stance: "kneel" }, note: "one knee on the ground (profile)" },
  crouch: { pose: { stance: "crouch" }, note: "squatting (front)" },
  crouch_side: { pose: { view: "side", stance: "crouch", lean: 14 }, note: "squatting (profile)" },
  lie: { pose: { lying: 1, expr: "dazed" }, note: "lying on the ground (knocked down, asleep)" },
  // ---- reaching / working ----
  reach_fwd: { pose: { armF: { to: [0.92, 0.12] }, lean: 6 }, note: "reaching forward (front)" },
  reach_down: { pose: { view: "side", lean: 34, hipX: -0.12, armF: { to: [0.55, 0.95] }, headTilt: 10 }, note: "bending down to the ground (profile)" },
  push: { pose: { view: "side", lean: 18, stance: "lunge", armF: { to: [0.95, 0.16] }, armB: { to: [0.88, 0.06] }, expr: "pained" }, note: "pushing something heavy" },
  pull: { pose: { view: "side", lean: -16, stance: "wide", armF: { to: [0.82, 0.36] }, armB: { to: [0.76, 0.3] }, expr: "pained" }, note: "pulling a rope / a door" },
  throw_windup: { pose: { view: "side", lean: -10, armF: { to: [-0.62, -0.42] }, expr: "stern" }, note: "arm back, about to throw" },
  throw_release: { pose: { view: "side", lean: 14, armF: { to: [0.86, -0.26] }, armB: { to: [-0.4, 0.3] } }, note: "arm forward, just thrown" },
  climb_a: { pose: { view: "back", armF: { to: [0.28, -0.86] }, armB: { to: [-0.28, -0.52] }, legF: { to: [0.14, 0.9], knee: [0.2, 0.42] }, legB: { to: [-0.16, 1.46] } }, note: "climbing a ladder, seen from behind (frame A)" },
  climb_b: { pose: { view: "back", armF: { to: [0.28, -0.52] }, armB: { to: [-0.28, -0.86] }, legF: { to: [0.16, 1.46] }, legB: { to: [-0.14, 0.9], knee: [-0.2, 0.42] } }, note: "climbing a ladder, seen from behind (frame B)" },
};

export const POSES: Record<string, Pose> = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.pose]));
export const POSE_INFO = P;
export const POSE_NAMES = Object.keys(P);
export const poseOf = (name: string): Pose => {
  const p = POSES[name];
  if (!p) throw new Error(`unknown pose "${name}". Known: ${POSE_NAMES.join(", ")}`);
  return p;
};
