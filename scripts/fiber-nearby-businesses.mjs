/**
 * For every SF billboard, call Fiber AI's Google Maps Search to find
 * businesses physically nearby (within ~0.15 miles), then save results to
 * data/billboard-fiber-businesses.json.
 *
 * Async flow:  start → poll until done → store results
 * Resumable:   already-processed billboard IDs are skipped on re-run.
 * Credit math: ~3 credits per business found × 3 results × 559 billboards ≈ 5,000 credits
 *
 * Usage:
 *   node --env-file=.env.local scripts/fiber-nearby-businesses.mjs
 *   # or:
 *   FIBER_API_KEY=<key> node scripts/fiber-nearby-businesses.mjs
 *
 * Options (env vars):
 *   MAX_RESULTS=3         max businesses per billboard (default 3)
 *   RADIUS_MILES=0.15     search radius in miles (default 0.15)
 *   SEARCH_QUERY=business Google Maps query term (default "business")
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BILLBOARDS_PATH = join(__dirname, "..", "public", "sf-billboards.geojson");
const OUT_DIR = join(__dirname, "..", "data");
const OUT_PATH = join(OUT_DIR, "billboard-fiber-businesses.json");

const FIBER_BASE = "https://api.fiber.ai";
const MAX_RESULTS = Number(process.env.MAX_RESULTS ?? 3);
const RADIUS_MILES = Number(process.env.RADIUS_MILES ?? 0.15);
const SEARCH_QUERY = process.env.SEARCH_QUERY ?? "business";

const POLL_INTERVAL_MS = 5000;  // 5s between poll attempts
const POLL_TIMEOUT_MS = 90_000; // give up after 90s per billboard
const START_DELAY_MS = 800;     // delay between starting new searches

async function fiberPost(apiKey, path, body) {
  const res = await fetch(`${FIBER_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, ...body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fiber ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function startSearch(apiKey, lat, lng) {
  const json = await fiberPost(apiKey, "/v1/google-maps-search/start", {
    query: SEARCH_QUERY,
    maxResults: MAX_RESULTS,
    strategy: {
      strategy: "specific-areas",
      unionAll: [
        {
          regionType: "circle",
          center: { latitude: lat, longitude: lng },
          radiusMiles: RADIUS_MILES,
        },
      ],
    },
  });
  // Response contains the searchID to track this job
  return json.output?.searchID ?? json.searchID ?? json.output?.id ?? json.id;
}

async function checkSearch(apiKey, searchID) {
  const res = await fetch(`${FIBER_BASE}/v1/google-maps-search/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, searchID }),
  });
  // Non-200 during processing is normal — just return the body as-is
  return res.json();
}

async function pollResults(apiKey, searchID) {
  const json = await fiberPost(apiKey, "/v1/google-maps-search/poll", {
    searchID,
    pageSize: MAX_RESULTS,
  });
  return json.output?.results ?? json.results ?? json.output?.data ?? [];
}

async function waitForResults(apiKey, searchID) {
  // The check endpoint returns errors while the job runs, so we skip it and
  // poll directly — poll returns results as soon as they're ready.
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const businesses = await pollResults(apiKey, searchID);
    if (businesses.length > 0) return businesses;
  }
  return []; // timed out with no results
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const apiKey = process.env.FIBER_API_KEY;
  if (!apiKey) {
    console.error("FIBER_API_KEY not set. Run with: node --env-file=.env.local scripts/fiber-nearby-businesses.mjs");
    process.exit(1);
  }

  const geojson = JSON.parse(await readFile(BILLBOARDS_PATH, "utf8"));
  const features = geojson.features ?? [];
  console.log(`Loaded ${features.length} billboards`);
  console.log(`Settings: query="${SEARCH_QUERY}", maxResults=${MAX_RESULTS}, radius=${RADIUS_MILES} miles`);
  console.log(`Est. max credits: ${features.length} × ${MAX_RESULTS} × 3 = ${features.length * MAX_RESULTS * 3}`);

  let existing = { generated_at: null, billboards: {} };
  if (existsSync(OUT_PATH)) {
    try {
      existing = JSON.parse(await readFile(OUT_PATH, "utf8"));
      const done = Object.keys(existing.billboards).length;
      console.log(`Resuming — ${done} done, ${features.length - done} remaining\n`);
    } catch {
      console.warn("Could not parse existing output, starting fresh\n");
    }
  }

  await mkdir(OUT_DIR, { recursive: true });

  let processed = 0, skipped = 0, errors = 0;

  for (const feature of features) {
    const id = String(feature.properties?.record_id ?? feature.properties?.OBJECTID ?? "");
    const address = feature.properties?.address ?? "";
    const [lng, lat] = feature.geometry.coordinates;
    const total = features.length;
    const n = processed + skipped + errors + 1;

    if (existing.billboards[id]) {
      skipped++;
      continue;
    }

    process.stdout.write(`[${n}/${total}] ${address} … `);

    try {
      const searchID = await startSearch(apiKey, lat, lng);
      if (!searchID) throw new Error("No searchID in start response");

      const businesses = await waitForResults(apiKey, searchID);

      existing.billboards[id] = {
        record_id: id,
        address,
        lng,
        lat,
        search_query: SEARCH_QUERY,
        radius_miles: RADIUS_MILES,
        businesses,
        fetched_at: new Date().toISOString(),
      };

      process.stdout.write(`${businesses.length} businesses\n`);
      processed++;

      existing.generated_at = new Date().toISOString();
      await writeFile(OUT_PATH, JSON.stringify(existing, null, 2));
    } catch (err) {
      process.stdout.write(`ERROR: ${err.message}\n`);
      errors++;
    }

    await sleep(START_DELAY_MS);
  }

  console.log(`\nDone. Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`);
  console.log(`Output: ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
