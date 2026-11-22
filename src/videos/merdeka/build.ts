// Procedural 3D sets & props for "Alasan Indonesia Merdeka yang Sekolah Tidak Ajarkan" (1945–1949)
// Built on the two-tone Lambert + InkPass + hand-painted Canvas2D texture pipeline.
// Layout guarantees zero blocked text:
// - Characters occupy y = 0..1.72m in front of desks (no text on low desk fronts behind torsos)
// - Left & Right Wall Boards / Props occupy y = 1.30..2.42m at x = -0.74 and x = +0.76
// - Floating 2D Comic Badge occupies y = 2.54m at x = 0
// - Overhead Header Banner occupies y = 3.36m at x = 0 (width 1.68m, inside 9:16 safe margin)
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng, ctex, rep, grassHD, stoneHD, planksHD, beamHD } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";

export type Kit = Record<string, THREE.Object3D>;
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------- materials (shared, cached, all two-tone shaded) ----------------
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

// ---------------- cartoon trees ----------------
const LEAF = ["#5aa83c", "#4c9a37", "#69b545", "#55a243", "#3f8f3c"];
const leafTex = (i: number) => ctex("leafM" + i, 256, 128, (g) => {
  const base = new THREE.Color(LEAF[i % LEAF.length]), top = base.clone().offsetHSL(0.01, 0.03, 0.08), bot = base.clone().offsetHSL(-0.01, 0, -0.08);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#" + top.getHexString()); gr.addColorStop(0.5, "#" + base.getHexString()); gr.addColorStop(1, "#" + bot.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
});
const leafMat = (i: number) => lam("leafM" + i, () => ({ map: leafTex(i) }));
const barkMat = () => lam("barkM", () => ({ color: "#8f5d3b" }));
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

/** Helper to draw auto-fitted text inside Canvas2D textures so it never clips */
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
  while (g.measureText(text).width > maxW && sz > 14) {
    sz -= 2;
    g.font = `${weight} ${sz}px ${family}`;
  }
  g.fillText(text, cx, cy);
};

// ---------------- Hand-Painted Custom Canvas2D Textures ----------------

