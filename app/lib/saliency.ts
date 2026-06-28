import type { Fixation, SaliencyResult } from "./types";

/* ──────────────────────────────────────────────────────────────────────────
   Bottom-up visual saliency — a compact Itti–Koch attention model.

   Simulates pre-attentive human vision: center–surround contrast across
   intensity, colour-opponent (R-G / B-Y), and orientation (edge) channels,
   normalised and fused into a saliency map, then a winner-take-all scanpath
   with inhibition-of-return that approximates where the eye fixates and in
   what order. Runs fully client-side on an ImageData — no weights, no network.

   This is the "cool ML model that simulates real human attention" half of the
   hybrid; the VLM supplies top-down comprehension (see attention.ts / the API).
   ────────────────────────────────────────────────────────────────────────── */

/** Average duration of one fixation (ms). Used for the scanpath clock and the
 *  per-agent dwell budget in attention.ts. */
export const FIXATION_MS = 230;

const GRID_MAX = 180; // longest side of the working grid — keeps it fast

type F = Float32Array;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Separable box blur (edge-replicated) in O(n) via a sliding window. */
function boxBlur(src: F, w: number, h: number, radius: number): F {
  if (radius < 1) return src.slice();
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const norm = 1 / (2 * radius + 1);

  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let i = -radius; i <= radius; i++) acc += src[row + clamp(i, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * norm;
      acc += src[row + clamp(x + radius + 1, 0, w - 1)] - src[row + clamp(x - radius, 0, w - 1)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let i = -radius; i <= radius; i++) acc += tmp[clamp(i, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * norm;
      acc += tmp[clamp(y + radius + 1, 0, h - 1) * w + x] - tmp[clamp(y - radius, 0, h - 1) * w + x];
    }
  }
  return out;
}

/** Center–surround: |fine − coarse| summed over several scale pairs. */
function centerSurround(f: F, w: number, h: number): F {
  const out = new Float32Array(w * h);
  const pairs: [number, number][] = [
    [1, 7],
    [2, 14],
    [3, 28],
  ];
  for (const [c, s] of pairs) {
    const cb = boxBlur(f, w, h, c);
    const sb = boxBlur(f, w, h, s);
    for (let i = 0; i < out.length; i++) out[i] += Math.abs(cb[i] - sb[i]);
  }
  return out;
}

/** Itti's normalization operator N(·): scale to [0,1], then promote maps whose
 *  energy is in a few strong peaks over maps with many comparable bumps. */
function normalizeMap(m: F): F {
  let max = 0;
  let min = Infinity;
  for (let i = 0; i < m.length; i++) {
    if (m[i] > max) max = m[i];
    if (m[i] < min) min = m[i];
  }
  const range = max - min || 1;
  const out = new Float32Array(m.length);
  let sum = 0;
  for (let i = 0; i < m.length; i++) {
    out[i] = (m[i] - min) / range;
    sum += out[i];
  }
  const mean = sum / m.length;
  const weight = (1 - mean) * (1 - mean); // sparse, peaky maps win
  for (let i = 0; i < out.length; i++) out[i] *= weight;
  return out;
}

function normalizeInPlace(m: F): void {
  let max = 0;
  let min = Infinity;
  for (let i = 0; i < m.length; i++) {
    if (m[i] > max) max = m[i];
    if (m[i] < min) min = m[i];
  }
  const range = max - min || 1;
  for (let i = 0; i < m.length; i++) m[i] = (m[i] - min) / range;
}

function sobelMag(I: F, w: number, h: number): F {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const ym = clamp(y - 1, 0, h - 1);
    const yp = clamp(y + 1, 0, h - 1);
    for (let x = 0; x < w; x++) {
      const xm = clamp(x - 1, 0, w - 1);
      const xp = clamp(x + 1, 0, w - 1);
      const tl = I[ym * w + xm], t = I[ym * w + x], tr = I[ym * w + xp];
      const l = I[y * w + xm], r = I[y * w + xp];
      const bl = I[yp * w + xm], b = I[yp * w + x], br = I[yp * w + xp];
      const gx = tr + 2 * r + br - (tl + 2 * l + bl);
      const gy = bl + 2 * b + br - (tl + 2 * t + tr);
      out[y * w + x] = Math.hypot(gx, gy);
    }
  }
  return out;
}

/**
 * Suppress sky and flat bright regions. The rooftop/sky boundary is high-contrast
 * enough to fool raw center–surround, but humans never fixate empty sky. We knock
 * down cells that are bright + blue/washed-out + low-texture + in the upper frame,
 * while protecting anything textured (real signs have edges/text, so they survive).
 */
