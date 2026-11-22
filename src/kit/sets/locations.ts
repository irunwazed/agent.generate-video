// KIT LOCATIONS: ready-made places. Use them in a project: location: LOC.kantor({ wall: "green" }).
// Every location gives NAMED ANCHORS (seats, surfaces, spots, doors, windows, rungs) so shots never need raw
// coordinates, a default light, optional fixed sun (interiors: through the window) and practical lights.
// Convention: the stage is around x = 0, z = 0; the default camera stands at +z looking toward -z; +x = screen right.
// Gallery: npm run kit:locations -> out/kit/locations/*.jpg (one still per location with a sample cast).
import * as THREE from "three";
import { Batch, V3, col, tex, glow, sphere, cyl, flat, boxC, box, quad, lathe, rod, part } from "./prims";
import { room, ladder, stairs } from "./arch";
import { chair, officeChair, desk, shelf, wallClock, plant, lamp, frame, rug, counter, table, stool, bench, crate, barrel, sack, sofa, SEAT_H, TABLE_H, COUNTER_H, STOOL_H, BENCH_H, off } from "./furniture";
import { brickPaintTex, wallTex, tileTex, dirtTex, sandTex, asphaltTex, wallpaperTex, woodPanelTex, carpetTex, brickTex, rockTex } from "./textures";
import { tree, rock, flowers, scatter, hillRing, mountains, dunes, sea, shoreFoam, TreeKind } from "./nature";
import { fence, gravestone, marketStall, tent, campfire, flagpole, sandbags, anvil, forgeFurnace, pedestal, sign, porch, bell, Updater } from "./outdoor";
import { house, tower, skyline, shopRow, HouseStyle } from "./buildings";
import { army, CrowdVariant } from "./crowd";
import { grassHD, planksHD, ctex } from "../core/paint";
import { OUTFITS, Outfit } from "../toon/outfits";
import type { LocationDef, Anchor, PracticalSpec } from "../scene/types";
import type { LightName } from "../core/lights";

const ground = (b: Batch, m: THREE.Material, size = 400) => box(b, [-size / 2, -0.1, -size / 2], [size / 2, 0, size / 2], m);
const GRASS = () => tex("grassHD", grassHD, 6);
type Build = (b: Batch, root: THREE.Group) => Updater | Updater[] | void;
type LocUp = (f: number, t: number, state: Record<string, number>) => void;
const loc = (name: string, light: LightName, anchors: Record<string, Anchor>, build: Build, extra: Partial<LocationDef> = {}): LocationDef => ({
  name, light, anchors, ...extra,
  build: () => {
    const root = new THREE.Group(), b = new Batch();
    const up = build(b, root);
    b.build(root);
    const ups = up ? (Array.isArray(up) ? up : [up]) : [];
    return { root, update: ups.length ? ((f: number, t: number, st: Record<string, number>) => ups.forEach((u) => (u as LocUp)(f, t, st))) : undefined };
  },
});
const spot = (x: number, z: number, note?: string): Anchor => ({ pos: [x, 0, z], kind: "spot", note });
const seat = (x: number, z: number, h = SEAT_H, note?: string): Anchor => ({ pos: [x, 0, z], seat: h, kind: "seat", note });
const surf = (x: number, z: number, top = TABLE_H, note?: string): Anchor => ({ pos: [x, 0, z], top, kind: "surface", note });
/** scenery ring of trees outside the stage */
const forestRing = (b: Batch, n: number, kinds: TreeKind[], seed: number, r: [number, number, number, number] = [-40, -60, 40, 6], clear: [number, number, number, number] | null = [-5, -6, 5, 8]) =>
  scatter(n, r, seed, clear, (x, z, i, rr) => tree(b, [x, 0, z], kinds[i % kinds.length], 3.5 + rr() * 2.5, i + seed));

