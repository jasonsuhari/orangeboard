"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { PickingInfo, Layer } from "@deck.gl/core";
import { ScatterplotLayer } from "@deck.gl/layers";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import { Map as MapboxMap, useControl, type MapRef } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapNav from "./MapNav";
import StreetViewComposite from "./StreetViewComposite";
import { buildCrowdLayers, buildBillboardMarkers, type CrowdAgent } from "./crowdLayers";
import { computeTrafficFlow, buildTrafficFlowLayers, type TrafficFlowData } from "./trafficFlowLayers";
import {
  type SimAgent, type RoadNet, type PedWeight, type MuniVehicle,
  buildRoadNetwork, spawnRoadCar, spawnRoadPed, stepSimAgent,
  syntheticCar, syntheticPed, syntheticBuses,
  targetCarCount, targetPedCount, CAR_COUNT, BUS_COUNT, PED_COUNT,
} from "../lib/trafficSim";
import {
  PEDESTRIAN_VISION_DEFAULTS,
  buildPedestrianVisionIndex,
  createPedestrianVisionState,
  findPedestrianBillboardTrigger,
  pedestrianStreetViewImageUrl,
  type PedestrianBillboardCapture,
  type PedestrianVisionAgent,
  type PedestrianVisionIndex,
  type VisionBillboard,
} from "../lib/pedestrianVision";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// The creative generated on the landing page is stashed here so it can ride
// over to the map and get composited onto the real sign. Falls back to a sample.
const CREATIVE_KEY = "vs:creative";
const DEFAULT_CREATIVE = "/sample-creative.svg";

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
  lng: number;
  lat: number;
  name: string;
  address: string;
  status: string;
};

const PED_KINDS = ["walker", "runner", "tourist", "cyclist"] as const;
const randomPedKind = () => PED_KINDS[Math.floor(Math.random() * PED_KINDS.length)];

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

