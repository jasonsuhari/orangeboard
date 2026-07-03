import type { CSSProperties } from "react";
import type { TrafficBbox } from "../trafficFlowLayers";
import type { OnboardingCamera } from "./onboardingOverlays";

export const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// The creative generated on the landing page is stashed here so it can ride
// over to the map and get composited onto the real sign. Falls back to a sample.
export const CREATIVE_KEY = "vs:creative";
export const DEFAULT_CREATIVE = "/sample-creative.svg";
export const CAMPAIGN_BLOB_KEY = "orangeboard:campaign-blob";
export const CAMPAIGN_LAUNCH_KEY = "orangeboard:campaign-launch";
export const SIM_RENDER_INTERVAL_MS = 50;

// Covers the entire Mercator-visible world for the blackout mask.
export const WORLD_RING: [number, number][] = [
  [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85],
];

// SF Planning GASP inventory, served from /public (see scripts/scrape-billboards.mjs).
export const BILLBOARDS_URL = "/sf-billboards.geojson";

// deck.gl owns the camera (sightline structure); Mapbox renders underneath.
export const INITIAL_VIEW_STATE = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 15.35,
  pitch: 68,
  bearing: -28,
  maxPitch: 85,
};

// Traffic flow bbox — padded generously around the initial view so the user
// can pan without losing the lines. Filters out the 97%+ of SF segments that
// are off-screen, keeping the synchronous JS computation fast.
export const TRAFFIC_BBOX: TrafficBbox = {
  minLng: INITIAL_VIEW_STATE.longitude - 0.04,
  maxLng: INITIAL_VIEW_STATE.longitude + 0.04,
  minLat: INITIAL_VIEW_STATE.latitude - 0.03,
  maxLat: INITIAL_VIEW_STATE.latitude + 0.03,
};

export const DEFAULT_ONBOARDING_CAMERA: OnboardingCamera = {
  lng: -122.39339186418016,
  lat: 37.79533551339635,
  zoom: 17.246153522785516,
  pitch: 85,
  bearing: -141.60000000000002,
};

export const cyclerButtonStyle: CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "none",
  background: "transparent",
  color: "rgba(255,255,255,0.78)",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1,
};

export const journalIconButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 7,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1,
};
