import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const remTmp = process.env.REMOTION_TMP || "C:/Users/ID/AppData/Local/Temp/opencode/remotion-tmp";
fs.mkdirSync(remTmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP = remTmp;

const outDir = path.resolve("out/seandainya/previews");
fs.mkdirSync(outDir, { recursive: true });

const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };

const clips = [
  { name: "preview_1_romusha_outdoor",  range: [5010, 5114] },
  { name: "preview_2_map_nusantara",    range: [13610, 13714] },
  { name: "preview_3_war_battlefield",  range: [16520, 16624] },
  { name: "preview_4_twist_tokyo_scap", range: [23520, 23624] },
  { name: "preview_5_map_asia_decol",   range: [27360, 27464] },
];

console.log("Bundling SeandainyaShortWithCaptions with Remotion...");
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  publicDir: path.resolve("public"),
});

console.log("Selecting composition SeandainyaShortWithCaptions...");
const composition = await selectComposition({
  serveUrl,
  id: "SeandainyaShortWithCaptions",
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

console.log("All 5 Seandainya beat previews rendered successfully!");
