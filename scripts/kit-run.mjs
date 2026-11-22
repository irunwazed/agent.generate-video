// Runs a kit tool (src/kit/tools/<tool>.ts) on a project (src/videos/<name>/project.ts, export PROJECT) in Node.
//   node scripts/kit-run.mjs check <name>     -> validator report (exit code 1 on errors)
//   node scripts/kit-run.mjs sfx <name>       -> out/<name>/sfx_events.json (frame-exact sound events from actions)
// The TypeScript is bundled with esbuild (shipped with Remotion) into a temp .mjs and imported.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const [tool, name, ...rest] = process.argv.slice(2);
if (!tool || !name) { console.error("usage: node scripts/kit-run.mjs <check|sfx> <video folder name> [args]"); process.exit(2); }
const projFile = path.resolve(`src/videos/${name}/project.ts`);
if (!fs.existsSync(projFile)) { console.error(`no ${projFile} (a kit project exports PROJECT from project.ts)`); process.exit(2); }
const toolFile = path.resolve(`src/kit/tools/${tool}.ts`);
if (!fs.existsSync(toolFile)) { console.error(`unknown tool "${tool}" (src/kit/tools/*.ts)`); process.exit(2); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kitrun-"));
const entry = path.join(tmp, "entry.ts");
fs.writeFileSync(entry, `import { PROJECT } from ${JSON.stringify(projFile.replace(/\\/g, "/"))};\nimport { run } from ${JSON.stringify(toolFile.replace(/\\/g, "/"))};\nexport default (io) => run(PROJECT, ${JSON.stringify(name)}, ${JSON.stringify(rest)}, io);\n`);
const out = path.join(tmp, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error", loader: { ".json": "json" },
  external: ["remotion", "@remotion/*", "react", "react-dom"] });
const mod = await import(pathToFileURL(out).href);
const io = {
  write(rel, text) { const f = path.resolve(rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); },
  log: (...a) => console.log(...a),
};
let code = 1;
try { code = await mod.default(io); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
process.exit(typeof code === "number" ? code : 0);