/** Heritage 1945 Colonial Cream & Terracotta Tile Floor */
export const heritageTileTex = () => ctex("merdekaHeritageTileHD", 1024, 1024, (g) => {
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

/** Weathered Warehouse Concrete & Crate Grid Floor for Don Bosco Armory */
export const armoryFloorTex = () => ctex("merdekaArmoryFloorHD", 1024, 1024, (g) => {
  g.fillStyle = "#2b2d34"; g.fillRect(0, 0, 1024, 1024);
  const N = 4, T = 1024 / N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x * T, py = y * T;
    g.fillStyle = (x + y) % 2 === 0 ? "#383b44" : "#31343d";
    g.fillRect(px + 6, py + 6, T - 12, T - 12);
    g.strokeStyle = "#565a66";
    g.lineWidth = 4;
    g.strokeRect(px + 6, py + 6, T - 12, T - 12);
  }
});

/** Warm patterned rug for Command Office, Rengasdengklok & KMB Hall */
export const rugTex = (baseCol = "#8f2d38", trimCol = "#e0a84c") => ctex("merdekaRug_" + baseCol, 512, 512, (g) => {
  g.fillStyle = baseCol; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = trimCol; g.lineWidth = 18;
  g.strokeRect(28, 28, 456, 456);
  g.strokeStyle = "#fff5dc"; g.lineWidth = 6;
  g.strokeRect(54, 54, 404, 404);
  g.fillStyle = trimCol;
  g.beginPath(); g.ellipse(256, 256, 135, 90, 0, 0, Math.PI * 2); g.fill();
});

/** Decorative Desk Front Panel (recessed molding + brass emblem, no text to get blocked by character legs/torsos) */
export const deskPanelTex = (bg: string, trim: string) =>
  ctex("merdekaPanel_" + bg + trim, 512, 256, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = "#241726"; g.lineWidth = 14;
    g.strokeRect(8, 8, 496, 240);
    g.strokeStyle = trim; g.lineWidth = 10;
    g.strokeRect(28, 28, 456, 200);
    g.fillStyle = trim;
    g.beginPath(); g.arc(256, 128, 36, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#241726"; g.lineWidth = 6; g.stroke();
  });

/** Elevated Signboard texture (mounted above character heads so 100% of text is always readable) */
export const plinthSignTex = (title: string, sub: string, bg: string, badgeCol: string) =>
  ctex("merdekaSign_" + title + sub, 512, 256, (g) => {
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

/** Overhead Banner Texture (compact width = 1.68m so it NEVER clips 9:16 edges) */
export const headerBannerTex = (line1: string, line2: string, bg: string, topCol: string) =>
  ctex("merdekaHdr_" + line1, 1024, 256, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
    g.strokeStyle = "#241726"; g.lineWidth = 16;
    g.strokeRect(12, 12, 1000, 232);
    g.fillStyle = topCol; g.textAlign = "center";
    fitText(g, line1, 512, 110, 940, 66);
    g.fillStyle = "#ffffff";
    fitText(g, line2, 512, 196, 940, 46);
  });

/** Board 1: 15 Agustus 1945 Surrender Radio & Status Quo Map */
export const surrenderBoardTex = () => ctex("surrenderBoardHD3", 768, 768, (g) => {
  g.fillStyle = "#261c18"; g.fillRect(0, 0, 768, 768);
  g.strokeStyle = "#e0a84c"; g.lineWidth = 16;
  g.strokeRect(12, 12, 744, 744);
  g.fillStyle = "#c0392b";
  g.fillRect(36, 36, 696, 130);
  g.strokeStyle = "#241726"; g.lineWidth = 8;
  g.strokeRect(36, 36, 696, 130);
  g.fillStyle = "#ffe66d"; g.textAlign = "center";
  fitText(g, "15 AGUSTUS 1945", 384, 122, 650, 62);

  g.fillStyle = "#fff8eb";
  g.fillRect(56, 195, 656, 345);
  g.strokeRect(56, 195, 656, 345);
  g.fillStyle = "#d9382e";
  g.beginPath(); g.arc(215, 368, 76, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = "#241726"; g.lineWidth = 16;
  g.beginPath(); g.moveTo(145, 298); g.lineTo(285, 438); g.stroke();
  g.beginPath(); g.moveTo(285, 298); g.lineTo(145, 438); g.stroke();

  g.fillStyle = "#241726"; g.textAlign = "center";
  fitText(g, "JEPANG MENYERAH!", 500, 325, 360, 42);
  fitText(g, "SEKUTU BELUM TIBA", 500, 392, 360, 36);
  g.fillStyle = "#c0392b";
  fitText(g, "VACUUM OF POWER", 500, 462, 360, 38);

  g.fillStyle = "#ffe66d";
  g.fillRect(56, 575, 656, 140);
  g.strokeRect(56, 575, 656, 140);
  g.fillStyle = "#241726"; g.textAlign = "center";
  fitText(g, "STATUS QUO • TANPA PENGUASA", 384, 662, 620, 46);
});

/** Board 2: PETA & Heiho 1943 Tactical Chalkboard */
export const petaBoardTex = () => ctex("petaBoardHD3", 768, 768, (g) => {
  g.fillStyle = "#1b3a2b"; g.fillRect(0, 0, 768, 768);
  g.strokeStyle = "#c89b52"; g.lineWidth = 18;
  g.strokeRect(12, 12, 744, 744);

  g.fillStyle = "#2ecc71";
  g.fillRect(36, 36, 696, 126);
  g.strokeStyle = "#241726"; g.lineWidth = 8;
  g.strokeRect(36, 36, 696, 126);
  g.fillStyle = "#241726"; g.textAlign = "center";
  fitText(g, "PETA & HEIHO (1943)", 384, 118, 650, 58);

  const rows = [
    ["PETA (69 BATALYON)", "38.000+ PRAJURIT", "#ffe66d"],
    ["HEIHO (MILITER)", "42.000+ PEMUDA", "#70e8ff"],
    ["STRUKTUR KOMANDO", "SIAP ORGANISASI!", "#2ecc71"],
  ] as const;
  rows.forEach(([title, val, col], idx) => {
    const y = 195 + idx * 175;
    g.fillStyle = "rgba(255,255,255,0.09)";
    g.fillRect(48, y, 672, 148);
    g.strokeStyle = col; g.lineWidth = 6;
    g.strokeRect(48, y, 672, 148);
    g.fillStyle = "#ffffff"; g.textAlign = "center";
    fitText(g, title, 384, y + 60, 620, 40);
    g.fillStyle = col;
    fitText(g, val, 384, y + 118, 620, 44);
  });
});

/** Board 3: Naskah Proklamasi & Rengasdengklok 16-17 Agustus 1945 */
export const proklamasiBoardTex = () => ctex("proklamasiBoardHD3", 768, 768, (g) => {
  g.fillStyle = "#fff9eb"; g.fillRect(0, 0, 768, 768);
  g.strokeStyle = "#8c2d38"; g.lineWidth = 16;
  g.strokeRect(12, 12, 744, 744);

  g.fillStyle = "#d9382e";
  g.fillRect(36, 36, 696, 130);
  g.strokeStyle = "#241726"; g.lineWidth = 8;
  g.strokeRect(36, 36, 696, 130);
  g.fillStyle = "#ffffff"; g.textAlign = "center";
  fitText(g, "PROKLAMASI", 384, 122, 640, 64);

  g.fillStyle = "#241726";
  fitText(g, "KAMI BANGSA INDONESIA", 384, 245, 640, 42);
  fitText(g, "DENGAN INI MENYATAKAN", 384, 305, 640, 42);
  g.fillStyle = "#c0392b";
  fitText(g, "KEMERDEKAAN INDONESIA", 384, 372, 640, 48);

  g.fillStyle = "#ffe66d";
  g.fillRect(56, 430, 656, 135);
  g.strokeRect(56, 430, 656, 135);
  g.fillStyle = "#241726";
  fitText(g, "16 AGUSTUS: RENGASDENGKLOK", 384, 488, 620, 38);
  fitText(g, "17 AGUSTUS 1945: MERDEKA!", 384, 540, 620, 40);

  g.fillStyle = "#1f5a4c";
  fitText(g, "SOEKARNO - HATTA", 384, 665, 620, 50);
});

/** Board 4: Gudang Senjata Don Bosco Surabaya & Lahirnya TNI 5 Oktober 1945 */
export const armoryBoardTex = () => ctex("armoryBoardHD3", 768, 768, (g) => {
  g.fillStyle = "#1e242b"; g.fillRect(0, 0, 768, 768);
  g.strokeStyle = "#e0a84c"; g.lineWidth = 16;
  g.strokeRect(12, 12, 744, 744);

  g.fillStyle = "#c0392b";
  g.fillRect(36, 36, 696, 130);
  g.strokeStyle = "#241726"; g.lineWidth = 8;
  g.strokeRect(36, 36, 696, 130);
  g.fillStyle = "#ffe66d"; g.textAlign = "center";
  fitText(g, "1 - 5 OKTOBER 1945", 384, 122, 650, 58);

  g.fillStyle = "#2c3540";
  g.fillRect(48, 200, 672, 240);
  g.strokeStyle = "#ffe66d"; g.lineWidth = 8;
  g.strokeRect(48, 200, 672, 240);
  g.fillStyle = "#ffffff";
  fitText(g, "GUDANG DON BOSCO", 384, 285, 620, 48);
  g.fillStyle = "#2ecc71";
  fitText(g, "SENJATA JEPANG DIREBUT!", 384, 365, 620, 44);

  g.fillStyle = "#ffe66d";
  g.fillRect(48, 475, 672, 230);
  g.strokeStyle = "#241726"; g.lineWidth = 8;
  g.strokeRect(48, 475, 672, 230);
  g.fillStyle = "#241726";
  fitText(g, "EKS PETA + HEIHO → BKR", 384, 558, 620, 44);
  g.fillStyle = "#c0392b";
  fitText(g, "RESMI JADI TNI (5 OKT 1945)", 384, 645, 620, 46);
});

/** Board 5: Perjuangan 4,5 Tahun & KMB 27 Desember 1949 */
export const kmbBoardTex = () => ctex("kmbBoardHD3", 768, 768, (g) => {
  g.fillStyle = "#162a3a"; g.fillRect(0, 0, 768, 768);
  g.strokeStyle = "#ffd43b"; g.lineWidth = 16;
  g.strokeRect(12, 12, 744, 744);

  g.fillStyle = "#1f5a4c";
  g.fillRect(36, 36, 696, 130);
  g.strokeStyle = "#241726"; g.lineWidth = 8;
  g.strokeRect(36, 36, 696, 130);
  g.fillStyle = "#ffe66d"; g.textAlign = "center";
  fitText(g, "PERJUANGAN 4,5 TAHUN", 384, 120, 650, 56);

  const steps = [
    ["1945–1949", "PERANG PERTAHANKAN RI", "#ff6b6b"],
    ["DIPLOMASI", "LINGGARJATI • RENVILLE • ROEM-ROYEN", "#70e8ff"],
    ["27 DES 1949", "KMB: BELANDA AKUI RESMI!", "#2ecc71"],
  ] as const;
  steps.forEach(([yr, desc, col], idx) => {
    const y = 195 + idx * 175;
    g.fillStyle = "#1f384d";
    g.fillRect(48, y, 672, 148);
    g.strokeStyle = col; g.lineWidth = 7;
    g.strokeRect(48, y, 672, 148);
    g.fillStyle = col;
    fitText(g, yr, 384, y + 62, 620, 44);
    g.fillStyle = "#ffffff";
    fitText(g, desc, 384, y + 118, 620, 36);
  });
});

/** Symbolic Wooden Door with Giant Golden Keyhole Texture */
export const doorKeyholeTex = () => ctex("doorKeyholeHD3", 512, 1024, (g) => {
  g.fillStyle = "#5c3317"; g.fillRect(0, 0, 512, 1024);
  g.strokeStyle = "#e0a84c"; g.lineWidth = 20;
  g.strokeRect(16, 16, 480, 992);
  g.fillStyle = "#47250e";
  g.fillRect(56, 64, 400, 360);
  g.strokeRect(56, 64, 400, 360);
  g.fillRect(56, 580, 400, 360);
  g.strokeRect(56, 580, 400, 360);

  g.fillStyle = "#ffd43b";
  g.strokeStyle = "#241726"; g.lineWidth = 12;
  g.beginPath(); g.roundRect(166, 410, 180, 210, 28); g.fill(); g.stroke();
  g.fillStyle = "#241726";
  g.beginPath(); g.arc(256, 485, 34, 0, Math.PI * 2); g.fill();
  g.beginPath();
  g.moveTo(234, 495); g.lineTo(278, 495); g.lineTo(292, 585); g.lineTo(220, 585);
  g.closePath(); g.fill();

  g.fillStyle = "#ffe66d"; g.textAlign = "center";
  fitText(g, "PINTU MERDEKA", 256, 155, 360, 48);
  g.fillStyle = "#ffffff";
  fitText(g, "KUNCI DI PINTU", 256, 230, 360, 38);
});

// ===============================================================================================================
// HERO SET 1: MARKAS KOMANDO JEPANG 15 AGUSTUS 1945 — KEKOSONGAN KEKUASAAN & STATUS QUO
// ===============================================================================================================
export const buildVacuumSet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const floorM = lam("vacFloor", () => ({ map: rep(planksHD(), 3, 3) }));
  const wallM = lam("vacWall", () => ({ color: "#e8dcc4" }));
  const woodM = lam("vacWood", () => ({ map: beamHD() }));
  const rugM = lam("vacRug", () => ({ map: rugTex("#7a232b", "#d9a441") }));
  const brassM = lam("vacBrass", () => ({ color: "#e0a84c" }));
  const radioBodyM = lam("vacRadio", () => ({ color: "#4a2c18" }));
  const radioDialM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.7), fog: false });
  const whiteFlagM = lam("vacWhiteFlag", () => ({ color: "#f5f5f0" }));
  const boardM = lam("vacBoard3", () => ({ map: surrenderBoardTex() }));
  const hdrM = lam("vacHdr", () => ({
    map: headerBannerTex("15 AGUSTUS 1945", "JEPANG MENYERAH • VACUUM OF POWER", "#241726", "#ffd43b"),
  }));
  const panelLeftM = lam("vacPanelL", () => ({ map: deskPanelTex("#7a232b", "#e0a84c") }));
  const panelRightM = lam("vacPanelR", () => ({ map: deskPanelTex("#1e272e", "#e0a84c") }));
  const signRightM = lam("vacSignR", () => ({
    map: plinthSignTex("STATUS QUO", "NEGERI TANPA PENGUASA", "#1e272e", "#70e8ff"),
  }));

  // Floor & Carpet
  b.add(new THREE.BoxGeometry(20, 0.4, 12).translate(0, -0.2, -1.0), floorM);
  b.add(new THREE.BoxGeometry(3.8, 0.03, 2.5).translate(0, 0.015, -1.05), rugM);

  // Back Colonial Wall & Wainscoting (z = -3.5)
  b.add(new THREE.BoxGeometry(14, 4.6, 0.28).translate(0, 2.3, -3.55), wallM);
  b.add(new THREE.BoxGeometry(14, 1.15, 0.34).translate(0, 0.58, -3.52), woodM);
  for (const px of [-2.3, 2.3]) {
    b.add(new THREE.BoxGeometry(0.26, 4.6, 0.38).translate(px, 2.3, -3.48), woodM);
  }

  // Overhead Header Banner (y = 3.36) & Surrender Board on Back-Left Wall (x = -0.78, y = 1.84, size 1.12x1.12)
  b.add(new THREE.BoxGeometry(1.68, 0.44, 0.08).translate(0, 3.36, -3.12), hdrM);
  b.add(new THREE.BoxGeometry(1.12, 1.12, 0.10).translate(-0.78, 1.84, -3.34), boardM);

  // ---- LEFT STATION: 1945 PHILIPS RADIO RECEIVER DESK (x = -0.82, z = -2.05) ----
  const lx = -0.82, lz = -2.05;
  b.add(new THREE.BoxGeometry(1.12, 0.80, 0.74).translate(lx, 0.40, lz), woodM);
  b.add(new THREE.BoxGeometry(1.20, 0.08, 0.82).translate(lx, 0.84, lz), brassM);
  b.add(new THREE.BoxGeometry(0.96, 0.42, 0.06).translate(lx, 0.42, lz + 0.39), panelLeftM);
  b.add(new THREE.BoxGeometry(0.46, 0.48, 0.30).translate(lx, 1.10, lz), radioBodyM);
  b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8).translate(lx - 0.16, 1.45, lz), brassM);

  // ---- RIGHT STATION: EMPTY IMPERIAL COMMAND DESK & WHITE SURRENDER FLAG (x = 0.82, z = -2.05) ----
  const rx = 0.82, rz = -2.05;
  b.add(new THREE.BoxGeometry(1.12, 0.80, 0.74).translate(rx, 0.40, rz), woodM);
  b.add(new THREE.BoxGeometry(1.20, 0.08, 0.82).translate(rx, 0.84, rz), brassM);
  b.add(new THREE.BoxGeometry(0.96, 0.42, 0.06).translate(rx, 0.42, rz + 0.39), panelRightM);
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.25, 10).translate(rx - 0.22, 1.48, rz), brassM);
  b.add(new THREE.BoxGeometry(0.54, 0.36, 0.04).translate(rx + 0.06, 1.90, rz), whiteFlagM);
  b.add(new THREE.BoxGeometry(1.02, 0.44, 0.08).translate(0.80, 2.28, -3.34), signRightM);

  b.build(g);

  const dial = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.04), radioDialM);
  dial.position.set(lx, 1.12, lz + 0.16);
  dial.layers.set(NOINK);
  g.add(dial);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 10),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 0.9), fog: false })
  );
  bulb.position.set(0, 2.92, -1.95);
  bulb.layers.set(NOINK);
  g.add(bulb);

  return g;
};

