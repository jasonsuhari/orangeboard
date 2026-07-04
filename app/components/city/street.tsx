import type { CSSProperties, ReactNode } from "react";
import { FIG, PAL, PLATE_D, PLATE_W, px, pts } from "./iso";

/* ── Street furniture, greenery, and pedestrians ───────────────────────── */

export function Tree({ gx, gy, s = 1 }: { gx: number; gy: number; s?: number }) {
  const [x, y] = px(gx, gy);
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s})`}>
      <ellipse cx="3" cy="1.4" rx="8" ry="2.8" fill="rgba(25,35,50,0.22)" />
      <polygon points="-1.3,0 1.3,0 1,-8 -1,-8" fill={PAL.trunk} />
      <circle cx="-4.6" cy="-10.8" r="5.2" fill={PAL.sageB} />
      <circle cx="4.4" cy="-11.4" r="5.6" fill={PAL.sageC} />
      <circle cx="0" cy="-15" r="7.5" fill={PAL.sageA} />
    </g>
  );
}

export function Bench({ gx, gy, len = 1.05 }: { gx: number; gy: number; len?: number }) {
  return (
    <g>
      <polygon points={pts(px(gx, gy, 10.5), px(gx + len, gy, 10.5), px(gx + len, gy, 6), px(gx, gy, 6))} fill="#a06a3f" />
      <polygon points={pts(px(gx, gy, 5), px(gx + len, gy, 5), px(gx + len, gy + 0.24, 5), px(gx, gy + 0.24, 5))} fill="#b57c4a" />
      <polygon points={pts(px(gx, gy + 0.24, 5), px(gx + len, gy + 0.24, 5), px(gx + len, gy + 0.24, 3.5), px(gx, gy + 0.24, 3.5))} fill="#7a5230" />
      <polygon points={pts(px(gx + 0.08, gy + 0.24, 3.5), px(gx + 0.2, gy + 0.24, 3.5), px(gx + 0.2, gy + 0.24, 0), px(gx + 0.08, gy + 0.24, 0))} fill="#54402c" />
      <polygon points={pts(px(gx + len - 0.2, gy + 0.24, 3.5), px(gx + len - 0.08, gy + 0.24, 3.5), px(gx + len - 0.08, gy + 0.24, 0), px(gx + len - 0.2, gy + 0.24, 0))} fill="#54402c" />
    </g>
  );
}

/* Signal head cycling red → green → amber on a shared 14s clock. Opposing
   street directions pass `phase` (a negative delay) so the two axes alternate
   instead of changing in lockstep. */
export function TrafficLight({ gx, gy, phase }: { gx: number; gy: number; phase?: string }) {
  const [x, y] = px(gx, gy);
  const lamps: Array<[number, string, string]> = [
    [-41.2, "#ff5d55", "iso-lamp-red"],
    [-36.7, "#ffc061", "iso-lamp-amber"],
    [-32.2, "#7fd98a", "iso-lamp-green"],
  ];
  const phased = phase ? ({ animationDelay: phase } as CSSProperties) : undefined;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      <ellipse cx="1" cy="0.6" rx="3" ry="1.1" fill={PAL.shadow} />
      <rect x="-1" y="-30" width="2" height="30" fill={PAL.pole} />
      <rect x="-4" y="-45" width="8" height="16.5" rx="2" fill="#1f2833" />
      {lamps.map(([cy, fill, cls]) => (
        <g key={cls}>
          <circle cx="0" cy={cy} r="1.9" fill={fill} opacity="0.18" />
          <circle cx="0" cy={cy} r="3.6" fill={fill} fillOpacity="0.3" className={cls} style={phased} />
          <circle cx="0" cy={cy} r="1.9" fill={fill} className={cls} style={phased} />
        </g>
      ))}
    </g>
  );
}

/* A tiny screen-space iso cube: base diamond centered at (0, yBase), flat
   color on the left face, shaded right face, lightened top. The building
   blocks of every voxel pedestrian. */
function Cube({ u, h, yBase, color }: { u: number; h: number; yBase: number; color: string }) {
  const v = u / 2;
  const top = `${-u},${yBase - h} 0,${yBase - h - v} ${u},${yBase - h} 0,${yBase - h + v}`;
  const left = `${-u},${yBase - h} 0,${yBase - h + v} 0,${yBase + v} ${-u},${yBase}`;
  const right = `${u},${yBase - h} 0,${yBase - h + v} 0,${yBase + v} ${u},${yBase}`;
  return (
    <g>
      <polygon points={left} fill={color} />
      <polygon points={right} fill={color} />
      <polygon points={right} fill="rgba(20,30,50,0.28)" />
      <polygon points={top} fill={color} />
      <polygon points={top} fill="rgba(255,255,255,0.4)" />
    </g>
  );
}

export function Walker({
  color = FIG.blue,
  s = 1,
  gait = "0.58s",
  delay = "0s",
}: {
  color?: string;
  s?: number;
  gait?: string;
  delay?: string;
}) {
  return (
    <g transform={s === 1 ? undefined : `scale(${s})`}>
      <ellipse cx="0.8" cy="0.8" rx="4" ry="1.5" fill={PAL.shadow} />
      <g className="iso-bob" style={{ "--iso-gait": gait, animationDelay: delay } as CSSProperties}>
        <Cube u={3} h={6.5} yBase={0} color={color} />
        <Cube u={2.2} h={4.4} yBase={-7.4} color={FIG.head} />
      </g>
    </g>
  );
}

/* Same voxel build, sprinting gait. */
export function Runner({ color = FIG.orange }: { color?: string }) {
  return (
    <g>
      <ellipse cx="0.8" cy="0.8" rx="4.2" ry="1.5" fill={PAL.shadow} />
      <g className="iso-bob" style={{ "--iso-gait": "0.32s" } as CSSProperties}>
        <Cube u={2.7} h={5.6} yBase={0} color={color} />
        <Cube u={2.1} h={4.2} yBase={-6.6} color={FIG.head} />
      </g>
    </g>
  );
}

/* Seated cube rider: shorter body cube on the chair, rolling side wheel. */
export function WheelchairUser({ color = FIG.teal }: { color?: string }) {
  return (
    <g>
      <ellipse cx="1" cy="0.8" rx="4.6" ry="1.6" fill={PAL.shadow} />
      {/* chair back */}
      <polygon points="-4.2,-9.6 -3,-9.6 -2.8,-4 -4,-4" fill={PAL.inkSoft} />
      <Cube u={2.8} h={4.6} yBase={-2.4} color={color} />
      <Cube u={2.1} h={4.2} yBase={-8.4} color={FIG.head} />
      <g className="iso-roll">
        <circle cx="-1" cy="-2.8" r="3.2" fill="none" stroke={PAL.inkSoft} strokeWidth="1.1" />
        <path d="M -1 -5.5 L -1 -0.1 M -3.7 -2.8 L 1.7 -2.8" stroke={PAL.inkSoft} strokeWidth="0.7" />
      </g>
      <circle cx="3.6" cy="-0.9" r="1.1" fill="none" stroke={PAL.inkSoft} strokeWidth="0.9" />
      <path d="M 2.6 -4.2 L 4.2 -3.8 L 4 -3 L 2.4 -3.4 Z" fill={PAL.inkSoft} />
    </g>
  );
}

export function GroupWalkers() {
  return (
    <g>
      <g transform="translate(-8 -4)">
        <Walker color={FIG.blue} delay="-0.1s" />
      </g>
      <Walker color={FIG.orange} delay="-0.35s" />
      <g transform="translate(7 3.5)">
        <Walker color={FIG.teal} s={0.78} delay="-0.22s" />
      </g>
    </g>
  );
}

/* Carries a figure along a straight sidewalk. The path lives in CSS vars so
   one shared keyframe animates every pedestrian; the inline transform is the
   reduced-motion resting pose (mid-path). */
export function Mover({
  from,
  to,
  dur,
  delay,
  flip = false,
  children,
}: {
  from: [number, number];
  to: [number, number];
  dur: number;
  delay: number;
  flip?: boolean;
  children: ReactNode;
}) {
  const [x0, y0] = px(from[0], from[1]);
  const [x1, y1] = px(to[0], to[1]);
  return (
    <g
      className="iso-mover"
      style={
        {
          transform: `translate(${((x0 + x1) / 2).toFixed(1)}px, ${((y0 + y1) / 2).toFixed(1)}px)`,
          "--iso-x0": `${x0.toFixed(1)}px`,
          "--iso-y0": `${y0.toFixed(1)}px`,
          "--iso-x1": `${x1.toFixed(1)}px`,
          "--iso-y1": `${y1.toFixed(1)}px`,
          "--iso-dur": `${dur}s`,
          "--iso-delay": `${delay}s`,
        } as CSSProperties
      }
    >
      {flip ? <g transform="scale(-1 1)">{children}</g> : children}
    </g>
  );
}

export function zone(gx0: number, gy0: number, gx1: number, gy1: number, fill: string, opacity?: number) {
  return (
    <polygon
      points={pts(px(gx0, gy0), px(gx1, gy0), px(gx1, gy1), px(gx0, gy1))}
      fill={fill}
      opacity={opacity}
    />
  );
}

/* The fixed slab the belt runs across: pooled shadow, thick cut sides with a
   strata line, and the bare plate top. The city surface itself is drawn by
   the belt tiles (tiles.tsx), clipped to this plate's top diamond. */
export function Plate() {
  const cx = px(PLATE_W / 2, PLATE_D / 2);
  return (
    <g>
      <ellipse cx={cx[0]} cy={cx[1] + 52} rx="500" ry="125" fill="rgba(80,20,0,0.18)" />
      <ellipse cx={cx[0]} cy={cx[1] + 42} rx="395" ry="96" fill="rgba(80,20,0,0.18)" />
      <polygon
        points={pts(px(0, PLATE_D), px(PLATE_W, PLATE_D), px(PLATE_W, PLATE_D, -34), px(0, PLATE_D, -34))}
        fill={PAL.plateLeft}
      />
      <polygon
        points={pts(px(PLATE_W, 0), px(PLATE_W, PLATE_D), px(PLATE_W, PLATE_D, -34), px(PLATE_W, 0, -34))}
        fill={PAL.plateRight}
      />
      <polygon
        points={pts(px(0, PLATE_D, -4), px(PLATE_W, PLATE_D, -4), px(PLATE_W, PLATE_D, -8), px(0, PLATE_D, -8))}
        fill="rgba(255,255,255,0.14)"
      />
      <polygon
        points={pts(px(PLATE_W, 0, -4), px(PLATE_W, PLATE_D, -4), px(PLATE_W, PLATE_D, -8), px(PLATE_W, 0, -8))}
        fill="rgba(255,255,255,0.08)"
      />
      <polygon points={pts(px(0, 0), px(PLATE_W, 0), px(PLATE_W, PLATE_D), px(0, PLATE_D))} fill={PAL.plateTop} />
    </g>
  );
}
