/* ──────────────────────────────────────────────────────────────────────────
   Heuristic fallback for the company brief builder — a deterministic brief
   built purely from scraped page signals (used when no OPENAI_API_KEY is
   set), plus the backfill that fills gaps the model left in an LLM brief.
   ────────────────────────────────────────────────────────────────────────── */

import type { CompanyBrief } from "./types";
import type { PageSignals } from "./htmlExtract";
import { pickAccentColors, pickBrandColor, pickSecondaryBrandColor } from "./colorParsing";

export function backfillBriefContext(brief: Omit<CompanyBrief, "url">, signals: PageSignals): void {
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

export function heuristicBrief(signals: PageSignals): Omit<CompanyBrief, "url"> {
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
