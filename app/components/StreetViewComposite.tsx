"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  conditionsLabel,
  environmentLook,
  fetchCurrentConditions,
  type ConditionsMeta,
} from "../lib/currentConditions";
import { projectBillboardCorners } from "../lib/projectBillboard";

/* ──────────────────────────────────────────────────────────────────────────
   Photoreal billboard preview.

   Pulls a real Google Street View still framed on the sign, then
   perspective-warps the generated creative onto the mathematically projected
   billboard quad. No user interaction needed — the placement is derived from
   the sign's known 3D geometry and the Street View camera parameters.
   ────────────────────────────────────────────────────────────────────────── */

type Corner = { x: number; y: number }; // fractions of the container [0..1]
type Quad = [Corner, Corner, Corner, Corner]; // TL, TR, BR, BL

const DEFAULT_QUAD: Quad = [
  { x: 0.31, y: 0.2 },
  { x: 0.69, y: 0.17 },
  { x: 0.69, y: 0.46 },
  { x: 0.31, y: 0.43 },
];

type Meta =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "none" }
  | {
      state: "ok";
      panoId: string;
      panoLocation: { lat: number; lng: number };
      heading: number;
      distanceMeters: number;
      copyright: string;
      date: string | null;
    };

/* ── 2D projective transform (maps the unit-ish source box onto the quad) ── */

function adj(m: number[]): number[] {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3],
  ];
}

function multmm(a: number[], b: number[]): number[] {
  const c = new Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j];
      c[3 * i + j] = s;
    }
  return c;
}

function multmv(m: number[], v: number[]): number[] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

function basisToPoints(pts: number[][]): number[] {
  const m = [pts[0][0], pts[1][0], pts[2][0], pts[0][1], pts[1][1], pts[2][1], 1, 1, 1];
  const v = multmv(adj(m), [pts[3][0], pts[3][1], 1]);
  return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

function general2DProjection(src: number[][], dst: number[][]): number[] {
  return multmm(basisToPoints(dst), adj(basisToPoints(src)));
}

/** CSS matrix3d that warps a W×H box (origin 0,0) onto dst corners (px). */
function matrix3dFor(w: number, h: number, dst: number[][]): string {
  const src = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const t = general2DProjection(src, dst);
  for (let i = 0; i < 9; i++) t[i] = t[i] / t[8];
  const m = [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]];
  return `matrix3d(${m.join(",")})`;
}

