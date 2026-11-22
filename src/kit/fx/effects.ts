// KIT FX registry: effect kinds an action (or a shot) can spawn. Each entry draws one frame of the effect at time
// t (0..1) on a w x h canvas; the runtime shows it as a camera-facing card (or flat on the ground) `size` metres tall.
// Cartoon-safe by design (no blood): impact stars, smoke, dust, sparks, splashes, dizzy stars, explosions.
import { Pen, P2, WHITE, rad } from "../toon/pen";
import { fxBurst, fxSplash, fxPuff, fxStars, fxRing, fxGlow } from "./draw";

export type FxDraw = { w: number; h: number; soft?: boolean; note: string; draw: (p: Pen, t: number, col?: string) => void };

const muzzle = (p: Pen, t: number) => {
  const k = 1 - t, c: P2 = [150, 100];
  if (k <= 0) return;
  const pts: P2[] = [];
  for (let i = 0; i < 14; i++) { const a = rad(i * (360 / 14)), r = (i % 2 ? 26 : i % 4 ? 70 : 92) * k; pts.push([c[0] + r * Math.cos(a) * 1.3, c[1] + r * Math.sin(a) * 0.9]); }
  p.poly(pts, "#ffd84a", 5);
  p.ell(c[0], c[1], 26 * k, 18 * k, WHITE, 0);
};
const smoke = (p: Pen, t: number, col = "200,200,206") => {
  for (let i = 0; i < 6; i++) {
    const a = rad(-90 + (i - 2.5) * 24), d = 30 + 110 * t, r = (40 + 14 * (i % 3)) * (0.6 + 0.6 * t);
    p.ell(150 + d * Math.cos(a) * 0.7, 230 + d * Math.sin(a), r, r * 0.85, `rgba(${col},${(0.9 * (1 - t)).toFixed(3)})`, 0);
  }
};
const explosion = (p: Pen, t: number) => {
  const c = 300, e = 1 - (1 - Math.min(1, t * 1.6)) ** 3;
  if (t < 0.55) {
    const pts: P2[] = [];
    for (let i = 0; i < 22; i++) { const a = rad(i * (360 / 22)), r = (i % 2 ? 150 : 250) * e * (0.85 + 0.15 * Math.sin(i * 2.7)); pts.push([c + r * Math.cos(a), c + r * Math.sin(a)]); }
    p.poly(pts, "#ffb32a", 10);
    const inner: P2[] = [];
    for (let i = 0; i < 16; i++) { const a = rad(i * 22.5 + 11), r = (i % 2 ? 80 : 140) * e; inner.push([c + r * Math.cos(a), c + r * Math.sin(a)]); }
    p.poly(inner, "#fff0a0", 0);
  }
  const s = Math.max(0, (t - 0.2) / 0.8);
  if (s > 0) for (let i = 0; i < 9; i++) {
    const a = rad(i * 40 + 10), d = 120 + 140 * s, r = (70 + 20 * (i % 3)) * (0.7 + 0.5 * s);
    p.ell(c + d * Math.cos(a) * 0.9, c - 60 * s + d * Math.sin(a) * 0.6, r, r * 0.8, `rgba(90,84,88,${(0.85 * (1 - s)).toFixed(3)})`, 6 * (1 - s));
  }
  for (let i = 0; i < 10; i++) {
    const a = rad(i * 36 + 5), d = 60 + 260 * t, y = c + d * Math.sin(a) + 260 * t * t;
    if (t > 0.05 && y < 600) p.poly([[c + d * Math.cos(a) - 9, y - 6], [c + d * Math.cos(a) + 9, y - 4], [c + d * Math.cos(a) + 4, y + 8]], "#5a4a3a", 3);
  }
};
const sparks = (p: Pen, t: number) => {
  for (let i = 0; i < 12; i++) {
    const a = rad(200 + i * 12), d = 30 + 170 * t, x = 150 + d * Math.cos(a), y = 150 + d * Math.sin(a) + 120 * t * t;
    p.stroke([[x, y], [x - 16 * Math.cos(a), y - 16 * Math.sin(a)]], 6 * (1 - t) + 1, "#ffd84a");
  }
};
const impact = (p: Pen, t: number, col = "#ffffff") => {
  const c = 150, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < 8; i++) {
    const a = rad(i * 45 + 22), r0 = 26 + 40 * e, r1 = 70 + 70 * e;
    p.stroke([[c + r0 * Math.cos(a), c + r0 * Math.sin(a)], [c + r1 * Math.cos(a), c + r1 * Math.sin(a)]], 10 * (1 - t) + 2, col);
  }
  if (t < 0.4) p.ell(c, c, 30 * (1 - t), 30 * (1 - t), "#ffe58a", 6);
};
const sweat = (p: Pen, t: number) => { p.ell(60, 50 + 40 * t, 16, 24, "#9fd4ff", 5); };
const bang = (p: Pen, t: number) => { const k = Math.min(1, t * 3); p.poly([[90, 20], [150, 20], [130, 160], [110, 160]], "#ff4a3a", 8 * k); p.ell(120, 200, 18 * k, 18 * k, "#ff4a3a", 6); };
const zzz = (p: Pen, t: number) => { for (let i = 0; i < 3; i++) { const y = 220 - i * 60 - 30 * t, x = 60 + i * 50, s = 26 + i * 8; p.stroke([[x, y], [x + s, y], [x, y + s], [x + s, y + s]], 7, "#3a4a7a"); } };
const tracer = (p: Pen, t: number) => { const a = t * 400; p.stroke([[a, 30], [a + 220, 30]], 8, "#fff3b0"); p.stroke([[a + 60, 30], [a + 220, 30]], 4, "#ffffff"); };
const speed = (p: Pen) => { for (let i = 0; i < 6; i++) p.stroke([[20 + (i % 2) * 40, 30 + i * 45], [260, 30 + i * 45]], 6, "rgba(255,255,255,0.8)"); };
const dust = (p: Pen, t: number) => fxPuff(p, t, "214,196,160");
const splashRing = (p: Pen, t: number) => fxRing(p, t);
const wake = (p: Pen, t: number) => { for (let i = 0; i < 6; i++) { const k = (t + i / 6) % 1; p.ell(150 + (i % 2 ? 40 : -40) * k, 300 - k * 280, 30 * k + 6, 12 * k + 4, `rgba(240,250,255,${(1 - k).toFixed(3)})`, 0); } };

