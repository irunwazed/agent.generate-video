// Procedural 3D sets, outdoor landscapes, battlefield environments & hand-painted geographical maps for:
// "Seandainya Jepang Masih Menjajah Indonesia" (Channel: Seandainya)
// Every single one of the 8 sets has a unique outdoor/architectural structure (NO repeated 2-desk indoor box rooms!):
// 1. calendar_1945  : Pelataran Gedung Sidang BPUPKI 1945 (Pilar Kolonial Terbuka, Kalender 17 Agustus Kosong & Tiang Bendera)
// 2. romusha_saketi : OUTDOOR Padang Rumput, Kebun Pisang/Kelapa & Rel Maut Saketi–Bayah di Tanah Merah Banten + Bukit & Awan
// 3. map_nusantara  : SOROTAN PENUH Peta Besar Kepulauan Nusantara (Tanpa Karakter, Kamera Fokus Penuh ke Peta & Pulau 3D)
// 4. war_battle     : OUTDOOR Medan Perang Terbuka di Lapangan (Bukit, Pohon, Parit Karung Pasir, Jembatan Rel, Benteng Kenpeitai Terbakar)
// 5. tokyo_scap     : Plaza Markas Besar Sekutu GHQ Tokyo 1945–1952 (Gedung Diet/GHQ, Monumen Konstitusi 1947 & MacArthur vs Hirohito)
// 6. map_asia       : SOROTAN PENUH Peta Blokade Laut Pasifik & Gelombang Dekolonisasi Asia 1945–1953 (Tanpa Karakter, Fokus Penuh Peta)
// 7. colony_1950    : Jalanan Kota Kolonial 1950-an (Stasiun Menara Jam Megah Khusus Penguasa vs Dermaga Kerja Paksa Rakyat Kelas Dua)
// 8. modern_mitra   : OUTDOOR Taman Kota Jakarta Modern (Jalur Layang MRT Jakarta, Gedung Pencakar Langit, Awan Cerah & Monumen Merah Putih)
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng, ctex, rep, grassHD, stoneHD, planksHD, beamHD } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";

export type Kit = Record<string, THREE.Object3D>;
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export type SetKind =
  | "calendar_1945"
  | "map_nusantara"
  | "romusha_saketi"
  | "war_battle"
  | "tokyo_scap"
  | "map_asia"
  | "colony_1950"
  | "modern_mitra";

const mats = new Map<string, THREE.Material>();
export const lam = (key: string, make: () => THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) {
    m = twoTone(new THREE.MeshLambertMaterial(make()));
    mats.set(key, m);
  }
  return m;
};

const f32 = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.Float32BufferAttribute(out, a.itemSize);
};

export class Batch {
  private g = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const x = new THREE.BufferGeometry();
    x.setAttribute("position", f32(src.attributes.position));
    if (src.attributes.normal) x.setAttribute("normal", f32(src.attributes.normal)); else x.computeVertexNormals();
    x.setAttribute("uv", src.attributes.uv ? f32(src.attributes.uv) : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat);
    if (l) l.push(x); else this.g.set(mat, [x]);
  }
  build(parent: THREE.Object3D, cast = true) {
    for (const [mat, list] of this.g) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.g.clear();
  }
}

// ---------------- Outdoor Environment Primitives: Trees, Palms, Hills, Clouds, Bushes ----------------
const LEAF = ["#5aa83c", "#4c9a37", "#69b545", "#55a243", "#3f8f3c"];
const leafTex = (i: number) => ctex("leafSa2_" + i, 256, 128, (g) => {
  const base = new THREE.Color(LEAF[i % LEAF.length]), top = base.clone().offsetHSL(0.01, 0.03, 0.08), bot = base.clone().offsetHSL(-0.01, 0, -0.08);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#" + top.getHexString()); gr.addColorStop(0.5, "#" + base.getHexString()); gr.addColorStop(1, "#" + bot.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
});
const leafMat = (i: number) => lam("leafSa2_" + i, () => ({ map: leafTex(i) }));
const barkMat = () => lam("barkSa2", () => ({ color: "#8f5d3b" }));
const hillMat = (i: number) => lam("hillSa2_" + i, () => ({ color: ["#3d7a3a", "#2e6334", "#4b8a42"][i % 3] }));
const cloudMat = () => lam("cloudSa2", () => ({ color: "#f8fbff" }));

const SPH = new THREE.SphereGeometry(1, 14, 10);
const TRUNK = new THREE.CylinderGeometry(0.55, 1, 1, 8, 1).translate(0, 0.5, 0);

export const addTree = (b: Batch, x: number, y: number, z: number, h: number, seed: number) => {
  const r = rng(Math.abs(Math.floor(seed * 97 + 13)));
  const leaf = leafMat(Math.floor(r() * 4));
  const tr = 0.07 * h, th = 0.42 * h;
  b.add(TRUNK, barkMat(), new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion(), V(tr, th, tr)));
  const cy = y + 0.62 * h;
  const put = (dx: number, dy: number, dz: number, rad: number) =>
    b.add(SPH, leaf, new THREE.Matrix4().compose(V(x + dx, cy + dy, z + dz), new THREE.Quaternion(), V(rad, rad * 0.88, rad)));
  put(0, 0, 0, 0.28 * h);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + r() * 0.5, d = 0.18 * h;
    put(Math.cos(a) * d, -0.05 * h, Math.sin(a) * d, 0.21 * h);
  }
  put(0, 0.16 * h, 0, 0.19 * h);
};

/** Tropical Palm / Banana Plantation Tree for outdoor Romusha & Battlefield landscapes */
export const addPalm = (b: Batch, x: number, y: number, z: number, h: number, seed: number) => {
  const r = rng(Math.abs(Math.floor(seed * 73 + 19)));
  const leaf = leafMat(2);
  const tr = 0.055 * h;
  b.add(TRUNK, barkMat(), new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion(), V(tr, h * 0.72, tr)));
  const topY = y + h * 0.72;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + r() * 0.25;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, a, 0, "YXZ"));
    b.add(
      new THREE.BoxGeometry(0.18 * h, 0.04 * h, 0.52 * h).translate(0, 0, 0.24 * h),
      leaf,
      new THREE.Matrix4().compose(V(x, topY, z), q, V(1, 1, 1))
    );
  }
};

/** Rolling 3D background hills & mountains on the horizon */
export const addHills = (b: Batch, zBase = -11.5) => {
  const hills = [
    [-6.5, -0.4, zBase - 2, 5.2, 2.8, 3.2, 0],
    [-2.4, -0.4, zBase,     4.6, 2.5, 2.8, 1],
    [2.2,  -0.4, zBase - 1, 5.0, 2.7, 3.0, 2],
    [6.4,  -0.4, zBase - 2, 5.4, 2.9, 3.2, 0],
  ] as const;
  for (const [hx, hy, hz, sx, sy, sz, ci] of hills) {
    b.add(SPH, hillMat(ci), new THREE.Matrix4().compose(V(hx, hy, hz), new THREE.Quaternion(), V(sx, sy, sz)));
  }
};

/** Fluffy 3D cartoon clouds in the sky */
export const addClouds = (b: Batch, yBase = 4.6, zBase = -9.5) => {
  const cl = cloudMat();
  for (const [cx, cy, cz, sc] of [[-2.4, yBase, zBase, 1.0], [2.3, yBase + 0.25, zBase - 0.8, 1.1], [0.1, yBase + 0.45, zBase - 1.5, 0.9]] as const) {
    b.add(SPH, cl, new THREE.Matrix4().compose(V(cx, cy, cz), new THREE.Quaternion(), V(0.75 * sc, 0.38 * sc, 0.45 * sc)));
    b.add(SPH, cl, new THREE.Matrix4().compose(V(cx - 0.55 * sc, cy - 0.08 * sc, cz), new THREE.Quaternion(), V(0.52 * sc, 0.28 * sc, 0.38 * sc)));
    b.add(SPH, cl, new THREE.Matrix4().compose(V(cx + 0.55 * sc, cy - 0.08 * sc, cz), new THREE.Quaternion(), V(0.52 * sc, 0.28 * sc, 0.38 * sc)));
  }
};

