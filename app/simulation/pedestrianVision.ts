export interface PedestrianVisionAgent {
  id: string;
  lng: number;
  lat: number;
  /** Radians clockwise from north. Matches SimAgent.bearing. */
  bearing: number;
}

export interface VisionBillboard {
  id: string;
  lng: number;
  lat: number;
  label?: string;
  address?: string;
}

export interface PedestrianVisionOptions {
  /** Horizontal field of view to test, in degrees. */
  fovDeg: number;
  minDistanceM: number;
  maxDistanceM: number;
  /** Approximate physical board width, used to forgive near wide boards. */
  billboardWidthM: number;
  gridCellM: number;
  checkIntervalMs: number;
  globalCooldownMs: number;
  pedestrianCooldownMs: number;
  billboardCooldownMs: number;
}

export interface PedestrianBillboardCapture {
  id: string;
  pedestrianId: string;
  billboard: VisionBillboard;
  pedestrian: {
    lng: number;
    lat: number;
    headingDeg: number;
  };
  distanceM: number;
  angleOffCenterDeg: number;
  score: number;
  fovDeg: number;
  capturedAtMs: number;
}

export interface PedestrianVisionIndex {
  readonly cellM: number;
  readonly cosLat: number;
  readonly cells: Map<string, IndexedBillboard[]>;
  readonly count: number;
}

export interface PedestrianVisionTriggerState {
  lastGlobalCaptureMs: number;
  pedestrianCooldowns: Map<string, number>;
  billboardCooldowns: Map<string, number>;
}

interface IndexedBillboard extends VisionBillboard {
  xM: number;
  yM: number;
}

const M_PER_LAT = 110_540;
const M_PER_LNG = 111_320;
const TWO_PI = Math.PI * 2;

export const PEDESTRIAN_VISION_DEFAULTS: PedestrianVisionOptions = {
  fovDeg: 78,
  minDistanceM: 6,
  maxDistanceM: 90,
  billboardWidthM: 14,
  gridCellM: 110,
  checkIntervalMs: 250,
  globalCooldownMs: 10_000,
  pedestrianCooldownMs: 18_000,
  billboardCooldownMs: 14_000,
};

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

function lngToXM(lng: number, cosLat: number): number {
  return lng * M_PER_LNG * cosLat;
}

function latToYM(lat: number): number {
  return lat * M_PER_LAT;
}

function normalizeDeg(deg: number): number {
  const n = deg % 360;
  return n < 0 ? n + 360 : n;
}

export function bearingRadToHeadingDeg(rad: number): number {
  return normalizeDeg((rad * 180) / Math.PI);
}

export function angleDeltaDeg(a: number, b: number): number {
  const d = Math.abs(normalizeDeg(a) - normalizeDeg(b));
  return d > 180 ? 360 - d : d;
}

export function headingToTargetDeg(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
  cosLat = Math.cos(((from.lat + to.lat) * 0.5 * Math.PI) / 180) || 1,
): number {
  const eastM = (to.lng - from.lng) * M_PER_LNG * cosLat;
  const northM = (to.lat - from.lat) * M_PER_LAT;
  return normalizeDeg((Math.atan2(eastM, northM) * 180) / Math.PI);
}

export function createPedestrianVisionState(): PedestrianVisionTriggerState {
  return {
    lastGlobalCaptureMs: -Infinity,
    pedestrianCooldowns: new Map(),
    billboardCooldowns: new Map(),
  };
}

export function buildPedestrianVisionIndex(
  billboards: VisionBillboard[],
  options: Partial<PedestrianVisionOptions> = {},
): PedestrianVisionIndex {
  const cellM = options.gridCellM ?? PEDESTRIAN_VISION_DEFAULTS.gridCellM;
  const avgLat = billboards.length
    ? billboards.reduce((sum, b) => sum + b.lat, 0) / billboards.length
    : 37.7749;
  const cosLat = Math.cos((avgLat * Math.PI) / 180) || 1;
  const cells = new Map<string, IndexedBillboard[]>();

  for (const b of billboards) {
    const indexed: IndexedBillboard = {
      ...b,
      xM: lngToXM(b.lng, cosLat),
      yM: latToYM(b.lat),
    };
    const cx = Math.floor(indexed.xM / cellM);
    const cy = Math.floor(indexed.yM / cellM);
    const key = cellKey(cx, cy);
    const list = cells.get(key);
    if (list) list.push(indexed);
    else cells.set(key, [indexed]);
  }

  return { cellM, cosLat, cells, count: billboards.length };
}

function candidatesNear(
  agent: PedestrianVisionAgent,
  index: PedestrianVisionIndex,
  radiusM: number,
): IndexedBillboard[] {
  const xM = lngToXM(agent.lng, index.cosLat);
  const yM = latToYM(agent.lat);
  const c = index.cellM;
  const minX = Math.floor((xM - radiusM) / c);
  const maxX = Math.floor((xM + radiusM) / c);
  const minY = Math.floor((yM - radiusM) / c);
  const maxY = Math.floor((yM + radiusM) / c);
  const out: IndexedBillboard[] = [];

  for (let cy = minY; cy <= maxY; cy++) {
    for (let cx = minX; cx <= maxX; cx++) {
      const list = index.cells.get(cellKey(cx, cy));
      if (list) out.push(...list);
    }
  }

  return out;
}

