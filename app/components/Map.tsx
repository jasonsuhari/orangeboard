"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { PickingInfo, Layer } from "@deck.gl/core";
import { ScatterplotLayer, LineLayer, PathLayer, SolidPolygonLayer } from "@deck.gl/layers";
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
} from "./trafficFlowLayers";
import {
  TOKEN,
  CREATIVE_KEY,
  DEFAULT_CREATIVE,
  CAMPAIGN_BLOB_KEY,
  CAMPAIGN_LAUNCH_KEY,
  SIM_RENDER_INTERVAL_MS,
  WORLD_RING,
  BILLBOARDS_URL,
  INITIAL_VIEW_STATE,
  TRAFFIC_BBOX,
  DEFAULT_ONBOARDING_CAMERA,
  cyclerButtonStyle,
} from "./map/constants";
import {
  buildOnboardingBusinessPins,
  OnboardingBlobLabels,
  OnboardingBusinessLabels,
  type OnboardingBusinessPin,
} from "./map/onboardingOverlays";
import {
  BillboardBuyingFacts,
  MapBriefPanel,
  PedestrianCaptureToast,
  PedestrianVisionJournal,
  pedestrianProfileAgentId,
  requestPedestrianAgentLog,
} from "./map/journalPanels";
import type { JournalPage } from "./map/journalTypes";
import {
  billboardFromLaunch,
  isCampaignLaunch,
  propString,
  sameBillboardLocation,
  type Billboard,
  type CampaignLaunch,
} from "../lib/billboardModel";
import { applyStandardStyleConfig, setMapboxCampaignLabelsVisible } from "../lib/mapStyleConfig";
import {
  bboxForPolygon,
  billboardInPolygon,
  boundsForPolygon,
  hasCampaignPolygon,
  pointInMapPolygon,
  spawnCenterForBillboard,
  spawnCenterForCampaign,
  trafficCacheKey,
} from "../lib/mapGeometry";
import { ensureZoneClipLayer, removeZoneClipLayer } from "../lib/zoneFocusBasemap";
import { buildBaseplateLayers } from "./map/baseplateLayers";
import {
  renderHeatmapJournalImage,
  renderProjectedStreetScene,
  renderScanpathJournalImage,
} from "../lib/journalScene";
import {
  agentReportsFromJournalPages,
  billboardPlacementFromMapState,
  buildFallbackCampaignBrief,
  campaignReportDownloadName,
  reportOpportunityFromMapState,
  targetAccountsFromMapState,
  visionReportFromJournalPages,
  withReportCreative,
} from "../lib/campaignReportMapping";
import { computeSaliency, withSemanticPriors } from "../lib/saliency";
import { fuseStreet, heuristicStreetPerception, simulateStreetAgents } from "../lib/attention";
import type { CampaignReportInput } from "../lib/campaignReport";
import { focusZoom, type OpportunityWithPolygon } from "../lib/opportunityBlobs";
import type { CompanyBrief, SceneElement, VlmPerception } from "../lib/types";
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
  type PedestrianBillboardCapture,
  type PedestrianVisionAgent,
  type PedestrianVisionIndex,
  type VisionBillboard,
} from "../simulation/pedestrianVision";

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

type MapProps = {
  /** True while the /map onboarding tutorial overlay is up — hides the map
   *  chrome and locks clicks to the onboarding blob layer. */
  onboardingActive?: boolean;
  /** Opportunity blobs to render during onboarding step 3 (null = none). */
  onboardingBlobs?: OpportunityWithPolygon[] | null;
  selectedBlobId?: string | null;
  onSelectBlob?: (id: string) => void;
};

