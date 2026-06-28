import { promises as fs } from "fs";
import path from "path";
import type { CompanyBrief } from "./types";
import { normalizeUrl } from "./companyBrief";

/* ──────────────────────────────────────────────────────────────────────────
   Local brief cache.

   Some sites are worth precomputing — the brief is written by a model and the
   billboard creative is generated with the slow, high-quality image model
   (gpt-image-2). We store the whole thing on disk so that when a visitor types
   that URL the flow returns instantly with no API calls.

   - JSON brief (incl. media):  data/brief-cache/<host>.json
   - Generated image (binary):  public/brief-cache/<host>.png  → /brief-cache/<host>.png
   ────────────────────────────────────────────────────────────────────────── */

const CACHE_DIR = path.join(process.cwd(), "data", "brief-cache");
const PUBLIC_IMAGE_DIR = path.join(process.cwd(), "public", "brief-cache");

/** Stable cache key for a URL — bare hostname, no scheme / www / trailing slash. */
export function cacheKeyForUrl(input: string): string {
  let host: string;
  try {
    host = new URL(normalizeUrl(input)).hostname;
  } catch {
    host = input.trim().toLowerCase();
  }
  return host.replace(/^www\./, "").toLowerCase();
}

/** Public web path for a cached image, e.g. "/brief-cache/getfluent.tech.png". */
export function cacheImagePath(key: string): string {
  return `/brief-cache/${key}.png`;
}

/** Read a precomputed brief for this URL, or null if none is cached. */
export async function readCachedBrief(url: string): Promise<CompanyBrief | null> {
  const key = cacheKeyForUrl(url);
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${key}.json`), "utf8");
    return JSON.parse(raw) as CompanyBrief;
  } catch {
    return null;
  }
}

/** Persist a brief's JSON. The image is written separately by writeCachedImage. */
export async function writeCachedBrief(brief: CompanyBrief): Promise<void> {
  const key = cacheKeyForUrl(brief.url);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(brief, null, 2), "utf8");
}

/** Write PNG bytes for a cached creative and return its public web path. */
export async function writeCachedImage(key: string, pngBytes: Buffer): Promise<string> {
  await fs.mkdir(PUBLIC_IMAGE_DIR, { recursive: true });
  await fs.writeFile(path.join(PUBLIC_IMAGE_DIR, `${key}.png`), pngBytes);
  return cacheImagePath(key);
}
