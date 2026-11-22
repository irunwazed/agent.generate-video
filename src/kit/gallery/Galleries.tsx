// KIT GALLERIES: contact sheets of every pose and every prop x hold style, drawn with Canvas2D only (no WebGL).
// Render: npm run kit:gallery   (stills of KitPoseGallery / KitPropGallery pages -> out/kit/gallery/)
// They are the visual catalogue for choosing names, and the check that hands sit on grips (red = arm over-stretched).
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { Pen } from "../toon/pen";
import { OUTFITS, Outfit } from "../toon/outfits";
import { solve } from "../rig/solve";
import { drawRig } from "../rig/draw";
import { POSE_INFO, POSE_NAMES } from "../rig/poses";
import { PROPS, PROP_NAMES } from "../props/defs";
import type { HoldIn, Pose } from "../rig/types";
import type { Expr } from "../toon/head";

type Cell = { label: string; sub?: string; outfit: Outfit; pose: Pose; facing: -1 | 0 | 1; hold?: HoldIn | null; expr?: Expr; phase?: number };

const COLS = 4, ROWS = 4, WD = 1080, HT = 1920, CW = WD / COLS, CH = HT / ROWS;
const CAST: Outfit[] = [OUTFITS.pejuang, OUTFITS.ibu_hijab, OUTFITS.tni, OUTFITS.pegawai, OUTFITS.petani, OUTFITS.santri, OUTFITS.pelaut, OUTFITS.tentara_jepang];

const poseCells = (): Cell[] => POSE_NAMES.map((n, i) => ({
  label: n, sub: POSE_INFO[n].pose.view ?? "front", outfit: CAST[i % CAST.length], pose: POSE_INFO[n].pose,
  facing: (i % 3 === 2 ? -1 : 1) as -1 | 1, expr: POSE_INFO[n].pose.expr, phase: 0.15,
}));

const propCells = (): Cell[] => {
  const out: Cell[] = [];
  let i = 0;
  for (const name of PROP_NAMES) {
    const d = PROPS[name];
    const styles = d.cls === "small" ? (name === "hp" ? Object.keys(d.styles) : [d.defStyle]) : Object.keys(d.styles);
    for (const s of styles) {
      const outfit = d.cls === "small" || d.cls === "box" ? CAST[i % CAST.length] : [OUTFITS.pejuang, OUTFITS.tni, OUTFITS.laskar, OUTFITS.pandai_besi, OUTFITS.tentara_jepang][i % 5];
      out.push({ label: `${name}`, sub: s, outfit, pose: { gait: "still" }, facing: 1, hold: { prop: name, style: s }, expr: d.styles[s].body?.expr });
      i++;
    }
  }
  return out;
};

export const POSE_PAGES = Math.ceil(poseCells().length / (COLS * ROWS));
export const PROP_PAGES = Math.ceil(propCells().length / (COLS * ROWS));

const drawCell = (g: CanvasRenderingContext2D, c: Cell, x0: number, y0: number) => {
  g.save();
  g.fillStyle = "#eef1f6"; g.fillRect(x0 + 3, y0 + 3, CW - 6, CH - 6);
  const J = solve({ outfit: c.outfit, pose: c.pose, facing: c.facing, seed: 3, hold: c.hold ?? null, phase: c.phase ?? 0 });
  const [rx0, ry0, rx1, ry1] = J.rect;
  const k = Math.min((CW - 20) / (rx1 - rx0), (CH - 70) / (ry1 - ry0), 0.42);
  const tx = x0 + CW / 2 - ((rx0 + rx1) / 2) * k, ty = y0 + CH - 52 - ry1 * k;
  // ground line at the soles
  g.strokeStyle = "#c3cad6"; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 10, ty + 975 * k); g.lineTo(x0 + CW - 10, ty + 975 * k); g.stroke();
  g.setTransform(k, 0, 0, k, tx, ty);
  drawRig(new Pen(g), c.outfit, J, { expr: c.expr ?? "neutral" });
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#1d2230"; g.font = "800 22px 'Segoe UI', Arial"; g.textAlign = "center";
  g.fillText(c.label, x0 + CW / 2, y0 + CH - 28);
  g.fillStyle = "#5a6478"; g.font = "600 18px 'Segoe UI', Arial";
  g.fillText(c.sub ?? "", x0 + CW / 2, y0 + CH - 8);
  if (J.warnings.length) {
    g.fillStyle = "#d0312d"; g.font = "700 15px 'Segoe UI', Arial";
    J.warnings.slice(0, 2).forEach((w, j) => g.fillText(w, x0 + CW / 2, y0 + 22 + j * 18));
  }
  g.restore();
};

const Sheet: React.FC<{ cells: Cell[]; title: string }> = ({ cells, title }) => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const h = delayRender("gallery");
    const g = ref.current!.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, WD, HT);
    const per = COLS * ROWS, page = cells.slice(f * per, f * per + per);
    page.forEach((c, i) => drawCell(g, c, (i % COLS) * CW, Math.floor(i / COLS) * CH));
    g.fillStyle = "rgba(29,34,48,0.75)"; g.font = "800 20px 'Segoe UI', Arial"; g.textAlign = "right";
    g.fillText(`${title} ${f + 1}/${Math.ceil(cells.length / per)}`, WD - 12, 24);
    continueRender(h);
  }, [f, cells, title]);
  return <AbsoluteFill><canvas ref={ref} width={WD} height={HT} /></AbsoluteFill>;
};

const POSE_CELLS = poseCells(), PROP_CELLS = propCells();
export const PoseGallery: React.FC = () => <Sheet cells={POSE_CELLS} title="POSES" />;
export const PropGallery: React.FC = () => <Sheet cells={PROP_CELLS} title="PROPS x HOLD STYLES" />;
