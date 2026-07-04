import { memo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BELT_DUR_S, FIG, PAL, TILE_W, U, V, hashSeed, mulberry32, px, BASE_SEED } from "./iso";
import { BusStop, Dumpster, Parade, Vehicle } from "./props";
import { Apartment, Bodega, RooftopBillboard, StreetBillboard, Tower, WallBillboard } from "./structures";
import {
  Bench,
  GroupWalkers,
  Mover,
  Runner,
  TrafficLight,
  Tree,
  Walker,
  WheelchairUser,
  zone,
} from "./street";

/* ── Belt tiles ──────────────────────────────────────────────────────────
   Each tile is a TILE_W-wide strip of city in tile-local coordinates
   (gx 0..TILE_W, gy 0..PLATE_D): two lots flanking the avenue plus a cross
   street flush against the tile's east edge, so adjacent tiles chain
   [lot][corridor][lot][corridor]… seamlessly. A seeded generator mints the
   fixed ring of BELT_RING blocks that loop around the belt — a pure
   function of the tile index, identical on server and client.

   Every prop carries its local-x anchor so the renderer can fade the west
   and east halves of a tile on staggered windows that track when each half
   actually crosses the plate rim — the block materializes as it arrives
   rather than popping in late. */

const AVE = { sw0: 9.3, r0: 10, r1: 12.4, sw1: 13.1 } as const;
const CROSS = { sw0: 8.2, r0: 8.9, r1: 11.3, sw1: 12 } as const;
const LOT_N = { x0: 1, x1: 7.2, y0: 1, y1: 8.3 } as const;
const LOT_S = { x0: 1, x1: 7.2, y0: 14.1, y1: 23 } as const;

type Item = { d: number; x: number; node: ReactNode };
type Rng = () => number;
type LotBounds = { x0: number; x1: number; y0: number; y1: number };
type Add = (d: number, x: number, n: ReactNode) => void;

const SIGNS = ["BODEGA", "DELI", "MARKET", "CORNER"] as const;
const PED_COLORS = [FIG.blue, FIG.teal, FIG.navy, FIG.orange] as const;
const CAR_COLORS = [FIG.blue, FIG.teal, FIG.navy, "#e9eef3", "#8b9fb4"] as const;

const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);
const pick = <T,>(rng: Rng, arr: readonly T[]) => arr[Math.floor(rng() * arr.length)];
const tone = (rng: Rng) => (rng() < 0.5 ? "light" : ("slate" as const));

/* ── Street walls ──────────────────────────────────────────────────────
   Real blocks aren't scattered towers: buildings stand shoulder to
   shoulder in rows with aligned façades. A row partitions the lot width
   into touching segments — varied widths, heights, and tones — with the
   odd pocket park breaking the wall. Only the last building's east flank
   is exposed, so that's where wall boards hang. */

type RowCfg = {
  x0: number;
  x1: number;
  front: number; // the aligned façade line (gy of the +gy face)
  d: number;
  hMin: number;
  hMax: number;
  boardSeg?: boolean; // force a wide first segment carrying a rooftop board
  retail?: boolean; // low shopfronts with a bodega worked into the wall
  apartments?: boolean;
};

