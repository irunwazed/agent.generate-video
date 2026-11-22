// KIT SETS: instanced crowds / armies. A few figure variants (outfit + hold) are drawn once into an atlas canvas with
// the normal rig, then hundreds of camera-facing quads (billboarded in the vertex shader) pick a cell each.
// For groups of <= 8 people use normal cast members instead (they can act); crowds are scenery.
import * as THREE from "three";
import { Pen } from "../toon/pen";
import type { Outfit } from "../toon/outfits";
import { solve } from "../rig/solve";
import { drawRig } from "../rig/draw";
import type { HoldIn } from "../rig/types";
import { NOINK } from "../core/ink";
import { SU } from "../cast/actor";
import { rng } from "../core/paint";
import type { V3 } from "./prims";

export type CrowdVariant = { outfit: Outfit; hold?: HoldIn | null; facing?: -1 | 0 | 1 };
const CELL_W = 220, CELL_H = 380, K = 0.32;

const atlasCache = new Map<string, THREE.CanvasTexture>();
const atlas = (key: string, vars: CrowdVariant[]) => {
  let t = atlasCache.get(key);
  if (t) return t;
  const cv = document.createElement("canvas");
  cv.width = CELL_W * vars.length; cv.height = CELL_H;
  const g = cv.getContext("2d")!;
  vars.forEach((v, i) => {
    const J = solve({ outfit: v.outfit, pose: { gait: "still" }, facing: v.facing ?? 0, seed: 1 + (i % 6), hold: v.hold ?? null });
    // fixed cell frame: design x -300..900, y -200..1000 (spears / flags fit)
    const sx = CELL_W / 1200, sy = CELL_H / 1200;
    g.setTransform(sx, 0, 0, sy, i * CELL_W + 300 * sx, 200 * sy);
    drawRig(new Pen(g), v.outfit, J, { expr: "stern" });
  });
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  atlasCache.set(key, t);
  return t;
};

/** a rectangular block of figures: rows x cols around `origin`, spacing (m); returns the mesh (add it to the root) */
export const army = (o: { origin: V3; rows: number; cols: number; spacing?: [number, number]; variants: CrowdVariant[]; key: string; seed?: number; scale?: number; jitter?: number; tint?: string }) => {
  const sp = o.spacing ?? [0.75, 0.9], n = o.rows * o.cols, r = rng(o.seed ?? 5), sc = o.scale ?? 0.84;
  const w = 1200 * SU * sc, h = 1200 * SU * sc;
  // quad: x -0.5..0.5 of width w (centred on the figure x at design 300 -> offset), y from -200/1200..1000/1200 of h
  const geo = new THREE.PlaneGeometry(w, h).translate(0, h * (0.5 - 25 / 1200), 0);
  const mat = new THREE.MeshBasicMaterial({ map: atlas(o.key, o.variants), alphaTest: 0.5, side: THREE.DoubleSide, color: o.tint ?? "#ffffff" });
  const nv = o.variants.length;
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aCell;")
      .replace("#include <uv_vertex>", `#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = vec2((aCell + uv.x) / ${nv.toFixed(1)}, uv.y);\n#endif`)
      .replace("#include <project_vertex>", `
        vec4 iO = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec3 toC = cameraPosition - iO.xyz; toC.y = 0.0; toC = normalize(toC + vec3(1e-5));
        vec3 rgt = vec3(toC.z, 0.0, -toC.x);
        float isx = length(instanceMatrix[0].xyz);
        vec3 wpos = iO.xyz + rgt * transformed.x * isx + vec3(0.0, transformed.y * isx, 0.0);
        vec4 mvPosition = viewMatrix * vec4(wpos, 1.0);
        gl_Position = projectionMatrix * mvPosition;`);
  };
  mat.customProgramCacheKey = () => "crowd" + nv;
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const cells = new Float32Array(n), m = new THREE.Matrix4();
  let i = 0;
  for (let a = 0; a < o.rows; a++) for (let c = 0; c < o.cols; c++) {
    const j = o.jitter ?? 0.12;
    const x = o.origin[0] + (c - (o.cols - 1) / 2) * sp[0] + (r() - 0.5) * j, z = o.origin[2] - a * sp[1] + (r() - 0.5) * j;
    const s = 0.94 + r() * 0.12;
    m.makeScale(s, s, s).setPosition(x, o.origin[1], z);
    mesh.setMatrixAt(i, m); cells[i] = Math.floor(r() * nv); i++;
  }
  geo.setAttribute("aCell", new THREE.InstancedBufferAttribute(cells, 1));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false; mesh.layers.set(NOINK);
  return mesh;
};
