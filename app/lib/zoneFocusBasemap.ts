import type mapboxgl from "mapbox-gl";
import type { ClipLayerSpecification, GeoJSONSource } from "mapbox-gl";
import { WORLD_RING } from "../components/map/constants";
import { closeRing } from "./mapGeometry";

// Campaign focus mode strips the Standard basemap's 3D models (buildings,
// landmarks, trees) and symbols outside the selected zone via a `clip` layer,
// so the blacked-out world is truly empty and only the focused diorama keeps
// its skyline. The mask is the same inverse shape the campaign-blackout deck
// layer uses: the whole Mercator world with the zone as a hole.

/** Shared id for both the GeoJSON source and the clip layer. */
export const ZONE_CLIP_ID = "zone-focus-clip";

type ZoneClipMask = {
  type: "Feature";
  properties: Record<string, never>;
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
};

export function zoneClipMask(zone: [number, number][]): ZoneClipMask {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [closeRing(WORLD_RING), [...closeRing(zone)].reverse()],
    },
  };
}

const ZONE_CLIP_LAYER: ClipLayerSpecification = {
  id: ZONE_CLIP_ID,
  type: "clip",
  source: ZONE_CLIP_ID,
  layout: {
    "clip-layer-types": ["model", "symbol"],
    "clip-layer-scope": ["basemap"],
  },
};

/** Idempotent add/update — safe to call repeatedly (style reloads wipe both
 *  the source and the layer, so each call restores whatever is missing). */
export function ensureZoneClipLayer(map: mapboxgl.Map, zone: [number, number][]): void {
  try {
    const source = map.getSource(ZONE_CLIP_ID) as GeoJSONSource | undefined;
    if (source) source.setData(zoneClipMask(zone));
    else map.addSource(ZONE_CLIP_ID, { type: "geojson", data: zoneClipMask(zone) });
    if (!map.getLayer(ZONE_CLIP_ID)) map.addLayer(ZONE_CLIP_LAYER);
  } catch {
    // Style not loaded yet (the style.load listener will retry) or mid-teardown.
  }
}

export function removeZoneClipLayer(map: mapboxgl.Map): void {
  try {
    if (map.getLayer(ZONE_CLIP_ID)) map.removeLayer(ZONE_CLIP_ID);
    if (map.getSource(ZONE_CLIP_ID)) map.removeSource(ZONE_CLIP_ID);
  } catch {
    // Map may already be tearing down.
  }
}
