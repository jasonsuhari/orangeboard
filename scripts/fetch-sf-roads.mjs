// Fetches the SF road and pedestrian path network from Overpass (OpenStreetMap)
// and writes it to public/sf-roads.geojson for use by the traffic simulation.
//
// Two feature classes are included:
//   type="vehicle"    — primary, secondary, tertiary, residential, trunk roads
//   type="pedestrian" — footway, pedestrian, path ways
//
// Usage:  node scripts/fetch-sf-roads.mjs
// Output: public/sf-roads.geojson (~3-8 MB, 8k-25k features)

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public");

// Try multiple public Overpass mirrors in order
const OVERPASS_MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
// SF bounding box (S,W,N,E — Overpass order)
const BBOX = "37.70,-122.52,37.82,-122.35";

const SPEED_BY_HIGHWAY = {
  trunk: 1.4,
  primary: 1.2,
  secondary: 1.0,
  tertiary: 0.85,
  residential: 0.65,
  footway: 1.0,
  pedestrian: 0.9,
  path: 0.8,
};

// Use `out geom` to get inline coordinates — avoids a second node-resolution pass.
const QUERY = `
[out:json][timeout:90];
(
  way["highway"~"^(trunk|primary|secondary|tertiary|residential)$"](${BBOX});
  way["highway"~"^(footway|pedestrian|path)$"](${BBOX});
);
out geom;
`.trim();

async function fetchOverpass() {
  const body = `data=${encodeURIComponent(QUERY)}`;
  let lastErr;
  for (const mirror of OVERPASS_MIRRORS) {
    console.log(`Querying Overpass at ${mirror}…`);
    try {
      const res = await fetch(mirror, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": "orangeboard-sf-sim/1.0 (build script)",
        },
        body,
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} from ${mirror}`);
        console.log(`  → ${res.status}, trying next mirror…`);
        continue;
      }
      return res.json();
    } catch (e) {
      lastErr = e;
      console.log(`  → Error: ${e.message}, trying next mirror…`);
    }
  }
  throw lastErr ?? new Error("All Overpass mirrors failed");
}

function classifyHighway(highway) {
  if (["trunk", "primary", "secondary", "tertiary", "residential"].includes(highway)) {
    return "vehicle";
  }
  return "pedestrian";
}

function roundCoord(n) {
  return Math.round(n * 100000) / 100000; // 5 decimal places ≈ 1m precision
}

function buildGeoJSON(data) {
  const features = [];
  let vehicleCount = 0;
  let pedestrianCount = 0;

  for (const el of data.elements) {
    if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
    const highway = el.tags?.highway;
    if (!highway) continue;

    const type = classifyHighway(highway);
    const speedMult = SPEED_BY_HIGHWAY[highway] ?? 1.0;

    // GeoJSON coordinate order is [lng, lat]
    const coords = el.geometry.map((pt) => [roundCoord(pt.lon), roundCoord(pt.lat)]);

    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: { type, highway, speedMult },
    });

    if (type === "vehicle") vehicleCount++;
    else pedestrianCount++;
  }

  return {
    type: "FeatureCollection",
    metadata: {
      source: "OpenStreetMap via Overpass API",
      bbox: `SF: ${BBOX}`,
      fetched_at: new Date().toISOString(),
      vehicle_count: vehicleCount,
      pedestrian_count: pedestrianCount,
      total_count: features.length,
    },
    features,
  };
}

async function main() {
  const data = await fetchOverpass();
  console.log(`Received ${data.elements.length} OSM elements. Processing…`);

  const geojson = buildGeoJSON(data);
  console.log(
    `  vehicle segments: ${geojson.metadata.vehicle_count}`,
    `\n  pedestrian segments: ${geojson.metadata.pedestrian_count}`,
    `\n  total: ${geojson.metadata.total_count}`
  );

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "sf-roads.geojson");
  await writeFile(outPath, JSON.stringify(geojson));
  const kb = Math.round(JSON.stringify(geojson).length / 1024);
  console.log(`\nWrote ${outPath} (${kb} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
