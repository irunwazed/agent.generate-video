// KIT TOOL (Node): list the shots with a "hero" frame (60 % into the shot) for still renders.
// Run: npm run kit:shots -- <video folder name>   -> prints id, range, and a comma list of hero frames
import type { Project } from "../scene/types";
import type { ToolIO } from "./io";

export const run = (p: Project, _name: string, _args: string[], io: ToolIO) => {
  const hero = p.shots.map((s) => Math.round(s.a + (s.b - s.a) * 0.6));
  p.shots.forEach((s, i) => io.log(`${String(i).padStart(3)} ${s.id.padEnd(28)} ${s.a}-${s.b}  hero ${hero[i]}  ${s.location.name}`));
  io.write(`out/${p.name}_hero_frames.txt`, hero.join(","));
  io.log(`hero frames -> out/${p.name}_hero_frames.txt`);
  return 0;
};
