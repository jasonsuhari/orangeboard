// Fetches SFMTA pedestrian volume counts from SF Open Data and writes
// a normalized 24-hour weight array per intersection to public/sf-ped-counts.json.
//
// Used by the traffic simulation to weight pedestrian agent spawning by
// actual foot-traffic density — intersections with higher observed counts
// get proportionally more agents, and counts scale with hour of day.
//
// Dataset: SFMTA Pedestrian Volume Counts (DataSF v74d-emmt)
// Usage:   node scripts/fetch-sf-ped-counts.mjs
// Output:  public/sf-ped-counts.json

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public");

// SF Open Data SODA API — no key required for public datasets
const DATASET_URL =
  "https://data.sfgov.org/resource/v74d-emmt.json?$limit=50000";

// Fallback dataset IDs to try if the primary 404s
const FALLBACK_URLS = [
  "https://data.sfgov.org/resource/uupn-yfaw.json?$limit=50000",
  "https://data.sfgov.org/resource/6s2j-tpxr.json?$limit=50000",
];

// Known SF pedestrian hotspots as hardcoded fallback when DataSF is unreachable.
// Weights are relative pedestrian density scores (not counts).
const HARDCODED_FALLBACK = [
  { lat: 37.7879, lng: -122.4075, label: "Union Square", weight: 1.00 },
  { lat: 37.7946, lng: -122.3999, label: "Ferry Building", weight: 0.90 },
  { lat: 37.7808, lng: -122.4110, label: "Powell St BART", weight: 0.95 },
  { lat: 37.7749, lng: -122.4194, label: "Civic Center", weight: 0.82 },
  { lat: 37.7838, lng: -122.4090, label: "Financial District", weight: 0.88 },
  { lat: 37.7653, lng: -122.4191, label: "Mission/16th St", weight: 0.75 },
  { lat: 37.7599, lng: -122.4148, label: "Mission/24th St", weight: 0.70 },
  { lat: 37.7701, lng: -122.4130, label: "SoMa/Market", weight: 0.72 },
  { lat: 37.8003, lng: -122.4089, label: "North Beach", weight: 0.65 },
  { lat: 37.7987, lng: -122.4094, label: "Chinatown/Grant Ave", weight: 0.78 },
  { lat: 37.7693, lng: -122.4496, label: "Haight/Ashbury", weight: 0.60 },
  { lat: 37.7625, lng: -122.4351, label: "Castro/Market", weight: 0.68 },
  { lat: 37.7869, lng: -122.4083, label: "Embarcadero", weight: 0.72 },
  { lat: 37.7830, lng: -122.4120, label: "Market/3rd St", weight: 0.85 },
  { lat: 37.7863, lng: -122.4007, label: "Rincon Hill", weight: 0.50 },
  { lat: 37.8042, lng: -122.4387, label: "Marina/Chestnut St", weight: 0.58 },
  { lat: 37.7956, lng: -122.4196, label: "Fillmore/Japantown", weight: 0.55 },
  { lat: 37.7831, lng: -122.4655, label: "Inner Sunset", weight: 0.45 },
  { lat: 37.7777, lng: -122.4620, label: "Inner Richmond", weight: 0.45 },
  { lat: 37.7220, lng: -122.4781, label: "Excelsior/Ocean Ave", weight: 0.42 },
];

// 24-hour pedestrian demand curve for SF (index 0 = midnight–1am)
const HOUR_MULTIPLIERS = [
  0.10, 0.05, 0.03, 0.03, 0.05, 0.20,
  0.60, 0.90, 1.00, 0.80, 0.70, 0.80,
  0.90, 0.80, 0.70, 0.70, 0.80, 1.00,
  0.90, 0.70, 0.60, 0.50, 0.30, 0.20,
];

async function tryFetch(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data;
}

function detectHourlyColumns(row) {
  // DataSF pedestrian datasets use various column naming conventions.
  // Try to detect which pattern this dataset uses.
  const keys = Object.keys(row);
  console.log("  Dataset columns:", keys.slice(0, 20).join(", "), keys.length > 20 ? "..." : "");

  // Pattern 1: hour_1 through hour_24 or h1_count through h24_count
  const hourCols = [];
  for (let h = 0; h < 24; h++) {
    const candidates = [
      `hour_${h + 1}`, `h${h + 1}_count`, `hour${h + 1}`,
      `ped_count_hour_${h + 1}`, `vol_hour_${h + 1}`,
    ];
    const found = candidates.find((c) => c in row);
    if (found) hourCols.push(found);
  }
  if (hourCols.length === 24) return { type: "columns", cols: hourCols };

  // Pattern 2: single count + time_period field (one row per time period)
  if ("count" in row && ("time_period" in row || "hour" in row || "period" in row)) {
    return { type: "rows" };
  }

  // Pattern 3: total_volume only (no hourly breakdown)
  if ("total_volume" in row || "total_count" in row || "volume" in row) {
    return { type: "total" };
  }

  return { type: "unknown" };
}

