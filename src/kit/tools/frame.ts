// KIT TOOL (Node): print what is on screen at given frames (actors, holds, facing, props, fx, camera, frame position).
// Run: npm run kit:frame -- <video folder name> <frame>[,<frame>...]      (debug a still without rendering it)
import type { Project } from "../scene/types";
import type { ToolIO } from "./io";
import { frameState, shotIndexAt, headHeight } from "../scene/model";
import { inFrame } from "../camera/presets";

const r = (x: number) => Math.round(x * 100) / 100;
const v = (a: readonly number[]) => `[${a.map(r).join(", ")}]`;

export const run = (p: Project, _name: string, args: string[], io: ToolIO) => {
  const frames = (args[0] ?? "0").split(",").map(Number).filter((x) => !Number.isNaN(x));
  const aspect = (p.width ?? 1080) / (p.height ?? 1920);
  for (const f of frames) {
    const i = shotIndexAt(p, f), st = frameState(p, i, f), c = st.cam;
    io.log(`\n== f${f}  shot ${st.shot.id} [${st.shot.a}, ${st.shot.b})  location ${st.shot.location.name}`);
    io.log(`camera pos ${v(c.pos)} look ${v(c.look)} fov ${r(c.fov)} dof ${r(c.dof)}`);
    for (const a of st.actors) {
      const m = inFrame(c, [a.pos[0], a.pos[1] + a.lift + headHeight(a.pose, a.scale) * 0.6, a.pos[2]], aspect);
      io.log(`  ${a.id.padEnd(10)} pos ${v(a.pos)} facing ${a.facing} view ${a.pose.view ?? "front"} ${a.hidden ? "HIDDEN " : ""}` +
        `hold ${a.hold ? `${a.hold.prop}/${a.hold.style}${a.hold.blendFrom ? `<-${a.hold.blendFrom.style}@${r(a.hold.blendFrom.k)}` : ""}` : "-"}` +
        `${a.pose.lying ? ` lying ${a.pose.lying}` : ""}${a.roll ? ` roll ${r(a.roll)}` : ""}${a.lift ? ` lift ${r(a.lift)}` : ""}` +
        `  screen x ${r(m.x)} y ${r(m.y)}${Math.abs(m.x) > 1 || m.behind ? "  OUT OF FRAME" : ""}`);
    }
    for (const pr of st.props) if (!pr.hidden) io.log(`  prop ${pr.id} (${pr.prop}) at ${v(pr.pos)}${pr.flat ? " flat" : ""}`);
    for (const x of st.fx) io.log(`  fx ${x.kind} t ${r(x.t)} at ${v(x.pos)}`);
    for (const x of st.vehicles) io.log(`  vehicle ${x.id} (${x.spec.kind}) at ${v(x.pose.pos)} heading ${r((x.pose.heading * 180) / Math.PI)}`);
    const here = st.sfx.filter((e) => e.f === f);
    if (here.length) io.log(`  sfx now: ${here.map((e) => e.kind).join(", ")}`);
  }
  return 0;
};