/** Low plantation crop rows / bushes for outdoor plantation & battlefield */
export const addPlantationRows = (b: Batch, zStart = -3.2, zEnd = -6.8) => {
  const leaf1 = leafMat(0), leaf2 = leafMat(3);
  for (let z = zStart; z >= zEnd; z -= 1.2) {
    for (const x of [-3.4, -2.5, -1.7, 1.7, 2.5, 3.4]) {
      b.add(SPH, (Math.round(x + z) % 2 === 0) ? leaf1 : leaf2, new THREE.Matrix4().compose(V(x, 0.22, z), new THREE.Quaternion(), V(0.38, 0.28, 0.38)));
    }
  }
};

const fitText = (
  g: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxW: number,
  startPx: number,
  weight = "900",
  family = "'Segoe UI', Arial, sans-serif"
) => {
  let sz = startPx;
  g.font = `${weight} ${sz}px ${family}`;
  while (g.measureText(text).width > maxW && sz > 12) {
    sz -= 2;
    g.font = `${weight} ${sz}px ${family}`;
  }
  g.fillText(text, cx, cy);
};

// ---------------- Hand-Painted Custom Canvas2D Textures ----------------

export const heritageTileTex = () => ctex("sa2HeritageTileHD", 1024, 1024, (g) => {
  const S = 1024, N = 4, T = S / N;
  g.fillStyle = "#8a6d52"; g.fillRect(0, 0, S, S);
  const cols = ["#f2e6d0", "#e9dbb9", "#f5ebd8", "#e4d4b0"];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x * T, py = y * T;
    g.fillStyle = cols[(x + y * 3) % cols.length];
    g.fillRect(px + 6, py + 6, T - 12, T - 12);
    if ((x + y) % 2 === 0) {
      g.fillStyle = "#9e3b2b";
      g.beginPath();
      g.moveTo(px + T / 2, py + T / 2 - 22);
      g.lineTo(px + T / 2 + 22, py + T / 2);
      g.lineTo(px + T / 2, py + T / 2 + 22);
      g.lineTo(px + T / 2 - 22, py + T / 2);
      g.closePath();
      g.fill();
    }
  }
});

export const redEarthFloorTex = () => ctex("sa2RedEarthHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#7a442e"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = i % 2 === 0 ? "#8c5138" : "#633522";
    g.beginPath();
    g.ellipse(r() * 1024, r() * 1024, 40 + r() * 90, 20 + r() * 45, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
});

export const battlefieldFieldTex = () => ctex("sa2BattleFieldHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#486b33"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 95; i++) {
    g.fillStyle = i % 3 === 0 ? "#587d3e" : i % 3 === 1 ? "#5c432c" : "#3b5729";
    g.beginPath();
    g.ellipse(r() * 1024, r() * 1024, 35 + r() * 85, 22 + r() * 50, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
});

export const rugTex = (baseCol = "#8f2d38", trimCol = "#e0a84c") => ctex("sa2Rug_" + baseCol, 512, 512, (g) => {
  g.fillStyle = baseCol; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = trimCol; g.lineWidth = 18;
  g.strokeRect(28, 28, 456, 456);
  g.strokeStyle = "#fff5dc"; g.lineWidth = 6;
  g.strokeRect(54, 54, 404, 404);
  g.fillStyle = trimCol;
  g.beginPath(); g.ellipse(256, 256, 135, 90, 0, 0, Math.PI * 2); g.fill();
});

export const deskPanelTex = (bg: string, trim: string) =>
  ctex("sa2Panel_" + bg + trim, 512, 256, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = "#241726"; g.lineWidth = 14;
    g.strokeRect(8, 8, 496, 240);
    g.strokeStyle = trim; g.lineWidth = 10;
    g.strokeRect(28, 28, 456, 200);
    g.fillStyle = trim;
    g.beginPath(); g.arc(256, 128, 36, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#241726"; g.lineWidth = 6; g.stroke();
  });

export const plinthSignTex = (title: string, sub: string, bg: string, badgeCol: string) =>
  ctex("sa2Sign_" + title + sub, 512, 256, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = "#241726"; g.lineWidth = 14;
    g.strokeRect(8, 8, 496, 240);
    g.fillStyle = "#ffffff"; g.textAlign = "center";
    fitText(g, title, 256, 82, 456, 46);
    g.fillStyle = badgeCol;
    g.fillRect(28, 118, 456, 102);
    g.strokeRect(28, 118, 456, 102);
    g.fillStyle = "#241726";
    fitText(g, sub, 256, 184, 430, 40);
  });

export const headerBannerTex = (line1: string, line2: string, bg: string, topCol: string) =>
  ctex("sa2Hdr_" + line1 + line2, 1024, 256, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
    g.strokeStyle = "#241726"; g.lineWidth = 16;
    g.strokeRect(12, 12, 1000, 232);
    g.fillStyle = topCol; g.textAlign = "center";
    fitText(g, line1, 512, 110, 940, 64);
    g.fillStyle = "#ffffff";
    fitText(g, line2, 512, 196, 940, 44);
  });

// ---------------- 1. KALENDER 17 AGUSTUS 1945 KOSONG BOARD ----------------
export const calendar1945Tex = () => ctex("sa2Cal1945HD", 768, 768, (g) => {
  g.fillStyle = "#fff9eb"; g.fillRect(0, 0, 768, 768);
  g.strokeStyle = "#241726"; g.lineWidth = 16;
  g.strokeRect(12, 12, 744, 744);

  g.fillStyle = "#c0392b";
  g.fillRect(32, 32, 704, 132);
  g.strokeRect(32, 32, 704, 132);
  g.fillStyle = "#ffffff"; g.textAlign = "center";
  fitText(g, "AGUSTUS 1945", 384, 120, 650, 68);

  g.fillStyle = "#241726";
  fitText(g, "15 AGUSTUS: JEPANG BERTAHAN!", 384, 232, 650, 40);

  g.fillStyle = "#ffe66d";
  g.fillRect(110, 270, 548, 250);
  g.strokeStyle = "#c0392b"; g.lineWidth = 12;
  g.strokeRect(110, 270, 548, 250);

  g.fillStyle = "#c0392b";
  fitText(g, "17 AGUSTUS 1945 : [ ? ]", 384, 365, 510, 56);
  g.fillStyle = "#241726";
  fitText(g, "TIDAK ADA PROKLAMASI!", 384, 435, 510, 44);
  fitText(g, "BENDERA MERAH PUTIH TIDAK NAIK", 384, 492, 510, 34);

  g.fillStyle = "#1e272e";
  g.fillRect(48, 560, 672, 152);
  g.strokeRect(48, 560, 672, 152);
  g.fillStyle = "#ffd43b";
  fitText(g, "SEANDAINYA JEPANG MASIH MENJAJAH", 384, 625, 630, 38);
  g.fillStyle = "#ffffff";
  fitText(g, "APA YANG TERJADI PADA RAKYAT?", 384, 682, 630, 38);
});

