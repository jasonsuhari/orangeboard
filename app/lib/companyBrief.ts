import type { CompanyBrief } from "./types";

/* ──────────────────────────────────────────────────────────────────────────
   Company brief builder — adapted from Sightline.

   1. Scrape lightweight signals from the company's homepage (title, meta, OG,
      theme color, fonts, logo, headlines, CTAs).
   2. If OPENAI_API_KEY is set, ask the model to turn those signals into a
      structured brief. Otherwise fall back to a deterministic heuristic so the
      whole flow stays demoable with no API keys.
   ────────────────────────────────────────────────────────────────────────── */

interface PageSignals {
  url: string;
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  themeColor: string;
  keywords: string;
  faviconUrl: string;
  logoHints: string[];
  fontHints: string[];
  colorHints: string[];
  bodyHeadlines: string[];
  bodyCtaHints: string[];
  sectionHeadings: string[];
  featureBullets: string[];
  proofSignals: string[];
  imageAltHints: string[];
  supportingPages: SupportingPageSignals[];
  bodyText: string;
}

interface SupportingPageSignals {
  url: string;
  title: string;
  headlines: string[];
  snippets: string[];
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProto).toString();
}

type ParsedColor = { hex: string; alpha: number };
type ColorStats = {
  hex: string;
  count: number;
  firstSeen: number;
  weight: number;
};

const BRAND_COLOR_CONTEXT =
  /\b(accent|acid|brand|primary|secondary|cta|button|btn|link|hover|focus|active|selected|highlight|hero|gradient|glow|pill|badge|mark|underline|selection)\b/i;
const MUTED_COLOR_CONTEXT = /\b(transparent|shadow|ring|border|line|divider|overlay|backdrop|disabled|placeholder)\b/i;

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => clamp255(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function normalizeHexColor(raw: string): ParsedColor | null {
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

function parseCssChannel(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  if (v.endsWith("%")) {
    const pct = Number.parseFloat(v);
    return Number.isFinite(pct) ? clamp255((pct / 100) * 255) : null;
  }
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? clamp255(n) : null;
}

function parseCssAlpha(value?: string): number {
  if (!value) return 1;
  const v = value.trim();
  if (v.endsWith("%")) {
    const pct = Number.parseFloat(v);
    return Number.isFinite(pct) ? Math.max(0, Math.min(1, pct / 100)) : 1;
  }
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

function parseRgbColor(raw: string): ParsedColor | null {
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

function parseHslColor(raw: string): ParsedColor | null {
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

  const hueToRgb = (p: number, q: number, t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };

  const normalizedHue = (((h % 360) + 360) % 360) / 360;
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, normalizedHue + 1 / 3);
    g = hueToRgb(p, q, normalizedHue);
    b = hueToRgb(p, q, normalizedHue - 1 / 3);
  }
  return { hex: toHex(r * 255, g * 255, b * 255), alpha };
}

function parseCssColor(raw: string): ParsedColor | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("#")) return normalizeHexColor(value);
  if (/^rgba?\(/i.test(value)) return parseRgbColor(value);
  if (/^hsla?\(/i.test(value)) return parseHslColor(value);
  return null;
}

function colorMetrics(hex: string): { saturation: number; lightness: number; neutral: boolean } {
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

function colorDistance(a: string, b: string): number {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2) / 441.7;
}

function contextWeight(text: string, index: number, baseWeight: number): number {
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

function addColorHit(
  stats: Map<string, ColorStats>,
  parsed: ParsedColor | null,
  weight: number,
  firstSeen: number,
): void {
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

function collectColorHintsFromText(
  text: string,
  stats: Map<string, ColorStats>,
  baseWeight: number,
  orderOffset = 0,
): void {
  const slice = text.slice(0, 220_000);
  const hexRe = /#([0-9a-fA-F]{3,8})\b/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(slice)) !== null) {
    if (m.index > 0 && slice[m.index - 1] === "&") continue;
    addColorHit(stats, normalizeHexColor(m[0]), contextWeight(slice, m.index, baseWeight), orderOffset + m.index);
  }

  const rgbRe = /rgba?\(\s*[^)]+\)/gi;
  while ((m = rgbRe.exec(slice)) !== null) {
    addColorHit(stats, parseRgbColor(m[0]), contextWeight(slice, m.index, baseWeight), orderOffset + m.index);
  }

  const hslRe = /hsla?\(\s*[^)]+\)/gi;
  while ((m = hslRe.exec(slice)) !== null) {
    addColorHit(stats, parseHslColor(m[0]), contextWeight(slice, m.index, baseWeight), orderOffset + m.index);
  }
}

function rankedColorHints(stats: Map<string, ColorStats>): string[] {
  return [...stats.values()]
    .filter((s) => s.weight >= 0.35)
    .sort((a, b) => b.weight - a.weight || b.count - a.count || a.firstSeen - b.firstSeen)
    .map((s) => s.hex);
}

function stylesheetUrls(head: string, base: URL): string[] {
  const urls: string[] = [];
  const linkRe = /<link[^>]+>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(head)) !== null) {
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

async function fetchStylesheetText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrangeBoardBot/1.0)",
        Accept: "text/css,*/*;q=0.8",
      },
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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;|&mdash;/gi, "-");
}

