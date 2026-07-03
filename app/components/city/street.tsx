import type { CSSProperties, ReactNode } from "react";
import { PAL, U, V, px, pts } from "./iso";

/* ── Street furniture, greenery, and pedestrians ───────────────────────── */

export function Tree({ gx, gy, s = 1 }: { gx: number; gy: number; s?: number }) {
  const [x, y] = px(gx, gy);
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s})`}>
      <ellipse cx="3" cy="1.4" rx="8" ry="2.8" fill="rgba(96,22,0,0.22)" />
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
      <polygon points={pts(px(gx, gy, 10.5), px(gx + len, gy, 10.5), px(gx + len, gy, 6), px(gx, gy, 6))} fill="#b5541e" />
      <polygon points={pts(px(gx, gy, 5), px(gx + len, gy, 5), px(gx + len, gy + 0.24, 5), px(gx, gy + 0.24, 5))} fill="#c9691f" />
      <polygon points={pts(px(gx, gy + 0.24, 5), px(gx + len, gy + 0.24, 5), px(gx + len, gy + 0.24, 3.5), px(gx, gy + 0.24, 3.5))} fill="#8f3c0e" />
      <polygon points={pts(px(gx + 0.08, gy + 0.24, 3.5), px(gx + 0.2, gy + 0.24, 3.5), px(gx + 0.2, gy + 0.24, 0), px(gx + 0.08, gy + 0.24, 0))} fill="#6e2606" />
      <polygon points={pts(px(gx + len - 0.2, gy + 0.24, 3.5), px(gx + len - 0.08, gy + 0.24, 3.5), px(gx + len - 0.08, gy + 0.24, 0), px(gx + len - 0.2, gy + 0.24, 0))} fill="#6e2606" />
    </g>
  );
}

/* Signal head cycling red → green → amber on a shared 14s clock. Opposing
   street directions pass `phase` (a negative delay) so the two axes alternate
   instead of changing in lockstep. */
export function TrafficLight({ gx, gy, phase }: { gx: number; gy: number; phase?: string }) {
  const [x, y] = px(gx, gy);
  const lamps: Array<[number, string, string]> = [
    [-41.2, "#ff5b3d", "iso-lamp-red"],
    [-36.7, "#ffb45e", "iso-lamp-amber"],
    [-32.2, "#a8cf8f", "iso-lamp-green"],
  ];
  const phased = phase ? ({ animationDelay: phase } as CSSProperties) : undefined;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      <ellipse cx="1" cy="0.6" rx="3" ry="1.1" fill={PAL.shadow} />
      <rect x="-1" y="-30" width="2" height="30" fill={PAL.pole} />
      <rect x="-4" y="-45" width="8" height="16.5" rx="2" fill="#331004" />
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

export function Walker({
  fill = PAL.ink,
  s = 1,
  gait = "0.58s",
  delay = "0s",
}: {
  fill?: string;
  s?: number;
  gait?: string;
  delay?: string;
}) {
  return (
    <g transform={s === 1 ? undefined : `scale(${s})`}>
      <ellipse cx="1.2" cy="0.6" rx="3.6" ry="1.3" fill={PAL.shadow} />
      <g className="iso-bob" style={{ "--iso-gait": gait, animationDelay: delay } as CSSProperties}>
        <circle cx="0" cy="-12.6" r="2.2" fill={fill} />
        <path d="M -2 -10.2 Q 0 -11.4 2 -10.2 L 1.5 -4.4 L -1.5 -4.4 Z" fill={fill} />
        <path d="M -1.4 -4.4 L -2.1 -0.2 L -0.9 -0.2 L -0.4 -4.4 Z" fill={fill} />
        <path d="M 0.4 -4.4 L 0.9 -0.2 L 2.1 -0.2 L 1.4 -4.4 Z" fill={fill} />
      </g>
    </g>
  );
}

export function Runner({ fill = PAL.ink }: { fill?: string }) {
  return (
    <g>
      <ellipse cx="1.2" cy="0.6" rx="4" ry="1.3" fill={PAL.shadow} />
      <g className="iso-bob" style={{ "--iso-gait": "0.36s" } as CSSProperties}>
        <circle cx="3.1" cy="-11.8" r="2.1" fill={fill} />
        <path d="M -0.6 -9.6 Q 1.4 -11 3 -9.8 L 1.8 -4.6 L -1 -5.2 Z" fill={fill} />
        <path d="M 2.6 -8.8 L 5 -7.2 L 4.4 -6.4 L 2 -8 Z" fill={fill} />
        <path d="M 1.4 -5 L 4.6 -1.4 L 3.6 -0.6 L 0.6 -4.2 Z" fill={fill} />
        <path d="M -0.6 -5 L -3.8 -2.6 L -3 -1.6 L 0 -4.2 Z" fill={fill} />
      </g>
    </g>
  );
}

export function WheelchairUser({ fill = PAL.ink }: { fill?: string }) {
  return (
    <g>
      <ellipse cx="1.5" cy="0.6" rx="4.4" ry="1.4" fill={PAL.shadow} />
      <circle cx="-0.6" cy="-12" r="2.1" fill={fill} />
      <path d="M -2.4 -10 Q -0.8 -10.8 0.6 -9.9 L 1.4 -6.2 L 3.8 -5.8 L 3.6 -4.6 L 0.2 -4.8 L -2.6 -5.6 Z" fill={fill} />
      <path d="M -3.4 -11 L -2.4 -11 L -2.2 -5.4 L -3.2 -5.4 Z" fill={PAL.inkSoft} />
      <g className="iso-roll">
        <circle cx="-0.6" cy="-3" r="3.1" fill="none" stroke={PAL.inkSoft} strokeWidth="1.1" />
        <path d="M -0.6 -5.6 L -0.6 -0.4 M -3.2 -3 L 2 -3" stroke={PAL.inkSoft} strokeWidth="0.7" />
      </g>
      <circle cx="3.9" cy="-1" r="1.1" fill="none" stroke={PAL.inkSoft} strokeWidth="0.9" />
      <path d="M 3 -4.6 L 4.4 -4.2 L 4.2 -3.4 L 2.8 -3.8 Z" fill={PAL.inkSoft} />
    </g>
  );
}

export function GroupWalkers() {
  return (
    <g>
      <g transform="translate(-8 -4)">
        <Walker fill={PAL.ink} delay="-0.1s" />
      </g>
      <Walker fill={PAL.creamInk} delay="-0.35s" />
      <g transform="translate(7 3.5)">
        <Walker fill={PAL.inkSoft} s={0.78} delay="-0.22s" />
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

function zone(gx0: number, gy0: number, gx1: number, gy1: number, fill: string, opacity?: number) {
  return (
    <polygon
      points={pts(px(gx0, gy0), px(gx1, gy0), px(gx1, gy1), px(gx0, gy1))}
      fill={fill}
      opacity={opacity}
    />
  );
}

/* The floating plate: lots, park, sidewalks, streets, markings, pond. */
export function Ground() {
  const dashes: ReactNode[] = [];
  for (const start of [0.6, 13.4]) {
    for (let g = start; g < (start < 10 ? 8.6 : 22); g += 1.9) {
      dashes.push(
        <g key={`a${g}`}>{zone(g, 11.08, g + 1, 11.32, PAL.mark, 0.35)}</g>,
        <g key={`c${g}`}>{zone(11.08, g, 11.32, g + 1, PAL.mark, 0.35)}</g>,
      );
    }
  }
  const zebra: ReactNode[] = [];
  for (const [x0, x1] of [
    [9.38, 9.92],
    [12.48, 13.02],
  ] as const) {
    for (let g = 10.2; g < 12.2; g += 0.56) {
      zebra.push(<g key={`za${x0}-${g}`}>{zone(x0, g, x1, g + 0.3, PAL.mark, 0.55)}</g>);
      zebra.push(<g key={`zc${x0}-${g}`}>{zone(g, x0, g + 0.3, x1, PAL.mark, 0.55)}</g>);
    }
  }
  return (
    <g>
      {/* the diorama floats on the page — soft pooled shadow, then the plate */}
      <ellipse cx={px(11.5, 11.5)[0]} cy={px(11.5, 11.5)[1] + 26} rx="480" ry="120" fill="rgba(70,14,0,0.16)" />
      <ellipse cx={px(11.5, 11.5)[0]} cy={px(11.5, 11.5)[1] + 18} rx="380" ry="92" fill="rgba(70,14,0,0.16)" />
      <polygon points={pts(px(0, 23), px(23, 23), px(23, 23, -10), px(0, 23, -10))} fill={PAL.plateLeft} />
      <polygon points={pts(px(23, 0), px(23, 23), px(23, 23, -10), px(23, 0, -10))} fill={PAL.plateRight} />
      <polygon points={pts(px(0, 0), px(23, 0), px(23, 23), px(0, 23))} fill={PAL.plateTop} />
      {/* lots, park, sidewalks, streets */}
      {zone(0, 0, 9.3, 9.3, PAL.lot)}
      {zone(13.1, 0, 23, 9.3, PAL.lot)}
      {zone(13.1, 13.1, 23, 23, PAL.lot)}
      {zone(0, 13.1, 9.3, 23, PAL.park)}
      {zone(0, 9.3, 23, 10, PAL.sidewalk)}
      {zone(0, 12.4, 23, 13.1, PAL.sidewalk)}
      {zone(9.3, 0, 10, 23, PAL.sidewalk)}
      {zone(12.4, 0, 13.1, 23, PAL.sidewalk)}
      {zone(0, 10, 23, 12.4, PAL.road)}
      {zone(10, 0, 12.4, 23, PAL.road)}
      {dashes}
      {zebra}
      {/* park paths meeting at a small plaza, and the pond */}
      {zone(1, 17.25, 9.3, 17.95, PAL.path)}
      {zone(4.65, 13.1, 5.35, 22, PAL.path)}
      <ellipse cx={px(5, 17.6)[0]} cy={px(5, 17.6)[1]} rx={U * 0.9} ry={V * 0.9} fill={PAL.path} />
      <ellipse cx={px(2.9, 15.1)[0]} cy={px(2.9, 15.1)[1]} rx={U * 1.55} ry={V * 1.55} fill={PAL.waterRim} />
      <ellipse cx={px(2.9, 15.1)[0]} cy={px(2.9, 15.1)[1]} rx={U * 1.3} ry={V * 1.3} fill={PAL.water} />
      <ellipse cx={px(2.55, 14.8)[0]} cy={px(2.55, 14.8)[1]} rx={U * 0.5} ry={V * 0.5} fill="rgba(255,255,255,0.28)" />
    </g>
  );
}
