// KIT CAMERA (pure): preset framings that follow a subject, with the reference motion rules built in:
//  - every hold creeps (push-in 0.15-0.45 %/f; "punch" = strong push on an emphasis word) -> never a frozen frame
//  - keys hard-cut by default; give `dur` to glide (smootherstep, ~18-30 f)
//  - impact kicks: roll shake that flips sign every frame and decays over ~7 f
//  - depth of field per preset (wides sharp, close-ups / inserts blurred behind), focus on the subject
//  - FIT: a vertical 9:16 frame is narrow (a wide at 6.5 m shows only ~2.5 m across). twoShot and group subjects
//    (on: ["budi", "joko"]) move the camera back until everyone fits; inFrame() lets the validator check it.
import type { CamKey, CamPreset, ShotSpec, V3 } from "../scene/types";

export type CamPose = { pos: V3; look: V3; fov: number; roll: number; dof: number; focus: V3 };
/** a resolved subject: floor point + the height of its "eyes" (actors) or an exact point (props, anchors) */
export type Subject = { base: V3; head: number; point?: V3 };
export type SubjectFn = (target: string | V3 | [number, number] | undefined, f: number) => Subject;
/** half the width of a standing card (m) plus a little air: what FIT keeps inside the frame */
const CARD_HALF = 0.6;

type PresetDef = { dist: number; camY: number; lookY: number; fov: number; dof: number; push: number; roll?: number };
/** camY / lookY are heights above the subject's floor point (m); lookY < 0 = use the subject's head height */
export const PRESETS: Record<Exclude<CamPreset, "twoShot" | "ots" | "pov" | "free">, PresetDef & { note: string }> = {
  estab: { dist: 12, camY: 5.5, lookY: 1.0, fov: 40, dof: 0, push: 0.0015, note: "establishing: high, far, the whole place" },
  wide: { dist: 6.5, camY: 1.9, lookY: 1.0, fov: 38, dof: 0, push: 0.002, note: "wide: the group and the set" },
  full: { dist: 3.4, camY: 1.2, lookY: 0.85, fov: 36, dof: 5, push: 0.0025, note: "full figure, head to toe" },
  medium: { dist: 2.1, camY: 1.28, lookY: 1.02, fov: 34, dof: 10, push: 0.0028, note: "waist up" },
  close: { dist: 1.25, camY: 1.22, lookY: -1, fov: 32, dof: 13, push: 0.0032, note: "face close-up" },
  insert: { dist: 0.62, camY: 0.38, lookY: 0, fov: 34, dof: 14, push: 0.0045, note: "insert on an object / a hand (taking, using, pressing)" },
  lowHero: { dist: 2.0, camY: 0.28, lookY: 1.1, fov: 42, dof: 8, push: 0.003, roll: 3, note: "low angle hero, slight dutch roll" },
  highDown: { dist: 2.3, camY: 3.8, lookY: 0.3, fov: 38, dof: 5, push: 0.0025, note: "high angle looking down (small, trapped, overview of a table)" },
  follow: { dist: 3.6, camY: 1.3, lookY: 0.9, fov: 36, dof: 5, push: 0.0012, note: "tracks a moving actor / vehicle every frame" },
};

const smoother = (u: number) => { const x = Math.max(0, Math.min(1, u)); return x * x * x * (x * (6 * x - 15) + 10); };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rad = (d: number) => (d * Math.PI) / 180;

/** push factor since f0 (distance multiplier); "punch" pushes ~0.65 %/f for 24 f then normal */
const pushK = (f: number, f0: number, rate: number, punch: boolean) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch) for (let i = 0; i < Math.min(x, 24); i++) s += 0.0035 * Math.max(0, Math.min(1, (i + 0.5) / 6, (24 - i - 0.5) / 6));
  return Math.exp(-s);
};

