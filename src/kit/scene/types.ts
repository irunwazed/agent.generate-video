// KIT SCENE: the data a project writes. PURE types (no three, no DOM) so the validator can read projects in Node.
//
// A project = cast (who -> outfit) + shots. A shot = a location + who stands where doing what + camera keys.
// Positions are metres on the floor: [x, z] (y = floor) or [x, y, z], or the NAME of a location anchor
// ("desk.chair", "door", "stage"). The default camera looks from +z toward -z, so +x is screen-right.
import type { Outfit } from "../toon/outfits";
import type { Expr } from "../toon/head";
import type { Pose, HoldIn, PropState } from "../rig/types";
import type { LightName } from "../core/lights";
import type { VehicleSpec } from "../vehicles/defs";
export type { VehicleSpec };

export type V3 = [number, number, number];
export type Place = string | [number, number] | V3;

/** a location anchor: a named point the cast / props / camera can refer to */
export type Anchor = {
  pos: V3;
  /** facing direction of the thing (degrees, 0 = toward +z / the default camera) */
  yaw?: number;
  /** seat height (m) for seats; surface height (m) for tables / counters */
  seat?: number; top?: number;
  kind?: "seat" | "surface" | "spot" | "door" | "window" | "rung" | "mark" | "vehicle";
  note?: string;
};
/** suggested camera placement for a location */
export type CamHint = { pos: V3; look: V3; fov?: number };
export type PracticalSpec = {
  /** world position of the light */
  pos: V3; color: string; intensity: number; distance: number;
  /** flicker amount 0..1 (fire, candles) */
  flicker?: number;
  /** red / blue alternation (police siren) in Hz */
  siren?: number;
};

/** a ready-made location (see kit/sets/locations.ts). `build` only runs inside the renderer. */
export type LocationDef = {
  name: string;
  /** default light preset for shots in this location */
  light: LightName;
  /** fixed world sun direction (toward the sun); interiors use it so light falls through the window */
  sunDir?: V3;
  anchors: Record<string, Anchor>;
  /** floor footprints of furniture [x0, z0, x1, z1] (validator: actors must not stand inside) */
  foot?: [number, number, number, number][];
  /** walkable bounds [x0, z0, x1, z1] (validator: actors must stay inside) */
  bounds?: [number, number, number, number];
  practicals?: PracticalSpec[];
  stars?: boolean;
  cams?: Record<string, CamHint>;
  /** default camera azimuth (degrees): 0 = camera at +z looking toward -z */
  front?: number;
  note?: string;
  /** builds the geometry; returns the root and an optional per-frame updater */
  build: () => { root: unknown; update?: (f: number, t: number, state: Record<string, number>) => void };
};

export type Facing = "camera" | "left" | "right" | "away";
export type CastSpec = {
  /** key in Project.cast */
  who: string;
  /** actor id inside the shot (defaults to who); actions / cameras refer to it */
  id?: string;
  at: Place;
  /** named pose (kit/rig/poses.ts) or a custom Pose */
  pose?: string | Pose;
  /** screen-relative facing; or lookAt another actor / place (the kit picks left / right itself) */
  facing?: Facing;
  lookAt?: string | Place;
  hold?: HoldIn | null;
  /** extra carried props (sheathed sword, slung rifle) */
  extra?: HoldIn[];
  expr?: Expr;
  /** card scale (default 0.84: adults 1.41 m) */
  scale?: number;
  /** soot on the face 0..1 (after an explosion) */
  soot?: number;
  /** sit / stand in a vehicle seat (the vehicle moves the actor): { vehicle: "car1", seat: "driver" } */
  ride?: { vehicle: string; seat: string };
};
/** a prop lying / standing in the world (it can be picked up by an action) */
export type PropSpec = {
  id: string;
  prop: string;
  at: Place;
  /** height above the anchor / floor (m); for surfaces the anchor's top is used automatically */
  y?: number;
  /** angle on the card (degrees) */
  angle?: number;
  /** lie flat on the surface (phone, paper, map) or stand as a camera-facing card (cup, bottle, rifle against a wall) */
  flat?: boolean;
  st?: PropState;
  scale?: number;
};
export type CamPreset = "estab" | "wide" | "full" | "medium" | "close" | "insert" | "twoShot" | "ots" | "lowHero" | "highDown" | "pov" | "follow" | "free";
export type CamKey = {
  /** absolute frame where this key starts */
  f: number;
  preset: CamPreset;
  /** subject: actor id, anchor name, prop id or a place; or a GROUP of ids ["budi", "joko"]: the camera backs off until all fit */
  on?: string | Place | string[];
  /** second subject (twoShot / ots / pov) */
  to?: string | Place;
  /** hard cut (default) or glide over `dur` frames */
  cut?: boolean; dur?: number;
  /** orbit around the subject in degrees (+ = camera moves to the subject's left = screen pans right) */
  angle?: number;
  /** overrides */
  dist?: number; height?: number; fov?: number; roll?: number; lookY?: number;
  /** creep (push-in) per frame, e.g. 0.003; "punch" = strong push for emphasis */
  push?: number | "punch";
  /** depth-of-field blur at 1080 px (0 = sharp) */
  dof?: number;
  /** explicit placement for preset "free" */
  pos?: V3; look?: V3;
};
export type ShotSpec = {
  id: string;
  /** absolute frames [a, b) of the whole video */
  a: number; b: number;
  location: LocationDef;
  light?: LightName;
  cast?: CastSpec[];
  props?: PropSpec[];
  actions?: ActionSpec[];
  camera: CamKey[];
  /** cross-fade into this shot over n frames */
  xfade?: number;
  /** white flash on the first frames of the shot */
  flash?: boolean;
  /** impact shakes: [frame, strength ~1] */
  kicks?: [number, number][];
  /** extra practical lights for this shot */
  practicals?: PracticalSpec[];
  /** vehicles in this shot (cars, bikes, tanks, planes, boats); see kit/vehicles/defs.ts */
  vehicles?: VehicleSpec[];
  note?: string;
};
/** actions are defined in kit/actions (see ACTIONS there); `at` = contact frame (the word onset) */
export type ActionSpec = {
  who: string; do: string; at: number;
  prop?: string; target?: string | Place; to?: string | Place; style?: string;
  dur?: number; kind?: string; fall?: boolean; times?: number;
  [k: string]: unknown;
};
export type Project = {
  name: string;
  fps: number;
  width?: number; height?: number;
  /** total frames (default: last shot end) */
  total?: number;
  /** file in public/ */
  audio?: string;
  /** caption chunks [{text, start, end}] in seconds */
  captions?: { text: string; start: number; end: number }[];
  cast: Record<string, Outfit>;
  shots: ShotSpec[];
};