function visibleScore(
  agent: PedestrianVisionAgent,
  billboard: IndexedBillboard,
  index: PedestrianVisionIndex,
  options: PedestrianVisionOptions,
): PedestrianBillboardCapture | null {
  const agentXM = lngToXM(agent.lng, index.cosLat);
  const agentYM = latToYM(agent.lat);
  const eastM = billboard.xM - agentXM;
  const northM = billboard.yM - agentYM;
  const distanceM = Math.hypot(eastM, northM);

  if (distanceM < options.minDistanceM || distanceM > options.maxDistanceM) {
    return null;
  }

  const targetHeadingDeg = normalizeDeg((Math.atan2(eastM, northM) * 180) / Math.PI);
  const pedestrianHeadingDeg = bearingRadToHeadingDeg(agent.bearing);
  const angleOffCenterDeg = angleDeltaDeg(pedestrianHeadingDeg, targetHeadingDeg);
  const halfFovDeg = options.fovDeg / 2;
  const halfBoardDeg = (Math.atan((options.billboardWidthM / 2) / distanceM) * 180) / Math.PI;
  const allowedDeg = halfFovDeg + halfBoardDeg;

  if (angleOffCenterDeg > allowedDeg) return null;

  const angleFit = 1 - clamp(angleOffCenterDeg / allowedDeg, 0, 1);
  const distanceFit = 1 - clamp((distanceM - options.minDistanceM) / (options.maxDistanceM - options.minDistanceM), 0, 1);
  const score = 0.72 * angleFit + 0.28 * distanceFit;

  return {
    id: `${agent.id}:${billboard.id}:${Math.round(distanceM)}:${Math.round(angleOffCenterDeg)}`,
    pedestrianId: agent.id,
    billboard: {
      id: billboard.id,
      lng: billboard.lng,
      lat: billboard.lat,
      label: billboard.label,
      address: billboard.address,
    },
    pedestrian: {
      lng: agent.lng,
      lat: agent.lat,
      headingDeg: pedestrianHeadingDeg,
    },
    distanceM,
    angleOffCenterDeg,
    score,
    fovDeg: options.fovDeg,
    capturedAtMs: 0,
  };
}

function pruneCooldowns(cooldowns: Map<string, number>, nowMs: number): void {
  for (const [id, until] of cooldowns.entries()) {
    if (until <= nowMs) cooldowns.delete(id);
  }
}

export function findPedestrianBillboardTrigger(
  agents: PedestrianVisionAgent[],
  index: PedestrianVisionIndex | null,
  state: PedestrianVisionTriggerState,
  nowMs: number,
  optionsInput: Partial<PedestrianVisionOptions> = {},
): PedestrianBillboardCapture | null {
  if (!index || index.count === 0) return null;
  const options = { ...PEDESTRIAN_VISION_DEFAULTS, ...optionsInput };
  if (nowMs - state.lastGlobalCaptureMs < options.globalCooldownMs) return null;

  pruneCooldowns(state.pedestrianCooldowns, nowMs);
  pruneCooldowns(state.billboardCooldowns, nowMs);

  let best: PedestrianBillboardCapture | null = null;

  for (const agent of agents) {
    if (state.pedestrianCooldowns.has(agent.id)) continue;
    const nearby = candidatesNear(agent, index, options.maxDistanceM);
    for (const billboard of nearby) {
      if (state.billboardCooldowns.has(billboard.id)) continue;
      const hit = visibleScore(agent, billboard, index, options);
      if (hit && (!best || hit.score > best.score)) best = hit;
    }
  }

  if (!best) return null;

  best.capturedAtMs = nowMs;
  state.lastGlobalCaptureMs = nowMs;
  state.pedestrianCooldowns.set(best.pedestrianId, nowMs + options.pedestrianCooldownMs);
  state.billboardCooldowns.set(best.billboard.id, nowMs + options.billboardCooldownMs);
  return best;
}

export function pedestrianStreetViewImageUrl(
  capture: PedestrianBillboardCapture,
  size = "640x640",
): string {
  const params = new URLSearchParams({
    lat: capture.pedestrian.lat.toFixed(7),
    lng: capture.pedestrian.lng.toFixed(7),
    heading: capture.pedestrian.headingDeg.toFixed(1),
    pitch: "2",
    fov: String(Math.round(clamp(capture.fovDeg, 20, 120))),
    size,
  });
  return `/api/streetview/image?${params.toString()}`;
}

export function bearingFromMovementRad(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
): number | null {
  const cosLat = Math.cos(((from.lat + to.lat) * 0.5 * Math.PI) / 180) || 1;
  const eastM = (to.lng - from.lng) * M_PER_LNG * cosLat;
  const northM = (to.lat - from.lat) * M_PER_LAT;
  if (Math.hypot(eastM, northM) < 0.01) return null;
  const rad = Math.atan2(eastM, northM);
  return rad < 0 ? rad + TWO_PI : rad;
}