function cleanHtmlText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function usefulSnippet(text: string, min = 18, max = 220): boolean {
  if (text.length < min || text.length > max) return false;
  if (LOW_VALUE_TEXT_RE.test(text) && !PROOF_TEXT_RE.test(text)) return false;
  if (/^[\W\d_]+$/.test(text)) return false;
  return true;
}

function pushUnique(list: string[], value: string, maxItems: number, maxLength = 220): void {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || list.length >= maxItems) return;
  const clipped = text.slice(0, maxLength).trim();
  if (!clipped || list.some((existing) => existing.toLowerCase() === clipped.toLowerCase())) return;
  list.push(clipped);
}

function bodySliceFromHtml(html: string): string {
  const bodyStart = html.search(/<body[\s>]/i);
  return html.slice(bodyStart > 0 ? bodyStart : 12_000, 260_000);
}

function titleFromHtml(html: string): string {
  const headEnd = html.search(/<\/head>/i);
  const head = html.slice(0, headEnd > 0 ? Math.min(headEnd + 7, 80_000) : 35_000);
  return cleanHtmlText((head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ""])[1]).slice(0, 120);
}

function collectTagText(html: string, re: RegExp, limit: number, min = 18, max = 220): string[] {
  const items: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null && items.length < limit) {
    const text = cleanHtmlText(match[1]);
    if (usefulSnippet(text, min, max)) pushUnique(items, text, limit, max);
  }
  return items;
}

function collectImageAlts(html: string, limit = 8): string[] {
  const items: string[] = [];
  const imgRe = /<img[^>]+>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRe.exec(html)) !== null && items.length < limit) {
    const alt = match[0].match(/\balt=["']([^"']+)["']/i)?.[1];
    if (!alt) continue;
    const text = cleanHtmlText(alt);
    if (usefulSnippet(text, 7, 140) && !/\blogo\b/i.test(text)) pushUnique(items, text, limit, 140);
  }
  return items;
}

function collectProofSignals(snippets: string[], limit = 10): string[] {
  const proof: string[] = [];
  for (const snippet of snippets) {
    if (PROOF_TEXT_RE.test(snippet)) pushUnique(proof, snippet, limit);
    if (proof.length >= limit) break;
  }
  return proof;
}

