import type { Region, SaliencyResult } from "./types";
import { heatColor } from "./saliency";
import { effectiveFixations } from "./attention";

/* Shared 2D-canvas drawing for the agent-vision overlays. Browser-only
   (uses document/canvas) — import from client components. */

/** Draw an image to fill (cover) a w×h canvas, center-cropping the overflow. */
export function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const ir = img.width / img.height;
  const cr = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (ir > cr) {
    dh = h;
    dw = h * ir;
    dx = (w - dw) / 2;
  } else {
    dw = w;
    dh = w / ir;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Overlay the saliency map as a smooth jet-style heatmap. */
export function drawHeatmap(ctx: CanvasRenderingContext2D, s: SaliencyResult) {
  const off = document.createElement("canvas");
  off.width = s.width;
  off.height = s.height;
  const octx = off.getContext("2d");
  if (!octx) return;
  const id = octx.createImageData(s.width, s.height);
  for (let i = 0; i < s.map.length; i++) {
    const [r, g, b, a] = heatColor(s.map[i]);
    id.data[i * 4] = r;
    id.data[i * 4 + 1] = g;
    id.data[i * 4 + 2] = b;
    id.data[i * 4 + 3] = a;
  }
  octx.putImageData(id, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = 0.82;
  ctx.drawImage(off, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/** Draw the predicted gaze scanpath for a given dwell budget.
 *  `reveal` (0–1) progressively unveils the fixations for animation. */
export function drawScanpath(ctx: CanvasRenderingContext2D, s: SaliencyResult, dwellMs: number, reveal: number) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const eff = effectiveFixations(dwellMs);
  const fix = s.fixations.slice(0, eff);
  if (fix.length === 0) return;
  const shown = Math.max(1, Math.round(fix.length * reveal));

  ctx.save();
  ctx.fillStyle = "rgba(10,10,10,0.32)";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(249,115,22,0.9)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  for (let i = 0; i < shown; i++) {
    const x = fix[i].x * W;
    const y = fix[i].y * H;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < shown; i++) {
    const f = fix[i];
    const x = f.x * W;
    const y = f.y * H;
    const r = 12 + f.strength * 16;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? "rgba(249,115,22,0.92)" : "rgba(255,255,255,0.92)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = i === 0 ? "#fff" : "#f97316";
    ctx.stroke();
    ctx.fillStyle = i === 0 ? "#fff" : "#0a0a0a";
    ctx.font = "700 13px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(f.order), x, y);
  }
  ctx.restore();
}

/** Outline a normalized region (the detected/selected billboard). */
export function drawRegionBox(ctx: CanvasRenderingContext2D, region: Region, label = "Billboard") {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const x = region.x * W;
  const y = region.y * H;
  const w = region.w * W;
  const h = region.h * H;

  ctx.save();
  // dim everything outside the region a touch so the box reads as the target
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  // corner ticks
  const t = 14;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff";
  const corner = (cx: number, cy: number, sx: number, sy: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * t);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * t, cy);
    ctx.stroke();
  };
  corner(x, y, 1, 1);
  corner(x + w, y, -1, 1);
  corner(x, y + h, 1, -1);
  corner(x + w, y + h, -1, -1);

  // label
  ctx.font = "700 12px ui-sans-serif, system-ui, sans-serif";
  const tw = ctx.measureText(label).width + 16;
  ctx.fillStyle = "#f97316";
  ctx.fillRect(x, Math.max(0, y - 22), tw, 20);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 8, Math.max(10, y - 12));
  ctx.restore();
}