// =====================================================================================================================
// INTERIORS
// =====================================================================================================================
export type KantorOpts = { wall?: "green" | "cream" | "blue"; window?: "left" | "right" | "none"; night?: boolean };
/** office: desk facing the camera, office chair behind it, window light patch, wall clock, shelf, desk lamp */
export const kantor = (o: KantorOpts = {}): LocationDef => {
  const wallCol = o.wall === "cream" ? "#e8dcc0" : o.wall === "blue" ? "#9ab8d8" : "#8ec98a";
  const winSide = o.window ?? "left";
  const lampPos: V3 = [-0.42, TABLE_H + 0.24, -0.78];
  return loc("kantor", o.night ? "interior_warm" : "interior_office", {
    "desk.chair": { ...seat(0, -1.2), note: "behind the desk, facing the camera" },
    "desk.top": surf(0.1, -0.62, TABLE_H, "desk top (phone, paper, laptop)"),
    "desk.front": spot(0, 0.05, "standing in front of the desk (visitor)"),
    "guest": spot(1.05, -0.35, "standing beside the desk"),
    "guest.chair": seat(1.05, 0.35, SEAT_H, "visitor chair, facing the desk"),
    "door": { pos: [winSide === "left" ? 2.2 : -2.2, 0, -0.6], kind: "door" },
    "window": { pos: [winSide === "left" ? -2.2 : 2.2, 1.3, -0.9], kind: "window" },
    "center": spot(0, 0.6),
  }, (b, root) => {
    room(b, {
      w: 4.6, d: 4.4, h: 2.8, wall: tex("bpaint" + wallCol, () => brickPaintTex(wallCol), 1.6), floor: tex("tile#9ab0c8", () => tileTex("#9ab0c8", "#8aa2bc"), 1.0),
      openings: [...(winSide !== "none" ? [{ wall: winSide as "left" | "right", kind: "window" as const, at: -0.9, w: 1.4, h: 1.3, sill: 0.8, lit: o.night }] : []),
        { wall: winSide === "left" ? "right" : "left", kind: "door", at: -0.6, w: 0.95, h: 2.0 }],
    }, root);
    desk(b, [0, 0, -0.62], 0); officeChair(b, [0, 0, -1.2], 0); shelf(b, [1.5, 0, -2.0], 0, 1.0, 1.8); plant(b, [-1.9, 0, -1.8]);
    wallClock(b, [0, 2.15, -2.13], 0.24); frame(b, [-1.2, 1.6, -2.15], 0.6, 0.45, 0, "#8fc0e0");
    lamp(b, [lampPos[0], TABLE_H, lampPos[2]], "desk"); chair(b, [1.05, 0, 0.35], Math.PI);
  }, { sunDir: winSide === "right" ? [0.78, 0.5, 0.25] : [-0.78, 0.5, 0.25], practicals: [{ pos: lampPos, color: "#ffd890", intensity: o.night ? 1.6 : 0.7, distance: 3.2 }], note: "office" });
};
/** office with a big window wall behind the desk: city / desert at sunset outside (thinking, planning) */
export const kantor_jendela = (o: { view?: "city" | "desert" } = {}): LocationDef => loc("kantor_jendela", "dusk", {
  "desk.chair": seat(-0.5, -1.1, SEAT_H, "beside the window, facing the camera"), "desk.top": surf(-0.5, -0.5), "window": { pos: [0.6, 1.2, -1.9], kind: "window" }, "center": spot(0.4, 0.3),
}, (b, root) => {
  room(b, { w: 4.2, d: 3.8, h: 2.9, wall: tex("wpanel#c89a6a", () => woodPanelTex("#c89a6a"), 0.8), floor: tex("carpet#7a4a5a", () => carpetTex("#7a4a5a", "#5a2a3a"), 2), ceiling: null,
    openings: [{ wall: "back", kind: "window", at: 0.6, w: 2.6, h: 2.2, sill: 0.35 }] }, root);
  desk(b, [-0.5, 0, -0.5], 0, 1.4, 0.7, "#8a5a34"); officeChair(b, [-0.5, 0, -1.1], 0, "#3fa58c");
  lamp(b, [-1.05, TABLE_H, -0.55], "desk");
  if ((o.view ?? "city") === "city") skyline(b, 16, 60, false, 7); else dunes(b, 10, 6);
  ground(b, tex("sand#e6cf98", () => sandTex(), 4));
}, { sunDir: [0.2, 0.25, -1], practicals: [{ pos: [-1.05, TABLE_H + 0.24, -0.55], color: "#ffd890", intensity: 0.9, distance: 3 }], note: "office window at sunset" });
/** cafe / warung: wallpaper, counter at the back, round tables with chairs, pendant lamps */
export const kafe = (o: { night?: boolean } = {}): LocationDef => {
  const pend: V3[] = [[-0.9, 2.7, -0.4], [1.0, 2.7, -0.2]];
  return loc("kafe", "interior_warm", {
    "table1.top": surf(-0.9, -0.4, TABLE_H, "round table 1"), "table1.chair_a": seat(-1.45, -0.4), "table1.chair_b": seat(-0.35, -0.4),
    "table2.top": surf(1.0, -0.2), "table2.chair_a": seat(0.45, -0.2), "table2.chair_b": seat(1.55, -0.2),
    "counter.front": spot(0.2, -1.2, "customer at the counter"), "counter.back": spot(0.2, -2.15, "seller behind the counter"), "counter.top": surf(0.2, -1.75, COUNTER_H),
    "door": { pos: [-2.3, 0, 0.4], kind: "door" }, "center": spot(0, 0.6),
  }, (b, root) => {
    room(b, { w: 5.2, d: 5, h: 3.0, wall: tex("wp#8a2a3a", () => wallpaperTex("#8a2a3a", "#d8a85a"), 1.4), floor: tex("planksHD", planksHD, 1.2, "#c8986a"),
      wainscot: tex("wpanel#6b4426", () => woodPanelTex("#6b4426"), 0.6), wainscotH: 1.0, openings: [{ wall: "left", kind: "door", at: 0.4, w: 1.0, h: 2.1 }, { wall: "right", kind: "window", at: -0.8, w: 1.3, h: 1.2, lit: o.night }] }, root);
    counter(b, [0.2, 0, -1.75], 0, 2.8);
    shelf(b, [0.2, 0, -2.35], 0, 2.4, 1.9, "#6b4426");
    for (const [x, z] of [[-0.9, -0.4], [1.0, -0.2]]) { table(b, [x, 0, z], 0, 0.8, 0.8, "#8a5a34", true); chair(b, [x - 0.55, 0, z], Math.PI / 2); chair(b, [x + 0.55, 0, z], -Math.PI / 2); }
    for (const p of pend) lamp(b, p, "pendant");
    frame(b, [-1.6, 1.8, -2.45], 0.7, 0.5, 0, "#d8b860"); plant(b, [2.2, 0, 0.6]);
  }, { practicals: pend.map((p) => ({ pos: [p[0], p[1] - 0.78, p[2]] as V3, color: "#ffcf80", intensity: 1.4, distance: 3.4 })), sunDir: [0.8, 0.45, 0.3], note: "cafe / warung kopi" });
};
/** round table in a dim room (gambling, negotiating, family dinner): 4 seats around, pendant lamp above */
export const meja_bundar = (): LocationDef => loc("meja_bundar", "interior_warm", {
  "table.top": surf(0, -0.6), "seat_back": seat(0, -1.3, SEAT_H, "behind the table, facing the camera"), "seat_left": seat(-0.75, -0.6), "seat_right": seat(0.75, -0.6),
  "seat_front": seat(0, 0.1, SEAT_H, "back to the camera"), "stand": spot(1.4, 0.2),
}, (b, root) => {
  room(b, { w: 5, d: 4.4, h: 2.8, wall: tex("wp#5a2a3a", () => wallpaperTex("#5a2a3a", "#c88a4a"), 1.4), floor: tex("planksHD", planksHD, 1.2, "#9a6a42"),
    openings: [{ wall: "back", kind: "window", at: -1.4, w: 1.0, h: 1.2, lit: true }] }, root);
  table(b, [0, 0, -0.6], 0, 1.3, 1.3, "#7a4a2a", true);
  for (const [x, z, r] of [[0, -1.3, 0], [-0.75, -0.6, Math.PI / 2], [0.75, -0.6, -Math.PI / 2], [0, 0.1, Math.PI]] as [number, number, number][]) chair(b, [x, 0, z], r, "#6b3a1a");
  lamp(b, [0, 2.8, -0.6], "pendant"); shelf(b, [1.6, 0, -2.0], 0, 1.0, 1.8, "#5a3a22");
}, { practicals: [{ pos: [0, 2.0, -0.6], color: "#ffc070", intensity: 2.0, distance: 3.6 }], note: "round table, dim and warm" });
/** meeting circle: chairs in a ring, small table, banner on the back wall, round rug */
export const ruang_rapat = (o: { banner?: string } = {}): LocationDef => {
  const n = 6, R = 1.35, cz = -0.9, an: Record<string, Anchor> = { "table.top": surf(0, cz, 0.45, "low table in the middle"), "center": spot(0, cz) };
  for (let i = 0; i < n; i++) { const a = Math.PI * (0.15 + (0.7 * i) / (n - 1)) + Math.PI; an[`seat_${i}`] = seat(Math.cos(a) * R, cz + Math.sin(a) * R * 0.75); }
  return loc("ruang_rapat", "interior_office", an, (b, root) => {
    room(b, { w: 5.6, d: 5, h: 2.9, wall: tex("wall#8ac8b8", () => wallTex("#8ac8b8"), 2), floor: tex("tile#e8e2d4", () => tileTex("#e8e2d4"), 1.4), wainscot: tex("wpanel#b8865a", () => woodPanelTex("#b8865a"), 0.6), wainscotH: 0.9 }, root);
    rug(b, [0, 0, cz], 3.4, 2.8, "#d8c8a0", "#c0392b");
    for (let i = 0; i < n; i++) { const a = Math.PI * (0.15 + (0.7 * i) / (n - 1)) + Math.PI; chair(b, [Math.cos(a) * R, 0, cz + Math.sin(a) * R * 0.75], Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI, "#e8b84a"); }
    table(b, [0, 0, cz], 0, 0.7, 0.5, "#9a6a42");
    sign(b, [0, 2.2, -2.45], o.banner ?? "RAPAT WARGA", 2.6, 0.55, 0, "#f6f1e7", "#c0392b");
  }, { sunDir: [0.6, 0.6, 0.5], note: "meeting circle" });
};
/** dark room with one hanging bulb (presenting an idea, interrogation, secret talk) */
export const ruang_gelap = (): LocationDef => loc("ruang_gelap", "night", {
  "stool": seat(0, -0.4, STOOL_H, "stool under the bulb"), "center": spot(0, -0.4), "side": spot(1.0, -0.1),
}, (b, root) => {
  room(b, { w: 4.6, d: 4.4, h: 3.0, wall: tex("wall#2f3a3a", () => wallTex("#2f3a3a"), 2), floor: tex("rock#3a3a40", () => rockTex("#3a3a40"), 2), ceiling: null }, root);
  stool(b, [0, 0, -0.4], "#7a4a2a");
  lamp(b, [0, 3.0, -0.4], "pendant", 0, "#fff0c0");
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; flat(b, [Math.cos(a) * 0.01, 0.003, -0.4 + Math.sin(a) * 0.01], 2.6 - i * 0.5, 2.6 - i * 0.5, col(i % 2 ? "#2a2a30" : "#3a3a42")); }
}, { practicals: [{ pos: [0, 2.15, -0.4], color: "#fff0c0", intensity: 3.2, distance: 4.5 }], sunDir: [0.3, 0.9, 0.3], note: "dark room, one bulb" });
/** blacksmith workshop: forge with fire light, anvil, tool rack, brick walls */
export const bengkel_pandai_besi = (): LocationDef => {
  const fire: V3 = [-0.9, 0.75, -1.4 + 0.48];
  return loc("bengkel_pandai_besi", "forge", {
    "anvil": surf(0.35, -0.3, 0.65, "anvil top (hit target)"), "smith": spot(-0.35, -0.55, "blacksmith behind the anvil, facing the camera"),
    "fire": { pos: fire, kind: "mark" }, "helper": spot(1.2, -0.2), "center": spot(0, 0.5),
  }, (b, root) => {
    room(b, { w: 5, d: 4.4, h: 3.0, wall: tex("brick#a8503a", () => brickTex("#a8503a"), 1), floor: tex("dirt#7a5a42", () => dirtTex("#7a5a42"), 2), ceiling: null }, root);
    const fz = forgeFurnace(b, root, [-0.9, 0, -1.4]);
    anvil(b, [0.35, 0, -0.3], Math.PI / 2);
    shelf(b, [1.7, 0, -1.9], 0, 1.2, 1.6, "#5a3a22", false);
    for (let i = 0; i < 4; i++) rod(b, [1.25 + i * 0.25, 1.0, -2.0], [1.25 + i * 0.25, 1.7, -2.0], 0.02, col("#5d636c"), 5);
    barrel(b, [1.7, 0, -0.6], 0.7, "#6b4a30");
    return fz.update;
  }, { practicals: [{ pos: fire, color: "#ff9a40", intensity: 2.6, distance: 5, flicker: 0.6 }], sunDir: [0.5, 0.7, 0.5], note: "forge" });
};
/** headquarters room: wood panels, desk, map on the wall, flags on poles, lamp */
export const markas = (): LocationDef => loc("markas", "interior_warm", {
  "desk.chair": seat(0, -1.15), "desk.top": surf(0, -0.6), "map": { pos: [-1.1, 1.5, -2.1], kind: "mark", note: "the map on the wall" }, "guard": spot(1.3, -0.6), "center": spot(0, 0.5),
}, (b, root) => {
  room(b, { w: 4.8, d: 4.4, h: 2.9, wall: tex("wpanel#8a6a4a", () => woodPanelTex("#8a6a4a"), 0.7), floor: tex("planksHD", planksHD, 1.2, "#8a6a4a"), openings: [{ wall: "right", kind: "window", at: -0.8, w: 1.2, h: 1.3 }] }, root);
  desk(b, [0, 0, -0.6], 0, 1.4, 0.7, "#6b4426"); chair(b, [0, 0, -1.15], 0, "#4a2a18");
  const mapT = ctex("wallmap", 512, 360, (g) => { g.fillStyle = "#f1e6c4"; g.fillRect(0, 0, 512, 360); g.fillStyle = "#7ab0d0"; g.fillRect(14, 14, 484, 332); g.fillStyle = "#8cc07a"; for (const [x, y, w, h] of [[60, 120, 140, 50], [220, 150, 90, 40], [330, 120, 120, 60], [120, 220, 260, 40]]) { g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0.2, 0, Math.PI * 2); g.fill(); } g.strokeStyle = "#d0312d"; g.lineWidth = 6; g.setLineDash([14, 10]); g.beginPath(); g.moveTo(90, 140); g.lineTo(260, 170); g.lineTo(400, 150); g.stroke(); });
  frame(b, [-1.1, 1.5, -2.15], 1.5, 1.05, 0, "#ffffff");
  quad(b, [-1.1, 1.5, -2.12], 1.3, 0.85, new THREE.MeshLambertMaterial({ map: mapT }));
  lamp(b, [0.5, TABLE_H, -0.75], "desk");
  for (const x of [1.4, 1.9]) { cyl(b, [x, 0, -1.9], 0.03, 2.1, col("#c9a54a"), 6); }
}, { practicals: [{ pos: [0.5, TABLE_H + 0.24, -0.75], color: "#ffd890", intensity: 1.2, distance: 3.2 }], sunDir: [0.8, 0.5, 0.3], note: "HQ room" });

