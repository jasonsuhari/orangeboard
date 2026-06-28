// Traffic simulation library for the SF billboard map.
//
// Three agent types:
//   Pedestrians — spawn weighted by SFMTA intersection counts, walk OSM footways
//   Vehicles    — follow OSM road network, speed scaled by highway class
//   Buses       — real SF Muni GPS positions from NextBus; synthetic fallback
//
// Defensibility:
//   Buses:  Live GPS from retro.umoiq.com/service/publicXMLFeed (NextBus/Umo)
//   Peds:   SFMTA pedestrian count weights + 24h demand curve + OSM sidewalk geometry
//   Cars:   OSM road-constrained, speed by highway class, time-of-day density scaling

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SimAgent {
  lng: number;
  lat: number;
  bearing: number;     // radians 0=N CW (peds/cars random-walk fallback)
  speed: number;       // °/ms
  nextTurn: number;    // perf.now() ms — for random-walk fallback
  turnEvery: number;   // ms
  // Road-constrained fields (set when following OSM geometry)
  segIdx?: number;     // index into RoadNet.pedSegs or carSegs
  ptIdx: number;       // index of current point within segment.coords
  segT: number;        // 0-1 interpolation between ptIdx and ptIdx+1
  forward: boolean;    // direction along the segment
  // Bus route fallback (only used when no road network loaded)
  routePts?: [number, number][];
  routeT: number;      // continuous 0..(pts.length-1)
  routeDir: 1 | -1;
}

export interface RoadSegment {
  coords: [number, number][]; // [lng, lat] pairs
  type: "pedestrian" | "vehicle";
  highway: string;
  speedMult: number;
}

export interface RoadNet {
  pedSegs: RoadSegment[];
  carSegs: RoadSegment[];
  // Coordinate key → segment indices that start or end at that point
  pedJunctions: Record<string, number[]>;
  carJunctions: Record<string, number[]>;
}

export interface PedWeight {
  lat: number;
  lng: number;
  hourly: number[]; // 24 normalized 0-1 values, index = hour of day
}

export interface MuniVehicle {
  id: string;
  lng: number;
  lat: number;
  route: string;
  bearing: number; // radians
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const SF = { minLng: -122.52, maxLng: -122.35, minLat: 37.70, maxLat: 37.82 };

// Degrees/ms — boosted ~30× real speed for visibility at zoom 12-14.
export const SPD = { ped: 0.00000035, car: 0.00000125, bus: 0.0000008 };

export const PED_COUNT = 150;
export const CAR_COUNT = 80;

// Cardinal bearings (rad from N, CW) + Market St diagonal (~56°) for random-walk fallback
export const CAR_BEARINGS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 0.984, 0.984 + Math.PI];

// SF Muni route waypoints — synthetic fallback when live feed is unavailable
export const BUS_ROUTES: [number, number][][] = [
  [[-122.438, 37.760], [-122.428, 37.767], [-122.419, 37.775], [-122.409, 37.782], [-122.400, 37.791]], // 14 Mission
  [[-122.402, 37.787], [-122.420, 37.786], [-122.440, 37.783], [-122.460, 37.781], [-122.483, 37.779]], // 38 Geary
  [[-122.398, 37.791], [-122.420, 37.790], [-122.440, 37.788], [-122.466, 37.786], [-122.503, 37.785]], // 1 California
  [[-122.421, 37.757], [-122.421, 37.769], [-122.421, 37.779], [-122.421, 37.791], [-122.421, 37.807]], // 47 Van Ness
  [[-122.391, 37.780], [-122.407, 37.776], [-122.419, 37.772], [-122.433, 37.768], [-122.448, 37.763]], // N Judah / Market
  [[-122.432, 37.763], [-122.432, 37.773], [-122.433, 37.783], [-122.434, 37.793], [-122.435, 37.801]], // 22 Fillmore
  [[-122.402, 37.773], [-122.420, 37.771], [-122.440, 37.769], [-122.460, 37.767], [-122.483, 37.765]], // 5 Fulton
  [[-122.408, 37.790], [-122.408, 37.798], [-122.410, 37.804], [-122.413, 37.810]],                    // 30 Stockton
];

