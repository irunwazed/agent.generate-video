// KIT SETS: hand-painted Canvas2D surface textures (cached by key). All are tileable and meant for world-scaled UVs
// (see prims.tex(key, fn, tileMetres)). Painted seams are dark tints, never hard black lines (the ink pass draws edges).
// Reused from core/paint.ts: grassHD, planksHD, beamHD, stoneHD, cobbleHD, roofHD, facadeHD, waterNear/Far.
import { ctex, jit } from "../core/paint";

const N = 1024;
/** soft value noise blotches */
const blotch = (g: CanvasRenderingContext2D, r: () => number, n: number, rad: [number, number], cols: string[], alpha: number) => {
  for (let i = 0; i < n; i++) {
    const x = r() * N, y = r() * N, R = rad[0] + r() * (rad[1] - rad[0]);
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    const c = cols[Math.floor(r() * cols.length)];
    gr.addColorStop(0, c); gr.addColorStop(1, c + "00");
    g.globalAlpha = alpha; g.fillStyle = gr;
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { g.save(); g.translate(dx, dy); g.fillRect(x - R, y - R, 2 * R, 2 * R); g.restore(); }
  }
  g.globalAlpha = 1;
};
const hex2 = (h: string, a: number) => h + Math.round(a * 255).toString(16).padStart(2, "0");

