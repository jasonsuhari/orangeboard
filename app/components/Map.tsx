"use client";

import { useEffect, useRef, useState, useMemo, useCallback, type CSSProperties } from "react";
import type { PickingInfo, Layer } from "@deck.gl/core";
import { ScatterplotLayer, LineLayer, SolidPolygonLayer } from "@deck.gl/layers";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import { Map as MapboxMap, useControl, type MapRef } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapNav from "./MapNav";
import StreetViewComposite from "./StreetViewComposite";
import { buildCrowdLayers, type CrowdAgent } from "./crowdLayers";
import BillboardMeshLayer, { type BillboardPoint } from "./BillboardMeshLayer";
import {
  computeTrafficFlow,
  buildTrafficFlowLayers,
  clipTrafficFlowToPolygon,
  type TrafficFlowData,
  type TrafficBbox,
} from "./trafficFlowLayers";
import { computeSaliency, withSemanticPriors } from "../lib/saliency";
import { fuseStreet, heuristicStreetPerception, simulateStreetAgents } from "../lib/attention";
import { environmentLook, fetchCurrentConditions, type CurrentConditions } from "../lib/currentConditions";
import { projectBillboardCorners } from "../lib/projectBillboard";
import { drawHeatmap, drawScanpath } from "../lib/canvasDraw";
import type { AgentVisionReportInput, CampaignReportInput, TargetAccountInput, VisionReportInput } from "../lib/campaignReport";
import type { AttentionSimResult, CompanyBrief, Region, SaliencyResult, SceneElement, VlmPerception } from "../lib/types";
import {
  type SimAgent, type RoadNet, type PedWeight, type MuniVehicle,
  buildRoadNetwork, spawnRoadCar, spawnRoadPed, stepSimAgent,
  syntheticCar, syntheticPed, syntheticBuses,
  targetCarCount, targetPedCount, CAR_COUNT, BUS_COUNT, PED_COUNT,
} from "../lib/trafficSim";
import {
  normalizeCampaignPedestrianContext,
  PEDESTRIAN_CONTEXT_STORAGE_KEY,
  samplePedestrianProfile,
  type CampaignPedestrianContext,
  type PedestrianProfile,
} from "../lib/pedestrianIcp";
import {
  PEDESTRIAN_VISION_DEFAULTS,
  bearingFromMovementRad,
  buildPedestrianVisionIndex,
  createPedestrianVisionState,
  findPedestrianBillboardTrigger,
  pedestrianStreetViewImageUrl,
  type PedestrianBillboardCapture,
  type PedestrianVisionAgent,
  type PedestrianVisionIndex,
  type VisionBillboard,
} from "../simulation/pedestrianVision";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// The creative generated on the landing page is stashed here so it can ride
// over to the map and get composited onto the real sign. Falls back to a sample.
const CREATIVE_KEY = "vs:creative";
const DEFAULT_CREATIVE = "/sample-creative.svg";
const CAMPAIGN_BLOB_KEY = "orangeboard:campaign-blob";
const CAMPAIGN_LAUNCH_KEY = "orangeboard:campaign-launch";
const CAMPAIGN_TRAFFIC_BBOX_PADDING_DEG = 0.003;

// Covers the entire Mercator-visible world for the blackout mask.
const WORLD_RING: [number, number][] = [
  [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85],
];

// SF Planning GASP inventory, served from /public (see scripts/scrape-billboards.mjs).
const BILLBOARDS_URL = "/sf-billboards.geojson";

// deck.gl owns the camera (sightline structure); Mapbox renders underneath.
const INITIAL_VIEW_STATE = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 15.35,
  pitch: 68,
  bearing: -28,
  maxPitch: 85,
};

// Agents spawn within this radius of the view center so the crowd is dense and
// actually visible at the initial zoom — otherwise 150 peds scattered across all
// of SF (~15 km²) leave only a handful in frame. Mirrors sightline's habit of
// spawning agents inside the focused area rather than the whole city.
const SPAWN_CENTER = { lng: INITIAL_VIEW_STATE.longitude, lat: INITIAL_VIEW_STATE.latitude };
const SPAWN_RADIUS_DEG = 0.007; // ~600–780 m around the view center

// Traffic flow bbox — padded generously around the initial view so the user
// can pan without losing the lines. Filters out the 97%+ of SF segments that
// are off-screen, keeping the synchronous JS computation fast.
function spawnCenterForCampaign(context: CampaignPedestrianContext | null) {
  if (!context?.centroid) return { ...SPAWN_CENTER, radiusDeg: SPAWN_RADIUS_DEG };
  const radiusM = context.radiusM ?? 520;
  return {
    lng: context.centroid.lng,
    lat: context.centroid.lat,
    radiusDeg: Math.min(0.01, Math.max(0.0035, (radiusM * 1.2) / 111320)),
  };
}

const TRAFFIC_BBOX: TrafficBbox = {
  minLng: INITIAL_VIEW_STATE.longitude - 0.04,
  maxLng: INITIAL_VIEW_STATE.longitude + 0.04,
  minLat: INITIAL_VIEW_STATE.latitude - 0.03,
  maxLat: INITIAL_VIEW_STATE.latitude + 0.03,
};

function bboxForPolygon(polygon: [number, number][], paddingDeg = CAMPAIGN_TRAFFIC_BBOX_PADDING_DEG): TrafficBbox {
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

function trafficCacheKey(bbox: TrafficBbox, clipPolygon: [number, number][] | null): string {
  const bboxKey = [bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat]
    .map((value) => value.toFixed(6))
    .join(",");
  const clipKey = clipPolygon
    ? clipPolygon.map(([lng, lat]) => `${lng.toFixed(5)}:${lat.toFixed(5)}`).join(";")
    : "all";
  return `${clipPolygon ? "campaign" : "default"}:${bboxKey}:${clipKey}`;
}

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

function applyStandardStyleConfig(map: mapboxgl.Map) {
  for (const [property, value] of STANDARD_STYLE_CONFIG) {
    try {
      map.setConfigProperty("basemap", property, value);
    } catch {
      // Some Standard config options depend on the active GL/style version.
    }
  }
}

type Billboard = {
  id: string;
  lng: number;
  lat: number;
  name: string;
  address: string;
  status: string;
  seller: string;
  format: string;
  dimensions: string;
  facing: string;
  rateCard: string;
  estimatedCpm: string;
  availability: string;
  lighting: string;
  mediaType: string;
  restrictions: string;
  bookingContact: string;
  purchaseUrl: string;
};

type CampaignLaunch = {
  mode?: "preview" | "simulation";
  creativeUrl?: string;
  opportunity?: {
    id?: string;
    title?: string;
    area?: string;
  };
  board?: {
    id?: string;
    name?: string;
    address?: string;
    status?: string;
    lng?: number;
    lat?: number;
    seller?: string;
    format?: string;
    dimensions?: string;
    facing?: string;
    rateCard?: string;
    estimatedCpm?: string;
    availability?: string;
    lighting?: string;
    mediaType?: string;
    restrictions?: string;
    bookingContact?: string;
    purchaseUrl?: string;
  };
};

function propString(props: GeoJSON.GeoJsonProperties, key: string, fallback: string): string {
  const value = props?.[key];
  if (value == null) return fallback;
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function billboardFromLaunch(launch: CampaignLaunch | null): Billboard | null {
  const board = launch?.board;
  if (!board || typeof board.lng !== "number" || typeof board.lat !== "number") return null;
  return {
    id: board.id ?? `campaign:${board.lng.toFixed(6)},${board.lat.toFixed(6)}`,
    lng: board.lng,
    lat: board.lat,
    name: board.name ?? "Selected billboard",
    address: board.address ?? "",
    status: board.status ?? "Selected",
    seller: board.seller ?? "Media owner confirmation required",
    format: board.format ?? "General Advertising Sign",
    dimensions: board.dimensions ?? "Seller-provided",
    facing: board.facing ?? "Field verification required",
    rateCard: board.rateCard ?? "Rate card seller-confirmed",
    estimatedCpm: board.estimatedCpm ?? "Estimated CPM seller-confirmed",
    availability: board.availability ?? "Availability seller-confirmed",
    lighting: board.lighting ?? "Lighting seller-confirmed",
    mediaType: board.mediaType ?? "Static",
    restrictions: board.restrictions ?? "Restrictions seller-confirmed",
    bookingContact: board.bookingContact ?? "Booking contact seller-confirmed",
    purchaseUrl: board.purchaseUrl ?? "",
  };
}

function sameBillboardLocation(a: { lng: number; lat: number }, b: { lng: number; lat: number }): boolean {
  return Math.abs(a.lng - b.lng) < 0.00002 && Math.abs(a.lat - b.lat) < 0.00002;
}

type JournalPageStatus = "rendering" | "analyzing" | "done" | "error";
type JournalAgentStatus = "thinking" | "done" | "error";

type PedestrianAgentLog = {
  agentId: string;
  displayName: string;
  profileSummary: string;
  chatMessage: string;
  remembered: string;
  motivation: string;
  objection: string;
  nextQuestion: string;
  score: number;
  source: "openai" | "fallback";
  model?: string;
};

type JournalPage = {
  id: string;
  capture: PedestrianBillboardCapture;
  profileId: string;
  profile: PedestrianProfile;
  createdAt: number;
  status: JournalPageStatus;
  agentStatus?: JournalAgentStatus;
  agent?: PedestrianAgentLog;
  agentError?: string;
  imageUrl?: string;
  cleanImageUrl?: string;
  heatmapImageUrl?: string;
  eyeScanImageUrl?: string;
  region?: Region;
  result?: AttentionSimResult;
  elements?: SceneElement[];
  error?: string;
};

type ProjectedStreetScene = {
  imageUrl: string;
  imageData: ImageData;
  region: Region;
};

// Interleaved deck.gl overlay. Unlike the overlaid `<DeckGL><Map/>` pattern (which
// draws every deck layer on top of the whole basemap and can't be occluded by it),
// MapboxOverlay with `interleaved` injects the deck layers *into* Mapbox's render
// stack so they share its depth buffer — the Standard style's 3D buildings then
// correctly occlude the billboard + crowd models. Mapbox owns the camera here.
function DeckOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

function CampaignBlackoutOverlay({
  map,
  polygon,
}: {
  map: mapboxgl.Map | null;
  polygon: [number, number][] | null;
}) {
  const [mask, setMask] = useState<{ path: string; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!map || !polygon || polygon.length < 3) {
      setMask(null);
      return;
    }

    let frameId: number | null = null;

    const updateMask = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const canvas = map.getCanvas();
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (width <= 0 || height <= 0) {
          setMask(null);
          return;
        }

        const points = polygon
          .map(([lng, lat]) => map.project([lng, lat]))
          .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
        if (points.length < 3) {
          setMask(null);
          return;
        }

        const outer = `M0 0H${width}V${height}H0Z`;
        const inner = `${points
          .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
          .join(" ")} Z`;
        const nextMask = { path: `${outer} ${inner}`, width, height };
        setMask((current) =>
          current?.path === nextMask.path &&
          current.width === nextMask.width &&
          current.height === nextMask.height
            ? current
            : nextMask,
        );
      });
    };

    updateMask();
    map.on("move", updateMask);
    map.on("resize", updateMask);
    map.on("style.load", updateMask);

    return () => {
      map.off("move", updateMask);
      map.off("resize", updateMask);
      map.off("style.load", updateMask);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [map, polygon]);

  if (!mask) return null;

  return (
    <svg
      aria-hidden
      width={mask.width}
      height={mask.height}
      viewBox={`0 0 ${mask.width} ${mask.height}`}
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <path d={mask.path} fill="#0d0e14" fillRule="evenodd" />
    </svg>
  );
}

