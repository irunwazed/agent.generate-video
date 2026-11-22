// KIT TOOL (Node): validate a project BEFORE rendering. Every message says what is wrong and how to fix it.
// Run: npm run kit:check -- <video folder name>        (exit code 1 when there are errors)
// Checks: names (outfits, poses, props + styles, anchors, actions, vehicles, seats), action timing and needs,
// camera keys inside the shot, and FRAMING: everyone who acts (and their target) must be inside the 9:16 frame.
import type { Project, ShotSpec, CamKey, Place } from "../scene/types";
import type { ToolIO } from "./io";
import { frameState, headHeight } from "../scene/model";
import { inFrame } from "../camera/presets";
import { ACTIONS } from "../actions/actions";
import { PROPS } from "../props/defs";
import { POSES } from "../rig/poses";
import { VEHICLES } from "../vehicles/defs";

export type Issue = { level: "error" | "warn"; shot: string; f?: number; msg: string; fix?: string };

const near = (names: string[], x: string) => {
  const d = (a: string, b: string) => { const m = a.length, n = b.length, D = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 1; j <= n; j++) D[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return D[m][n]; };
  const best = names.map((n) => [n, d(n, x)] as const).sort((a, b) => a[1] - b[1]).slice(0, 3).map((x) => x[0]);
  return best.length ? `did you mean ${best.map((b) => `"${b}"`).join(" / ")}?` : undefined;
};

