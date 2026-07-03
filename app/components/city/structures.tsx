import type { CSSProperties, ReactNode } from "react";
import { PAL, px, pts } from "./iso";

/* ── Buildings and billboards for the city diorama ─────────────────────── */

/* An extruded box. The sun sits top-left (matching the page), so +gy faces
   are lit and +gx faces fall into shade; the two camera-facing faces are all
   we draw. */
export function Prism({
  gx,
  gy,
  w,
  d,
  h,
  top,
  lit,
  shade,
}: {
  gx: number;
  gy: number;
  w: number;
  d: number;
  h: number;
  top: string;
  lit: string;
  shade: string;
}) {
  return (
    <g>
      <polygon
        points={pts(px(gx, gy + d, h), px(gx + w, gy + d, h), px(gx + w, gy + d), px(gx, gy + d))}
        fill={lit}
      />
      <polygon
        points={pts(px(gx + w, gy, h), px(gx + w, gy + d, h), px(gx + w, gy + d), px(gx + w, gy))}
        fill={shade}
      />
      <polygon
        points={pts(px(gx, gy, h), px(gx + w, gy, h), px(gx + w, gy + d, h), px(gx, gy + d, h))}
        fill={top}
      />
      <polygon
        points={pts(
          px(gx + 0.22, gy + 0.22, h),
          px(gx + w - 0.22, gy + 0.22, h),
          px(gx + w - 0.22, gy + d - 0.22, h),
          px(gx + 0.22, gy + d - 0.22, h),
        )}
        fill="rgba(120,40,8,0.08)"
      />
    </g>
  );
}

/* A window grid on one face. Lit (+gy) faces get punched-dark glass; shaded
   (+gx) faces get dark glass with a deterministic scattering of warm interior
   lights — a few of which flicker. */
function FaceWindows({
  gx,
  gy,
  w,
  d,
  side,
  floors,
  cols,
  z0,
  z1,
  seed,
}: {
  gx: number;
  gy: number;
  w: number;
  d: number;
  side: "L" | "R";
  floors: number;
  cols: number;
  z0: number;
  z1: number;
  seed: number;
}) {
  const len = side === "L" ? w : d;
  const p = (u: number, z: number) =>
    side === "L" ? px(gx + u, gy + d, z) : px(gx + w, gy + u, z);
  const m = 0.2;
  const gap = 0.13;
  const wu = (len - 2 * m - (cols - 1) * gap) / cols;
  const fh = (z1 - z0) / floors;
  const quads: ReactNode[] = [];
  for (let r = 0; r < floors; r++) {
    for (let c = 0; c < cols; c++) {
      const u = m + c * (wu + gap);
      const zb = z0 + r * fh + 2.5;
      const zt = z0 + (r + 1) * fh - 3;
      const hash = (r * 7 + c * 11 + seed) % 10;
      const glow = side === "R" && hash < 3;
      quads.push(
        <polygon
          key={`${r}-${c}`}
          points={pts(p(u, zt), p(u + wu, zt), p(u + wu, zb), p(u, zb))}
          fill={glow ? PAL.winLit : side === "L" ? PAL.winPunch : PAL.winDark}
          opacity={glow ? 0.92 : undefined}
          className={glow && hash === 0 ? "iso-window" : undefined}
          style={
            glow && hash === 0
              ? ({ animationDelay: `${-((r * 1.7 + c) % 5)}s` } as CSSProperties)
              : undefined
          }
        />,
      );
    }
  }
  return <g>{quads}</g>;
}

/* Thin lighter strips at each floor line — reads as balconies/slab edges on
   the apartment blocks. */
function FloorBands({
  gx,
  gy,
  w,
  d,
  floors,
  z0,
  z1,
}: {
  gx: number;
  gy: number;
  w: number;
  d: number;
  floors: number;
  z0: number;
  z1: number;
}) {
  const fh = (z1 - z0) / floors;
  const bands: ReactNode[] = [];
  for (let r = 1; r <= floors; r++) {
    const z = z0 + r * fh;
    bands.push(
      <polygon
        key={`l${r}`}
        points={pts(px(gx, gy + d, z), px(gx + w, gy + d, z), px(gx + w, gy + d, z - 1.6), px(gx, gy + d, z - 1.6))}
        fill="rgba(255,240,225,0.55)"
      />,
      <polygon
        key={`r${r}`}
        points={pts(px(gx + w, gy, z), px(gx + w, gy + d, z), px(gx + w, gy + d, z - 1.6), px(gx + w, gy, z - 1.6))}
        fill="rgba(255,222,192,0.28)"
      />,
    );
  }
  return <g>{bands}</g>;
}