function buildingRow(rng: Rng, cfg: RowCfg, add: Add, key: string) {
  const widths: number[] = [];
  let rem = cfg.x1 - cfg.x0;
  if (cfg.boardSeg) {
    widths.push(Math.min(2.75, rem));
    rem -= widths[0];
  }
  while (rem > 0.05) {
    let w = Math.min(rem, between(rng, 1.5, 2.7));
    if (rem - w < 1.3) w = rem;
    widths.push(w);
    rem -= w;
  }
  let x = cfg.x0;
  let hasBodega = false;
  widths.forEach((w, i) => {
    const isBoardSeg = Boolean(cfg.boardSeg) && i === 0;
    const last = i === widths.length - 1;
    const d = cfg.d + (rng() - 0.5) * 0.3;
    const gy = cfg.front - d;
    const kSeg = `${key}-s${i}`;
    if (!isBoardSeg && widths.length > 2 && rng() < 0.12) {
      /* pocket park in the wall */
      const tx = x + w / 2;
      add(tx + cfg.front - 0.7 + 1, tx, <Tree key={kSeg} gx={tx} gy={cfg.front - 0.8} s={0.75} />);
      if (w > 1.9)
        add(x + 0.3 + cfg.front - 1.9 + 1, x + 0.3, <Tree key={`${kSeg}b`} gx={x + 0.3} gy={cfg.front - 1.8} s={0.6} />);
    } else if (cfg.retail && !hasBodega && (rng() < 0.4 || last) && w >= 1.5 && w <= 2.3) {
      hasBodega = true;
      add(
        x + cfg.front - 1.4 + w + 1.4,
        x + w / 2,
        <Bodega key={kSeg} gx={x} gy={cfg.front - 1.4} w={w} d={1.4} h={between(rng, 22, 26)} sign={pick(rng, SIGNS)} />,
      );
    } else {
      const h = isBoardSeg ? between(rng, 140, 190) : between(rng, cfg.hMin, cfg.hMax);
      const floors = Math.max(2, Math.round(h / 16.5));
      const t = tone(rng);
      const seed = Math.floor(rng() * 97);
      const apt = Boolean(cfg.apartments) && w >= 2.1 && rng() < 0.7;
      add(
        x + gy + w + d,
        x + w / 2,
        <g key={kSeg}>
          {apt ? (
            <Apartment gx={x} gy={gy} w={w} d={d} h={h} floors={floors} cols={w > 2.3 ? 3 : 2} tone={t} seed={seed} />
          ) : (
            <Tower gx={x} gy={gy} w={w} d={d} h={h} floors={floors} cols={w > 2.3 ? 3 : 2} tone={t} seed={seed} />
          )}
          {isBoardSeg && <RooftopBillboard gx={x + (w - 2.6) / 2} gy={gy + Math.min(d - 1, 0.85)} z={h} />}
          {last && !isBoardSeg && h > 55 && rng() < 0.35 && (
            <WallBillboard gx={x + w} gy={gy} u0={0.3} u1={Math.min(d - 0.25, 2)} z0={h * 0.42} z1={h * 0.82} />
          )}
        </g>,
      );
    }
    x += w;
  });
}

/* The service alley between the two rows: dumpsters live here. */
function alley(rng: Rng, b: LotBounds, gy: number, add: Add, key: string) {
  const n = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const dx = between(rng, b.x0 + 0.2, b.x1 - 1.2);
    add(dx + gy + 0.55 + 1, dx, <Dumpster key={`${key}-dump${i}`} gx={dx} gy={gy} />);
  }
}

/* ── Lot archetypes — two aligned street walls per lot ─────────────────── */

function lotDowntown(rng: Rng, b: LotBounds, board: boolean, add: Add, key: string) {
  const backFront = b.y0 + 3.4;
  buildingRow(rng, { x0: b.x0, x1: b.x1, front: backFront, d: 2.6, hMin: 100, hMax: 185, boardSeg: board || rng() < 0.35 }, add, `${key}r0`);
  buildingRow(rng, { x0: b.x0, x1: b.x1, front: b.y1, d: 2.3, hMin: 55, hMax: 120 }, add, `${key}r1`);
  alley(rng, b, backFront + 0.35, add, key);
}

function lotResidential(rng: Rng, b: LotBounds, add: Add, key: string) {
  const backFront = b.y0 + 3.4;
  buildingRow(rng, { x0: b.x0, x1: b.x1, front: backFront, d: 2.6, hMin: 48, hMax: 95, apartments: true }, add, `${key}r0`);
  buildingRow(rng, { x0: b.x0, x1: b.x1, front: b.y1, d: 2.3, hMin: 36, hMax: 66, apartments: true }, add, `${key}r1`);
  alley(rng, b, backFront + 0.35, add, key);
}

function lotCommercial(rng: Rng, b: LotBounds, side: "N" | "S", add: Add, key: string) {
  const backFront = b.y0 + 3.4;
  const retailRow: RowCfg =
    side === "N"
      ? { x0: b.x0, x1: b.x1, front: b.y1, d: 2, hMin: 26, hMax: 44, retail: true }
      : { x0: b.x0, x1: b.x1, front: backFront, d: 2, hMin: 26, hMax: 44, retail: true };
  const officeRow: RowCfg =
    side === "N"
      ? { x0: b.x0, x1: b.x1, front: backFront, d: 2.6, hMin: 42, hMax: 72 }
      : { x0: b.x0, x1: b.x1, front: b.y1, d: 2.6, hMin: 42, hMax: 72 };
  buildingRow(rng, officeRow, add, `${key}r0`);
  buildingRow(rng, retailRow, add, `${key}r1`);
  alley(rng, b, backFront + 0.35, add, key);
}

