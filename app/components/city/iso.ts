/* ── Isometric grid + palette for the landing-page city diorama ──────────
   Classic 2:1 projection: one grid step maps to (±U, V) on screen; heights
   subtract straight up in pixels. Everything sits on this grid so painter's
   order stays a single scalar (gx + gy at an object's near corner). */

export const U = 24;
export const V = 12;

/* Treadmill geometry: the plate is fixed while the city surface slides
   across it in belt tiles of TILE_W grid units. BELT_SLOTS tiles cover the
   plate plus one entering buffer; one tile-width of travel takes BELT_DUR_S
   seconds (fade keyframes in globals.css share this via --belt-dur). */
export const TILE_W = 12;
export const PLATE_W = 24; // exactly 2 tiles — the slab stays square (24×24)
export const PLATE_D = 24;
export const BELT_SLOTS = 3;
/* The belt is a closed ring: BELT_RING tiles total, BELT_SLOTS of them on
   the plate at any moment and the rest "around the back" under the slab.
   The same city loops forever — one full circuit every RING × DUR seconds. */
export const BELT_RING = 6;
export const BELT_DUR_S = 20;

/* Deterministic seeding: the same (BASE_SEED, index) sequence runs on the
   server and the client, so SSR markup and hydration agree. Never seed from
   Date.now(). */
export const BASE_SEED = 0x9e3779b9;

export function hashSeed(base: number, i: number): number {
  let h = (base ^ Math.imul(i + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/* mulberry32 — tiny seeded PRNG, returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Pt = [number, number];

export function px(gx: number, gy: number, z = 0): Pt {
  return [(gx - gy) * U, (gx + gy) * V - z];
}

export function pts(...ps: Pt[]): string {
  return ps.map(([x, y]) => `${+x.toFixed(1)},${+y.toFixed(1)}`).join(" ");
}

/* A cool slate-and-white city so the diorama pops off the orange page.
   Orange appears only where the product does — billboards and awnings —
   with warm window glow tying the dusk scene back to the brand. */
export const PAL = {
  plateTop: "#c2cbd6",
  plateLeft: "#3a4656",
  plateRight: "#2e3948",
  lot: "#aeb9c6",
  park: "#84b06a",
  path: "#e3d7bd",
  sidewalk: "#d5dce4",
  road: "#454f5e",
  mark: "#eef2f6",
  lightTop: "#f6f8fa",
  lightLit: "#e9eef3",
  lightShade: "#bec9d5",
  slateTop: "#9dafc2",
  slateLit: "#8b9fb4",
  slateShade: "#66798f",
  winPunch: "rgba(44,60,78,0.34)",
  winDark: "rgba(26,36,50,0.46)",
  winLit: "#ffd88a",
  trunk: "#6b4a32",
  sageA: "#7fae68",
  sageB: "#8cbb76",
  sageC: "#6d9c57",
  water: "#7fa8c9",
  waterRim: "#cfc3a8",
  ink: "#2b3442",
  inkSoft: "#3d4a5c",
  paleInk: "#f2f5f8",
  pole: "#39424f",
  shadow: "rgba(25,35,50,0.3)",
} as const;

/* Pedestrians are voxel people: a colored cube body under a cream cube head. */
export const FIG = {
  head: "#f4e6c8",
  orange: "#ef5a10",
  blue: "#4f7dab",
  teal: "#3f9587",
  navy: "#56688a",
} as const;