/** the actors a shot's actions involve (who + target actors): the natural camera group */
const groupOf = (s: ShotSpec) => {
  const ids = new Set((s.cast ?? []).map((c) => c.id ?? c.who)), g: string[] = [];
  for (const a of s.actions ?? []) for (const x of [a.who, a.target]) if (typeof x === "string" && ids.has(x) && !g.includes(x)) g.push(x);
  return g.length ? g : [...ids];
};
export const checkProject = (p: Project): Issue[] => {
  const out: Issue[] = [];
  const add = (level: Issue["level"], s: ShotSpec, msg: string, fix?: string, f?: number) => out.push({ level, shot: s.id, msg, fix, f });
  const total = Math.max(...p.shots.map((s) => s.b));
  p.shots.forEach((s, i) => {
    // ---- timing ----
    if (s.b <= s.a) add("error", s, `shot ends before it starts (a ${s.a}, b ${s.b})`);
    if (i > 0 && s.a !== p.shots[i - 1].b) add("warn", s, `gap / overlap with the previous shot (${p.shots[i - 1].b} -> ${s.a})`, "make every shot start where the previous one ends");
    const ids = new Set<string>(), actorIds = new Set<string>();
    // ---- cast ----
    for (const c of s.cast ?? []) {
      const id = c.id ?? c.who;
      if (actorIds.has(id)) add("error", s, `two actors with the id "${id}"`, `give the second one id: "${id}2"`);
      actorIds.add(id); ids.add(id);
      if (!p.cast[c.who]) add("error", s, `cast "${c.who}" is not in project.cast`, near(Object.keys(p.cast), c.who));
      if (typeof c.pose === "string" && !POSES[c.pose]) add("error", s, `${id}: unknown pose "${c.pose}"`, near(Object.keys(POSES), c.pose));
      for (const h of [c.hold, ...(c.extra ?? [])]) {
        if (!h) continue;
        const d = PROPS[h.prop];
        if (!d) { add("error", s, `${id}: unknown prop "${h.prop}"`, near(Object.keys(PROPS), h.prop)); continue; }
        if (h.style && !d.styles[h.style]) add("error", s, `${id}: prop "${h.prop}" has no style "${h.style}"`, `styles: ${Object.keys(d.styles).join(", ")}`);
      }
      if (c.ride) {
        const v = (s.vehicles ?? []).find((x) => x.id === c.ride!.vehicle);
        if (!v) add("error", s, `${id} rides "${c.ride.vehicle}", which is not in shot.vehicles`);
        else if (!VEHICLES[v.kind]?.seats[c.ride.seat]) add("error", s, `${id}: vehicle ${v.kind} has no seat "${c.ride.seat}"`, `seats: ${Object.keys(VEHICLES[v.kind]?.seats ?? {}).join(", ")}`);
      }
    }
    for (const v of s.vehicles ?? []) { ids.add(v.id); if (!VEHICLES[v.kind]) add("error", s, `unknown vehicle kind "${v.kind}"`, near(Object.keys(VEHICLES), v.kind)); }
    for (const pr of s.props ?? []) { ids.add(pr.id); if (!PROPS[pr.prop]) add("error", s, `world prop ${pr.id}: unknown prop "${pr.prop}"`, near(Object.keys(PROPS), pr.prop)); }
    const known = (x: Place | undefined) => x === undefined || typeof x !== "string" || ids.has(x) || !!s.location.anchors[x];
    const anchorHint = `anchors of ${s.location.name}: ${Object.keys(s.location.anchors).slice(0, 14).join(", ")}`;
    for (const c of s.cast ?? []) if (!known(c.at)) add("error", s, `${c.id ?? c.who}: place "${c.at}" is not an anchor / actor / prop`, anchorHint);
    for (const pr of s.props ?? []) if (!known(pr.at)) add("error", s, `prop ${pr.id}: place "${pr.at}" is not an anchor`, anchorHint);
    // ---- actions ----
    for (const a of s.actions ?? []) {
      const d = ACTIONS[a.do];
      if (!d) { add("error", s, `unknown action "${a.do}"`, near(Object.keys(ACTIONS), a.do), a.at); continue; }
      if (a.at < s.a || a.at >= s.b) add("error", s, `${a.who} ${a.do}: contact frame ${a.at} is outside the shot [${s.a}, ${s.b})`, "the contact frame `at` is an absolute frame inside the shot", a.at);
      else if (a.at - d.pre < s.a) add("warn", s, `${a.who} ${a.do}: its wind-up (${d.pre} f) starts before the shot`, `move \`at\` to >= ${s.a + d.pre}`, a.at);
      if (a.do !== "explode" && !actorIds.has(a.who)) add("error", s, `action ${a.do}: "${a.who}" is not an actor in this shot`, near([...actorIds], a.who), a.at);
      for (const n of d.needs ?? []) {
        if (n === "target" && a.target === undefined) add("error", s, `${a.who} ${a.do} needs a target`, d.note, a.at);
        if (n === "to" && a.to === undefined) add("error", s, `${a.who} ${a.do} needs \`to\``, d.note, a.at);
        if (n === "prop" && !(s.props ?? []).some((x) => x.id === a.prop)) add("error", s, `${a.who} ${a.do}: world prop "${a.prop}" is not in shot.props`, d.note, a.at);
      }
      if (!known(a.target as Place)) add("error", s, `${a.who} ${a.do}: target "${a.target}" is not an actor / prop / anchor`, anchorHint, a.at);
      if (!known(a.to as Place)) add("error", s, `${a.who} ${a.do}: \`to\` "${a.to}" is not an actor / prop / anchor`, anchorHint, a.at);
      if ((d.needs ?? []).includes("hold") && a.at >= s.a && a.at < s.b) {
        const st = frameState(p, i, Math.max(s.a, a.at - d.pre)), ac = st.actors.find((x) => x.id === a.who);
        if (ac && !ac.hold) add("error", s, `${a.who} ${a.do}: holds nothing when the action starts`, `give ${a.who} hold: { prop: ... } or pick something up first`, a.at);
      }
    }
    // ---- camera ----
    if (!s.camera.length) { add("error", s, "no camera keys"); return; }
    const keys = [...s.camera].sort((x, y) => x.f - y.f);
    if (keys[0].f > s.a) add("warn", s, `the first camera key starts at ${keys[0].f}, after the shot start ${s.a}`, `set the first key's f to ${s.a}`);
    for (const k of keys) if (k.f >= s.b) add("error", s, `camera key at ${k.f} is after the shot end ${s.b}`);
    for (const k of keys) if (k.push === 0 && keys.length === 1) add("warn", s, "static camera (push: 0, one key)", "keep a slow push (0.002-0.004) or add a second key: a frozen frame looks dead");
    // ---- framing ----
    const aspect = (p.width ?? 1080) / (p.height ?? 1920);
    const subjectsOf = (k: CamKey) => (Array.isArray(k.on) && typeof k.on[0] === "string" ? (k.on as string[]) : [k.on, k.to].filter((x): x is string => typeof x === "string"));
    const checks: { f: number; who: string[]; why: string }[] = [];
    keys.forEach((k, ki) => {
      if (k.preset === "insert" || k.preset === "pov") return;
      const who = subjectsOf(k).filter((x) => actorIds.has(x)), end = Math.min(s.b, keys[ki + 1]?.f ?? s.b) - 1;
      checks.push({ f: Math.max(s.a, Math.min(s.b - 1, k.f)), who, why: `camera ${k.preset} key at ${k.f}` });
      if (end > k.f + 10) checks.push({ f: end, who, why: `end of the camera ${k.preset} key (after the push-in)` });
    });
    for (const a of s.actions ?? []) if (a.at >= s.a && a.at < s.b) checks.push({ f: a.at, who: [a.who, ...(typeof a.target === "string" && actorIds.has(a.target) ? [a.target] : [])].filter((x) => actorIds.has(x)), why: `${a.who} ${a.do}` });
    for (const c of checks) {
      const k = [...keys].reverse().find((x) => x.f <= c.f) ?? keys[0];
      if (k.preset === "insert" || k.preset === "pov" || k.preset === "close") continue;
      const st = frameState(p, i, c.f);
      for (const id of c.who) {
        const ac = st.actors.find((x) => x.id === id);
        if (!ac || ac.hidden || ac.spec.ride) continue;
        const mid = inFrame(st.cam, [ac.pos[0], ac.pos[1] + ac.lift + headHeight(ac.pose, ac.scale) * 0.6, ac.pos[2]], aspect);
        if (mid.behind) { add("error", s, `${id} is behind the camera (${c.why})`, "change the camera angle / subject", c.f); continue; }
        const x = mid.x;
        if (Math.abs(x) > 1.05) add("error", s, `${id} is OUT OF FRAME (${x > 0 ? "right" : "left"}, x=${x.toFixed(2)}) at ${c.why}`, `frame the group: camera on: [${groupOf(s).map((w) => `"${w}"`).join(", ")}], or move the actors closer (<= 1.6 m apart), or angle the camera 30-50 deg so they overlap in depth`, c.f);
        else if (Math.abs(x) > 0.86) add("warn", s, `${id} is at the frame edge (x=${x.toFixed(2)}) at ${c.why}`, c.why.startsWith("end of") ? "slow the push-in (push: 0.0015) or cut to a new camera key earlier" : "use a group subject on: [...] or move the camera back", c.f);
      }
    }
  });
  if (total < 1) out.push({ level: "error", shot: "-", msg: "the project has no frames" });
  return out;
};

export const run = (p: Project, _name: string, _args: string[], io: ToolIO) => {
  const issues = checkProject(p);
  const errs = issues.filter((x) => x.level === "error").length;
  for (const x of issues) io.log(`${x.level === "error" ? "ERROR" : "warn "} [${x.shot}${x.f !== undefined ? ` f${x.f}` : ""}] ${x.msg}${x.fix ? `\n        fix: ${x.fix}` : ""}`);
  io.log(`${p.name}: ${errs} error(s), ${issues.length - errs} warning(s)`);
  return errs ? 1 : 0;
};
