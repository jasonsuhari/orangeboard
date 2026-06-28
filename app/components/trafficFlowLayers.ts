import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { RoadNet, PedWeight } from "../lib/trafficSim";

// Foot-traffic "flow lines" ported from sightline's TrafficFlowLayer. Each SF
// pedestrian road segment is drawn as a colored line — gray (quiet) → green
// (some people) → red (busy) — with the SFMTA ped-count locations glowing as
// activity hubs on top. The intensity is the same green→red ramp sightline used.

const ELEV = 1; // ground-level so lines sit on the road surface

type RGBA = [number, number, number, number];

// weight [0,1] → gray (quiet) → green (some) → red (busy). Ported verbatim.
function trafficColor(weight: number, alpha: number): RGBA {
  const w = Math.max(0, Math.min(1, weight));
  let r: number, g: number, b: number;
  if (w < 0.35) {
    const t = w / 0.35;
    r = Math.round(118 - t * 38);
    g = Math.round(126 + t * 34);
    b = Math.round(135 - t * 55);
  } else if (w < 0.78) {
    const t = (w - 0.35) / 0.43;
    r = Math.round(80 - t * 30);
    g = Math.round(160 + t * 70);
    b = Math.round(80 - t * 20);
  } else {
    const t = (w - 0.78) / 0.22;
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
export function computeTrafficFlow(
  net: RoadNet,
  weights: PedWeight[],
  hour: number,
): TrafficFlowData {
  const points: FlowPoint[] = weights.map((w) => ({
    position: [w.lng, w.lat],
    weight: Math.max(0, Math.min(1, w.hourly?.[hour] ?? 0)),
  }));

  const roads: FlowRoad[] = net.pedSegs.map((seg) => {
    const base = KIND_BASE[seg.highway] ?? 0.3;

    // Boost from the nearest active ped-count hub (current hour weight).
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
        if (nearest < 20) break;
      }
      if (nearest > 450) continue;
      boost = Math.max(boost, p.weight * Math.exp(-nearest / 240));
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
