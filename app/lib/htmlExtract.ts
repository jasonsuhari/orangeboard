/* ──────────────────────────────────────────────────────────────────────────
   HTML text extraction for the company brief builder — lightweight regex
   scraping of titles, headlines, CTAs, bullets, proof signals, image alts,
   stylesheets, and supporting same-site pages.
   ────────────────────────────────────────────────────────────────────────── */

export interface PageSignals {
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

export interface SupportingPageSignals {
  url: string;
  title: string;
  headlines: string[];
  snippets: string[];
}

export function stylesheetUrls(head: string, base: URL): string[] {
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

export async function fetchStylesheetText(url: string): Promise<string> {
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
export const PROOF_TEXT_RE =
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

export function cleanHtmlText(value: string): string {
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

export function pushUnique(list: string[], value: string, maxItems: number, maxLength = 220): void {
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

export function extractReadableSignalsFromHtml(html: string, pageUrl: string): SupportingPageSignals & {
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

export function sameSiteResearchLinks(html: string, base: URL): string[] {
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

export async function fetchSupportingPage(url: string): Promise<{ url: string; html: string } | null> {
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