function lotPark(rng: Rng, b: LotBounds, add: Add, ground: ReactNode[], key: string) {
  const pathY = (b.y0 + b.y1) / 2;
  ground.push(
    <g key={`${key}-grass`}>{zone(b.x0 - 1, b.y0 - 1, b.x1 + 1, b.y1 + 1, PAL.park)}</g>,
    <g key={`${key}-path`}>{zone(b.x0 - 1, pathY - 0.35, b.x1 + 1, pathY + 0.35, PAL.path)}</g>,
    <g key={`${key}-pathv`}>{zone((b.x0 + b.x1) / 2 - 0.35, b.y0 - 1, (b.x0 + b.x1) / 2 + 0.35, b.y1 + 1, PAL.path)}</g>,
  );
  if (rng() < 0.7) {
    const cx = rng() < 0.5 ? between(rng, b.x0 + 1.4, (b.x0 + b.x1) / 2 - 1.6) : between(rng, (b.x0 + b.x1) / 2 + 1.6, b.x1 - 1.4);
    const cy = rng() < 0.5 ? between(rng, b.y0 + 1.3, pathY - 1.6) : between(rng, pathY + 1.6, b.y1 - 1.3);
    const [ex, ey] = px(cx, cy);
    const r = between(rng, 0.9, 1.25);
    ground.push(
      <g key={`${key}-pond`}>
        <ellipse cx={ex} cy={ey} rx={U * (r + 0.25)} ry={V * (r + 0.25)} fill={PAL.waterRim} />
        <ellipse cx={ex} cy={ey} rx={U * r} ry={V * r} fill={PAL.water} />
        <ellipse cx={ex - 8} cy={ey - 4} rx={U * r * 0.35} ry={V * r * 0.35} fill="rgba(255,255,255,0.28)" />
      </g>,
    );
  }
  const trees = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < trees; i++) {
    const tx = between(rng, b.x0, b.x1);
    const above = rng() < 0.5;
    const ty = above ? between(rng, b.y0, pathY - 1.1) : between(rng, pathY + 1.1, b.y1);
    add(tx + ty + 1, tx, <Tree key={`${key}-t${i}`} gx={tx} gy={ty} s={between(rng, 0.7, 1.15)} />);
  }
  for (let i = 0; i < 2; i++) {
    const bx = between(rng, b.x0 + 0.4, b.x1 - 1.6);
    add(bx + pathY - 0.5 + 1.3, bx, <Bench key={`${key}-b${i}`} gx={bx} gy={pathY - 0.55} />);
  }
  const wheel = rng() < 0.4;
  add(
    pathY + 7,
    6.5,
    <Mover key={`${key}-ped`} from={[b.x0 - 0.6, pathY]} to={[b.x1 + 0.8, pathY]} dur={between(rng, 14, 20)} delay={-rng() * 14}>
      {wheel ? <WheelchairUser color={pick(rng, PED_COLORS)} /> : <Walker color={pick(rng, PED_COLORS)} />}
    </Mover>,
  );
}

