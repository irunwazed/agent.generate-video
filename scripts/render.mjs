// Generic Remotion render CLI for every project (replaces the per-project render-<name>-*.mjs copies).
//
//   node scripts/render.mjs --comp <Id[,Id2]> --mode stills   --frames 30,120,300-305|all --out out/<name>/stills/ [--scale 0.5]
//   node scripts/render.mjs --comp <Id>        --mode previews --clips 0-104,300-404      --out out/<name>/previews/ [--scale 0.5] [--force]
//   node scripts/render.mjs --comp <Id>        --mode video                               --out out/<name>/video.mp4 [--scale 1.3333]
//   options: --props '{"post":{"lens":false}}'  (input props JSON)   --quality 92   --concurrency 2
//
// Windows render environment (same as the old scripts): Chrome at C:/Program Files/Google/Chrome/Application/chrome.exe,
// gl "angle", TEMP forced to D:/remotion-tmp (override with REMOTION_TMP). Every bundle copies public/ into TEMP:
// delete old remotion-webpack-bundle-* folders there when a project is finished (ask the user first).
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, renderMedia, selectComposition } from "@remotion/renderer";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const flag = (k) => args.includes(`--${k}`);
const comps = (opt("comp", "") || "").split(",").filter(Boolean);
const mode = opt("mode", "stills");
const out = opt("out", "");
if (!comps.length || !out) {
  console.error("usage: node scripts/render.mjs --comp <Id[,Id2]> --mode stills|previews|video --out <path> [--frames ..|--clips ..] [--scale k]");
  process.exit(2);
}
const scale = Number(opt("scale", mode === "video" ? "1" : "0.5"));
const inputProps = JSON.parse(opt("props", "{}"));
const quality = Number(opt("quality", "92"));
const concurrency = Number(opt("concurrency", "2"));

const remTmp = process.env.REMOTION_TMP || "D:/remotion-tmp";
fs.mkdirSync(remTmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP = remTmp;
const browserExecutable = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };

/** "1,5,10-12" -> [1,5,10,11,12]; "all" -> 0..n-1 */
const frameList = (spec, n) => {
  if (!spec || spec === "all") return [...Array(n).keys()];
  return spec.split(",").flatMap((t) => {
    const [a, b] = t.split("-").map(Number);
    return b === undefined || Number.isNaN(b) ? [a] : [...Array(b - a + 1).keys()].map((i) => a + i);
  });
};

const t0 = Date.now();
console.log(`Bundling src/index.ts (TEMP=${remTmp}) ...`);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
console.log(`Bundled in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

for (const id of comps) {
  const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable, chromiumOptions });
  const n = composition.durationInFrames;
  if (mode === "stills") {
    const dir = out.endsWith("/") || out.endsWith("\\") ? out : path.dirname(out) + "/";
    const prefix = out.endsWith("/") || out.endsWith("\\") ? "" : path.basename(out);
    fs.mkdirSync(dir, { recursive: true });
    for (const frame of frameList(opt("frames", "0"), n)) {
      if (frame >= n) { console.warn(`  skip frame ${frame} (comp has ${n})`); continue; }
      const file = path.join(dir, `${prefix}${id}_${String(frame).padStart(5, "0")}.jpg`);
      const t = Date.now();
      await renderStill({ composition, serveUrl, output: file, frame, imageFormat: "jpeg", jpegQuality: quality, scale, inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds: 240000 });
      console.log(`  ${file}  (${((Date.now() - t) / 1000).toFixed(1)} s)`);
    }
  } else if (mode === "previews") {
    fs.mkdirSync(out, { recursive: true });
    for (const clip of (opt("clips", `0-${Math.min(n - 1, 104)}`)).split(",")) {
      const [a, b] = clip.split("-").map(Number);
      const file = path.join(out, `${id}_${a}-${b}.mp4`);
      if (!flag("force") && fs.existsSync(file) && fs.statSync(file).size > 10000) { console.log(`  skip existing ${file}`); continue; }
      const t = Date.now();
      await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: file, frameRange: [a, Math.min(b, n - 1)], scale, crf: 20, concurrency, inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000 });
      console.log(`  ${file}  (${((Date.now() - t) / 1000).toFixed(0)} s)`);
    }
  } else if (mode === "video") {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const file = comps.length > 1 ? out.replace(/\.mp4$/, `_${id}.mp4`) : out;
    const t = Date.now();
    await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: file, scale, crf: 16, concurrency, inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds: 600000,
      onProgress: ({ progress }) => { if (Math.round(progress * 100) % 10 === 0) process.stdout.write(`\r  ${(progress * 100).toFixed(0)} %`); } });
    console.log(`\n  ${file}  (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  } else { console.error(`unknown --mode ${mode}`); process.exit(2); }
}
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