// ---------------- 2. GIANT HAND-PAINTED NUSANTARA ARCHIPELAGO MAP (FULL SPOTLIGHT) ----------------
export const nusantaraMapTex = () => ctex("sa2MapNusantaraHD", 1280, 960, (g) => {
  g.fillStyle = "#0b283d"; g.fillRect(0, 0, 1280, 960);
  g.strokeStyle = "rgba(112, 232, 255, 0.18)"; g.lineWidth = 3;
  for (let x = 80; x < 1280; x += 110) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 940); g.stroke(); }
  for (let y = 80; y < 960; y += 110) { g.beginPath(); g.moveTo(20, y); g.lineTo(1260, y); g.stroke(); }

  g.strokeStyle = "#ffd43b"; g.lineWidth = 20;
  g.strokeRect(12, 12, 1256, 936);

  // Header
  g.fillStyle = "#143552";
  g.fillRect(36, 32, 1208, 108);
  g.strokeStyle = "#ffd43b"; g.lineWidth = 7;
  g.strokeRect(36, 32, 1208, 108);
  g.fillStyle = "#ffd43b"; g.textAlign = "center";
  fitText(g, "PETA BENTENG NUSANTARA & TITIK API PERLAWANAN RAKYAT", 640, 104, 1150, 48);

  const drawIsland = (pts: [number, number][], fill: string) => {
    g.fillStyle = fill;
    g.strokeStyle = "#241726"; g.lineWidth = 9;
    g.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.closePath();
    g.fill(); g.stroke();
  };

  // Islands drawn large & bold across the map canvas
  drawIsland([[85, 290], [165, 260], [360, 490], [325, 575], [245, 555], [78, 355]], "#3b9c58");       // Sumatra
  drawIsland([[355, 635], [685, 645], [705, 705], [345, 695]], "#4eb866");                               // Jawa
  drawIsland([[425, 275], [645, 250], [690, 415], [605, 520], [415, 495], [390, 375]], "#3b9c58");       // Kalimantan
  drawIsland([[730, 295], [860, 285], [830, 395], [870, 515], [765, 535], [715, 435]], "#4eb866");       // Sulawesi
  drawIsland([[720, 660], [920, 668], [920, 705], [720, 700]], "#3b9c58");                               // Nusa Tenggara
  drawIsland([[910, 350], [990, 345], [995, 475], [915, 480]], "#4eb866");                               // Maluku
  drawIsland([[1025, 365], [1230, 390], [1240, 565], [1085, 550], [1010, 455]], "#3b9c58");              // Papua

  // Red dashed naval supply & guerrilla lines
  g.strokeStyle = "#ff4757"; g.lineWidth = 8; g.setLineDash([22, 14]);
  g.beginPath(); g.moveTo(640, 175); g.lineTo(530, 375); g.lineTo(505, 655); g.stroke();
  g.beginPath(); g.moveTo(225, 425); g.lineTo(485, 655); g.lineTo(790, 425); g.lineTo(1125, 475); g.stroke();
  g.setLineDash([]);

  const pin = (x: number, y: number, title: string, sub: string, boxX: number, boxY: number, col = "#ffd43b") => {
    g.fillStyle = "#ff4757";
    g.strokeStyle = "#ffffff"; g.lineWidth = 5;
    g.beginPath(); g.arc(x, y, 22, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = "#ffd43b";
    g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill();

    g.fillStyle = "rgba(16, 28, 46, 0.96)";
    g.strokeStyle = col; g.lineWidth = 6;
    g.fillRect(boxX, boxY, 330, 114);
    g.strokeRect(boxX, boxY, 330, 114);
    g.fillStyle = col; g.textAlign = "center";
    fitText(g, title, boxX + 165, boxY + 48, 305, 34);
    g.fillStyle = "#ffffff";
    fitText(g, sub, boxX + 165, boxY + 94, 305, 26);
  };

  pin(225, 425, "1. SUMATRA", "MINYAK • GERILYA ACEH & SUMBAR", 44, 605, "#ffd43b");
  pin(515, 665, "2. JAWA (BENTENG UTAMA)", "BLITAR • INDRAMAYU • PRIANGAN", 390, 775, "#ff6b6b");
  pin(540, 385, "3. KALIMANTAN", "BBM BALIKPAPAN • MANDOR 1944", 365, 160, "#ffd43b");
  pin(790, 425, "4. SULAWESI & MALUKU", "POS LAUT & GERILYA KEPULAUAN", 725, 160, "#70e8ff");
  pin(1125, 475, "5. PAPUA", "TEMBOK DEPAN vs SEKUTU/AS", 905, 605, "#2ecc71");
});

// ---------------- 3. GIANT ASIA BLOCKADE & DECOLONIZATION TIMELINE MAP (FULL SPOTLIGHT) ----------------
export const asiaDecolMapTex = () => ctex("sa2MapAsiaHD", 1280, 960, (g) => {
  g.fillStyle = "#0c2438"; g.fillRect(0, 0, 1280, 960);
  g.strokeStyle = "rgba(112, 232, 255, 0.16)"; g.lineWidth = 3;
  for (let x = 80; x < 1280; x += 110) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 940); g.stroke(); }
  for (let y = 80; y < 960; y += 110) { g.beginPath(); g.moveTo(20, y); g.lineTo(1260, y); g.stroke(); }

  g.strokeStyle = "#ffd43b"; g.lineWidth = 20;
  g.strokeRect(12, 12, 1256, 936);

  // Header
  g.fillStyle = "#163854";
  g.fillRect(36, 32, 1208, 108);
  g.strokeStyle = "#2ecc71"; g.lineWidth = 7;
  g.strokeRect(36, 32, 1208, 108);
  g.fillStyle = "#ffe66d"; g.textAlign = "center";
  fitText(g, "PETA BLOKADE LAUT AS & GELOMBANG KEMERDEKAAN ASIA (1945–1953)", 640, 104, 1150, 44);

  // Draw East & SE Asia landmasses on the map
  const drawMass = (pts: [number, number][], fill: string) => {
    g.fillStyle = fill; g.strokeStyle = "#241726"; g.lineWidth = 8;
    g.beginPath(); pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y))); g.closePath();
    g.fill(); g.stroke();
  };
  // Asian Continent (India -> Burma -> Vietnam -> Korea)
  drawMass([[60, 180], [720, 180], [760, 310], [560, 490], [390, 450], [210, 480], [60, 390]], "#2e6b48");
  // Japan Archipelago (Top Right, occupied by US)
  drawMass([[930, 180], [1160, 175], [1190, 310], [950, 325]], "#2980b9");
  // Indonesian Archipelago (Bottom)
  drawMass([[320, 590], [1180, 595], [1200, 710], [310, 705]], "#3b9c58");

  // Top-Right Callout on Japan: DIDUDUKI AS (1945-1952)
  g.fillStyle = "#1b4f72"; g.strokeStyle = "#70e8ff"; g.lineWidth = 7;
  g.fillRect(790, 165, 440, 165); g.strokeRect(790, 165, 440, 165);
  g.fillStyle = "#ffe66d";
  fitText(g, "TOKYO / JEPANG (1945–1952)", 1010, 228, 410, 36);
  g.fillStyle = "#ffffff";
  fitText(g, "DIDUDUKI AS (MACARTHUR)", 1010, 276, 410, 32);
  g.fillStyle = "#70e8ff";
  fitText(g, "MILITER BUBAR • KELAPARAN 1946", 1010, 314, 410, 24);

  // Middle: Bold Red US Naval Blockade Line cutting Tokyo from Nusantara
  g.strokeStyle = "#ff4757"; g.lineWidth = 12; g.setLineDash([28, 16]);
  g.beginPath(); g.moveTo(640, 430); g.lineTo(1235, 430); g.stroke();
  g.setLineDash([]);
  g.fillStyle = "#c0392b"; g.strokeStyle = "#ffffff"; g.lineWidth = 5;
  g.fillRect(700, 385, 530, 88); g.strokeRect(700, 385, 530, 88);
  g.fillStyle = "#ffe66d";
  fitText(g, "BLOKADE KAPAL SELAM AS", 965, 426, 500, 34);
  g.fillStyle = "#ffffff";
  fitText(g, "MINYAK & LOGISTIK KE NUSANTARA PUTUS!", 965, 460, 500, 24);

  // Left: 4 Asian Decolonization Milestone Boxes
  const waves = [
    ["1. VIETNAM MERDEKA", "SEPTEMBER 1945", 56, 170],
    ["2. INDIA MERDEKA", "AGUSTUS 1947", 385, 170],
    ["3. BURMA MERDEKA", "JANUARI 1948", 56, 340],
    ["4. KOREA MERDEKA", "AGUSTUS 1948", 385, 340],
  ] as const;

  for (const [t1, t2, bx, by] of waves) {
    g.fillStyle = "rgba(20, 56, 42, 0.96)";
    g.strokeStyle = "#2ecc71"; g.lineWidth = 6;
    g.fillRect(bx, by, 305, 145);
    g.strokeRect(bx, by, 305, 145);
    g.fillStyle = "#2ecc71";
    fitText(g, t1, bx + 152, by + 62, 280, 34);
    g.fillStyle = "#ffffff";
    fitText(g, t2, bx + 152, by + 114, 280, 30);
  }

  // Bottom Nusantara Verdict Banner
  g.fillStyle = "rgba(24, 78, 52, 0.96)";
  g.strokeStyle = "#ffd43b"; g.lineWidth = 10;
  g.fillRect(56, 540, 1174, 365);
  g.strokeRect(56, 540, 1174, 365);
  g.fillStyle = "#ffd43b";
  fitText(g, "5. NUSANTARA / INDONESIA MERDEKA: 1949 – 1953", 640, 635, 1110, 52);
  g.fillStyle = "#ffffff";
  fitText(g, "PERANG GERILYA RAKYAT + JEPANG DIDUDUKI AS + TEKANAN PBB", 640, 715, 1110, 38);
  g.fillStyle = "#2ecc71";
  fitText(g, "KESIMPULAN: KEMERDEKAAN HANYA MUNDUR, BUKAN BATAL!", 640, 800, 1110, 44);
  g.fillStyle = "#ffe66d";
  fitText(g, "(MUNGKIN 1949 • MUNGKIN 1951 • MUNGKIN 1953)", 640, 868, 1110, 34);
});