export default function Map() {
  const mapRef = useRef<MapRef | null>(null);
  const creativeRef = useRef<string>(DEFAULT_CREATIVE);
  const simVisibleRef = useRef(true);
  // Road network + Muni live data refs (updated async, read by RAF loop)
  const roadNetRef = useRef<RoadNet | null>(null);
  const pedWeightsRef = useRef<PedWeight[]>([]);
  const muniVehiclesRef = useRef<MuniVehicle[]>([]);
  const muniLiveRef = useRef(false);
  // Cached foot-traffic flow dataset (computed once per campaign/default bbox).
  const trafficFlowRef = useRef<{ key: string; data: TrafficFlowData } | null>(null);
  const showTrafficRef = useRef(false);
  const visionEnabledRef = useRef(true);
  const visionIndexRef = useRef<PedestrianVisionIndex | null>(null);
  const visionStateRef = useRef(createPedestrianVisionState());
  const campaignContextRef = useRef<CampaignPedestrianContext | null>(null);
  // Live crowd positions, written by the RAF loop and read when layers rebuild.
  const agentsRef = useRef<CrowdAgent[]>([]);
  // User-placed models (dropped by the nav spawn tools, see placeMode below)
  const spawnPedsRef = useRef<{ agent: SimAgent; profile: PedestrianProfile }[]>([]);
  const spawnBillboardsRef = useRef<{ lng: number; lat: number }[]>([]);
  const placeModeRef = useRef<"billboard" | "pedestrian" | null>(null);
  const journalSeqRef = useRef(0);
  const enqueueJournalPageRef = useRef<(capture: PedestrianBillboardCapture, profile: PedestrianProfile) => void>(() => {});

  const [mapboxMap, setMapboxMap] = useState<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [selected, setSelected] = useState<Billboard | null>(null);
  const [creative, setCreative] = useState<string>(DEFAULT_CREATIVE);
  const [campaignLaunch, setCampaignLaunch] = useState<CampaignLaunch | null>(null);
  const [campaignPreviewMode, setCampaignPreviewMode] = useState(false);
  const [campaignBlob, setCampaignBlob] = useState<[number, number][] | null>(null);
  const [simVisible, setSimVisible] = useState(true);
  const [muniLive, setMuniLive] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [visionEnabled, setVisionEnabled] = useState(true);
  const [campaignContext, setCampaignContext] = useState<CampaignPedestrianContext | null>(null);
  const [visionCapture, setVisionCapture] = useState<PedestrianBillboardCapture | null>(null);
  const [journalPages, setJournalPages] = useState<JournalPage[]>([]);
  const [activeJournalId, setActiveJournalId] = useState<string | null>(null);
  const [showJournal, setShowJournal] = useState(false);
  // Active placement tool: click the map to drop a billboard / pedestrian there.
  const [placeMode, setPlaceMode] = useState<"billboard" | "pedestrian" | null>(null);
  // Debug: how many models the user has placed (proves the click action fires).
  const [placedCount, setPlacedCount] = useState(0);
  // Bumped by the RAF loop (~30fps) to re-render so deck layers pick up motion.
  const [frame, setFrame] = useState(0);

  const [brief, setBrief] = useState<CompanyBrief | null>(null);
  const [briefUrl, setBriefUrl] = useState("");
  const [briefStatus, setBriefStatus] = useState<"idle" | "reading" | "generating" | "done" | "error">("idle");
  const [briefError, setBriefError] = useState<string | null>(null);
  const [campaignExporting, setCampaignExporting] = useState(false);
  const [campaignExportError, setCampaignExportError] = useState<string | null>(null);

  useEffect(() => {
    if (mapboxMap) return;
    let raf = 0;
    const captureMap = () => {
      const map = mapRef.current?.getMap() as unknown as mapboxgl.Map | undefined;
      if (map) {
        // `onLoad` is unreliable here, so the Standard style config (dusk lighting,
        // 3D objects, muted palette) is applied from this capture path instead.
        const applyConfig = () => applyStandardStyleConfig(map);
        if (map.isStyleLoaded()) applyConfig();
        else map.once("style.load", applyConfig);
        setMapboxMap(map);
        return;
      }
      raf = window.requestAnimationFrame(captureMap);
    };
    raf = window.requestAnimationFrame(captureMap);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [mapboxMap]);

  useEffect(() => { creativeRef.current = creative; }, [creative]);
  useEffect(() => { simVisibleRef.current = simVisible; }, [simVisible]);
  useEffect(() => { showTrafficRef.current = showTraffic; }, [showTraffic]);
  useEffect(() => { visionEnabledRef.current = visionEnabled; }, [visionEnabled]);
  useEffect(() => { placeModeRef.current = placeMode; }, [placeMode]);

  const sightlineSetAtRef = useRef<number>(0);
  useEffect(() => {
    if (visionCapture) sightlineSetAtRef.current = performance.now();
  }, [visionCapture]);

  useEffect(() => {
    if (!visionCapture) return;
    const timeout = window.setTimeout(() => setVisionCapture(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [visionCapture]);

  const updateJournalPage = useCallback((pageId: string, patch: Partial<JournalPage>) => {
    setJournalPages((pages) =>
      pages.map((page) => (page.id === pageId ? { ...page, ...patch } : page)),
    );
  }, []);

  const runJournalVision = useCallback(
    async (pageId: string, capture: PedestrianBillboardCapture, profile: PedestrianProfile, creativeUrl: string) => {
      try {
        updateJournalPage(pageId, { status: "rendering" });

        const scene = await renderProjectedStreetScene(capture, creativeUrl);
        updateJournalPage(pageId, {
          status: "analyzing",
          imageUrl: scene.imageUrl,
          cleanImageUrl: scene.imageUrl,
          region: scene.region,
        });

        const baseSaliency = computeSaliency(scene.imageData);
        const response = await fetch("/api/vision-simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: scene.imageUrl,
            mode: "street",
            context: `Sidewalk pedestrian sighting from ${Math.round(capture.distanceM)}m, ${capture.angleOffCenterDeg.toFixed(0)} deg off-center.`,
          }),
        });
        const payload = response.ok
          ? ((await response.json()) as {
              perception?: VlmPerception;
              elements?: SceneElement[];
            })
          : null;

        const perception = payload?.perception ?? heuristicStreetPerception();
        const elements = payload?.elements ?? [];
        const priors = elements
          .filter((element) => !element.isBillboard)
          .map((element) => ({
            cx: element.box.x + element.box.w / 2,
            cy: element.box.y + element.box.h / 2,
            r: Math.max(element.box.w, element.box.h) / 2,
            weight: element.draw / 100,
          }));
        const saliency = priors.length ? withSemanticPriors(baseSaliency, priors) : baseSaliency;
        const region = scene.region;
        const agents = simulateStreetAgents(saliency, region);
        const result = fuseStreet(saliency, perception, agents, region);
        const heatmapImageUrl = renderHeatmapJournalImage(scene.imageData, saliency);
        const eyeScanImageUrl = renderScanpathJournalImage(scene.imageData, saliency);

        updateJournalPage(pageId, {
          status: "done",
          agentStatus: "thinking",
          imageUrl: heatmapImageUrl,
          heatmapImageUrl,
          eyeScanImageUrl,
          result,
          elements,
          error: undefined,
        });

        try {
          const agent = await requestPedestrianAgentLog({
            agentId: pedestrianProfileAgentId(capture.pedestrianId, profile),
            profile,
            capture,
            perception,
            result,
            campaignContext: campaignContextRef.current,
          });
          updateJournalPage(pageId, {
            agentStatus: "done",
            agent,
            agentError: undefined,
          });
        } catch (err) {
          updateJournalPage(pageId, {
            agentStatus: "error",
            agentError: err instanceof Error ? err.message : "Pedestrian agent failed.",
          });
        }
      } catch (err) {
        updateJournalPage(pageId, {
          status: "error",
          error: err instanceof Error ? err.message : "Vision journal failed.",
        });
      }
    },
    [updateJournalPage],
  );

  const enqueueJournalPage = useCallback(
    (capture: PedestrianBillboardCapture, profile: PedestrianProfile) => {
      const id = `${capture.id}:${Date.now()}:${journalSeqRef.current++}`;
      const profileSnapshot = { ...profile };
      const page: JournalPage = {
        id,
        capture,
        profileId: pedestrianProfileAgentId(capture.pedestrianId, profileSnapshot),
        profile: profileSnapshot,
        createdAt: Date.now(),
        status: "rendering",
      };
      setJournalPages((pages) => [page, ...pages].slice(0, 12));
      setActiveJournalId((current) => current === null ? id : current);
      void runJournalVision(id, capture, profileSnapshot, creativeRef.current);
    },
    [runJournalVision],
  );

  useEffect(() => {
    enqueueJournalPageRef.current = enqueueJournalPage;
  }, [enqueueJournalPage]);

  // Pedestrian vision only runs against the billboard the user is actively
  // working on — the focused/selected sign, the campaign-launch sign, and any
  // signs the user explicitly dropped. Scoping it here is what stops walkers from
  // firing sightline captures against the whole city inventory before a billboard
  // is even picked.
  const visionBillboards = useMemo<VisionBillboard[]>(
    () => {
      const result: VisionBillboard[] = [];
      const launchBillboard = billboardFromLaunch(campaignLaunch);
      if (launchBillboard) {
        result.push({
          id: `campaign:${launchBillboard.id}`,
          lng: launchBillboard.lng,
          lat: launchBillboard.lat,
          label: launchBillboard.name,
          address: launchBillboard.address,
        });
      }
      if (selected && !(launchBillboard && sameBillboardLocation(selected, launchBillboard))) {
        result.push({
          id: `selected:${selected.id}`,
          lng: selected.lng,
          lat: selected.lat,
          label: selected.name,
          address: selected.address,
        });
      }
      result.push(
        ...spawnBillboardsRef.current.map((b, i) => ({
          id: `placed:${i}:${b.lng.toFixed(6)},${b.lat.toFixed(6)}`,
          lng: b.lng,
          lat: b.lat,
          label: "Placed billboard",
        })),
      );
      return result;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, campaignLaunch, placedCount],
  );

  useEffect(() => {
    visionIndexRef.current = buildPedestrianVisionIndex(visionBillboards);
  }, [visionBillboards]);

  // Pick up the most recently generated creative (set by the landing flow).
  useEffect(() => {
    let launch: CampaignLaunch | null = null;

    try {
      const raw = localStorage.getItem(CREATIVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { imageUrl?: string };
        if (parsed.imageUrl) setCreative(parsed.imageUrl);
      }
    } catch {
      /* ignore malformed cache */
    }

    try {
      const raw = localStorage.getItem("vs:brief");
      if (raw) {
        const parsed = JSON.parse(raw) as CompanyBrief;
        setBrief(parsed);
        setBriefStatus("done");
      }
    } catch {
      /* ignore malformed cache */
    }

    try {
      const raw = localStorage.getItem(CAMPAIGN_LAUNCH_KEY);
      launch = raw ? (JSON.parse(raw) as CampaignLaunch) : null;
      const launchBillboard = billboardFromLaunch(launch);
      if (launchBillboard) {
        setCampaignLaunch(launch);
        setSelected(launchBillboard);
      }
      if (launch?.creativeUrl) {
        setCreative(launch.creativeUrl);
      }
      if (launch?.mode === "preview") {
        simVisibleRef.current = false;
        showTrafficRef.current = false;
        visionEnabledRef.current = false;
        setCampaignPreviewMode(true);
        setSimVisible(false);
        setShowTraffic(false);
        setVisionEnabled(false);
      }
    } catch {
      launch = null;
      setCampaignLaunch(null);
    }

    try {
      const raw = localStorage.getItem(CAMPAIGN_BLOB_KEY);
      if (raw) {
        const polygon = JSON.parse(raw) as [number, number][];
        if (Array.isArray(polygon) && polygon.length > 2) {
          setCampaignBlob(polygon);
          if (launch?.mode !== "preview") setShowTraffic(true);
        }
      }
    } catch {
      /* ignore malformed cache */
    }

    try {
      const raw = localStorage.getItem(PEDESTRIAN_CONTEXT_STORAGE_KEY);
      const parsed = raw ? normalizeCampaignPedestrianContext(JSON.parse(raw)) : null;
      campaignContextRef.current = parsed;
      setCampaignContext(parsed);
    } catch {
      campaignContextRef.current = null;
      setCampaignContext(null);
    }
  }, []);

  // Esc cancels the active placement tool.
  useEffect(() => {
    if (!placeMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPlaceMode(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placeMode]);

  // Billboard inventory — load the GASP signs.
  useEffect(() => {
    fetch(BILLBOARDS_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const feats: GeoJSON.Feature<GeoJSON.Point>[] = j?.features ?? [];
        if (!feats.length) return;
        setCount(feats.length);
        setBillboards(
          feats.map((f, i) => {
            const [lng, lat] = f.geometry.coordinates as [number, number];
            const p = f.properties ?? {};
            return {
              id: `inv:${i}:${lng.toFixed(6)},${lat.toFixed(6)}`,
              lng,
              lat,
              name: propString(p, "record_name", "Billboard"),
              address: propString(p, "address", ""),
              status: propString(p, "record_status", "-"),
              seller: propString(p, "owner_seller", "Media owner confirmation required"),
              format: propString(p, "record_type", "General Advertising Sign"),
              dimensions: propString(p, "dimensions", "Seller-provided"),
              facing: propString(p, "facing", "Field verification required"),
              rateCard: propString(p, "rate_card", "Rate card seller-confirmed"),
              estimatedCpm: propString(p, "estimated_cpm", "Estimated CPM seller-confirmed"),
              availability: propString(p, "availability", "Availability seller-confirmed"),
              lighting: propString(p, "lighting", "Lighting seller-confirmed"),
              mediaType: propString(p, "media_type", "Static"),
              restrictions: propString(p, "restrictions", "Restrictions seller-confirmed"),
              bookingContact: propString(p, "booking_contact", "Booking contact seller-confirmed"),
              purchaseUrl: propString(p, "acalink", ""),
            };
          })
        );
      })
      .catch(() => {});
  }, []);

  // Load static data once on mount: road network + pedestrian density weights.
  useEffect(() => {
    fetch("/sf-roads.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((fc) => { if (fc) roadNetRef.current = buildRoadNetwork(fc as GeoJSON.FeatureCollection); })
      .catch(() => {});
    fetch("/sf-ped-counts.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (Array.isArray(d)) pedWeightsRef.current = d as PedWeight[]; })
      .catch(() => {});
  }, []);

  // Poll NextBus every 30 seconds for real SF Muni vehicle positions.
  useEffect(() => {
    const poll = async () => {
      try {
        const v = (await fetch("/api/muni-vehicles").then((r) => r.json())) as MuniVehicle[];
        if (v.length > 0) {
          muniVehiclesRef.current = v;
          muniLiveRef.current = true;
          setMuniLive(true);
        }
      } catch { /* keep existing agents on network failure */ }
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  // RAF loop — steps pedestrian/vehicle/bus agents, writes positions into
  // agentsRef, and re-renders ~30fps so the deck layers animate.
  useEffect(() => {
    const spawnCenter = spawnCenterForCampaign(campaignContextRef.current);
    let cars: SimAgent[] = Array.from({ length: CAR_COUNT }, () => syntheticCar(spawnCenter));
    let buses: SimAgent[] = syntheticBuses();
    let peds: SimAgent[] = Array.from({ length: PED_COUNT }, () => syntheticPed(spawnCenter));
    let pedProfiles: PedestrianProfile[] = peds.map((a) =>
      samplePedestrianProfile(a.lng, a.lat, campaignContextRef.current),
    );
    let useRoadNet = false;
    let lastDensityCheck = 0;
    let lastProfileRefresh = 0;
    let lastT = performance.now();
    let lastRender = 0;
    let lastVisionCheck = 0;
    let prevPedPositions: { lng: number; lat: number }[] = [];
    let prevPlacedPedPositions: { lng: number; lat: number }[] = [];
    let raf: number;

    function tick() {
      const now = performance.now();
      const dt = Math.min(now - lastT, 100); // cap to avoid jumps after tab switch
      lastT = now;
      const net = roadNetRef.current;

      // One-time upgrade: migrate cars + peds to road-constrained once network loads
      if (!useRoadNet && net) {
        useRoadNet = true;
        cars = Array.from({ length: targetCarCount() }, () => spawnRoadCar(net, spawnCenter));
        peds = Array.from({ length: targetPedCount() }, () => spawnRoadPed(net, pedWeightsRef.current, spawnCenter));
        pedProfiles = peds.map((a) => samplePedestrianProfile(a.lng, a.lat, campaignContextRef.current));
      }

      // Merge live Muni buses once available; keep synthetic until then
      if (muniLiveRef.current && muniVehiclesRef.current.length > 0) {
        buses = muniVehiclesRef.current as unknown as SimAgent[];
      }

      // Density rescaling every 5 minutes (cars + peds track time-of-day demand)
      if (net && now - lastDensityCheck > 300_000) {
        lastDensityCheck = now;
        const tc = targetCarCount();
        if (cars.length > tc) cars.splice(tc);
        else while (cars.length < tc) cars.push(spawnRoadCar(net, spawnCenter));
        const tp = targetPedCount();
        if (peds.length > tp) { peds.splice(tp); pedProfiles.splice(tp); }
        else while (peds.length < tp) {
          const ped = spawnRoadPed(net, pedWeightsRef.current, spawnCenter);
          peds.push(ped);
          pedProfiles.push(samplePedestrianProfile(ped.lng, ped.lat, campaignContextRef.current));
        }
      }

      for (const a of cars) stepSimAgent(a, dt, now, net ?? undefined, false);
      for (const a of peds) stepSimAgent(a, dt, now, net ?? undefined, true);
      if (!muniLiveRef.current) {
        for (const a of buses) stepSimAgent(a, dt, now);
      }
      for (const s of spawnPedsRef.current) stepSimAgent(s.agent, dt, now, net ?? undefined, true);

      if (campaignContextRef.current && now - lastProfileRefresh > 8000) {
        lastProfileRefresh = now;
        pedProfiles = peds.map((a) => samplePedestrianProfile(a.lng, a.lat, campaignContextRef.current));
        for (const placed of spawnPedsRef.current) {
          placed.profile = samplePedestrianProfile(
            placed.agent.lng,
            placed.agent.lat,
            campaignContextRef.current,
          );
        }
      }

      if (
        visionEnabledRef.current &&
        now - lastVisionCheck >= PEDESTRIAN_VISION_DEFAULTS.checkIntervalMs
      ) {
        lastVisionCheck = now;
        const index = visionIndexRef.current;
        if (index?.count) {
          const walkers: PedestrianVisionAgent[] = [];
          const profileByWalkerId = new globalThis.Map<string, PedestrianProfile>();
          if (simVisibleRef.current) {
            for (let i = 0; i < peds.length; i++) {
              const movementBearing = prevPedPositions[i]
                ? bearingFromMovementRad(prevPedPositions[i], peds[i])
                : null;
              const id = `sim:${i}`;
              const profile = pedProfiles[i] ?? samplePedestrianProfile(peds[i].lng, peds[i].lat, campaignContextRef.current);
              walkers.push({
                id,
                lng: peds[i].lng,
                lat: peds[i].lat,
                bearing: movementBearing ?? peds[i].bearing,
              });
              profileByWalkerId.set(id, profile);
            }
          }
          for (let i = 0; i < spawnPedsRef.current.length; i++) {
            const a = spawnPedsRef.current[i].agent;
            const movementBearing = prevPlacedPedPositions[i]
              ? bearingFromMovementRad(prevPlacedPedPositions[i], a)
              : null;
            const id = `placed:${i}`;
            walkers.push({
              id,
              lng: a.lng,
              lat: a.lat,
              bearing: movementBearing ?? a.bearing,
            });
            profileByWalkerId.set(id, spawnPedsRef.current[i].profile);
          }

          const capture = walkers.length
            ? findPedestrianBillboardTrigger(walkers, index, visionStateRef.current, now)
            : null;
          if (capture) {
            const profile =
              profileByWalkerId.get(capture.pedestrianId) ??
              samplePedestrianProfile(capture.pedestrian.lng, capture.pedestrian.lat, campaignContextRef.current);
            setVisionCapture(capture);
            enqueueJournalPageRef.current(capture, profile);
          }
        }
      }

      prevPedPositions = peds.map((a) => ({ lng: a.lng, lat: a.lat }));
      prevPlacedPedPositions = spawnPedsRef.current.map((s) => ({
        lng: s.agent.lng,
        lat: s.agent.lat,
      }));

      const agents: CrowdAgent[] = [];
      if (simVisibleRef.current) {
        for (let i = 0; i < peds.length; i++) {
          const profile = pedProfiles[i] ?? samplePedestrianProfile(peds[i].lng, peds[i].lat, campaignContextRef.current);
          agents.push({
            lng: peds[i].lng,
            lat: peds[i].lat,
            kind: profile.kind,
            bearing: peds[i].bearing,
            profileLabel: profile.label,
            isIcp: profile.isIcp,
            businessName: profile.businessName,
            fitScore: profile.fitScore,
          });
        }
        for (const a of cars) agents.push({ lng: a.lng, lat: a.lat, kind: "car" });
        for (const a of buses) agents.push({ lng: a.lng, lat: a.lat, kind: "bus" });
      }
      // User-placed pedestrians always render, regardless of the sim toggle.
      for (const s of spawnPedsRef.current) {
        agents.push({
          lng: s.agent.lng,
          lat: s.agent.lat,
          kind: s.profile.kind,
          bearing: s.agent.bearing,
          profileLabel: s.profile.label,
          isIcp: s.profile.isIcp,
          businessName: s.profile.businessName,
          fitScore: s.profile.fitScore,
        });
      }
      agentsRef.current = agents;

      // Throttle React re-renders to ~30fps; the sim itself runs every frame.
      if (now - lastRender > 33) {
        lastRender = now;
        setFrame((f) => (f + 1) % 1_000_000);
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Combined billboard list for the mesh layer — inventory + user-placed.
  const billboardPoints = useMemo<BillboardPoint[]>(
    () => {
      const launchBillboard = billboardFromLaunch(campaignLaunch);
      const launchedBillboards = launchBillboard && !billboards.some((b) => sameBillboardLocation(b, launchBillboard))
        ? [{ id: `campaign:${launchBillboard.id}`, lng: launchBillboard.lng, lat: launchBillboard.lat }]
        : [];
      return [
        ...launchedBillboards,
        ...billboards.map((b, i) => ({ id: `inv:${i}:${b.lng.toFixed(6)},${b.lat.toFixed(6)}`, lng: b.lng, lat: b.lat })),
        ...spawnBillboardsRef.current.map((b, i) => ({ id: `placed:${i}:${b.lng.toFixed(6)},${b.lat.toFixed(6)}`, lng: b.lng, lat: b.lat })),
      ];
    },
    // placedCount drives re-evaluation when user drops a new billboard
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [billboards, campaignLaunch, placedCount],
  );

  // Rebuild deck layers from the latest agents / billboards / flow. Recomputed
  // each rendered frame (`frame`) so motion shows; deck diffs by layer id.
  const layers = useMemo<Layer[]>(() => {
    const ls: Layer[] = [];
    const campaignTrafficPolygon = campaignBlob && campaignBlob.length > 2 ? campaignBlob : null;
    const shouldShowTraffic = showTraffic;
    const trafficBbox = campaignTrafficPolygon ? bboxForPolygon(campaignTrafficPolygon) : TRAFFIC_BBOX;
    const trafficKey = trafficCacheKey(trafficBbox, campaignTrafficPolygon);
    let trafficLayers: Layer[] = [];

    // Foot-traffic flow lines sit beneath everything in default mode. In campaign
    // mode, clip them to the selected blob and redraw after the blackout mask.
    if (shouldShowTraffic) {
      if (
        (!trafficFlowRef.current || trafficFlowRef.current.key !== trafficKey) &&
        roadNetRef.current &&
        pedWeightsRef.current.length > 0
      ) {
        const flow = computeTrafficFlow(
          roadNetRef.current,
          pedWeightsRef.current,
          new Date().getHours(),
          trafficBbox,
        );
        trafficFlowRef.current = {
          key: trafficKey,
          data: campaignTrafficPolygon ? clipTrafficFlowToPolygon(flow, campaignTrafficPolygon) : flow,
        };
      }
      if (trafficFlowRef.current?.key === trafficKey) {
        trafficLayers = buildTrafficFlowLayers(trafficFlowRef.current.data) as Layer[];
      }
    }

    if (!campaignTrafficPolygon && trafficLayers.length > 0) {
      ls.push(...trafficLayers);
    }

    // Click targets / overview dots for the billboard inventory.
    ls.push(
      new ScatterplotLayer<Billboard>({
        id: "billboard-dots",
        data: billboards,
        getPosition: (b) => [b.lng, b.lat],
        radiusUnits: "pixels",
        getRadius: 4,
        radiusMinPixels: 3,
        radiusMaxPixels: 8,
        getFillColor: [249, 115, 22, 230],
        stroked: true,
        getLineColor: [255, 255, 255, 255],
        lineWidthMinPixels: 1.5,
        pickable: true,
      })
    );

    // Pedestrians + vehicles + buses (deck column boxes — sightline approach).
    ls.push(...buildCrowdLayers(agentsRef.current));

    // Sightline ray — orange beam from pedestrian to billboard on each FOV capture.
    if (visionCapture) {
      const elapsed = performance.now() - sightlineSetAtRef.current;
      const fadeIn = Math.min(elapsed / 300, 1);
      ls.push(
        new LineLayer<PedestrianBillboardCapture>({
          id: "sightline",
          data: [visionCapture],
          getSourcePosition: (c) => [c.pedestrian.lng, c.pedestrian.lat, 2],
          getTargetPosition: (c) => [c.billboard.lng, c.billboard.lat, 8],
          getColor: [249, 115, 22, Math.round(fadeIn * 210)],
          getWidth: 3,
          widthUnits: "pixels",
          widthMinPixels: 2,
        })
      );
    }

    // Black out everything outside the campaign blob if one was passed from sightline.
    // depthCompare: 'always' so the mask covers 3D buildings, not just ground level.
    if (campaignBlob && campaignBlob.length > 2) {
      ls.push(
        new SolidPolygonLayer<{ polygon: [number, number][][] }>({
          id: "campaign-blackout",
          data: [{ polygon: [WORLD_RING, [...campaignBlob]] }],
          getPolygon: (d) => d.polygon,
          extruded: false,
          getFillColor: [13, 14, 20, 252],
          pickable: false,
          parameters: { depthCompare: "always", depthWriteEnabled: false },
        })
      );
    }

    if (campaignTrafficPolygon && trafficLayers.length > 0) {
      ls.push(...trafficLayers);
    }

    return ls;
    // `frame` drives the per-frame recompute; agentsRef is read fresh each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, billboards, showTraffic, placedCount, visionCapture, campaignBlob]);

  // deck.gl click — handles placement tools and opening a sign panel.
  const handleDeckClick = useCallback((info: PickingInfo) => {
    const mode = placeModeRef.current;
    if (mode && info.coordinate) {
      const [lng, lat] = info.coordinate as [number, number];
      if (mode === "pedestrian") {
        const a = syntheticPed();
        a.lng = lng;
        a.lat = lat;
        spawnPedsRef.current.push({
          agent: a,
          profile: samplePedestrianProfile(lng, lat, campaignContextRef.current),
        });
      } else {
        spawnBillboardsRef.current.push({ lng, lat });
      }
      setPlacedCount((c) => c + 1);
      return;
    }
    if (info.object && info.layer?.id === "billboard-dots") {
      setSelected(info.object as Billboard);
    }
  }, []);

  // Billboard focus cycler — mirrors the sightline blob stepper. The active sign
  // index is derived from `selected` so clicking a dot and cycling stay in sync.
  const selectedIndex = useMemo(
    () => (selected ? billboards.findIndex((b) => sameBillboardLocation(b, selected)) : -1),
    [selected, billboards],
  );

  const stepBillboard = useCallback(
    (direction: -1 | 1) => {
      if (!billboards.length) return;
      const base = selectedIndex >= 0 ? selectedIndex : direction === 1 ? -1 : 0;
      const nextIndex = (base + direction + billboards.length) % billboards.length;
      setSelected(billboards[nextIndex]);
    },
    [billboards, selectedIndex],
  );

  // Frame the focused sign when it changes (dot click or cycler), the same way
  // the sightline blobs zoom in. Campaign mode runs its own flyTo, so skip it.
  useEffect(() => {
    if (campaignLaunch || !selected || !mapboxMap) return;
    mapboxMap.flyTo({
      center: [selected.lng, selected.lat],
      zoom: 17,
      pitch: 70,
      bearing: INITIAL_VIEW_STATE.bearing,
      essential: true,
      duration: 900,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.lng, selected?.lat, campaignLaunch, mapboxMap]);

  const startCampaignSimulation = useCallback(() => {
    simVisibleRef.current = true;
    showTrafficRef.current = true;
    visionEnabledRef.current = true;
    setCampaignPreviewMode(false);
    setSimVisible(true);
    setShowTraffic(true);
    setVisionEnabled(true);
    setSelected(null);
    setCampaignLaunch((current) => {
      if (!current) return current;
      const next: CampaignLaunch = { ...current, mode: "simulation" };
      try {
        localStorage.setItem(CAMPAIGN_LAUNCH_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  }, []);

  const generateBriefAndCreative = useCallback(async (url: string) => {
    if (!url.trim()) return;
    setBriefError(null);
    setBrief(null);
    try {
      setBriefStatus("reading");
      const briefRes = await fetch("/api/company-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const briefJson = await briefRes.json();
      if (!briefRes.ok) throw new Error(briefJson.error || "Could not read that site");
      const nextBrief = briefJson.brief as CompanyBrief;

      let creativeImageUrl: string;
      if (nextBrief.media?.imageUrl) {
        creativeImageUrl = nextBrief.media.imageUrl;
      } else {
        setBrief(nextBrief);
        setBriefStatus("generating");
        const creativeRes = await fetch("/api/generate-creative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brief: nextBrief }),
        });
        const creativeJson = await creativeRes.json();
        if (!creativeRes.ok) throw new Error(creativeJson.error || "Could not generate creative");
        creativeImageUrl = creativeJson.imageUrl;
      }

      setBrief(nextBrief);
      setCreative(creativeImageUrl);
      setBriefStatus("done");

      try {
        localStorage.setItem("vs:creative", JSON.stringify({
          imageUrl: creativeImageUrl,
          company: nextBrief.identity.companyName,
          source: nextBrief.media?.source ?? "openai",
        }));
        localStorage.setItem("vs:brief", JSON.stringify(nextBrief));
      } catch { /* ignore */ }
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : "Something went wrong");
      setBriefStatus("error");
    }
  }, []);

  const exportCampaignPackage = useCallback(async () => {
    if (campaignExporting) return;
    setCampaignExportError(null);

    const reportBillboard = selected ?? billboardFromLaunch(campaignLaunch) ?? billboards[0] ?? null;
    if (!reportBillboard) {
      setCampaignExportError("Select a billboard before exporting the campaign PDF.");
      return;
    }

    setCampaignExporting(true);
    try {
      const reportBrief = withReportCreative(
        brief ?? buildFallbackCampaignBrief(campaignContext, reportBillboard, campaignLaunch),
        creative,
      );
      const targetAccounts = targetAccountsFromMapState(
        campaignContext,
        agentsRef.current,
        reportBrief,
      );
      const input: CampaignReportInput = {
        brief: reportBrief,
        opportunity: reportOpportunityFromMapState(
          campaignContext,
          campaignLaunch,
          reportBillboard,
          reportBrief,
          targetAccounts,
        ),
        selectedBillboard: billboardPlacementFromMapState(reportBillboard),
        vision: visionReportFromJournalPages(journalPages, reportBillboard),
        agentReports: agentReportsFromJournalPages(journalPages),
        targetAccounts: targetAccounts.length ? targetAccounts : undefined,
        purchaseUrl: reportBillboard.purchaseUrl,
      };

      const response = await fetch("/api/campaign-report?format=pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/pdf" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        let message = `PDF export failed (${response.status})`;
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          /* response was not JSON */
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = campaignReportDownloadName(
        response,
        `${reportBrief.identity.companyName}-${reportBillboard.name}-campaign-package`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setCampaignExportError(err instanceof Error ? err.message : "PDF export failed.");
    } finally {
      setCampaignExporting(false);
    }
  }, [billboards, brief, campaignContext, campaignExporting, campaignLaunch, creative, journalPages, selected]);

  const onMapLoad = useCallback((e: { target: mapboxgl.Map }) => {
    const map = e.target;
    applyStandardStyleConfig(map);
    setMapboxMap(map);
    // No terrain on purpose: the interleaved deck layers are depth-tested against
    // Mapbox's flat (z=0) ground plane. Terrain would shift the basemap depth out
    // from under the agents/billboards and break the occlusion against buildings.
  }, []);

  useEffect(() => {
    const launchBillboard = billboardFromLaunch(campaignLaunch);
    if (!mapboxMap || !launchBillboard) return;
    mapboxMap.flyTo({
      center: [launchBillboard.lng, launchBillboard.lat],
      zoom: campaignPreviewMode ? 17.7 : 16.8,
      pitch: 72,
      bearing: INITIAL_VIEW_STATE.bearing,
      essential: true,
      duration: 1100,
    });
  }, [campaignLaunch, campaignPreviewMode, mapboxMap]);

  const icpAgentCount = agentsRef.current.reduce((total, agent) => total + (agent.isIcp ? 1 : 0), 0);
  const campaignPedestrianLabel = campaignContext?.area ?? campaignContext?.title ?? "campaign";

  if (!TOKEN) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 440, padding: "12px 16px", background: "rgba(20,20,20,0.9)", color: "#fff", borderRadius: 8, fontSize: 14, lineHeight: 1.4 }}>
          Missing Mapbox token. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local and restart the dev server.
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <MapboxMap
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle="mapbox://styles/mapbox/standard"
        onLoad={onMapLoad}
        onError={(e) => { if (e.error?.message) setError(e.error.message); }}
        maxPitch={85}
        cursor={placeMode ? "crosshair" : undefined}
        style={{ position: "absolute", inset: 0 }}
      >
        <DeckOverlay
          interleaved
          layers={layers}
          onClick={handleDeckClick}
        />
      </MapboxMap>

      <BillboardMeshLayer billboards={billboardPoints} map={mapboxMap} />
      <CampaignBlackoutOverlay map={mapboxMap} polygon={campaignBlob} />

      <MapNav
        showTraffic={showTraffic}
        showJournal={showJournal}
        campaignBusy={campaignExporting}
        onToggleTraffic={() => {
          if (campaignPreviewMode) startCampaignSimulation();
          else setShowTraffic((v) => !v);
        }}
        onToggleJournal={() => setShowJournal((v) => !v)}
        onOpenCampaign={exportCampaignPackage}
      />

      {count !== null && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: "rgba(255,255,255,0.9)",
            color: "#111",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            backdropFilter: "blur(6px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "#f97316" }} />
          {count.toLocaleString()} SF billboards
        </div>
      )}

      {/* Billboard focus cycler — sits above the trapezoid nav, bottom-center.
          Cycling focuses a sign (opening the Street View panel on the right) and
          flies the camera to it. Default exploration only; campaign mode drives
          its own focus. */}
      {!campaignLaunch && billboards.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 84,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 8px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.82)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 8px 28px rgba(0,0,0,0.34)",
          }}
        >
          <button
            type="button"
            onClick={() => stepBillboard(-1)}
            aria-label="Previous billboard"
            style={cyclerButtonStyle}
          >
            {"<"}
          </button>
          <span
            style={{
              minWidth: 56,
              textAlign: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {selectedIndex >= 0 ? selectedIndex + 1 : "–"}/{billboards.length}
          </span>
          <button
            type="button"
            onClick={() => stepBillboard(1)}
            aria-label="Next billboard"
            style={cyclerButtonStyle}
          >
            {">"}
          </button>
        </div>
      )}

      {campaignPreviewMode && (
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 16,
            width: 280,
            background: "rgba(255,255,255,0.94)",
            color: "#111827",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 13,
            lineHeight: 1.45,
            boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
            zIndex: 35,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f97316" }}>
            Street preview
          </div>
          <div style={{ marginTop: 5, fontWeight: 750 }}>
            Review the projected billboard before spawning traffic.
          </div>
          <button
            type="button"
            onClick={startCampaignSimulation}
            style={{
              marginTop: 10,
              width: "100%",
              height: 34,
              border: "none",
              borderRadius: 8,
              background: "#111827",
              color: "#fff",
              fontSize: 12,
              fontWeight: 750,
              cursor: "pointer",
            }}
          >
            Continue to traffic simulation
          </button>
        </div>
      )}

      {/* Traffic simulation legend + toggle */}
      {!campaignPreviewMode && (
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 16,
          background: "rgba(12,12,18,0.88)",
          backdropFilter: "blur(10px)",
          borderRadius: 12,
          padding: "10px 14px",
          color: "#fff",
          fontSize: 12,
          lineHeight: 1.6,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          minWidth: 182,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
            {muniLive ? "Live Traffic" : "Traffic Sim"}
          </span>
          <button
            onClick={() => setSimVisible((v) => !v)}
            style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
              background: simVisible ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.08)",
              color: simVisible ? "#fbbf24" : "#475569",
              border: "none", borderRadius: 6, padding: "2px 8px", cursor: "pointer",
            }}
          >
            {simVisible ? "ON" : "OFF"}
          </button>
        </div>
        {([
          { color: "#ffecd2", label: "Pedestrians", n: PED_COUNT, note: "SFMTA-weighted" },
          ...(campaignContext
            ? [{ color: "#f97316", label: "ICP / employees", n: icpAgentCount, note: campaignPedestrianLabel }]
            : []),
          { color: "#e2e8f0", label: "Vehicles", n: CAR_COUNT, note: "OSM roads" },
          { color: "#3b82f6", label: "Buses", n: muniLive ? muniVehiclesRef.current.length : BUS_COUNT, note: muniLive ? "NextBus live" : "synthetic" },
        ] as Array<{ color: string; label: string; n: number; note: string }>).map(({ color, label, n, note }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 4px ${color}88` }} />
            <span style={{ color: "#94a3b8", flex: 1 }}>{label}</span>
            <span style={{ color: "#334155", fontSize: 10, marginRight: 4 }}>{note}</span>
            <span style={{ color: "#475569", fontVariantNumeric: "tabular-nums" }}>{n}</span>
          </div>
        ))}
        {muniLive && (
          <div style={{ marginTop: 6, fontSize: 10, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            NextBus real-time · 30s
          </div>
        )}
      </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            maxWidth: 440,
            marginLeft: 150,
            padding: "12px 16px",
            background: "rgba(20,20,20,0.9)",
            color: "#fff",
            borderRadius: 8,
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      )}

      {campaignExportError && (
        <div
          role="status"
          style={{
            position: "absolute",
            left: "50%",
            bottom: 96,
            transform: "translateX(-50%)",
            zIndex: 46,
            maxWidth: "calc(100vw - 32px)",
            borderRadius: 10,
            border: "1px solid #fecaca",
            background: "rgba(255,255,255,0.96)",
            color: "#b91c1c",
            boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
            padding: "9px 12px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {campaignExportError}
        </div>
      )}

      {visionCapture && (
        <PedestrianCaptureToast
          capture={visionCapture}
          onClose={() => setVisionCapture(null)}
        />
      )}

      {showJournal && (
        <PedestrianVisionJournal
          pages={journalPages}
          activeId={activeJournalId}
          onActiveChange={setActiveJournalId}
          onClose={() => setShowJournal(false)}
          onClear={() => {
            setJournalPages([]);
            setActiveJournalId(null);
          }}
        />
      )}

      {selected && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            bottom: 16,
            width: 400,
            maxWidth: "calc(100vw - 32px)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(16px)",
            borderRadius: 20,
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow:
              "0 1px 2px rgba(15,23,42,0.04), 0 24px 60px -12px rgba(15,23,42,0.32)",
            overflow: "hidden",
          }}
        >
          {/* Header — orange accent rail + title block */}
          <div
            style={{
              position: "relative",
              padding: "16px 18px 14px",
              background:
                "linear-gradient(180deg, #fff7ed 0%, rgba(255,247,237,0) 100%)",
              borderBottom: "1px solid #f1f1f1",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 14,
                bottom: 14,
                width: 3,
                borderRadius: 999,
                background: "linear-gradient(180deg, #fb923c, #ea580c)",
              }}
              aria-hidden
            />
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "#fff",
                    color: "#c2410c",
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                    padding: "3px 9px 3px 7px",
                    borderRadius: 999,
                    border: "1px solid #fed7aa",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: "#f97316",
                      boxShadow: "0 0 0 3px rgba(249,115,22,0.18)",
                    }}
                    aria-hidden
                  />
                  {selected.status}
                </span>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: -0.3,
                    lineHeight: 1.2,
                    marginTop: 8,
                  }}
                >
                  {selected.name}
                </div>
                {selected.address && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      color: "#64748b",
                      marginTop: 4,
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selected.address}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: "rgba(255,255,255,0.8)",
                  color: "#64748b",
                  fontSize: 17,
                  cursor: "pointer",
                  lineHeight: 1,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                ×
              </button>
            </div>
          </div>
          <div style={{ padding: 16, overflowY: "auto" }}>
            <MapBriefPanel
              brief={brief}
              briefUrl={briefUrl}
              briefStatus={briefStatus}
              briefError={briefError}
              onUrlChange={setBriefUrl}
              onGenerate={generateBriefAndCreative}
              onReset={() => { setBrief(null); setBriefStatus("idle"); setBriefUrl(""); setBriefError(null); }}
            />
            <StreetViewComposite
              key={`${selected.lng},${selected.lat}`}
              lat={selected.lat}
              lng={selected.lng}
              label={selected.name}
              creativeUrl={creative}
            />
            {campaignPreviewMode && (
              <button
                type="button"
                onClick={startCampaignSimulation}
                style={{
                  marginTop: 14,
                  width: "100%",
                  height: 42,
                  border: "none",
                  borderRadius: 12,
                  background: "linear-gradient(180deg, #1f2937, #111827)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 750,
                  cursor: "pointer",
                  boxShadow: "0 8px 22px rgba(17,24,39,0.26)",
                }}
              >
                Looks good — spawn traffic and pedestrians
              </button>
            )}
            <BillboardBuyingFacts billboard={selected} />
          </div>
        </div>
      )}
    </div>
  );
}

function PedestrianCaptureToast({
  capture,
  onClose,
}: {
  capture: PedestrianBillboardCapture;
  onClose: () => void;
}) {
  const name = capture.billboard.label ?? "Billboard";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        width: 324,
        maxWidth: "calc(100vw - 32px)",
        zIndex: 45,
        overflow: "hidden",
        borderRadius: 8,
        background: "rgba(15,23,42,0.9)",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(0,0,0,0.24)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: "#f97316",
            boxShadow: "0 0 14px rgba(249,115,22,0.72)",
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              color: "#f8fafc",
              fontSize: 13,
              fontWeight: 750,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={name}
          >
            Pedestrian saw {name}
          </div>
          <div
            style={{
              marginTop: 3,
              color: "#94a3b8",
              fontSize: 11,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {Math.round(capture.distanceM)}m away | {capture.angleOffCenterDeg.toFixed(0)} deg off-center
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss pedestrian sightline notification"
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: 999,
            border: "none",
            background: "rgba(255,255,255,0.08)",
            color: "#cbd5e1",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>
    </div>
  );
}

function PedestrianVisionJournal({
  pages,
  activeId,
  onActiveChange,
  onClose,
  onClear,
}: {
  pages: JournalPage[];
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const active = pages.find((page) => page.id === activeId) ?? pages[0] ?? null;
  const activeIndex = active ? pages.findIndex((page) => page.id === active.id) : -1;
  const pageNumber = activeIndex >= 0 ? pages.length - activeIndex : 0;
  const [journalOverlay, setJournalOverlay] = useState<"clean" | "heatmap" | "eyescan">("heatmap");
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);

  const move = (delta: number) => {
    if (!active || pages.length < 2) return;
    const nextIndex = Math.max(0, Math.min(pages.length - 1, activeIndex + delta));
    onActiveChange(pages[nextIndex]?.id ?? null);
  };

  const currentImageUrl = active
    ? journalOverlay === "heatmap"
      ? (active.heatmapImageUrl ?? active.imageUrl)
      : journalOverlay === "eyescan"
      ? (active.eyeScanImageUrl ?? active.cleanImageUrl ?? active.imageUrl)
      : (active.cleanImageUrl ?? active.imageUrl)
    : undefined;

  const dialogStyle: CSSProperties = {
    width: "clamp(320px, 70vw, 1120px)",
    height: "clamp(440px, 70vh, 780px)",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "calc(100vh - 32px)",
    overflow: "hidden",
    borderRadius: 8,
    background: "rgba(255,255,255,0.97)",
    color: "#0f172a",
    boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
    border: "1px solid rgba(226,232,240,0.95)",
    backdropFilter: "blur(14px)",
  };

  const backdropStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 34,
    display: "grid",
    placeItems: "center",
    padding: 16,
    background: "rgba(15,23,42,0.18)",
    pointerEvents: "auto",
  };

  // Street-view full-screen mode
  if (streetViewMode && active) {
    return (
      <div style={backdropStyle}>
        <div role="dialog" aria-label="Street view" style={{ ...dialogStyle, position: "relative" }}>
          {currentImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImageUrl}
              alt="Street view"
              style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
              draggable={false}
            />
          ) : (
            <div style={{ display: "grid", height: "100%", placeItems: "center", background: "#0f172a", color: "#cbd5e1", fontSize: 13 }}>
              Building street view...
            </div>
          )}
          <button
            onClick={() => setStreetViewMode(false)}
            aria-label="Exit street view"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: 7,
              border: "none",
              background: "rgba(15,23,42,0.8)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={backdropStyle}>
      <div
        role="dialog"
        aria-label="Vision journal"
        style={{ ...dialogStyle, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "14px 16px",
            borderBottom: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 850, color: "#111827" }}>Vision journal</div>
            <div style={{ marginTop: 2, fontSize: 12, fontWeight: 650, color: "#64748b" }}>
              {pages.length ? `Page ${pageNumber} of ${pages.length}` : "Waiting for sightings"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => move(1)} disabled={!active || activeIndex >= pages.length - 1} aria-label="Previous journal page" style={journalIconButtonStyle}>&lt;</button>
            <button onClick={() => move(-1)} disabled={!active || activeIndex <= 0} aria-label="Next journal page" style={journalIconButtonStyle}>&gt;</button>
            <button onClick={onClear} disabled={!pages.length} aria-label="Clear journal" style={{ ...journalIconButtonStyle, width: 52, fontSize: 11 }}>Clear</button>
            <button onClick={onClose} aria-label="Close journal" style={journalIconButtonStyle}>×</button>
          </div>
        </div>

        {/* Body */}
        {!active ? (
          <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 24, fontSize: 14, color: "#64748b", lineHeight: 1.45, textAlign: "center" }}>
            Sightline captures will appear here as compact vision pages.
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, padding: 16, overflow: "hidden" }}>
            {/* Left: image pane */}
            <div
              style={{ position: "relative", minHeight: 0, overflow: "hidden", borderRadius: 8, background: "#0f172a", cursor: currentImageUrl ? "zoom-in" : "default" }}
              onMouseEnter={() => setImageHovered(true)}
              onMouseLeave={() => setImageHovered(false)}
              onClick={() => { if (currentImageUrl) setStreetViewMode(true); }}
            >
              {currentImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentImageUrl}
                  alt="Projected billboard scene"
                  style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                  draggable={false}
                />
              ) : (
                <div style={{ display: "grid", height: "100%", placeItems: "center", color: "#cbd5e1", fontSize: 13 }}>
                  Building street view...
                </div>
              )}

              {/* Hover overlay — darkens + shows zoom icon */}
              {imageHovered && currentImageUrl && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.42)", borderRadius: 8, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden style={{ color: "#fff", opacity: 0.92 }}>
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M16.5 16.5L21 21M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {/* Status badge */}
              <span style={{ position: "absolute", left: 12, top: 12, borderRadius: 999, background: active.status === "done" ? "rgba(22,163,74,0.88)" : active.status === "error" ? "rgba(220,38,38,0.9)" : "rgba(249,115,22,0.9)", color: "#fff", padding: "5px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0, pointerEvents: "none" }}>
                {journalStatusLabel(active.status)}
              </span>

              {/* Heatmap / Eye scan / Clean buttons */}
              {active.status === "done" && (
                <div
                  style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(["heatmap", "eyescan", "clean"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setJournalOverlay(mode)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "none",
                        background: journalOverlay === mode ? "rgba(249,115,22,0.92)" : "rgba(15,23,42,0.72)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        backdropFilter: "blur(4px)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {mode === "heatmap" ? "Heatmap" : mode === "eyescan" ? "Eye scan" : "Clean"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: details pane — non-scrollable */}
            <div style={{ minHeight: 0, overflow: "hidden", padding: "2px 4px 2px 0", display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#111827", fontSize: 18, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }} title={active.capture.billboard.label ?? "Billboard"}>
                {active.capture.billboard.label ?? "Billboard"}
              </div>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 650, flexShrink: 0 }}>
                {Math.round(active.capture.distanceM)}m away | {active.capture.angleOffCenterDeg.toFixed(0)} deg off-center
              </div>
              <JournalProfileCard
                profile={active.profile}
                profileId={active.profileId}
                agent={active.agent}
                agentStatus={active.agentStatus}
                agentError={active.agentError}
              />

              {active.result && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12, flexShrink: 0 }}>
                    <JournalMetric label="Seen" value={`${active.result.street?.noticedBy ?? 0}/${active.result.street?.total ?? 0}`} />
                    <JournalMetric
                      label="Notice"
                      value={active.result.street?.timeToNoticeMs !== null && active.result.street?.timeToNoticeMs !== undefined
                        ? `${(active.result.street.timeToNoticeMs / 1000).toFixed(1)}s`
                        : "miss"}
                    />
                    <JournalMetric label="Recall" value={String(active.result.scores.recall)} />
                  </div>
                  <p style={{ margin: "10px 0 0", color: "#334155", fontSize: 13, lineHeight: 1.5, overflow: "hidden" }}>
                    {active.result.verdict}
                  </p>
                </>
              )}
              {active.error && (
                <p style={{ margin: "12px 0 0", color: "#b91c1c", fontSize: 13, lineHeight: 1.5 }}>
                  {active.error}
                </p>
              )}
              {!active.result && !active.error && (
                <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
                  {active.status === "analyzing" ? "Running street-scene vision..." : "Projecting the creative into Street View..."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function JournalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px" }}>
      <div style={{ color: "#64748b", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0 }}>
        {label}
      </div>
      <div style={{ marginTop: 3, color: "#0f172a", fontSize: 20, fontWeight: 850, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

function BillboardBuyingFacts({ billboard }: { billboard: Billboard }) {
  // At-a-glance highlights — the numbers a buyer scans for first.
  const highlights = [
    { label: "Est. CPM", value: billboard.estimatedCpm },
    { label: "Availability", value: billboard.availability },
    { label: "Format", value: billboard.format },
  ].filter((h) => h.value);

  const facts = [
    ["Owner / seller", billboard.seller],
    ["Dimensions", billboard.dimensions],
    ["Facing", billboard.facing],
    ["Rate card", billboard.rateCard],
    ["Media", `${billboard.mediaType}; ${billboard.lighting}`],
    ["Restrictions", billboard.restrictions],
    ["Booking contact", billboard.bookingContact],
  ].filter(([, value]) => value);

  return (
    <div style={{ marginTop: 14 }}>
      {highlights.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${highlights.length}, 1fr)`,
            gap: 8,
            marginBottom: 12,
          }}
        >
          {highlights.map((h) => (
            <div
              key={h.label}
              style={{
                borderRadius: 12,
                border: "1px solid #fee5d3",
                background: "linear-gradient(180deg, #fffaf5, #fff7ed)",
                padding: "10px 11px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  color: "#9a6b4d",
                  fontSize: 9.5,
                  fontWeight: 850,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {h.label}
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: "#0f172a",
                  fontSize: 13,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={h.value}
              >
                {h.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: "11px 13px", borderBottom: "1px solid #f1f5f9", background: "#fafafa" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ color: "#ea580c" }}>
              <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div style={{ color: "#111827", fontSize: 13, fontWeight: 800 }}>Buying data</div>
          </div>
          <div style={{ marginTop: 3, color: "#64748b", fontSize: 11, lineHeight: 1.35 }}>
            Estimated from permit metadata; confirm before purchase.
          </div>
        </div>
        <dl style={{ margin: 0, padding: "4px 13px 8px" }}>
          {facts.map(([label, value], i) => (
            <div
              key={label}
              style={{
                display: "grid",
                gridTemplateColumns: "104px 1fr",
                gap: 12,
                fontSize: 11.5,
                lineHeight: 1.4,
                padding: "8px 0",
                borderTop: i === 0 ? "none" : "1px solid #f4f4f5",
              }}
            >
              <dt style={{ color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.2 }}>{label}</dt>
              <dd style={{ margin: 0, color: "#334155", fontWeight: 550 }}>{value}</dd>
            </div>
          ))}
        </dl>
        {billboard.purchaseUrl && (
          <a
            href={billboard.purchaseUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              margin: "0 13px 13px",
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid #fed7aa",
              background: "#fff7ed",
              color: "#c2410c",
              fontSize: 12,
              fontWeight: 750,
              textDecoration: "none",
            }}
          >
            Open permit record
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

function getInitials(label: string): string {
  const words = label.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function profileAvatarColor(profileId: string): string {
  const palette = ["#f97316", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f59e0b", "#06b6d4"];
  let h = 0;
  for (let i = 0; i < profileId.length; i++) h = (h * 31 + profileId.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function JournalProfileCard({
  profile,
  profileId,
  agent,
  agentStatus,
  agentError,
}: {
  profile: PedestrianProfile;
  profileId: string;
  agent?: PedestrianAgentLog;
  agentStatus?: JournalAgentStatus;
  agentError?: string;
}) {
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const avatarColor = profileAvatarColor(profileId);
  const initials = getInitials(profile.label);

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 8,
        background: profile.isIcp ? "#fff7ed" : "#f8fafc",
        border: profile.isIcp ? "1px solid #fed7aa" : "1px solid #e2e8f0",
        padding: 12,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Avatar */}
        <div style={{
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: avatarColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 13,
          fontWeight: 800,
          boxShadow: `0 2px 8px ${avatarColor}55`,
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: profile.isIcp ? "#c2410c" : "#64748b", fontSize: 10, fontWeight: 850, textTransform: "uppercase", letterSpacing: 0 }}>
            Pedestrian profile
          </div>
          <div style={{ marginTop: 3, color: "#111827", fontSize: 14, fontWeight: 850, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.label}
          </div>
          <div style={{ marginTop: 3, color: "#64748b", fontSize: 11, fontWeight: 650 }}>
            fit {profile.fitScore}/100
          </div>
        </div>

        {/* Chat button */}
        <button
          onClick={() => setShowChat((v) => !v)}
          style={{
            flexShrink: 0,
            padding: "4px 10px",
            borderRadius: 6,
            border: showChat ? "1px solid #f97316" : "1px solid #e2e8f0",
            background: showChat ? "#fff7ed" : "#fff",
            color: showChat ? "#f97316" : "#64748b",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Chat
        </button>
      </div>

      {profile.reason && (
        <div style={{ marginTop: 8, color: "#334155", fontSize: 12, lineHeight: 1.4 }}>
          {profile.reason}
        </div>
      )}

      {/* Inline chat panel */}
      {showChat && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${profile.isIcp ? "#fed7aa" : "#e2e8f0"}`, paddingTop: 10 }}>
          {agentStatus === "thinking" ? (
            <div style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic", padding: "4px 0" }}>
              {agent?.displayName ?? profile.label} is thinking...
            </div>
          ) : agent?.chatMessage ? (
            <div style={{ background: "rgba(15,23,42,0.05)", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>
                {agent.displayName ?? profile.label}
              </div>
              <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
                {agent.chatMessage}
              </div>
            </div>
          ) : agentError ? (
            <div style={{ color: "#b91c1c", fontSize: 12, padding: "4px 0" }}>{agentError}</div>
          ) : null}

          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Reply..."
              style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, color: "#0f172a", outline: "none" }}
            />
            <button
              style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#f97316", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function isReportImageUrl(url: string | undefined): url is string {
  return Boolean(url && /^(data:|https?:)/i.test(url));
}

function withReportCreative(brief: CompanyBrief, creativeUrl: string): CompanyBrief {
  const imageUrl = isReportImageUrl(creativeUrl)
    ? creativeUrl
    : isReportImageUrl(brief.media?.imageUrl)
      ? brief.media.imageUrl
      : undefined;

  return {
    ...brief,
    media: imageUrl
      ? {
          imageUrl,
          prompt: brief.media?.prompt ?? `Billboard creative for ${brief.identity.companyName}.`,
          source: imageUrl.startsWith("data:image/svg") ? "svg" : brief.media?.source ?? "openai",
          model: brief.media?.model,
        }
      : undefined,
  };
}

function buildFallbackCampaignBrief(
  context: CampaignPedestrianContext | null,
  billboard: Billboard,
  launch: CampaignLaunch | null,
): CompanyBrief {
  const area = context?.area ?? launch?.opportunity?.area ?? "San Francisco";
  const companyName = context?.companyName ?? "Orangeboard campaign";
  const audience = context?.icp ?? "Matched local accounts and high-fit pedestrians around the selected billboard.";
  const message = context?.title
    ? `${context.title} near ${area}.`
    : `Reach high-fit buyers near ${billboard.name}.`;

  return {
    url: "",
    identity: {
      companyName,
      industry: "B2B campaign",
      description: `${companyName} campaign package for ${billboard.name}.`,
      brandAdjectives: ["local", "targeted", "measurable"],
      tagline: message,
    },
    visualSystem: {
      primaryColor: "#111827",
      secondaryColor: "#f97316",
      styleReference: "High-contrast outdoor creative with minimal copy.",
    },
    campaign: {
      coreMessage: message,
      offerOrHook: context?.icpFit ?? `Physical ABM activation in ${area}.`,
      callToAction: "Book a walkthrough",
      campaignObjective: "awareness",
    },
    audience: {
      description: audience,
      tone: "direct and useful",
      contextWhenSeen: "walking",
    },
  };
}

function billboardPlacementFromMapState(billboard: Billboard) {
  return {
    id: billboard.id,
    location: billboard.name,
    address: billboard.address,
    lat: billboard.lat,
    lng: billboard.lng,
    visibilityScore: 82,
    dwellSeconds: 14,
    prominenceScore: 78,
    inventoryStatus: billboard.status,
    purchaseUrl: billboard.purchaseUrl,
    seller: billboard.seller,
    format: billboard.format,
    dimensions: billboard.dimensions,
    facing: billboard.facing,
    rateCard: billboard.rateCard,
    estimatedCpm: billboard.estimatedCpm,
    availability: billboard.availability,
    lighting: billboard.lighting,
    mediaType: billboard.mediaType,
    restrictions: billboard.restrictions,
    bookingContact: billboard.bookingContact,
    details: [
      "Selected from the live Orangeboard map state.",
      "Mockup uses the current generated creative in the map preview when available.",
      "Purchase, pricing, dimensions, restrictions, and availability should be seller-confirmed before booking.",
    ],
  };
}

function targetAccountsFromMapState(
  context: CampaignPedestrianContext | null,
  agents: CrowdAgent[],
  brief: CompanyBrief,
): TargetAccountInput[] {
  const targets: TargetAccountInput[] = [];
  const seen = new Set<string>();
  const addTarget = (company: string | undefined, category: string | undefined, whyMatched: string | undefined, localSignal: string | undefined) => {
    const cleaned = company?.trim();
    if (!cleaned || seen.has(cleaned.toLowerCase())) return;
    seen.add(cleaned.toLowerCase());
    const index = targets.length;
    targets.push({
      company: cleaned,
      category: category?.trim() || "ICP account signal",
      whyMatched: whyMatched?.trim() || `Relevant to ${brief.audience.description}`,
      suggestedContacts: index % 2 === 0
        ? ["Head of Growth", "VP Marketing", "Revenue Operations"]
        : ["Founder", "Head of Operations", "Workplace Experience"],
      localSignal: localSignal?.trim() || `${cleaned} appears in the selected campaign area.`,
      priority: index < 2 ? "A" : index < 5 ? "B" : "C",
      proofLevel: "grounded",
    });
  };

  for (const business of context?.businesses ?? []) {
    addTarget(
      business.name,
      business.type,
      business.reason,
      `${business.name} is part of the selected ${context?.area ?? "campaign"} hotspot.`,
    );
  }

  for (const agent of agents) {
    if (!agent.isIcp) continue;
    addTarget(
      agent.businessName ?? agent.profileLabel,
      "Observed ICP pedestrian",
      agent.fitScore ? `Synthetic pedestrian scored ${agent.fitScore}/100 for the ICP.` : "Synthetic pedestrian matched the ICP profile.",
      agent.businessName
        ? `${agent.businessName} generated an ICP pedestrian in the simulation.`
        : "ICP pedestrian appeared in the live simulation.",
    );
    if (targets.length >= 12) break;
  }

  return targets.slice(0, 12);
}

function reportOpportunityFromMapState(
  context: CampaignPedestrianContext | null,
  launch: CampaignLaunch | null,
  billboard: Billboard,
  brief: CompanyBrief,
  targets: TargetAccountInput[],
) {
  const area = (context?.area ?? launch?.opportunity?.area ?? billboard.address) || "San Francisco";
  const title = context?.title ?? launch?.opportunity?.title ?? `${billboard.name} campaign`;
  const matchedBusinesses = (context?.businesses ?? []).map((business) => ({
    name: business.name,
    type: business.type ?? "ICP account signal",
    reason: business.reason ?? `Relevant to ${brief.audience.description}`,
    website: business.website,
  }));

  return {
    id: context?.opportunityId ?? launch?.opportunity?.id ?? billboard.id,
    title,
    kind: context?.kind ?? "Map-selected campaign",
    area,
    timing: "Current map simulation window",
    summary: context?.icpFit ?? `${billboard.name} is packaged for a local physical ABM campaign around ${area}.`,
    accounts: Math.max(targets.length, matchedBusinesses.length, 1),
    events: 0,
    placements: 1,
    score: Math.max(72, Math.min(96, Math.round((targets.length ? 80 + Math.min(targets.length, 8) * 2 : 82)))),
    creativeAngle: brief.campaign.coreMessage,
    icpFit: context?.icpFit,
    matchReasons: context?.matchReasons?.length
      ? context.matchReasons
      : [
          `${targets.length || matchedBusinesses.length || 1} target ICP/account signals in the campaign context`,
          `Selected board: ${billboard.name}`,
        ],
    matchedBusinesses,
  };
}

function visionReportFromJournalPages(pages: JournalPage[], billboard: Billboard): VisionReportInput {
  const results = pages.map((page) => page.result).filter((result): result is AttentionSimResult => Boolean(result));
  if (!results.length) {
    return {
      visibility: 82,
      recall: 72,
      glanceability: 78,
      shareability: 62,
      timeToNoticeMs: null,
      noticedBy: 0,
      totalViewers: 0,
      regionShare: undefined,
      verdict: `Agent vision reports are pending for ${billboard.name}.`,
      critique: "Run the pedestrian vision journal to capture modeled pedestrian-level observations.",
      attentionCompetitors: ["street motion", "nearby signage", "traffic"],
    };
  }

  const avg = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1));
  const streetResults = results.map((result) => result.street).filter(Boolean);
  const noticeTimes = streetResults
    .map((street) => street?.timeToNoticeMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const regionShares = streetResults
    .map((street) => street?.regionShare)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    visibility: avg(results.map((result) => result.scores.visibility)),
    recall: avg(results.map((result) => result.scores.recall)),
    glanceability: avg(results.map((result) => result.scores.glanceability)),
    shareability: avg(results.map((result) => result.scores.shareability)),
    timeToNoticeMs: noticeTimes.length ? Math.round(noticeTimes.reduce((sum, value) => sum + value, 0) / noticeTimes.length) : null,
    noticedBy: streetResults.reduce((sum, street) => sum + (street?.noticedBy ?? 0), 0),
    totalViewers: streetResults.reduce((sum, street) => sum + (street?.total ?? 0), 0),
    regionShare: regionShares.length ? regionShares.reduce((sum, value) => sum + value, 0) / regionShares.length : undefined,
    verdict: results[0]?.verdict ?? `Agent vision report generated for ${billboard.name}.`,
    critique: results[0]?.perception.critique ?? "Modeled pedestrian attention from the current map journal.",
    attentionCompetitors: dedupeStrings(
      pages.flatMap((page) =>
        (page.elements ?? [])
          .filter((element) => !element.isBillboard)
          .map((element) => element.label),
      ),
    ).slice(0, 5),
  };
}

function agentReportsFromJournalPages(pages: JournalPage[]): AgentVisionReportInput[] {
  return pages
    .filter((page) => page.result || page.agent || page.agentError)
    .slice(0, 8)
    .map((page, index) => ({
      id: page.id,
      displayName: page.agent?.displayName ?? page.profile.label ?? `Pedestrian agent ${index + 1}`,
      profile: [page.profile.role, page.profile.company ?? page.profile.businessType].filter(Boolean).join(" / ") || page.profile.label,
      businessName: page.profile.businessName ?? page.profile.company,
      fitScore: page.profile.fitScore,
      source: page.profile.source,
      distanceM: page.capture.distanceM,
      angleOffCenterDeg: page.capture.angleOffCenterDeg,
      visibility: page.result?.scores.visibility,
      recall: page.result?.scores.recall,
      timeToNoticeMs: page.result?.street?.timeToNoticeMs ?? null,
      verdict: page.result?.verdict ?? page.error ?? page.agentError,
      remembered: page.agent?.remembered ?? page.result?.perception.fiveSecondMemory,
      motivation: page.agent?.motivation,
      objection: page.agent?.objection,
      nextQuestion: page.agent?.nextQuestion,
      chatMessage: page.agent?.chatMessage,
      imageUrl: page.cleanImageUrl,
      heatmapImageUrl: page.heatmapImageUrl ?? page.imageUrl,
      eyeScanImageUrl: page.eyeScanImageUrl,
      proofLevel: "modeled",
    }));
}

function campaignReportDownloadName(response: Response, fallback: string): string {
  const disposition = response.headers.get("content-disposition");
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  if (match?.[1]) return match[1];
  const slug = fallback
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "campaign-package"}.pdf`;
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}


const cyclerButtonStyle: CSSProperties = {
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

const journalIconButtonStyle: CSSProperties = {
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

function journalStatusLabel(status: JournalPageStatus): string {
  if (status === "rendering") return "Projecting";
  if (status === "analyzing") return "Vision";
  if (status === "error") return "Failed";
  return "Logged";
}

function pedestrianProfileAgentId(pedestrianId: string, profile: PedestrianProfile): string {
  const raw = [
    pedestrianId,
    profile.source,
    profile.role,
    profile.businessName,
    profile.company,
    profile.fitScore,
  ].filter(Boolean).join("|");
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `ped-${(hash >>> 0).toString(36)}`;
}

async function requestPedestrianAgentLog({
  agentId,
  profile,
  capture,
  perception,
  result,
  campaignContext,
}: {
  agentId: string;
  profile: PedestrianProfile;
  capture: PedestrianBillboardCapture;
  perception: VlmPerception;
  result: AttentionSimResult;
  campaignContext: CampaignPedestrianContext | null;
}): Promise<PedestrianAgentLog> {
  const response = await fetch("/api/pedestrian-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      profile,
      capture,
      perception,
      result,
      campaignContext,
    }),
  });
  const payload = (await response.json()) as { agent?: PedestrianAgentLog; error?: string };
  if (!response.ok || !payload.agent) {
    throw new Error(payload.error ?? "Pedestrian agent request failed.");
  }
  return payload.agent;
}

const FALLBACK_PROJECTED_QUAD = [
  { x: 0.34, y: 0.24 },
  { x: 0.66, y: 0.22 },
  { x: 0.66, y: 0.42 },
  { x: 0.34, y: 0.44 },
] as const;

async function renderProjectedStreetScene(
  capture: PedestrianBillboardCapture,
  creativeUrl: string,
): Promise<ProjectedStreetScene> {
  const size = 640;
  const [streetImage, creativeImage, conditions] = await Promise.all([
    loadImage(pedestrianStreetViewImageUrl(capture, `${size}x${size}`)),
    loadImage(creativeUrl),
    fetchCurrentConditions(capture.billboard.lat, capture.billboard.lng).catch(() => null),
  ]);
  const environment = environmentLook(conditions);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create journal canvas.");

  const projected =
    projectBillboardCorners(
      { lng: capture.billboard.lng, lat: capture.billboard.lat },
      { lng: capture.pedestrian.lng, lat: capture.pedestrian.lat },
      capture.pedestrian.headingDeg,
      2,
      Math.round(capture.fovDeg),
    ) ?? FALLBACK_PROJECTED_QUAD;
  const dst = projected.map((p) => [p.x * size, p.y * size] as [number, number]);

  ctx.save();
  ctx.filter = environment.streetFilter || "none";
  ctx.drawImage(streetImage, 0, 0, size, size);
  ctx.restore();
  drawCanvasEnvironmentBackdrop(ctx, size, environment, conditions);

  const sampleFilter = sampleProjectedQuadFilter(ctx, projected, size);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 8;
  ctx.globalAlpha = environment.creativeOpacity;
  ctx.filter = [sampleFilter, environment.creativeFilter].filter(Boolean).join(" ") || "none";
  drawImageInQuad(ctx, creativeImage, dst);
  ctx.restore();
  drawCanvasEnvironmentFront(ctx, size, environment);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dst[0][0], dst[0][1]);
  for (let i = 1; i < dst.length; i++) ctx.lineTo(dst[i][0], dst[i][1]);
  ctx.closePath();
  ctx.strokeStyle = "rgba(15,23,42,0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const imageData = ctx.getImageData(0, 0, size, size);
  return {
    imageUrl: canvas.toDataURL("image/jpeg", 0.88),
    imageData,
    region: quadToRegion(projected),
  };
}

type CanvasEnvironmentLook = ReturnType<typeof environmentLook>;

function drawCanvasEnvironmentBackdrop(
  ctx: CanvasRenderingContext2D,
  size: number,
  environment: CanvasEnvironmentLook,
  conditions: CurrentConditions | null,
) {
  ctx.save();
  if (environment.band === "night") {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, "rgba(6,12,28,0.46)");
    g.addColorStop(0.5, "rgba(7,13,26,0.24)");
    g.addColorStop(1, "rgba(3,7,18,0.5)");
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (environment.band === "morning") {
    const g = ctx.createLinearGradient(0, 0, size, size * 0.7);
    g.addColorStop(0, "rgba(255,204,143,0.18)");
    g.addColorStop(0.58, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (environment.band === "evening") {
    const g = ctx.createLinearGradient(0, 0, size, size * 0.8);
    g.addColorStop(0, "rgba(255,155,92,0.2)");
    g.addColorStop(0.68, "rgba(29,40,65,0.16)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (conditions && conditions.cloudCoverPercent >= 70 && !environment.wet && !environment.foggy) {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, "rgba(117,130,148,0.18)");
    g.addColorStop(1, "rgba(255,255,255,0.04)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.restore();
}

function drawCanvasEnvironmentFront(
  ctx: CanvasRenderingContext2D,
  size: number,
  environment: CanvasEnvironmentLook,
) {
  if (!environment.foggy && !environment.wet) return;

  ctx.save();
  if (environment.foggy) {
    const fog = ctx.createLinearGradient(0, 0, 0, size);
    fog.addColorStop(0, "rgba(238,242,245,0.32)");
    fog.addColorStop(0.54, "rgba(238,242,245,0.12)");
    fog.addColorStop(1, "rgba(238,242,245,0.24)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, size, size);
  }

  if (environment.wet) {
    const sheen = ctx.createLinearGradient(0, size, 0, 0);
    sheen.addColorStop(0, "rgba(214,232,255,0.18)");
    sheen.addColorStop(0.32, "rgba(214,232,255,0.02)");
    sheen.addColorStop(0.62, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, size, size);

    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 1;
    for (let x = -size; x < size * 1.4; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, -24);
      ctx.lineTo(x + size * 0.42, size + 24);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function sampleProjectedQuadFilter(
  ctx: CanvasRenderingContext2D,
  quad: ReadonlyArray<{ x: number; y: number }>,
  size: number,
): string {
  const xs = quad.map((p) => p.x * size);
  const ys = quad.map((p) => p.y * size);
  const rx = Math.max(0, Math.floor(Math.min(...xs)));
  const ry = Math.max(0, Math.floor(Math.min(...ys)));
  const rw = Math.min(size - rx, Math.ceil(Math.max(...xs)) - rx);
  const rh = Math.min(size - ry, Math.ceil(Math.max(...ys)) - ry);
  if (rw < 2 || rh < 2) return "";

  const { data } = ctx.getImageData(rx, ry, rw, rh);
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  const n = rw * rh;
  for (let i = 0; i < n; i++) {
    sumR += data[i * 4];
    sumG += data[i * 4 + 1];
    sumB += data[i * 4 + 2];
  }

  const r = sumR / n / 255;
  const g = sumG / n / 255;
  const b = sumB / n / 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const brightness = clamp(lum / 0.42, 0.6, 1.4);
  const sat = clamp(chroma / 0.18, 0.6, 1.2);
  return `brightness(${brightness.toFixed(2)}) saturate(${sat.toFixed(2)})`;
}

function renderHeatmapJournalImage(imageData: ImageData, saliency: SaliencyResult): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create heatmap canvas.");
  ctx.putImageData(imageData, 0, 0);
  drawHeatmap(ctx, saliency);
  return canvas.toDataURL("image/jpeg", 0.88);
}

function renderScanpathJournalImage(imageData: ImageData, saliency: SaliencyResult): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create scanpath canvas.");
  ctx.putImageData(imageData, 0, 0);
  drawScanpath(ctx, saliency, 3000, 1);
  return canvas.toDataURL("image/jpeg", 0.88);
}

function drawImageInQuad(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dst: [number, number][],
) {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  drawTexturedTriangle(ctx, image, [0, 0], [w, 0], [w, h], dst[0], dst[1], dst[2]);
  drawTexturedTriangle(ctx, image, [0, 0], [w, h], [0, h], dst[0], dst[2], dst[3]);
}

function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  s0: [number, number],
  s1: [number, number],
  s2: [number, number],
  d0: [number, number],
  d1: [number, number],
  d2: [number, number],
) {
  const [sx0, sy0] = s0;
  const [sx1, sy1] = s1;
  const [sx2, sy2] = s2;
  const [dx0, dy0] = d0;
  const [dx1, dy1] = d1;
  const [dx2, dy2] = d2;
  const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
  if (Math.abs(denom) < 0.0001) return;

  const a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / denom;
  const b = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / denom;
  const c = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / denom;
  const d = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / denom;
  const e =
    (dx0 * (sx1 * sy2 - sx2 * sy1) +
      dx1 * (sx2 * sy0 - sx0 * sy2) +
      dx2 * (sx0 * sy1 - sx1 * sy0)) /
    denom;
  const f =
    (dy0 * (sx1 * sy2 - sx2 * sy1) +
      dy1 * (sx2 * sy0 - sx0 * sy2) +
      dy2 * (sx0 * sy1 - sx1 * sy0)) /
    denom;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dx0, dy0);
  ctx.lineTo(dx1, dy1);
  ctx.lineTo(dx2, dy2);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

function quadToRegion(quad: ReadonlyArray<{ x: number; y: number }>): Region {
  const xs = quad.map((p) => clamp01(p.x));
  const ys = quad.map((p) => clamp01(p.y));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  if (w < 0.03 || h < 0.03) return { x: 0.34, y: 0.22, w: 0.32, h: 0.22 };
  return { x, y, w, h };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!/^data:/i.test(src)) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load journal image."));
    image.src = src;
  });
}

function MapBriefPanel({
  brief,
  briefUrl,
  briefStatus,
  briefError,
  onUrlChange,
  onGenerate,
  onReset,
}: {
  brief: CompanyBrief | null;
  briefUrl: string;
  briefStatus: "idle" | "reading" | "generating" | "done" | "error";
  briefError: string | null;
  onUrlChange: (v: string) => void;
  onGenerate: (url: string) => void;
  onReset: () => void;
}) {
  const busy = briefStatus === "reading" || briefStatus === "generating";

  if (brief) {
    const primary =
      brief.visualSystem.primaryColor && /^#[0-9a-fA-F]{6}$/i.test(brief.visualSystem.primaryColor)
        ? brief.visualSystem.primaryColor
        : "#F97316";
    return (
      <div style={{ marginBottom: 14, borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ padding: "10px 13px", background: primary }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 3 }}>
            Creative brief
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
            {brief.identity.companyName}
          </div>
          {brief.identity.tagline && (
            <div style={{ marginTop: 3, fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
              &ldquo;{brief.identity.tagline}&rdquo;
            </div>
          )}
          <div style={{ marginTop: 2, fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
            {brief.identity.industry}
          </div>
        </div>
        <div style={{ padding: "10px 13px", background: "#fff" }}>
          {brief.campaign.coreMessage && (
            <div style={{ marginBottom: 7 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, color: "#94a3b8", marginBottom: 2 }}>Core message</div>
              <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.4 }}>{brief.campaign.coreMessage}</div>
            </div>
          )}
          {brief.campaign.callToAction && (
            <div style={{ marginBottom: 7 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, color: "#94a3b8", marginBottom: 2 }}>Call to action</div>
              <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.4 }}>{brief.campaign.callToAction}</div>
            </div>
          )}
          {brief.audience.description && (
            <div style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, color: "#94a3b8", marginBottom: 2 }}>Audience</div>
              <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.4 }}>{brief.audience.description}</div>
            </div>
          )}
          {(brief.identity.brandAdjectives?.length ?? 0) > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {brief.identity.brandAdjectives.slice(0, 4).map((a) => (
                <span key={a} style={{ borderRadius: 999, padding: "3px 8px", fontSize: 10.5, fontWeight: 600, background: `${primary}1a`, color: primary }}>
                  {a}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={onReset}
            style={{ marginTop: 10, fontSize: 10, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            Change brand
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14, borderRadius: 12, border: "1px solid #e5e7eb", padding: "12px 13px", background: "#fafafa" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f97316", marginBottom: 6 }}>
        Generate creative
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.4 }}>
        Enter your company URL to generate a billboard creative for this sign.
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); onGenerate(briefUrl); }}
        style={{ display: "flex", gap: 6 }}
      >
        <input
          value={briefUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="yourcompany.com"
          disabled={busy}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 12,
            outline: "none",
            background: "#fff",
            color: "#0f172a",
          }}
        />
        <button
          type="submit"
          disabled={busy || !briefUrl.trim()}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "none",
            background: "#f97316",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            cursor: busy || !briefUrl.trim() ? "not-allowed" : "pointer",
            opacity: busy || !briefUrl.trim() ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {briefStatus === "reading" ? "Reading…" : briefStatus === "generating" ? "Generating…" : "Go"}
        </button>
      </form>
      {briefError && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#b91c1c", lineHeight: 1.4 }}>
          {briefError}
        </div>
      )}
    </div>
  );
}
