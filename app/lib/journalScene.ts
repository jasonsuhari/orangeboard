import { environmentLook, fetchCurrentConditions, type CurrentConditions } from "./currentConditions";
import { projectBillboardCorners } from "./projectBillboard";
import { drawHeatmap, drawScanpath } from "./canvasDraw";
import type { Region, SaliencyResult } from "./types";
import {
  pedestrianStreetViewImageUrl,
  type PedestrianBillboardCapture,
} from "../simulation/pedestrianVision";

export type ProjectedStreetScene = {
  imageUrl: string;
  imageData: ImageData;
  region: Region;
};

export type CanvasEnvironmentLook = ReturnType<typeof environmentLook>;

const FALLBACK_PROJECTED_QUAD = [
  { x: 0.34, y: 0.24 },
  { x: 0.66, y: 0.22 },
  { x: 0.66, y: 0.42 },
  { x: 0.34, y: 0.44 },
] as const;

export async function renderProjectedStreetScene(
  capture: PedestrianBillboardCapture,
  creativeUrl: string,
): Promise<ProjectedStreetScene> {
  const size = 640;
  const [streetImage, creativeImage, conditions] = await Promise.all([
    loadImage(pedestrianStreetViewImageUrl(capture, `${size}x${size}`)),
    loadImage(creativeUrl),
    fetchCurrentConditions(capture.billboard.lat, capture.billboard.lng).catch(() => null),
  ]);
  const environment = environmentLook(conditions);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create journal canvas.");

  const projected =
    projectBillboardCorners(
      { lng: capture.billboard.lng, lat: capture.billboard.lat },
      { lng: capture.pedestrian.lng, lat: capture.pedestrian.lat },
      capture.pedestrian.headingDeg,
      2,
      Math.round(capture.fovDeg),
    ) ?? FALLBACK_PROJECTED_QUAD;
  const dst = projected.map((p) => [p.x * size, p.y * size] as [number, number]);

  ctx.save();
  ctx.filter = environment.streetFilter || "none";
  ctx.drawImage(streetImage, 0, 0, size, size);
  ctx.restore();
  drawCanvasEnvironmentBackdrop(ctx, size, environment, conditions);

  const sampleFilter = sampleProjectedQuadFilter(ctx, projected, size);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 8;
  ctx.globalAlpha = environment.creativeOpacity;
  ctx.filter = [sampleFilter, environment.creativeFilter].filter(Boolean).join(" ") || "none";
  drawImageInQuad(ctx, creativeImage, dst);
  ctx.restore();
  drawCanvasEnvironmentFront(ctx, size, environment);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dst[0][0], dst[0][1]);
  for (let i = 1; i < dst.length; i++) ctx.lineTo(dst[i][0], dst[i][1]);
  ctx.closePath();
  ctx.strokeStyle = "rgba(15,23,42,0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const imageData = ctx.getImageData(0, 0, size, size);
  return {
    imageUrl: canvas.toDataURL("image/jpeg", 0.88),
    imageData,
    region: quadToRegion(projected),
  };
}