export const tokyoScapBoardTex = () => ctex("sa2TokyoScapHD", 768, 768, (g) => {
  g.fillStyle = "#162638"; g.fillRect(0, 0, 768, 768);
  g.strokeStyle = "#ffd43b"; g.lineWidth = 16;
  g.strokeRect(12, 12, 744, 744);
  g.fillStyle = "#1f5a8c";
  g.fillRect(36, 36, 696, 128);
  g.strokeStyle = "#241726"; g.lineWidth = 8;
  g.strokeRect(36, 36, 696, 128);
  g.fillStyle = "#ffe66d"; g.textAlign = "center";
  fitText(g, "TWIST: PENJAJAH DIJAJAH!", 384, 120, 650, 54);
  const items = [
    ["2 SEPT 1945 – 28 APR 1952", "AMERIKA (JENDERAL MACARTHUR) DUDUKI JEPANG", "#70e8ff"],
    ["KONSTITUSI BARU (3 MEI 1947)", "KEKUASAAN KAISAR DIHAPUS • MILITER BUBAR", "#ffe66d"],
    ["KELAPARAN TOKYO 1946", "MUSTAHIL JEPANG PERTAHANKAN KOLONI RI!", "#2ecc71"],
  ] as const;
  items.forEach(([t1, t2, col], idx) => {
    const y = 194 + idx * 178;
    g.fillStyle = "#1e344d";
    g.fillRect(44, y, 680, 150);
    g.strokeStyle = col; g.lineWidth = 7;
    g.strokeRect(44, y, 680, 150);
    g.fillStyle = col;
    fitText(g, t1, 384, y + 60, 640, 38);
    g.fillStyle = "#ffffff";
    fitText(g, t2, 384, y + 118, 640, 32);
  });
});

export const colony1950BoardTex = () => ctex("sa2Colony1950HD", 768, 768, (g) => {
  g.fillStyle = "#241722"; g.fillRect(0, 0, 768, 768);
  g.strokeStyle = "#ff4757"; g.lineWidth = 16;
  g.strokeRect(12, 12, 744, 744);
  g.fillStyle = "#8c232c";
  g.fillRect(36, 36, 696, 126);
  g.strokeStyle = "#241726"; g.lineWidth = 8;
  g.strokeRect(36, 36, 696, 126);
  g.fillStyle = "#ffe66d"; g.textAlign = "center";
  fitText(g, "CERMIN KOREA (35 TAHUN)", 384, 118, 650, 54);
  const items = [
    ["BAHASA & NAMA DIHAPUS", "BAHASA INDONESIA DIGANTI NIHONGO DI SEKOLAH", "#ff6b6b"],
    ["SEJARAH DITULIS ULANG", "MAJAPAHIT & SRIWIJAYA DIKLAIM DAI-NIPPON", "#ffe66d"],
    ["CERMIN MANCHUKUO & TAIWAN", "KOTA MODERN UNTUK PENGUASA • RAKYAT BURUH!", "#70e8ff"],
  ] as const;
  items.forEach(([t1, t2, col], idx) => {
    const y = 192 + idx * 178;
    g.fillStyle = "#362032";
    g.fillRect(44, y, 680, 150);
    g.strokeStyle = col; g.lineWidth = 7;
    g.strokeRect(44, y, 680, 150);
    g.fillStyle = col;
    fitText(g, t1, 384, y + 60, 640, 38);
    g.fillStyle = "#ffffff";
    fitText(g, t2, 384, y + 118, 640, 30);
  });
});

export const modernMitraBoardTex = () => ctex("sa2ModernMitraHD", 768, 768, (g) => {
  g.fillStyle = "#142a38"; g.fillRect(0, 0, 768, 768);
  g.strokeStyle = "#2ecc71"; g.lineWidth = 16;
  g.strokeRect(12, 12, 744, 744);
  g.fillStyle = "#1e6b4e";
  g.fillRect(36, 36, 696, 126);
  g.strokeStyle = "#241726"; g.lineWidth = 8;
  g.strokeRect(36, 36, 696, 126);
  g.fillStyle = "#ffe66d"; g.textAlign = "center";
  fitText(g, "KOLONI vs MITRA MERDEKA", 384, 118, 650, 54);
  const items = [
    ["JIKA TETAP DIJAJAH (KOLONI)", "HANYA EKSPOR BAHAN MENTAH • RAKYAT KELAS DUA", "#ff6b6b"],
    ["SETELAH MERDEKA (SEJAJAR)", "MITRA MRT, INFRASTRUKTUR, TEKNOLOGI & BUDAYA", "#2ecc71"],
    ["3 PELAJARAN SEANDAINYA", "MERDEKA LAHIR DARI PERLAWANAN & DIPLOMASI!", "#ffe66d"],
  ] as const;
  items.forEach(([t1, t2, col], idx) => {
    const y = 192 + idx * 178;
    g.fillStyle = "#1b3b4f";
    g.fillRect(44, y, 680, 150);
    g.strokeStyle = col; g.lineWidth = 7;
    g.strokeRect(44, y, 680, 150);
    g.fillStyle = col;
    fitText(g, t1, 384, y + 60, 640, 38);
    g.fillStyle = "#ffffff";
    fitText(g, t2, 384, y + 118, 640, 30);
  });
});

