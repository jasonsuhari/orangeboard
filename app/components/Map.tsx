"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapNav from "./MapNav";
import StreetViewComposite from "./StreetViewComposite";
import { createBillboard3DLayer, type Billboard3DLayer } from "./billboard3dLayer";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// The creative generated on the landing page is stashed here so it can ride
// over to the map and get composited onto the real sign. Falls back to a sample.
const CREATIVE_KEY = "vs:creative";
const DEFAULT_CREATIVE = "/sample-creative.svg";

// ── Traffic simulation ────────────────────────────────────────────────────────

const SF = { minLng: -122.52, maxLng: -122.35, minLat: 37.70, maxLat: 37.82 };

// Degrees/ms — boosted ~80× real speed for visibility at zoom 12-14.
const SPD = { ped: 0.0000009, car: 0.0000032, bus: 0.0000020 };

const PED_COUNT = 150;
const CAR_COUNT = 80;

// Cardinal bearings (rad from N, CW) + Market St diagonal (~56°)
const CAR_BEARINGS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 0.984, 0.984 + Math.PI];

// Simplified SF Muni route waypoints [lng, lat]
const BUS_ROUTES: [number, number][][] = [
  [[-122.438, 37.760], [-122.428, 37.767], [-122.419, 37.775], [-122.409, 37.782], [-122.400, 37.791]], // 14 Mission
  [[-122.402, 37.787], [-122.420, 37.786], [-122.440, 37.783], [-122.460, 37.781], [-122.483, 37.779]], // 38 Geary
  [[-122.398, 37.791], [-122.420, 37.790], [-122.440, 37.788], [-122.466, 37.786], [-122.503, 37.785]], // 1 California
  [[-122.421, 37.757], [-122.421, 37.769], [-122.421, 37.779], [-122.421, 37.791], [-122.421, 37.807]], // 47 Van Ness
  [[-122.391, 37.780], [-122.407, 37.776], [-122.419, 37.772], [-122.433, 37.768], [-122.448, 37.763]], // N Judah / Market
  [[-122.432, 37.763], [-122.432, 37.773], [-122.433, 37.783], [-122.434, 37.793], [-122.435, 37.801]], // 22 Fillmore
  [[-122.402, 37.773], [-122.420, 37.771], [-122.440, 37.769], [-122.460, 37.767], [-122.483, 37.765]], // 5 Fulton
  [[-122.408, 37.790], [-122.408, 37.798], [-122.410, 37.804], [-122.413, 37.810]],                    // 30 Stockton
];

const BUS_COUNT = BUS_ROUTES.length * 2;

interface SimAgent {
  lng: number;
  lat: number;
  bearing: number;     // radians 0=N CW (peds/cars)
  speed: number;       // °/ms
  nextTurn: number;    // perf.now() ms
  turnEvery: number;   // ms
  routePts?: [number, number][];
  routeT: number;      // continuous 0..(pts.length-1) for buses
  routeDir: 1 | -1;
}

function rnd(lo: number, hi: number) { return lo + Math.random() * (hi - lo); }

function initTrafficAgents(): { peds: SimAgent[]; cars: SimAgent[]; buses: SimAgent[] } {
  const peds: SimAgent[] = Array.from({ length: PED_COUNT }, () => ({
    lng: rnd(SF.minLng, SF.maxLng), lat: rnd(SF.minLat, SF.maxLat),
    bearing: rnd(0, Math.PI * 2), speed: SPD.ped,
    nextTurn: rnd(0, 6000), turnEvery: rnd(3000, 9000), routeT: 0, routeDir: 1,
  }));

  const cars: SimAgent[] = Array.from({ length: CAR_COUNT }, () => ({
    lng: rnd(SF.minLng, SF.maxLng), lat: rnd(SF.minLat, SF.maxLat),
    bearing: CAR_BEARINGS[Math.floor(Math.random() * CAR_BEARINGS.length)], speed: SPD.car,
    nextTurn: rnd(0, 12000), turnEvery: rnd(8000, 25000), routeT: 0, routeDir: 1,
  }));

  const buses: SimAgent[] = BUS_ROUTES.flatMap((pts) =>
    ([0, 1] as const).map<SimAgent>(() => ({
      lng: 0, lat: 0, bearing: 0, speed: SPD.bus,
      nextTurn: Infinity, turnEvery: Infinity,
      routePts: pts, routeT: rnd(0, pts.length - 1), routeDir: Math.random() < 0.5 ? 1 : -1,
    }))
  );

  return { peds, cars, buses };
}