export function Tower({
  gx,
  gy,
  w,
  d,
  h,
  floors,
  cols,
  tone = "cream",
  seed = 1,
}: {
  gx: number;
  gy: number;
  w: number;
  d: number;
  h: number;
  floors: number;
  cols: number;
  tone?: "cream" | "ember";
  seed?: number;
}) {
  const t =
    tone === "cream"
      ? { top: PAL.creamTop, lit: PAL.creamLit, shade: PAL.creamShade }
      : { top: PAL.emberTop, lit: PAL.emberLit, shade: PAL.emberShade };
  return (
    <g>
      <Prism gx={gx} gy={gy} w={w} d={d} h={h} top={t.top} lit={t.lit} shade={t.shade} />
      <FaceWindows gx={gx} gy={gy} w={w} d={d} side="L" floors={floors} cols={cols} z0={7} z1={h - 8} seed={seed} />
      <FaceWindows gx={gx} gy={gy} w={w} d={d} side="R" floors={floors} cols={cols} z0={7} z1={h - 8} seed={seed + 3} />
    </g>
  );
}

export function Apartment(props: {
  gx: number;
  gy: number;
  w: number;
  d: number;
  h: number;
  floors: number;
  cols: number;
  tone?: "cream" | "ember";
  seed?: number;
}) {
  const { gx, gy, w, d, h, floors } = props;
  return (
    <g>
      <Tower {...props} />
      <FloorBands gx={gx} gy={gy} w={w} d={d} floors={floors} z0={7} z1={h - 8} />
    </g>
  );
}

/* Corner store: striped awning over a glass storefront, hand-painted sign
   band above. `face` picks which visible face holds the storefront. */
export function Bodega({
  gx,
  gy,
  w,
  d,
  h,
  face = "L",
  sign = "BODEGA",
}: {
  gx: number;
  gy: number;
  w: number;
  d: number;
  h: number;
  face?: "L" | "R";
  sign?: string;
}) {
  const len = face === "L" ? w : d;
  const p = (u: number, z: number, out = 0) =>
    face === "L" ? px(gx + u, gy + d + out, z) : px(gx + w + out, gy + u, z);
  const stripes: ReactNode[] = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const u0 = 0.1 + (i * (len - 0.2)) / n;
    const u1 = 0.1 + ((i + 1) * (len - 0.2)) / n;
    stripes.push(
      <polygon
        key={i}
        points={pts(p(u0, 13.5), p(u1, 13.5), p(u1, 9, 0.42), p(u0, 9, 0.42))}
        fill={i % 2 === 0 ? "#ef5a10" : "#ffe9d6"}
      />,
    );
  }
  const signMid = p(len / 2, 0);
  const slope = face === "L" ? 0.5 : -0.5;
  return (
    <g>
      <Prism gx={gx} gy={gy} w={w} d={d} h={h} top={PAL.creamTop} lit={PAL.creamLit} shade={PAL.creamShade} />
      {/* storefront glass + door */}
      <polygon points={pts(p(0.18, 12), p(len - 0.18, 12), p(len - 0.18, 2), p(0.18, 2))} fill="rgba(70,20,2,0.42)" />
      <polygon points={pts(p(len - 0.62, 12), p(len - 0.28, 12), p(len - 0.28, 2), p(len - 0.62, 2))} fill="#ffd2a0" opacity={0.9} />
      {/* sign band */}
      <polygon points={pts(p(0.1, h - 1.5), p(len - 0.1, h - 1.5), p(len - 0.1, h - 8), p(0.1, h - 8))} fill="#3f1203" />
      <text
        transform={`matrix(1 ${slope} 0 1 ${signMid[0].toFixed(1)} ${(signMid[1] - h + 6.3).toFixed(1)})`}
        textAnchor="middle"
        fontSize="4.6"
        fontWeight="700"
        letterSpacing="0.14em"
        fill={PAL.creamInk}
      >
        {sign}
      </text>
      {/* awning + valance */}
      {stripes}
      <polygon points={pts(p(0.1, 9, 0.42), p(len - 0.1, 9, 0.42), p(len - 0.1, 7.2, 0.42), p(0.1, 7.2, 0.42))} fill="#d84e0c" />
      {/* rooftop unit */}
      <Prism gx={gx + w * 0.55} gy={gy + d * 0.3} w={0.45} d={0.4} h={4} top={PAL.emberTop} lit={PAL.emberLit} shade={PAL.emberShade} />
    </g>
  );
}