/** plain painted / plastered wall with soft mottling */
export const wallTex = (base: string) => ctex("wall" + base, N, N, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, N, N);
  blotch(g, r, 60, [60, 180], [jit(r, base, 0.08), jit(r, base, 0.08)], 0.35);
});
/** painted brick wall (large blocks, like an office or school corridor) */
export const brickPaintTex = (base: string) => ctex("bpaint" + base, N, N, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, N, N);
  const bw = 256, bh = 128;
  for (let row = 0; row < N / bh; row++) for (let c = -1; c < N / bw + 1; c++) {
    const x = c * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
    g.fillStyle = jit(r, base, 0.05, 2, 0.05); g.fillRect(x + 6, y + 6, bw - 12, bh - 12);
    g.fillStyle = hex2("#ffffff", 0.12); g.fillRect(x + 6, y + 6, bw - 12, 10);
  }
  g.fillStyle = "rgba(20,30,20,0.18)";
  for (let row = 0; row <= N / bh; row++) g.fillRect(0, row * bh - 3, N, 6);
});
/** red clay brick (exteriors, forges, chimneys) */
export const brickTex = (base = "#b0563a") => ctex("brick2" + base, N, N, (g, r) => {
  g.fillStyle = "#8c7a68"; g.fillRect(0, 0, N, N);
  const bw = 128, bh = 56;
  for (let row = 0; row < N / bh + 1; row++) for (let c = -1; c < N / bw + 1; c++) {
    const x = c * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
    g.fillStyle = jit(r, base, 0.12, 6, 0.12); g.fillRect(x + 5, y + 5, bw - 10, bh - 10);
  }
});
/** wallpaper: soft vertical stripes + small diamonds (cafes, old houses) */
export const wallpaperTex = (base: string, pat: string) => ctex("wp" + base + pat, N, N, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, N, N);
  g.fillStyle = hex2(pat, 0.35);
  for (let x = 0; x < N; x += 128) g.fillRect(x + 56, 0, 16, N);
  g.fillStyle = hex2(pat, 0.55);
  for (let y = 32; y < N; y += 128) for (let x = 0; x < N; x += 128) { g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x + 12, y); g.lineTo(x, y + 18); g.lineTo(x - 12, y); g.fill(); }
  blotch(g, r, 30, [80, 200], [jit(r, base, 0.06)], 0.25);
});
/** floor tiles (square, slight colour variation) */
export const tileTex = (a: string, b?: string) => ctex("tile" + a + (b ?? ""), N, N, (g, r) => {
  const s = 128;
  for (let y = 0; y < N; y += s) for (let x = 0; x < N; x += s) {
    g.fillStyle = jit(r, b && ((x + y) / s) % 2 ? b : a, 0.04, 2, 0.05); g.fillRect(x, y, s, s);
    g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(x + 6, y + 6, s - 12, 8);
  }
  g.fillStyle = "rgba(40,40,50,0.22)";
  for (let k = 0; k <= N; k += s) { g.fillRect(k - 2, 0, 4, N); g.fillRect(0, k - 2, N, 4); }
});
/** woven carpet / rug with border */
export const carpetTex = (base: string, border: string) => ctex("carpet" + base + border, 512, 512, (g, r) => {
  g.fillStyle = border; g.fillRect(0, 0, 512, 512);
  g.fillStyle = base; g.fillRect(36, 36, 440, 440);
  g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(70, 70, 372, 372);
  g.fillStyle = hex2(border, 0.6);
  for (let i = 0; i < 6; i++) { const cx = 256, cy = 256, R = 40 + i * 26; g.beginPath(); g.moveTo(cx, cy - R); g.lineTo(cx + R, cy); g.lineTo(cx, cy + R); g.lineTo(cx - R, cy); g.closePath(); g.lineWidth = 4; g.strokeStyle = hex2(border, 0.5); g.stroke(); }
  blotch(g, r, 20, [30, 90], [jit(r, base, 0.08)], 0.3);
});
/** vertical wood panelling */
export const woodPanelTex = (base = "#9a6a42") => ctex("wpanel" + base, N, N, (g, r) => {
  const w = 128;
  for (let x = 0; x < N; x += w) {
    g.fillStyle = jit(r, base, 0.08, 4, 0.1); g.fillRect(x, 0, w, N);
    g.strokeStyle = "rgba(60,30,10,0.25)"; g.lineWidth = 3;
    for (let k = 0; k < 5; k++) { g.beginPath(); const xx = x + 16 + r() * (w - 32); g.moveTo(xx, 0); g.bezierCurveTo(xx + 10, 300, xx - 10, 700, xx + 4, N); g.stroke(); }
    g.fillStyle = "rgba(40,20,8,0.35)"; g.fillRect(x, 0, 5, N);
  }
});
/** gedek: woven bamboo wall (kampung houses) */
export const gedekTex = () => ctex("gedek", 512, 512, (g, r) => {
  g.fillStyle = "#c8a868"; g.fillRect(0, 0, 512, 512);
  const s = 32;
  for (let y = 0; y < 512; y += s) for (let x = 0; x < 512; x += s) {
    const hz = ((x + y) / s) % 2 === 0;
    g.fillStyle = jit(r, hz ? "#d6b878" : "#b8964f", 0.06);
    g.fillRect(x + 2, y + 2, s - 4, s - 4);
    g.strokeStyle = "rgba(80,50,20,0.25)"; g.lineWidth = 2;
    g.beginPath(); if (hz) { g.moveTo(x + 4, y + s / 2); g.lineTo(x + s - 4, y + s / 2); } else { g.moveTo(x + s / 2, y + 4); g.lineTo(x + s / 2, y + s - 4); } g.stroke();
  }
});
/** thatch (atap rumbia / ijuk) */
export const thatchTex = () => ctex("thatch", 512, 512, (g, r) => {
  g.fillStyle = "#a8844a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const x = r() * 512, y = r() * 512, l = 30 + r() * 50;
    g.strokeStyle = jit(r, i % 3 ? "#c29a58" : "#8a6a38", 0.1); g.lineWidth = 2 + r() * 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + l); g.stroke();
  }
  g.fillStyle = "rgba(60,40,15,0.25)"; for (let y = 0; y < 512; y += 64) g.fillRect(0, y, 512, 6);
});
/** sand (beach / desert) with ripples */
export const sandTex = (base = "#e6cf98") => ctex("sand" + base, N, N, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, N, N);
  blotch(g, r, 80, [60, 200], [jit(r, base, 0.08), jit(r, base, 0.1)], 0.4);
  g.strokeStyle = "rgba(150,110,50,0.18)"; g.lineWidth = 4;
  for (let i = 0; i < 40; i++) { const y = r() * N, x = r() * N; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 60, y - 10, x + 120, y + 10, x + 180, y); g.stroke(); }
  for (let i = 0; i < 400; i++) { g.fillStyle = "rgba(120,90,50,0.25)"; g.fillRect(r() * N, r() * N, 3, 3); }
});
/** asphalt road surface (markings are separate geometry) */
export const asphaltTex = () => ctex("asphalt", N, N, (g, r) => {
  g.fillStyle = "#4a4a52"; g.fillRect(0, 0, N, N);
  blotch(g, r, 60, [60, 160], ["#55555e", "#3e3e46"], 0.5);
  for (let i = 0; i < 2500; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)"; g.fillRect(r() * N, r() * N, 3, 3); }
});
/** packed dirt / earth paths */
export const dirtTex = (base = "#b08a5e") => ctex("dirt" + base, N, N, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, N, N);
  blotch(g, r, 70, [50, 180], [jit(r, base, 0.12), jit(r, base, 0.15)], 0.45);
  for (let i = 0; i < 300; i++) { const x = r() * N, y = r() * N; g.fillStyle = jit(r, "#8a6a48", 0.2); g.beginPath(); g.ellipse(x, y, 4 + r() * 6, 3 + r() * 4, r() * 3, 0, Math.PI * 2); g.fill(); }
});
/** rock / cliff face */
export const rockTex = (base = "#8d8a86") => ctex("rock" + base, N, N, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, N, N);
  blotch(g, r, 70, [70, 220], [jit(r, base, 0.15), jit(r, base, 0.18)], 0.5);
  g.strokeStyle = "rgba(40,36,34,0.25)"; g.lineWidth = 4;
  for (let i = 0; i < 26; i++) { const x = r() * N, y = r() * N; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 + r() * 80, y + (r() - 0.5) * 60); g.lineTo(x + 70 + r() * 90, y + 30 + r() * 40); g.stroke(); }
});
/** ceiling panels (offices, halls) */
export const ceilingTex = () => ctex("ceiling", 512, 512, (g, r) => {
  g.fillStyle = "#e6e8ec"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) { g.fillStyle = "rgba(120,120,130,0.18)"; g.fillRect(r() * 512, r() * 512, 3, 2); }
  g.fillStyle = "rgba(90,90,100,0.3)"; g.fillRect(0, 0, 512, 6); g.fillRect(0, 0, 6, 512);
});
/** corrugated metal (warehouses, market roofs) */
export const metalTex = (base = "#9aa3ad") => ctex("metal" + base, 512, 512, (g) => {
  for (let x = 0; x < 512; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, base); gr.addColorStop(0.5, "#ffffff"); gr.addColorStop(1, base); g.globalAlpha = 1; g.fillStyle = base; g.fillRect(x, 0, 32, 512); g.globalAlpha = 0.25; g.fillStyle = gr; g.fillRect(x, 0, 32, 512); }
  g.globalAlpha = 1;
});
/** striped awning (market stalls, shops) */
export const awningTex = (a = "#d0312d", b = "#f6f1e7") => ctex("awning" + a + b, 256, 256, (g) => {
  for (let x = 0; x < 256; x += 64) { g.fillStyle = a; g.fillRect(x, 0, 32, 256); g.fillStyle = b; g.fillRect(x + 32, 0, 32, 256); }
});