export default function Map({
  onboardingActive = false,
  onboardingBlobs = null,
  selectedBlobId = null,
  onSelectBlob,
}: MapProps = {}) {
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
  const activeBillboardRef = useRef<Billboard | null>(null);
  const campaignBlobRef = useRef<[number, number][] | null>(null);
  // Live crowd positions, written by the RAF loop and read when layers rebuild.
  const agentsRef = useRef<CrowdAgent[]>([]);
  // User-placed models (dropped by the nav spawn tools, see placeMode below)
  const spawnPedsRef = useRef<{ agent: SimAgent; profile: PedestrianProfile }[]>([]);
  const spawnBillboardsRef = useRef<{ lng: number; lat: number }[]>([]);
  const placeModeRef = useRef<"billboard" | "pedestrian" | null>(null);
  // Onboarding state mirrored into refs so the stable deck click handler sees it.
  const onboardingActiveRef = useRef(onboardingActive);
  const onSelectBlobRef = useRef<MapProps["onSelectBlob"]>(onSelectBlob);
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

  const activeBillboard = useMemo(
    () => selected ?? billboardFromLaunch(campaignLaunch),
    [selected, campaignLaunch],
  );
  const campaignAwaitingBillboard = hasCampaignPolygon(campaignBlob) && !activeBillboard;

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
  useEffect(() => { onboardingActiveRef.current = onboardingActive; }, [onboardingActive]);
  useEffect(() => { onSelectBlobRef.current = onSelectBlob; }, [onSelectBlob]);
  useEffect(() => { activeBillboardRef.current = activeBillboard; }, [activeBillboard]);
  useEffect(() => { campaignBlobRef.current = campaignBlob; }, [campaignBlob]);

  useEffect(() => {
    if (!mapboxMap) return;
    const campaignActive = Boolean(campaignBlob && campaignBlob.length > 2);
    const syncCampaignBasemap = () => {
      setMapboxCampaignLabelsVisible(mapboxMap, !campaignActive);
    };

    syncCampaignBasemap();
    mapboxMap.on("style.load", syncCampaignBasemap);
    return () => {
      mapboxMap.off("style.load", syncCampaignBasemap);
      setMapboxCampaignLabelsVisible(mapboxMap, true);
    };
  }, [mapboxMap, campaignBlob]);

  // Campaign mode: clip the basemap's 3D models + symbols outside the zone so
  // only the focused diorama keeps its skyline (see app/lib/zoneFocusBasemap.ts).
  // ensureZoneClipLayer swallows pre-style-load calls; the style.load listener
  // covers both the initial load and later style reload wipes.
  useEffect(() => {
    if (!mapboxMap || !hasCampaignPolygon(campaignBlob) || !campaignBlob) return;
    const sync = () => ensureZoneClipLayer(mapboxMap, campaignBlob);
    sync();
    mapboxMap.on("style.load", sync);
    return () => {
      mapboxMap.off("style.load", sync);
      removeZoneClipLayer(mapboxMap);
    };
  }, [mapboxMap, campaignBlob]);

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
      if (!activeBillboard) return [];
      return [{
        id: `active:${activeBillboard.id}`,
        lng: activeBillboard.lng,
        lat: activeBillboard.lat,
        label: activeBillboard.name,
        address: activeBillboard.address,
      }];
    },
    [activeBillboard],
  );

  useEffect(() => {
    visionIndexRef.current = buildPedestrianVisionIndex(visionBillboards);
    visionStateRef.current = createPedestrianVisionState();
    setVisionCapture(null);
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

    // Only frame a single blob (black out the rest of the world) when the user
    // arrived by deliberately launching a campaign — Build Campaign (?campaign=1)
    // or the landing preview (?mode=...). A bare /map visit shows the entire map,
    // even if a campaign blob from an earlier session is still cached.
    const launchedCampaign = isCampaignLaunch();

    try {
      const raw = localStorage.getItem(CAMPAIGN_BLOB_KEY);
      if (raw && launchedCampaign) {
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
    const vehicleSpawnCenter = spawnCenterForCampaign(campaignContextRef.current);
    const currentPedestrianSpawn = () => {
      const active = activeBillboardRef.current;
      const requiresBillboardSelection = onboardingActiveRef.current || hasCampaignPolygon(campaignBlobRef.current);
      const enabled = !requiresBillboardSelection || Boolean(active);
      const center = active
        ? spawnCenterForBillboard(active, campaignContextRef.current)
        : spawnCenterForCampaign(campaignContextRef.current);
      const key = enabled
        ? `${active?.id ?? "ambient"}:${center.lng.toFixed(6)}:${center.lat.toFixed(6)}:${center.radiusDeg.toFixed(6)}`
        : "disabled";
      return { enabled, center, key };
    };
    const spawnPedestrians = (center: ReturnType<typeof spawnCenterForCampaign>, net: RoadNet | null) =>
      Array.from(
        { length: net ? targetPedCount() : PED_COUNT },
        () => net
          ? spawnRoadPed(net, pedWeightsRef.current, center)
          : syntheticPed(center),
      );
    const initialPedestrianSpawn = currentPedestrianSpawn();
    let cars: SimAgent[] = Array.from({ length: CAR_COUNT }, () => syntheticCar(vehicleSpawnCenter));
    let buses: SimAgent[] = syntheticBuses();
    let peds: SimAgent[] = initialPedestrianSpawn.enabled
      ? spawnPedestrians(initialPedestrianSpawn.center, null)
      : [];
    let pedProfiles: PedestrianProfile[] = peds.map((a) =>
      samplePedestrianProfile(a.lng, a.lat, campaignContextRef.current),
    );
    let pedSpawnKey = initialPedestrianSpawn.key;
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
      if (document.visibilityState === "hidden") {
        lastT = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(now - lastT, 100); // cap to avoid jumps after tab switch
      lastT = now;
      const net = roadNetRef.current;
      const pedSpawn = currentPedestrianSpawn();

      const resetPeds = () => {
        peds = pedSpawn.enabled ? spawnPedestrians(pedSpawn.center, net) : [];
        pedProfiles = peds.map((a) =>
          samplePedestrianProfile(a.lng, a.lat, campaignContextRef.current),
        );
        prevPedPositions = [];
      };

      if (pedSpawn.key !== pedSpawnKey) {
        pedSpawnKey = pedSpawn.key;
        resetPeds();
      }

      // One-time upgrade: migrate cars + peds to road-constrained once network loads
      if (!useRoadNet && net) {
        useRoadNet = true;
        cars = Array.from({ length: targetCarCount() }, () => spawnRoadCar(net, vehicleSpawnCenter));
        resetPeds();
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
        else while (cars.length < tc) cars.push(spawnRoadCar(net, vehicleSpawnCenter));
        if (!pedSpawn.enabled) {
          peds = [];
          pedProfiles = [];
        } else {
          const tp = targetPedCount();
          if (peds.length > tp) { peds.splice(tp); pedProfiles.splice(tp); }
          else while (peds.length < tp) {
            const ped = spawnRoadPed(net, pedWeightsRef.current, pedSpawn.center);
            peds.push(ped);
            pedProfiles.push(samplePedestrianProfile(ped.lng, ped.lat, campaignContextRef.current));
          }
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

      // Throttle React re-renders; the sim itself runs every frame.
      if (now - lastRender > SIM_RENDER_INTERVAL_MS) {
        lastRender = now;
        setFrame((f) => (f + 1) % 1_000_000);
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Combined billboard list for the mesh layer — inventory + user-placed.
  const visibleBillboards = useMemo<Billboard[]>(
    () => {
      const visiblePolygon = campaignBlob && campaignBlob.length > 2 ? campaignBlob : null;
      if (!visiblePolygon) return billboards;
      return billboards.filter((b) => billboardInPolygon(b, visiblePolygon));
    },
    [billboards, campaignBlob],
  );

  useEffect(() => {
    const visiblePolygon = campaignBlob && campaignBlob.length > 2 ? campaignBlob : null;
    if (!visiblePolygon || !selected || billboardInPolygon(selected, visiblePolygon)) return;
    setSelected(null);
  }, [campaignBlob, selected]);

  const billboardPoints = useMemo<BillboardPoint[]>(
    () => {
      if (onboardingActive) return [];
      const visiblePolygon = campaignBlob && campaignBlob.length > 2 ? campaignBlob : null;
      const activeBillboardIsVisible = activeBillboard
        ? !visiblePolygon || billboardInPolygon(activeBillboard, visiblePolygon)
        : false;
      if (visiblePolygon) {
        return activeBillboard && activeBillboardIsVisible
          ? [{ id: `active:${activeBillboard.id}`, lng: activeBillboard.lng, lat: activeBillboard.lat }]
          : [];
      }
      const launchBillboard = billboardFromLaunch(campaignLaunch);
      const launchedBillboards = launchBillboard && !visibleBillboards.some((b) => sameBillboardLocation(b, launchBillboard))
        ? [{ id: `campaign:${launchBillboard.id}`, lng: launchBillboard.lng, lat: launchBillboard.lat }]
        : [];
      return [
        ...launchedBillboards,
        ...visibleBillboards.map((b) => ({ id: b.id, lng: b.lng, lat: b.lat })),
        ...spawnBillboardsRef.current.map((b, i) => ({ id: `placed:${i}:${b.lng.toFixed(6)},${b.lat.toFixed(6)}`, lng: b.lng, lat: b.lat })),
      ];
    },
    // placedCount drives re-evaluation when user drops a new billboard
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleBillboards, campaignLaunch, placedCount, campaignBlob, activeBillboard, onboardingActive],
  );

  const onboardingBusinessPins = useMemo(
    () => buildOnboardingBusinessPins(onboardingBlobs),
    [onboardingBlobs],
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
        data: visibleBillboards,
        getPosition: (b) => [b.lng, b.lat],
        radiusUnits: "pixels",
        getRadius: (b) => activeBillboard && sameBillboardLocation(b, activeBillboard) ? 7 : 4,
        radiusMinPixels: 3,
        radiusMaxPixels: 10,
        getFillColor: (b) => activeBillboard && sameBillboardLocation(b, activeBillboard)
          ? [255, 255, 255, 255]
          : [249, 115, 22, 230],
        stroked: true,
        getLineColor: (b) => activeBillboard && sameBillboardLocation(b, activeBillboard)
          ? [249, 115, 22, 255]
          : [255, 255, 255, 255],
        lineWidthMinPixels: activeBillboard ? 2 : 1.5,
        pickable: true,
        updateTriggers: {
          getRadius: [activeBillboard],
          getFillColor: [activeBillboard],
          getLineColor: [activeBillboard],
        },
      })
    );

    // Pedestrians + vehicles + buses (deck column boxes — sightline approach).
    // In campaign mode only in-zone agents render: the depth-tested blackout no
    // longer paints over out-of-zone crowd boxes, so they must not be drawn.
    const renderAgents = campaignTrafficPolygon
      ? agentsRef.current.filter((a) => pointInMapPolygon([a.lng, a.lat], campaignTrafficPolygon))
      : agentsRef.current;
    ls.push(...buildCrowdLayers(renderAgents));

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
    // Depth-tested with a negative polygon offset: beats the coplanar z=0 ground
    // everywhere (including the horizon, where a geometric z-lift would shimmer)
    // but loses to the basemap's in-zone 3D buildings, which write real depth —
    // that's what keeps tall buildings unsliced above the mask. Out-of-zone
    // buildings are removed by the zone-focus clip layer, not this mask.
    if (campaignBlob && campaignBlob.length > 2) {
      // Camera position feeds the baseplate's JS back-face culling (the memo
      // already recomputes every sim frame, so rotation stays in sync).
      const cameraLngLat = mapboxMap?.getFreeCameraOptions().position?.toLngLat();
      ls.push(
        new SolidPolygonLayer<{ polygon: [number, number][][] }>({
          id: "campaign-blackout",
          data: [{ polygon: [WORLD_RING, [...campaignBlob].reverse()] }],
          getPolygon: (d) => d.polygon,
          extruded: false,
          getFillColor: [13, 14, 20, 252],
          pickable: false,
          parameters: {
            depthCompare: "less-equal",
            depthWriteEnabled: false,
            depthBias: -2,
            depthBiasSlopeScale: -2,
          },
        }),
        // Diorama slab under the focused zone: skirt walls + orange rim.
        ...buildBaseplateLayers(
          campaignBlob,
          cameraLngLat ? [cameraLngLat.lng, cameraLngLat.lat] : null,
        ),
      );
    }

    if (campaignTrafficPolygon && trafficLayers.length > 0) {
      ls.push(...trafficLayers);
    }

    // Onboarding step 3 — the candidate opportunity blobs the user picks from.
    // depthCompare 'always' so they read as UI over the 3D buildings.
    if (onboardingBlobs && onboardingBlobs.length > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 625);
      ls.push(
        new SolidPolygonLayer<OpportunityWithPolygon>({
          id: "onboarding-blob-fill",
          data: onboardingBlobs,
          getPolygon: (o) => o.polygon,
          getFillColor: (o) => [249, 115, 22, o.id === selectedBlobId ? 118 : 56],
          extruded: false,
          pickable: true,
          parameters: { depthCompare: "always", depthWriteEnabled: false },
          updateTriggers: { getFillColor: [selectedBlobId] },
        }),
        new PathLayer<OpportunityWithPolygon>({
          id: "onboarding-blob-outline",
          data: onboardingBlobs,
          getPath: (o) => o.polygon,
          getWidth: (o) => (o.id === selectedBlobId ? 4 : 2.5),
          widthUnits: "pixels",
          getColor: (o) => [
            249, 115, 22,
            o.id === selectedBlobId ? Math.round(190 + 55 * pulse) : Math.round(120 + 60 * pulse),
          ],
          pickable: false,
          parameters: { depthCompare: "always", depthWriteEnabled: false },
          updateTriggers: { getColor: [selectedBlobId, frame], getWidth: [selectedBlobId] },
        }),
      );
    }

    if (onboardingBusinessPins.length > 0) {
      ls.push(
        new ScatterplotLayer<OnboardingBusinessPin>({
          id: "onboarding-business-pins",
          data: onboardingBusinessPins,
          getPosition: (pin) => [pin.lng, pin.lat, 10],
          radiusUnits: "pixels",
          getRadius: (pin) => (pin.zoneId === selectedBlobId ? 7 : 4.5),
          radiusMinPixels: 4,
          radiusMaxPixels: 10,
          getFillColor: (pin) => (pin.zoneId === selectedBlobId ? [37, 99, 235, 250] : [239, 246, 255, 238]),
          stroked: true,
          getLineColor: (pin) => (pin.zoneId === selectedBlobId ? [255, 255, 255, 255] : [30, 58, 138, 245]),
          lineWidthMinPixels: 2,
          pickable: true,
          parameters: { depthCompare: "always", depthWriteEnabled: false },
          updateTriggers: {
            getRadius: [selectedBlobId],
            getFillColor: [selectedBlobId],
            getLineColor: [selectedBlobId],
          },
        }),
      );
    }

    return ls;
    // `frame` drives the per-frame recompute; agentsRef is read fresh each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, visibleBillboards, showTraffic, placedCount, visionCapture, campaignBlob, onboardingBlobs, onboardingBusinessPins, selectedBlobId, activeBillboard, mapboxMap]);

  // deck.gl click — handles placement tools and opening a sign panel.
  const handleDeckClick = useCallback((info: PickingInfo) => {
    // During onboarding the map only answers blob taps — no placement tools,
    // no billboard panels.
    if (onboardingActiveRef.current) {
      if (info.layer?.id?.startsWith("onboarding-blob") && info.object) {
        onSelectBlobRef.current?.((info.object as OpportunityWithPolygon).id);
      }
      if (info.layer?.id === "onboarding-business-pins" && info.object) {
        onSelectBlobRef.current?.((info.object as OnboardingBusinessPin).zoneId);
      }
      return;
    }
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
      const billboard = info.object as Billboard;
      setSelected(billboard);
      visionStateRef.current = createPedestrianVisionState();
      setVisionCapture(null);
      if (hasCampaignPolygon(campaignBlobRef.current)) {
        simVisibleRef.current = true;
        visionEnabledRef.current = true;
        setSimVisible(true);
        setVisionEnabled(true);
      }
    }
  }, []);

  // Billboard focus cycler — mirrors the sightline blob stepper. The active sign
  // index is derived from `selected` so clicking a dot and cycling stay in sync.
  const selectedIndex = useMemo(
    () => (selected ? visibleBillboards.findIndex((b) => sameBillboardLocation(b, selected)) : -1),
    [selected, visibleBillboards],
  );

  const stepBillboard = useCallback(
    (direction: -1 | 1) => {
      if (!visibleBillboards.length) return;
      const base = selectedIndex >= 0 ? selectedIndex : direction === 1 ? -1 : 0;
      const nextIndex = (base + direction + visibleBillboards.length) % visibleBillboards.length;
      setSelected(visibleBillboards[nextIndex]);
    },
    [visibleBillboards, selectedIndex],
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

    const campaignNeedsExplicitBillboard = hasCampaignPolygon(campaignBlob) && !billboardFromLaunch(campaignLaunch);
    const reportBillboard =
      selected ??
      billboardFromLaunch(campaignLaunch) ??
      (campaignNeedsExplicitBillboard ? null : visibleBillboards[0] ?? billboards[0] ?? null);
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
  }, [billboards, brief, campaignBlob, campaignContext, campaignExporting, campaignLaunch, creative, journalPages, selected, visibleBillboards]);

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

  useEffect(() => {
    const launchBillboard = billboardFromLaunch(campaignLaunch);
    if (!mapboxMap || launchBillboard || !campaignBlob || campaignBlob.length < 3) return;

    const bounds = boundsForPolygon(campaignBlob);
    if (!bounds) return;

    mapboxMap.fitBounds(bounds, {
      padding: { top: 120, right: 120, bottom: 120, left: 120 },
      maxZoom: 16.8,
      pitch: 68,
      bearing: INITIAL_VIEW_STATE.bearing,
      duration: 0,
      essential: true,
    });
  }, [campaignBlob, campaignLaunch, mapboxMap]);

  // Onboarding steps 1 and 2 keep the city almost fully zoomed in behind the
  // mascot/dialog. Step 3 owns its own wider camera once blobs are available.
  useEffect(() => {
    if (
      !mapboxMap ||
      !onboardingActive ||
      (onboardingBlobs && onboardingBlobs.length > 0)
    ) return;

    mapboxMap.stop();
    mapboxMap.easeTo({
      center: [DEFAULT_ONBOARDING_CAMERA.lng, DEFAULT_ONBOARDING_CAMERA.lat],
      zoom: DEFAULT_ONBOARDING_CAMERA.zoom,
      pitch: DEFAULT_ONBOARDING_CAMERA.pitch,
      bearing: DEFAULT_ONBOARDING_CAMERA.bearing,
      duration: 900,
      essential: true,
    });
  }, [mapboxMap, onboardingActive, onboardingBlobs]);

  // Onboarding step 3 camera — pull back to frame every candidate blob, then
  // dive onto whichever one the user taps. Extra bottom padding keeps the blobs
  // clear of the tutorial speech bubble.
  useEffect(() => {
    if (!mapboxMap || !onboardingBlobs || onboardingBlobs.length === 0) return;

    const selectedZone = selectedBlobId
      ? onboardingBlobs.find((o) => o.id === selectedBlobId)
      : null;

    if (selectedZone) {
      mapboxMap.stop();
      mapboxMap.easeTo({
        center: [selectedZone.centroid.lng, selectedZone.centroid.lat],
        zoom: focusZoom(selectedZone.radiusM),
        pitch: 55,
        bearing: INITIAL_VIEW_STATE.bearing,
        duration: 900,
        essential: true,
      });
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    for (const zone of onboardingBlobs) {
      for (const [lng, lat] of zone.polygon) bounds.extend([lng, lat]);
    }
    // The tutorial bubble sits bottom-left, so bias the framing up and right —
    // scaled to the viewport so small screens don't over-pad.
    const canvas = mapboxMap.getCanvas();
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    mapboxMap.stop();
    mapboxMap.fitBounds(bounds, {
      padding: {
        top: Math.round(Math.min(90, height * 0.1)),
        right: Math.round(Math.min(90, width * 0.08)),
        bottom: Math.round(Math.min(300, height * 0.36)),
        left: Math.round(Math.min(230, width * 0.2)),
      },
      maxZoom: 15,
      pitch: 45,
      bearing: INITIAL_VIEW_STATE.bearing,
      duration: 1400,
      essential: true,
    });
  }, [mapboxMap, onboardingBlobs, selectedBlobId]);

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

      {onboardingActive && (
        <>
          <OnboardingBusinessLabels
            map={mapboxMap}
            pins={onboardingBusinessPins}
            selectedZoneId={selectedBlobId}
            onSelectZone={onSelectBlob}
          />
          <OnboardingBlobLabels
            map={mapboxMap}
            blobs={onboardingBlobs}
            selectedId={selectedBlobId}
            onSelect={onSelectBlob}
          />
        </>
      )}

      {!onboardingActive && (
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
      )}

      {!onboardingActive && count !== null && (
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
      {!onboardingActive && !campaignLaunch && visibleBillboards.length > 0 && (
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
            {selectedIndex >= 0 ? selectedIndex + 1 : "–"}/{visibleBillboards.length}
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
      {!campaignPreviewMode && !onboardingActive && (
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
          {
            color: "#ffecd2",
            label: "Pedestrians",
            n: campaignAwaitingBillboard ? 0 : PED_COUNT,
            note: campaignAwaitingBillboard ? "pick a board" : "SFMTA-weighted",
          },
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

      {campaignAwaitingBillboard && (
        <div
          style={{
            position: "absolute",
            bottom: 162,
            left: 16,
            maxWidth: 250,
            zIndex: 35,
            borderRadius: 10,
            background: "rgba(15,23,42,0.9)",
            color: "#fbbf24",
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
            padding: "8px 11px",
            fontSize: 11,
            fontWeight: 750,
            lineHeight: 1.35,
          }}
        >
          Click a billboard dot in this zone to spawn pedestrians.
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

      {!onboardingActive && visionCapture && (
        <PedestrianCaptureToast
          capture={visionCapture}
          onClose={() => setVisionCapture(null)}
        />
      )}

      {!onboardingActive && showJournal && (
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

      {!onboardingActive && selected && (
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
