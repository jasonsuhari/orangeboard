import type { CompanyBrief } from "./types";
import { backfillBriefContext, heuristicBrief } from "./briefHeuristic";
import { COMPREHENSIVE_BRIEF_SCHEMA, COMPREHENSIVE_BRIEF_SYSTEM } from "./briefPrompts";
import {
  addColorHit,
  collectColorHintsFromText,
  normalizeBriefColors,
  parseCssColor,
  rankedColorHints,
  type ColorStats,
} from "./colorParsing";
import {
  cleanHtmlText,
  extractReadableSignalsFromHtml,
  fetchStylesheetText,
  fetchSupportingPage,
  PROOF_TEXT_RE,
  pushUnique,
  sameSiteResearchLinks,
  stylesheetUrls,
  type PageSignals,
} from "./htmlExtract";
import { callOpenAIChatJSON } from "./server/openai";

/* ──────────────────────────────────────────────────────────────────────────
   Company brief builder — adapted from Sightline.

   1. Scrape lightweight signals from the company's homepage (title, meta, OG,
      theme color, fonts, logo, headlines, CTAs).
   2. If OPENAI_API_KEY is set, ask the model to turn those signals into a
      structured brief. Otherwise fall back to a deterministic heuristic so the
      whole flow stays demoable with no API keys.

   The subsystems live in sibling modules: htmlExtract (text scraping),
   colorParsing (brand colors), briefPrompts (LLM prompts), and briefHeuristic
   (no-key fallback + backfill).
   ────────────────────────────────────────────────────────────────────────── */

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProto).toString();
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

  const raw = await callOpenAIChatJSON({
    apiKey,
    model: process.env.OPENAI_BRIEF_MODEL ?? "gpt-4o-mini",
    temperature: 0.7,
    timeoutMs: 30_000,
    errorLabel: "OpenAI brief failed",
    messages: [
      { role: "system", content: COMPREHENSIVE_BRIEF_SYSTEM },
      { role: "user", content: userMessage },
    ],
  });
  return JSON.parse(raw) as Omit<CompanyBrief, "url">;
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