function extractReadableSignalsFromHtml(html: string, pageUrl: string): SupportingPageSignals & {
  ctas: string[];
  bullets: string[];
  proof: string[];
  imageAlts: string[];
} {
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

function sameSiteResearchLinks(html: string, base: URL): string[] {
  const scored = new Map<string, number>();
  const anchorRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    const href = decodeHtmlEntities(match[1]);
    if (/^(?:#|mailto:|tel:|javascript:)/i.test(href)) continue;

    let url: URL;
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

async function fetchSupportingPage(url: string): Promise<{ url: string; html: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrangeBoardBot/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(4_500),
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) return null;
    return { url, html: (await res.text()).slice(0, 240_000) };
  } catch {
    return null;
  }
}

function validHexColor(hex?: string | null): string | undefined {
  return hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : undefined;
}

function brandColorScore(hex: string, index: number): number {
  const metrics = colorMetrics(hex);
  const lightnessFit = metrics.lightness > 0.11 && metrics.lightness < 0.94 ? 1 : 0.25;
  const orderBonus = Math.max(0, 24 - index) * 0.03;
  return metrics.saturation * lightnessFit + orderBonus - (metrics.neutral ? 0.75 : 0);
}

function pickAccentColors(colors: string[], primary?: string, secondary?: string): string[] {
  const used = new Set([primary, secondary].filter(Boolean));
  return colors
    .map(validHexColor)
    .filter((hex): hex is string => Boolean(hex))
    .filter((hex) => !used.has(hex) && !colorMetrics(hex).neutral)
    .filter((hex, index, arr) => arr.findIndex((other) => colorDistance(hex, other) < 0.08) === index)
    .slice(0, 4);
}

export async function extractPageSignals(url: string): Promise<PageSignals> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; OrangeBoardBot/1.0)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

  const html = await res.text();
  const headEnd = html.search(/<\/head>/i);
  const head = html.slice(0, headEnd > 0 ? Math.min(headEnd + 7, 100_000) : 40_000);
  const base = new URL(url);

  const metaContent = (nameOrProp: string): string => {
    const patterns = [
      new RegExp(`<meta[^>]+(?:name|property)=["']${nameOrProp}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${nameOrProp}["']`, "i"),
    ];
    for (const re of patterns) {
      const m = head.match(re);
      if (m) return m[1].trim();
    }
    return "";
  };

  const titleTag = (): string => {
    const m = head.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m ? m[1].trim() : "";
  };

  const linkHref = (rel: string): string => {
    const m =
      head.match(new RegExp(`<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']+)["']`, "i")) ??
      head.match(new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']${rel}["']`, "i"));
    return m ? m[1].trim() : "";
  };

  const abs = (src: string): string => {
    if (src.startsWith("data:")) return src;
    try {
      return new URL(src, base).toString();
    } catch {
      return src;
    }
  };

  // Fonts
  const fontHints: string[] = [];
  const fontFamilyRe = /font-family:\s*['"]?([A-Za-z0-9 \-_]+)['"]?/gi;
  let fm: RegExpExecArray | null;
  while ((fm = fontFamilyRe.exec(head)) !== null) {
    const name = fm[1].trim();
    if (name && !fontHints.includes(name)) fontHints.push(name);
  }
  const googleFontRe = /fonts\.googleapis\.com\/css[^"']*family=([^"'&]+)/gi;
  while ((fm = googleFontRe.exec(head)) !== null) {
    const decoded = decodeURIComponent(fm[1]).replace(/\+/g, " ").split("|")[0].split(":")[0].trim();
    if (decoded && !fontHints.includes(decoded)) fontHints.push(decoded);
  }

  const themeColor = metaContent("theme-color");
  const colorStats = new Map<string, ColorStats>();
  addColorHit(colorStats, parseCssColor(themeColor), 12, -1);
  collectColorHintsFromText(head, colorStats, 1.2);
  const stylesheetTextsPromise = Promise.all(stylesheetUrls(head, base).map(fetchStylesheetText));

  // Logo candidates
  const logoHints: string[] = [];
  const touch = linkHref("apple-touch-icon") || linkHref("apple-touch-icon-precomposed");
  if (touch) logoHints.push(abs(touch));
  const logoImgRe = /<img[^>]+>/gi;
  let lm: RegExpExecArray | null;
  while ((lm = logoImgRe.exec(html)) !== null) {
    const tag = lm[0];
    if (!/logo/i.test(tag)) continue;
    const srcMatch = tag.match(/src=["']([^"']+)["']/);
    if (!srcMatch) continue;
    const u = abs(srcMatch[1]);
    if (!logoHints.includes(u)) logoHints.push(u);
  }

  // Homepage copy plus a few same-site product/context pages.
  const bodyStart = html.indexOf("<body");
  const bodySlice = html.slice(bodyStart > 0 ? bodyStart : 12_000);
  collectColorHintsFromText(bodySlice, colorStats, 0.9, head.length);
  const supportingPagesPromise = Promise.all(sameSiteResearchLinks(bodySlice, base).map(fetchSupportingPage));

  const stylesheetTexts = await stylesheetTextsPromise;
  stylesheetTexts.forEach((css, index) => {
    if (css) collectColorHintsFromText(css, colorStats, 1.6, (index + 1) * 500_000);
  });
  const colorHints = rankedColorHints(colorStats);

  const stripTags = cleanHtmlText;

  const bodyHeadlines: string[] = [];
  const h12Re = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = h12Re.exec(bodySlice)) !== null) {
    const text = stripTags(hm[1]);
    if (text.length > 3 && text.length < 140 && !bodyHeadlines.includes(text)) bodyHeadlines.push(text);
  }

  const bodyCtaHints: string[] = [];
  const btnRe = /<(?:button|a)[^>]*>([\s\S]*?)<\/(?:button|a)>/gi;
  let bm: RegExpExecArray | null;
  while ((bm = btnRe.exec(bodySlice)) !== null) {
    const text = stripTags(bm[1]);
    if (text.length > 2 && text.length < 40 && /\b(start|get|try|buy|book|join|sign|shop|learn|demo|free)\b/i.test(text)) {
      if (!bodyCtaHints.includes(text)) bodyCtaHints.push(text);
    }
  }

  // First few paragraph snippets — substance when meta tags are thin.
  const paragraphs: string[] = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = pRe.exec(bodySlice)) !== null && paragraphs.length < 8) {
    const text = stripTags(pm[1]);
    if (text.length > 30 && text.length < 320 && !paragraphs.includes(text)) paragraphs.push(text);
  }
  const bodyText = paragraphs.join(" ").slice(0, 700);
  const homepageSignals = extractReadableSignalsFromHtml(html, url);
  const supportingPagesFull = (await supportingPagesPromise)
    .filter((page): page is { url: string; html: string } => Boolean(page))
    .map((page) => extractReadableSignalsFromHtml(page.html, page.url))
    .filter((page) => page.headlines.length || page.snippets.length);
  const readablePages = [homepageSignals, ...supportingPagesFull];

  const sectionHeadings: string[] = [];
  const featureBullets: string[] = [];
  const proofSignals: string[] = [];
  const imageAltHints: string[] = [];
  const paragraphSnippets: string[] = [];

  for (const page of readablePages) {
    page.headlines.forEach((text) => pushUnique(bodyHeadlines, text, 10, 140));
    page.headlines.slice(1).forEach((text) => pushUnique(sectionHeadings, text, 12, 160));
    page.ctas.forEach((text) => pushUnique(bodyCtaHints, text, 8, 52));
    page.bullets.forEach((text) => pushUnique(featureBullets, text, 14, 190));
    page.proof.forEach((text) => pushUnique(proofSignals, text, 12, 220));
    page.imageAlts.forEach((text) => pushUnique(imageAltHints, text, 8, 140));
    page.snippets.forEach((text) => {
      if (text.length > 28 && !PROOF_TEXT_RE.test(text)) pushUnique(paragraphSnippets, text, 10, 260);
    });
  }

  const enrichedBodyText = [bodyText, ...paragraphSnippets].filter(Boolean).join(" ").slice(0, 1400);
  const supportingPages = supportingPagesFull
    .map(({ url: pageUrl, title, headlines, snippets }) => ({
      url: pageUrl,
      title,
      headlines: headlines.slice(0, 5),
      snippets: snippets.slice(0, 7),
    }))
    .slice(0, 4);

  const ogImage = metaContent("og:image");
  const rawFavicon = linkHref("icon") || linkHref("shortcut icon") || "/favicon.ico";

  return {
    url,
    title: titleTag(),
    metaDescription: metaContent("description"),
    ogTitle: metaContent("og:title"),
    ogDescription: metaContent("og:description"),
    ogImage: ogImage ? abs(ogImage) : "",
    themeColor,
    keywords: metaContent("keywords"),
    faviconUrl: abs(rawFavicon),
    logoHints: logoHints.slice(0, 5),
    fontHints: fontHints.slice(0, 8),
    colorHints: colorHints.slice(0, 24),
    bodyHeadlines: bodyHeadlines.slice(0, 6),
    bodyCtaHints: bodyCtaHints.slice(0, 6),
    sectionHeadings: sectionHeadings.slice(0, 10),
    featureBullets: featureBullets.slice(0, 12),
    proofSignals: proofSignals.slice(0, 10),
    imageAltHints: imageAltHints.slice(0, 6),
    supportingPages,
    bodyText: enrichedBodyText,
  };
}

/* ─────────────────────────── LLM path ─────────────────────────── */

const BRIEF_SYSTEM = `You are a senior brand strategist and creative director at a top out-of-home agency. From raw signals scraped off a company's website, infer what the company actually does and write a sharp, specific billboard creative brief.

Rules:
- Use real judgement. Infer the industry, audience, and positioning from the evidence — do NOT just echo the scraped text back.
- Every field must be DISTINCT. Never reuse the company name as the tagline or core message. Never repeat the same sentence across description / tagline / coreMessage.
- description: one concrete sentence on what the company does and for whom.
- brandAdjectives: three adjectives that are specific to THIS brand's voice (not generic filler like "modern, bold, trusted").
- tagline: a real, punchy line. If the site has one, refine it; if not, write one. Max ~7 words.
- coreMessage: the single idea a driver should remember 5 seconds after passing the billboard — a benefit or feeling, not a description.
- callToAction: short and imperative (e.g. "Start free", "Book a demo").
- audience.description: a vivid one-line demographic + psychographic, specific to this product.
- styleReference: name a real brand whose art direction fits ("think Apple", "think Liquid Death").
- Pick colors from the ranked brand color candidates. The first candidates are strongest.
- Do not make black, white, or gray the primaryColor when the site has a distinctive CTA/button/link/highlight accent. In that case use the distinctive accent as primaryColor and put the dark/light base in secondaryColor.
- Use accentColors for additional distinctive brand accents from buttons, links, gradients, highlights, or product UI. Do not include transparent shadows, borders, or generic grays.

Output ONLY valid JSON matching the schema — no markdown fences, no commentary.`;

const BRIEF_SCHEMA = `{
  "identity": { "companyName": "string", "industry": "string", "description": "one sentence", "brandAdjectives": ["adj1","adj2","adj3"], "tagline": "string or null" },
  "visualSystem": { "primaryColor": "#RRGGBB or null", "secondaryColor": "#RRGGBB or null", "accentColors": ["#RRGGBB"], "logoUrl": "absolute URL or null", "fonts": ["font name"], "styleReference": "e.g. think Apple / think Patagonia", "avoidList": ["thing to avoid"] },
  "campaign": { "coreMessage": "the ONE thing this ad communicates", "offerOrHook": "string or null", "callToAction": "string", "campaignObjective": "awareness | conversion | foot-traffic | app-downloads" },
  "audience": { "description": "one sentence demographic + psychographic", "tone": "string", "contextWhenSeen": "driving | walking | scrolling | mixed" }
}`;

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

async function briefFromOpenAI(signals: PageSignals, apiKey: string): Promise<Omit<CompanyBrief, "url">> {
  const userMessage = [
    `URL: ${signals.url}`,
    `Title: ${signals.title}`,
    `Meta description: ${signals.metaDescription}`,
    `OG title: ${signals.ogTitle}`,
    `OG description: ${signals.ogDescription}`,
    `Theme color: ${signals.themeColor}`,
    `Keywords: ${signals.keywords}`,
    signals.logoHints.length ? `Logo candidates: ${signals.logoHints.join(", ")}` : "",
    `Font hints: ${signals.fontHints.join(", ")}`,
    `Ranked brand color candidates: ${signals.colorHints.join(", ")}`,
    `Color ranking note: candidates used in accent, CTA, button, link, hover, focus, highlight, hero, gradient, and brand-variable contexts are ranked ahead of neutral layout colors.`,
    signals.bodyHeadlines.length ? `Headlines: ${signals.bodyHeadlines.join(" | ")}` : "",
    signals.sectionHeadings.length ? `Section headings: ${signals.sectionHeadings.join(" | ")}` : "",
    signals.bodyCtaHints.length ? `CTA text: ${signals.bodyCtaHints.join(" | ")}` : "",
    signals.featureBullets.length ? `Feature / benefit bullets: ${signals.featureBullets.join(" | ")}` : "",
    signals.proofSignals.length ? `Proof / credibility signals: ${signals.proofSignals.join(" | ")}` : "",
    signals.imageAltHints.length ? `Image / product alt hints: ${signals.imageAltHints.join(" | ")}` : "",
    signals.supportingPages.length
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
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`OpenAI brief failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  const raw = json.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as Omit<CompanyBrief, "url">;
}

/* ─────────────────────────── Heuristic fallback ─────────────────────────── */

function pickBrandColor(colors: string[], themeColor: string): string | undefined {
  const theme = validHexColor(parseCssColor(themeColor)?.hex ?? themeColor);
  const scored = colors
    .map(validHexColor)
    .filter((hex): hex is string => Boolean(hex))
    .map((hex, index) => {
      return { hex, score: brandColorScore(hex, index) };
    })
    .sort((a, b) => b.score - a.score);

  const distinctive = scored.find((candidate) => !colorMetrics(candidate.hex).neutral && candidate.score > 0.2)?.hex;
  if (theme && !colorMetrics(theme).neutral) return theme;
  if (distinctive) return distinctive;
  return theme ?? scored[0]?.hex ?? colors.map(validHexColor).find(Boolean);
}

function pickSecondaryBrandColor(colors: string[], primary?: string): string | undefined {
  const candidates = colors
    .map(validHexColor)
    .filter((hex): hex is string => Boolean(hex))
    .filter((hex) => hex !== primary);
  if (!candidates.length) return undefined;
  if (!primary) return candidates[0];
  const distinct = candidates.filter((hex) => colorDistance(hex, primary) > 0.18);
  const baseNeutral = distinct.find((hex) => {
    const metrics = colorMetrics(hex);
    return metrics.neutral && metrics.lightness > 0.02 && metrics.lightness < 0.96;
  });
  return baseNeutral ?? distinct.find((hex) => !colorMetrics(hex).neutral) ?? distinct[0] ?? candidates[0];
}

function normalizeBriefColors(brief: Omit<CompanyBrief, "url">, signals: PageSignals): void {
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
    modelSecondary && modelSecondary !== primary
      ? modelSecondary
      : pickSecondaryBrandColor(signals.colorHints, primary);

  const existingAccents = (brief.visualSystem.accentColors ?? [])
    .map(validHexColor)
    .filter((hex): hex is string => Boolean(hex));
  const inferredAccents = pickAccentColors(signals.colorHints, primary, brief.visualSystem.secondaryColor);
  brief.visualSystem.accentColors = [...new Set([...existingAccents, ...inferredAccents])].slice(0, 4);
}

function backfillBriefContext(brief: Omit<CompanyBrief, "url">, signals: PageSignals): void {
  const claims = [...signals.bodyHeadlines, ...signals.sectionHeadings, ...signals.featureBullets].slice(0, 8);
  const proofPoints = [...signals.proofSignals, ...signals.featureBullets].slice(0, 5);
  const evidence = [
    ...signals.proofSignals,
    ...signals.imageAltHints,
    ...signals.supportingPages.flatMap((page) => page.snippets),
  ].slice(0, 8);
  const description = brief.identity?.description || signals.metaDescription || signals.ogDescription || signals.bodyText;

  brief.campaign ??= {
    coreMessage: signals.bodyHeadlines[0] || description.slice(0, 80) || "Remember the brand",
    campaignObjective: "awareness",
  };
  if (!brief.campaign.headlineOptions?.length) {
    brief.campaign.headlineOptions = [
      brief.identity?.tagline,
      brief.campaign.coreMessage,
      signals.bodyHeadlines[0],
      signals.bodyHeadlines[1],
      brief.campaign.callToAction,
    ]
      .filter((text): text is string => Boolean(text))
      .slice(0, 5);
  }

  brief.strategy ??= {};
  brief.strategy.positioning ||= description
    ? `${brief.identity?.companyName || "The brand"} is positioned around ${description.slice(0, 140)}`
    : undefined;
  brief.strategy.customerProblem ||= signals.sectionHeadings[0] || claims[0];
  brief.strategy.customerPromise ||= proofPoints[0] || brief.campaign.coreMessage;
  if (!brief.strategy.differentiators?.length) brief.strategy.differentiators = signals.featureBullets.slice(0, 4);
  if (!brief.strategy.proofPoints?.length) brief.strategy.proofPoints = proofPoints;
  if (!brief.strategy.messageHierarchy?.length) {
    brief.strategy.messageHierarchy = [
      brief.campaign.coreMessage,
      proofPoints[0],
      "One visual focal point tied to the buyer outcome",
    ].filter((text): text is string => Boolean(text));
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
  if (!brief.sourceContext.observedCtas?.length) brief.sourceContext.observedCtas = signals.bodyCtaHints.slice(0, 8);
  if (!brief.sourceContext.evidenceSnippets?.length) brief.sourceContext.evidenceSnippets = evidence;
}

function cleanCompanyName(signals: PageSignals): string {
  const raw = signals.ogTitle || signals.title || new URL(signals.url).hostname.replace(/^www\./, "");
  // "Brand — tagline" / "Brand | tagline" → "Brand"
  return raw.split(/[|–—:·]/)[0].trim().slice(0, 40) || "Your Brand";
}

function heuristicBrief(signals: PageSignals): Omit<CompanyBrief, "url"> {
  const companyName = cleanCompanyName(signals);
  const description =
    signals.metaDescription || signals.ogDescription || signals.bodyHeadlines[0] || `${companyName} homepage`;
  const tagline = signals.bodyHeadlines[0] && signals.bodyHeadlines[0].length < 60 ? signals.bodyHeadlines[0] : undefined;
  const cta = signals.bodyCtaHints[0] || "Learn more";
  const primaryColor = pickBrandColor(signals.colorHints, signals.themeColor) ?? "#F97316";
  const secondaryColor = pickSecondaryBrandColor(signals.colorHints, primaryColor);
  const proofPoints = [...signals.proofSignals, ...signals.featureBullets].slice(0, 4);
  const sourceClaims = [...signals.bodyHeadlines, ...signals.sectionHeadings, ...signals.featureBullets].slice(0, 6);
  const promise = proofPoints[0] || description.slice(0, 120);

  return {
    identity: {
      companyName,
      industry: signals.keywords.split(",")[0]?.trim() || "Consumer brand",
      description: description.slice(0, 160),
      brandAdjectives: ["bold", "modern", "trusted"],
      tagline,
    },
    visualSystem: {
      primaryColor,
      secondaryColor,
      accentColors: pickAccentColors(signals.colorHints, primaryColor, secondaryColor),
      logoUrl: signals.logoHints[0] || signals.faviconUrl || undefined,
      fonts: signals.fontHints.slice(0, 2),
      styleReference: "modern premium commercial",
      avoidList: [],
    },
    campaign: {
      coreMessage: tagline || description.slice(0, 80),
      headlineOptions: [tagline, signals.bodyHeadlines[1], signals.bodyHeadlines[2], cta]
        .filter((text): text is string => Boolean(text))
        .slice(0, 4),
      callToAction: cta,
      campaignObjective: "awareness",
    },
    audience: {
      description: "Urban professionals who notice well-designed brands",
      tone: "confident, clean",
      contextWhenSeen: "mixed",
    },
    strategy: {
      positioning: `${companyName} is positioned around ${description.slice(0, 120)}`,
      customerProblem: signals.sectionHeadings[0] || "The target audience needs a clearer, faster way to choose this brand.",
      customerPromise: promise,
      differentiators: signals.featureBullets.slice(0, 4),
      proofPoints,
      messageHierarchy: [
        tagline || description.slice(0, 70),
        proofPoints[0] || cta,
        "Brand-color billboard with one dominant focal point",
      ].filter(Boolean),
      creativeMandatories: [
        "Use the observed brand palette",
        "Keep copy short enough to read in motion",
        "Make the product benefit visually obvious",
      ],
    },
    sourceContext: {
      sourceSummary: [signals.metaDescription, signals.ogDescription, signals.bodyText].filter(Boolean).join(" ").slice(0, 260),
      observedClaims: sourceClaims,
      observedCtas: signals.bodyCtaHints.slice(0, 6),
      evidenceSnippets: [...signals.proofSignals, ...signals.imageAltHints, ...signals.supportingPages.flatMap((page) => page.snippets)].slice(0, 8),
    },
    heuristic: true,
  } as Omit<CompanyBrief, "url">;
}

export async function buildCompanyBrief(url: string): Promise<CompanyBrief> {
  const signals = await extractPageSignals(url);
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const brief = await briefFromOpenAI(signals, apiKey);
      normalizeBriefColors(brief, signals);
      backfillBriefContext(brief, signals);
      // Backfill a logo if the model didn't surface one.
      if (!brief.visualSystem.logoUrl) {
        brief.visualSystem.logoUrl = signals.logoHints[0] || signals.faviconUrl || undefined;
      }
      return { url, ...brief };
    } catch (err) {
      console.error("OpenAI brief failed, falling back to heuristic:", err);
    }
  }

  return { url, ...heuristicBrief(signals) };
}
