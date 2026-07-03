import type { Layer } from "@deck.gl/core";
import { PathLayer, SolidPolygonLayer } from "@deck.gl/layers";
import { closeRing, ringSignedArea } from "../../lib/mapGeometry";

// Diorama baseplate for campaign focus mode: skirt walls hang from the zone
// boundary (z=0) down to -BASEPLATE_DEPTH_M so the focused island reads as a
// thick slab floating in the blackout, plus an orange rim tracing the top edge.
//
// Depth choices: the walls live below the basemap's flat z=0 ground plane,
// which has already written nearer depth along every below-ground ray, so a
// normal depth test would bury them — they must draw with depthCompare
// "always". To stop far-side walls from stomping in-zone content, only
// camera-facing walls are emitted (culled in JS: _full3d triangulation makes
// GPU winding per-edge inconsistent, so cullMode can't do it). A facing wall's
// screen extent sits strictly below the zone-boundary ground line, so it can
// only cover already-blacked-out pixels.

const BASEPLATE_DEPTH_M = 55;
// Fake key light from the NW, matching the Standard style's dusk preset.
const LIGHT_DIR: [number, number] = [-Math.SQRT1_2, Math.SQRT1_2];
const SLAB_DARK: [number, number, number] = [21, 23, 33];
const SLAB_LIT: [number, number, number] = [64, 70, 96];
const RIM_COLOR: [number, number, number, number] = [249, 115, 22, 210];

type SkirtQuad = {
  polygon: [number, number, number][];
  color: [number, number, number, number];
};

function skirtQuads(ring: [number, number][], camera: [number, number] | null): SkirtQuad[] {
  const quads: SkirtQuad[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng0, lat0] = ring[i];
    const [lng1, lat1] = ring[i + 1];
    // Local-metric edge direction; outward normal is 90° right of travel on a
    // CCW ring: (dx, dy) -> (dy, -dx).
    const cosLat = Math.cos((lat0 * Math.PI) / 180);
    const dx = (lng1 - lng0) * cosLat;
    const dy = lat1 - lat0;
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;
    if (camera) {
      // Camera on the outward (right) side of the edge → wall faces the camera.
      const cx = (camera[0] - lng0) * cosLat;
      const cy = camera[1] - lat0;
      if (dx * cy - dy * cx >= 0) continue;
    }
    const lambert = 0.5 + 0.5 * ((dy * LIGHT_DIR[0] - dx * LIGHT_DIR[1]) / len);
    const t = 0.35 + 0.65 * lambert;
    quads.push({
      polygon: [
        [lng0, lat0, 0],
        [lng0, lat0, -BASEPLATE_DEPTH_M],
        [lng1, lat1, -BASEPLATE_DEPTH_M],
        [lng1, lat1, 0],
      ],
      color: [
        Math.round(SLAB_DARK[0] + (SLAB_LIT[0] - SLAB_DARK[0]) * t),
        Math.round(SLAB_DARK[1] + (SLAB_LIT[1] - SLAB_DARK[1]) * t),
        Math.round(SLAB_DARK[2] + (SLAB_LIT[2] - SLAB_DARK[2]) * t),
        255,
      ],
    });
  }
  return quads;
}

export function buildBaseplateLayers(
  zone: [number, number][],
  camera: [number, number] | null = null,
): Layer[] {
  let ring = closeRing(zone);
  if (ring.length < 4) return [];
  if (ringSignedArea(ring) < 0) ring = [...ring].reverse();

  return [
    new SolidPolygonLayer<SkirtQuad>({
      id: "zone-baseplate-skirt",
      data: skirtQuads(ring, camera),
      getPolygon: (d) => d.polygon,
      getFillColor: (d) => d.color,
      extruded: false,
      // Vertical quads: earcut's default 2D projection degenerates without this.
      _full3d: true,
      pickable: false,
      parameters: { depthCompare: "always", depthWriteEnabled: true },
    }),
    new PathLayer<[number, number, number][]>({
      id: "zone-baseplate-rim",
      data: [ring.map(([lng, lat]): [number, number, number] => [lng, lat, 0.4])],
      getPath: (d) => d,
      getColor: RIM_COLOR,
      getWidth: 2.5,
      widthUnits: "pixels",
      widthMinPixels: 2,
      pickable: false,
      parameters: { depthCompare: "always", depthWriteEnabled: false },
    }),
  ];
}
