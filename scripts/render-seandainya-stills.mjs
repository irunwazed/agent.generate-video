import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const remTmp = process.env.REMOTION_TMP || "D:/remotion-tmp";
fs.mkdirSync(remTmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP = remTmp;

const outDir = path.resolve("out/seandainya/stills");
fs.mkdirSync(outDir, { recursive: true });

const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };

const stills = [
  { frame: 120,   name: "hero_1_f120_calendar_1945" },
  { frame: 5050,  name: "hero_2_f5050_romusha_saketi" },
  { frame: 13650, name: "hero_3_f13650_map_nusantara" },
  { frame: 16560, name: "hero_4_f16560_war_battle" },
  { frame: 23560, name: "hero_5_f23560_tokyo_scap" },
  { frame: 27400, name: "hero_6_f27400_map_asia" },
  { frame: 32100, name: "hero_7_f32100_colony_1950" },
  { frame: 35050, name: "hero_8_f35050_modern_mitra" },
];

console.log("Bundling SeandainyaShort with Remotion...");
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  publicDir: path.resolve("public"),
});

console.log("Selecting composition SeandainyaShort...");
const composition = await selectComposition({
  serveUrl,
  id: "SeandainyaShort",
  browserExecutable,
  chromiumOptions,
});

for (const s of stills) {
  const outputLocation = path.join(outDir, `${s.name}.jpg`);
  console.log(`Rendering still frame ${s.frame} -> ${outputLocation}...`);
  await renderStill({
    composition,
    serveUrl,
    output: outputLocation,
    frame: s.frame,
    imageFormat: "jpeg",
    jpegQuality: 95,
    browserExecutable,
    chromiumOptions,
  });
}

console.log("All 8 Seandainya hero stills rendered successfully!");