export const BUS_COUNT = BUS_ROUTES.length * 2;

// 24-hour pedestrian demand curve calibrated to SF patterns (index 0 = midnight–1am)
export const HOUR_MULTIPLIERS = [
  0.10, 0.05, 0.03, 0.03, 0.05, 0.20,
  0.60, 0.90, 1.00, 0.80, 0.70, 0.80,
  0.90, 0.80, 0.70, 0.70, 0.80, 1.00,
  0.90, 0.70, 0.60, 0.50, 0.30, 0.20,
];

const SPEED_BY_HIGHWAY: Record<string, number> = {
  trunk: 1.4, primary: 1.2, secondary: 1.0, tertiary: 0.85, residential: 0.65,
  footway: 1.0, pedestrian: 0.9, path: 0.8,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function rnd(lo: number, hi: number) {
  return lo + Math.random() * (hi - lo);
}

function coordKey(lng: number, lat: number): string {
  // 4 decimal places ≈ 11m — coarse enough to snap OSM near-misses at junctions
  return `${lng.toFixed(4)},${lat.toFixed(4)}`;
}

// ── Road network builder ──────────────────────────────────────────────────────

export function buildRoadNetwork(fc: GeoJSON.FeatureCollection): RoadNet {
  const pedSegs: RoadSegment[] = [];
  const carSegs: RoadSegment[] = [];
  const pedJunctions: Record<string, number[]> = {};
  const carJunctions: Record<string, number[]> = {};

  function addJunction(junctions: Record<string, number[]>, key: string, idx: number) {
    if (!junctions[key]) junctions[key] = [];
    junctions[key].push(idx);
  }

  for (const feat of fc.features) {
    if (feat.geometry.type !== "LineString") continue;
    const coords = feat.geometry.coordinates as [number, number][];
    if (coords.length < 2) continue;

    const props = feat.properties ?? {};
    const type = (props.type as "pedestrian" | "vehicle") ?? "vehicle";
    const highway = (props.highway as string) ?? "";
    const speedMult = (props.speedMult as number) ?? SPEED_BY_HIGHWAY[highway] ?? 1.0;

    const seg: RoadSegment = { coords, type, highway, speedMult };

    if (type === "pedestrian") {
      const idx = pedSegs.length;
      pedSegs.push(seg);
      const first = coords[0];
      const last = coords[coords.length - 1];
      addJunction(pedJunctions, coordKey(first[0], first[1]), idx);
      addJunction(pedJunctions, coordKey(last[0], last[1]), idx);
    } else {
      const idx = carSegs.length;
      carSegs.push(seg);
      const first = coords[0];
      const last = coords[coords.length - 1];
      addJunction(carJunctions, coordKey(first[0], first[1]), idx);
      addJunction(carJunctions, coordKey(last[0], last[1]), idx);
    }
  }

  return { pedSegs, carSegs, pedJunctions, carJunctions };
}

// ── Agent spawning ────────────────────────────────────────────────────────────

export interface SpawnCenter { lng: number; lat: number; radiusDeg: number }

// Segment indices whose start point falls within `radiusDeg` of the center.
// Used to concentrate the crowd around the viewport instead of all of SF.
function segIdxNear(segs: RoadSegment[], center: SpawnCenter): number[] {
  const r2 = center.radiusDeg * center.radiusDeg;
  const near: number[] = [];
  for (let i = 0; i < segs.length; i++) {
    const c = segs[i].coords[0];
    const dLng = c[0] - center.lng;
    const dLat = c[1] - center.lat;
    if (dLng * dLng + dLat * dLat <= r2) near.push(i);
  }
  return near;
}

// Uniform-random point inside the spawn circle (rejection-free polar sample).
function pointNear(center: SpawnCenter): [number, number] {
  const a = Math.random() * Math.PI * 2;
  const r = center.radiusDeg * Math.sqrt(Math.random());
  // cos correction keeps the lng spread visually circular at SF latitude
  const cosLat = Math.cos((center.lat * Math.PI) / 180) || 1;
  return [center.lng + (Math.cos(a) * r) / cosLat, center.lat + Math.sin(a) * r];
}

function makeRoadAgent(seg: RoadSegment, segIdx: number, speed: number): SimAgent {
  const ptIdx = Math.floor(Math.random() * (seg.coords.length - 1));
  const segT = Math.random();
  const p0 = seg.coords[ptIdx];
  const p1 = seg.coords[ptIdx + 1];
  return {
    lng: p0[0] + (p1[0] - p0[0]) * segT,
    lat: p0[1] + (p1[1] - p0[1]) * segT,
    bearing: 0,
    speed,
    nextTurn: Infinity,
    turnEvery: Infinity,
    segIdx,
    ptIdx,
    segT,
    forward: Math.random() < 0.5,
    routeT: 0,
    routeDir: 1,
  };
}

export function spawnRoadPed(net: RoadNet, weights: PedWeight[], center?: SpawnCenter): SimAgent {
  if (net.pedSegs.length === 0) return syntheticPed(center);

  // When a spawn center is given, restrict candidate segments to the viewport so
  // the crowd is dense and visible; fall back to the full network if none qualify.
  const nearIdx = center ? segIdxNear(net.pedSegs, center) : [];
  if (nearIdx.length > 0) {
    const idx = nearIdx[Math.floor(Math.random() * nearIdx.length)];
    return makeRoadAgent(net.pedSegs[idx], idx, SPD.ped);
  }

  if (weights.length > 0 && net.pedSegs.length > 0) {
    const hour = new Date().getHours();
    // Weighted random selection by intersection hourly count
    const totalWeight = weights.reduce((s, w) => s + (w.hourly[hour] ?? 0), 0);
    if (totalWeight > 0) {
      let pick = Math.random() * totalWeight;
      let chosen = weights[0];
      for (const w of weights) {
        pick -= w.hourly[hour] ?? 0;
        if (pick <= 0) { chosen = w; break; }
      }
      // Find nearest ped segment start to the chosen intersection
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < net.pedSegs.length; i++) {
        const c = net.pedSegs[i].coords[0];
        const d = (c[0] - chosen.lng) ** 2 + (c[1] - chosen.lat) ** 2;
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      return makeRoadAgent(net.pedSegs[bestIdx], bestIdx, SPD.ped);
    }
  }
  // Uniform fallback — pick any ped segment
  const idx = Math.floor(Math.random() * net.pedSegs.length);
  return makeRoadAgent(net.pedSegs[idx], idx, SPD.ped);
}

export function spawnRoadCar(net: RoadNet, center?: SpawnCenter): SimAgent {
  if (net.carSegs.length === 0) return syntheticCar(center);

  const nearIdx = center ? segIdxNear(net.carSegs, center) : [];
  const idx = nearIdx.length > 0
    ? nearIdx[Math.floor(Math.random() * nearIdx.length)]
    : Math.floor(Math.random() * net.carSegs.length);
  return makeRoadAgent(net.carSegs[idx], idx, SPD.car);
}

// Synthetic random-walk agents for use before road network loads
export function syntheticPed(center?: SpawnCenter): SimAgent {
  const [lng, lat] = center ? pointNear(center) : [rnd(SF.minLng, SF.maxLng), rnd(SF.minLat, SF.maxLat)];
  return {
    lng, lat,
    bearing: rnd(0, Math.PI * 2), speed: SPD.ped,
    nextTurn: rnd(0, 6000), turnEvery: rnd(3000, 9000),
    ptIdx: 0, segT: 0, forward: true, routeT: 0, routeDir: 1,
  };
}

export function syntheticCar(center?: SpawnCenter): SimAgent {
  const [lng, lat] = center ? pointNear(center) : [rnd(SF.minLng, SF.maxLng), rnd(SF.minLat, SF.maxLat)];
  return {
    lng, lat,
    bearing: CAR_BEARINGS[Math.floor(Math.random() * CAR_BEARINGS.length)], speed: SPD.car,
    nextTurn: rnd(0, 12000), turnEvery: rnd(8000, 25000),
    ptIdx: 0, segT: 0, forward: true, routeT: 0, routeDir: 1,
  };
}

export function syntheticBuses(): SimAgent[] {
  return BUS_ROUTES.flatMap((pts) =>
    ([0, 1] as const).map<SimAgent>(() => ({
      lng: pts[0][0], lat: pts[0][1], bearing: 0, speed: SPD.bus,
      nextTurn: Infinity, turnEvery: Infinity,
      routePts: pts, routeT: rnd(0, pts.length - 1), routeDir: Math.random() < 0.5 ? 1 : -1,
      ptIdx: 0, segT: 0, forward: true,
    }))
  );
}

// ── Stepping ──────────────────────────────────────────────────────────────────

function stepRoadAgent(
  a: SimAgent,
  dt: number,
  segs: RoadSegment[],
  junctions: Record<string, number[]>
): void {
  let seg = segs[a.segIdx!];
  if (!seg?.coords || seg.coords.length < 2) {
    a.segIdx = undefined;
    return;
  }

  let remaining = seg.speedMult * a.speed * dt;

  while (remaining > 0) {
    const coords = seg.coords;
    if (coords.length < 2) {
      a.segIdx = undefined;
      return;
    }

    if (a.forward ? a.ptIdx >= coords.length - 1 : a.ptIdx < 0) {
      // Reached the end of this segment — look up connected segments
      const endPtIdx = a.forward ? coords.length - 1 : 0;
      const endCoord = coords[endPtIdx];
      if (!endCoord) {
        a.segIdx = undefined;
        return;
      }
      const key = coordKey(endCoord[0], endCoord[1]);
      const connected = (junctions[key] ?? []).filter((i) => i !== a.segIdx && segs[i]?.coords?.length >= 2);

      if (connected.length > 0) {
        // Transition to a randomly connected segment
        const nextIdx = connected[Math.floor(Math.random() * connected.length)];
        const nextSeg = segs[nextIdx];
        if (!nextSeg?.coords || nextSeg.coords.length < 2) {
          a.segIdx = undefined;
          return;
        }
        a.segIdx = nextIdx;
        // Determine direction: start from whichever end matches our current position
        const nc = nextSeg.coords;
        const startKey = coordKey(nc[0][0], nc[0][1]);
        const endKey = coordKey(nc[nc.length - 1][0], nc[nc.length - 1][1]);
        a.forward = startKey === key || endKey !== key;
        a.ptIdx = a.forward ? 0 : nc.length - 2;
        a.segT = 0;
        // Update seg reference for continued stepping
        seg = nextSeg;
        continue;
      } else {
        // Dead end — reverse direction
        a.forward = !a.forward;
        a.ptIdx = a.forward ? 0 : coords.length - 2;
        a.segT = 0;
        break;
      }
    }

    if (a.ptIdx < 0 || a.ptIdx >= coords.length - 1) {
      a.ptIdx = Math.max(0, Math.min(a.ptIdx, coords.length - 2));
      a.segT = Math.max(0, Math.min(1, a.segT));
    }

    const p0 = coords[a.forward ? a.ptIdx : a.ptIdx + 1];
    const p1 = coords[a.forward ? a.ptIdx + 1 : a.ptIdx];
    if (!p0 || !p1) {
      a.ptIdx = Math.max(0, Math.min(a.ptIdx, coords.length - 2));
      a.segT = 0;
      break;
    }
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const segLen = Math.sqrt(dx * dx + dy * dy) || 1e-10;
    const distToEnd = segLen * (1 - a.segT);

    if (remaining >= distToEnd) {
      remaining -= distToEnd;
      if (a.forward) { a.ptIdx++; } else { a.ptIdx--; }
      a.segT = 0;
    } else {
      a.segT += remaining / segLen;
      remaining = 0;
    }
  }

  // Update position from current ptIdx + segT
  const currentSeg = segs[a.segIdx!];
  if (!currentSeg?.coords || currentSeg.coords.length < 2) {
    a.segIdx = undefined;
    return;
  }
  const coords = currentSeg.coords;
  const safeIdx = Math.max(0, Math.min(a.ptIdx, coords.length - 2));
  const t = Math.max(0, Math.min(1, a.segT));
  const p0 = coords[a.forward ? safeIdx : safeIdx + 1];
  const p1 = coords[a.forward ? safeIdx + 1 : safeIdx];
  if (!p0 || !p1) return;
  a.lng = p0[0] + (p1[0] - p0[0]) * t;
  a.lat = p0[1] + (p1[1] - p0[1]) * t;
  a.bearing = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]);
}

