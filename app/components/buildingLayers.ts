import { PathLayer, PolygonLayer } from "@deck.gl/layers";
import type { MapBuilding, LngLat } from "../lib/buildings";

type Rgba = [number, number, number, number];

interface BuildingPathDetail {
  id: string;
  building: MapBuilding;
  path: [number, number, number][];
  color: Rgba;
  width: number;
}

const FACADE: Rgba = [213, 209, 202, 238];
const ROOF: Rgba = [178, 173, 165, 238];

function openRing(building: MapBuilding): LngLat[] {
  const points = building.footprint;
  const open = points.length >= 2 &&
    points[0].lat === points[points.length - 1].lat &&
    points[0].lng === points[points.length - 1].lng
    ? points.slice(0, -1)
    : points;

  const out: LngLat[] = [];
  for (const point of open) {
    const previous = out[out.length - 1];
    if (!previous || previous.lat !== point.lat || previous.lng !== point.lng) out.push(point);
  }
  return out;
}

function getBuildingPolygon(building: MapBuilding) {
  return openRing(building).map((point) => [
    point.lng,
    point.lat,
    building.baseHeightM,
  ] as [number, number, number]);
}

function getRoofPolygon(building: MapBuilding) {
  const roofZ = Math.max(building.heightM, building.baseHeightM + 1) + 0.08;
  return openRing(building).map((point) => [
    point.lng,
    point.lat,
    roofZ,
  ] as [number, number, number]);
}

function getOutlinePath(building: MapBuilding) {
  const roof = getRoofPolygon(building);
  const first = roof[0];
  return first ? [...roof, first] : roof;
}

function makeClosedPathAtHeight(building: MapBuilding, heightM: number) {
  const path = openRing(building).map((point) => [
    point.lng,
    point.lat,
    heightM,
  ] as [number, number, number]);
  const first = path[0];
  return first ? [...path, first] : path;
}

function makeFacadeBands(building: MapBuilding): BuildingPathDetail[] {
  const floorHeightM = building.levels && building.levels > 0
    ? Math.max(2.6, Math.min(4.2, building.heightM / building.levels))
    : 3.2;
  const firstBandM = building.baseHeightM + floorHeightM;
  const maxBandCount = Math.min(14, Math.floor((building.heightM - firstBandM) / floorHeightM) + 1);
  const color: Rgba = [132, 130, 125, 150];

  return Array.from({ length: Math.max(0, maxBandCount) }, (_, index) => {
    const heightM = firstBandM + index * floorHeightM;
    return {
      id: `${building.id}-floor-${index}`,
      building,
      path: makeClosedPathAtHeight(building, heightM),
      color,
      width: 0.28,
    };
  });
}

function makeVerticalEdges(building: MapBuilding): BuildingPathDetail[] {
  return openRing(building).map((point, index) => ({
    id: `${building.id}-edge-${index}`,
    building,
    path: [
      [point.lng, point.lat, building.baseHeightM],
      [point.lng, point.lat, building.heightM],
    ],
    color: [132, 130, 125, 115],
    width: 0.22,
  }));
}

function isSimplePolygon(points: LngLat[]): boolean {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const ax = points[i].lng;
    const ay = points[i].lat;
    const bx = points[(i + 1) % n].lng;
    const by = points[(i + 1) % n].lat;
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const cx = points[j].lng;
      const cy = points[j].lat;
      const dx = points[(j + 1) % n].lng;
      const dy = points[(j + 1) % n].lat;
      const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (Math.abs(denom) < 1e-12) continue;
      const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
      const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom;
      if (t > 0 && t < 1 && u > 0 && u < 1) return false;
    }
  }
  return true;
}

export function makeCampaignBuildingLayers(
  buildings: MapBuilding[],
  options?: { idPrefix?: string; parameters?: Record<string, unknown> },
) {
  const idPrefix = options?.idPrefix ?? "";
  const parameters = options?.parameters;
  const drawableBuildings = buildings.filter((building) => {
    const ring = openRing(building);
    return ring.length >= 3 && building.heightM > 0 && isSimplePolygon(ring);
  });
  const facadeBands = drawableBuildings.flatMap(makeFacadeBands);
  const verticalEdges = drawableBuildings.flatMap(makeVerticalEdges);

  return [
    new PolygonLayer<MapBuilding>({
      id: `${idPrefix}campaign-building-extrusions`,
      data: drawableBuildings,
      getPolygon: getBuildingPolygon,
      extruded: true,
      wireframe: false,
      getElevation: (building) => Math.max(1, building.heightM - building.baseHeightM),
      getFillColor: FACADE,
      filled: true,
      stroked: false,
      pickable: false,
      material: {
        ambient: 0.42,
        diffuse: 0.58,
        shininess: 18,
        specularColor: [210, 218, 220],
      },
      ...(parameters ? { parameters } : {}),
    }),
    new PolygonLayer<MapBuilding>({
      id: `${idPrefix}campaign-building-roofs`,
      data: drawableBuildings,
      getPolygon: getRoofPolygon,
      getFillColor: ROOF,
      filled: true,
      stroked: false,
      pickable: false,
      ...(parameters ? { parameters } : {}),
    }),
    new PathLayer<MapBuilding>({
      id: `${idPrefix}campaign-building-roof-outlines`,
      data: drawableBuildings,
      getPath: getOutlinePath,
      getColor: [70, 66, 60, 145],
      getWidth: 0.55,
      widthUnits: "meters",
      widthMinPixels: 0.45,
      pickable: false,
      ...(parameters ? { parameters } : {}),
    }),
    new PathLayer<BuildingPathDetail>({
      id: `${idPrefix}campaign-building-floor-bands`,
      data: facadeBands,
      getPath: (detail) => detail.path,
      getColor: (detail) => detail.color,
      getWidth: (detail) => detail.width,
      widthUnits: "meters",
      widthMinPixels: 0.35,
      pickable: false,
      ...(parameters ? { parameters } : {}),
    }),
    new PathLayer<BuildingPathDetail>({
      id: `${idPrefix}campaign-building-vertical-edges`,
      data: verticalEdges,
      getPath: (detail) => detail.path,
      getColor: (detail) => detail.color,
      getWidth: (detail) => detail.width,
      widthUnits: "meters",
      widthMinPixels: 0.25,
      pickable: false,
      ...(parameters ? { parameters } : {}),
    }),
  ];
}
