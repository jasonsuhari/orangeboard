"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { Layer, Map as MapboxMap, NavigationControl, ScaleControl, Source, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const INITIAL_VIEW_STATE = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 17.2,
  pitch: 0,
  bearing: 0,
};

const NAIP_PLUS_TILE_URL =
  "https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=512,512&format=jpgpng&transparent=false&f=image";

type ChipStats = {
  vegetation: number;
  pavementRoof: number;
  shadow: number;
  edgeDensity: number;
  contrast: number;
};

type ChipProvider = "mapbox" | "naip";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function imageLoaded(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load imagery chip."));
    image.src = src;
  });
}

async function analyzeChip(src: string): Promise<ChipStats> {
  const image = await imageLoaded(src);
  const sampleSize = 256;
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not read imagery pixels.");

  context.drawImage(image, 0, 0, sampleSize, sampleSize);
  const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
  const gray = new Float32Array(sampleSize * sampleSize);
  let vegetation = 0;
  let pavementRoof = 0;
  let shadow = 0;
  let highContrast = 0;

  for (let i = 0; i < sampleSize * sampleSize; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const brightness = (r + g + b) / 3;
    const saturation = max === 0 ? 0 : (max - min) / max;
    gray[i] = brightness;

    if (g > r * 1.08 && g > b * 1.08 && saturation > 0.13 && brightness > 55) vegetation++;
    if (brightness > 75 && brightness < 205 && saturation < 0.18) pavementRoof++;
    if (brightness < 58) shadow++;
    if (saturation > 0.28 || brightness > 220 || brightness < 42) highContrast++;
  }

  let edges = 0;
  for (let y = 1; y < sampleSize - 1; y += 2) {
    for (let x = 1; x < sampleSize - 1; x += 2) {
      const i = y * sampleSize + x;
      const gx = Math.abs(gray[i + 1] - gray[i - 1]);
      const gy = Math.abs(gray[i + sampleSize] - gray[i - sampleSize]);
      if (gx + gy > 46) edges++;
    }
  }

  const pixels = sampleSize * sampleSize;
  const edgeSamples = ((sampleSize - 2) / 2) * ((sampleSize - 2) / 2);

  return {
    vegetation: vegetation / pixels,
    pavementRoof: pavementRoof / pixels,
    shadow: shadow / pixels,
    edgeDensity: edges / edgeSamples,
    contrast: highContrast / pixels,
  };
}