// ===============================================================================================================
// SET 1: PELATARAN GEDUNG SIDANG BPUPKI & KALENDER 17 AGUSTUS 1945 KOSONG (calendar_1945)
// ===============================================================================================================
export const buildCalendarSet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const floorM = lam("cal2Floor", () => ({ map: rep(heritageTileTex(), 3, 3) }));
  const grassM = lam("cal2Grass", () => ({ map: rep(grassHD(), 4, 4) }));
  const pillarM = lam("cal2Pillar", () => ({ color: "#f2ece1" }));
  const woodM = lam("cal2Wood", () => ({ map: beamHD() }));
  const rugM = lam("cal2Rug", () => ({ map: rugTex("#7a232b", "#d9a441") }));
  const brassM = lam("cal2Brass", () => ({ color: "#e0a84c" }));
  const redM = lam("cal2Red", () => ({ color: "#c0392b" }));
  const whiteM = lam("cal2White", () => ({ color: "#f5f5f0" }));
  const boardM = lam("cal2Board", () => ({ map: calendar1945Tex() }));
  const hdrM = lam("cal2Hdr", () => ({
    map: headerBannerTex("SEANDAINYA • 17 AGUSTUS 1945", "JEPANG TIDAK MENYERAH & MASIH MENJAJAH", "#241726", "#ffd43b"),
  }));
  const signRightM = lam("cal2SignR", () => ({
    map: plinthSignTex("17 AGUSTUS 1945", "PROKLAMASI TIDAK TERJADI?", "#7a232b", "#ffd43b"),
  }));

  // Colonial Veranda Tile Foreground + Open Courtyard Lawn & Trees behind!
  b.add(new THREE.BoxGeometry(16, 0.4, 5.5).translate(0, -0.2, -0.2), floorM);
  b.add(new THREE.BoxGeometry(28, 0.4, 18).translate(0, -0.22, -10.5), grassM);
  b.add(new THREE.BoxGeometry(3.8, 0.03, 2.4).translate(0, 0.015, -0.95), rugM);

  // Open Colonial Portico Pillars & Architrave Beam (open sky & trees visible between pillars!)
  for (const px of [-2.15, -0.05, 2.15]) {
    b.add(new THREE.CylinderGeometry(0.18, 0.22, 3.6, 12).translate(px, 1.8, -3.45), pillarM);
    b.add(new THREE.BoxGeometry(0.52, 0.22, 0.52).translate(px, 0.11, -3.45), woodM);
  }
  b.add(new THREE.BoxGeometry(4.8, 0.28, 0.42).translate(0, 3.62, -3.45), pillarM);

  b.add(new THREE.BoxGeometry(1.68, 0.44, 0.08).translate(0, 3.36, -3.12), hdrM);
  b.add(new THREE.BoxGeometry(1.14, 1.14, 0.10).translate(-0.82, 1.98, -3.20), boardM);
  b.add(new THREE.BoxGeometry(1.02, 0.44, 0.08).translate(0.82, 2.28, -3.20), signRightM);

  // Left: Long BPUPKI Conference Table with stacks of unfinished draft papers
  b.add(new THREE.BoxGeometry(1.15, 0.74, 0.65).translate(-0.82, 0.37, -1.95), woodM);
  b.add(new THREE.BoxGeometry(1.25, 0.08, 0.74).translate(-0.82, 0.76, -1.95), brassM);
  b.add(new THREE.BoxGeometry(0.45, 0.10, 0.32).translate(-0.82, 0.85, -1.95), whiteM);

  // Right: Courtyard Flagpole Pedestal with Hinomaru Flag at top & locked Merah Putih chest at base
  b.add(new THREE.BoxGeometry(0.75, 0.52, 0.75).translate(0.88, 0.26, -1.95), pillarM);
  b.add(new THREE.CylinderGeometry(0.035, 0.04, 1.55, 10).translate(0.68, 1.28, -1.95), brassM);
  b.add(new THREE.BoxGeometry(0.56, 0.36, 0.04).translate(0.98, 1.84, -1.95), whiteM);
  b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 16).rotateX(Math.PI / 2).translate(0.98, 1.84, -1.95), redM);

  // Outdoor background trees & hills visible through the open colonial portico
  addTree(b, -3.1, 0, -5.8, 4.0, 11);
  addTree(b, 3.1, 0, -5.8, 4.1, 23);
  addHills(b, -12.5);
  addClouds(b, 4.5, -9.5);

  b.build(g);
  return g;
};

// ===============================================================================================================
// SET 2: OUTDOOR PADANG RUMPUT, KEBUN & REL MAUT SAKETI–BAYAH DI BANTEN (romusha_saketi)
// ===============================================================================================================
export const buildRomushaSet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const grassM = lam("rom2Grass", () => ({ map: rep(grassHD(), 5, 5) }));
  const earthM = lam("rom2Earth", () => ({ map: rep(redEarthFloorTex(), 4, 2) }));
  const rockM = lam("rom2Rock", () => ({ color: "#6e5a4f" }));
  const darkCaveM = lam("rom2Cave", () => ({ color: "#1c1614" }));
  const woodM = lam("rom2Wood", () => ({ map: beamHD() }));
  const steelM = lam("rom2Steel", () => ({ color: "#7f8c8d" }));
  const coalM = lam("rom2Coal", () => ({ color: "#1e2226" }));
  const sackM = lam("rom2Sack", () => ({ color: "#d4b886" }));
  const hdrM = lam("rom2Hdr", () => ({
    map: headerBannerTex("KERJA PAKSA ROMUSHA & PADI", "REL SAKETI–BAYAH (89 KM) • 90.000 KORBAN", "#38221c", "#ffd43b"),
  }));
  const signLeftM = lam("rom2SignL", () => ({
    map: plinthSignTex("REL SAKETI–BAYAH", "89 KM • 90.000 KORBAN!", "#7a232b", "#ffd43b"),
  }));
  const signRightM = lam("rom2SignR", () => ({
    map: plinthSignTex("300.000 ROMUSHA", "HANYA 70.000 KEMBALI", "#261814", "#ff6b6b"),
  }));

  // 1. OUTDOOR OPEN MEADOW & PLANTATION FIELD + RED BANTEN EARTH RAILWAY EMBANKMENT
  b.add(new THREE.BoxGeometry(32, 0.4, 24).translate(0, -0.22, -8.0), grassM);
  b.add(new THREE.BoxGeometry(16, 0.08, 2.2).translate(0, 0.02, -1.65), earthM);

  // 2. CONTINUOUS 3D SAKETI-BAYAH RAILWAY TRACK LAID DIRECTLY ON THE GROUND (x = -4.5 .. +4.5, z = -1.65)
  for (let x = -3.6; x <= 3.6; x += 0.36) {
    b.add(new THREE.BoxGeometry(0.14, 0.06, 0.92).translate(x, 0.08, -1.65), woodM);
  }
  b.add(new THREE.BoxGeometry(8.0, 0.06, 0.06).translate(0, 0.13, -1.92), steelM);
  b.add(new THREE.BoxGeometry(8.0, 0.06, 0.06).translate(0, 0.13, -1.38), steelM);

  // 3. 3D IRON COAL MINE LORRY / CART ON THE RAILS (left-center at x = -0.92, z = -1.65)
  const cx = -0.92, cz = -1.65;
  b.add(new THREE.BoxGeometry(0.88, 0.48, 0.62).translate(cx, 0.46, cz), steelM);
  for (const dx of [-0.28, 0.28]) {
    b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.70, 12).rotateX(Math.PI / 2).translate(cx + dx, 0.20, cz), coalM);
  }
  b.add(new THREE.SphereGeometry(0.34, 10, 8).scale(1.2, 0.65, 0.85).translate(cx, 0.74, cz), coalM);

  // 4. ROCKY HILLSIDE & DEFENSIVE CAVE TUNNEL ENTRANCE ON RIGHT FIELD (pushed back to z = -3.95 so it never clips the signpost!)
  b.add(new THREE.SphereGeometry(1.25, 12, 10).scale(1.1, 0.88, 0.75).translate(1.30, 0.75, -3.95), rockM);
  b.add(new THREE.BoxGeometry(0.82, 1.05, 0.45).translate(1.20, 0.52, -3.35), darkCaveM);
  b.add(new THREE.BoxGeometry(0.12, 1.12, 0.12).translate(0.78, 0.56, -3.18), woodM);
  b.add(new THREE.BoxGeometry(0.12, 1.12, 0.12).translate(1.62, 0.56, -3.18), woodM);
  b.add(new THREE.BoxGeometry(0.98, 0.14, 0.16).translate(1.20, 1.12, -3.18), woodM);

  // Stacked Confiscated Rice Sacks ("Pungutan Padi Indramayu") on wooden pallet in the plantation field (x = +0.92, z = -1.65)
  b.add(new THREE.BoxGeometry(0.95, 0.08, 0.68).translate(0.92, 0.08, -1.65), woodM);
  b.add(new THREE.BoxGeometry(0.42, 0.22, 0.32).translate(0.72, 0.22, -1.65), sackM);
  b.add(new THREE.BoxGeometry(0.42, 0.22, 0.32).translate(1.14, 0.22, -1.65), sackM);
  b.add(new THREE.BoxGeometry(0.42, 0.22, 0.32).translate(0.92, 0.44, -1.65), sackM);

  // 5. OUTDOOR WOODEN SIGNPOSTS PLANTED ON TIMBER POLES IN THE FIELD (above character heads at y = 2.15)
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 2.35, 8).translate(-0.85, 1.18, -2.85), woodM);
  b.add(new THREE.BoxGeometry(1.04, 0.46, 0.08).translate(-0.85, 2.18, -2.80), signLeftM);

  b.add(new THREE.CylinderGeometry(0.05, 0.05, 2.35, 8).translate(0.85, 1.18, -2.85), woodM);
  b.add(new THREE.BoxGeometry(1.04, 0.46, 0.08).translate(0.85, 2.18, -2.80), signRightM);

  // Top Header Banner on tall outdoor bamboo/wood gantry
  b.add(new THREE.BoxGeometry(1.68, 0.44, 0.08).translate(0, 3.36, -3.12), hdrM);

  // 6. RICH OUTDOOR PLANTATION BACKGROUND: Palm trees, banana/crop rows, distant hills, and 3D clouds!
  addPlantationRows(b, -3.2, -6.8);
  addPalm(b, -2.15, 0, -3.8, 3.2, 14);
  addPalm(b, -1.45, 0, -4.6, 2.9, 27);
  addPalm(b, 2.35, 0, -4.0, 3.3, 39);
  addTree(b, -3.4, 0, -5.5, 3.8, 51);
  addTree(b, 3.4, 0, -5.8, 3.9, 63);
  addHills(b, -11.0);
  addClouds(b, 4.4, -9.0);

  b.build(g);
  return g;
};

