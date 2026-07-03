"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapboxMap, useControl, type MapRef } from "react-map-gl/mapbox";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import { SolidPolygonLayer, PathLayer, TextLayer, IconLayer } from "@deck.gl/layers";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import type { CompanyBrief } from "../lib/types";
import type { Opportunity as ApiOpportunity } from "../api/opportunities/route";
import { buildCampaignPedestrianContext, PEDESTRIAN_CONTEXT_STORAGE_KEY } from "../lib/pedestrianIcp";
import {
  djb2,
  focusZoom,
  offsetPoint,
  withPolygons,
  STATIC_OPPORTUNITIES,
  type OpportunityWithPolygon,
} from "../lib/opportunityBlobs";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const INITIAL_VIEW_STATE = {
  longitude: -122.3964,
  latitude: 37.7775,
  zoom: 14.6,
  pitch: 55,
  bearing: -20,
};

const STYLE_CONFIG: Array<[string, unknown]> = [
  ["show3dObjects", true],
  ["show3dLandmarks", true],
  ["show3dTrees", true],
  ["showPointOfInterestLabels", false],
  ["showPointOfInterestIcons", false],
  ["lightPreset", "dusk"],
  ["colorLand", "#a8a39a"],
  ["colorRoads", "#9e9890"],
  ["colorWater", "#3d6e8c"],
  ["show3dBuildings", true],
];

// Teardrop map pin (orange fill, white border + dot) used to mark the ICP
// companies that sit inside the selected opportunity blob.
const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64">' +
  '<path d="M24 2C13 2 4 11 4 22c0 14 20 40 20 40s20-26 20-40C44 11 35 2 24 2z" fill="#f97316" stroke="#ffffff" stroke-width="3"/>' +
  '<circle cx="24" cy="22" r="8" fill="#ffffff"/></svg>';
