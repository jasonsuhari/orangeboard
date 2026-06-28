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

const BRAND_COLOR_CONTEXT =
  /\b(accent|acid|brand|primary|secondary|cta|button|btn|link|hover|focus|active|selected|highlight|hero|gradient|glow|pill|badge|mark|underline|selection)\b/i;
const MUTED_COLOR_CONTEXT = /\b(transparent|shadow|ring|border|line|divider|overlay|backdrop|disabled|placeholder)\b/i;

function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function toHex(r, g, b) {
  return `#${[r, g, b].map((v) => clamp255(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function normalizeHexColor(raw) {
  const h = raw.replace("#", "").trim();
  if (![3, 4, 6, 8].includes(h.length) || !/^[0-9a-fA-F]+$/.test(h)) return null;
  let rgb = h;
  let alpha = 1;
  if (h.length === 3 || h.length === 4) {
    rgb = h
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
    if (h.length === 4) alpha = parseInt(h[3] + h[3], 16) / 255;
  } else if (h.length === 8) {
    rgb = h.slice(0, 6);
    alpha = parseInt(h.slice(6, 8), 16) / 255;
  }
  if (alpha <= 0.02) return null;
  return { hex: `#${rgb.toUpperCase()}`, alpha };
}

function parseCssChannel(value) {
  const v = value.trim();
  if (!v) return null;
  if (v.endsWith("%")) {
    const pct = Number.parseFloat(v);
    return Number.isFinite(pct) ? clamp255((pct / 100) * 255) : null;
  }
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? clamp255(n) : null;
}