// ===============================================================================================================
// SET 3: SOROTAN PENUH PETA STRATEGIS NUSANTARA — TANPA KARAKTER (map_nusantara)
// ===============================================================================================================
export const buildMapNusantaraSet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const floorM = lam("mn2Floor", () => ({ map: rep(planksHD(), 4, 4) }));
  const woodM = lam("mn2Wood", () => ({ map: beamHD() }));
  const goldM = lam("mn2Gold", () => ({ color: "#ffd43b" }));
  const seaM = lam("mn2Sea", () => ({ color: "#113854" }));
  const islandM = lam("mn2Island", () => ({ color: "#2ecc71" }));
  const pinM = lam("mn2Pin", () => ({ color: "#ff4757" }));
  const mapM = lam("mn2MapBoard", () => ({ map: nusantaraMapTex() }));
  const hdrM = lam("mn2Hdr", () => ({
    map: headerBannerTex("PETA STRATEGIS NUSANTARA", "JAWA • SUMATRA • KALIMANTAN • SULAWESI • PAPUA", "#0e2f44", "#ffd43b"),
  }));

  b.add(new THREE.BoxGeometry(20, 0.4, 14).translate(0, -0.2, -2.0), floorM);

  // Overhead Header Banner
  b.add(new THREE.BoxGeometry(1.68, 0.42, 0.08).translate(0, 3.12, -2.85), hdrM);

  // MASSIVE FULL-SCREEN NUSANTARA MAP BOARD (width 1.72m inside 9:16 safe margin so left/right edges never clip!)
  b.add(new THREE.BoxGeometry(1.80, 1.42, 0.08).translate(0, 1.56, -2.90), goldM);
  b.add(new THREE.BoxGeometry(1.72, 1.34, 0.10).translate(0, 1.56, -2.85), mapM);

  // Foreground 3D Tactical Relief Map Table right below the giant map (y = 0.56)
  b.add(new THREE.BoxGeometry(1.82, 0.56, 0.92).translate(0, 0.28, -2.10), woodM);
  b.add(new THREE.BoxGeometry(1.90, 0.08, 0.98).translate(0, 0.58, -2.10), seaM);

  // 3D Miniature Islands on the Tactical Map Table (Sumatra, Jawa, Kalimantan, Sulawesi, Papua)
  b.add(new THREE.BoxGeometry(0.46, 0.08, 0.18).rotateY(-0.45).translate(-0.76, 0.65, -2.02), islandM);
  b.add(new THREE.BoxGeometry(0.56, 0.08, 0.12).translate(-0.18, 0.65, -1.78), islandM);
  b.add(new THREE.BoxGeometry(0.40, 0.10, 0.32).translate(-0.15, 0.66, -2.16), islandM);
  b.add(new THREE.BoxGeometry(0.26, 0.08, 0.28).translate(0.34, 0.65, -2.10), islandM);
  b.add(new THREE.BoxGeometry(0.42, 0.10, 0.22).translate(0.80, 0.66, -2.08), islandM);

  for (const [px, pz] of [[-0.76, -2.02], [-0.18, -1.78], [-0.15, -2.16], [0.34, -2.10], [0.80, -2.08]]) {
    b.add(new THREE.CylinderGeometry(0.03, 0.01, 0.16, 8).translate(px, 0.75, pz), pinM);
    b.add(new THREE.SphereGeometry(0.05, 8, 8).translate(px, 0.85, pz), pinM);
  }

  b.build(g);
  return g;
};

// ===============================================================================================================
// SET 4: OUTDOOR MEDAN PEPERANGAN TERBUKA DI LAPANGAN (war_battle)
// ===============================================================================================================
export const buildWarBattleSet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const fieldM = lam("war2Field", () => ({ map: rep(battlefieldFieldTex(), 5, 5) }));
  const earthM = lam("war2Earth", () => ({ map: rep(redEarthFloorTex(), 3, 2) }));
  const bunkerM = lam("war2Bunker", () => ({ color: "#54524e" }));
  const sandbagM = lam("war2Sand", () => ({ color: "#c2a878" }));
  const oliveM = lam("war2Olive", () => ({ color: "#425e36" }));
  const steelM = lam("war2Steel", () => ({ color: "#525a63" }));
  const woodM = lam("war2Wood", () => ({ map: beamHD() }));
  const redM = lam("war2Red", () => ({ color: "#c0392b" }));
  const whiteM = lam("war2White", () => ({ color: "#f5f5f0" }));
  const hdrM = lam("war2Hdr", () => ({
    map: headerBannerTex("MEDAN PERANG GERILYA RAKYAT", "PETA BLITAR • INDRAMAYU • MARKAS KENPEITAI DISERBU!", "#2b1414", "#ffd43b"),
  }));
  const signLeftM = lam("war2SignL", () => ({
    map: plinthSignTex("GERILYA & PETA BLITAR", "SERANGAN MORTIR & SENAPAN!", "#1b3a2b", "#2ecc71"),
  }));
  const signRightM = lam("war2SignR", () => ({
    map: plinthSignTex("BENTENG KENPEITAI", "DISERBU & REL DIDINAMIT!", "#7a1c1c", "#ffd43b"),
  }));

  // 1. OUTDOOR OPEN BATTLEFIELD TERRAIN + MUD TRENCHES & SHELL CRATERS
  b.add(new THREE.BoxGeometry(32, 0.4, 24).translate(0, -0.22, -8.0), fieldM);
  b.add(new THREE.BoxGeometry(12, 0.06, 2.4).translate(0, 0.01, -1.85), earthM);

  // 2. LEFT FIELD: INDONESIAN PETA / GUERRILLA SANDBAG TRENCH, BAMBOO SPEARS & 3D MORTAR (x = -0.88, z = -1.85)
  const lx = -0.88, lz = -1.85;
  for (let row = 0; row < 3; row++) {
    for (let col = -1; col <= 1; col++) {
      b.add(new THREE.BoxGeometry(0.36, 0.18, 0.26).translate(lx + col * 0.36, 0.12 + row * 0.17, lz + 0.25), sandbagM);
    }
  }
  // 3D Olive Mortar Base & angled Barrel firing toward the right
  b.add(new THREE.BoxGeometry(0.45, 0.12, 0.45).translate(lx + 0.15, 0.08, lz - 0.10), oliveM);
  b.add(new THREE.CylinderGeometry(0.075, 0.085, 0.78, 12).rotateZ(-0.62).translate(lx + 0.22, 0.52, lz - 0.10), steelM);
  // Merah Putih battle pennant on bamboo spear at left trench
  b.add(new THREE.CylinderGeometry(0.025, 0.03, 1.85, 8).translate(-1.35, 0.92, -1.95), woodM);
  b.add(new THREE.BoxGeometry(0.46, 0.16, 0.03).translate(-1.10, 1.68, -1.95), redM);
  b.add(new THREE.BoxGeometry(0.46, 0.16, 0.03).translate(-1.10, 1.52, -1.95), whiteM);

  // 3. CENTER-BACK FIELD: DYNAMITED / COLLAPSED STEEL RAILWAY BRIDGE TRUSSES (x = 0.0, z = -3.65)
  b.add(new THREE.BoxGeometry(0.22, 1.55, 0.22).rotateZ(0.42).translate(-0.22, 0.75, -3.65), steelM);
  b.add(new THREE.BoxGeometry(0.22, 1.55, 0.22).rotateZ(-0.48).translate(0.25, 0.70, -3.65), steelM);
  b.add(new THREE.BoxGeometry(1.45, 0.14, 0.35).rotateZ(0.18).translate(0.0, 0.28, -3.65), woodM);

  // 4. RIGHT FIELD: JAPANESE KENPEITAI WATCHTOWER & CONCRETE BUNKER UNDER ATTACK (x = +0.92, z = -2.10)
  const rx = 0.92, rz = -2.10;
  b.add(new THREE.BoxGeometry(1.18, 0.85, 0.88).translate(rx, 0.42, rz), bunkerM);
  b.add(new THREE.BoxGeometry(0.92, 0.62, 0.68).translate(rx, 1.12, rz), bunkerM);
  // Watchtower timber frame & Hinomaru sign tilted from explosion
  b.add(new THREE.BoxGeometry(1.08, 0.14, 0.78).rotateZ(0.12).translate(rx, 1.46, rz), woodM);
  b.add(new THREE.BoxGeometry(0.48, 0.32, 0.05).rotateZ(0.22).translate(rx - 0.18, 1.72, rz + 0.20), whiteM);
  b.add(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 14).rotateX(Math.PI / 2).translate(rx - 0.18, 1.72, rz + 0.20), redM);

  // 5. OUTDOOR FIELD SIGNPOSTS PLANTED ON POLES (y = 2.22) + HEADER BANNER
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8).translate(-0.85, 1.2, -2.95), woodM);
  b.add(new THREE.BoxGeometry(1.04, 0.46, 0.08).translate(-0.85, 2.22, -2.90), signLeftM);

  b.add(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8).translate(0.85, 1.2, -2.95), woodM);
  b.add(new THREE.BoxGeometry(1.04, 0.46, 0.08).translate(0.85, 2.22, -2.90), signRightM);

  b.add(new THREE.BoxGeometry(1.68, 0.44, 0.08).translate(0, 3.36, -3.12), hdrM);

  // 6. RICH OUTDOOR BATTLEFIELD HORIZON: Jungle palms, trees, rolling hills, and clouds!
  addPalm(b, -2.25, 0, -4.2, 3.3, 17);
  addPalm(b, 2.35, 0, -4.2, 3.2, 31);
  addTree(b, -3.3, 0, -5.6, 4.0, 43);
  addTree(b, 3.3, 0, -5.6, 3.9, 59);
  addHills(b, -11.5);
  addClouds(b, 4.4, -9.2);

  b.build(g);

  // Glowing Fire Embers on the burning Kenpeitai Fort (NOINK)
  const fireMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.8, 1.15, 0.25), fog: false });
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), fireMat);
  ember.position.set(rx + 0.12, 1.52, rz + 0.18);
  ember.layers.set(NOINK);
  g.add(ember);

  return g;
};