// ===============================================================================================================
// HERO SET 2: KAMP PELATIHAN MILITER PETA & HEIHO 1943 — 38.000+ PEMUDA TERLATIH
// ===============================================================================================================
export const buildPetaSet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const grassM = lam("petaGrass", () => ({ map: rep(grassHD(), 4, 4) }));
  const stoneM = lam("petaStone", () => ({ map: rep(stoneHD("petaParadeHD"), 3, 2) }));
  const woodM = lam("petaWood", () => ({ map: beamHD() }));
  const oliveM = lam("petaOlive", () => ({ color: "#48633b" }));
  const sandbagM = lam("petaSand", () => ({ color: "#c2a878" }));
  const steelM = lam("petaSteel", () => ({ color: "#68707a" }));
  const boardM = lam("petaBoard3", () => ({ map: petaBoardTex() }));
  const hdrM = lam("petaHdr", () => ({
    map: headerBannerTex("PELATIHAN PETA & HEIHO", "1943 • PULUHAN RIBU PEMUDA", "#1b3a2b", "#ffd43b"),
  }));
  const panelLeftM = lam("petaPanelL", () => ({ map: deskPanelTex("#1b3a2b", "#2ecc71") }));
  const panelRightM = lam("petaPanelR", () => ({ map: deskPanelTex("#2c3e50", "#e0a84c") }));
  const signRightM = lam("petaSignR", () => ({
    map: plinthSignTex("HEIHO & PASUKAN", "BUKAN MULAI DARI NOL!", "#2c3e50", "#ffd43b"),
  }));

  // Parade Stone Courtyard Foreground + Grass Training Field
  b.add(new THREE.BoxGeometry(16, 0.4, 7.5).translate(0, -0.2, 0.5), stoneM);
  b.add(new THREE.BoxGeometry(28, 0.4, 18).translate(0, -0.22, -10.0), grassM);

  // Wooden Camp Archway & Compact Overhead Banner (y = 3.36)
  b.add(new THREE.BoxGeometry(0.18, 3.75, 0.18).translate(-1.85, 1.88, -3.20), woodM);
  b.add(new THREE.BoxGeometry(0.18, 3.75, 0.18).translate(1.85, 1.88, -3.20), woodM);
  b.add(new THREE.BoxGeometry(3.95, 0.18, 0.22).translate(0, 3.68, -3.20), woodM);
  b.add(new THREE.BoxGeometry(1.68, 0.44, 0.08).translate(0, 3.36, -3.12), hdrM);

  // PETA Tactical Chalkboard on Back-Left (x = -0.78, y = 1.84, size 1.12x1.12)
  b.add(new THREE.BoxGeometry(1.12, 1.12, 0.10).translate(-0.78, 1.84, -3.18), boardM);
  // Elevated Right Banner above Rifle Rack (x = 0.80, y = 2.22, z = -3.18)
  b.add(new THREE.BoxGeometry(1.02, 0.44, 0.08).translate(0.80, 2.22, -3.18), signRightM);

  // ---- LEFT STATION: TACTICAL SANDBAG PARAPET & COMMAND PODIUM (x = -0.82, z = -2.10) ----
  const lx = -0.82, lz = -2.10;
  b.add(new THREE.BoxGeometry(1.16, 0.72, 0.74).translate(lx, 0.36, lz), oliveM);
  b.add(new THREE.BoxGeometry(0.96, 0.42, 0.06).translate(lx, 0.38, lz + 0.39), panelLeftM);
  for (let row = 0; row < 2; row++) {
    for (let col = -1; col <= 1; col++) {
      b.add(new THREE.BoxGeometry(0.34, 0.15, 0.24).translate(lx + col * 0.36, 0.78 + row * 0.15, lz), sandbagM);
    }
  }

  // ---- RIGHT STATION: WOODEN RIFLE RACK & DRILL CRATE (x = 0.82, z = -2.10) ----
  const rx = 0.82, rz = -2.10;
  b.add(new THREE.BoxGeometry(1.16, 0.72, 0.74).translate(rx, 0.36, rz), woodM);
  b.add(new THREE.BoxGeometry(0.96, 0.42, 0.06).translate(rx, 0.38, rz + 0.39), panelRightM);
  for (const dx of [-0.32, -0.10, 0.12, 0.34]) {
    b.add(new THREE.CylinderGeometry(0.025, 0.035, 0.82, 8).translate(rx + dx, 1.12, rz), woodM);
    b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8).translate(rx + dx, 1.40, rz), steelM);
  }

  // Background Trees
  addTree(b, -3.2, 0, -5.2, 3.8, 11);
  addTree(b, 3.2, 0, -5.0, 4.0, 23);
  addTree(b, -4.5, 0, -8.0, 4.5, 37);
  addTree(b, 4.5, 0, -8.2, 4.4, 49);

  b.build(g);
  return g;
};

