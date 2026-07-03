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

const CTA_TEXT_RE = /\b(start|get|try|buy|book|join|sign|shop|learn|demo|free|contact|talk|request|schedule|download|subscribe)\b/i;
const PROOF_TEXT_RE =
  /\b(trusted|customers?|teams?|companies|enterprise|security|secure|SOC ?2|ISO|GDPR|HIPAA|award|rated|review|leader|integrations?|automate|save|faster|reduce|increase|revenue|pipeline|conversion|AI|platform|\d[\d,.]*\s?(?:x|%|k|m|b|million|billion|hours?|days?|users?|customers?|teams?))\b/i;
const LOW_VALUE_TEXT_RE =
  /\b(cookie|privacy|terms|copyright|login|log in|sign in|menu|navigation|careers|press|legal|newsletter|all rights reserved)\b/i;
const RESEARCH_LINK_RE =
  /\b(product|platform|features?|solutions?|use cases?|customers?|case studies?|pricing|security|integrations?|about|industries|demo)\b/i;

function decodeHtmlEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;|&mdash;/gi, "-");
}

function cleanHtmlText(value) {
  return decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function usefulSnippet(text, min = 18, max = 220) {
  if (text.length < min || text.length > max) return false;
  if (LOW_VALUE_TEXT_RE.test(text) && !PROOF_TEXT_RE.test(text)) return false;
  if (/^[\W\d_]+$/.test(text)) return false;
  return true;
}

function pushUnique(list, value, maxItems, maxLength = 220) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || list.length >= maxItems) return;
  const clipped = text.slice(0, maxLength).trim();
  if (!clipped || list.some((existing) => existing.toLowerCase() === clipped.toLowerCase())) return;
  list.push(clipped);
}

function bodySliceFromHtml(html) {
  const bodyStart = html.search(/<body[\s>]/i);
  return html.slice(bodyStart > 0 ? bodyStart : 12_000, 260_000);
}

function titleFromHtml(html) {
  const headEnd = html.search(/<\/head>/i);
  const head = html.slice(0, headEnd > 0 ? Math.min(headEnd + 7, 80_000) : 35_000);
  return cleanHtmlText((head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ""])[1]).slice(0, 120);
}

function collectTagText(html, re, limit, min = 18, max = 220) {
  const items = [];
  for (const match of html.matchAll(re)) {
    const text = cleanHtmlText(match[1]);
    if (usefulSnippet(text, min, max)) pushUnique(items, text, limit, max);
    if (items.length >= limit) break;
  }
  return items;
}

function collectImageAlts(html, limit = 8) {
  const items = [];
  for (const match of html.matchAll(/<img[^>]+>/gi)) {
    const alt = match[0].match(/\balt=["']([^"']+)["']/i)?.[1];
    if (!alt) continue;
    const text = cleanHtmlText(alt);
    if (usefulSnippet(text, 7, 140) && !/\blogo\b/i.test(text)) pushUnique(items, text, limit, 140);
    if (items.length >= limit) break;
  }
  return items;
}

function collectProofSignals(snippets, limit = 10) {
  const proof = [];
  for (const snippet of snippets) {
    if (PROOF_TEXT_RE.test(snippet)) pushUnique(proof, snippet, limit);
    if (proof.length >= limit) break;
  }
  return proof;
}

function extractReadableSignalsFromHtml(html, pageUrl) {
  const body = bodySliceFromHtml(html);
  const headlines = [
    ...collectTagText(body, /<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi, 8, 4, 140),
    ...collectTagText(body, /<h3[^>]*>([\s\S]*?)<\/h3>/gi, 8, 10, 160),
  ].slice(0, 10);
  const paragraphs = collectTagText(body, /<p[^>]*>([\s\S]*?)<\/p>/gi, 14, 30, 320);
  const bullets = collectTagText(body, /<li[^>]*>([\s\S]*?)<\/li>/gi, 14, 14, 190);
  const imageAlts = collectImageAlts(body);
  const ctas = collectTagText(body, /<(?:button|a)[^>]*>([\s\S]*?)<\/(?:button|a)>/gi, 10, 3, 52)
    .filter((text) => CTA_TEXT_RE.test(text));
  const proof = collectProofSignals([...headlines, ...paragraphs, ...bullets], 10);

  return {
    url: pageUrl,
    title: titleFromHtml(html),
    headlines,
    snippets: [...paragraphs, ...bullets, ...imageAlts].slice(0, 14),
    ctas,
    bullets,
    proof,
    imageAlts,
  };
}

