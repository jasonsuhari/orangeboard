import type { Region } from "./types";

/* ──────────────────────────────────────────────────────────────────────────
   Free, zero-key billboard detection — OWL-ViT (open-vocabulary) in the browser.

   Transformers.js runs an ONNX OWL-ViT model client-side (WebGPU when present,
   else WASM). You prompt it with text ("a billboard") and it returns boxes — no
   API, no key, no per-call cost. The model downloads once from the HF CDN and is
   cached by the browser. Falls back gracefully: callers use the VLM box on error.
   ────────────────────────────────────────────────────────────────────────── */

export type ProgressFn = (p: { status: string; progress?: number; file?: string }) => void;

export interface OwlHit {
  box: Region; // normalized 0–1
  score: number;
  label: string;
}

const MODEL_ID = "Xenova/owlvit-base-patch32";
const CANDIDATE_LABELS = [
  "a billboard",
  "an advertising billboard",
  "a digital advertising screen",
  "an advertisement poster",
  "a large outdoor ad",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
let detectorPromise: Promise<any> | null = null;

/** Lazily create (and cache) the OWL-ViT pipeline. */
export function loadDetector(onProgress?: ProgressFn): Promise<any> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const tf = await import("@huggingface/transformers");
      const device =
        typeof navigator !== "undefined" && (navigator as any).gpu ? "webgpu" : "wasm";
      return tf.pipeline("zero-shot-object-detection", MODEL_ID, {
        device,
        dtype: "q8", // quantized → smaller download, fine for box detection
        progress_callback: onProgress,
      });
    })().catch((err) => {
      detectorPromise = null; // allow a retry on failure
      throw err;
    });
  }
  return detectorPromise;
}

/** True once the model is downloaded & ready in this session. */
export function isDetectorLoaded(): boolean {
  return detectorPromise !== null;
}

/**
 * Detect the most ad-like box in an image, normalized to 0–1.
 * @param image    A data URL or same-origin URL.
 * @param width    Pixel width of that image (to normalize the returned box).
 * @param height   Pixel height of that image.
 * @param onProgress  Model download / run progress.
 * @param scoreBox    Optional content scorer, 0–1, for a normalized box. When
 *   given, the final ranking blends the model's confidence with how much real
 *   visual content sits inside the box — so a high-confidence box over empty
 *   sky (no eye ever lands there) loses to a real, content-rich billboard.
 */
export async function detectBillboard(
  image: string,
  width: number,
  height: number,
  onProgress?: ProgressFn,
  scoreBox?: (box: Region) => number,
): Promise<OwlHit | null> {
  const detector = await loadDetector(onProgress);
  const raw = (await detector(image, CANDIDATE_LABELS, { threshold: 0.03, topk: 12 })) as Array<{
    score: number;
    label: string;
    box: { xmin: number; ymin: number; xmax: number; ymax: number };
  }>;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const cands = raw
    .map((d) => {
      // Transformers.js returns pixel coords; some builds return 0–1. Detect & scale.
      const px = Math.max(d.box.xmax, d.box.ymax) > 1.5;
      const x1 = px ? d.box.xmin / width : d.box.xmin;
      const y1 = px ? d.box.ymin / height : d.box.ymin;
      const x2 = px ? d.box.xmax / width : d.box.xmax;
      const y2 = px ? d.box.ymax / height : d.box.ymax;
      const x = clamp01(Math.min(x1, x2));
      const y = clamp01(Math.min(y1, y2));
      const w = clamp01(Math.max(x1, x2) - x);
      const h = clamp01(Math.max(y1, y2) - y);
      return { box: { x, y, w, h }, score: d.score, label: d.label };
    })
    .filter((c) => c.box.w > 0.015 && c.box.h > 0.015 && c.box.w * c.box.h < 0.85);

  if (!cands.length) return null;

  // Rank by model confidence, demoted by how empty the box is. A box over blank
  // sky scores ~0 content and is heavily penalized; a real, textured billboard
  // keeps most of its confidence. Without a scorer this is a no-op (rank=score).
  const ranked = cands.map((c) => {
    const content = scoreBox ? clamp01(scoreBox(c.box)) : 1;
    return { ...c, rank: c.score * (0.15 + 0.85 * content) };
  });
  ranked.sort((a, b) => b.rank - a.rank);
  const best = ranked[0];
  return { box: best.box, score: best.score, label: best.label };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