/* Rooftop board above the tallest tower; two creatives crossfade on it. */
export function RooftopBillboard({ gx, gy, z }: { gx: number; gy: number; z: number }) {
  const p = (u: number, zz: number) => px(gx + u, gy, zz);
  const mid = p(1.3, z + 48);
  const creative = (fill: string, size: number, textFill: string, label: string) => (
    <>
      <polygon points={pts(p(0.1, z + 69.5), p(2.5, z + 69.5), p(2.5, z + 26.5), p(0.1, z + 26.5))} fill={fill} />
      <text
        transform={`matrix(1 0.5 0 1 ${mid[0].toFixed(1)} ${mid[1].toFixed(1)})`}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size}
        fontWeight="700"
        letterSpacing="-0.04em"
        fill={textFill}
      >
        {label}
      </text>
    </>
  );
  return (
    <g>
      <polygon points={pts(p(0.42, z + 28), p(0.56, z + 28), p(0.56, z), p(0.42, z))} fill={PAL.pole} />
      <polygon points={pts(p(2.04, z + 28), p(2.18, z + 28), p(2.18, z), p(2.04, z))} fill={PAL.pole} />
      <polygon points={pts(p(0, z + 72), p(2.6, z + 72), p(2.6, z + 24), p(0, z + 24))} fill="#fff4ea" />
      <g>{creative("#ef5a10", 19, "#fff4ea", "peel")}</g>
      <g className="iso-ad">{creative("#fff4ea", 13, "#ef4c00", "OOH, hi.")}</g>
    </g>
  );
}

/* Wall-mounted board on a shaded apartment flank. */
export function WallBillboard({
  gx,
  gy,
  u0,
  u1,
  z0,
  z1,
}: {
  gx: number;
  gy: number;
  u0: number;
  u1: number;
  z0: number;
  z1: number;
}) {
  const p = (u: number, z: number) => px(gx, gy + u, z);
  const cx = p((u0 + u1) / 2 - 0.18, (z0 + z1) / 2 + 4);
  return (
    <g>
      <polygon points={pts(p(u0, z1), p(u1, z1), p(u1, z0), p(u0, z0))} fill="#fff4ea" />
      <polygon points={pts(p(u0 + 0.08, z1 - 2), p(u1 - 0.08, z1 - 2), p(u1 - 0.08, z0 + 2), p(u0 + 0.08, z0 + 2))} fill="#58170a" />
      <circle cx={cx[0]} cy={cx[1]} r="6.5" fill="#ef5a10" />
      <polygon points={pts(p(u0 + 0.24, z0 + 13), p(u1 - 0.5, z0 + 13), p(u1 - 0.5, z0 + 9.5), p(u0 + 0.24, z0 + 9.5))} fill={PAL.creamInk} />
      <polygon points={pts(p(u0 + 0.24, z0 + 8), p(u1 - 0.9, z0 + 8), p(u1 - 0.9, z0 + 5), p(u0 + 0.24, z0 + 5))} fill="rgba(255,233,214,0.55)" />
    </g>
  );
}

/* Street-level board on posts beside the avenue. */
export function StreetBillboard({ gx, gy }: { gx: number; gy: number }) {
  const p = (u: number, z: number) => px(gx + u, gy, z);
  const mid = p(1.25, 36);
  return (
    <g>
      <polygon points={pts(p(0.35, 22), p(0.49, 22), p(0.49, 0), p(0.35, 0))} fill={PAL.pole} />
      <polygon points={pts(p(2.01, 22), p(2.15, 22), p(2.15, 0), p(2.01, 0))} fill={PAL.pole} />
      <polygon points={pts(p(0, 50), p(2.5, 50), p(2.5, 20), p(0, 20))} fill="#fff4ea" />
      <polygon points={pts(p(0.09, 47.5), p(2.41, 47.5), p(2.41, 22.5), p(0.09, 22.5))} fill="#ffe3c8" />
      <text
        transform={`matrix(1 0.5 0 1 ${mid[0].toFixed(1)} ${mid[1].toFixed(1)})`}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="700"
        letterSpacing="-0.05em"
        fill="#ef4c00"
      >
        peel
      </text>
      <polygon points={pts(p(0.55, 26.5), p(1.95, 26.5), p(1.95, 24.5), p(0.55, 24.5))} fill="rgba(239,76,0,0.45)" />
    </g>
  );
}