function lotPlaza(rng: Rng, b: LotBounds, add: Add, ground: ReactNode[], key: string) {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const [ex, ey] = px(cx, cy);
  ground.push(<ellipse key={`${key}-circle`} cx={ex} cy={ey} rx={U * 2} ry={V * 2} fill={PAL.path} />);
  const w = between(rng, 2.4, 2.8);
  const gx = rng() < 0.5 ? b.x0 + rng() * 0.4 : b.x1 - w - rng() * 0.4;
  const d = between(rng, 2, 2.4);
  add(
    gx + b.y0 + 0.3 + w + d,
    gx + w / 2,
    <Tower key={`${key}-hall`} gx={gx} gy={b.y0 + 0.3} w={w} d={d} h={between(rng, 48, 70)} floors={3} cols={3} tone={tone(rng)} seed={Math.floor(rng() * 97)} />,
  );
  const trees = 4 + Math.floor(rng() * 2);
  for (let i = 0; i < trees; i++) {
    const tx = between(rng, b.x0, b.x1);
    const ty = between(rng, b.y0 + d + 0.8, b.y1);
    add(tx + ty + 1, tx, <Tree key={`${key}-t${i}`} gx={tx} gy={ty} s={between(rng, 0.75, 1.05)} />);
  }
  add(cx + cy + 1.3, cx, <Bench key={`${key}-bench`} gx={cx - 0.5} gy={cy - 0.3} />);
  add(b.x0 + b.y1 + 0.6, b.x0, <Dumpster key={`${key}-dump`} gx={b.x0 + 0.2} gy={b.y1 - 0.75} />);
}

/* ── Tile assembly ─────────────────────────────────────────────────────── */

type LotKind = "downtown" | "residential" | "commercial" | "park" | "plaza";

function pickLot(rng: Rng): LotKind {
  const r = rng();
  if (r < 0.32) return "downtown";
  if (r < 0.64) return "residential";
  if (r < 0.9) return "commercial";
  return "plaza";
}

function buildLot(rng: Rng, kind: LotKind, side: "N" | "S", board: boolean, add: Add, ground: ReactNode[], key: string) {
  const b = side === "N" ? LOT_N : LOT_S;
  if (kind === "downtown") lotDowntown(rng, b, board, add, key);
  else if (kind === "residential") lotResidential(rng, b, add, key);
  else if (kind === "commercial") lotCommercial(rng, b, side, add, key);
  else if (kind === "park") lotPark(rng, b, add, ground, key);
  else lotPlaza(rng, b, add, ground, key);
}

/* Sidewalk-front extras along the avenue and the corridor edge strip. */
function frontage(rng: Rng, northKind: LotKind, board: boolean, add: Add, key: string) {
  /* guaranteed ground board rides the north frontage on board tiles;
     otherwise it still shows up often — boards are the product */
  if (board || rng() < 0.45) {
    const sx = between(rng, 1, 4.3);
    add(sx + 8.95 + 2.5, sx + 1.25, <StreetBillboard key={`${key}-board`} gx={sx} gy={8.95} />);
    if (rng() < 0.55) {
      const bx = Math.min(sx + 3, 5.4);
      add(16.9, bx, <BusStop key={`${key}-stop`} gx={bx} gy={9.38} />);
    }
  } else {
    const bx = between(rng, 1.4, 5);
    add(16.9, bx, <BusStop key={`${key}-stop`} gx={bx} gy={9.38} />);
    if (northKind !== "commercial") {
      const fx = between(rng, 1.2, 5.6);
      add(15, fx, <Bench key={`${key}-fbench`} gx={fx} gy={8.85} />);
    }
  }
  /* south frontage: bench or dumpster + a street tree */
  if (rng() < 0.5) {
    const bx = between(rng, 1.2, 5.6);
    add(18.2, bx, <Bench key={`${key}-sbench`} gx={bx} gy={13.5} />);
  } else {
    const dx = between(rng, 1.2, 5.8);
    add(18.25, dx, <Dumpster key={`${key}-sdump`} gx={dx} gy={13.45} />);
  }
  const stx = between(rng, 1.5, 5.5);
  add(Math.max(18.3, stx + 14.7), stx, <Tree key={`${key}-stree`} gx={stx} gy={13.7} s={0.65} />);
  /* corridor edge strip */
  const e1 = between(rng, 2, 6.5);
  add(7.7 + e1 + 1, 7.7, <Tree key={`${key}-etree1`} gx={7.7} gy={e1} s={0.7} />);
  const e2 = between(rng, 15, 21);
  add(7.7 + e2 + 1, 7.7, <Tree key={`${key}-etree2`} gx={7.7} gy={e2} s={0.75} />);
  if (rng() < 0.4) add(7.6 + 7.4 + 1, 7.5, <Dumpster key={`${key}-edump`} gx={7.5} gy={7.2} />);
}

/* Cars, buses, and the occasional parade on the roads. Movers span the
   whole tile, so they ride the late-fading east half. */