// ===============================================================================================================
// HERO SET 3: RUMAH RENGASDENGKLOK & PANGGUNG PROKLAMASI (16–17 AGUSTUS 1945)
// ===============================================================================================================
export const buildRengasSet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const floorM = lam("renFloor", () => ({ map: rep(heritageTileTex(), 3, 3) }));
  const wallM = lam("renWall", () => ({ color: "#f4ebd9" }));
  const brickM = lam("renBrick", () => ({ color: "#9e4736" }));
  const woodM = lam("renWood", () => ({ map: beamHD() }));
  const redFlagM = lam("renRedFlag", () => ({ color: "#d9382e" }));
  const whiteFlagM = lam("renWhiteFlag", () => ({ color: "#ffffff" }));
  const chromeM = lam("renChrome", () => ({ color: "#d0d8e0" }));
  const darkMetalM = lam("renDarkMetal", () => ({ color: "#2b303a" }));
  const boardM = lam("renBoard3", () => ({ map: proklamasiBoardTex() }));
  const hdrM = lam("renHdr", () => ({
    map: headerBannerTex("16 - 17 AGUSTUS 1945", "RENGASDENGKLOK → PROKLAMASI", "#8c2d38", "#ffd43b"),
  }));
  const panelLeftM = lam("renPanelL", () => ({ map: deskPanelTex("#2c3e50", "#e0a84c") }));
  const panelRightM = lam("renPanelR", () => ({ map: deskPanelTex("#8c2d38", "#e0a84c") }));

  // Heritage Tile Floor
  b.add(new THREE.BoxGeometry(20, 0.4, 12).translate(0, -0.2, -1.0), floorM);

  // Back Veranda Wall & Pillars
  b.add(new THREE.BoxGeometry(14, 4.6, 0.28).translate(0, 2.3, -3.55), wallM);
  b.add(new THREE.BoxGeometry(14, 0.95, 0.34).translate(0, 0.48, -3.50), brickM);
  for (const px of [-2.3, 2.3]) {
    b.add(new THREE.BoxGeometry(0.32, 4.6, 0.38).translate(px, 2.3, -3.45), woodM);
  }

  // Overhead Header Banner (y = 3.36) & Proklamasi Board on Back-Left Wall (x = -0.78, y = 1.84, size 1.12x1.12)
  b.add(new THREE.BoxGeometry(1.68, 0.44, 0.08).translate(0, 3.36, -3.12), hdrM);
  b.add(new THREE.BoxGeometry(1.12, 1.12, 0.10).translate(-0.78, 1.84, -3.34), boardM);

  // ---- LEFT STATION: RENGASDENGKLOK TYPEWRITER & DRAFTING DESK (x = -0.82, z = -2.05) ----
  const lx = -0.82, lz = -2.05;
  b.add(new THREE.BoxGeometry(1.12, 0.78, 0.74).translate(lx, 0.39, lz), woodM);
  b.add(new THREE.BoxGeometry(0.96, 0.42, 0.06).translate(lx, 0.40, lz + 0.39), panelLeftM);
  b.add(new THREE.BoxGeometry(0.42, 0.22, 0.34).translate(lx, 0.90, lz), darkMetalM);
  b.add(new THREE.BoxGeometry(0.28, 0.26, 0.03).translate(lx, 1.10, lz - 0.06), whiteFlagM);

  // ---- RIGHT STATION: PROKLAMASI MICROPHONE & MERAH PUTIH FLAGPOLE (x = 0.82, z = -2.05) ----
  const rx = 0.82, rz = -2.05;
  b.add(new THREE.BoxGeometry(1.12, 0.78, 0.74).translate(rx, 0.39, rz), woodM);
  b.add(new THREE.BoxGeometry(0.96, 0.42, 0.06).translate(rx, 0.40, rz + 0.39), panelRightM);
  b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.78, 8).translate(rx - 0.22, 1.18, rz + 0.10), chromeM);
  b.add(new THREE.SphereGeometry(0.08, 10, 10).translate(rx - 0.22, 1.58, rz + 0.10), chromeM);
  // Tall Bamboo Flagpole at x = +1.15, Merah Putih flag at x = +0.82 (clear of central badge!)
  b.add(new THREE.CylinderGeometry(0.035, 0.04, 2.25, 10).translate(1.15, 1.90, rz - 0.10), woodM);
  b.add(new THREE.BoxGeometry(0.62, 0.22, 0.04).translate(0.82, 2.66, rz - 0.10), redFlagM);
  b.add(new THREE.BoxGeometry(0.62, 0.22, 0.04).translate(0.82, 2.44, rz - 0.10), whiteFlagM);

  b.build(g);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 10),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.0, 1.0), fog: false })
  );
  bulb.position.set(0, 2.92, -1.95);
  bulb.layers.set(NOINK);
  g.add(bulb);

  return g;
};

