export type LngLat = { lng: number; lat: number };

export interface MapBuilding {
  id: string;
  footprint: LngLat[];
  centroid: LngLat;
  heightM: number;
  baseHeightM: number;
  levels?: number;
  sourceTags?: Record<string, string>;
}

type OverpassGeometryPoint = {
  lat: number;
  lon: number;
};

type OverpassWay = {
  type: string;
  id: number | string;
  tags?: Record<string, string>;
  geometry?: OverpassGeometryPoint[];
};

type OverpassResponse = {
  elements?: OverpassWay[];
};

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const OVERPASS_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent": "Orangeboard/0.1",
};

function kmToDeg(km: number): number {
  return km / 111.32;
}

function parseMeters(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLevels(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function computeCentroid(points: LngLat[]): LngLat {
  if (points.length === 0) return { lng: 0, lat: 0 };

  let area = 0;
  let lng = 0;
  let lat = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j];
    const b = points[i];
    const f = a.lng * b.lat - b.lng * a.lat;
    area += f;
    lng += (a.lng + b.lng) * f;
    lat += (a.lat + b.lat) * f;
  }

  area *= 0.5;
  if (Math.abs(area) < 1e-12) {
    const sum = points.reduce(
      (acc, point) => ({ lng: acc.lng + point.lng, lat: acc.lat + point.lat }),
      { lng: 0, lat: 0 },
    );
    return { lng: sum.lng / points.length, lat: sum.lat / points.length };
  }

  return { lng: lng / (6 * area), lat: lat / (6 * area) };
}

function pointOnSegment(point: [number, number], a: [number, number], b: [number, number]): boolean {
  const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
  if (Math.abs(cross) > 1e-10) return false;
  return (
    point[0] >= Math.min(a[0], b[0]) - 1e-10 &&
    point[0] <= Math.max(a[0], b[0]) + 1e-10 &&
    point[1] >= Math.min(a[1], b[1]) - 1e-10 &&
    point[1] <= Math.max(a[1], b[1]) + 1e-10
  );
}

export function pointInLngLatPolygon(point: LngLat, polygon: [number, number][]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const p: [number, number] = [point.lng, point.lat];
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (pointOnSegment(p, a, b)) return true;

    const crosses = (a[1] > p[1]) !== (b[1] > p[1]);
    if (crosses) {
      const xAtY = ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0];
      if (p[0] < xAtY) inside = !inside;
    }
  }

  return inside;
}

function buildOverpassBuildingsQuery(center: LngLat, radiusKm: number): string {
  const d = kmToDeg(radiusKm);
  const south = center.lat - d;
  const north = center.lat + d;
  const west = center.lng - d;
  const east = center.lng + d;
  const bbox = `(${south},${west},${north},${east})`;

  return `[out:json][timeout:25];(way["building"]${bbox};);out tags geom;`;
}

function parseOverpassBuildings(data: OverpassResponse, polygon?: [number, number][]): MapBuilding[] {
  return (data.elements ?? [])
    .filter((el): el is OverpassWay & { geometry: OverpassGeometryPoint[] } =>
      el.type === "way" &&
      Array.isArray(el.geometry) &&
      el.geometry.length >= 4 &&
      Boolean(el.tags?.building)
    )
    .map((el) => {
      const tags = el.tags ?? {};
      const footprint = el.geometry.map((point) => ({ lng: point.lon, lat: point.lat }));
      const centroid = computeCentroid(footprint);
      const levels = parseLevels(tags["building:levels"]);
      const baseLevels = parseLevels(tags["building:min_level"]);
      const heightM = parseMeters(tags.height) ?? (levels ? levels * 3.2 : 12);
      const baseHeightM = parseMeters(tags.min_height) ?? (baseLevels ? baseLevels * 3.2 : 0);

      return {
        id: String(el.id),
        footprint,
        centroid,
        heightM: Math.max(3, heightM),
        baseHeightM: Math.max(0, Math.min(baseHeightM, heightM - 1)),
        levels,
        sourceTags: tags,
      };
    })
    .filter((building) => !polygon || pointInLngLatPolygon(building.centroid, polygon));
}

export async function fetchCampaignBuildings(
  center: LngLat,
  radiusKm: number,
  polygon?: [number, number][],
): Promise<MapBuilding[]> {
  const body = `data=${encodeURIComponent(buildOverpassBuildingsQuery(center, radiusKm))}`;

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const response = await fetch(mirror, {
        method: "POST",
        headers: OVERPASS_HEADERS,
        body,
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) continue;
      return parseOverpassBuildings((await response.json()) as OverpassResponse, polygon);
    } catch {
      // Try the next mirror.
    }
  }

  throw new Error("All Overpass mirrors failed or timed out");
}
