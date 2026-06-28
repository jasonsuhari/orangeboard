import { NextRequest, NextResponse } from "next/server";
import type { Region } from "../../lib/types";

/* ──────────────────────────────────────────────────────────────────────────
   Billboard detection via NVIDIA NIM Grounding DINO (open-vocabulary).

   GPT-4o is a strong describer but weak at precise bounding boxes; an
   open-vocab detector prompted with ad terms returns tight boxes. We send a
   small JPEG (kept under the inline limit), prompt for billboard/ad classes,
   and return the best ad-like box normalized to 0–1. Falls back to null (the
   caller then uses the VLM box) whenever the key is missing or the call fails.
   ────────────────────────────────────────────────────────────────────────── */

export const maxDuration = 60;

const NIM_URL = process.env.NVIDIA_GDINO_URL ?? "https://ai.api.nvidia.com/v1/cv/nvidia/grounding-dino";
const DEFAULT_PROMPT =
  "billboard . advertising billboard . digital billboard . advertisement . large advertising sign . poster";
const MAX_INLINE_B64 = 180_000; // NIM inline media limit

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

interface Cand {
  box: [number, number, number, number];
  score: number;
  phrase: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function collect(node: any, out: Cand[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const x of node) collect(x, out);
    return;
  }
  const phrase = String(node.phrase ?? node.label ?? node.class ?? "");
  if (Array.isArray(node.bboxes)) {
    node.bboxes.forEach((bb: any, i: number) => {
      if (Array.isArray(bb) && bb.length >= 4) {
        out.push({
          box: [+bb[0], +bb[1], +bb[2], +bb[3]],
          score: Number(node.scores?.[i] ?? node.score ?? 0.5),
          phrase,
        });
      }
    });
  }
  const single = node.bbox ?? node.box;
  if (Array.isArray(single) && single.length >= 4) {
    out.push({
      box: [+single[0], +single[1], +single[2], +single[3]],
      score: Number(node.score ?? node.confidence ?? 0.5),
      phrase,
    });
  }
  for (const k in node) {
    if (k === "bboxes" || k === "bbox" || k === "box" || k === "scores") continue;
    collect(node[k], out);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function pickBox(json: unknown, w: number, h: number): { box: Region; score: number } | null {
  const cands: Cand[] = [];
  collect(json, cands);
  if (!cands.length) return null;

  const normed = cands
    .map((c) => {
      let [x1, y1, x2, y2] = c.box;
      // Some models return normalized coords already; detect & scale if pixel.
      const looksNormalized = Math.max(x1, y1, x2, y2) <= 1.5;
      if (!looksNormalized && w > 0 && h > 0) {
        x1 /= w;
        x2 /= w;
        y1 /= h;
        y2 /= h;
      }
      const x = clamp01(Math.min(x1, x2));
      const y = clamp01(Math.min(y1, y2));
      const bw = clamp01(Math.max(x1, x2) - x);
      const bh = clamp01(Math.max(y1, y2) - y);
      return { region: { x, y, w: bw, h: bh }, score: c.score, phrase: c.phrase.toLowerCase() };
    })
    // drop degenerate or whole-frame boxes
    .filter((c) => c.region.w > 0.015 && c.region.h > 0.015 && c.region.w * c.region.h < 0.85);

  if (!normed.length) return null;

  const isAd = (p: string) => /billboard|advert|poster|sign|screen/.test(p);
  const ads = normed.filter((c) => isAd(c.phrase));
  const pool = ads.length ? ads : normed;
  pool.sort((a, b) => b.score - a.score);
  return { box: pool[0].region, score: pool[0].score };
}

export async function POST(req: NextRequest) {
  let imageUrl: string | undefined;
  let imageW = 0;
  let imageH = 0;
  let prompt = DEFAULT_PROMPT;
  try {
    const b = (await req.json()) as { imageUrl?: string; imageW?: number; imageH?: number; prompt?: string };
    imageUrl = b.imageUrl;
    imageW = b.imageW ?? 0;
    imageH = b.imageH ?? 0;
    if (b.prompt) prompt = b.prompt;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const key = process.env.NVIDIA_API_KEY;
  if (!key || !imageUrl || !/^data:image\//i.test(imageUrl)) {
    return NextResponse.json({ box: null, source: "none" });
  }

  const b64 = imageUrl.split(",")[1] ?? "";
  if (b64.length > MAX_INLINE_B64) {
    return NextResponse.json({ box: null, source: "too-large" });
  }
  const mime = imageUrl.slice(5, imageUrl.indexOf(";")) || "image/jpeg";

  try {
    const res = await fetch(NIM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: `${prompt} <img src="data:${mime};base64,${b64}" />` }],
        threshold: 0.2,
      }),
      signal: AbortSignal.timeout(40_000),
    });
    if (!res.ok) throw new Error(`NIM ${res.status} ${await res.text()}`);
    const json = await res.json();
    const hit = pickBox(json, imageW, imageH);
    return NextResponse.json({ box: hit?.box ?? null, score: hit?.score ?? null, source: hit ? "nvidia" : "empty" });
  } catch (err) {
    console.error("detect-billboard failed:", err);
    return NextResponse.json({ box: null, source: "error" });
  }
}