function sameSiteResearchLinks(html, base) {
  const scored = new Map();
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decodeHtmlEntities(match[1]);
    if (/^(?:#|mailto:|tel:|javascript:)/i.test(href)) continue;

    let url;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (url.hostname !== base.hostname) continue;
    if (/\.(?:png|jpe?g|gif|svg|webp|pdf|zip|mp4|mov)$/i.test(url.pathname)) continue;
    if (/\b(log[ -]?in|sign[ -]?in|privacy|terms|careers?|blog|press|docs?|support)\b/i.test(url.pathname)) continue;

    url.hash = "";
    const key = url.toString();
    if (key === base.toString()) continue;

    const text = cleanHtmlText(match[2]);
    const haystack = `${url.pathname} ${text}`;
    if (!RESEARCH_LINK_RE.test(haystack)) continue;

    let score = 1;
    if (/\b(product|platform|features?)\b/i.test(haystack)) score += 6;
    if (/\b(solutions?|use cases?|industries)\b/i.test(haystack)) score += 5;
    if (/\b(customers?|case studies?|security|integrations?)\b/i.test(haystack)) score += 4;
    if (/\b(pricing|demo|about)\b/i.test(haystack)) score += 2;
    score -= Math.min(3, url.pathname.split("/").filter(Boolean).length * 0.35);
    scored.set(key, Math.max(scored.get(key) ?? 0, score));
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([href]) => href)
    .slice(0, 4);
}

async function fetchSupportingPage(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrangeBoardBot/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(4_500),
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) return null;
    return { url, html: (await res.text()).slice(0, 240_000) };
  } catch {
    return null;
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
function backfillBriefContext(brief, signals) {
  const claims = [...(signals.headlines ?? []), ...(signals.sectionHeadings ?? []), ...(signals.featureBullets ?? [])].slice(0, 8);
  const proofPoints = [...(signals.proofSignals ?? []), ...(signals.featureBullets ?? [])].slice(0, 5);
  const evidence = [
    ...(signals.proofSignals ?? []),
    ...(signals.imageAltHints ?? []),
    ...(signals.supportingPages ?? []).flatMap((page) => page.snippets),
  ].slice(0, 8);
  const description = brief.identity?.description || signals.metaDescription || signals.ogDescription || signals.bodyText || "";

  brief.campaign ??= {
    coreMessage: signals.headlines?.[0] || description.slice(0, 80) || "Remember the brand",
    campaignObjective: "awareness",
  };
  if (!brief.campaign.headlineOptions?.length) {
    brief.campaign.headlineOptions = [
      brief.identity?.tagline,
      brief.campaign.coreMessage,
      signals.headlines?.[0],
      signals.headlines?.[1],
      brief.campaign.callToAction,
    ].filter(Boolean).slice(0, 5);
  }

  brief.strategy ??= {};
  brief.strategy.positioning ||= description
    ? `${brief.identity?.companyName || "The brand"} is positioned around ${description.slice(0, 140)}`
    : undefined;
  brief.strategy.customerProblem ||= signals.sectionHeadings?.[0] || claims[0];
  brief.strategy.customerPromise ||= proofPoints[0] || brief.campaign.coreMessage;
  if (!brief.strategy.differentiators?.length) brief.strategy.differentiators = (signals.featureBullets ?? []).slice(0, 4);
  if (!brief.strategy.proofPoints?.length) brief.strategy.proofPoints = proofPoints;
  if (!brief.strategy.messageHierarchy?.length) {
    brief.strategy.messageHierarchy = [
      brief.campaign.coreMessage,
      proofPoints[0],
      "One visual focal point tied to the buyer outcome",
    ].filter(Boolean);
  }
  if (!brief.strategy.creativeMandatories?.length) {
    brief.strategy.creativeMandatories = [
      "Use the observed brand palette",
      "Keep copy short enough to read in motion",
      "Make the customer outcome visually obvious",
    ];
  }

  brief.sourceContext ??= {};
  brief.sourceContext.sourceSummary ||= [signals.metaDescription, signals.ogDescription, signals.bodyText]
    .filter(Boolean)
    .join(" ")
    .slice(0, 320);
  if (!brief.sourceContext.observedClaims?.length) brief.sourceContext.observedClaims = claims;
  if (!brief.sourceContext.observedCtas?.length) brief.sourceContext.observedCtas = (signals.bodyCtaHints ?? []).slice(0, 8);
  if (!brief.sourceContext.evidenceSnippets?.length) brief.sourceContext.evidenceSnippets = evidence;
}

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
  const supportingPagesPromise = Promise.all(sameSiteResearchLinks(bodySlice, base).map(fetchSupportingPage));
  const stylesheetTexts = await stylesheetTextsPromise;
  stylesheetTexts.forEach((css, index) => {
    if (css) collectColorHintsFromText(css, colorStats, 1.6, (index + 1) * 500_000);
  });
  const colorHints = rankedColorHints(colorStats);
  const strip = cleanHtmlText;

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
  const bodyCtaHints = [];
  const homepageSignals = extractReadableSignalsFromHtml(html, url);
  const supportingPagesFull = (await supportingPagesPromise)
    .filter(Boolean)
    .map((page) => extractReadableSignalsFromHtml(page.html, page.url))
    .filter((page) => page.headlines.length || page.snippets.length);
  const readablePages = [homepageSignals, ...supportingPagesFull];

  const sectionHeadings = [];
  const featureBullets = [];
  const proofSignals = [];
  const imageAltHints = [];
  const paragraphSnippets = [];

  for (const page of readablePages) {
    page.headlines.forEach((text) => pushUnique(headlines, text, 10, 140));
    page.headlines.slice(1).forEach((text) => pushUnique(sectionHeadings, text, 12, 160));
    page.ctas.forEach((text) => pushUnique(bodyCtaHints, text, 8, 52));
    page.bullets.forEach((text) => pushUnique(featureBullets, text, 14, 190));
    page.proof.forEach((text) => pushUnique(proofSignals, text, 12, 220));
    page.imageAlts.forEach((text) => pushUnique(imageAltHints, text, 8, 140));
    page.snippets.forEach((text) => {
      if (text.length > 28 && !PROOF_TEXT_RE.test(text)) pushUnique(paragraphSnippets, text, 10, 260);
    });
  }

  const enrichedBodyText = [paragraphs.join(" "), ...paragraphSnippets].filter(Boolean).join(" ").slice(0, 1400);
  const supportingPages = supportingPagesFull
    .map(({ url: pageUrl, title, headlines: pageHeadlines, snippets }) => ({
      url: pageUrl,
      title,
      headlines: pageHeadlines.slice(0, 5),
      snippets: snippets.slice(0, 7),
    }))
    .slice(0, 4);

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
    bodyCtaHints: bodyCtaHints.slice(0, 6),
    sectionHeadings: sectionHeadings.slice(0, 10),
    featureBullets: featureBullets.slice(0, 12),
    proofSignals: proofSignals.slice(0, 10),
    imageAltHints: imageAltHints.slice(0, 6),
    supportingPages,
    bodyText: enrichedBodyText,
  };
}

