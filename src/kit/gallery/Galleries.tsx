// KIT GALLERIES: contact sheets drawn with Canvas2D only (no WebGL):
//   KitCastGallery - every outfit in front / side / back view (flags, hats, extras)
//   KitPoseGallery - every named pose
//   KitPropGallery - every prop x hold style (red text = an arm is over-stretched: fix the style)
// Render: npm run kit:gallery  -> out/kit/gallery/*.jpg
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { Pen } from "../toon/pen";
import { OUTFITS, OUTFIT_NAMES, Outfit } from "../toon/outfits";
import { solve } from "../rig/solve";
import { drawRig } from "../rig/draw";
import { POSE_INFO, POSE_NAMES } from "../rig/poses";
import { PROPS, PROP_NAMES } from "../props/defs";
import type { HoldIn, Pose, View } from "../rig/types";
import type { Expr } from "../toon/head";

type Fig = { outfit: Outfit; pose: Pose; facing: -1 | 0 | 1; hold?: HoldIn | null; expr?: Expr; phase?: number };
type Cell = { label: string; sub?: string; figs: Fig[] };
type Grid = { cols: number; rows: number };

const WD = 1080, HT = 1920;
const CAST: Outfit[] = [OUTFITS.pejuang, OUTFITS.ibu_hijab, OUTFITS.tni, OUTFITS.kantoran, OUTFITS.petani, OUTFITS.preman, OUTFITS.pelaut, OUTFITS.tentara_jepang, OUTFITS.anak_perempuan, OUTFITS.gangster];
const SOLDIERS: Outfit[] = [OUTFITS.pejuang, OUTFITS.tni, OUTFITS.laskar, OUTFITS.pandai_besi, OUTFITS.tentara_jepang, OUTFITS.sekutu_uk, OUTFITS.knil];

const castCells = (): Cell[] => OUTFIT_NAMES.map((n) => ({
  label: n, sub: (OUTFITS[n] as Outfit).flag ? `flag: ${(OUTFITS[n] as Outfit).flag}` : "",
  figs: (["front", "side", "back"] as View[]).map((v) => ({ outfit: OUTFITS[n] as Outfit, pose: { gait: "still", view: v }, facing: 1 as const, expr: "smile" as Expr })),
}));
const poseCells = (): Cell[] => POSE_NAMES.map((n, i) => ({
  label: n, sub: POSE_INFO[n].pose.view ?? "front",
  figs: [{ outfit: CAST[i % CAST.length], pose: POSE_INFO[n].pose, facing: (i % 3 === 2 ? -1 : 1) as -1 | 1, expr: POSE_INFO[n].pose.expr, phase: 0.15 }],
}));
const propCells = (): Cell[] => {
  const out: Cell[] = [];
  let i = 0;
  for (const name of PROP_NAMES) {
    const d = PROPS[name];
    const styles = d.cls === "small" ? (name === "hp" ? Object.keys(d.styles) : [d.defStyle, ...Object.keys(d.styles).filter((s) => !(s in PROPS.hp.styles))]) : Object.keys(d.styles);
    for (const s of styles) {
      const outfit = d.cls === "small" || d.cls === "box" ? CAST[i % CAST.length] : SOLDIERS[i % SOLDIERS.length];
      out.push({ label: name, sub: s, figs: [{ outfit, pose: { gait: "still" }, facing: 1, hold: { prop: name, style: s }, expr: d.styles[s].body?.expr }] });
      i++;
    }
  }
  return out;
};

const drawCell = (g: CanvasRenderingContext2D, c: Cell, x0: number, y0: number, CW: number, CH: number) => {
  g.save();
  g.fillStyle = "#eef1f6"; g.fillRect(x0 + 3, y0 + 3, CW - 6, CH - 6);
  const n = c.figs.length, fw = CW / n, warn: string[] = [];
  c.figs.forEach((fg, j) => {
    const J = solve({ outfit: fg.outfit, pose: fg.pose, facing: fg.facing, seed: 3, hold: fg.hold ?? null, phase: fg.phase ?? 0 });
    warn.push(...J.warnings);
    const [rx0, ry0, rx1, ry1] = J.rect;
    const k = Math.min((fw - 16) / (rx1 - rx0), (CH - 70) / (ry1 - ry0), 0.42);
    const fx0 = x0 + j * fw, tx = fx0 + fw / 2 - ((rx0 + rx1) / 2) * k, ty = y0 + CH - 52 - ry1 * k;
    g.strokeStyle = "#c3cad6"; g.lineWidth = 2; g.beginPath(); g.moveTo(fx0 + 8, ty + 975 * k); g.lineTo(fx0 + fw - 8, ty + 975 * k); g.stroke();
    g.setTransform(k, 0, 0, k, tx, ty);
    drawRig(new Pen(g), fg.outfit, J, { expr: fg.expr ?? "neutral" });
    g.setTransform(1, 0, 0, 1, 0, 0);
  });
  g.fillStyle = "#1d2230"; g.font = "800 22px 'Segoe UI', Arial"; g.textAlign = "center";
  g.fillText(c.label, x0 + CW / 2, y0 + CH - 28);
  g.fillStyle = "#5a6478"; g.font = "600 18px 'Segoe UI', Arial";
  g.fillText(c.sub ?? "", x0 + CW / 2, y0 + CH - 8);
  if (warn.length) {
    g.fillStyle = "#d0312d"; g.font = "700 15px 'Segoe UI', Arial";
    warn.slice(0, 2).forEach((w, j) => g.fillText(w, x0 + CW / 2, y0 + 22 + j * 18));
  }
  g.restore();
};

const Sheet: React.FC<{ cells: Cell[]; title: string; grid: Grid }> = ({ cells, title, grid }) => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const h = delayRender("gallery");
    const g = ref.current!.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, WD, HT);
    const per = grid.cols * grid.rows, CW = WD / grid.cols, CH = HT / grid.rows;
    cells.slice(f * per, f * per + per).forEach((c, i) => drawCell(g, c, (i % grid.cols) * CW, Math.floor(i / grid.cols) * CH, CW, CH));
    g.fillStyle = "rgba(29,34,48,0.75)"; g.font = "800 20px 'Segoe UI', Arial"; g.textAlign = "right";
    g.fillText(`${title} ${f + 1}/${Math.ceil(cells.length / per)}`, WD - 12, 24);
    continueRender(h);
  }, [f, cells, title, grid]);
  return <AbsoluteFill><canvas ref={ref} width={WD} height={HT} /></AbsoluteFill>;
};

const G4: Grid = { cols: 4, rows: 4 }, G2: Grid = { cols: 2, rows: 4 };
const CAST_CELLS = castCells(), POSE_CELLS = poseCells(), PROP_CELLS = propCells();
export const CAST_PAGES = Math.ceil(CAST_CELLS.length / 8);
export const POSE_PAGES = Math.ceil(POSE_CELLS.length / 16);
export const PROP_PAGES = Math.ceil(PROP_CELLS.length / 16);
export const CastGallery: React.FC = () => <Sheet cells={CAST_CELLS} title="CAST (front / side / back)" grid={G2} />;
export const PoseGallery: React.FC = () => <Sheet cells={POSE_CELLS} title="POSES" grid={G4} />;
export const PropGallery: React.FC = () => <Sheet cells={PROP_CELLS} title="PROPS x HOLD STYLES" grid={G4} />;