function traffic(rng: Rng, add: Add, key: string) {
  const eastBus = rng() < 0.35;
  const dur1 = eastBus ? between(rng, 7, 9) : between(rng, 4.5, 6.5);
  add(
    17.65,
    9,
    <Mover key={`${key}-veh1`} from={[0.5, 10.55]} to={[TILE_W - 0.5, 10.55]} dur={dur1} delay={-rng() * dur1}>
      <Vehicle kind={eastBus ? "bus" : "car"} color={eastBus ? "#ef5a10" : pick(rng, CAR_COLORS)} />
    </Mover>,
  );
  const dur2 = between(rng, 4.5, 6.5);
  add(
    17.8,
    9,
    <Mover key={`${key}-veh2`} from={[TILE_W - 0.5, 11.85]} to={[0.5, 11.85]} dur={dur2} delay={-rng() * dur2}>
      <Vehicle color={pick(rng, CAR_COLORS)} />
    </Mover>,
  );
  if (rng() < 0.6) {
    const rev = rng() < 0.5;
    const dur = between(rng, 6, 9);
    add(
      18.3,
      9.45,
      <Mover key={`${key}-veh3`} from={[9.45, rev ? 23.5 : 0.5]} to={[9.45, rev ? 0.5 : 23.5]} dur={dur} delay={-rng() * dur}>
        <Vehicle axis="y" color={pick(rng, CAR_COLORS)} />
      </Mover>,
    );
  }
  if (rng() < 0.18) {
    add(
      17.72,
      9,
      <Mover key={`${key}-parade`} from={[0.8, 11.2]} to={[TILE_W - 0.5, 11.2]} dur={30} delay={-rng() * 30}>
        <Parade />
      </Mover>,
    );
  }
}