function stepSimAgent(a: SimAgent, dt: number, now: number): void {
  if (a.routePts) {
    const pts = a.routePts;
    const maxT = pts.length - 1;
    const seg = Math.min(Math.floor(a.routeT), maxT - 1);
    const p0 = pts[seg], p1 = pts[Math.min(seg + 1, maxT)];
    const segLen = Math.sqrt((p1[0]-p0[0])**2 + (p1[1]-p0[1])**2) || 1e-9;
    a.routeT = Math.max(0, Math.min(maxT, a.routeT + (a.speed * dt / segLen) * a.routeDir));
    if (a.routeT >= maxT) a.routeDir = -1;
    else if (a.routeT <= 0) a.routeDir = 1;
    const s = Math.min(Math.floor(a.routeT), maxT - 1);
    const t = a.routeT - s;
    a.lng = pts[s][0] + (pts[Math.min(s+1,maxT)][0] - pts[s][0]) * t;
    a.lat = pts[s][1] + (pts[Math.min(s+1,maxT)][1] - pts[s][1]) * t;
    return;
  }
  if (now >= a.nextTurn) {
    a.bearing = a.speed === SPD.car
      ? CAR_BEARINGS[Math.floor(Math.random() * CAR_BEARINGS.length)]
      : rnd(0, Math.PI * 2);
    a.nextTurn = now + a.turnEvery;
  }
  a.lng += Math.sin(a.bearing) * a.speed * dt;
  a.lat += Math.cos(a.bearing) * a.speed * dt;
  if (a.lng < SF.minLng || a.lng > SF.maxLng) {
    a.bearing = Math.PI - a.bearing;
    a.lng = Math.max(SF.minLng, Math.min(SF.maxLng, a.lng));
  }
  if (a.lat < SF.minLat || a.lat > SF.maxLat) {
    a.bearing = -a.bearing;
    a.lat = Math.max(SF.minLat, Math.min(SF.maxLat, a.lat));
  }
}

function agentsToFC(agents: SimAgent[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: agents.map((a) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [a.lng, a.lat] },
      properties: null,
    })),
  };
}

type Selected = {
  lng: number;
  lat: number;
  name: string;
  address: string;
  status: string;
};