// =====================================================================================================================
// NATURE
// =====================================================================================================================
/** open sea to the horizon (use with a perahu / kapal vehicle) */
export const laut = (): LocationDef => loc("laut", "day", { "boat": { pos: [0, 0, 0], kind: "mark", note: "water level, put a vehicle here" }, "far": { pos: [0, 0, -12], kind: "mark" } }, (_b, root) => {
  const up = sea(root, 0);
  const b2 = new Batch();
  for (let i = 0; i < 4; i++) sphere(b2, [-120 + i * 70, -6, -230 - (i % 2) * 40], 18 + i * 3, col("#5f9e45"), [2, 0.5, 1], 12);
  b2.build(root);
  return up;
}, { note: "open sea" });
/** beach: sand in front, sea behind (shore at z = -5), palm trees, rocks */
export const pantai = (o: { palms?: number } = {}): LocationDef => loc("pantai", "day", {
  "sand": spot(0, 0), "shore": spot(0, -4.3, "the water's edge"), "palm": spot(-2.6, -1.2), "left": spot(-1.2, 0.2), "right": spot(1.2, 0.2), "sea": { pos: [0, 0, -9], kind: "mark" },
}, (b, root) => {
  box(b, [-200, -0.1, -5], [200, 0, 200], tex("sand#ecd8a6", () => sandTex("#ecd8a6"), 4));
  const up = sea(root, -0.04);
  const foam = shoreFoam(root, -5.1);
  for (let i = 0; i < (o.palms ?? 7); i++) { const s = i % 2 ? 1 : -1; tree(b, [s * (2.6 + (i * 1.9) % 8), 0, -1 - (i * 1.3) % 3 + (i > 3 ? 4 : 0)], "palm", 4.5 + (i % 3) * 0.6, i); }
  for (let i = 0; i < 6; i++) rock(b, [(i % 2 ? 1 : -1) * (4 + i * 1.5), 0, -4.4 - (i % 3) * 0.4], 0.4 + (i % 3) * 0.2);
  return [up, foam];
}, { note: "beach" });
/** mountain trail: grass, path, pine trees, big mountains on the horizon */
export const gunung = (o: { snow?: boolean } = {}): LocationDef => loc("gunung", "day", {
  "trail": spot(0, 0), "trail_far": spot(0.4, -6), "rock": spot(-1.6, -0.6), "left": spot(-1, 0.3), "right": spot(1, 0.3),
}, (b) => {
  ground(b, GRASS());
  flat(b, [0, 0.004, -14], 1.6, 52, tex("dirt", () => dirtTex(), 3));
  mountains(b, 5, 150, o.snow ?? true);
  hillRing(b, 9, 55, "#5f9e45", 3, 0.5);
  forestRing(b, 40, ["pine", "pine", "round"], 9);
  for (let i = 0; i < 8; i++) rock(b, [(i % 2 ? 1 : -1) * (1.6 + i * 0.9), 0, -1 - i * 1.4], 0.3 + (i % 3) * 0.25);
}, { note: "mountain trail" });
/** forest clearing: dense trees all around, bushes, path */
export const hutan = (o: { dark?: boolean } = {}): LocationDef => loc("hutan", o.dark ? "golden" : "day", {
  "clearing": spot(0, 0), "path": spot(0, -3), "behind_tree": spot(-1.9, -1.2, "hiding behind a tree"), "left": spot(-1, 0.4), "right": spot(1, 0.4),
}, (b) => {
  ground(b, GRASS());
  flat(b, [0, 0.004, -14], 1.4, 52, tex("dirt", () => dirtTex(), 3));
  forestRing(b, 90, ["round", "pine", "round", "bush"], 4, [-30, -45, 30, 4], [-2.4, -6, 2.4, 6]);
  tree(b, [-2.4, 0, -1.3], "round", 5.5, 2);
  for (let i = 0; i < 10; i++) tree(b, [(i % 2 ? 1 : -1) * (2.5 + (i * 0.7) % 3), 0, 1 - i * 0.8], "bush", 0.9, i);
  hillRing(b, 7, 70, "#3f7f3a", 2, 0.6);
}, { note: "forest" });
/** a single big tree in a meadow (resting, talking, a landmark) with a bench under it */
export const pohon_besar = (): LocationDef => loc("pohon_besar", "day", {
  "under_tree": spot(0.3, -1.2), "bench": seat(-0.6, -0.9, BENCH_H, "bench under the tree"), "left": spot(-1.3, 0.2), "right": spot(1.3, 0.2),
}, (b) => {
  ground(b, GRASS()); hillRing(b, 9, 60); tree(b, [0, 0, -2.6], "round", 9.5, 1);
  bench(b, [-0.6, 0, -0.9], 0); flowers(b, [0, 0, -0.5], 30, 6, 2); forestRing(b, 10, ["round"], 3, [-50, -70, 50, -15], null);
}, { note: "big tree" });
/** desert: sand, dunes, cacti, rocks, a dead tree */
export const padang_pasir = (): LocationDef => loc("padang_pasir", "day", { "center": spot(0, 0), "left": spot(-1.2, 0.2), "right": spot(1.2, 0.2), "dune": spot(0, -5) }, (b) => {
  ground(b, tex("sand#e6c788", () => sandTex("#e6c788"), 5));
  dunes(b, 14, 4);
  for (let i = 0; i < 9; i++) tree(b, [(i % 2 ? 1 : -1) * (2.8 + (i * 2.3) % 9), 0, -2 - (i * 3.1) % 14], i % 4 === 0 ? "dead" : "cactus", 1.8 + (i % 3) * 0.6, i);
  for (let i = 0; i < 6; i++) rock(b, [(i % 2 ? 1 : -1) * (2 + i), 0, -3 - i * 2], 0.4 + (i % 3) * 0.3, "#c89a6a");
}, { note: "desert" });
/** grassland / savanna: flowers, low hills, scattered trees, a big sky */
export const padang_rumput = (): LocationDef => loc("padang_rumput", "day", { "center": spot(0, 0), "left": spot(-1.2, 0.2), "right": spot(1.2, 0.2), "far": spot(0, -8) }, (b) => {
  ground(b, GRASS()); hillRing(b, 11, 70, "#7ab84f", 5, 0.25);
  for (let i = 0; i < 6; i++) flowers(b, [(i % 2 ? 1 : -1) * (2 + i * 1.3), 0, -1 - i * 1.6], 25, 2.5, i + 7);
  forestRing(b, 8, ["round", "bush"], 12, [-40, -50, 40, -10], null);
}, { note: "grassland" });
/** camping at night: tent, campfire (fire light), logs to sit on, pines around */
export const camping = (): LocationDef => loc("camping", "night", {
  "fire": { pos: [0, 0, -0.6], kind: "mark", note: "the campfire" }, "log_left": seat(-1.0, -0.5, 0.3, "log seat left of the fire"), "log_right": seat(1.0, -0.5, 0.3, "log seat right of the fire"),
  "tent": spot(-1.6, -2.2, "tent entrance"), "stand": spot(0.4, 0.5),
}, (b, root) => {
  ground(b, GRASS());
  const up = campfire(b, root, [0, 0, -0.6]);
  for (const s of [-1, 1]) rod(b, [s * 1.0 - 0.4, 0.15, -0.5], [s * 1.0 + 0.4, 0.15, -0.5], 0.14, col("#6a4026"), 8);
  tent(b, [-1.6, 0, -2.8], 0.3, "#3f7a5a");
  forestRing(b, 40, ["pine", "pine", "round"], 21, [-30, -40, 30, 5], [-4, -6, 4, 6]);
  return up;
}, { practicals: [{ pos: [0, 0.6, -0.6], color: "#ff9a40", intensity: 2.4, distance: 6, flicker: 0.7 }], stars: true, note: "camp at night" });
/** bamboo grove (gerilya hideout): bamboo clumps around a dirt clearing */
export const kebun_bambu = (): LocationDef => loc("kebun_bambu", "day", { "clearing": spot(0, 0), "left": spot(-1.1, 0.2), "right": spot(1.1, 0.2), "path": spot(0, -3) }, (b) => {
  ground(b, GRASS()); flat(b, [0, 0.004, -2], 5, 16, tex("dirt", () => dirtTex(), 3));
  scatter(28, [-20, -30, 20, 4], 31, [-3, -5, 3, 6], (x, z, i) => tree(b, [x, 0, z], i % 5 === 0 ? "banana" : "bamboo", 6 + (i % 3), i));
  hillRing(b, 7, 60, "#4f8f45", 8, 0.5);
}, { note: "bamboo grove" });