/** tan of the horizontal half field of view */
const tanH = (fov: number, aspect: number) => Math.tan(rad(fov) / 2) * aspect;
const isGroup = (on: CamKey["on"]): on is string[] => Array.isArray(on) && typeof on[0] === "string";
/** camera distance (from the look point) that keeps every subject inside the frame width, for azimuth az */
const fitDist = (subs: Subject[], center: V3, az: number, fov: number, aspect: number) => {
  const rx = Math.cos(az), rz = -Math.sin(az), dx = Math.sin(az), dz = Math.cos(az);
  let half = 0, near = 0;
  for (const s of subs) {
    half = Math.max(half, Math.abs((s.base[0] - center[0]) * rx + (s.base[2] - center[2]) * rz));
    // subjects nearer to the camera than the center take more of the frame: their depth offset is extra margin
    near = Math.max(near, (s.base[0] - center[0]) * dx + (s.base[2] - center[2]) * dz);
  }
  // x1.12: room for the slow push-in, so the group stays in frame for ~2 s of creep
  return ((half + CARD_HALF) / tanH(fov, aspect) + near) * 1.12;
};

/** evaluate one key at frame f (before blending with the previous key). aspect = width / height of the video */
export const keyPose = (k: CamKey, f: number, subj: SubjectFn, front = 0, aspect = 9 / 16, end?: number): CamPose => {
  /** when FIT decides the distance, the creep is capped so the group is still inside at the end of the key (~10 %) */
  const fitRate = (rate: number) => (end !== undefined ? Math.min(rate, 0.1 / Math.max(1, end - k.f)) : rate);
  const punch = k.push === "punch";
  const az = rad(front + (k.angle ?? 0));
  if (k.preset === "free") {
    const look = k.look ?? [0, 1, 0], pos = k.pos ?? [0, 1.5, 5];
    const kk = pushK(f, k.f, typeof k.push === "number" ? k.push : 0.0025, punch);
    return { pos: lerp3(look, pos, kk), look, fov: k.fov ?? 36, roll: rad(k.roll ?? 0), dof: k.dof ?? 0, focus: look };
  }
  if (k.preset === "twoShot") {
    const A = subj(isGroup(k.on) ? k.on[0] : k.on, f), B = subj(isGroup(k.on) ? k.on[1] : k.to, f), fov = k.fov ?? 36;
    const mid: V3 = [(A.base[0] + B.base[0]) / 2, 0, (A.base[2] + B.base[2]) / 2];
    const fd = fitDist([A, B], mid, az, fov, aspect), rate = typeof k.push === "number" ? k.push : 0.0025;
    const dist = Math.max(k.dist ?? 2.4, fd) * pushK(f, k.f, fd > (k.dist ?? 2.4) ? fitRate(rate) : rate, punch);
    const look: V3 = [mid[0], (A.base[1] + B.base[1]) / 2 + (k.lookY ?? 0.95), mid[2]];
    const pos: V3 = [look[0] + Math.sin(az) * dist, (A.base[1] + B.base[1]) / 2 + (k.height ?? 1.3), look[2] + Math.cos(az) * dist];
    return { pos, look, fov, roll: rad(k.roll ?? 0), dof: k.dof ?? 7, focus: [A.base[0], A.base[1] + A.head, A.base[2]] };
  }
  if (k.preset === "ots" || k.preset === "pov") {
    const A = subj(isGroup(k.on) ? k.on[0] : k.on, f), B = subj(isGroup(k.on) ? k.on[1] : k.to, f);
    const dx = B.base[0] - A.base[0], dz = B.base[2] - A.base[2], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
    const bHead: V3 = B.point ?? [B.base[0], B.base[1] + B.head, B.base[2]];
    if (k.preset === "pov") {
      const eye: V3 = [A.base[0] + ux * 0.15, A.base[1] + A.head, A.base[2] + uz * 0.15];
      return { pos: eye, look: bHead, fov: k.fov ?? 40, roll: rad(k.roll ?? 0), dof: k.dof ?? 6, focus: bHead };
    }
    const side = (k.angle ?? 0) >= 0 ? 1 : -1, back = (k.dist ?? 1.0) * pushK(f, k.f, typeof k.push === "number" ? k.push : 0.0025, punch);
    const pos: V3 = [A.base[0] - ux * back + uz * 0.42 * side, A.base[1] + (k.height ?? 1.42), A.base[2] - uz * back - ux * 0.42 * side];
    return { pos, look: bHead, fov: k.fov ?? 34, roll: rad(k.roll ?? 0), dof: k.dof ?? 10, focus: bHead };
  }
  const P = PRESETS[k.preset];
  const group = isGroup(k.on) ? k.on.map((x) => subj(x, f)) : null;
  const avg = (i: 0 | 1 | 2) => group!.reduce((s, g) => s + g.base[i], 0) / group!.length;
  const S: Subject = group ? { base: [avg(0), avg(1), avg(2)], head: Math.max(...group.map((g) => g.head)) } : subj(k.on as string | V3 | [number, number] | undefined, f);
  const insert = k.preset === "insert";
  const lookY = k.lookY ?? (P.lookY < 0 ? S.head : P.lookY);
  const look: V3 = insert || (S.point && k.lookY === undefined && k.preset !== "follow") ? (S.point ?? add(S.base, [0, lookY, 0])) : add(S.base, [0, lookY, 0]);
  const fit = group ? fitDist(group, S.base, az, k.fov ?? P.fov, aspect) : 0;
  const rate = typeof k.push === "number" ? k.push : P.push;
  const dist = Math.max(k.dist ?? P.dist, fit) * pushK(f, k.f, fit > (k.dist ?? P.dist) ? fitRate(rate) : rate, punch);
  const camY = insert ? look[1] + (k.height ?? P.camY) : S.base[1] + (k.height ?? P.camY);
  const pos: V3 = [look[0] + Math.sin(az) * dist, camY, look[2] + Math.cos(az) * dist];
  return { pos, look, fov: k.fov ?? P.fov, roll: rad(k.roll ?? P.roll ?? 0), dof: k.dof ?? P.dof, focus: look };
};