// SF Planning GASP inventory, served from /public (see scripts/scrape-billboards.mjs).
const BILLBOARDS_URL = "/sf-billboards.geojson";
const BILLBOARDS_SRC = "billboards";

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

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const layer3dRef = useRef<Billboard3DLayer | null>(null);
  const creativeRef = useRef<string>(DEFAULT_CREATIVE);
  const simReadyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [creative, setCreative] = useState<string>(DEFAULT_CREATIVE);
  const [simVisible, setSimVisible] = useState(true);

  // Keep the latest creative reachable from the map effect, and push it onto the
  // 3D billboards whenever it changes.
  useEffect(() => {
    creativeRef.current = creative;
    layer3dRef.current?.setCreative(creative);
  }, [creative]);

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

  useEffect(() => {
    if (!TOKEN) {
      setError(
        "Missing Mapbox token. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local and restart the dev server."
      );
      return;
    }
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      // Standard style ships with 3D buildings, terrain, and dynamic lighting.
      style: "mapbox://styles/mapbox/standard",
      center: [-122.4194, 37.7749], // San Francisco — where our billboard inventory lives
      zoom: 15.35,
      pitch: 68,
      bearing: -28,
      maxPitch: 85,
      antialias: true,
    });

    mapRef.current = map;

    map.on("style.load", () => {
      // Dusk lighting + 3D objects/landmarks/trees + muted palette (sightline).
      applyStandardStyleConfig(map);
      // Atmospheric sky + 3D terrain exaggeration.
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });

      // Billboard inventory — load the GASP signs and drop them on the map.
      map.addSource(BILLBOARDS_SRC, { type: "geojson", data: BILLBOARDS_URL });

      // Soft glow that marks each sign at overview zoom, then fades out as the
      // real 3D models take over up close.
      map.addLayer({
        id: "billboards-glow",
        type: "circle",
        source: BILLBOARDS_SRC,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 6, 16, 14],
          "circle-color": "#f97316",
          "circle-blur": 1,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.35, 15, 0],
        },
      });

      // Base footprint dot — also the click target for opening a sign.
      map.addLayer({
        id: "billboards",
        type: "circle",
        source: BILLBOARDS_SRC,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 16, 4],
          "circle-color": "#f97316",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#fff",
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0.9, 16, 0.5],
        },
      });

      // ── Traffic simulation layers (populated by RAF loop) ──────────────────
      const emptyFC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
      map.addSource("sim-peds", { type: "geojson", data: emptyFC });
      map.addSource("sim-cars", { type: "geojson", data: emptyFC });
      map.addSource("sim-buses", { type: "geojson", data: emptyFC });

      map.addLayer({
        id: "sim-peds",
        type: "circle",
        source: "sim-peds",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2, 16, 6],
          "circle-color": "#fbbf24",
          "circle-opacity": 0.82,
        },
      });
      map.addLayer({
        id: "sim-cars",
        type: "circle",
        source: "sim-cars",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 16, 7],
          "circle-color": "#e2e8f0",
          "circle-stroke-width": 0.5,
          "circle-stroke-color": "#94a3b8",
          "circle-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "sim-buses",
        type: "circle",
        source: "sim-buses",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 16, 10],
          "circle-color": "#3b82f6",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#93c5fd",
          "circle-opacity": 0.95,
        },
      });

      simReadyRef.current = true;
    });

    // Load the inventory once, then drop real 3D billboard models into the world.
    const add3D = (points: { lng: number; lat: number }[]) => {
      if (layer3dRef.current || !map.isStyleLoaded()) return;
      const layer = createBillboard3DLayer({
        id: "billboards-3d",
        points,
        creativeUrl: creativeRef.current,
      });
      map.addLayer(layer);
      layer3dRef.current = layer;
    };

    fetch(BILLBOARDS_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const feats: GeoJSON.Feature<GeoJSON.Point>[] = j?.features ?? [];
        if (!feats.length) return;
        setCount(feats.length);
        const points = feats.map((f) => {
          const [lng, lat] = f.geometry.coordinates as [number, number];
          return { lng, lat };
        });
        // Style may still be loading on first paint; add now or on style.load.
        if (map.isStyleLoaded()) add3D(points);
        else map.once("style.load", () => add3D(points));
      })
      .catch(() => {});

    // Click a sign → open the street-level preview panel for that exact sign.
    map.on("click", "billboards", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties ?? {};
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      setSelected({
        lng,
        lat,
        name: (p.record_name as string) ?? "Billboard",
        address: (p.address as string) ?? "",
        status: (p.record_status as string) ?? "—",
      });
    });
    map.on("mouseenter", "billboards", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "billboards", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("error", (e) => {
      // Surface auth/style failures to the user instead of a blank screen.
      if (e.error?.message) setError(e.error.message);
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    // Right-click drag to rotate/tilt. Mapbox's built-in handler is too twitchy,
    // so we drive bearing + pitch ourselves with a gentler sensitivity factor.
    const ROTATE_SENSITIVITY = 0.25; // degrees per pixel (default feels ~0.8)
    map.dragRotate.disable();

    const canvas = map.getCanvas();
    let rotating = false;
    let lastX = 0;
    let lastY = 0;

    const preventMenu = (e: MouseEvent) => e.preventDefault();
    const onDown = (e: MouseEvent) => {
      if (e.button !== 2) return; // right button only
      rotating = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMove = (e: MouseEvent) => {
      if (!rotating) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      map.setBearing(map.getBearing() - dx * ROTATE_SENSITIVITY);
      map.setPitch(
        Math.max(0, Math.min(85, map.getPitch() - dy * ROTATE_SENSITIVITY))
      );
    };
    const onUp = () => {
      rotating = false;
    };

    canvas.addEventListener("contextmenu", preventMenu);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      simReadyRef.current = false;
      canvas.removeEventListener("contextmenu", preventMenu);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // RAF loop — steps all agents and pushes positions into Mapbox GeoJSON sources.
  useEffect(() => {
    const { peds, cars, buses } = initTrafficAgents();
    let lastT = performance.now();
    let raf: number;

    function tick() {
      const now = performance.now();
      const dt = Math.min(now - lastT, 100); // cap to avoid jumps after tab switch
      lastT = now;
      const map = mapRef.current;
      if (map && simReadyRef.current) {
        for (const a of peds) stepSimAgent(a, dt, now);
        for (const a of cars) stepSimAgent(a, dt, now);
        for (const a of buses) stepSimAgent(a, dt, now);
        (map.getSource("sim-peds") as mapboxgl.GeoJSONSource | undefined)?.setData(agentsToFC(peds));
        (map.getSource("sim-cars") as mapboxgl.GeoJSONSource | undefined)?.setData(agentsToFC(cars));
        (map.getSource("sim-buses") as mapboxgl.GeoJSONSource | undefined)?.setData(agentsToFC(buses));
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Sync layer visibility with toggle state.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const vis = simVisible ? "visible" : "none";
    const apply = () => {
      for (const id of ["sim-peds", "sim-cars", "sim-buses"]) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
      }
    };
    if (map.isStyleLoaded()) apply();
    else {
      map.once("style.load", apply);
      return () => { map.off("style.load", apply); };
    }
  }, [simVisible]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <MapNav />
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
          minWidth: 170,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
            Live Traffic
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
          { color: "#fbbf24", label: "Pedestrians", n: PED_COUNT },
          { color: "#e2e8f0", label: "Vehicles", n: CAR_COUNT },
          { color: "#3b82f6", label: "Buses", n: BUS_COUNT },
        ] as const).map(({ color, label, n }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 4px ${color}88` }} />
            <span style={{ color: "#94a3b8", flex: 1 }}>{label}</span>
            <span style={{ color: "#475569", fontVariantNumeric: "tabular-nums" }}>{n}</span>
          </div>
        ))}
      </div>

      {error && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            maxWidth: 440,
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