// =====================================================================================================================
// TOWN & BUILDINGS
// =====================================================================================================================
/** city street: asphalt road, sidewalk, a row of shops with small signs, street lamps, poles with wires */
export const jalan_kota = (o: { night?: boolean; shops?: string[] } = {}): LocationDef => {
  const lamps: V3[] = [[-3.5, 0, -1.2], [3.5, 0, -1.2]];
  return loc("jalan_kota", o.night ? "night_street" : "day", {
    "sidewalk": spot(0, -1.8, "sidewalk in front of the shops"), "sidewalk_left": spot(-2.2, -1.8), "sidewalk_right": spot(2.2, -1.8),
    "road": spot(0, 1.0, "middle of the road (vehicles)"), "road_far": spot(-8, 1.0), "curb": spot(0, -0.8),
  }, (b) => {
    box(b, [-200, -0.1, -0.6], [200, 0, 3.2], tex("asphalt", asphaltTex, 4));
    box(b, [-200, -0.1, -40], [200, 0.12, -0.6], tex("tile#c8c0b0", () => tileTex("#c8c0b0"), 1.2));
    for (let x = -40; x < 40; x += 3) box(b, [x, 0.001, 1.25], [x + 1.6, 0.006, 1.4], col("#f4f1ea"));
    shopRow(b, [0, 0, -4.6], o.shops ?? ["WARUNG", "APOTEK", "TOKO", "BENGKEL", "KOPI"], 3.4, !!o.night);
    for (const p of lamps) lamp(b, p, "street", Math.PI);
    for (const x of [-6, 6]) { cyl(b, [x, 0, -0.9], 0.07, 6, col("#6b4426"), 6); }
    rod(b, [-6, 5.6, -0.9], [6, 5.4, -0.9], 0.015, col("#2b2b30"), 4);
    box(b, [-200, -0.1, 3.2], [200, 0.12, 6], tex("tile#c8c0b0", () => tileTex("#c8c0b0"), 1.2));
  }, { practicals: o.night ? lamps.map((p) => ({ pos: [p[0], 3.25, p[2] - 0.3] as V3, color: "#ffd890", intensity: 2.4, distance: 7 })) : [], note: "city street" });
};
/** tower at night with ONE lit window (somebody still working), skyline behind */
export const gedung_malam = (o: { floors?: number; litFloor?: number; litCol?: number } = {}): LocationDef => {
  const floors = o.floors ?? 14, lf = o.litFloor ?? 7, lc = o.litCol ?? 1, fh = 3.2, cols = 4, w = cols * 2.2;
  const win: V3 = [-w / 2 + (lc + 0.5) * (w / cols), (lf + 0.5) * fh, w / 2 + 0.03];
  return loc("gedung_malam", "night_street", {
    "lit_window": { pos: win, kind: "window", note: "the one lit window (point the camera here)" }, "street": spot(0, w / 2 + 4), "base": spot(0, w / 2 + 1.5),
  }, (b) => {
    ground(b, tex("asphalt", asphaltTex, 4));
    const t = tower(b, [0, 0, 0], { floors, cols, wall: "#2a3460", glass: "#1e2650", key: "night" + floors });
    // the lit window with a small person silhouette at a desk
    const lw = ctex("litwin_person", 256, 200, (g) => {
      g.fillStyle = "#ffd88a"; g.fillRect(0, 0, 256, 200);
      g.fillStyle = "#c08a4a"; g.fillRect(0, 150, 256, 50);
      g.fillStyle = "#3a2a3a"; g.beginPath(); g.arc(150, 70, 24, 0, Math.PI * 2); g.fill(); g.fillRect(126, 92, 48, 60);
      g.fillStyle = "#5a7ab0"; g.fillRect(70, 100, 50, 40);
    });
    quad(b, win, (w / cols) * 0.76, fh * 0.64, new THREE.MeshBasicMaterial({ map: lw, color: new THREE.Color(1.8, 1.7, 1.5), fog: false }));
    skyline(b, 16, 70, true, 4);
    void t;
  }, { practicals: [{ pos: [win[0], win[1], win[2] + 0.8], color: "#ffd890", intensity: 1.5, distance: 4 }], stars: true, note: "night tower, one lit window" });
};
/** tall tower with numbered floors, palm trees, street (counting floors, "lantai 12") */
export const gedung_tinggi = (o: { floors?: number } = {}): LocationDef => {
  const floors = o.floors ?? 14;
  return loc("gedung_tinggi", "day", { "entrance": spot(0, 5.4, "in front of the door"), "street": spot(-3, 8), "top": { pos: [0, floors * 3.2, 0], kind: "mark" } }, (b) => {
    ground(b, tex("tile#e0d6c4", () => tileTex("#e0d6c4"), 1.5));
    box(b, [-200, -0.08, 7], [200, 0.01, 11], tex("asphalt", asphaltTex, 4));
    tower(b, [0, 0, 0], { floors, cols: 4, wall: "#e8a878", glass: "#5ab8c8", numbers: true });
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) tree(b, [s * (6.5 + i * 3), 0, 4 + i * 2], "palm", 7, i + 2);
    box(b, [-1, 0, 4.38], [1, 2.4, 4.42], col("#2f5a48"));
  }, { note: "tower with floor numbers" });
};
/** building entrance at night: lit doorway spilling light, signs, a guard spot */
export const pintu_masuk_gedung = (o: { name?: string } = {}): LocationDef => loc("pintu_masuk_gedung", "night_street", {
  "door": spot(0.4, -0.6, "in the doorway"), "guard": spot(-1.1, 0.1, "guard beside the door"), "street": spot(0.6, 1.6), "center": spot(0, 0.6),
}, (b) => {
  box(b, [-100, -0.1, -2], [100, 0, 100], tex("tile#5a5a6a", () => tileTex("#5a5a6a", "#4a4a5a"), 1.4));
  boxC(b, [0, 4, -2.2], [7, 8, 0.4], tex("wall#3a3a5a", () => wallTex("#3a3a5a"), 2));
  box(b, [-0.5, 0, -2.0], [1.3, 2.4, -1.98], glow("#ffd890", 1.5));
  for (const x of [-0.55, 1.35]) boxC(b, [x, 1.25, -1.95], [0.12, 2.5, 0.2], col("#b8b0a0"));
  sign(b, [0.4, 3.2, -1.95], o.name ?? "GEDUNG", 2.8, 0.7, 0, "#4a2a5a", "#f2c94c");
  sign(b, [2.4, 2.0, -1.95], "BUKA", 0.9, 0.35, 0, "#8a2430");
}, { practicals: [{ pos: [0.4, 1.4, -1.2], color: "#ffd890", intensity: 2.2, distance: 5 }], note: "lit doorway at night" });
/** a house with a yard and fence (modern / kampung / joglo / kolonial / western) */
export const rumah = (o: { style?: HouseStyle; night?: boolean } = {}): LocationDef => loc("rumah", o.night ? "night_street" : "day", {
  "door": spot(0.1, -0.3, "at the front door"), "yard": spot(-1.2, 1.2), "gate": spot(2.6, 2.6), "center": spot(0, 1.6),
}, (b) => {
  ground(b, GRASS());
  const h = house(b, [0, 0, -3.5], o.style ?? "modern", { lit: !!o.night });
  fence(b, [-5, 0, 3], [2.2, 0, 3]); fence(b, [3.0, 0, 3], [5, 0, 3]);
  tree(b, [-4, 0, -1], "round", 4.5, 2); tree(b, [4.2, 0, -2], "banana", 3, 1);
  hillRing(b); void h;
}, { practicals: o.night ? [{ pos: [0.1, 1.4, -1.2], color: "#ffd890", intensity: 1.5, distance: 4 }] : [], stars: o.night, note: "house" });
/** terrace / porch: two chairs and a small table in front of the house wall */
export const teras = (o: { night?: boolean } = {}): LocationDef => loc("teras", o.night ? "night_street" : "golden", {
  "chair_left": seat(-0.7, -0.6, SEAT_H + 0.24), "chair_right": seat(0.7, -0.6, SEAT_H + 0.24), "table.top": surf(0, -0.6, TABLE_H + 0.24 - 0.15),
  "step": spot(0, 1.4, "at the porch steps"), "door": spot(1.6, -1.1),
}, (b) => {
  ground(b, GRASS());
  boxC(b, [0, 1.6, -1.5], [6, 3.2, 0.3], tex("wall#e8dcc0", () => wallTex("#e8dcc0"), 2));
  porch(b, [0, 0, -0.5], 5.6, 2.2, 2.6);
  for (const x of [-0.7, 0.7]) chair(b, [x, 0.24, -0.6], 0, "#8a5a34");
  table(b, [0, 0.24, -0.6], 0, 0.5, 0.5, "#6b4426", true);
  plant(b, [-2.2, 0.24, -1.1]); plant(b, [2.2, 0.24, -1.1]);
}, { sunDir: [0.6, 0.35, 0.7], note: "porch" });
/** old house (zaman dulu): kolonial or joglo with a garden */
export const rumah_dulu = (o: { style?: "kolonial" | "joglo" } = {}): LocationDef => rumah({ style: o.style ?? "kolonial" });
/** kampung: raised bamboo houses, bamboo fence, banana trees, dirt road */
export const kampung = (): LocationDef => loc("kampung", "day", {
  "road": spot(0, 1.0), "house_door": spot(-2.6, -1.3, "below the house steps"), "left": spot(-1.2, 0.6), "right": spot(1.2, 0.6), "well": spot(2.6, -0.4),
}, (b) => {
  ground(b, GRASS()); box(b, [-100, -0.08, -0.3], [100, 0.005, 2.6], tex("dirt", () => dirtTex(), 3));
  house(b, [-3.2, 0, -4.2], "kampung"); house(b, [3.6, 0, -5.2], "kampung", { ry: -0.3 }); house(b, [-10, 0, -6], "kampung", { ry: 0.3 });
  fence(b, [-8, 0, -1.2], [-0.8, 0, -1.2], "bamboo", 0.9); fence(b, [1.2, 0, -1.2], [8, 0, -1.2], "bamboo", 0.9);
  for (let i = 0; i < 8; i++) tree(b, [(i % 2 ? 1 : -1) * (5 + i * 1.5), 0, -2.5 - i], i % 3 ? "banana" : "round", 3 + (i % 3), i);
  hillRing(b, 9, 55, "#5f9e45", 2, 0.45);
}, { note: "village" });
/** big town square / field: flagpole with the flag, trees around, buildings far */
export const lapangan_besar = (o: { flag?: "id" | "nl" | "jp" } = {}): LocationDef => loc("lapangan_besar", "day", {
  "flagpole": spot(0.2, -3.9, "in front of the flagpole"), "center": spot(0, 0), "row_left": spot(-1.6, -1.5), "row_right": spot(1.6, -1.5), "front": spot(0, 2),
}, (b, root) => {
  ground(b, GRASS());
  const up = flagpole(b, root, [0, 0, -5], 7, o.flag ?? "id");
  for (let i = 0; i < 14; i++) { const a = Math.PI * (1.05 + (0.9 * i) / 13); tree(b, [Math.cos(a) * 18, 0, -5 + Math.sin(a) * 14], "round", 5, i); }
  house(b, [-14, 0, -24], "kolonial"); house(b, [12, 0, -26], "kolonial");
  return up;
}, { note: "town square with a flag" });
/** the old open field (training ground) */
export const lapangan = (o: { path?: boolean; trees?: number } = {}): LocationDef => loc("lapangan", "day", {
  "center": spot(0, 0), "left": spot(-1.2, 0), "right": spot(1.2, 0), "back": spot(0, -3), "front": spot(0, 1.5),
}, (b) => {
  ground(b, GRASS());
  if (o.path ?? true) flat(b, [0, 0.004, -14], 2.2, 52, tex("dirt", () => dirtTex(), 3));
  hillRing(b);
  forestRing(b, o.trees ?? 14, ["round"], 1, [-30, -50, 30, -8], null);
}, { note: "open field" });

