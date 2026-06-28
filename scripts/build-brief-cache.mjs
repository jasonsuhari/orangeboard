// Precompute a company brief + high-quality billboard creative and cache it on
// disk, so that when a visitor types this URL the landing-page flow returns
// instantly (no live API calls). The cache uses the SLOW, high-quality image
// model (gpt-image-2); the live route uses a faster model.
//
// Usage:   node scripts/build-brief-cache.mjs [url]            (default: getfluent.tech)
// Reads:   OPENAI_API_KEY (+ optional OPENAI_BRIEF_MODEL, OPENAI_IMAGE_MODEL_CACHE) from .env.local
// Writes:  data/brief-cache/<host>.json   (brief incl. media)
//          public/brief-cache/<host>.png  (the creative, served at /brief-cache/<host>.png)

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── tiny .env.local loader (no dotenv dependency) ──────────────────────────
async function loadEnv() {
  try {
    const raw = await readFile(join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* no .env.local — rely on the ambient environment */
  }
}

function normalizeUrl(input) {
  const t = input.trim();
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  return new URL(withProto).toString();
}

function cacheKey(url) {
  return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "").toLowerCase();
}

// ── compact page-signal scrape (mirrors app/lib/companyBrief.ts) ───────────
async function extractPageSignals(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OrangeBoardBot/1.0)", Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();
  const head = html.slice(0, 12_000);

  const meta = (n) => {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${n}["'][^>]+content=["']([^"']+)["']`, "i");
    const m = head.match(re);
    return m ? m[1].trim() : "";
  };
  const title = (head.match(/<title[^>]*>([^<]+)<\/title>/i) || [, ""])[1].trim();

  const colorHints = [];
  for (const m of head.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const hex = `#${m[1].toUpperCase()}`;
    if (!colorHints.includes(hex)) colorHints.push(hex);
  }

  const bodyStart = html.indexOf("<body");
  const bodySlice = html.slice(bodyStart > 0 ? bodyStart : 12_000);
  const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();

  const headlines = [];
  for (const m of bodySlice.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)) {
    const t = strip(m[1]);
    if (t.length > 3 && t.length < 140 && !headlines.includes(t)) headlines.push(t);
  }
  const paragraphs = [];
  for (const m of bodySlice.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = strip(m[1]);
    if (t.length > 30 && t.length < 320 && !paragraphs.includes(t)) paragraphs.push(t);
    if (paragraphs.length >= 8) break;
  }

  return {
    url,
    title,
    metaDescription: meta("description"),
    ogTitle: meta("og:title"),
    ogDescription: meta("og:description"),
    themeColor: meta("theme-color"),
    keywords: meta("keywords"),
    colorHints: colorHints.slice(0, 20),
    headlines: headlines.slice(0, 6),
    bodyText: paragraphs.join(" ").slice(0, 700),
  };
}

// ── brief (mirrors BRIEF_SYSTEM / BRIEF_SCHEMA in app/lib/companyBrief.ts) ──
const BRIEF_SYSTEM = `You are a senior brand strategist and creative director at a top out-of-home agency. From raw signals scraped off a company's website, infer what the company actually does and write a sharp, specific billboard creative brief.

Rules:
- Use real judgement. Infer the industry, audience, and positioning from the evidence — do NOT just echo the scraped text back.
- Every field must be DISTINCT. Never reuse the company name as the tagline or core message.
- description: one concrete sentence on what the company does and for whom.
- brandAdjectives: three adjectives specific to THIS brand's voice (not generic filler).
- tagline: a real, punchy line. Max ~7 words.
- coreMessage: the single idea someone should remember 5 seconds after passing the billboard.
- callToAction: short and imperative (e.g. "Start free", "Book a demo").
- audience.description: a vivid one-line demographic + psychographic, specific to this product.
- styleReference: name a real brand whose art direction fits ("think Apple", "think Liquid Death").
- Pick primaryColor from the scraped brand colors when one clearly reads as the brand color; otherwise choose a fitting hex.

Output ONLY valid JSON matching the schema — no markdown fences, no commentary.`;

const BRIEF_SCHEMA = `{
  "identity": { "companyName": "string", "industry": "string", "description": "one sentence", "brandAdjectives": ["adj1","adj2","adj3"], "tagline": "string or null" },
  "visualSystem": { "primaryColor": "#RRGGBB or null", "secondaryColor": "#RRGGBB or null", "logoUrl": "absolute URL or null", "fonts": ["font name"], "styleReference": "e.g. think Apple", "avoidList": ["thing to avoid"] },
  "campaign": { "coreMessage": "the ONE thing this ad communicates", "offerOrHook": "string or null", "callToAction": "string", "campaignObjective": "awareness | conversion | foot-traffic | app-downloads" },
  "audience": { "description": "one sentence demographic + psychographic", "tone": "string", "contextWhenSeen": "driving | walking | scrolling | mixed" }
}`;