function suppressSky(S: F, r: F, g: F, b: F, I: F, edge: F, w: number, h: number): void {
  let edgeMax = 1e-6;
  for (let i = 0; i < edge.length; i++) if (edge[i] > edgeMax) edgeMax = edge[i];
  const flatThresh = 0.06 * edgeMax;
  for (let y = 0; y < h; y++) {
    const ny = y / (h - 1);
    const upper = clamp((0.62 - ny) / 0.62, 0, 1); // only the top can be sky
    if (upper <= 0) continue;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const rr = r[i];
      const gg = g[i];
      const bb = b[i];
      const mx = Math.max(rr, gg, bb);
      const mn = Math.min(rr, gg, bb);
      const sat = mx <= 0 ? 0 : (mx - mn) / mx;
      const bright = I[i] > 0.5;
      const skyColored = bb >= gg * 0.98 && bb >= rr * 0.98; // blue / white / grey
      const washedOut = sat < 0.2;
      const flat = edge[i] < flatThresh;
      if (bright && (skyColored || washedOut) && flat) {
        S[i] *= 1 - 0.9 * upper;
      }
    }
  }
}

/** Empirical center bias — humans (and photographers) favour the middle. */
function applyCenterBias(S: F, w: number, h: number, sigma: number, strength: number): void {
  const denom = 2 * sigma * sigma;
  for (let y = 0; y < h; y++) {
    const ny = y / (h - 1) - 0.5;
    for (let x = 0; x < w; x++) {
      const nx = x / (w - 1) - 0.5;
      const g = Math.exp(-(nx * nx + ny * ny) / denom);
      S[y * w + x] *= 1 - strength + strength * g;
    }
  }
}

function rmsContrast(I: F): number {
  let sum = 0;
  for (let i = 0; i < I.length; i++) sum += I[i];
  const mean = sum / I.length;
  let v = 0;
  for (let i = 0; i < I.length; i++) {
    const d = I[i] - mean;
    v += d * d;
  }
  return clamp(Math.sqrt(v / I.length) * 2, 0, 1);
}

/** Shannon entropy of the saliency map as a distribution, normalized 0–1.
 *  Low = a clear focal point; high = scattered, cluttered attention. */
function spatialEntropy(S: F): number {
  let sum = 0;
  for (let i = 0; i < S.length; i++) sum += S[i];
  if (sum <= 0) return 1;
  let H = 0;
  for (let i = 0; i < S.length; i++) {
    const p = S[i] / sum;
    if (p > 0) H -= p * Math.log(p);
  }
  return clamp(H / Math.log(S.length), 0, 1);
}

/** Winner-take-all scanpath with inhibition of return. */
function scanpath(S: F, w: number, h: number, k: number): Fixation[] {
  const work = S.slice();
  const fixations: Fixation[] = [];
  const ior = Math.max(3, Math.round(Math.min(w, h) * 0.12));
  const span = ior * 2;
  const twoSig2 = 2 * ior * ior;

  for (let n = 0; n < k; n++) {
    let bi = 0;
    let bv = -1;
    for (let i = 0; i < work.length; i++) {
      if (work[i] > bv) {
        bv = work[i];
        bi = i;
      }
    }
    if (bv <= 0.04 && n > 0) break;
    const fx = bi % w;
    const fy = (bi - fx) / w;
    fixations.push({
      x: fx / (w - 1),
      y: fy / (h - 1),
      strength: clamp(S[bi], 0, 1),
      order: n + 1,
      tMs: Math.round((n + 0.5) * FIXATION_MS),
    });
    for (let y = Math.max(0, fy - span); y < Math.min(h, fy + span); y++) {
      const dy = y - fy;
      for (let x = Math.max(0, fx - span); x < Math.min(w, fx + span); x++) {
        const dx = x - fx;
        work[y * w + x] *= 1 - Math.exp(-(dx * dx + dy * dy) / twoSig2);
      }
    }
  }
  return fixations;
}

function sampleGrid(image: ImageData): { gw: number; gh: number; r: F; g: F; b: F } {
  const { width: iw, height: ih, data } = image;
  const scale = GRID_MAX / Math.max(iw, ih);
  const gw = Math.max(8, Math.round(iw * scale));
  const gh = Math.max(8, Math.round(ih * scale));
  const r = new Float32Array(gw * gh);
  const g = new Float32Array(gw * gh);
  const b = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    const sy = Math.min(ih - 1, Math.floor(((y + 0.5) / gh) * ih));
    for (let x = 0; x < gw; x++) {
      const sx = Math.min(iw - 1, Math.floor(((x + 0.5) / gw) * iw));
      const si = (sy * iw + sx) * 4;
      const di = y * gw + x;
      r[di] = data[si] / 255;
      g[di] = data[si + 1] / 255;
      b[di] = data[si + 2] / 255;
    }
  }
  return { gw, gh, r, g, b };
}