export default function ImageryLab() {
  const mapRef = useRef<MapRef | null>(null);
  const [naipOpacity, setNaipOpacity] = useState(0);
  const [chipMeters, setChipMeters] = useState(120);
  const [chipProvider, setChipProvider] = useState<ChipProvider>("mapbox");
  const [chipUrl, setChipUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<ChipStats | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const config = useMemo(
    () => ({
      basemap: {
        showPlaceLabels: true,
        showPointOfInterestLabels: false,
        showRoadLabels: true,
        showTransitLabels: false,
        showRoadsAndTransit: true,
        showPedestrianRoads: true,
        showAdminBoundaries: false,
        lightPreset: "day",
        show3dBuildings: true,
      },
    }),
    [],
  );

  const naipLayer = useMemo(
    () => ({
      id: "naip-plus-raster",
      type: "raster" as const,
      slot: "bottom",
      paint: {
        "raster-opacity": naipOpacity,
        "raster-resampling": "linear" as const,
      },
    }),
    [naipOpacity],
  );

  const captureChip = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const center = map.getCenter();
    const nextChipUrl = `/api/imagery-chip?provider=${chipProvider}&lon=${center.lng.toFixed(7)}&lat=${center.lat.toFixed(7)}&meters=${chipMeters}&size=1024&t=${Date.now()}`;

    setStatus("loading");
    setMessage(null);
    setStats(null);
    setChipUrl(nextChipUrl);

    try {
      const nextStats = await analyzeChip(nextChipUrl);
      setStats(nextStats);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Imagery analysis failed.");
    }
  }, [chipMeters, chipProvider]);

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
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle="mapbox://styles/mapbox/standard-satellite"
        config={config}
        maxPitch={85}
        style={{ position: "absolute", inset: 0 }}
      >
        <Source id="naip-plus" type="raster" tiles={[NAIP_PLUS_TILE_URL]} tileSize={512}>
          <Layer {...naipLayer} />
        </Source>
        <NavigationControl position="bottom-right" visualizePitch />
        <ScaleControl position="bottom-left" />
      </MapboxMap>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.08)]">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/50" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/50" />
      </div>

      <section className="absolute left-4 top-4 z-20 w-[min(390px,calc(100vw-32px))] rounded-lg border border-white/20 bg-black/65 p-3 text-white shadow-xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-bold leading-tight">Imagery Lab</h1>
            <p className="mt-0.5 text-xs text-white/60">Mapbox high-zoom chip with optional NAIP overlay</p>
          </div>
          <Link href="/satellite" className="rounded-md border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10">
            Satellite
          </Link>
        </div>

        <label className="block text-xs font-semibold text-white/70">
          Free NAIP overlay
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={naipOpacity}
            onChange={(event) => setNaipOpacity(Number(event.target.value))}
            className="mt-2 w-full accent-white"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-white/70">
            Analysis source
            <select
              value={chipProvider}
              onChange={(event) => setChipProvider(event.target.value as ChipProvider)}
              className="mt-2 h-9 w-full rounded-md border border-white/20 bg-black/60 px-2 text-sm font-semibold text-white outline-none"
            >
              <option value="mapbox">Mapbox satellite HD</option>
              <option value="naip">USGS NAIP free</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-white/70">
            Chip radius
            <select
              value={chipMeters}
              onChange={(event) => setChipMeters(Number(event.target.value))}
              className="mt-2 h-9 w-full rounded-md border border-white/20 bg-black/60 px-2 text-sm font-semibold text-white outline-none"
            >
              <option value={60}>60 m</option>
              <option value={120}>120 m</option>
              <option value={240}>240 m</option>
              <option value={500}>500 m</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
          <p className="text-xs leading-5 text-white/50">
            Nearmap/Vexcel will need provider keys for true 4-7.5 cm aerial.
          </p>
          <button
            type="button"
            onClick={captureChip}
            disabled={status === "loading"}
            className="h-9 rounded-md bg-white px-3 text-xs font-bold text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60"
          >
            {status === "loading" ? "Analyzing" : "Analyze chip"}
          </button>
        </div>
      </section>

      <section className="absolute bottom-4 right-4 z-20 w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-lg border border-white/20 bg-black/70 text-white shadow-xl backdrop-blur">
        <div className="grid grid-cols-[140px_1fr]">
          <div className="aspect-square bg-neutral-900">
            {chipUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={chipUrl} alt="Selected aerial imagery chip" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center px-4 text-center text-xs font-semibold text-white/45">
                Center chip
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">CV Pass</h2>
              <span className="text-xs font-semibold text-white/45">{status === "done" ? "ready" : status}</span>
            </div>
            {stats ? (
              <div className="grid gap-2 text-xs">
                <Metric label="Vegetation" value={stats.vegetation} />
                <Metric label="Pavement/roof" value={stats.pavementRoof} />
                <Metric label="Shadow" value={stats.shadow} />
                <Metric label="Edges" value={stats.edgeDensity} />
                <Metric label="Contrast" value={stats.contrast} />
              </div>
            ) : (
              <p className="text-sm leading-5 text-white/55">
                {message ?? "Move the map, center a site, then analyze a same-origin imagery chip."}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[92px_1fr_42px] items-center gap-2">
      <div className="truncate font-semibold text-white/70">{label}</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-white" style={{ width: percent(value) }} />
      </div>
      <div className="text-right font-bold tabular-nums text-white">{percent(value)}</div>
    </div>
  );
}
