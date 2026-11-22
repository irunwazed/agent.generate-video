// Chapter-by-Chapter Resume-Safe Full Renderer for "Seandainya Jepang Masih Menjajah Indonesia"
// Renders SeandainyaCh01..SeandainyaCh10 -> out/seandainya/chapters/ch01.mp4..ch10.mp4
// Cleans temp cache between chapters to preserve disk space, then stitches all 10 chapters
// via ffmpeg stream copy into out/seandainya/Seandainya_Video_Final_With_Captions.mp4.
//
// Usage:
//   node scripts/render-seandainya-video.mjs           # render all remaining chapters & stitch
//   node scripts/render-seandainya-video.mjs --ch 1    # render only chapter 1
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const remTmp = process.env.REMOTION_TMP || "C:/Users/ID/AppData/Local/Temp/opencode/remotion-tmp";
fs.mkdirSync(remTmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP = remTmp;

const outDir = path.resolve("out/seandainya");
const chDir = path.join(outDir, "chapters");
fs.mkdirSync(chDir, { recursive: true });

const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };

const bundledFfmpeg = path.resolve("node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const ffmpegBin = fs.existsSync(bundledFfmpeg) ? `"${bundledFfmpeg}"` : "ffmpeg";

const args = process.argv.slice(2);
const onlyCh = args.includes("--ch") ? Number(args[args.indexOf("--ch") + 1]) : null;
const force = args.includes("--force");

console.log("Bundling Seandainya compositions with Remotion...");
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  publicDir: path.resolve("public"),
});

for (let c = 1; c <= 10; c++) {
  if (onlyCh !== null && c !== onlyCh) continue;
  const compId = `SeandainyaCh${String(c).padStart(2, "0")}`;
  const outMp4 = path.join(chDir, `${compId}.mp4`);

  if (!force && fs.existsSync(outMp4) && fs.statSync(outMp4).size > 500000) {
    console.log(`Skipping existing ${compId} -> ${outMp4}`);
    continue;
  }

  const composition = await selectComposition({
    serveUrl,
    id: compId,
    browserExecutable,
    chromiumOptions,
  });

  const t0 = Date.now();
  console.log(`\nRendering ${compId} (${composition.durationInFrames} frames = ${(composition.durationInFrames / 30).toFixed(1)}s) -> ${outMp4}...`);
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outMp4,
    crf: 19,
    concurrency: 2,
    browserExecutable,
    chromiumOptions,
    timeoutInMilliseconds: 900000,
    onProgress: ({ renderedFrames, encodedFrames, progress }) => {
      if (renderedFrames % 300 === 0 || progress === 1) {
        console.log(`${compId} Progress: ${(progress * 100).toFixed(1)}% (rendered ${renderedFrames}/${composition.durationInFrames}, encoded ${encodedFrames})`);
      }
    },
  });
  console.log(`Done ${compId} in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outMp4}`);
}

// If all 10 chapters exist, concatenate into master final MP4
const allPaths = [];
for (let c = 1; c <= 10; c++) {
  const p = path.join(chDir, `SeandainyaCh${String(c).padStart(2, "0")}.mp4`);
  if (fs.existsSync(p) && fs.statSync(p).size > 500000) allPaths.push(p);
}

if (allPaths.length === 10) {
  const listFile = path.join(chDir, "concat_list.txt");
  fs.writeFileSync(
    listFile,
    allPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n") + "\n",
    "utf-8"
  );
  const finalOut = path.join(outDir, "Seandainya_Video_Final_With_Captions.mp4");
  console.log(`\nConcatenating all 10 chapters into ${finalOut}...`);
  execSync(`${ffmpegBin} -nostdin -y -hide_banner -loglevel error -f concat -safe 0 -i "${listFile}" -c copy "${finalOut}"`, {
    stdio: "inherit",
  });
  console.log(`Master 30-minute video ready -> ${finalOut}`);
}
