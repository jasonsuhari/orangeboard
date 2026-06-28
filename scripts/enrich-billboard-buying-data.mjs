// Adds estimated buying fields to the existing SF GASP billboard inventory.
//
// Usage: node scripts/enrich-billboard-buying-data.mjs

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { enrichGeoJson, toCSV } from "./billboard-buying-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_GEOJSON = join(ROOT, "data", "sf-billboards.geojson");
const PUBLIC_GEOJSON = join(ROOT, "public", "sf-billboards.geojson");
const DATA_CSV = join(ROOT, "data", "sf-billboards.csv");

async function main() {
  const raw = await readFile(DATA_GEOJSON, "utf8");
  const geojson = enrichGeoJson(JSON.parse(raw));
  const json = `${JSON.stringify(geojson, null, 2)}\n`;
  await writeFile(DATA_GEOJSON, json);
  await writeFile(PUBLIC_GEOJSON, json);
  await writeFile(DATA_CSV, toCSV(geojson));

  console.log(`Enriched ${geojson.features?.length ?? 0} billboards with buying data.`);
  console.log(`Updated ${DATA_GEOJSON}`);
  console.log(`Updated ${PUBLIC_GEOJSON}`);
  console.log(`Updated ${DATA_CSV}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