function drawCanvasEnvironmentBackdrop(
  ctx: CanvasRenderingContext2D,
  size: number,
  environment: CanvasEnvironmentLook,
  conditions: CurrentConditions | null,
) {
  ctx.save();
  if (environment.band === "night") {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, "rgba(6,12,28,0.46)");
    g.addColorStop(0.5, "rgba(7,13,26,0.24)");
    g.addColorStop(1, "rgba(3,7,18,0.5)");
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (environment.band === "morning") {
    const g = ctx.createLinearGradient(0, 0, size, size * 0.7);
    g.addColorStop(0, "rgba(255,204,143,0.18)");
    g.addColorStop(0.58, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (environment.band === "evening") {
    const g = ctx.createLinearGradient(0, 0, size, size * 0.8);
    g.addColorStop(0, "rgba(255,155,92,0.2)");
    g.addColorStop(0.68, "rgba(29,40,65,0.16)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (conditions && conditions.cloudCoverPercent >= 70 && !environment.wet && !environment.foggy) {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, "rgba(117,130,148,0.18)");
    g.addColorStop(1, "rgba(255,255,255,0.04)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.restore();
}

function drawCanvasEnvironmentFront(
  ctx: CanvasRenderingContext2D,
  size: number,
  environment: CanvasEnvironmentLook,
) {
  if (!environment.foggy && !environment.wet) return;

  ctx.save();
  if (environment.foggy) {
    const fog = ctx.createLinearGradient(0, 0, 0, size);
    fog.addColorStop(0, "rgba(238,242,245,0.32)");
    fog.addColorStop(0.54, "rgba(238,242,245,0.12)");
    fog.addColorStop(1, "rgba(238,242,245,0.24)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, size, size);
  }

  if (environment.wet) {
    const sheen = ctx.createLinearGradient(0, size, 0, 0);
    sheen.addColorStop(0, "rgba(214,232,255,0.18)");
    sheen.addColorStop(0.32, "rgba(214,232,255,0.02)");
    sheen.addColorStop(0.62, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, size, size);

    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 1;
    for (let x = -size; x < size * 1.4; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, -24);
      ctx.lineTo(x + size * 0.42, size + 24);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function sampleProjectedQuadFilter(
  ctx: CanvasRenderingContext2D,
  quad: ReadonlyArray<{ x: number; y: number }>,
  size: number,
): string {
  const xs = quad.map((p) => p.x * size);
  const ys = quad.map((p) => p.y * size);
  const rx = Math.max(0, Math.floor(Math.min(...xs)));
  const ry = Math.max(0, Math.floor(Math.min(...ys)));
  const rw = Math.min(size - rx, Math.ceil(Math.max(...xs)) - rx);
  const rh = Math.min(size - ry, Math.ceil(Math.max(...ys)) - ry);
  if (rw < 2 || rh < 2) return "";

  const { data } = ctx.getImageData(rx, ry, rw, rh);
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  const n = rw * rh;
  for (let i = 0; i < n; i++) {
    sumR += data[i * 4];
    sumG += data[i * 4 + 1];
    sumB += data[i * 4 + 2];
  }

  const r = sumR / n / 255;
  const g = sumG / n / 255;
  const b = sumB / n / 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const brightness = clamp(lum / 0.42, 0.6, 1.4);
  const sat = clamp(chroma / 0.18, 0.6, 1.2);
  return `brightness(${brightness.toFixed(2)}) saturate(${sat.toFixed(2)})`;
}

export function renderHeatmapJournalImage(imageData: ImageData, saliency: SaliencyResult): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create heatmap canvas.");
  ctx.putImageData(imageData, 0, 0);
  drawHeatmap(ctx, saliency);
  return canvas.toDataURL("image/jpeg", 0.88);
}

export function renderScanpathJournalImage(imageData: ImageData, saliency: SaliencyResult): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create scanpath canvas.");
  ctx.putImageData(imageData, 0, 0);
  drawScanpath(ctx, saliency, 3000, 1);
  return canvas.toDataURL("image/jpeg", 0.88);
}

function drawImageInQuad(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dst: [number, number][],
) {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  drawTexturedTriangle(ctx, image, [0, 0], [w, 0], [w, h], dst[0], dst[1], dst[2]);
  drawTexturedTriangle(ctx, image, [0, 0], [w, h], [0, h], dst[0], dst[2], dst[3]);
}

function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  s0: [number, number],
  s1: [number, number],
  s2: [number, number],
  d0: [number, number],
  d1: [number, number],
  d2: [number, number],
) {
  const [sx0, sy0] = s0;
  const [sx1, sy1] = s1;
  const [sx2, sy2] = s2;
  const [dx0, dy0] = d0;
  const [dx1, dy1] = d1;
  const [dx2, dy2] = d2;
  const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
  if (Math.abs(denom) < 0.0001) return;

  const a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / denom;
  const b = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / denom;
  const c = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / denom;
  const d = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / denom;
  const e =
    (dx0 * (sx1 * sy2 - sx2 * sy1) +
      dx1 * (sx2 * sy0 - sx0 * sy2) +
      dx2 * (sx0 * sy1 - sx1 * sy0)) /
    denom;
  const f =
    (dy0 * (sx1 * sy2 - sx2 * sy1) +
      dy1 * (sx2 * sy0 - sx0 * sy2) +
      dy2 * (sx0 * sy1 - sx1 * sy0)) /
    denom;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dx0, dy0);
  ctx.lineTo(dx1, dy1);
  ctx.lineTo(dx2, dy2);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

function quadToRegion(quad: ReadonlyArray<{ x: number; y: number }>): Region {
  const xs = quad.map((p) => clamp01(p.x));
  const ys = quad.map((p) => clamp01(p.y));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  if (w < 0.03 || h < 0.03) return { x: 0.34, y: 0.22, w: 0.32, h: 0.22 };
  return { x, y, w, h };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!/^data:/i.test(src)) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load journal image."));
    image.src = src;
  });
}