// ===============================================================================================================
// HERO SET 4: GUDANG SENJATA DON BOSCO SURABAYA & LAHIRNYA TNI (1–5 OKTOBER 1945)
// ===============================================================================================================
export const buildArmorySet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const floorM = lam("armFloor", () => ({ map: rep(armoryFloorTex(), 3, 3) }));
  const wallM = lam("armWall", () => ({ color: "#3d3532" }));
  const crateM = lam("armCrate", () => ({ color: "#6e5233" }));
  const oliveM = lam("armOlive", () => ({ color: "#425936" }));
  const steelM = lam("armSteel", () => ({ color: "#7f8c8d" }));
  const goldM = lam("armGold", () => ({ color: "#e0a84c" }));
  const redM = lam("armRed", () => ({ color: "#c0392b" }));
  const whiteM = lam("armWhite", () => ({ color: "#f5f6fa" }));
  const boardM = lam("armBoard3", () => ({ map: armoryBoardTex() }));
  const hdrM = lam("armHdr", () => ({
    map: headerBannerTex("OKTOBER 1945 • SURABAYA", "GUDANG DON BOSCO & LAHIRNYA TNI", "#1e272e", "#ffd43b"),
  }));
  const panelLeftM = lam("armPanelL", () => ({ map: deskPanelTex("#3d3532", "#e0a84c") }));
  const panelRightM = lam("armPanelR", () => ({ map: deskPanelTex("#1b3a2b", "#e0a84c") }));
  const signRightM = lam("armSignR", () => ({
    map: plinthSignTex("5 OKTOBER 1945", "RESMI CIKAL BAKAL TNI", "#1b3a2b", "#2ecc71"),
  }));

  // Armory Concrete Floor & Brick Warehouse Wall
  b.add(new THREE.BoxGeometry(20, 0.4, 12).translate(0, -0.2, -1.0), floorM);
  b.add(new THREE.BoxGeometry(14, 4.6, 0.30).translate(0, 2.3, -3.55), wallM);
  for (const px of [-2.2, 2.2]) {
    b.add(new THREE.BoxGeometry(0.28, 4.6, 0.40).translate(px, 2.3, -3.45), steelM);
  }

  // Overhead Header Banner (y = 3.36) & Armory Board on Back-Left Wall (x = -0.78, y = 1.92, size 1.12x1.12)
  b.add(new THREE.BoxGeometry(1.68, 0.44, 0.08).translate(0, 3.36, -3.12), hdrM);
  b.add(new THREE.BoxGeometry(1.12, 1.12, 0.10).translate(-0.78, 1.92, -3.34), boardM);
  // Elevated TNI Signboard on Back-Right Wall (x = 0.80, y = 2.22)
  b.add(new THREE.BoxGeometry(1.02, 0.44, 0.08).translate(0.80, 2.22, -3.34), signRightM);

  // ---- LEFT STATION: STACKED DON BOSCO AMMUNITION CRATES (x = -0.82, z = -2.08) ----
  const lx = -0.82, lz = -2.08;
  b.add(new THREE.BoxGeometry(1.16, 0.76, 0.78).translate(lx, 0.38, lz), crateM);
  b.add(new THREE.BoxGeometry(0.96, 0.42, 0.06).translate(lx, 0.40, lz + 0.41), panelLeftM);
  b.add(new THREE.BoxGeometry(0.50, 0.36, 0.48).translate(lx - 0.25, 0.94, lz), oliveM);
  b.add(new THREE.BoxGeometry(0.50, 0.36, 0.48).translate(lx + 0.26, 0.94, lz), crateM);

  // ---- RIGHT STATION: 5 OKTOBER 1945 TNI COMMAND PODIUM & INSIGNIA (x = 0.82, z = -2.08) ----
  const rx = 0.82, rz = -2.08;
  b.add(new THREE.BoxGeometry(1.16, 0.76, 0.78).translate(rx, 0.38, rz), oliveM);
  b.add(new THREE.BoxGeometry(1.22, 0.08, 0.84).translate(rx, 0.79, rz), goldM);
  b.add(new THREE.BoxGeometry(0.96, 0.42, 0.06).translate(rx, 0.40, rz + 0.41), panelRightM);
  b.add(new THREE.BoxGeometry(0.58, 0.36, 0.16).translate(rx, 1.22, rz), redM);
  b.add(new THREE.BoxGeometry(0.58, 0.36, 0.16).translate(rx, 0.96, rz), whiteM);
  b.add(new THREE.CylinderGeometry(0.18, 0.18, 0.10, 12).rotateX(Math.PI / 2).translate(rx, 1.14, rz + 0.08), goldM);

  b.build(g);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 10),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.7), fog: false })
  );
  bulb.position.set(0, 2.92, -1.95);
  bulb.layers.set(NOINK);
  g.add(bulb);

  return g;
};