/** Polygon area (px²) via the shoelace formula. */
function quadArea(pts: number[][]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export default function StreetViewComposite({
  lat,
  lng,
  label,
  creativeUrl,
}: {
  lat: number;
  lng: number;
  label?: string;
  creativeUrl: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [meta, setMeta] = useState<Meta>({ state: "loading" });
  const [quad, setQuad] = useState<Quad>(DEFAULT_QUAD);
  const [sampleFilter, setSampleFilter] = useState("");
  const [conditions, setConditions] = useState<ConditionsMeta>({ state: "loading" });

  // Track the rendered size so we can convert fractional corners → pixels.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fetch the panorama framing for this sign whenever the location changes.
  useEffect(() => {
    let cancelled = false;
    setMeta({ state: "loading" });
    setQuad(DEFAULT_QUAD);
    setSampleFilter("");
    fetch(`/api/streetview?lat=${lat}&lng=${lng}`)
      .then(async (r) => {
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setMeta({ state: "error", message: j.error ?? "Street View unavailable" });
        } else if (!j.ok) {
          setMeta({ state: "none" });
        } else {
          const result = {
            state: "ok" as const,
            panoId: j.panoId as string,
            panoLocation: j.panoLocation as { lat: number; lng: number },
            heading: j.heading as number,
            distanceMeters: j.distanceMeters as number,
            copyright: j.copyright as string,
            date: j.date as string | null,
          };
          setMeta(result);
          if (result.panoLocation) {
            const projected = projectBillboardCorners(
              { lng, lat },
              result.panoLocation,
              result.heading,
            );
            if (projected) setQuad(projected);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setMeta({ state: "error", message: "Street View request failed" });
      });
    return () => { cancelled = true; };
  }, [lat, lng]);

  // Fetch live conditions independently of Street View. The panorama may be
  // historical, but the visual grade should match the billboard's current sky.
  useEffect(() => {
    let cancelled = false;
    setConditions({ state: "loading" });
    fetchCurrentConditions(lat, lng)
      .then((data) => {
        if (!cancelled) setConditions({ state: "ok", data });
      })
      .catch(() => {
        if (!cancelled) setConditions({ state: "error" });
      });
    return () => { cancelled = true; };
  }, [lat, lng]);

  const onStreetViewLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const canvas = sampleCanvasRef.current;
      if (!canvas) return;
      const S = 64;
      canvas.width = S;
      canvas.height = S;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(e.currentTarget, 0, 0, S, S);

      // Sample pixels inside the projected billboard quad bounding box
      const xs = quad.map((c) => c.x * S);
      const ys = quad.map((c) => c.y * S);
      const rx = Math.max(0, Math.floor(Math.min(...xs)));
      const ry = Math.max(0, Math.floor(Math.min(...ys)));
      const rw = Math.min(S - rx, Math.ceil(Math.max(...xs)) - rx);
      const rh = Math.min(S - ry, Math.ceil(Math.max(...ys)) - ry);
      if (rw < 2 || rh < 2) return;

      const { data } = ctx.getImageData(rx, ry, rw, rh);
      let sumR = 0, sumG = 0, sumB = 0;
      const n = rw * rh;
      for (let i = 0; i < n; i++) {
        sumR += data[i * 4];
        sumG += data[i * 4 + 1];
        sumB += data[i * 4 + 2];
      }
      const R = sumR / n / 255;
      const G = sumG / n / 255;
      const B = sumB / n / 255;

      const lum = 0.299 * R + 0.587 * G + 0.114 * B;
      const chroma = Math.max(R, G, B) - Math.min(R, G, B);
      const brightness = clamp(lum / 0.42, 0.6, 1.4);
      const sat = clamp(chroma / 0.18, 0.6, 1.2);
      setSampleFilter(`brightness(${brightness.toFixed(2)}) saturate(${sat.toFixed(2)})`);
    },
    [quad],
  );

  const dstPx = quad.map((c) => [c.x * size.w, c.y * size.h]);
  const warp = size.w > 0 ? matrix3dFor(size.w, size.h, dstPx) : "none";

  const share = size.w > 0 ? quadArea(dstPx) / (size.w * size.h) : 0;
  const topW = Math.hypot(dstPx[1][0] - dstPx[0][0], dstPx[1][1] - dstPx[0][1]);
  const botW = Math.hypot(dstPx[2][0] - dstPx[3][0], dstPx[2][1] - dstPx[3][1]);
  const skew = topW && botW ? Math.min(topW, botW) / Math.max(topW, botW) : 1;
  const score = Math.round(Math.min(100, share * 220 * (0.6 + 0.4 * skew)));
  const currentConditions = conditions.state === "ok" ? conditions.data : null;
  const environment = environmentLook(currentConditions);
  const creativeFilter = [sampleFilter, environment.creativeFilter].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={wrapRef}
        className="relative aspect-square w-full select-none overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900"
        style={{ perspective: 1400 }}
      >
        {meta.state === "ok" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/streetview/image?pano=${encodeURIComponent(
                meta.panoId
              )}&heading=${meta.heading.toFixed(1)}&size=640x640`}
              alt={label ? `Street View near ${label}` : "Street View"}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: environment.streetFilter || undefined }}
              draggable={false}
              onLoad={onStreetViewLoad}
              crossOrigin="anonymous"
            />

            {environment.backdropStyle && (
              <div
                className="pointer-events-none absolute inset-0"
                style={environment.backdropStyle}
                aria-hidden
              />
            )}

            {/* Warped creative projected onto the sign panel */}
            <div
              className="absolute left-0 top-0 origin-top-left overflow-hidden"
              style={{
                width: size.w || 1,
                height: size.h || 1,
                transform: warp,
                filter: creativeFilter || undefined,
                opacity: (meta.distanceMeters > 60 ? 0.88 : 1) * environment.creativeOpacity,
                boxShadow: environment.billboardShadow,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={creativeUrl}
                alt="Billboard creative"
                className="h-full w-full object-fill"
                draggable={false}
              />
            </div>

            {environment.frontStyle && (
              <div
                className="pointer-events-none absolute inset-0"
                style={environment.frontStyle}
                aria-hidden
              />
            )}
            {environment.rainStyle && (
              <div
                className="pointer-events-none absolute -inset-6"
                style={environment.rainStyle}
                aria-hidden
              />
            )}
          </>
        )}

        {meta.state === "loading" && (
          <div className="absolute inset-0 grid place-items-center text-sm text-neutral-300">
            Loading street view…
          </div>
        )}
        {meta.state === "none" && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-neutral-300">
            No street-level imagery near this sign.
          </div>
        )}
        {meta.state === "error" && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-amber-200">
            {meta.message}
          </div>
        )}

        {meta.state === "ok" && (
          <div className="pointer-events-none absolute bottom-1 right-2 text-[10px] text-white/70">
            {meta.copyright}
            {meta.date ? ` · ${meta.date}` : ""}
          </div>
        )}
      </div>

      {/* Hidden canvas for scene colour sampling */}
      <canvas ref={sampleCanvasRef} style={{ display: "none" }} aria-hidden />

      {meta.state === "ok" && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="font-medium text-neutral-700">Est. on-street prominence</span>
          <span className="inline-flex h-5 items-center rounded-full bg-orange-50 px-2 font-semibold text-orange-700">
            {score}/100
          </span>
          <span className="text-neutral-400">~{meta.distanceMeters}m away</span>
          {currentConditions && (
            <span className="text-neutral-400">Live: {conditionsLabel(currentConditions)}</span>
          )}
        </div>
      )}
    </div>
  );
}