/** Run the full saliency model on a creative. */
export function computeSaliency(image: ImageData, fixationCount = 8): SaliencyResult {
  const { gw, gh, r, g, b } = sampleGrid(image);
  const n = gw * gh;

  const I = new Float32Array(n);
  const RG = new Float32Array(n);
  const BY = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const rr = r[i];
    const gg = g[i];
    const bb = b[i];
    I[i] = (rr + gg + bb) / 3;
    RG[i] = rr - gg;
    BY[i] = bb - (rr + gg) / 2;
  }
  const edge = sobelMag(I, gw, gh);

  const cI = normalizeMap(centerSurround(I, gw, gh));
  const cRG = normalizeMap(centerSurround(RG, gw, gh));
  const cBY = normalizeMap(centerSurround(BY, gw, gh));
  const cO = normalizeMap(centerSurround(edge, gw, gh));

  const S = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    S[i] = (cI[i] + 0.5 * (cRG[i] + cBY[i]) + cO[i]) / 3;
  }
  suppressSky(S, r, g, b, I, edge, gw, gh);
  applyCenterBias(S, gw, gh, 0.42, 0.55);

  const Sm = boxBlur(S, gw, gh, 2);
  normalizeInPlace(Sm);

  let peak = 0;
  for (let i = 0; i < Sm.length; i++) if (Sm[i] > peak) peak = Sm[i];
  const contrast = rmsContrast(I);
  const entropy = spatialEntropy(Sm);
  const concentration = clamp(1 - entropy, 0, 1) * (0.5 + 0.5 * peak);

  return {
    width: gw,
    height: gh,
    map: Array.from(Sm),
    fixations: scanpath(Sm, gw, gh, fixationCount),
    peak,
    concentration,
    entropy,
    contrast,
  };
}

/* ───────────────────── Top-down semantic priors (hybrid) ───────────────────── */

export interface SemanticPrior {
  /** Normalized center, 0–1. */
  cx: number;
  cy: number;
  /** Normalized radius, 0–1. */
  r: number;
  /** Pull on the eye, 0–1. */
  weight: number;
}

/**
 * Fuse top-down semantic priors (faces, people, bright signs the VLM found)
 * into an existing bottom-up saliency map and re-run the scanpath. This turns
 * Itti–Koch into a hybrid bottom-up + top-down attention model — the eye is
 * now pulled toward semantically loaded objects the raw filters can't detect.
 */
export function withSemanticPriors(base: SaliencyResult, priors: SemanticPrior[], fixationCount = 8): SaliencyResult {
  const w = base.width;
  const h = base.height;
  const n = w * h;
  if (!priors.length) return base;

  const top = new Float32Array(n);
  const maxSide = Math.max(w, h);
  for (const p of priors) {
    const cx = p.cx * (w - 1);
    const cy = p.cy * (h - 1);
    const sig = Math.max(2, p.r * maxSide);
    const two = 2 * sig * sig;
    const span = Math.ceil(sig * 2.6);
    const x0 = Math.max(0, Math.floor(cx - span));
    const x1 = Math.min(w, Math.ceil(cx + span));
    const y0 = Math.max(0, Math.floor(cy - span));
    const y1 = Math.min(h, Math.ceil(cy + span));
    for (let y = y0; y < y1; y++) {
      const dy = y - cy;
      for (let x = x0; x < x1; x++) {
        const dx = x - cx;
        top[y * w + x] += p.weight * Math.exp(-(dx * dx + dy * dy) / two);
      }
    }
  }
  normalizeInPlace(top);

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = base.map[i] * 0.65 + top[i] * 0.55;
  normalizeInPlace(out);

  let peak = 0;
  for (let i = 0; i < n; i++) if (out[i] > peak) peak = out[i];
  const entropy = spatialEntropy(out);
  const concentration = clamp(1 - entropy, 0, 1) * (0.5 + 0.5 * peak);

  return {
    width: w,
    height: h,
    map: Array.from(out),
    fixations: scanpath(out, w, h, fixationCount),
    peak,
    concentration,
    entropy,
    contrast: base.contrast,
  };
}

/* ─────────────────────────── Heatmap colour ramp ─────────────────────────── */

const RAMP: [number, number[]][] = [
  [0.0, [30, 60, 170]],
  [0.35, [40, 175, 180]],
  [0.55, [235, 215, 70]],
  [0.78, [240, 120, 30]],
  [1.0, [200, 30, 30]],
];

/** Map a 0–1 saliency value to an [r,g,b,a] heatmap colour (jet-style). */
export function heatColor(v: number): [number, number, number, number] {
  const t = clamp(v, 0, 1);
  let lo = RAMP[0];
  let hi = RAMP[RAMP.length - 1];
  for (let i = 0; i < RAMP.length - 1; i++) {
    if (t >= RAMP[i][0] && t <= RAMP[i + 1][0]) {
      lo = RAMP[i];
      hi = RAMP[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const f = (t - lo[0]) / span;
  const r = Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * f);
  const g = Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * f);
  const b = Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * f);
  // Fade the floor out so the base creative shows through where nothing is salient.
  const a = Math.round(clamp((t - 0.12) / 0.88, 0, 1) * 200);
  return [r, g, b, a];
}
