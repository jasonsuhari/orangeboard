import { FIG, PAL, px, pts } from "./iso";
import { Walker, WheelchairUser } from "./street";

/* ── Street clutter and rolling stock for the belt tiles ───────────────── */

/* A small grid-aligned box (same shading trick as the pedestrian cubes):
   flat color, darkened +gx face, lightened top. Base sits at z0. */
export function GridBox({
  gx,
  gy,
  w,
  d,
  h,
  z0 = 0,
  color,
}: {
  gx: number;
  gy: number;
  w: number;
  d: number;
  h: number;
  z0?: number;
  color: string;
}) {
  const zt = z0 + h;
  const left = pts(px(gx, gy + d, zt), px(gx + w, gy + d, zt), px(gx + w, gy + d, z0), px(gx, gy + d, z0));
  const right = pts(px(gx + w, gy, zt), px(gx + w, gy + d, zt), px(gx + w, gy + d, z0), px(gx + w, gy, z0));
  const top = pts(px(gx, gy, zt), px(gx + w, gy, zt), px(gx + w, gy + d, zt), px(gx, gy + d, zt));
  return (
    <g>
      <polygon points={left} fill={color} />
      <polygon points={right} fill={color} />
      <polygon points={right} fill="rgba(20,30,50,0.28)" />
      <polygon points={top} fill={color} />
      <polygon points={top} fill="rgba(255,255,255,0.38)" />
    </g>
  );
}

/* Cars and buses, drawn centered at the origin so a Mover can drive them
   down a lane. `axis` is the direction of travel: "x" rides the avenue. */
export function Vehicle({
  kind = "car",
  color = FIG.blue,
  axis = "x",
}: {
  kind?: "car" | "bus";
  color?: string;
  axis?: "x" | "y";
}) {
  const L = kind === "bus" ? 2.6 : 1.45;
  const W = 0.64;
  const bodyH = kind === "bus" ? 7.5 : 4.6;
  const box = (u0: number, uLen: number, v0: number, vLen: number, z0: number, h: number, fill: string) =>
    axis === "x" ? (
      <GridBox gx={u0} gy={v0} w={uLen} d={vLen} z0={z0} h={h} color={fill} />
    ) : (
      <GridBox gx={v0} gy={u0} w={vLen} d={uLen} z0={z0} h={h} color={fill} />
    );
  const wheel = (u: number) => {
    const [wx, wy] = axis === "x" ? px(u, W / 2) : px(W / 2, u);
    return <ellipse cx={wx} cy={wy} rx="2" ry="1.5" fill="#1f2833" />;
  };
  const winMid = axis === "x" ? px(0, W / 2, bodyH * 0.42) : px(W / 2, 0, bodyH * 0.42);
  const slope = axis === "x" ? 0.5 : -0.5;
  return (
    <g>
      <ellipse cx="0" cy="1.5" rx={L * 9} ry="3.6" fill={PAL.shadow} />
      {box(-L / 2, L, -W / 2, W, 0.8, bodyH, color)}
      {kind === "car" ? (
        box(-L * 0.36, L * 0.55, -W * 0.42, W * 0.84, 0.8 + bodyH, 3.2, "#2b3442")
      ) : (
        <text
          transform={`matrix(1 ${slope} 0 1 ${winMid[0].toFixed(1)} ${(winMid[1] + 1.4).toFixed(1)})`}
          textAnchor="middle"
          fontSize="3.6"
          fontWeight="700"
          letterSpacing="-0.03em"
          fill="#fff4ea"
        >
          peel
        </text>
      )}
      {kind === "bus" && box(-L * 0.44, L * 0.88, -W * 0.5, W, 0.8 + bodyH * 0.55, bodyH * 0.4, "#2b3442")}
      {wheel(-L * 0.3)}
      {wheel(L * 0.3)}
    </g>
  );
}

/* Open-sided shelter on the avenue sidewalk; roof rides above head height
   so pedestrians can walk through it without z-order artifacts. */
export function BusStop({ gx, gy }: { gx: number; gy: number }) {
  const H = 16;
  const post = (u: number) =>
    pts(px(u, gy + 0.58, H), px(u + 0.08, gy + 0.58, H), px(u + 0.08, gy + 0.58, 0), px(u, gy + 0.58, 0));
  const [sx, sy] = px(gx + 1.72, gy + 0.5);
  return (
    <g>
      <polygon
        points={pts(px(gx, gy, H - 2), px(gx + 1.5, gy, H - 2), px(gx + 1.5, gy, 2.5), px(gx, gy, 2.5))}
        fill="rgba(150,180,205,0.4)"
      />
      <polygon
        points={pts(px(gx, gy, H - 2), px(gx + 1.5, gy, H - 2), px(gx + 1.5, gy, H - 3.4), px(gx, gy, H - 3.4))}
        fill={PAL.pole}
      />
      <polygon points={post(gx + 0.06)} fill={PAL.pole} />
      <polygon points={post(gx + 1.36)} fill={PAL.pole} />
      <GridBox gx={gx - 0.1} gy={gy - 0.1} w={1.7} d={0.78} z0={H} h={1.4} color="#8fa3b8" />
      {/* stop flag */}
      <rect x={sx - 0.7} y={sy - 15} width="1.4" height="15" fill={PAL.pole} />
      <rect x={sx - 2.6} y={sy - 20} width="5.2" height="5.2" rx="1" fill="#ef5a10" />
    </g>
  );
}

export function Dumpster({ gx, gy }: { gx: number; gy: number }) {
  return (
    <g>
      <GridBox gx={gx} gy={gy} w={0.95} d={0.55} h={5.5} color="#5d7268" />
      <polygon
        points={pts(px(gx + 0.06, gy + 0.55, 3), px(gx + 0.89, gy + 0.55, 3), px(gx + 0.89, gy + 0.55, 0.8), px(gx + 0.06, gy + 0.55, 0.8))}
        fill="rgba(0,0,0,0.14)"
      />
    </g>
  );
}

/* A small street parade: banner up front, cube people marching behind. */
export function Parade() {
  const [p1x, p1y] = px(0.55, -0.35);
  const [p2x, p2y] = px(0.55, 0.35);
  const marchers: Array<[number, number, string, string]> = [
    [-4, -3, FIG.orange, "-0.1s"],
    [-7, 4, FIG.teal, "-0.32s"],
    [-17, -5, FIG.blue, "-0.2s"],
    [-20, 3, FIG.navy, "-0.45s"],
  ];
  return (
    <g>
      {/* banner */}
      <rect x={p1x - 0.7} y={p1y - 21} width="1.4" height="21" fill={PAL.pole} />
      <rect x={p2x - 0.7} y={p2y - 21} width="1.4" height="21" fill={PAL.pole} />
      <polygon
        points={`${p1x},${p1y - 20} ${p2x},${p2y - 20} ${p2x},${p2y - 11} ${p1x},${p1y - 11}`}
        fill="#ef5a10"
      />
      <polygon
        points={`${p1x},${p1y - 13} ${p2x},${p2y - 13} ${p2x},${p2y - 11} ${p1x},${p1y - 11}`}
        fill="#fff4ea"
      />
      {marchers.map(([mx, my, color, delay], i) => (
        <g key={i} transform={`translate(${mx} ${my})`}>
          <Walker color={color} delay={delay} />
        </g>
      ))}
      <g transform="translate(-31 0)">
        <WheelchairUser color={FIG.orange} />
      </g>
    </g>
  );
}