export const FX_DRAW: Record<string, FxDraw> = {
  burst: { w: 500, h: 500, note: "impact star (hit, collision)", draw: (p, t, c) => fxBurst(p, t, c ?? "#fff3b0") },
  impact: { w: 300, h: 300, note: "punch / hit lines", draw: (p, t, c) => impact(p, t, c) },
  muzzle: { w: 300, h: 200, note: "muzzle flash", draw: (p, t) => muzzle(p, t) },
  tracer: { w: 600, h: 60, soft: true, note: "bullet streak", draw: (p, t) => tracer(p, t) },
  smoke: { w: 300, h: 300, soft: true, note: "gun smoke / chimney puff", draw: (p, t, c) => smoke(p, t, c) },
  dust: { w: 300, h: 300, soft: true, note: "dust kick (fall, landing, wheels)", draw: (p, t) => dust(p, t) },
  explosion: { w: 600, h: 600, note: "bomb / shell explosion (fireball, smoke, debris)", draw: (p, t) => explosion(p, t) },
  sparks: { w: 300, h: 300, note: "metal sparks (anvil, sword clash)", draw: (p, t) => sparks(p, t) },
  splash: { w: 800, h: 800, note: "water splash (something falls in the sea)", draw: (p, t) => fxSplash(p, t) },
  ring: { w: 600, h: 600, note: "water ring (flat on the water)", draw: (p, t) => splashRing(p, t) },
  stars: { w: 420, h: 210, note: "dizzy stars circling a head", draw: (p, t) => fxStars(p, t) },
  sweat: { w: 120, h: 160, note: "sweat drop", draw: (p, t) => sweat(p, t) },
  bang: { w: 240, h: 240, note: "! surprise mark", draw: (p, t) => bang(p, t) },
  zzz: { w: 260, h: 260, note: "sleeping Zzz", draw: (p, t) => zzz(p, t) },
  speed: { w: 300, h: 300, soft: true, note: "speed lines", draw: (p) => speed(p) },
  glow: { w: 256, h: 256, soft: true, note: "soft light glow", draw: (p, _t, c) => fxGlow(p, c) },
  wake: { w: 300, h: 320, soft: true, note: "boat wake foam", draw: (p, t) => wake(p, t) },
};