// ===============================================================================================================
// SET 5: PLAZA MARKAS BESAR SEKUTU GHQ TOKYO 1945–1952 (MACARTHUR SCAP vs HIROHITO) (tokyo_scap)
// ===============================================================================================================
export const buildTokyoScapSet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const floorM = lam("tok2Floor", () => ({ map: rep(stoneHD("tok2PlazaHD"), 4, 4) }));
  const stoneM = lam("tok2Stone", () => ({ color: "#d5cfc4" }));
  const blueM = lam("tok2Blue", () => ({ color: "#1b4366" }));
  const goldM = lam("tok2Gold", () => ({ color: "#ffd43b" }));
  const whiteM = lam("tok2White", () => ({ color: "#f5f6fa" }));
  const redM = lam("tok2Red", () => ({ color: "#c0392b" }));
  const woodM = lam("tok2Wood", () => ({ map: beamHD() }));
  const boardM = lam("tok2Board", () => ({ map: tokyoScapBoardTex() }));
  const hdrM = lam("tok2Hdr", () => ({
    map: headerBannerTex("TWIST: JEPANG DIDUDUKI AS!", "2 SEPT 1945 – 28 APR 1952 • JENDERAL MACARTHUR", "#162638", "#ffd43b"),
  }));
  const signRightM = lam("tok2SignR", () => ({
    map: plinthSignTex("SANG PENJAJAH DIJAJAH!", "MILITER JEPANG DIBUBARKAN", "#1f4e78", "#2ecc71"),
  }));

  // Stone Plaza Ground
  b.add(new THREE.BoxGeometry(24, 0.4, 16).translate(0, -0.2, -3.0), floorM);

  // Neo-Classical Dai-Ichi / GHQ Tokyo Facade Columns in Background (z = -4.2) with open sky above
  b.add(new THREE.BoxGeometry(5.6, 2.85, 0.45).translate(0, 1.42, -4.45), stoneM);
  for (const px of [-2.2, -1.1, 0.0, 1.1, 2.2]) {
    b.add(new THREE.BoxGeometry(0.32, 2.95, 0.58).translate(px, 1.48, -4.35), whiteM);
  }
  b.add(new THREE.BoxGeometry(5.9, 0.28, 0.68).translate(0, 2.95, -4.35), stoneM);

  b.add(new THREE.BoxGeometry(1.68, 0.44, 0.08).translate(0, 3.36, -3.12), hdrM);
  b.add(new THREE.BoxGeometry(1.14, 1.14, 0.10).translate(-0.78, 1.98, -3.15), boardM);
  b.add(new THREE.BoxGeometry(1.02, 0.44, 0.08).translate(0.80, 2.24, -3.15), signRightM);

  // Left: SCAP Allied Occupation Checkpoint & 1947 Constitution Monument Podium
  b.add(new THREE.BoxGeometry(1.05, 0.78, 0.68).translate(-0.84, 0.39, -1.95), blueM);
  b.add(new THREE.BoxGeometry(1.12, 0.08, 0.74).translate(-0.84, 0.81, -1.95), goldM);
  b.add(new THREE.BoxGeometry(0.45, 0.12, 0.32).translate(-0.84, 0.90, -1.95), whiteM);

  // Right: Demilitarized Imperial Gate & Surrendered Sword Rack + 1946 Ration Box
  b.add(new THREE.BoxGeometry(1.05, 0.65, 0.68).translate(0.84, 0.32, -1.95), woodM);
  b.add(new THREE.BoxGeometry(0.55, 0.38, 0.42).translate(0.84, 0.84, -1.95), whiteM);
  b.add(new THREE.BoxGeometry(0.52, 0.08, 0.08).rotateZ(0.55).translate(0.84, 1.10, -1.80), redM);

  addClouds(b, 4.5, -9.5);
  b.build(g);
  return g;
};

// ===============================================================================================================
// SET 6: SOROTAN PENUH PETA BLOKADE PASIFIK & DEKOLONISASI ASIA — TANPA KARAKTER (map_asia)
// ===============================================================================================================
export const buildMapAsiaSet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const floorM = lam("ma2Floor", () => ({ map: rep(heritageTileTex(), 4, 4) }));
  const goldM = lam("ma2Gold", () => ({ color: "#ffd43b" }));
  const greenM = lam("ma2Green", () => ({ color: "#1e6b4e" }));
  const mapM = lam("ma2MapBoard", () => ({ map: asiaDecolMapTex() }));
  const hdrM = lam("ma2Hdr", () => ({
    map: headerBannerTex("GELOMBANG DEKOLONISASI ASIA", "VIETNAM 1945 • INDIA 1947 • BURMA & KOREA 1948", "#10283d", "#2ecc71"),
  }));

  b.add(new THREE.BoxGeometry(20, 0.4, 14).translate(0, -0.2, -2.0), floorM);
  b.add(new THREE.BoxGeometry(1.68, 0.42, 0.08).translate(0, 3.12, -2.85), hdrM);

  // MASSIVE FULL-SCREEN ASIA DECOLONIZATION MAP BOARD (width 1.72m inside 9:16 safe margin!)
  b.add(new THREE.BoxGeometry(1.80, 1.42, 0.08).translate(0, 1.56, -2.90), goldM);
  b.add(new THREE.BoxGeometry(1.72, 1.34, 0.10).translate(0, 1.56, -2.85), mapM);

  // Low Diplomatic Credenza below the giant map
  b.add(new THREE.BoxGeometry(1.82, 0.56, 0.88).translate(0, 0.28, -2.10), greenM);
  b.add(new THREE.BoxGeometry(1.90, 0.08, 0.94).translate(0, 0.58, -2.10), goldM);

  b.build(g);
  return g;
};