// ── brief (mirrors COMPREHENSIVE_BRIEF_SYSTEM / COMPREHENSIVE_BRIEF_SCHEMA in app/lib/briefPrompts.ts) ──
const COMPREHENSIVE_BRIEF_SYSTEM = `You are a senior brand strategist and creative director at a top out-of-home agency. From raw signals scraped from a company's website, infer what the company actually does and write a comprehensive billboard creative brief.

Rules:
- Use real judgement. Infer the industry, audience, positioning, buyer pain, and creative opportunity from the evidence. Do not just echo scraped text back.
- Treat homepage content, product/feature snippets, proof signals, image alt text, and supporting same-domain pages as evidence.
- Every field must be distinct. Never reuse the company name as the tagline or core message. Never repeat the same sentence across description, tagline, coreMessage, positioning, and sourceSummary.
- description: one concrete sentence on what the company does and for whom.
- brandAdjectives: three adjectives specific to this brand's voice. Avoid generic filler like "modern, bold, trusted".
- tagline: a punchy billboard line. If the site has one, refine it; if not, write one. Max 7 words.
- coreMessage: the one idea a driver should remember 5 seconds after passing the billboard. It must be a benefit or feeling, not a company description.
- headlineOptions: 3 to 5 alternate billboard headlines, each short enough for outdoor.
- callToAction: short and imperative, e.g. "Start free", "Book a demo".
- audience.description: a vivid one-line demographic plus psychographic, specific to this product.
- styleReference: name a real brand whose art direction fits, e.g. "think Apple", "think Liquid Death".
- strategy.positioning: the market position in one useful sentence, based on the website evidence.
- strategy.customerProblem and strategy.customerPromise: the pain and outcome the creative should dramatize.
- strategy.differentiators and strategy.proofPoints: concrete claims, features, use cases, integrations, numbers, customers, or credibility signals found on the website. Do not invent proof.
- strategy.messageHierarchy: ordered billboard read: primary takeaway, support, visual cue.
- strategy.creativeMandatories: practical design/copy constraints the generated ad should follow.
- sourceContext: summarize what was actually observed on the site so a human can audit the brief.
- Pick colors from the ranked brand color candidates. The first candidates are strongest.
- Do not make black, white, or gray the primaryColor when the site has a distinctive CTA/button/link/highlight accent. In that case use the distinctive accent as primaryColor and put the dark/light base in secondaryColor.
- Use accentColors for additional distinctive brand accents from buttons, links, gradients, highlights, or product UI. Do not include transparent shadows, borders, or generic grays.

Output ONLY valid JSON matching the schema. No markdown fences, no commentary.`;

