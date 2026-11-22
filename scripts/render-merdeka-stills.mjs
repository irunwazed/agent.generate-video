import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const remTmp = process.env.REMOTION_TMP || "D:/remotion-tmp";
fs.mkdirSync(remTmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP = remTmp;

const outDir = path.resolve("out/merdeka/stills");
fs.mkdirSync(outDir, { recursive: true });

const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };

const stills = [
  { frame: 90,   name: "hero_1_f90_vacuum" },
  { frame: 960,  name: "hero_2_f960_peta" },
  { frame: 1750, name: "hero_3_f1750_proklamasi" },
  { frame: 2300, name: "hero_4_f2300_donbosco_tni" },
  { frame: 3000, name: "hero_5_f3000_kmb_kunci" },
];

console.log("Bundling MerdekaShort with Remotion...");
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  publicDir: path.resolve("public"),
});

console.log("Selecting composition MerdekaShort...");
const composition = await selectComposition({
  serveUrl,
  id: "MerdekaShort",
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

console.log("All 5 Merdeka hero stills rendered successfully!");