/** camera at absolute frame f for a shot: hard cuts by default, glides when a key has `dur`, plus impact kicks */
export const shotCam = (shot: ShotSpec, f: number, subj: SubjectFn, front = 0, aspect = 9 / 16): CamPose => {
  const keys = [...shot.camera].sort((a, b) => a.f - b.f);
  const endOf = (i: number) => keys[i + 1]?.f ?? shot.b;
  let cur = keyPose(keys[0], f, subj, front, aspect, endOf(0));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    const next = keyPose(k, f, subj, front, aspect, endOf(i));
    if (k.dur && !k.cut) {
      const t = smoother((f - k.f) / k.dur);
      cur = { pos: lerp3(cur.pos, next.pos, t), look: lerp3(cur.look, next.look, t), fov: cur.fov + (next.fov - cur.fov) * t,
        roll: cur.roll + (next.roll - cur.roll) * t, dof: cur.dof + (next.dof - cur.dof) * t, focus: lerp3(cur.focus, next.focus, t) };
    } else cur = next;
  }
  let kick = 0;
  for (const [f0, amp] of shot.kicks ?? []) {
    const d = f - f0;
    if (d >= 0 && d < 8) kick += amp * (1 - d / 8) ** 2 * (d % 2 ? -1 : 1) * 0.018;
  }
  return { ...cur, roll: cur.roll + kick };
};

/** the camera key active at frame f (facing / view decisions are made once per key so cards never flicker) */
export const activeKey = (shot: ShotSpec, f: number): CamKey => {
  const keys = [...shot.camera].sort((a, b) => a.f - b.f);
  let k = keys[0];
  for (const x of keys) if (x.f <= f) k = x;
  return k;
};

/** where a world point lands in the frame: x, y in -1..1 when inside (x right, y up); behind = behind the camera */
export const inFrame = (c: CamPose, w: V3, aspect = 9 / 16) => {
  const F = norm([c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]]);
  const R = norm([-F[2], 0, F[0]]);
  const U: V3 = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  const d: V3 = [w[0] - c.pos[0], w[1] - c.pos[1], w[2] - c.pos[2]], dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const z = dot(d, F), ty = Math.tan(rad(c.fov) / 2);
  return { x: dot(d, R) / (z * ty * aspect), y: dot(d, U) / (z * ty), depth: z, behind: z <= 0.05 };
};
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
