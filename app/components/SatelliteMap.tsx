"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Map as MapboxMap, NavigationControl, ScaleControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const INITIAL_VIEW_STATE = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 14.5,
  pitch: 58,
  bearing: -28,
};

type BasemapMode = "satellite" | "standard";

export default function SatelliteMap() {
  const [mode, setMode] = useState<BasemapMode>("satellite");
  const [showLabels, setShowLabels] = useState(true);

  const mapStyle = mode === "satellite"
    ? "mapbox://styles/mapbox/standard-satellite"
    : "mapbox://styles/mapbox/standard";

  const config = useMemo(
    () => ({
      basemap: {
        showPlaceLabels: showLabels,
        showPointOfInterestLabels: showLabels,
        showRoadLabels: showLabels,
        showTransitLabels: showLabels,
        showRoadsAndTransit: showLabels,
        showPedestrianRoads: showLabels,
        showAdminBoundaries: showLabels,
        lightPreset: "day",
        show3dBuildings: true,
        show3dObjects: true,
        show3dLandmarks: true,
        show3dTrees: true,
      },
    }),
    [showLabels],
  );

  if (!TOKEN) {
    return (
      <main className="fixed inset-0 grid place-items-center bg-neutral-950 p-6 text-white">
        <div className="max-w-md rounded-lg border border-white/15 bg-white/10 p-4 text-sm leading-6">
          Missing Mapbox token. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local and restart the dev server.
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-black">
      <MapboxMap
        mapboxAccessToken={TOKEN}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={mapStyle}
        config={config}
        maxPitch={85}
        style={{ position: "absolute", inset: 0 }}
      >
        <NavigationControl position="bottom-right" visualizePitch />
        <ScaleControl position="bottom-left" />
      </MapboxMap>

      <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-white/20 bg-black/55 p-2 text-xs font-semibold text-white shadow-xl backdrop-blur">
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-white/20">
          <button
            type="button"
            onClick={() => setMode("satellite")}
            className={`h-9 px-3 ${mode === "satellite" ? "bg-white text-black" : "bg-transparent text-white hover:bg-white/10"}`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setMode("standard")}
            className={`h-9 px-3 ${mode === "standard" ? "bg-white text-black" : "bg-transparent text-white hover:bg-white/10"}`}
          >
            Standard
          </button>
        </div>

        <label className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 px-3">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(event) => setShowLabels(event.target.checked)}
            className="h-3.5 w-3.5 accent-white"
          />
          Labels
        </label>

        <Link
          href="/map"
          className="inline-flex h-9 items-center rounded-md border border-white/20 px-3 text-white hover:bg-white/10"
        >
          Main map
        </Link>
        <Link
          href="/imagery-lab"
          className="inline-flex h-9 items-center rounded-md border border-white/20 px-3 text-white hover:bg-white/10"
        >
          Imagery lab
        </Link>
      </div>
    </main>
  );
}