function parseCssAlpha(value) {
  if (!value) return 1;
  const v = value.trim();
  if (v.endsWith("%")) {
    const pct = Number.parseFloat(v);
    return Number.isFinite(pct) ? Math.max(0, Math.min(1, pct / 100)) : 1;
  }
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

function parseRgbColor(raw) {
  const body = raw.replace(/^rgba?\(/i, "").replace(/\)$/i, "").replace(/\s*\/\s*/, " / ");
  const parts = body.includes(",") ? body.split(/\s*,\s*/) : body.trim().split(/\s+/);
  const slash = parts.indexOf("/");
  const channels = slash >= 0 ? parts.slice(0, slash) : parts.slice(0, 3);
  const alphaPart = slash >= 0 ? parts[slash + 1] : parts[3];
  if (channels.length < 3 || channels.some((part) => /^var\(/i.test(part))) return null;
  const r = parseCssChannel(channels[0]);
  const g = parseCssChannel(channels[1]);
  const b = parseCssChannel(channels[2]);
  const alpha = parseCssAlpha(alphaPart);
  if (r === null || g === null || b === null || alpha <= 0.02) return null;
  return { hex: toHex(r, g, b), alpha };
}

function parseHslColor(raw) {
  const body = raw.replace(/^hsla?\(/i, "").replace(/\)$/i, "").replace(/\s*\/\s*/, " / ");
  const parts = body.includes(",") ? body.split(/\s*,\s*/) : body.trim().split(/\s+/);
  const slash = parts.indexOf("/");
  const channels = slash >= 0 ? parts.slice(0, slash) : parts.slice(0, 3);
  const alphaPart = slash >= 0 ? parts[slash + 1] : parts[3];
  if (channels.length < 3 || channels.some((part) => /^var\(/i.test(part))) return null;
  const h = Number.parseFloat(channels[0]);
  const s = Number.parseFloat(channels[1]) / 100;
  const l = Number.parseFloat(channels[2]) / 100;
  const alpha = parseCssAlpha(alphaPart);
  if (![h, s, l].every(Number.isFinite) || alpha <= 0.02) return null;

  const hueToRgb = (p, q, t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };

  const hue = (((h % 360) + 360) % 360) / 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, hue + 1 / 3);
    g = hueToRgb(p, q, hue);
    b = hueToRgb(p, q, hue - 1 / 3);
  }
  return { hex: toHex(r * 255, g * 255, b * 255), alpha };
}

function parseCssColor(raw) {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("#")) return normalizeHexColor(value);
  if (/^rgba?\(/i.test(value)) return parseRgbColor(value);
  if (/^hsla?\(/i.test(value)) return parseHslColor(value);
  return null;
}

function colorMetrics(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness = (max + min) / 510;
  return {
    saturation,
    lightness,
    neutral: max - min <= 10 || saturation < 0.08 || lightness <= 0.06 || lightness >= 0.97,
  };
}

function contextWeight(text, index, baseWeight) {
  const context = text.slice(Math.max(0, index - 90), Math.min(text.length, index + 90));
  let weight = baseWeight;
  if (BRAND_COLOR_CONTEXT.test(context)) weight += 4;
  if (/\b(button|btn|cta|call-to-action|subscribe|signup|sign-up|buy|book|demo)\b/i.test(context)) weight += 3;
  if (/@supports|color-mix|rgb\(from|lab\(/i.test(context)) weight *= 0.02;
  if (
    /--color-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/i.test(context) ||
    /\b(?:bg|text|border|ring|outline|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/i.test(context)
  ) {
    weight *= 0.04;
  }
  if (/\b(--tw-|tailwind|shadow|ring-offset)\b/i.test(context)) weight *= 0.45;
  if (MUTED_COLOR_CONTEXT.test(context) && !BRAND_COLOR_CONTEXT.test(context)) weight *= 0.65;
  return weight;
}

function addColorHit(stats, parsed, weight, firstSeen) {
  if (!parsed) return;
  const metrics = colorMetrics(parsed.hex);
  const alphaWeight = parsed.alpha < 0.95 ? 0.35 + parsed.alpha * 0.65 : 1;
  const colorWeight = metrics.neutral ? 0.28 : 1 + metrics.saturation * 0.45;
  const adjustedWeight = weight * alphaWeight * colorWeight;
  const existing = stats.get(parsed.hex);
  if (existing) {
    existing.count += 1;
    existing.weight += adjustedWeight;
    existing.firstSeen = Math.min(existing.firstSeen, firstSeen);
  } else {
    stats.set(parsed.hex, { hex: parsed.hex, count: 1, firstSeen, weight: adjustedWeight });
  }
}

function collectColorHintsFromText(text, stats, baseWeight, orderOffset = 0) {
  const slice = text.slice(0, 220_000);
  for (const m of slice.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    if (m.index > 0 && slice[m.index - 1] === "&") continue;
    addColorHit(stats, normalizeHexColor(m[0]), contextWeight(slice, m.index, baseWeight), orderOffset + m.index);
  }
  for (const m of slice.matchAll(/rgba?\(\s*[^)]+\)/gi)) {
    addColorHit(stats, parseRgbColor(m[0]), contextWeight(slice, m.index, baseWeight), orderOffset + m.index);
  }
  for (const m of slice.matchAll(/hsla?\(\s*[^)]+\)/gi)) {
    addColorHit(stats, parseHslColor(m[0]), contextWeight(slice, m.index, baseWeight), orderOffset + m.index);
  }
}

function rankedColorHints(stats) {
  return [...stats.values()]
    .filter((s) => s.weight >= 0.35)
    .sort((a, b) => b.weight - a.weight || b.count - a.count || a.firstSeen - b.firstSeen)
    .map((s) => s.hex);
}

function stylesheetUrls(head, base) {
  const urls = [];
  for (const m of head.matchAll(/<link[^>]+>/gi)) {
    const tag = m[0];
    if (!/\bstylesheet\b/i.test(tag)) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      const absolute = new URL(href, base).toString();
      if (!urls.includes(absolute)) urls.push(absolute);
    } catch {
      // Ignore malformed stylesheet URLs.
    }
  }
  return urls.slice(0, 5);
}

async function fetchStylesheetText(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrangeBoardBot/1.0)", Accept: "text/css,*/*;q=0.8" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return "";
    return (await res.text()).slice(0, 180_000);
  } catch {
    return "";
  }
}

function validHexColor(hex) {
  return hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : undefined;
}

function brandColorScore(hex, index) {
  const metrics = colorMetrics(hex);
  const lightnessFit = metrics.lightness > 0.11 && metrics.lightness < 0.94 ? 1 : 0.25;
  const orderBonus = Math.max(0, 24 - index) * 0.03;
  return metrics.saturation * lightnessFit + orderBonus - (metrics.neutral ? 0.75 : 0);
}

function colorDistance(a, b) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2) / 441.7;
}

function pickBrandColor(colors, themeColor) {
  const theme = validHexColor(parseCssColor(themeColor)?.hex ?? themeColor);
  const scored = colors
    .map(validHexColor)
    .filter(Boolean)
    .map((hex, index) => ({ hex, score: brandColorScore(hex, index) }))
    .sort((a, b) => b.score - a.score);
  const distinctive = scored.find((candidate) => !colorMetrics(candidate.hex).neutral && candidate.score > 0.2)?.hex;
  if (theme && !colorMetrics(theme).neutral) return theme;
  if (distinctive) return distinctive;
  return theme ?? scored[0]?.hex ?? colors.map(validHexColor).find(Boolean);
}

function pickSecondaryBrandColor(colors, primary) {
  const candidates = colors.map(validHexColor).filter(Boolean).filter((hex) => hex !== primary);
  if (!candidates.length) return undefined;
  if (!primary) return candidates[0];
  const distinct = candidates.filter((hex) => colorDistance(hex, primary) > 0.18);
  const baseNeutral = distinct.find((hex) => {
    const metrics = colorMetrics(hex);
    return metrics.neutral && metrics.lightness > 0.02 && metrics.lightness < 0.96;
  });
  return baseNeutral ?? distinct.find((hex) => !colorMetrics(hex).neutral) ?? distinct[0] ?? candidates[0];
}

function pickAccentColors(colors, primary, secondary) {
  const used = new Set([primary, secondary].filter(Boolean));
  return colors
    .map(validHexColor)
    .filter(Boolean)
    .filter((hex) => !used.has(hex) && !colorMetrics(hex).neutral)
    .filter((hex, index, arr) => arr.findIndex((other) => colorDistance(hex, other) < 0.08) === index)
    .slice(0, 4);
}

function normalizeBriefColors(brief, signals) {
  brief.visualSystem ??= {};
  const inferredPrimary = pickBrandColor(signals.colorHints, signals.themeColor);
  const modelPrimary = validHexColor(brief.visualSystem.primaryColor);
  const shouldOverridePrimary =
    !modelPrimary ||
    Boolean(
      inferredPrimary &&
        modelPrimary !== inferredPrimary &&
        colorMetrics(modelPrimary).neutral &&
        !colorMetrics(inferredPrimary).neutral,
    );
  brief.visualSystem.primaryColor = shouldOverridePrimary ? inferredPrimary ?? "#F97316" : modelPrimary;
  const primary = brief.visualSystem.primaryColor;
  const modelSecondary = validHexColor(brief.visualSystem.secondaryColor);
  brief.visualSystem.secondaryColor =
    modelSecondary && modelSecondary !== primary ? modelSecondary : pickSecondaryBrandColor(signals.colorHints, primary);
  brief.visualSystem.accentColors = [
    ...new Set([
      ...(brief.visualSystem.accentColors ?? []).map(validHexColor).filter(Boolean),
      ...pickAccentColors(signals.colorHints, primary, brief.visualSystem.secondaryColor),
    ]),
  ].slice(0, 4);
}

// ── compact page-signal scrape (mirrors app/lib/companyBrief.ts) ───────────
async function extractPageSignals(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OrangeBoardBot/1.0)", Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();
  const headEnd = html.search(/<\/head>/i);
  const head = html.slice(0, headEnd > 0 ? Math.min(headEnd + 7, 100_000) : 40_000);
  const base = new URL(url);

  const meta = (n) => {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${n}["'][^>]+content=["']([^"']+)["']`, "i");
    const m = head.match(re);
    return m ? m[1].trim() : "";
  };
  const title = (head.match(/<title[^>]*>([^<]+)<\/title>/i) || [, ""])[1].trim();

  const themeColor = meta("theme-color");
  const colorStats = new Map();
  addColorHit(colorStats, parseCssColor(themeColor), 12, -1);
  collectColorHintsFromText(head, colorStats, 1.2);
  const stylesheetTextsPromise = Promise.all(stylesheetUrls(head, base).map(fetchStylesheetText));

  const bodyStart = html.indexOf("<body");
  const bodySlice = html.slice(bodyStart > 0 ? bodyStart : 12_000);
  collectColorHintsFromText(bodySlice, colorStats, 0.9, head.length);
  const stylesheetTexts = await stylesheetTextsPromise;
  stylesheetTexts.forEach((css, index) => {
    if (css) collectColorHintsFromText(css, colorStats, 1.6, (index + 1) * 500_000);
  });
  const colorHints = rankedColorHints(colorStats);
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
    themeColor,
    keywords: meta("keywords"),
    colorHints: colorHints.slice(0, 24),
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
- Pick colors from the ranked brand color candidates. The first candidates are strongest.
- Do not make black, white, or gray the primaryColor when the site has a distinctive CTA/button/link/highlight accent. In that case use the distinctive accent as primaryColor and put the dark/light base in secondaryColor.
- Use accentColors for additional distinctive brand accents from buttons, links, gradients, highlights, or product UI. Do not include transparent shadows, borders, or generic grays.

Output ONLY valid JSON matching the schema — no markdown fences, no commentary.`;

const BRIEF_SCHEMA = `{
  "identity": { "companyName": "string", "industry": "string", "description": "one sentence", "brandAdjectives": ["adj1","adj2","adj3"], "tagline": "string or null" },
  "visualSystem": { "primaryColor": "#RRGGBB or null", "secondaryColor": "#RRGGBB or null", "accentColors": ["#RRGGBB"], "logoUrl": "absolute URL or null", "fonts": ["font name"], "styleReference": "e.g. think Apple", "avoidList": ["thing to avoid"] },
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
    `Ranked brand color candidates: ${signals.colorHints.join(", ")}`,
    `Color ranking note: candidates used in accent, CTA, button, link, hover, focus, highlight, hero, gradient, and brand-variable contexts are ranked ahead of neutral layout colors.`,
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
  const brief = JSON.parse(json.choices[0]?.message?.content ?? "{}");
  normalizeBriefColors(brief, signals);
  return brief;
}

// ── creative prompt (mirrors app/lib/creative.ts buildCreativePrompt) ──────
function hexToColorName(hex) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "a deep brand color";
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2 / 255;
  const light = l < 0.2 ? "deep " : l < 0.4 ? "dark " : l > 0.85 ? "light " : "";
  if (max - min <= 10 || (max === 0 ? 0 : (max - min) / max) < 0.08) return `${light}gray`;
  if (r > 180 && g > 150 && b < 110) return `${light}yellow`;
  if (r > g && r > b) return g > b * 1.3 ? `${light}warm orange` : `${light}red`;
  if (g > r && g > b) return r > b * 1.1 ? `${light}yellow-green` : `${light}green`;
  if (b > r && b > g) return r > g * 1.1 ? `${light}purple` : `${light}blue`;
  return `${light}yellow`;
}

function palettePrompt(brief) {
  const primary = validHexColor(brief.visualSystem?.primaryColor);
  const secondary = validHexColor(brief.visualSystem?.secondaryColor);
  const accents = (brief.visualSystem?.accentColors ?? []).map(validHexColor).filter(Boolean);
  const palette = [...new Set([primary, secondary, ...accents].filter(Boolean))];
  if (!palette.length) return "Use a deep, distinctive brand-color palette.";

  const named = palette.map((hex) => `${hexToColorName(hex)} (${hex})`);
  if (named.length === 1) return `Use a palette dominated by ${named[0]}.`;
  return `Use the brand palette explicitly: primary ${named[0]}, secondary ${named[1]}, with accents ${named.slice(2).join(", ") || "kept minimal"}.`;
}

function buildCreativePrompt(brief) {
  const company = brief.identity.companyName;
  const desc = brief.identity.description || brief.identity.industry;
  const style = brief.visualSystem?.styleReference ?? "modern premium commercial";
  const tagline = brief.identity.tagline ? ` — "${brief.identity.tagline}"` : "";
  const cta = brief.campaign?.callToAction ? ` Energy of the CTA "${brief.campaign.callToAction}".` : "";
  const audience = brief.audience?.description || "the target audience";
  const avoid = brief.visualSystem?.avoidList?.length ? ` Do not show: ${brief.visualSystem.avoidList.join(", ")}.` : "";
  return [
    `Bold, striking 16:9 out-of-home billboard ad for ${company}${tagline}, ${desc}.`,
    `${style} visual style. ${palettePrompt(brief)}`,
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
