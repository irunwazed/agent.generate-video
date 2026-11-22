// Kit integration test (not a video): every pose / hold family placed in real locations, seen from several angles.
// Render: npm run kit:render -- --comp KitTestShort --mode stills --frames 15,45,75,105 --out out/kittest/
import type { Project } from "../../kit/scene/types";
import { OUTFITS } from "../../kit/toon/outfits";
import { LOC } from "../../kit/sets/locations";

const field = LOC.lapangan();
const office = LOC.kantor({ wall: "green", window: "left" });

export const PROJECT: Project = {
  name: "KitTest", fps: 30,
  cast: { budi: OUTFITS.pejuang, joko: OUTFITS.tni, siti: OUTFITS.laskar, bos: OUTFITS.bos, eko: OUTFITS.kantoran, rina: OUTFITS.ibu_hijab },
  shots: [
    {
      id: "field_front", a: 0, b: 30, location: field,
      cast: [
        { who: "budi", at: [-1.1, 0], pose: "stand", hold: { prop: "bambu_runcing", style: "upright" }, expr: "stern" },
        { who: "joko", at: [0.0, -0.2], facing: "right", hold: { prop: "rifle", style: "aim" } },
        { who: "siti", at: [1.15, 0.1], facing: "left", hold: { prop: "busur", style: "draw" } },
      ],
      camera: [{ f: 0, preset: "wide", on: [0, 0], dist: 7.2 }],
    },
    {
      id: "field_angle", a: 30, b: 60, location: field,
      cast: [
        { who: "budi", at: [-1.1, 0], pose: "stand", hold: { prop: "bambu_runcing", style: "charge" }, facing: "right" },
        { who: "joko", at: [0.0, -0.2], facing: "right", hold: { prop: "rifle", style: "port" } },
        { who: "siti", at: [1.15, 0.1], lookAt: "budi", hold: { prop: "katana", style: "ready" } },
      ],
      camera: [{ f: 30, preset: "wide", on: [0, 0], dist: 7.2, angle: 35 }],
    },
    {
      id: "office_side", a: 60, b: 90, location: office,
      cast: [{ who: "bos", at: "desk.chair", pose: "sit_boss", lookAt: "desk.top", expr: "smile" }],
      props: [{ id: "hp", prop: "hp", at: "desk.top", flat: true }],
      camera: [{ f: 60, preset: "full", on: "bos", angle: 70, dist: 3.0 }],
    },
    {
      id: "office_front", a: 90, b: 120, location: office,
      cast: [
        { who: "eko", at: "desk.chair", pose: "sit_table", expr: "nervous" },
        { who: "rina", at: "guest", lookAt: "eko", hold: { prop: "kertas", style: "show" } },
      ],
      props: [{ id: "kopi", prop: "kopi", at: "desk.top", y: undefined }],
      camera: [{ f: 90, preset: "medium", on: [0.5, -0.8], dist: 3.8, lookY: 0.9 }],
    },
  ],
};
