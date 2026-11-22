import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const remTmp = process.env.REMOTION_TMP || "D:/remotion-tmp";
fs.mkdirSync(remTmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP = remTmp;

const outDir = path.resolve("out/merdeka/previews");
fs.mkdirSync(outDir, { recursive: true });

const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };

const clips = [
  { name: "preview_1_hook_vacuum",   range: [60, 164] },
  { name: "preview_2_peta_1943",     range: [885, 989] },
  { name: "preview_3_proklamasi",    range: [1695, 1799] },
  { name: "preview_4_donbosco_tni",  range: [2280, 2384] },
  { name: "preview_5_kmb_kunci",     range: [2945, 3049] },
];

console.log("Bundling MerdekaShortWithCaptions with Remotion...");
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  publicDir: path.resolve("public"),
});

console.log("Selecting composition MerdekaShortWithCaptions...");
const composition = await selectComposition({
  serveUrl,
  id: "MerdekaShortWithCaptions",
  browserExecutable,
  chromiumOptions,
});

for (const clip of clips) {
  const outputLocation = path.join(outDir, `${clip.name}.mp4`);
  if (!process.argv.includes("--force") && fs.existsSync(outputLocation) && fs.statSync(outputLocation).size > 10000) {
    console.log(`Skipping existing ${clip.name} -> ${outputLocation}`);
    continue;
  }
  const t0 = Date.now();
  console.log(`Rendering ${clip.name} (frames ${clip.range[0]}..${clip.range[1]}) -> ${outputLocation}...`);
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    frameRange: clip.range,
    scale: 0.5,
    crf: 20,
    concurrency: 2,
    browserExecutable,
    chromiumOptions,
    timeoutInMilliseconds: 300000,
  });
  console.log(`Done ${clip.name} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

console.log("All 5 Merdeka beat previews rendered successfully!");