async function buildBrief(signals, apiKey) {
  const userMessage = [
    `URL: ${signals.url}`,
    `Title: ${signals.title}`,
    `Meta description: ${signals.metaDescription}`,
    `OG title: ${signals.ogTitle}`,
    `OG description: ${signals.ogDescription}`,
    `Theme color: ${signals.themeColor}`,
    `Keywords: ${signals.keywords}`,
    `Hex colors found: ${signals.colorHints.join(", ")}`,
    signals.headlines.length ? `Headlines: ${signals.headlines.join(" | ")}` : "",
    signals.bodyText ? `Body copy: ${signals.bodyText}` : "",
    "",
    `Return a JSON object that exactly matches this schema:\n${BRIEF_SCHEMA}`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_BRIEF_MODEL ?? "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BRIEF_SYSTEM },
        { role: "user", content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`brief failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return JSON.parse(json.choices[0]?.message?.content ?? "{}");
}

// ── creative prompt (mirrors app/lib/creative.ts buildCreativePrompt) ──────
function hexToColorName(hex) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "a deep brand color";
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2 / 255;
  const light = l < 0.2 ? "deep " : l < 0.4 ? "dark " : l > 0.85 ? "light " : "";
  if (max === min) return `${light}gray`;
  if (r > g && r > b) return g > b * 1.3 ? `${light}warm orange` : `${light}red`;
  if (g > r && g > b) return r > b * 1.1 ? `${light}yellow-green` : `${light}green`;
  if (b > r && b > g) return r > g * 1.1 ? `${light}purple` : `${light}blue`;
  return `${light}yellow`;
}

function buildCreativePrompt(brief) {
  const color = hexToColorName(brief.visualSystem?.primaryColor);
  const company = brief.identity.companyName;
  const desc = brief.identity.description || brief.identity.industry;
  const style = brief.visualSystem?.styleReference ?? "modern premium commercial";
  const tagline = brief.identity.tagline ? ` — "${brief.identity.tagline}"` : "";
  const cta = brief.campaign?.callToAction ? ` Energy of the CTA "${brief.campaign.callToAction}".` : "";
  const audience = brief.audience?.description || "the target audience";
  const avoid = brief.visualSystem?.avoidList?.length ? ` Do not show: ${brief.visualSystem.avoidList.join(", ")}.` : "";
  return [
    `Bold, striking 16:9 out-of-home billboard ad for ${company}${tagline}, ${desc}.`,
    `${style} visual style, dominated by a ${color} palette.`,
    `Scene evokes ${audience} — vivid and emotionally charged.${cta}${avoid}`,
    `No text or letters anywhere in the image; leave clean negative space for a later headline overlay.`,
  ].join(" ");
}

async function generateImage(prompt, apiKey, model) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, n: 1, size: "1536x1024", quality: "high" }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) throw new Error(`image (${model}) failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("image response had no b64_json");
  return Buffer.from(b64, "base64");
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  await loadEnv();
  const input = process.argv[2] || "getfluent.tech";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-...")) throw new Error("OPENAI_API_KEY missing in .env.local");

  const url = normalizeUrl(input);
  const key = cacheKey(url);
  console.log(`▸ Building cache for ${url}  (key: ${key})`);

  console.log("  · scraping site…");
  const signals = await extractPageSignals(url);

  console.log("  · writing brief (text model)…");
  const brief = await buildBrief(signals, apiKey);
  brief.url = url;

  const prompt = buildCreativePrompt(brief);
  const preferred = process.env.OPENAI_IMAGE_MODEL_CACHE ?? "gpt-image-2";
  let bytes, usedModel;
  try {
    console.log(`  · generating creative with ${preferred} (high quality, slow)…`);
    bytes = await generateImage(prompt, apiKey, preferred);
    usedModel = preferred;
  } catch (err) {
    console.warn(`    ${preferred} unavailable (${String(err).split("\n")[0]}); falling back to gpt-image-1`);
    bytes = await generateImage(prompt, apiKey, "gpt-image-1");
    usedModel = "gpt-image-1";
  }

  await mkdir(join(ROOT, "public", "brief-cache"), { recursive: true });
  await mkdir(join(ROOT, "data", "brief-cache"), { recursive: true });
  const imgPath = `/brief-cache/${key}.png`;
  await writeFile(join(ROOT, "public", "brief-cache", `${key}.png`), bytes);

  brief.media = { imageUrl: imgPath, prompt, source: "cache", model: usedModel };
  await writeFile(join(ROOT, "data", "brief-cache", `${key}.json`), JSON.stringify(brief, null, 2), "utf8");

  console.log(`✓ Cached ${brief.identity.companyName}`);
  console.log(`    data/brief-cache/${key}.json`);
  console.log(`    public${imgPath}  (${(bytes.length / 1024).toFixed(0)} KB, ${usedModel})`);
}

main().catch((err) => {
  console.error("✗ build-brief-cache failed:", err);
  process.exit(1);
});