// ===============================================================================================================
// SET 7: JALANAN KOTA KOLONIAL 1950-AN (STASIUN PENGUASA vs TAMBANG RAKYAT KELAS DUA) (colony_1950)
// ===============================================================================================================
export const buildColony1950Set = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const roadM = lam("col2Road", () => ({ map: rep(stoneHD("col2RoadHD"), 4, 4) }));
  const brickM = lam("col2Brick", () => ({ color: "#7a3232" }));
  const creamM = lam("col2Cream", () => ({ color: "#e6dac3" }));
  const roofM = lam("col2Roof", () => ({ color: "#2b323d" }));
  const barrelM = lam("col2Barrel", () => ({ color: "#8c2d38" }));
  const goldM = lam("col2Gold", () => ({ color: "#e0a84c" }));
  const steelM = lam("col2Steel", () => ({ color: "#68707a" }));
  const boardM = lam("col2Board", () => ({ map: colony1950BoardTex() }));
  const hdrM = lam("col2Hdr", () => ({
    map: headerBannerTex("SKENARIO TERBURUK: 35 TAHUN", "CERMIN KOREA (1910–1945) & MANCHUKUO", "#241722", "#ff6b6b"),
  }));
  const signRightM = lam("col2SignR", () => ({
    map: plinthSignTex("KOTA UNTUK PENGUASA", "RAKYAT TETAP KELAS DUA!", "#8c232c", "#ffd43b"),
  }));

  // Cobblestone Colonial Street Ground
  b.add(new THREE.BoxGeometry(24, 0.4, 16).translate(0, -0.2, -3.0), roadM);

  // Left-Back: Grand Colonial Clock-Tower Station Building ("Stasiun Megah Khusus Penguasa")
  b.add(new THREE.BoxGeometry(2.2, 2.35, 0.85).translate(-1.05, 1.18, -4.15), brickM);
  b.add(new THREE.BoxGeometry(2.35, 0.25, 0.95).translate(-1.05, 2.45, -4.15), roofM);
  b.add(new THREE.BoxGeometry(0.75, 1.15, 0.75).translate(-1.05, 3.05, -4.15), creamM);

  // Right-Back: Industrial Resource Extraction Warehouse & Export Barrels (Minyak, Nikel, Karet, Beras ke Tokyo)
  b.add(new THREE.BoxGeometry(1.35, 0.52, 0.85).translate(0.88, 0.26, -2.05), steelM);
  for (const dx of [-0.32, 0.0, 0.32]) {
    b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.48, 12).translate(0.88 + dx, 0.76, -2.05), barrelM);
  }
  b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.48, 12).translate(0.88 - 0.16, 1.24, -2.05), goldM);
  b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.48, 12).translate(0.88 + 0.16, 1.24, -2.05), barrelM);

  b.add(new THREE.BoxGeometry(1.68, 0.44, 0.08).translate(0, 3.36, -3.12), hdrM);
  b.add(new THREE.BoxGeometry(1.14, 1.14, 0.10).translate(-0.78, 1.98, -3.15), boardM);
  b.add(new THREE.BoxGeometry(1.02, 0.44, 0.08).translate(0.82, 2.24, -3.15), signRightM);

  b.build(g);
  return g;
};

// ===============================================================================================================
// SET 8: OUTDOOR TAMAN KOTA JAKARTA MODERN (JALUR LAYANG MRT JAKARTA, GEDUNG & MERAH PUTIH) (modern_mitra)
// ===============================================================================================================
export const buildModernMitraSet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const plazaM = lam("mod2Plaza", () => ({ map: rep(heritageTileTex(), 3, 3) }));
  const grassM = lam("mod2Grass", () => ({ map: rep(grassHD(), 5, 5) }));
  const concreteM = lam("mod2Concrete", () => ({ color: "#cfd8dc" }));
  const glassM = lam("mod2Glass", () => ({ color: "#2980b9" }));
  const towerM = lam("mod2Tower", () => ({ color: "#dce6f2" }));
  const whiteM = lam("mod2White", () => ({ color: "#ffffff" }));
  const redM = lam("mod2Red", () => ({ color: "#d9382e" }));
  const goldM = lam("mod2Gold", () => ({ color: "#ffd43b" }));
  const woodM = lam("mod2Wood", () => ({ map: beamHD() }));
  const boardM = lam("mod2Board", () => ({ map: modernMitraBoardTex() }));
  const hdrM = lam("mod2Hdr", () => ({
    map: headerBannerTex("MERDEKA & BERDIRI SEJAJAR!", "KEMITRAAN MODERN vs PENJAJAHAN KOLONIAL", "#142a38", "#2ecc71"),
  }));

  // 1. OUTDOOR SUNNY CITY PARK PLAZA + GREEN PARK LAWN
  b.add(new THREE.BoxGeometry(14, 0.4, 4.8).translate(0, -0.2, -0.2), plazaM);
  b.add(new THREE.BoxGeometry(30, 0.4, 20).translate(0, -0.22, -10.5), grassM);

  // 2. ELEVATED MRT JAKARTA / HIGH-SPEED RAIL VIADUCT BRIDGE IN THE BACKGROUND (z = -3.85, y = 1.35)
  b.add(new THREE.BoxGeometry(8.5, 0.22, 0.65).translate(0, 1.32, -3.85), concreteM);
  for (const px of [-2.4, 0.0, 2.4]) {
    b.add(new THREE.CylinderGeometry(0.18, 0.22, 1.32, 12).translate(px, 0.66, -3.85), concreteM);
  }
  // Sleek 3D MRT Train Car on the elevated viaduct (x = 0.75, y = 1.60, z = -3.80)
  b.add(new THREE.BoxGeometry(1.85, 0.36, 0.48).translate(0.75, 1.60, -3.80), whiteM);
  b.add(new THREE.BoxGeometry(1.88, 0.12, 0.50).translate(0.75, 1.64, -3.80), glassM);
  b.add(new THREE.BoxGeometry(1.88, 0.06, 0.50).translate(0.75, 1.46, -3.80), redM);

  // 3. MODERN JAKARTA SKYSCRAPER TOWERS IN THE SKYLINE (z = -6.2)
  b.add(new THREE.BoxGeometry(1.35, 3.8, 0.95).translate(-1.95, 1.9, -6.2), towerM);
  b.add(new THREE.BoxGeometry(1.15, 3.5, 1.00).translate(-1.95, 1.9, -6.2), glassM);
  b.add(new THREE.BoxGeometry(1.25, 3.4, 0.95).translate(2.15, 1.7, -6.4), towerM);
  b.add(new THREE.BoxGeometry(1.05, 3.1, 1.00).translate(2.15, 1.7, -6.4), glassM);

  // 4. SOVEREIGN MERAH PUTIH FLAGPOLE MONUMENT ON THE RIGHT PARK PLAZA (x = +0.92, z = -2.05)
  b.add(new THREE.BoxGeometry(0.85, 0.52, 0.85).translate(0.92, 0.26, -2.05), concreteM);
  b.add(new THREE.BoxGeometry(0.92, 0.08, 0.92).translate(0.92, 0.54, -2.05), goldM);
  b.add(new THREE.CylinderGeometry(0.035, 0.04, 2.35, 10).translate(1.15, 1.72, -2.05), woodM);
  b.add(new THREE.BoxGeometry(0.64, 0.22, 0.04).translate(0.80, 2.66, -2.05), redM);
  b.add(new THREE.BoxGeometry(0.64, 0.22, 0.04).translate(0.80, 2.44, -2.05), whiteM);

  // 5. COMPARISON BOARD ON LEFT PARK STAND & TOP HEADER BANNER
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8).translate(-0.78, 1.1, -3.20), concreteM);
  b.add(new THREE.BoxGeometry(1.14, 1.14, 0.10).translate(-0.78, 1.98, -3.15), boardM);
  b.add(new THREE.BoxGeometry(1.68, 0.44, 0.08).translate(0, 3.36, -3.12), hdrM);

  // Park trees & sunny clouds
  addTree(b, -3.2, 0, -4.8, 3.8, 71);
  addTree(b, 3.2, 0, -4.8, 3.9, 83);
  addClouds(b, 4.5, -9.2);

  b.build(g);
  return g;
};
