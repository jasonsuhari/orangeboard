// Scrapes the SF Planning "General Advertising Sign Program" (GASP) inventory —
// the city's authoritative list of every billboard / general advertising sign.
//
// Source: the public GASP map at https://sfplanninggis.org/gasp/ renders an
// ArcGIS layer that is token-gated at the REST endpoint, but the same site
// exposes an unauthenticated proxy that injects the token. We go through it.
//
//   Layer 0 = GASP_Records (point geometry, one per sign)  <-- what we want
//   Layer 1 = GASP_Relocation_Dissolve (polygons, ignored)
//
// Output (written to ../data):
//   sf-billboards.geojson  -> ready to drop on a Mapbox/Leaflet map
//   sf-billboards.csv      -> spreadsheet-friendly
//
// Usage:  node scripts/scrape-billboards.mjs

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { enrichGeoJson, toCSV } from "./billboard-buying-data.mjs";

const PROXY = "https://sfplanninggis.org/proxy/DotNet/proxy.ashx";
const LAYER =
  "https://sfplanninggis.org/arcgiswa/rest/services/GASP_Pro/MapServer/0";
const REFERER = "https://sfplanninggis.org/gasp/";
const PAGE = 200; // server maxRecordCount is typically 1000; stay polite

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");

// Date fields come back as epoch ms; surface them as ISO for humans.
const DATE_FIELDS = new Set([
  "date_opened",
  "record_status_date",
  "date_closed",
]);

async function arc(url) {
  const res = await fetch(`${PROXY}?${url}`, {
    headers: { Referer: REFERER },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = await res.json();
  if (json.error) throw new Error(`ArcGIS error: ${JSON.stringify(json.error)}`);
  return json;
}

async function getCount() {
  const j = await arc(
    `${LAYER}/query?where=1%3D1&returnCountOnly=true&f=json`
  );
  return j.count;
}

async function getPage(offset) {
  const q =
    `${LAYER}/query?where=1%3D1&outFields=*&returnGeometry=true` +
    `&outSR=4326&resultOffset=${offset}&resultRecordCount=${PAGE}&f=json`;
  const j = await arc(q);
  return j.features ?? [];
}

function cleanAttrs(a) {
  const out = {};
  for (const [k, v] of Object.entries(a)) {
    if (DATE_FIELDS.has(k) && typeof v === "number") {
      out[k] = new Date(v).toISOString().slice(0, 10);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function toGeoJSON(features) {
  return {
    type: "FeatureCollection",
    metadata: {
      source: "SF Planning General Advertising Sign Program (GASP)",
      endpoint: LAYER,
      scraped_at: new Date().toISOString(),
      count: features.length,
    },
    features: features
      .filter((f) => f.geometry && f.geometry.x != null)
      .map((f) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [f.geometry.x, f.geometry.y],
        },
        properties: cleanAttrs(f.attributes),
      })),
  };
}

async function main() {
  const total = await getCount();
  console.log(`GASP inventory: ${total} records. Fetching in pages of ${PAGE}…`);

  const all = [];
  for (let offset = 0; offset < total; offset += PAGE) {
    const page = await getPage(offset);
    all.push(...page);
    console.log(`  fetched ${all.length}/${total}`);
    if (page.length === 0) break;
  }

  const geojson = enrichGeoJson(toGeoJSON(all));
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    join(OUT_DIR, "sf-billboards.geojson"),
    JSON.stringify(geojson, null, 2)
  );
  await writeFile(join(OUT_DIR, "sf-billboards.csv"), toCSV(geojson));

  // Quick status breakdown so you can eyeball the data.
  const byStatus = {};
  for (const f of geojson.features) {
    const s = f.properties.record_status || "(none)";
    byStatus[s] = (byStatus[s] || 0) + 1;
  }
  console.log(`\nWrote ${geojson.features.length} signs with coordinates.`);
  console.log("By status:", byStatus);
  console.log(`Output: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