const COMPREHENSIVE_BRIEF_SCHEMA = `{
  "identity": { "companyName": "string", "industry": "string", "description": "one sentence", "brandAdjectives": ["adj1","adj2","adj3"], "tagline": "string or null" },
  "visualSystem": { "primaryColor": "#RRGGBB or null", "secondaryColor": "#RRGGBB or null", "accentColors": ["#RRGGBB"], "logoUrl": "absolute URL or null", "fonts": ["font name"], "styleReference": "e.g. think Apple / think Patagonia", "avoidList": ["thing to avoid"] },
  "campaign": { "coreMessage": "the ONE thing this ad communicates", "headlineOptions": ["short headline"], "offerOrHook": "string or null", "callToAction": "string", "campaignObjective": "awareness | conversion | foot-traffic | app-downloads" },
  "audience": { "description": "one sentence demographic + psychographic", "tone": "string", "contextWhenSeen": "driving | walking | scrolling | mixed" },
  "strategy": { "positioning": "string", "customerProblem": "string", "customerPromise": "string", "differentiators": ["specific differentiator"], "proofPoints": ["website-backed proof point"], "messageHierarchy": ["primary takeaway", "supporting proof", "visual cue"], "creativeMandatories": ["constraint or direction"] },
  "sourceContext": { "sourceSummary": "what the site says in plain English", "observedClaims": ["claim from site"], "observedCtas": ["CTA from site"], "evidenceSnippets": ["short website evidence"] }
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
    signals.sectionHeadings?.length ? `Section headings: ${signals.sectionHeadings.join(" | ")}` : "",
    signals.bodyCtaHints?.length ? `CTA text: ${signals.bodyCtaHints.join(" | ")}` : "",
    signals.featureBullets?.length ? `Feature / benefit bullets: ${signals.featureBullets.join(" | ")}` : "",
    signals.proofSignals?.length ? `Proof / credibility signals: ${signals.proofSignals.join(" | ")}` : "",
    signals.imageAltHints?.length ? `Image / product alt hints: ${signals.imageAltHints.join(" | ")}` : "",
    signals.supportingPages?.length
      ? `Supporting pages:\n${signals.supportingPages
          .map((page) => [
            `- ${page.url}`,
            page.title ? `  Title: ${page.title}` : "",
            page.headlines.length ? `  Headlines: ${page.headlines.join(" | ")}` : "",
            page.snippets.length ? `  Snippets: ${page.snippets.join(" | ")}` : "",
          ].filter(Boolean).join("\n"))
          .join("\n")}`
      : "",
    signals.bodyText ? `Body copy: ${signals.bodyText}` : "",
    "",
    `Return a JSON object that exactly matches this schema:\n${COMPREHENSIVE_BRIEF_SCHEMA}`,
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
        { role: "system", content: COMPREHENSIVE_BRIEF_SYSTEM },
        { role: "user", content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`brief failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const brief = JSON.parse(json.choices[0]?.message?.content ?? "{}");
  normalizeBriefColors(brief, signals);
  backfillBriefContext(brief, signals);
  return brief;
}

