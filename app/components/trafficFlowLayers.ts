import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { RoadNet, PedWeight } from "../lib/trafficSim";

// Foot-traffic "flow lines" ported from sightline's TrafficFlowLayer. Each SF
// pedestrian road segment is drawn as a colored line — gray (quiet) → green
// (some people) → red (busy) — with the SFMTA ped-count locations glowing as
// activity hubs on top. The intensity is the same green→red ramp sightline used.

const ELEV = 1; // ground-level so lines sit on the road surface
const EPSILON = 1e-10;

type RGBA = [number, number, number, number];
type LngLat = [number, number];
type FlowPathPoint = [number, number, number];

// weight [0,1] → gray (quiet) → green (some) → orange/red (busy).
// Thresholds compressed so green occupies 0.28–0.58 and red starts at 0.58,
// giving visible gradient with the tighter hub-proximity boost.
function trafficColor(weight: number, alpha: number): RGBA {
  const w = Math.max(0, Math.min(1, weight));
  let r: number, g: number, b: number;
  if (w < 0.28) {
    const t = w / 0.28;
    r = Math.round(118 - t * 38);
    g = Math.round(126 + t * 34);
    b = Math.round(135 - t * 55);
  } else if (w < 0.58) {
    const t = (w - 0.28) / 0.30;
    r = Math.round(80 - t * 30);
    g = Math.round(160 + t * 70);
    b = Math.round(80 - t * 20);
  } else {
    const t = (w - 0.58) / 0.42;
    r = Math.round(50 + t * 205);
    g = Math.round(230 - t * 185);
    b = Math.round(60 - t * 50);
  }
  return [r, g, b, alpha];
}

// Base foot-traffic propensity by OSM highway class (sidewalks/plazas carry more
// people than a footpath through a park). Mirrors sightline's per-kind base.
const KIND_BASE: Record<string, number> = {
  pedestrian: 0.6,
  footway: 0.5,
  sidewalk: 0.5,
  crossing: 0.46,
  steps: 0.4,
  path: 0.42,
  cycleway: 0.4,
};

function lineWidth(kind: string): number {
  if (kind === "pedestrian") return 5;
  if (kind === "footway" || kind === "sidewalk") return 3.4;
  if (kind === "steps" || kind === "crossing") return 3;
  return 3.2;
}

// Approx meters from a point to segment a→b using a local equirectangular frame.
function distToSegM(
  plng: number, plat: number,
  alng: number, alat: number,
  blng: number, blat: number,
): number {
  const cosLat = Math.cos((plat * Math.PI) / 180);
  const ax = (alng - plng) * 111_320 * cosLat;
  const ay = (alat - plat) * 110_574;
  const bx = (blng - plng) * 111_320 * cosLat;
  const by = (blat - plat) * 110_574;
  const vx = bx - ax;
  const vy = by - ay;
  const lenSq = vx * vx + vy * vy;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, -(ax * vx + ay * vy) / lenSq)) : 0;
  const x = ax + vx * t;
  const y = ay + vy * t;
  return Math.sqrt(x * x + y * y);
}

export interface FlowRoad {
  path: [number, number, number][]; // [lng, lat, elev]
  kind: string;
  weight: number;
}

export interface FlowPoint {
  position: [number, number]; // [lng, lat]
  weight: number;
}

export interface TrafficFlowData {
  roads: FlowRoad[];
  points: FlowPoint[];
}

// Build the (static) flow dataset once: weight every pedestrian segment by its
// highway-class base + proximity to the busiest ped-count hubs at this hour.
// Heavy-ish (segments × hubs), so the caller caches the result.
export interface TrafficBbox {
  minLng: number; maxLng: number;
  minLat: number; maxLat: number;
}

function segmentIntersectsBbox(coords: [number, number][], bbox: TrafficBbox): boolean {
  for (const c of coords) {
    if (c[0] >= bbox.minLng && c[0] <= bbox.maxLng && c[1] >= bbox.minLat && c[1] <= bbox.maxLat) {
      return true;
    }
  }

  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    if (
      Math.max(a[0], b[0]) >= bbox.minLng &&
      Math.min(a[0], b[0]) <= bbox.maxLng &&
      Math.max(a[1], b[1]) >= bbox.minLat &&
      Math.min(a[1], b[1]) <= bbox.maxLat
    ) {
      return true;
    }
  }

  return false;
}

