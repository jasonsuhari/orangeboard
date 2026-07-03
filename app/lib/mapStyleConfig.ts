import type mapboxgl from "mapbox-gl";

// Mapbox Standard style config — dusk lighting, full 3D objects/landmarks/trees,
// muted land/road/water palette, POI labels off. Ported from sightline's setup.
const STANDARD_STYLE_CONFIG: Array<[string, unknown]> = [
  ["show3dObjects", true],
  ["show3dLandmarks", true],
  ["show3dTrees", true],
  ["showPointOfInterestLabels", false],
  ["showPointOfInterestIcons", false],
  ["densityPointOfInterestLabels", 0],
  ["lightPreset", "dusk"],
  ["colorLand", "#a8a39a"],
  ["colorRoads", "#9e9890"],
  ["colorWater", "#3d6e8c"],
  ["show3dBuildings", true],
  ["show3dFacades", true],
];

export function applyStandardStyleConfig(map: mapboxgl.Map) {
  for (const [property, value] of STANDARD_STYLE_CONFIG) {
    try {
      map.setConfigProperty("basemap", property, value);
    } catch {
      // Some Standard config options depend on the active GL/style version.
    }
  }
}

const MAPBOX_CAMPAIGN_LABEL_CONFIG = [
  "showRoadLabels",
  "showTransitLabels",
  "showPlaceLabels",
] as const;

export function setMapboxCampaignLabelsVisible(map: mapboxgl.Map, visible: boolean) {
  for (const property of MAPBOX_CAMPAIGN_LABEL_CONFIG) {
    try {
      map.setConfigProperty("basemap", property, visible);
    } catch {
      // Standard style config support varies by Mapbox GL/style version.
    }
  }
}