export default function Map() {
  const mapRef = useRef<MapRef | null>(null);
  const creativeRef = useRef<string>(DEFAULT_CREATIVE);
  const simVisibleRef = useRef(true);
  // Road network + Muni live data refs (updated async, read by RAF loop)
  const roadNetRef = useRef<RoadNet | null>(null);
  const pedWeightsRef = useRef<PedWeight[]>([]);
  const muniVehiclesRef = useRef<MuniVehicle[]>([]);
  const muniLiveRef = useRef(false);
  // Cached foot-traffic flow dataset (computed once; toggled by showTraffic).
  const trafficFlowRef = useRef<TrafficFlowData | null>(null);
  const showTrafficRef = useRef(false);
  const visionEnabledRef = useRef(true);
  const visionIndexRef = useRef<PedestrianVisionIndex | null>(null);
  const visionStateRef = useRef(createPedestrianVisionState());
  // Live crowd positions, written by the RAF loop and read when layers rebuild.
  const agentsRef = useRef<CrowdAgent[]>([]);
  // User-placed models (dropped by the nav spawn tools, see placeMode below)
  const spawnPedsRef = useRef<{ agent: SimAgent; kind: string }[]>([]);
  const spawnBillboardsRef = useRef<{ lng: number; lat: number }[]>([]);
  const placeModeRef = useRef<"billboard" | "pedestrian" | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [selected, setSelected] = useState<Billboard | null>(null);
  const [creative, setCreative] = useState<string>(DEFAULT_CREATIVE);
  const [simVisible, setSimVisible] = useState(true);
  const [muniLive, setMuniLive] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [visionEnabled, setVisionEnabled] = useState(true);
  const [visionCapture, setVisionCapture] = useState<PedestrianBillboardCapture | null>(null);
  // Active placement tool: click the map to drop a billboard / pedestrian there.
  const [placeMode, setPlaceMode] = useState<"billboard" | "pedestrian" | null>(null);
  // Debug: how many models the user has placed (proves the click action fires).
  const [placedCount, setPlacedCount] = useState(0);
  // Bumped by the RAF loop (~30fps) to re-render so deck layers pick up motion.
  const [frame, setFrame] = useState(0);

  useEffect(() => { creativeRef.current = creative; }, [creative]);
  useEffect(() => { simVisibleRef.current = simVisible; }, [simVisible]);
  useEffect(() => { showTrafficRef.current = showTraffic; }, [showTraffic]);
  useEffect(() => { visionEnabledRef.current = visionEnabled; }, [visionEnabled]);
  useEffect(() => { placeModeRef.current = placeMode; }, [placeMode]);

  const visionBillboards = useMemo<VisionBillboard[]>(
    () => [
      ...billboards.map((b, i) => ({
        id: `inventory:${i}:${b.lng.toFixed(6)},${b.lat.toFixed(6)}`,
        lng: b.lng,
        lat: b.lat,
        label: b.name,
        address: b.address,
      })),
      ...spawnBillboardsRef.current.map((b, i) => ({
        id: `placed:${i}:${b.lng.toFixed(6)},${b.lat.toFixed(6)}`,
        lng: b.lng,
        lat: b.lat,
        label: "Placed billboard",
      })),
    ],
    [billboards, placedCount],
  );

  useEffect(() => {
    visionIndexRef.current = buildPedestrianVisionIndex(visionBillboards);
  }, [visionBillboards]);

  // Pick up the most recently generated creative (set by the landing flow).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CREATIVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { imageUrl?: string };
        if (parsed.imageUrl) setCreative(parsed.imageUrl);
      }
    } catch {
      /* ignore malformed cache */
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
          feats.map((f) => {
            const [lng, lat] = f.geometry.coordinates as [number, number];
            const p = f.properties ?? {};
            return {
              lng,
              lat,
              name: (p.record_name as string) ?? "Billboard",
              address: (p.address as string) ?? "",
              status: (p.record_status as string) ?? "—",
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
    const spawnCenter = { ...SPAWN_CENTER, radiusDeg: SPAWN_RADIUS_DEG };
    let cars: SimAgent[] = Array.from({ length: CAR_COUNT }, () => syntheticCar(spawnCenter));
    let buses: SimAgent[] = syntheticBuses();
    let peds: SimAgent[] = Array.from({ length: PED_COUNT }, () => syntheticPed(spawnCenter));
    let pedKinds: string[] = peds.map(randomPedKind);
    let useRoadNet = false;
    let lastDensityCheck = 0;
    let lastT = performance.now();
    let lastRender = 0;
    let lastVisionCheck = 0;
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
        pedKinds = peds.map(randomPedKind);
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
        if (peds.length > tp) { peds.splice(tp); pedKinds.splice(tp); }
        else while (peds.length < tp) { peds.push(spawnRoadPed(net, pedWeightsRef.current, spawnCenter)); pedKinds.push(randomPedKind()); }
      }

      for (const a of cars) stepSimAgent(a, dt, now, net ?? undefined, false);
      for (const a of peds) stepSimAgent(a, dt, now, net ?? undefined, true);
      if (!muniLiveRef.current) {
        for (const a of buses) stepSimAgent(a, dt, now);
      }
      for (const s of spawnPedsRef.current) stepSimAgent(s.agent, dt, now, net ?? undefined, true);

      if (
        visionEnabledRef.current &&
        now - lastVisionCheck >= PEDESTRIAN_VISION_DEFAULTS.checkIntervalMs
      ) {
        lastVisionCheck = now;
        const index = visionIndexRef.current;
        if (index?.count) {
          const walkers: PedestrianVisionAgent[] = [];
          if (simVisibleRef.current) {
            for (let i = 0; i < peds.length; i++) {
              walkers.push({
                id: `sim:${i}`,
                lng: peds[i].lng,
                lat: peds[i].lat,
                bearing: peds[i].bearing,
              });
            }
          }
          for (let i = 0; i < spawnPedsRef.current.length; i++) {
            const a = spawnPedsRef.current[i].agent;
            walkers.push({
              id: `placed:${i}`,
              lng: a.lng,
              lat: a.lat,
              bearing: a.bearing,
            });
          }

          const capture = walkers.length
            ? findPedestrianBillboardTrigger(walkers, index, visionStateRef.current, now)
            : null;
          if (capture) setVisionCapture(capture);
        }
      }

      const agents: CrowdAgent[] = [];
      if (simVisibleRef.current) {
        for (let i = 0; i < peds.length; i++) agents.push({ lng: peds[i].lng, lat: peds[i].lat, kind: pedKinds[i] });
        for (const a of cars) agents.push({ lng: a.lng, lat: a.lat, kind: "car" });
        for (const a of buses) agents.push({ lng: a.lng, lat: a.lat, kind: "bus" });
      }
      // User-placed pedestrians always render, regardless of the sim toggle.
      for (const s of spawnPedsRef.current) agents.push({ lng: s.agent.lng, lat: s.agent.lat, kind: s.kind });
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

  // Rebuild deck layers from the latest agents / billboards / flow. Recomputed
  // each rendered frame (`frame`) so motion shows; deck diffs by layer id.
  const layers = useMemo<Layer[]>(() => {
    const ls: Layer[] = [];

    // Foot-traffic flow lines sit beneath everything. Compute once and cache.
    if (showTraffic) {
      if (!trafficFlowRef.current && roadNetRef.current && pedWeightsRef.current.length > 0) {
        trafficFlowRef.current = computeTrafficFlow(
          roadNetRef.current, pedWeightsRef.current, new Date().getHours()
        );
      }
      if (trafficFlowRef.current) ls.push(...(buildTrafficFlowLayers(trafficFlowRef.current) as Layer[]));
    }

    // 3D billboard models — inventory + user-placed, as pole + sign-panel boxes.
    ls.push(
      ...buildBillboardMarkers([
        ...billboards.map((b) => ({ lng: b.lng, lat: b.lat })),
        ...spawnBillboardsRef.current,
      ])
    );

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

    return ls;
    // `frame` drives the per-frame recompute; agentsRef is read fresh each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, billboards, showTraffic, placedCount]);

  // deck.gl click — handles placement tools and opening a sign panel.
  const handleDeckClick = useCallback((info: PickingInfo) => {
    const mode = placeModeRef.current;
    if (mode && info.coordinate) {
      const [lng, lat] = info.coordinate as [number, number];
      if (mode === "pedestrian") {
        const a = syntheticPed();
        a.lng = lng;
        a.lat = lat;
        spawnPedsRef.current.push({ agent: a, kind: "walker" });
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

  const onMapLoad = useCallback((e: { target: mapboxgl.Map }) => {
    const map = e.target;
    applyStandardStyleConfig(map);
    // No terrain on purpose: the interleaved deck layers are depth-tested against
    // Mapbox's flat (z=0) ground plane. Terrain would shift the basemap depth out
    // from under the agents/billboards and break the occlusion against buildings.
  }, []);

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

      <MapNav
        placeMode={placeMode}
        showTraffic={showTraffic}
        visionEnabled={visionEnabled}
        onToggleTraffic={() => setShowTraffic((v) => !v)}
        onToggleVision={() => setVisionEnabled((v) => !v)}
        onSpawnBillboard={() => setPlaceMode((m) => (m === "billboard" ? null : "billboard"))}
        onSpawnPedestrian={() => setPlaceMode((m) => (m === "pedestrian" ? null : "pedestrian"))}
      />

      {/* Debug HUD — localizes arming vs. click vs. render without DevTools. */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 40,
          padding: "8px 12px",
          background: "rgba(12,12,18,0.9)",
          color: "#fff",
          borderRadius: 8,
          fontSize: 12,
          fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
          lineHeight: 1.5,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div>tool: <b style={{ color: placeMode ? "#fbbf24" : "#64748b" }}>{placeMode ?? "none"}</b></div>
        <div>placed: <b style={{ color: placedCount > 0 ? "#22c55e" : "#64748b" }}>{placedCount}</b></div>
        <div>sight: <b style={{ color: visionEnabled ? "#22c55e" : "#64748b" }}>{visionEnabled ? "on" : "off"}</b></div>
        <div style={{ color: "#64748b", fontSize: 10, marginTop: 2 }}>
          {placeMode ? "click the map to drop" : "click ＋ Walker / ＋ Billboard"}
        </div>
      </div>

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

      {/* Traffic simulation legend + toggle */}
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

      {visionCapture && (
        <PedestrianCapturePanel
          capture={visionCapture}
          onClose={() => setVisionCapture(null)}
        />
      )}

      {selected && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            bottom: 16,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(10px)",
            borderRadius: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
              padding: "14px 16px",
              borderBottom: "1px solid #f1f1f1",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>
                {selected.name}
              </div>
              {selected.address && (
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  {selected.address}
                </div>
              )}
              <span
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  background: "#fff7ed",
                  color: "#c2410c",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {selected.status}
              </span>
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: 999,
                border: "none",
                background: "#f4f4f5",
                color: "#555",
                fontSize: 16,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ padding: 16, overflowY: "auto" }}>
            <StreetViewComposite
              key={`${selected.lng},${selected.lat}`}
              lat={selected.lat}
              lng={selected.lng}
              label={selected.name}
              creativeUrl={creative}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PedestrianCapturePanel({
  capture,
  onClose,
}: {
  capture: PedestrianBillboardCapture;
  onClose: () => void;
}) {
  const imageUrl = pedestrianStreetViewImageUrl(capture);
  const name = capture.billboard.label ?? "Billboard";
  const statStyle = {
    borderRadius: 8,
    border: "1px solid rgba(226,232,240,1)",
    background: "rgba(248,250,252,0.95)",
    padding: "8px 10px",
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        bottom: 92,
        width: 360,
        maxWidth: "calc(100vw - 32px)",
        zIndex: 35,
        overflow: "hidden",
        borderRadius: 12,
        background: "rgba(255,255,255,0.97)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        border: "1px solid rgba(226,232,240,0.95)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 14px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#f97316",
            }}
          >
            Pedestrian sightline
          </div>
          <div
            style={{
              marginTop: 2,
              color: "#111827",
              fontSize: 13,
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={name}
          >
            {name}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close pedestrian sightline capture"
          style={{
            flexShrink: 0,
            width: 26,
            height: 26,
            borderRadius: 999,
            border: "none",
            background: "#f1f5f9",
            color: "#475569",
            cursor: "pointer",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>

      <div style={{ position: "relative", aspectRatio: "1 / 1", background: "#0f172a" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={capture.id}
          src={imageUrl}
          alt={`Pedestrian-facing Street View near ${name}`}
          style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
          draggable={false}
        />
        <div
          style={{
            position: "absolute",
            left: 10,
            bottom: 10,
            borderRadius: 999,
            background: "rgba(15,23,42,0.78)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "5px 8px",
            backdropFilter: "blur(6px)",
          }}
        >
          heading {capture.pedestrian.headingDeg.toFixed(0)} deg
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: 10 }}>
        <div style={statStyle}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>Distance</div>
          <div style={{ marginTop: 2, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
            {Math.round(capture.distanceM)}m
          </div>
        </div>
        <div style={statStyle}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>Off center</div>
          <div style={{ marginTop: 2, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
            {capture.angleOffCenterDeg.toFixed(0)} deg
          </div>
        </div>
        <div style={statStyle}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>Fit</div>
          <div style={{ marginTop: 2, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
            {Math.round(capture.score * 100)}
          </div>
        </div>
      </div>

      {capture.billboard.address && (
        <div
          style={{
            padding: "0 12px 12px",
            color: "#64748b",
            fontSize: 11,
            lineHeight: 1.35,
          }}
        >
          {capture.billboard.address}
        </div>
      )}
    </div>
  );
}