function buildTile(index: number): { ground: ReactNode; items: Item[] } {
  const rng = mulberry32(hashSeed(BASE_SEED, index));
  const key = `t${index}`;
  const items: Item[] = [];
  const groundExtras: ReactNode[] = [];
  const add: Add = (d, x, n) => items.push({ d, x, node: n });

  /* Every 2nd tile is guaranteed a peel board; parks only appear on
     index % 3 === 2 tiles so two never sit adjacent. */
  const board = index % 2 === 0;
  const parkTile = index % 3 === 2 && rng() < 0.6;
  const parkSide: "N" | "S" = rng() < 0.5 ? "N" : "S";
  const boardKind: LotKind = rng() < 0.5 ? "downtown" : "commercial";
  const northKind: LotKind = board ? boardKind : parkTile && parkSide === "N" ? "park" : pickLot(rng);
  let southKind: LotKind = parkTile && parkSide === "S" ? "park" : pickLot(rng);
  if (northKind === southKind && southKind === "plaza") southKind = "residential";

  buildLot(rng, northKind, "N", board, add, groundExtras, `${key}n`);
  buildLot(rng, southKind, "S", false, add, groundExtras, `${key}s`);
  frontage(rng, northKind, board, add, key);
  traffic(rng, add, key);

  /* Signals at the intersection; opposing axes alternate phase. */
  add(15.5, 8.5, <TrafficLight key={`${key}-tlA`} gx={8.5} gy={9.45} phase="-7s" />);
  add(18.4, 11.65, <TrafficLight key={`${key}-tlB`} gx={11.65} gy={12.85} />);

  /* Avenue pedestrians ride the belt inside their tile; lane depths keep
     them in front of the lot behind and behind the lot ahead. */
  const peds = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < peds; i++) {
    const north = rng() < 0.5;
    const lane = north ? 9.65 : 12.75;
    const depth = north ? 17.5 : 18;
    const rev = rng() < 0.5;
    const from: [number, number] = [rev ? TILE_W - 0.3 : 0.3, lane];
    const to: [number, number] = [rev ? 0.3 : TILE_W - 0.3, lane];
    const kind = rng();
    const color = pick(rng, PED_COLORS);
    const dur = kind < 0.15 ? between(rng, 7, 10) : between(rng, 14, 24);
    add(
      depth,
      9,
      <Mover key={`${key}-p${i}`} from={from} to={to} dur={dur} delay={-rng() * dur} flip={rev && kind < 0.3}>
        {kind < 0.15 ? (
          <Runner color={color} />
        ) : kind < 0.3 ? (
          <WheelchairUser color={color} />
        ) : kind < 0.48 ? (
          <GroupWalkers />
        ) : (
          <Walker color={color} />
        )}
      </Mover>,
    );
  }
  if (rng() < 0.5) {
    const rev = rng() < 0.5;
    const dur = between(rng, 16, 24);
    add(
      33,
      11.65,
      <Mover key={`${key}-px`} from={[11.65, rev ? 23.5 : 0.5]} to={[11.65, rev ? 0.5 : 23.5]} dur={dur} delay={-rng() * dur} flip={rev}>
        <Walker color={pick(rng, PED_COLORS)} />
      </Mover>,
    );
  }

  items.sort((a, b) => a.d - b.d);

  /* Ground: lots, park/plaza extras, then sidewalks, roads, and markings. */
  const dashes: ReactNode[] = [];
  for (const g of [0.5, 2.5, 4.5, 6.5]) {
    dashes.push(<g key={`${key}-da${g}`}>{zone(g, 11.08, g + 1, 11.32, PAL.mark, 0.35)}</g>);
  }
  for (const g of [0.5, 2.5, 4.5, 6.5, 8.5, 12.5, 14.5, 16.5, 18.5, 20.5, 22.5]) {
    dashes.push(<g key={`${key}-dc${g}`}>{zone(9.98, g, 10.22, g + 1, PAL.mark, 0.35)}</g>);
  }
  const zebra: ReactNode[] = [];
  for (const [x0, x1] of [
    [8.28, 8.82],
    [11.38, 11.92],
  ] as const) {
    for (let g = 10.2; g < 12.2; g += 0.56) {
      zebra.push(<g key={`${key}-za${x0}-${g}`}>{zone(x0, g, x1, g + 0.3, PAL.mark, 0.55)}</g>);
    }
  }
  for (const [y0, y1] of [
    [9.38, 9.92],
    [12.48, 13.02],
  ] as const) {
    for (let g = 8.98; g < 11.2; g += 0.56) {
      zebra.push(<g key={`${key}-zc${y0}-${g}`}>{zone(g, y0, g + 0.3, y1, PAL.mark, 0.55)}</g>);
    }
  }

  const ground = (
    <g>
      {zone(0, 0, CROSS.sw0, AVE.sw0, PAL.lot)}
      {zone(0, AVE.sw1, CROSS.sw0, 24, PAL.lot)}
      {groundExtras}
      {zone(0, AVE.sw0, TILE_W, AVE.r0, PAL.sidewalk)}
      {zone(0, AVE.r1, TILE_W, AVE.sw1, PAL.sidewalk)}
      {zone(CROSS.sw0, 0, CROSS.r0, 24, PAL.sidewalk)}
      {zone(CROSS.r1, 0, CROSS.sw1, 24, PAL.sidewalk)}
      {zone(0, AVE.r0, TILE_W, AVE.r1, PAL.road)}
      {zone(CROSS.r0, 0, CROSS.r1, 24, PAL.road)}
      {dashes}
      {zebra}
    </g>
  );

  return { ground, items };
}

/* Memoized layers: shifts only change wrapper transforms/fade classes, so
   React leaves tile DOM (and its running CSS animations) untouched. */
export const TileGround = memo(function TileGround({ index }: { index: number }) {
  return buildTile(index).ground;
});

/* Each prop fades on its own clock: the shared keyframe is delayed by the
   moment that prop's spot crosses the plate rim (x · seconds-per-unit), so
   buildings materialize as they slide on and dissolve as they slide off —
   never hovering beyond the slab. */
const FADE_RATE = BELT_DUR_S / TILE_W; // seconds of belt travel per grid unit

export const TileProps = memo(function TileProps({ index, fade }: { index: number; fade?: "in" | "out" }) {
  const { items } = buildTile(index);
  return (
    <g>
      {items.map((it, i) => (
        <g
          key={i}
          className={fade ? `iso-item-${fade}` : undefined}
          style={
            fade
              ? ({ "--fade-delay": `${Math.max(0, it.x * FADE_RATE - 1.5).toFixed(2)}s` } as CSSProperties)
              : undefined
          }
        >
          {it.node}
        </g>
      ))}
    </g>
  );
});
