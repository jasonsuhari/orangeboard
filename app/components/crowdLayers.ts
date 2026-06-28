import { ColumnLayer } from "@deck.gl/layers";

// Ported from sightline's MapCanvas pedestrian renderer. Each agent is built from
// extruded square columns (ColumnLayer with diskResolution:4 → a box):
//   • people  = body cube (clothing color) + a smaller cream cube on top (head)
//   • car/bus = chassis cube + a narrower cabin cube + a thin cream roof slab
// Grouped by kind so the whole crowd is a handful of layers.

export interface CrowdAgent {
  lng: number;
  lat: number;
  kind: string;
}

type RGBA = [number, number, number, number];

const CREAM: RGBA = [248, 224, 188, 250];
const PEOPLE_KINDS = new Set(["walker", "runner", "cyclist", "tourist"]);

const KIND_STYLE: Record<string, { radius: number; elevation: number; color: RGBA }> = {
  car: { radius: 1.3, elevation: 1.0, color: [220, 50, 50, 245] },
  bus: { radius: 1.7, elevation: 1.6, color: [59, 130, 246, 245] },
  cyclist: { radius: 0.7, elevation: 1.1, color: [255, 196, 0, 245] },
  runner: { radius: 0.55, elevation: 1.15, color: [122, 232, 96, 245] },
  tourist: { radius: 0.55, elevation: 1.1, color: [200, 110, 255, 245] },
  walker: { radius: 0.55, elevation: 1.15, color: [73, 145, 255, 240] },
};

const VEHICLE_KINDS = new Set(["car", "bus"]);

export function buildCrowdLayers(agents: CrowdAgent[]): ColumnLayer<CrowdAgent>[] {
  const groups = new Map<string, CrowdAgent[]>();
  for (const a of agents) {
    const k = a.kind ?? "walker";
    const list = groups.get(k);
    if (list) list.push(a);
    else groups.set(k, [a]);
  }

  const layers: ColumnLayer<CrowdAgent>[] = [];

  for (const [kind, list] of groups.entries()) {
    const style = KIND_STYLE[kind] ?? KIND_STYLE.walker;

    // Body / chassis
    layers.push(
      new ColumnLayer<CrowdAgent>({
        id: `crowd-${kind}-body`,
        data: list,
        diskResolution: 4,
        radius: style.radius,
        radiusUnits: "meters",
        extruded: true,
        filled: true,
        stroked: false,
        material: { ambient: 0.55, diffuse: 0.7, shininess: 8 },
        getPosition: (a) => [a.lng, a.lat, 0],
        getElevation: style.elevation,
        elevationScale: 1,
        getFillColor: style.color,
        getLineColor: [20, 24, 32, 220],
        angle: 45,
        pickable: false,
      })
    );

    if (PEOPLE_KINDS.has(kind)) {
      // Head: 80% of body width, cream, sitting on top of the body
      const headBase = style.elevation;
      const headRadius = style.radius * 0.8;
      const headHeight = style.radius * 1.2;
      layers.push(
        new ColumnLayer<CrowdAgent>({
          id: `crowd-${kind}-head`,
          data: list,
          diskResolution: 4,
          radius: headRadius,
          radiusUnits: "meters",
          extruded: true,
          filled: true,
          stroked: false,
          material: { ambient: 0.6, diffuse: 0.65, shininess: 6 },
          getPosition: (a) => [a.lng, a.lat, headBase],
          getElevation: headHeight,
          elevationScale: 1,
          getFillColor: CREAM,
          getLineColor: [40, 30, 20, 200],
          angle: 45,
          pickable: false,
        })
      );
    } else if (VEHICLE_KINDS.has(kind)) {
      // Cabin: narrower + shorter cube stacked on the chassis to suggest a roof.
      const cabinBase = style.elevation;
      layers.push(
        new ColumnLayer<CrowdAgent>({
          id: `crowd-${kind}-cabin`,
          data: list,
          diskResolution: 4,
          radius: style.radius * 0.72,
          radiusUnits: "meters",
          extruded: true,
          filled: true,
          stroked: false,
          material: { ambient: 0.5, diffuse: 0.7, shininess: 30 },
          getPosition: (a) => [a.lng, a.lat, cabinBase],
          getElevation: 0.85,
          elevationScale: 1,
          getFillColor: [40, 50, 70, 235], // tinted windshield
          getLineColor: [10, 12, 18, 220],
          angle: 45,
          pickable: false,
        })
      );
      // Roof highlight: thin cream slab on top of the cabin
      const roofBase = cabinBase + 0.85;
      layers.push(
        new ColumnLayer<CrowdAgent>({
          id: `crowd-${kind}-roof`,
          data: list,
          diskResolution: 4,
          radius: style.radius * 0.6,
          radiusUnits: "meters",
          extruded: true,
          filled: true,
          stroked: false,
          material: { ambient: 0.55, diffuse: 0.7, shininess: 12 },
          getPosition: (a) => [a.lng, a.lat, roofBase],
          getElevation: 0.18,
          elevationScale: 1,
          getFillColor: [240, 220, 188, 245],
          getLineColor: [40, 30, 20, 200],
          angle: 45,
          pickable: false,
        })
      );
    }
  }

  return layers;
}

// User-spawned billboards dropped at the map center. Rendered as a steel pole
// column + a boxy sign panel on top — a deck.gl stand-in so a spawn is instantly
// visible regardless of the Three.js billboard layer.
export function buildBillboardMarkers(
  points: { lng: number; lat: number }[]
): ColumnLayer<{ lng: number; lat: number }>[] {
  if (points.length === 0) return [];
  const POLE = 11; // pole height (m) to the bottom of the sign
  return [
    new ColumnLayer<{ lng: number; lat: number }>({
      id: "spawn-billboard-pole",
      data: points,
      diskResolution: 8,
      radius: 0.35,
      radiusUnits: "meters",
      extruded: true,
      filled: true,
      stroked: false,
      material: { ambient: 0.5, diffuse: 0.7, shininess: 20 },
      getPosition: (p) => [p.lng, p.lat, 0],
      getElevation: POLE,
      elevationScale: 1,
      getFillColor: [138, 154, 176, 255], // steel
      pickable: false,
    }),
    new ColumnLayer<{ lng: number; lat: number }>({
      id: "spawn-billboard-panel",
      data: points,
      diskResolution: 4,
      radius: 4,
      radiusUnits: "meters",
      extruded: true,
      filled: true,
      stroked: false,
      material: { ambient: 0.6, diffuse: 0.7, shininess: 10 },
      getPosition: (p) => [p.lng, p.lat, POLE],
      getElevation: 4.6,
      elevationScale: 1,
      getFillColor: [249, 115, 22, 255], // orange sign face
      getLineColor: [20, 24, 32, 220],
      angle: 0,
      pickable: false,
    }),
  ];
}
