/* ── Isometric grid + palette for the landing-page city diorama ──────────
   Classic 2:1 projection: one grid step maps to (±U, V) on screen; heights
   subtract straight up in pixels. Everything sits on this grid so painter's
   order stays a single scalar (gx + gy at an object's near corner). */

export const U = 24;
export const V = 12;

export type Pt = [number, number];

export function px(gx: number, gy: number, z = 0): Pt {
  return [(gx - gy) * U, (gx + gy) * V - z];
}

export function pts(...ps: Pt[]): string {
  return ps.map(([x, y]) => `${+x.toFixed(1)},${+y.toFixed(1)}`).join(" ");
}

/* The scene stays inside the page's ember/cream family, with one desaturated
   sage for greenery and a whisper of slate for water — mirroring the blue
   counter-glow already in the page grade. */
export const PAL = {
  plateTop: "#c95713",
  plateLeft: "#a03c0a",
  plateRight: "#873008",
  lot: "#d5691f",
  park: "#8fa871",
  path: "#e8b988",
  sidewalk: "#efb583",
  road: "#7c2a06",
  mark: "#ffe6c9",
  creamTop: "#ffefdc",
  creamLit: "#ffdcb6",
  creamShade: "#d28d55",
  emberTop: "#f09a5c",
  emberLit: "#dd7a33",
  emberShade: "#9c440f",
  winPunch: "rgba(110,30,3,0.32)",
  winDark: "rgba(58,14,1,0.4)",
  winLit: "#ffd2a0",
  trunk: "#7a2c08",
  sageA: "#8ca86d",
  sageB: "#97b279",
  sageC: "#7e9a5f",
  water: "#a3bccf",
  waterRim: "#dfb083",
  ink: "#471302",
  inkSoft: "#5c1d04",
  creamInk: "#ffe9d6",
  pole: "#4a1505",
  shadow: "rgba(80,18,0,0.3)",
} as const;
