import mapboxgl from "mapbox-gl";
import type { TrafficBbox } from "../components/trafficFlowLayers";
import { INITIAL_VIEW_STATE, TRAFFIC_BBOX } from "../components/map/constants";
import type { CampaignPedestrianContext } from "./pedestrianIcp";

const CAMPAIGN_TRAFFIC_BBOX_PADDING_DEG = 0.003;
const MAP_POINT_EPSILON = 1e-10;

// Agents spawn within this radius of the view center so the crowd is dense and
// actually visible at the initial zoom — otherwise 150 peds scattered across all
// of SF (~15 km²) leave only a handful in frame. Mirrors sightline's habit of
// spawning agents inside the focused area rather than the whole city.
const SPAWN_CENTER = { lng: INITIAL_VIEW_STATE.longitude, lat: INITIAL_VIEW_STATE.latitude };
const SPAWN_RADIUS_DEG = 0.007; // ~600–780 m around the view center

export function spawnCenterForCampaign(context: CampaignPedestrianContext | null) {
  if (!context?.centroid) return { ...SPAWN_CENTER, radiusDeg: SPAWN_RADIUS_DEG };
  const radiusM = context.radiusM ?? 520;
  return {
    lng: context.centroid.lng,
    lat: context.centroid.lat,
    radiusDeg: Math.min(0.01, Math.max(0.0035, (radiusM * 1.2) / 111320)),
  };
}

export function spawnCenterForBillboard(billboard: { lng: number; lat: number }, context: CampaignPedestrianContext | null) {
  const campaignRadiusM = context?.radiusM ?? 360;
  const radiusM = Math.min(620, Math.max(220, campaignRadiusM * 0.72));
  return {
    lng: billboard.lng,
    lat: billboard.lat,
    radiusDeg: Math.min(0.007, Math.max(0.0025, (radiusM * 1.15) / 111320)),
  };
}

export function hasCampaignPolygon(polygon: [number, number][] | null): boolean {
  return Boolean(polygon && polygon.length > 2);
}

export function bboxForPolygon(polygon: [number, number][], paddingDeg = CAMPAIGN_TRAFFIC_BBOX_PADDING_DEG): TrafficBbox {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of polygon) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(maxLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    return TRAFFIC_BBOX;
  }

  return {
    minLng: minLng - paddingDeg,
    maxLng: maxLng + paddingDeg,
    minLat: minLat - paddingDeg,
    maxLat: maxLat + paddingDeg,
  };
}

export function boundsForPolygon(polygon: [number, number][]): mapboxgl.LngLatBounds | null {
  const bounds = new mapboxgl.LngLatBounds();
  let hasPoint = false;

  for (const [lng, lat] of polygon) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    bounds.extend([lng, lat]);
    hasPoint = true;
  }

  return hasPoint ? bounds : null;
}

export function trafficCacheKey(bbox: TrafficBbox, clipPolygon: [number, number][] | null): string {
  const bboxKey = [bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat]
    .map((value) => value.toFixed(6))
    .join(",");
  const clipKey = clipPolygon
    ? clipPolygon.map(([lng, lat]) => `${lng.toFixed(5)}:${lat.toFixed(5)}`).join(";")
    : "all";
  return `${clipPolygon ? "campaign" : "default"}:${bboxKey}:${clipKey}`;
}

export function pointOnMapSegment(point: [number, number], a: [number, number], b: [number, number]): boolean {
  const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
  if (Math.abs(cross) > MAP_POINT_EPSILON) return false;
  return (
    point[0] >= Math.min(a[0], b[0]) - MAP_POINT_EPSILON &&
    point[0] <= Math.max(a[0], b[0]) + MAP_POINT_EPSILON &&
    point[1] >= Math.min(a[1], b[1]) - MAP_POINT_EPSILON &&
    point[1] <= Math.max(a[1], b[1]) + MAP_POINT_EPSILON
  );
}

export function pointInMapPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (pointOnMapSegment(point, a, b)) return true;

    const crosses = (a[1] > point[1]) !== (b[1] > point[1]);
    if (crosses) {
      const xAtY = ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];
      if (point[0] < xAtY) inside = !inside;
    }
  }

  return inside;
}

export function billboardInPolygon(billboard: { lng: number; lat: number }, polygon: [number, number][]): boolean {
  return pointInMapPolygon([billboard.lng, billboard.lat], polygon);
}