function extractLatLng(row) {
  const lat = parseFloat(row.latitude ?? row.lat ?? row.y_coord ?? row.y ?? "");
  const lng = parseFloat(row.longitude ?? row.lng ?? row.lon ?? row.x_coord ?? row.x ?? "");
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function processDataSF(rows) {
  if (rows.length === 0) return null;
  const pattern = detectHourlyColumns(rows[0]);
  console.log(`  Detected column pattern: ${pattern.type}`);

  // Group by rounded location
  const byLocation = new Map();

  for (const row of rows) {
    const pos = extractLatLng(row);
    if (!pos) continue;
    // Bound to SF
    if (pos.lat < 37.65 || pos.lat > 37.85 || pos.lng < -122.55 || pos.lng > -122.33) continue;

    const key = `${pos.lat.toFixed(4)},${pos.lng.toFixed(4)}`;
    if (!byLocation.has(key)) {
      byLocation.set(key, { lat: pos.lat, lng: pos.lng, samples: [] });
    }

    let hourly;
    if (pattern.type === "columns") {
      hourly = pattern.cols.map((c) => parseFloat(row[c]) || 0);
    } else if (pattern.type === "total") {
      const total = parseFloat(row.total_volume ?? row.total_count ?? row.volume ?? "0") || 0;
      // Distribute total by the hour multiplier curve
      hourly = HOUR_MULTIPLIERS.map((m) => total * m);
    } else {
      // Unknown pattern — use a flat count of 1 to indicate presence
      hourly = HOUR_MULTIPLIERS.map((m) => m);
    }

    byLocation.get(key).samples.push(hourly);
  }

  if (byLocation.size === 0) return null;

  // Average samples per location, find global max for normalization
  const locations = [];
  let globalMax = 0;

  for (const { lat, lng, samples } of byLocation.values()) {
    const mean = Array.from({ length: 24 }, (_, h) => {
      const sum = samples.reduce((s, arr) => s + (arr[h] ?? 0), 0);
      return sum / samples.length;
    });
    const locMax = Math.max(...mean);
    if (locMax > globalMax) globalMax = locMax;
    locations.push({ lat, lng, mean });
  }

  // Normalize 0-1
  return locations.map(({ lat, lng, mean }) => ({
    lat,
    lng,
    hourly: mean.map((v) => globalMax > 0 ? v / globalMax : 0),
  }));
}

function buildFromFallback() {
  console.log("  Using hardcoded SF pedestrian hotspots as fallback.");
  return HARDCODED_FALLBACK.map(({ lat, lng, weight }) => ({
    lat,
    lng,
    hourly: HOUR_MULTIPLIERS.map((m) => m * weight),
  }));
}

async function main() {
  console.log("Fetching SF pedestrian count data from DataSF…");

  let processed = null;

  // Try primary dataset, then fallbacks
  for (const url of [DATASET_URL, ...FALLBACK_URLS]) {
    console.log(`  Trying: ${url}`);
    const rows = await tryFetch(url).catch(() => null);
    if (!rows) {
      console.log("  → 404 or empty, trying next…");
      continue;
    }
    console.log(`  → Got ${rows.length} rows`);
    processed = processDataSF(rows);
    if (processed && processed.length > 0) break;
    console.log("  → Could not extract usable data, trying next…");
  }

  if (!processed || processed.length === 0) {
    console.log("DataSF unavailable or no usable data — using hardcoded fallback.");
    processed = buildFromFallback();
  }

  console.log(`\nProcessed ${processed.length} intersection weight entries.`);

  // Spot-check: highest weight at hour 8 (9am)
  const sorted = [...processed].sort((a, b) => b.hourly[8] - a.hourly[8]);
  console.log("Top 5 by 9am weight:");
  sorted.slice(0, 5).forEach((p) =>
    console.log(`  (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}) → ${p.hourly[8].toFixed(3)}`)
  );

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "sf-ped-counts.json");
  await writeFile(outPath, JSON.stringify(processed));
  console.log(`\nWrote ${outPath} (${processed.length} intersections)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