// ===============================================================================================================
// HERO SET 5: MEJA KMB 27 DESEMBER 1949 & PINTU KUNCI KEMERDEKAAN (1945–1949)
// ===============================================================================================================
export const buildKmbSet = () => {
  const g = new THREE.Group();
  const b = new Batch();

  const floorM = lam("kmbFloor", () => ({ map: rep(heritageTileTex(), 3, 3) }));
  const wallM = lam("kmbWall", () => ({ color: "#1d3142" }));
  const rugM = lam("kmbRug", () => ({ map: rugTex("#8c232c", "#ffd43b") }));
  const woodM = lam("kmbWood", () => ({ map: beamHD() }));
  const greenFeltM = lam("kmbFelt", () => ({ color: "#1e6b4e" }));
  const goldM = lam("kmbGold", () => ({ color: "#ffd43b" }));
  const doorM = lam("kmbDoor3", () => ({ map: doorKeyholeTex() }));
  const boardM = lam("kmbBoard3", () => ({ map: kmbBoardTex() }));
  const hdrM = lam("kmbHdr", () => ({
    map: headerBannerTex("27 DESEMBER 1949 • KMB", "KUNCI KEMERDEKAAN INDONESIA", "#162a3a", "#ffd43b"),
  }));
  const panelLeftM = lam("kmbPanelL", () => ({ map: deskPanelTex("#1e6b4e", "#ffd43b") }));
  const panelRightM = lam("kmbPanelR", () => ({ map: deskPanelTex("#5c3317", "#ffd43b") }));

  // Floor & Royal Carpet
  b.add(new THREE.BoxGeometry(20, 0.4, 12).translate(0, -0.2, -1.0), floorM);
  b.add(new THREE.BoxGeometry(4.0, 0.03, 2.6).translate(0, 0.015, -1.05), rugM);

  // Back Hall Wall & Golden Pillars
  b.add(new THREE.BoxGeometry(14, 4.6, 0.28).translate(0, 2.3, -3.55), wallM);
  for (const px of [-2.35, 2.35]) {
    b.add(new THREE.CylinderGeometry(0.18, 0.20, 4.5, 12).translate(px, 2.25, -3.38), goldM);
  }

  // Overhead Header Banner (y = 3.36) & 4.5-Year Struggle Board on Back-Left Wall (x = -0.78, y = 1.84, size 1.12x1.12)
  b.add(new THREE.BoxGeometry(1.68, 0.44, 0.08).translate(0, 3.36, -3.12), hdrM);
  b.add(new THREE.BoxGeometry(1.12, 1.12, 0.10).translate(-0.78, 1.84, -3.34), boardM);

  // ---- LEFT STATION: KONFERENSI MEJA BUNDAR (KMB) TREATY TABLE (x = -0.82, z = -2.08) ----
  const lx = -0.82, lz = -2.08;
  b.add(new THREE.BoxGeometry(1.16, 0.78, 0.76).translate(lx, 0.39, lz), greenFeltM);
  b.add(new THREE.BoxGeometry(1.22, 0.08, 0.82).translate(lx, 0.81, lz), goldM);
  b.add(new THREE.BoxGeometry(0.96, 0.42, 0.06).translate(lx, 0.40, lz + 0.40), panelLeftM);
  b.add(new THREE.BoxGeometry(0.46, 0.06, 0.34).translate(lx - 0.15, 0.88, lz), goldM);
  b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 10).rotateZ(Math.PI / 2).translate(lx + 0.25, 0.94, lz), woodM);

  // ---- RIGHT STATION: SYMBOLIC DOOR OF INDEPENDENCE & GIANT GOLDEN KEY (x = 0.82, z = -2.08) ----
  const rx = 0.82, rz = -2.08;
  b.add(new THREE.BoxGeometry(1.16, 0.48, 0.76).translate(rx, 0.24, rz), woodM);
  b.add(new THREE.BoxGeometry(0.96, 0.40, 0.06).translate(rx, 0.24, rz + 0.40), panelRightM);
  b.add(new THREE.BoxGeometry(1.00, 1.82, 0.18).translate(rx, 1.39, rz - 0.08), goldM);
  b.add(new THREE.BoxGeometry(0.86, 1.68, 0.22).translate(rx, 1.39, rz - 0.06), doorM);
  b.add(new THREE.TorusGeometry(0.14, 0.04, 10, 18).translate(rx + 0.30, 1.39, rz + 0.14), goldM);
  b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 10).rotateZ(Math.PI / 2).translate(rx + 0.10, 1.39, rz + 0.14), goldM);

  b.build(g);

  const keyGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.10, 12, 10),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.1, 0.8), fog: false })
  );
  keyGlow.position.set(rx, 1.39, rz + 0.10);
  keyGlow.layers.set(NOINK);
  g.add(keyGlow);

  return g;
};
