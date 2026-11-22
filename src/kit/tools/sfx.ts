// KIT TOOL (Node): collect the frame-exact sound events every action emits (grab, gunshot, slash, explosion, splash,
// steps...) into out/<name>/sfx_events.json, so the audio script places each SFX on the very frame of the contact.
// Run: npm run kit:sfx -- <video folder name>
import type { Project } from "../scene/types";
import type { ToolIO } from "./io";
import { frameState } from "../scene/model";

export const collectSfx = (p: Project) => {
  const seen = new Set<string>(), ev: { f: number; t: number; kind: string; shot: string }[] = [];
  p.shots.forEach((s, i) => {
    if (!(s.actions ?? []).length) return;
    for (let f = s.a; f < s.b; f++) {
      for (const e of frameState(p, i, f).sfx) {
        const key = `${e.f}|${e.kind}`;
        if (seen.has(key) || e.f < s.a || e.f >= s.b) continue;
        seen.add(key); ev.push({ f: e.f, t: +(e.f / p.fps).toFixed(3), kind: e.kind, shot: s.id });
      }
    }
  });
  return ev.sort((a, b) => a.f - b.f);
};

export const run = (p: Project, name: string, _args: string[], io: ToolIO) => {
  const ev = collectSfx(p);
  io.write(`out/${name}/sfx_events.json`, JSON.stringify({ fps: p.fps, events: ev }, null, 1));
  for (const e of ev) io.log(`${String(e.f).padStart(6)}  ${e.t.toFixed(2).padStart(7)} s  ${e.kind.padEnd(14)} ${e.shot}`);
  io.log(`${ev.length} events -> out/${name}/sfx_events.json`);
  return 0;
};