// ── creative prompt (mirrors app/lib/creative.ts buildCreativePrompt) ──────
function hexToColorName(hex) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "a deep brand color";
  const h = hex.replace("#", "").toLowerCase();
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2 / 255;

  const named = {
    "ffe500": "vivid electric yellow", "ffff00": "pure yellow", "ff0000": "bold red",
    "000000": "pure black", "ffffff": "pure white", "0000ff": "pure blue",
    "ff6600": "vivid orange", "00ff00": "pure green", "ff69b4": "hot pink",
    "1a1a2e": "deep navy", "2d7dff": "bright blue", "28b487": "teal green",
  };
  if (named[h]) return named[h];

  const light = l < 0.2 ? "deep " : l < 0.4 ? "dark " : l > 0.8 ? "light " : l > 0.9 ? "pale " : "";
  if (max === min) return `${light}gray`;
  if (r > g && r > b) return g > b * 1.3 ? `${light}warm orange` : `${light}red`;
  if (g > r && g > b) return r > b * 1.1 ? `${light}yellow-green` : `${light}green`;
  if (b > r && b > g) return r > g * 1.1 ? `${light}purple` : `${light}blue`;
  if (r > b && g > b) return `${light}yellow`;
  if (r > g && b > g) return `${light}magenta`;
  return `${light}cyan`;
}

function stripHexCodes(prompt) {
  return prompt.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (match) => {
    const full = match.length === 4
      ? `#${match[1]}${match[1]}${match[2]}${match[2]}${match[3]}${match[3]}`
      : match;
    return hexToColorName(full);
  });
}

function cleanProviderPrompt(prompt) {
  return stripHexCodes(prompt)
    .replace(/\b(no|without)\s+(?:text|letters|logos?|words?)(?:\s*,?\s*(?:or\s+)?(?:text|letters|logos?|words?))*\b/gi, "clean brand-safe scene")
    .replace(/\b(no|without)\s+(text|letters|logos?|words?)\b/gi, "clean brand-safe scene")
    .replace(/\b(where|space)\s+white\s+text\s+will\s+be\s+printed\b/gi, "reserved for later design overlay")
    .replace(/\bthe\s+ad\s+fails\b/gi, "the composition should stay clean")
    .replace(/\s+/g, " ")
    .trim();
}

const SIGHTLINE_IMAGE_CREATIVE_ANGLE =
  "direct-response billboard, clear commercial offer, high contrast focal product moment, strong urgency";

function addSightlineCreativeAngle(prompt) {
  return cleanProviderPrompt(
    `${prompt} Creative strategy: ${SIGHTLINE_IMAGE_CREATIVE_ANGLE}. Make this concept visually distinct from other campaign variants.`
  );
}

function buildCreativePrompt(brief) {
  const color = brief.visualSystem?.primaryColor
    ? hexToColorName(brief.visualSystem.primaryColor)
    : "brand color";
  const company = brief.identity.companyName;
  const desc = brief.identity.description || brief.identity.industry;
  const cta = brief.campaign?.callToAction ? `. CTA: "${brief.campaign.callToAction}"` : "";
  const positioning = brief.strategy?.positioning ? ` Positioning: ${brief.strategy.positioning}.` : "";
  const promise = brief.strategy?.customerPromise ? ` Customer promise: ${brief.strategy.customerPromise}.` : "";
  const audience = brief.audience?.description ? ` Audience: ${brief.audience.description}.` : "";
  const proof = brief.strategy?.proofPoints?.length
    ? ` Proof cues: ${brief.strategy.proofPoints.slice(0, 3).join("; ")}.`
    : "";
  const mandatories = brief.strategy?.creativeMandatories?.length
    ? ` Creative mandatories: ${brief.strategy.creativeMandatories.slice(0, 3).join("; ")}.`
    : "";
  const tagline = brief.identity.tagline ? ` — "${brief.identity.tagline}"` : "";
  const avoid = brief.visualSystem?.avoidList?.length ? ` Do not show: ${brief.visualSystem.avoidList.join(", ")}.` : "";

  return addSightlineCreativeAngle(cleanProviderPrompt(
    `Make a 16:9 ad for ${company}${tagline}, ${desc}.${positioning}${promise}${audience}${proof}${mandatories} Main color is ${color}${cta}.${avoid} No text in the image.`
  ));
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