// =====================================================================================================================
// OTHER
// =====================================================================================================================
/** ship deck: planks, rails, mast + sail, barrels and crates, sea around (rail spots = throw things overboard) */
export const dek_kapal = (): LocationDef => loc("dek_kapal", "day", {
  "deck": spot(0, 0), "rail_left": spot(-2.3, -0.4, "at the left rail (throw overboard)"), "rail_right": spot(2.3, -0.4), "mast": spot(0.4, -2.2), "wheel": spot(0, 4.6, "ship's wheel at the stern (behind the default camera)"),
  "sea_left": { pos: [-4.5, -2.4, -0.4], kind: "mark", note: "where things splash into the sea" },
}, (b, root) => {
  const up = sea(root, -2.4);
  box(b, [-2.6, -2.6, -8], [2.6, 0, 6], tex("planksHD", planksHD, 1.2, "#c8986a"));
  for (const s of [-1, 1]) { box(b, [s * 2.6 - 0.1, 0, -8], [s * 2.6 + 0.1, 0.9, 6], col("#8a3a2a")); box(b, [s * 2.6 - 0.15, 0.9, -8], [s * 2.6 + 0.15, 1.0, 6], col("#6b4426")); }
  box(b, [-2.7, -2.6, -8.2], [2.7, 1.0, -8], col("#8a3a2a"));
  cyl(b, [0.4, 0, -2.6], 0.14, 11, col("#8a5a34"), 10);
  boxC(b, [0.4, 7.5, -2.6], [4.2, 0.12, 0.12], col("#6b4426"));
  const sail = part(new THREE.PlaneGeometry(4, 5, 8, 8), new THREE.MeshLambertMaterial({ color: "#f4ecd8", side: THREE.DoubleSide }), [0.4, 4.9, -2.5]);
  root.add(sail);
  for (const [x, z] of [[-1.8, -1.5], [-1.5, -2.6], [1.7, 0.8]]) barrel(b, [x, 0, z]);
  crate(b, [1.6, 0, -1.8], 0.6); crate(b, [1.8, 0.6, -1.8], 0.45);
  boxC(b, [0, 0.55, 5.2], [0.12, 1.1, 0.12], col("#6b4426"));
  b.add(new THREE.TorusGeometry(0.42, 0.04, 6, 18), col("#8a5a34"), new THREE.Matrix4().makeTranslation(0, 1.15, 5.22));
  const pos = (sail.geometry as THREE.BufferGeometry).getAttribute("position") as THREE.BufferAttribute, base = Float32Array.from(pos.array as Float32Array);
  return [up, (_f, t) => { for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.35 * Math.sin((base[i * 3] + 2) * 0.6) * (0.8 + 0.2 * Math.sin(t))); pos.needsUpdate = true; }];
}, { note: "ship deck at sea" });
/** market with a queue: a stall with an awning (seller behind), queue spots queue_0 (front) .. queue_7 */
export const pasar_antre = (o: { stall?: string } = {}): LocationDef => {
  const an: Record<string, Anchor> = { "stall.front": spot(1.4, 0.2, "at the stall counter"), "stall.back": spot(1.4, -0.75, "seller behind the counter"), "stall.top": surf(1.4, -0.3, 0.9) };
  for (let i = 0; i < 8; i++) an[`queue_${i}`] = spot(0.55 - i * 0.72, 0.3 + (i % 2) * 0.08, i ? undefined : "first in line");
  return loc("pasar_antre", "day", an, (b) => {
    ground(b, GRASS()); box(b, [-100, -0.08, -1.2], [100, 0.005, 2.4], tex("dirt", () => dirtTex("#b89a6a"), 3));
    marketStall(b, [1.4, 0, -0.35], 0);
    sign(b, [1.4, 2.7, 0.12], o.stall ?? "BERAS", 1.6, 0.45, 0, "#8a2430", "#f6efd8");
    house(b, [-4, 0, -6], "modern", { wall: "#f4ecd8" }); house(b, [4.5, 0, -7], "modern", { wall: "#e8d8c0", roof: "#8a3a2a" });
    tower(b, [-1, 0, -14], { floors: 4, cols: 1, w: 2.4, d: 2.4, wall: "#e8e4da", glass: "#6a7a8a" });
    lathe(b, [[1.6, 0], [0.001, 3.2]], col("#3a5a8a"), [-1, 12.8, -14], 8);
    hillRing(b, 9, 50, "#6fae4f", 4, 0.6);
  }, { note: "market queue" });
};
/** night plaza: ring-patterned floor, pedestal with a glass dome over a red button, lamp posts, lit houses */
export const plaza_malam = (): LocationDef => loc("plaza_malam", "night_street", {
  "pedestal": spot(0.55, -0.3, "beside the pedestal (reach the dome / button)"), "button": { pos: [0, 1.24, -0.7], kind: "mark", note: "the red button" },
  "guard_left": spot(-1.4, 0), "guard_right": spot(1.6, -0.2), "center": spot(0, 0.8),
}, (b, root) => {
  const ringT = ctex("plazaRings", 1024, 1024, (g) => { g.fillStyle = "#3a4a7a"; g.fillRect(0, 0, 1024, 1024); for (let i = 12; i > 0; i--) { g.beginPath(); g.arc(512, 512, i * 42, 0, Math.PI * 2); g.fillStyle = i % 2 ? "#46588a" : "#3a4a7a"; g.fill(); } g.strokeStyle = "#e8b84a"; g.lineWidth = 10; g.beginPath(); g.arc(512, 512, 300, 0, Math.PI * 2); g.stroke(); });
  ground(b, tex("tile#3a4a6a", () => tileTex("#3a4a6a"), 1.5));
  flat(b, [0, 0.005, -0.7], 20, 20, new THREE.MeshLambertMaterial({ map: ringT }));
  const ped = pedestal(b, root, [0, 0, -0.7]), domeY = ped.dome.position.y;
  for (const x of [-5, 5]) lamp(b, [x, 0, -3], "street", 0);
  for (let i = 0; i < 8; i++) { const a = Math.PI * (1.1 + (0.8 * i) / 7); house(b, [Math.cos(a) * 16, 0, -4 + Math.sin(a) * 12], "modern", { ry: -a - Math.PI / 2, wall: "#4a5a8a", roof: "#2a3460", lit: i % 2 === 0 }); }
  return (_f, _t, st) => { ped.dome.position.y = domeY + 0.5 * (st?.dome ?? 0); };
}, { practicals: [{ pos: [-5, 3.25, -2.7], color: "#ffd890", intensity: 2.2, distance: 8 }, { pos: [5, 3.25, -2.7], color: "#ffd890", intensity: 2.2, distance: 8 }], stars: true, note: "night plaza with a button" });
/** tall wall with a ladder (climbing scenes: rung anchors rung_0 .. rung_n) */
export const dinding_tangga = (o: { h?: number } = {}): LocationDef => {
  const h = o.h ?? 9, n = Math.floor(h / 0.3), an: Record<string, Anchor> = { "ladder_base": spot(0, -0.35, "at the foot of the ladder"), "left": spot(-1.2, 0.4), "top": { pos: [0, h, -0.5], kind: "mark" } };
  for (let i = 0; i < n; i++) { const t = (i + 1) / (n + 0.5); an[`rung_${i}`] = { pos: [0, h * t, -0.2 - 0.12 * t + 0.17], kind: "rung", note: "feet on this rung, body in front of the ladder" }; }
  return loc("dinding_tangga", "day", an, (b) => {
    ground(b, GRASS());
    boxC(b, [0, h / 2 + 1, -0.6], [12, h + 2, 0.5], tex("bpaint#7aa8d8", () => brickPaintTex("#7aa8d8"), 2));
    ladder(b, [0, 0, -0.2], h, 0.5, 0.12);
    hillRing(b);
  }, { note: "climbing a tall wall" });
};
/** house at night behind a picket fence with graves in the yard and a bell post (spooky / sad stories) */
export const halaman_malam = (): LocationDef => loc("halaman_malam", "night_street", {
  "yard": spot(0.2, 0.6), "grave": spot(-1.0, -0.6, "beside the graves"), "bell": spot(2.0, 0.6), "gate": spot(-2.4, 1.6),
}, (b) => {
  ground(b, GRASS());
  house(b, [0.5, 0, -6], "modern", { wall: "#5aa0a8", roof: "#3a4a6a", lit: true });
  fence(b, [-6, 0, -3.2], [6, 0, -3.2], "picket", 1.0, "#e8e4da");
  for (let i = 0; i < 5; i++) gravestone(b, [-2.4 + i * 1.2, 0, -1.4 - (i % 2) * 0.8], (["slab", "cross", "nisan", "slab", "cross"] as const)[i]);
  bell(b, [2.6, 0, 0.2], Math.PI);
  forestRing(b, 30, ["pine"], 5, [-40, -40, 40, -8], null);
}, { practicals: [{ pos: [0.5, 1.8, -3.9], color: "#ffd890", intensity: 1.2, distance: 5 }], stars: true, note: "yard with graves at night" });
/** battlefield: two armies with flags facing each other across a field, leader spots in front */
export const medan_perang = (o: { left?: Outfit; right?: Outfit; leftFlag?: "id" | "nl" | "jp" | "uk" | "red" | "blue"; rightFlag?: "id" | "nl" | "jp" | "uk" | "red" | "blue"; rows?: number; cols?: number } = {}): LocationDef => {
  const L = o.left ?? OUTFITS.tni, R = o.right ?? OUTFITS.knil;
  return loc("medan_perang", "day", {
    "leader_left": spot(-1.2, 0.4, "left leader, in front of the left army"), "leader_right": spot(1.2, 0.4), "center": spot(0, 0.6),
    "army_left": spot(-4, -6), "army_right": spot(4, -6), "no_mans_land": spot(0, -4),
  }, (b, root) => {
    ground(b, GRASS());
    box(b, [-0.8, -0.08, -200], [0.8, 0.005, 20], tex("dirt", () => dirtTex(), 3));
    const vL: CrowdVariant[] = [{ outfit: L, hold: { prop: "rifle", style: "shoulder" }, facing: 1 }, { outfit: L, hold: { prop: "bambu_runcing", style: "upright" }, facing: 1 }, { outfit: L, hold: { prop: "rifle", style: "order" }, facing: 1 }];
    const vR: CrowdVariant[] = [{ outfit: R, hold: { prop: "rifle", style: "shoulder" }, facing: -1 }, { outfit: R, hold: { prop: "rifle", style: "order" }, facing: -1 }];
    root.add(army({ origin: [-4.0, 0, -2.5], rows: o.rows ?? 16, cols: o.cols ?? 6, variants: vL, key: "armyL" + JSON.stringify(L) }));
    root.add(army({ origin: [4.0, 0, -2.5], rows: o.rows ?? 16, cols: o.cols ?? 6, variants: vR, key: "armyR" + JSON.stringify(R) }));
    const ups: Updater[] = [];
    for (const [x, fl] of [[-2.8, o.leftFlag ?? "id"], [2.8, o.rightFlag ?? "nl"]] as [number, "id"][]) for (const z of [-3, -8]) ups.push(flagpole(b, root, [x * (z < -5 ? 1.8 : 1), 0, z], 4, fl, 1.1));
    hillRing(b, 9, 70); forestRing(b, 14, ["round"], 8, [-60, -90, 60, -40], null);
    return ups;
  }, { note: "battlefield with two armies" });
};

export const LOC = {
  kantor, kantor_jendela, kafe, meja_bundar, ruang_rapat, ruang_gelap, bengkel_pandai_besi, markas,
  laut, pantai, gunung, hutan, pohon_besar, padang_pasir, padang_rumput, camping, kebun_bambu,
  jalan_kota, gedung_malam, gedung_tinggi, pintu_masuk_gedung, rumah, teras, rumah_dulu, kampung, lapangan_besar, lapangan,
  dek_kapal, pasar_antre, plaza_malam, dinding_tangga, halaman_malam, medan_perang,
};
export type LocName = keyof typeof LOC;
export const LOC_NAMES = Object.keys(LOC) as LocName[];
void stairs; void sofa; void sack; void glow; void cyl;