function pointOnSegment(point: LngLat, a: LngLat, b: LngLat): boolean {
  const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
  if (Math.abs(cross) > EPSILON) return false;
  return (
    point[0] >= Math.min(a[0], b[0]) - EPSILON &&
    point[0] <= Math.max(a[0], b[0]) + EPSILON &&
    point[1] >= Math.min(a[1], b[1]) - EPSILON &&
    point[1] <= Math.max(a[1], b[1]) + EPSILON
  );
}

function pointInPolygon(point: LngLat, polygon: LngLat[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (pointOnSegment(point, a, b)) return true;

    const crosses = (a[1] > point[1]) !== (b[1] > point[1]);
    if (crosses) {
      const xAtY = ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];
      if (point[0] < xAtY) inside = !inside;
    }
  }

  return inside;
}

function segmentIntersectionT(a: LngLat, b: LngLat, c: LngLat, d: LngLat): number | null {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const sx = d[0] - c[0];
  const sy = d[1] - c[1];
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < EPSILON) return null;

  const qpx = c[0] - a[0];
  const qpy = c[1] - a[1];
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * ry - qpy * rx) / denom;
  if (t < -EPSILON || t > 1 + EPSILON || u < -EPSILON || u > 1 + EPSILON) return null;
  return Math.max(0, Math.min(1, t));
}