const PIN_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PIN_SVG)}`;

// ─── geo helpers ───────────────────────────────────────────────────────────────

type PinBusiness = { name: string; type: string; reason: string; lng: number; lat: number };

// ─── opportunity data ──────────────────────────────────────────────────────────

type Opportunity = OpportunityWithPolygon;

function projectedBlobLabelPoint(map: mapboxgl.Map, opportunity: Opportunity): { x: number; y: number } {
  const points = opportunity.polygon.map(([lng, lat]) => map.project([lng, lat]));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  return { x: (minX + maxX) / 2, y: minY - 12 };
}

// ─── deck.gl overlay control ───────────────────────────────────────────────────

function DeckOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

type Rgba = [number, number, number, number];

function fillColor(score: number, selected: boolean): Rgba {
  const alpha = selected ? 104 : Math.round(42 + Math.max(0, Math.min(32, score - 60)));
  return [249, 115, 22, alpha];
}

function strokeColor(selected: boolean, pulse: number): Rgba {
  const a = selected ? Math.round(190 + 55 * pulse) : Math.round(130 + 35 * pulse);
  return [249, 115, 22, a];
}

// ─── page ──────────────────────────────────────────────────────────────────────

function focusMapOnOpportunity(map: mapboxgl.Map, opportunity: Opportunity, duration: number) {
  map.stop();
  map.easeTo({
    center: [opportunity.centroid.lng, opportunity.centroid.lat],
    zoom: focusZoom(opportunity.radiusM),
    pitch: INITIAL_VIEW_STATE.pitch,
    bearing: INITIAL_VIEW_STATE.bearing,
    duration,
    essential: true,
  });
}

export default function SightlinePage() {
  const mapRef = useRef<MapRef>(null);
  const didFocusRef = useRef(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(STATIC_OPPORTUNITIES);
  const [selectedId, setSelectedId] = useState(STATIC_OPPORTUNITIES[0].id);
  const [loading, setLoading] = useState(false);
  const [icpLabel, setIcpLabel] = useState<string | null>(null);
  const [campaignBrief, setCampaignBrief] = useState<CompanyBrief | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [time, setTime] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("orangeboard:brief");
    if (!raw) return;
    let brief: CompanyBrief;
    try { brief = JSON.parse(raw) as CompanyBrief; } catch { return; }

    setIcpLabel(brief.identity.companyName ?? null);
    setCampaignBrief(brief);
    setLoading(true);

    fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brief),
    })
      .then((r) => r.json())
      .then((data: { opportunities?: ApiOpportunity[] }) => {
        if (data.opportunities?.length) {
          const hydrated = withPolygons(data.opportunities);
          setOpportunities(hydrated);
          setSelectedId(hydrated[0].id);
        }
      })
      .catch(() => {/* keep static fallback */})
      .finally(() => setLoading(false));
  }, []);

  const selectedIndex = Math.max(0, opportunities.findIndex((o) => o.id === selectedId));
  const selected = opportunities[selectedIndex] ?? opportunities[0];
  const visibleOpportunities = selected ? [selected] : [];
  const activeLayerKey = selected?.id ?? "none";

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!mapReady || !map || !selected) return;

    focusMapOnOpportunity(map, selected, didFocusRef.current ? 650 : 0);
    didFocusRef.current = true;
  }, [mapReady, selected?.id, selected?.centroid.lng, selected?.centroid.lat, selected?.radiusM]);

  function stepOpportunity(direction: -1 | 1) {
    if (!opportunities.length) return;

    const nextIndex = (selectedIndex + direction + opportunities.length) % opportunities.length;
    setSelectedId(opportunities[nextIndex].id);
  }

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    for (const [prop, value] of STYLE_CONFIG) {
      try { map.setConfigProperty("basemap", prop, value); } catch { /* noop */ }
    }
    setMapReady(true);

    const tick = () => {
      setTime(performance.now() / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const pulse = 0.5 + 0.5 * Math.sin(time * 1.6);

  // ICP companies inside the selected blob, dropped as map pins. Several
  // businesses can share one billboard, so jitter each by a deterministic small
  // offset (seeded on its name) to fan overlapping pins apart.
  const selectedPins: PinBusiness[] = (selected?.matchedBusinesses ?? [])
    .filter((b): b is typeof b & { lng: number; lat: number } =>
      typeof b.lng === "number" && typeof b.lat === "number"
    )
    .map((b) => {
      const angle = djb2(b.name) * Math.PI * 2;
      const dist = 16 + djb2(`${b.name}-r`) * 42; // 16–58 m
      const [lng, lat] = offsetPoint({ lng: b.lng, lat: b.lat }, dist, angle);
      return { name: b.name, type: b.type, reason: b.reason, lng, lat };
    });

  const allSelectedPins: PinBusiness[] = selected
    ? [
        ...selectedPins,
        ...selected.matchedBusinesses
          .filter((b) => typeof b.lng !== "number" || typeof b.lat !== "number")
          .map((b, index) => {
            const angle = djb2(`${b.name}-${index}`) * Math.PI * 2;
            const dist = Math.max(42, selected.radiusM * (0.16 + (index % 5) * 0.035));
            const [lng, lat] = offsetPoint(selected.centroid, dist, angle);
            return { name: b.name, type: b.type, reason: b.reason, lng, lat };
          }),
      ]
    : [];

  const mapboxMap = mapReady ? mapRef.current?.getMap() : null;
  const blobLabelPoint = mapboxMap && selected
    ? projectedBlobLabelPoint(mapboxMap, selected)
    : null;
  const projectedPins = mapboxMap
    ? allSelectedPins.map((pin) => ({
      ...pin,
      point: mapboxMap.project([pin.lng, pin.lat]),
    }))
    : [];

  const layers = [
    new SolidPolygonLayer<Opportunity>({
      id: `opp-fill-${activeLayerKey}`,
      data: visibleOpportunities,
      getPolygon: (o) => o.polygon,
      getFillColor: (o) => fillColor(o.score, o.id === selectedId),
      extruded: false,
      pickable: true,
      onClick: ({ object }) => { if (object) setSelectedId(object.id); },
      parameters: { depthWriteEnabled: false },
      updateTriggers: { getFillColor: [selectedId] },
    }),

    new PathLayer<Opportunity>({
      id: `opp-outline-${activeLayerKey}`,
      data: visibleOpportunities,
      getPath: (o) => o.polygon,
      getWidth: (o) => (o.id === selectedId ? 4 : 2),
      widthUnits: "pixels",
      getColor: (o) => strokeColor(o.id === selectedId, pulse),
      pickable: false,
      parameters: { depthWriteEnabled: false },
      updateTriggers: { getColor: [selectedId, time], getWidth: [selectedId] },
    }),

    new TextLayer<Opportunity>({
      id: `opp-labels-${activeLayerKey}`,
      data: visibleOpportunities,
      getPosition: (o) => [o.centroid.lng, o.centroid.lat, 32],
      getText: (o) => o.title,
      getSize: 13,
      getColor: [255, 255, 255, 235] as Rgba,
      getBackgroundColor: [12, 12, 12, 205] as Rgba,
      background: true,
      backgroundPadding: [7, 3, 7, 3],
      getBorderColor: [249, 115, 22, 150] as Rgba,
      getBorderWidth: 1,
      fontWeight: 700,
      getPixelOffset: [0, -42],
      getTextAnchor: "middle",
      getAlignmentBaseline: "bottom",
      pickable: true,
      onClick: ({ object }) => { if (object) setSelectedId(object.id); },
      parameters: { depthCompare: "always", depthWriteEnabled: false },
    }),

    // Pins marking each ICP company inside the selected blob.
    new IconLayer<PinBusiness>({
      id: `opp-pins-${activeLayerKey}`,
      data: allSelectedPins,
      getIcon: () => ({ url: PIN_URL, width: 48, height: 64, anchorY: 64, mask: false }),
      getPosition: (b) => [b.lng, b.lat, 0],
      getSize: 40,
      sizeUnits: "pixels",
      billboard: true,
      pickable: false,
      parameters: { depthCompare: "always", depthWriteEnabled: false },
    }),

    new TextLayer<PinBusiness>({
      id: `opp-pin-labels-${activeLayerKey}`,
      data: allSelectedPins,
      getPosition: (b) => [b.lng, b.lat, 0],
      getText: (b) => b.name,
      getSize: 11,
      sizeUnits: "pixels",
      getColor: [255, 255, 255, 240] as Rgba,
      getBackgroundColor: [12, 12, 12, 205] as Rgba,
      background: true,
      backgroundPadding: [5, 2, 5, 2],
      getBorderColor: [249, 115, 22, 150] as Rgba,
      getBorderWidth: 1,
      fontWeight: 600,
      getPixelOffset: [0, -46],
      getTextAnchor: "middle",
      getAlignmentBaseline: "bottom",
      parameters: { depthCompare: "always", depthWriteEnabled: false },
    }),
  ];

  return (
    <main style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <MapboxMap
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        initialViewState={INITIAL_VIEW_STATE}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/standard"
        onLoad={onMapLoad}
        onRender={() => {
          if (!mapReady && mapRef.current?.getMap()) setMapReady(true);
        }}
      >
        <DeckOverlay key={activeLayerKey} layers={layers} />
      </MapboxMap>

      {blobLabelPoint && selected && (
        <div
          className="pointer-events-none absolute left-0 top-0 max-w-72 rounded-md border border-orange-400/45 bg-black/78 px-3 py-2 text-center text-white shadow-2xl backdrop-blur"
          style={{
            transform: `translate(${blobLabelPoint.x}px, ${blobLabelPoint.y}px) translate(-50%, -100%)`,
            zIndex: 34,
          }}
        >
          <p className="truncate text-xs font-bold">{selected.title}</p>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-orange-300">{selected.area}</p>
        </div>
      )}

      {projectedPins.map((pin, index) => (
        <div
          key={`${pin.name}-${pin.type}-${index}`}
          className="pointer-events-none absolute left-0 top-0 flex flex-col items-center"
          style={{
            transform: `translate(${pin.point.x}px, ${pin.point.y}px) translate(-50%, -100%)`,
            zIndex: 32,
          }}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-orange-500 shadow-lg">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="mt-1 max-w-36 truncate rounded-md border border-white/10 bg-black/72 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg backdrop-blur">
            {pin.name}
          </span>
        </div>
      ))}

      {/* Back nav */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <Link
          href="/map"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-black/50 px-3 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/70"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Map
        </Link>

        {icpLabel && (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-orange-500/40 bg-black/50 px-3 text-xs font-semibold text-orange-400 backdrop-blur">
            {loading ? (
              <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8" r="4" fill="currentColor" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="currentColor" />
              </svg>
            )}
            {icpLabel}
          </span>
        )}
      </div>

      {selected && opportunities.length > 0 && (
        <div className="absolute bottom-5 left-1/2 z-30 w-[min(720px,calc(100vw-1rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-white/15 bg-black/72 shadow-2xl backdrop-blur-md">
          <div className="flex items-stretch gap-1 p-1.5">
            <button
              type="button"
              onClick={() => stepOpportunity(-1)}
              disabled={opportunities.length < 2}
              className="grid w-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white/70"
              aria-label="Previous option"
            >
              {"<"}
            </button>
            <OpportunitySummary
              opportunity={selected}
              index={selectedIndex}
              total={opportunities.length}
            />
            <button
              type="button"
              onClick={() => stepOpportunity(1)}
              disabled={opportunities.length < 2}
              className="grid w-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white/70"
              aria-label="Next option"
            >
              {">"}
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2">
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/42">
              {selected.area}
            </span>
            <Link
              href="/map?campaign=1"
              onClick={() => {
                if (selected) {
                  localStorage.setItem("orangeboard:campaign-blob", JSON.stringify(selected.polygon));
                  localStorage.setItem(
                    PEDESTRIAN_CONTEXT_STORAGE_KEY,
                    JSON.stringify(
                      buildCampaignPedestrianContext({
                        companyName: campaignBrief?.identity.companyName,
                        icp: campaignBrief?.audience.description,
                        opportunity: selected,
                      }),
                    ),
                  );
                }
              }}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-orange-500 px-3 text-xs font-semibold text-white transition hover:bg-orange-600"
            >
              Build Campaign
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function ratingLabel(score: number): string {
  if (score >= 90) return "Top fit";
  if (score >= 82) return "Strong";
  if (score >= 74) return "Good";
  return "Watch";
}

type OpportunityBusiness = Opportunity["matchedBusinesses"][number];

function opportunityBusinesses(opportunity: Opportunity, limit = 4): OpportunityBusiness[] {
  return (opportunity.matchedBusinesses ?? []).slice(0, limit);
}

function opportunitySignals(opportunity: Opportunity, limit = 3): string[] {
  const signals = opportunity.matchReasons?.length
    ? opportunity.matchReasons
    : [opportunity.kind, opportunity.timing, opportunity.icpFit].filter((value): value is string => Boolean(value));
  return signals.slice(0, limit);
}

function OpportunitySummary({
  opportunity,
  index,
  total,
}: {
  opportunity: Opportunity;
  index: number;
  total: number;
}) {
  const businesses = opportunityBusinesses(opportunity, 3);
  const signals = opportunitySignals(opportunity);
  const topReason = opportunity.matchReasons[0] ?? opportunity.icpFit;

  return (
    <div className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2.5 text-left" title={topReason}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/72">
              {index + 1}/{total}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-white/42">
              {ratingLabel(opportunity.score)}
            </span>
          </div>
          <h2 className="mt-1 truncate text-sm font-semibold text-white/92">
            {opportunity.title}
          </h2>
          <p className="mt-0.5 truncate text-[10px] text-white/40">
            {opportunity.accounts} acct &middot; {opportunity.events} evt &middot; {opportunity.placements} boards
          </p>
        </div>
        <span className="min-w-9 rounded-full bg-orange-400/15 px-2 py-1 text-center text-sm font-bold tabular-nums text-orange-200">
          {opportunity.score}
        </span>
      </div>

      <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-orange-400"
          style={{ width: `${Math.max(0, Math.min(100, opportunity.score))}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {signals.map((signal) => (
          <span
            key={signal}
            className="max-w-full truncate rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[9px] font-semibold text-white/55"
          >
            {signal}
          </span>
        ))}
      </div>

      {businesses.length > 0 && (
        <div className="mt-2 grid gap-1 sm:grid-cols-3">
          {businesses.map((business) => (
            <div
              key={`${opportunity.id}-${business.name}`}
              className="min-w-0 rounded-md border border-white/10 bg-black/18 px-2 py-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="truncate text-[11px] font-semibold text-white/82">
                  {business.name}
                </span>
                <span className="shrink-0 rounded bg-orange-400/15 px-1.5 py-0.5 text-[9px] font-bold text-orange-200">
                  ICP
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10px] text-white/45">
                {business.type}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
