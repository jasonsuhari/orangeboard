"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ──────────────────────────────────────────────────────────────────────────
   Photoreal billboard preview.

   We pull a real Google Street View still framed on the actual sign location,
   then perspective-warp the generated creative onto a draggable quad so it sits
   on the real panel in the photo. This is the "what it looks like from the
   sidewalk" view — the visibility readout below is an estimate from how much of
   the frame the panel fills and how head-on it is, not a geometric sightline.
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
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [meta, setMeta] = useState<Meta>({ state: "loading" });
  const [quad, setQuad] = useState<Quad>(DEFAULT_QUAD);
  const [editing, setEditing] = useState(true);
  const dragging = useRef<number | null>(null);

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
    fetch(`/api/streetview?lat=${lat}&lng=${lng}`)
      .then(async (r) => {
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setMeta({ state: "error", message: j.error ?? "Street View unavailable" });
        } else if (!j.ok) {
          setMeta({ state: "none" });
        } else {
          setMeta({
            state: "ok",
            panoId: j.panoId,
            heading: j.heading,
            distanceMeters: j.distanceMeters,
            copyright: j.copyright,
            date: j.date,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setMeta({ state: "error", message: "Street View request failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging.current === null || !wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      setQuad((q) => {
        const next = [...q] as Quad;
        next[dragging.current as number] = { x, y };
        return next;
      });
    },
    []
  );

  const dstPx = quad.map((c) => [c.x * size.w, c.y * size.h]);
  const warp = size.w > 0 ? matrix3dFor(size.w, size.h, dstPx) : "none";

  // Estimated prominence: share of frame filled, lightly penalized for extreme
  // skew (a panel seen edge-on is less legible than one seen head-on).
  const share = size.w > 0 ? quadArea(dstPx) / (size.w * size.h) : 0;
  const topW = Math.hypot(dstPx[1][0] - dstPx[0][0], dstPx[1][1] - dstPx[0][1]);
  const botW = Math.hypot(dstPx[2][0] - dstPx[3][0], dstPx[2][1] - dstPx[3][1]);
  const skew = topW && botW ? Math.min(topW, botW) / Math.max(topW, botW) : 1;
  const score = Math.round(Math.min(100, share * 220 * (0.6 + 0.4 * skew)));

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={wrapRef}
        onPointerMove={onPointerMove}
        onPointerUp={() => (dragging.current = null)}
        onPointerLeave={() => (dragging.current = null)}
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
              draggable={false}
            />

            {/* Warped creative on the sign panel */}
            <div
              className="absolute left-0 top-0 origin-top-left overflow-hidden shadow-2xl"
              style={{
                width: size.w || 1,
                height: size.h || 1,
                transform: warp,
                boxShadow: "0 0 0 2px rgba(0,0,0,0.35), 0 8px 30px rgba(0,0,0,0.45)",
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

            {/* Corner handles */}
            {editing &&
              quad.map((c, i) => (
                <button
                  key={i}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    dragging.current = i;
                    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  }}
                  className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-orange-500 shadow active:cursor-grabbing"
                  style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
                  aria-label={`Corner ${i + 1}`}
                />
              ))}
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

      {meta.state === "ok" && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="font-medium text-neutral-700">Est. on-street prominence</span>
            <span className="inline-flex h-5 items-center rounded-full bg-orange-50 px-2 font-semibold text-orange-700">
              {score}/100
            </span>
            <span className="text-neutral-400">~{meta.distanceMeters}m away</span>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-orange-200 hover:text-orange-600"
          >
            {editing ? "Done fitting" : "Fit to sign"}
          </button>
        </div>
      )}
    </div>
  );
}