function stepBusWaypoints(a: SimAgent, dt: number): void {
  const pts = a.routePts!;
  const maxT = pts.length - 1;
  const seg = Math.min(Math.floor(a.routeT), maxT - 1);
  const p0 = pts[seg];
  const p1 = pts[Math.min(seg + 1, maxT)];
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const segLen = Math.sqrt(dx * dx + dy * dy) || 1e-9;
  a.routeT = Math.max(0, Math.min(maxT, a.routeT + (a.speed * dt / segLen) * a.routeDir));
  if (a.routeT >= maxT) a.routeDir = -1;
  else if (a.routeT <= 0) a.routeDir = 1;
  const s = Math.min(Math.floor(a.routeT), maxT - 1);
  const t = a.routeT - s;
  a.lng = pts[s][0] + (pts[Math.min(s + 1, maxT)][0] - pts[s][0]) * t;
  a.lat = pts[s][1] + (pts[Math.min(s + 1, maxT)][1] - pts[s][1]) * t;
}

function stepRandomWalk(a: SimAgent, dt: number, now: number): void {
  if (now >= a.nextTurn) {
    a.bearing = a.speed === SPD.car
      ? CAR_BEARINGS[Math.floor(Math.random() * CAR_BEARINGS.length)]
      : rnd(0, Math.PI * 2);
    a.nextTurn = now + a.turnEvery;
  }
  a.lng += Math.sin(a.bearing) * a.speed * dt;
  a.lat += Math.cos(a.bearing) * a.speed * dt;
  if (a.lng < SF.minLng || a.lng > SF.maxLng) {
    a.bearing = Math.PI - a.bearing;
    a.lng = Math.max(SF.minLng, Math.min(SF.maxLng, a.lng));
  }
  if (a.lat < SF.minLat || a.lat > SF.maxLat) {
    a.bearing = -a.bearing;
    a.lat = Math.max(SF.minLat, Math.min(SF.maxLat, a.lat));
  }
}

export function stepSimAgent(
  a: SimAgent,
  dt: number,
  now: number,
  net?: RoadNet,
  isPed?: boolean
): void {
  if (a.routePts) {
    stepBusWaypoints(a, dt);
  } else if (a.segIdx !== undefined && net) {
    const segs = isPed ? net.pedSegs : net.carSegs;
    const junctions = isPed ? net.pedJunctions : net.carJunctions;
    stepRoadAgent(a, dt, segs, junctions);
  } else {
    stepRandomWalk(a, dt, now);
  }
}

// ── GeoJSON output ────────────────────────────────────────────────────────────

export function agentsToFC(agents: { lng: number; lat: number }[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: agents.map((a) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [a.lng, a.lat] },
      properties: null,
    })),
  };
}

// ── Time-of-day density ───────────────────────────────────────────────────────

export function targetPedCount(): number {
  const h = new Date().getHours();
  return Math.max(10, Math.round(PED_COUNT * HOUR_MULTIPLIERS[h]));
}

export function targetCarCount(): number {
  const h = new Date().getHours();
  // Cars vary less dramatically than peds; use a narrower band (40-100%)
  return Math.max(20, Math.round(CAR_COUNT * (0.4 + 0.6 * HOUR_MULTIPLIERS[h])));
}