function atT(a: FlowPathPoint, b: FlowPathPoint, t: number): FlowPathPoint {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function samePoint(a: FlowPathPoint, b: FlowPathPoint): boolean {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

function sortedUnique(values: number[]): number[] {
  const out: number[] = [];
  for (const v of values.sort((a, b) => a - b)) {
    if (out.length === 0 || Math.abs(v - out[out.length - 1]) > 1e-7) out.push(v);
  }
  return out;
}

function clipSegmentToPolygon(a: FlowPathPoint, b: FlowPathPoint, polygon: LngLat[]): [FlowPathPoint, FlowPathPoint][] {
  const ts = [0, 1];
  const start: LngLat = [a[0], a[1]];
  const end: LngLat = [b[0], b[1]];

  for (let i = 0; i < polygon.length; i++) {
    const c = polygon[i];
    const d = polygon[(i + 1) % polygon.length];
    if (Math.abs(c[0] - d[0]) < EPSILON && Math.abs(c[1] - d[1]) < EPSILON) continue;
    const t = segmentIntersectionT(start, end, c, d);
    if (t !== null) ts.push(t);
  }

  const cuts = sortedUnique(ts);
  const pieces: [FlowPathPoint, FlowPathPoint][] = [];
  for (let i = 1; i < cuts.length; i++) {
    const t0 = cuts[i - 1];
    const t1 = cuts[i];
    if (t1 - t0 <= 1e-7) continue;
    const mid = atT(a, b, (t0 + t1) / 2);
    if (pointInPolygon([mid[0], mid[1]], polygon)) {
      pieces.push([atT(a, b, t0), atT(a, b, t1)]);
    }
  }
  return pieces;
}

function clipPathToPolygon(path: FlowPathPoint[], polygon: LngLat[]): FlowPathPoint[][] {
  const paths: FlowPathPoint[][] = [];
  let current: FlowPathPoint[] = [];

  function flush() {
    if (current.length >= 2) paths.push(current);
    current = [];
  }

  for (let i = 1; i < path.length; i++) {
    const pieces = clipSegmentToPolygon(path[i - 1], path[i], polygon);
    if (pieces.length === 0) {
      flush();
      continue;
    }

    for (const [start, end] of pieces) {
      if (current.length > 0 && samePoint(current[current.length - 1], start)) {
        current.push(end);
      } else {
        flush();
        current = [start, end];
      }
    }
  }

  flush();
  return paths;
}

function normalizePolygon(polygon: LngLat[]): LngLat[] | null {
  const points = polygon.filter((point) =>
    Number.isFinite(point[0]) && Number.isFinite(point[1])
  );
  return points.length >= 3 ? points : null;
}

export function clipTrafficFlowToPolygon(data: TrafficFlowData, polygon: LngLat[]): TrafficFlowData {
  const ring = normalizePolygon(polygon);
  if (!ring) return data;

  const roads: FlowRoad[] = [];
  for (const road of data.roads) {
    for (const path of clipPathToPolygon(road.path, ring)) {
      roads.push({ ...road, path });
    }
  }

  return {
    roads,
    points: data.points.filter((p) => pointInPolygon(p.position, ring)),
  };
}

export function computeTrafficFlow(
  net: RoadNet,
  weights: PedWeight[],
  hour: number,
  bbox?: TrafficBbox,
): TrafficFlowData {
  const points: FlowPoint[] = weights.map((w) => ({
    position: [w.lng, w.lat],
    weight: Math.max(0, Math.min(1, w.hourly?.[hour] ?? 0)),
  }));

  const segs = bbox
    ? net.pedSegs.filter(s => segmentIntersectsBbox(s.coords, bbox))
    : net.pedSegs;

  const roads: FlowRoad[] = segs.map((seg) => {
    const base = KIND_BASE[seg.highway] ?? 0.3;

    // Boost from the nearest active ped-count hub (current hour weight).
    // Tight falloff (τ=80m, max 200m) so only streets adjacent to busy
    // intersections light up — far streets stay gray, near ones go green/red.
    let boost = 0;
    for (const p of points) {
      if (p.weight <= 0) continue;
      let nearest = Infinity;
      for (let i = 1; i < seg.coords.length; i++) {
        const d = distToSegM(
          p.position[0], p.position[1],
          seg.coords[i - 1][0], seg.coords[i - 1][1],
          seg.coords[i][0], seg.coords[i][1],
        );
        if (d < nearest) nearest = d;
        if (nearest < 10) break;
      }
      if (nearest > 200) continue;
      boost = Math.max(boost, p.weight * Math.exp(-nearest / 80));
    }

    const weight = Math.max(0.06, Math.min(1, base * 0.55 + boost * 0.9));
    const path = seg.coords.map(
      (c) => [c[0], c[1], ELEV] as [number, number, number],
    );
    return { path, kind: seg.highway, weight };
  });

  return { roads, points };
}

// Build the deck.gl layers from a (stable) flow dataset. Pass the same
// `data` reference each frame so deck skips re-tessellating the paths.
export function buildTrafficFlowLayers(data: TrafficFlowData) {
  const { roads, points } = data;
  return [
    // Soft activity glow under the busiest hubs.
    new ScatterplotLayer<FlowPoint>({
      id: "traffic-activity-glow",
      data: points,
      getPosition: (p) => [p.position[0], p.position[1], ELEV + 0.2],
      getRadius: (p) => 40 + p.weight * 160,
      radiusUnits: "meters",
      radiusMinPixels: 4,
      radiusMaxPixels: 90,
      getFillColor: (p) => trafficColor(p.weight, Math.round(20 + p.weight * 40)),
      stroked: false,
      filled: true,
      pickable: false,
    }),

    // Foot-traffic intensity painted onto the pedestrian road network.
    new PathLayer<FlowRoad>({
      id: "traffic-road-lines",
      data: roads,
      getPath: (r) => r.path,
      getColor: (r) => trafficColor(r.weight, Math.round(70 + r.weight * 150)),
      getWidth: (r) => lineWidth(r.kind),
      widthUnits: "meters",
      widthMinPixels: 1.5,
      widthMaxPixels: 11,
      capRounded: true,
      jointRounded: true,
      pickable: false,
    }),

    // Bright anchor at each hub.
    new ScatterplotLayer<FlowPoint>({
      id: "traffic-activity-nodes",
      data: points,
      getPosition: (p) => [p.position[0], p.position[1], ELEV + 0.4],
      getRadius: (p) => 6 + p.weight * 14,
      radiusUnits: "meters",
      radiusMinPixels: 2,
      radiusMaxPixels: 11,
      getFillColor: (p) => trafficColor(p.weight, Math.round(150 + p.weight * 80)),
      getLineColor: [255, 255, 255, 180],
      getLineWidth: 1,
      lineWidthUnits: "pixels",
      stroked: true,
      filled: true,
      pickable: false,
    }),
  ];
}
