// KIT TOON: simple national / faction flags, drawn as a patch on a uniform (Outfit.flag) or on a flag prop / sign.
// Simplified on purpose (they read at patch size). Add a country by adding one entry to FLAGS.
import { Pen, P2, INK } from "./pen";

type Draw = (p: Pen, x: number, y: number, w: number, h: number) => void;
const R = "#d0312d", WH = "#f6f1e7", BL = "#264a9a", NV = "#1f3a7a", YE = "#f2c230", BK = "#1a1a1a";
const rect = (p: Pen, x: number, y: number, w: number, h: number, col: string) => p.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], col, 0);
const hBands = (cols: string[]): Draw => (p, x, y, w, h) => cols.forEach((c, i) => rect(p, x, y + (h * i) / cols.length, w, h / cols.length + 0.5, c));
const vBands = (cols: string[]): Draw => (p, x, y, w, h) => cols.forEach((c, i) => rect(p, x + (w * i) / cols.length, y, w / cols.length + 0.5, h, c));
const starPts = (cx: number, cy: number, r: number): P2[] => {
  const pts: P2[] = [];
  for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.42 : r, a = ((k * 36 - 90) * Math.PI) / 180; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  return pts;
};
const union: Draw = (p, x, y, w, h) => {
  rect(p, x, y, w, h, NV);
  p.clip([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], () => {
    const t = Math.min(w, h);
    p.stroke([[x, y], [x + w, y + h]], t * 0.22, WH); p.stroke([[x + w, y], [x, y + h]], t * 0.22, WH);
    p.stroke([[x, y], [x + w, y + h]], t * 0.08, R); p.stroke([[x + w, y], [x, y + h]], t * 0.08, R);
    p.stroke([[x + w / 2, y], [x + w / 2, y + h]], t * 0.32, WH); p.stroke([[x, y + h / 2], [x + w, y + h / 2]], t * 0.32, WH);
    p.stroke([[x + w / 2, y], [x + w / 2, y + h]], t * 0.18, R); p.stroke([[x, y + h / 2], [x + w, y + h / 2]], t * 0.18, R);
  });
};
const stripes = (n: number, a: string, b: string): Draw => (p, x, y, w, h) => { for (let i = 0; i < n; i++) rect(p, x, y + (h * i) / n, w, h / n + 0.5, i % 2 ? b : a); };

export const FLAGS = {
  id: { label: "Indonesia", draw: hBands([R, WH]) },
  nl: { label: "Belanda / Netherlands", draw: hBands(["#c8283a", WH, BL]) },
  jp: { label: "Jepang / Japan", draw: ((p, x, y, w, h) => { rect(p, x, y, w, h, WH); p.ell(x + w / 2, y + h / 2, h * 0.3, h * 0.3, "#c8283a", 0); }) as Draw },
  uk: { label: "Inggris / United Kingdom", draw: union },
  us: { label: "Amerika / USA", draw: ((p, x, y, w, h) => {
    stripes(7, R, WH)(p, x, y, w, h);
    rect(p, x, y, w * 0.44, h * 0.56, NV);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) p.dot(x + w * (0.08 + i * 0.14), y + h * (0.1 + j * 0.17), Math.min(w, h) * 0.035, WH);
  }) as Draw },
  au: { label: "Australia", draw: ((p, x, y, w, h) => {
    rect(p, x, y, w, h, NV); union(p, x, y, w / 2, h / 2);
    p.poly(starPts(x + w * 0.25, y + h * 0.76, h * 0.13), WH, 0);
    for (const [a, b] of [[0.75, 0.25], [0.62, 0.5], [0.86, 0.45], [0.75, 0.8]]) p.poly(starPts(x + w * a, y + h * b, h * 0.07), WH, 0);
  }) as Draw },
  my: { label: "Malaysia", draw: ((p, x, y, w, h) => { stripes(8, R, WH)(p, x, y, w, h); rect(p, x, y, w * 0.5, h * 0.56, NV); p.ell(x + w * 0.2, y + h * 0.28, h * 0.17, h * 0.17, YE, 0); p.ell(x + w * 0.24, y + h * 0.28, h * 0.14, h * 0.14, NV, 0); p.poly(starPts(x + w * 0.36, y + h * 0.28, h * 0.12), YE, 0); }) as Draw },
  cn: { label: "Tiongkok / China", draw: ((p, x, y, w, h) => { rect(p, x, y, w, h, "#d8282a"); p.poly(starPts(x + w * 0.18, y + h * 0.3, h * 0.18), YE, 0); for (const [a, b] of [[0.34, 0.12], [0.4, 0.25], [0.4, 0.42], [0.34, 0.55]]) p.poly(starPts(x + w * a, y + h * b, h * 0.06), YE, 0); }) as Draw },
  ru: { label: "Rusia / Russia", draw: hBands([WH, "#1c4fa8", R]) },
  de: { label: "Jerman / Germany", draw: hBands([BK, R, YE]) },
  fr: { label: "Prancis / France", draw: vBands([BL, WH, R]) },
  red: { label: "red faction (generic)", draw: ((p, x, y, w, h) => { rect(p, x, y, w, h, "#c0392b"); p.poly(starPts(x + w / 2, y + h / 2, h * 0.32), WH, 0); }) as Draw },
  blue: { label: "blue faction (generic)", draw: ((p, x, y, w, h) => { rect(p, x, y, w, h, "#2f5fa8"); p.poly(starPts(x + w / 2, y + h / 2, h * 0.32), WH, 0); }) as Draw },
} satisfies Record<string, { label: string; draw: Draw }>;

export type FlagName = keyof typeof FLAGS;
export const FLAG_NAMES = Object.keys(FLAGS) as FlagName[];

/** draw a flag in the rectangle (x, y, w, h) of the current pen transform, with an ink border */
export const drawFlag = (p: Pen, name: FlagName | string, x: number, y: number, w: number, h: number, border: number) => {
  const f = (FLAGS as Record<string, { draw: Draw }>)[name];
  if (!f) return;
  f.draw(p, x, y, w, h);
  p.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], null, border);
  void INK;
};
