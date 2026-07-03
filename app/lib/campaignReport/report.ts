import type { CampaignPackageReport, CampaignReportInput } from "./types";
import {
  DEFAULT_PURCHASE_URL,
  defaultBillboard,
  defaultCampaignWindow,
  defaultTargets,
  normalizeAgentReports,
  normalizeVision,
} from "./fallbacks";
import { clampScore, dedupe, reportMockupUrl, stableId, stripFinalPunctuation } from "./format";
import { renderCampaignReportMarkdown } from "./markdown";
import { buildOutboundSequence } from "./outboundTemplates";
import {
  SAMPLE_BILLBOARD,
  SAMPLE_BRIEF,
  SAMPLE_OPPORTUNITY,
  SAMPLE_TARGETS,
  SAMPLE_VISION,
} from "./samples";

export function makeCampaignReport(input: CampaignReportInput): CampaignPackageReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const brief = input.brief;
  const opportunity = input.opportunity;
  const placement = input.selectedBillboard ?? defaultBillboard(opportunity, input.purchaseUrl);
  const vision = normalizeVision(input.vision, placement);
  const targets = input.targetAccounts?.length
    ? input.targetAccounts
    : defaultTargets(opportunity, brief);
  const agentReports = normalizeAgentReports(input.agentReports, vision);
  const window = input.campaignWindow ?? defaultCampaignWindow(generatedAt);
  const coreMessage = stripFinalPunctuation(brief.campaign.coreMessage);
  const campaignName = `${brief.identity.companyName} x ${opportunity.area} field campaign`;
  const reportId = stableId([
    brief.identity.companyName,
    opportunity.title,
    placement.id,
    generatedAt.slice(0, 10),
  ]);

  const report: CampaignPackageReport = {
    reportId,
    generatedAt,
    campaignName,
    advertiser: {
      name: brief.identity.companyName,
      url: brief.url,
      industry: brief.identity.industry,
      coreMessage: brief.campaign.coreMessage,
      creativeDirection: brief.visualSystem.styleReference ?? "high-contrast, billboard-first creative",
    },
    executiveSummary: {
      headline: `${opportunity.area} is the strongest physical entry point for ${brief.identity.companyName}'s ICP in San Francisco.`,
      recommendation: `Reserve or inquire on ${placement.location} and run a two-week proof campaign anchored on ${coreMessage}.`,
      whyNow: `${opportunity.timing} gives the campaign a clear operating window, and the hotspot has ${opportunity.accounts} matched account or context signals within the activation area.`,
      primaryRisk: "Inventory availability, exact pricing, and booked impression counts must be confirmed by the media owner before this becomes a buy plan.",
    },
    icp: {
      description: brief.audience.description,
      buyingContext: brief.audience.contextWhenSeen ?? "mixed",
      matchedSignals: dedupe([
        ...(opportunity.matchReasons ?? []),
        ...targets.slice(0, 4).map((target) => target.localSignal),
      ]).slice(0, 6),
    },
    hotspot: {
      title: opportunity.title,
      area: opportunity.area,
      timing: opportunity.timing,
      score: clampScore(opportunity.score),
      summary: opportunity.summary,
      reasons: opportunity.matchReasons?.length
        ? opportunity.matchReasons
        : [`${opportunity.accounts} matched ICP/context signals`, `${opportunity.placements} candidate billboard placements`],
    },
    placement: {
      id: placement.id,
      location: placement.location,
      address: placement.address,
      coordinates: { lat: placement.lat, lng: placement.lng },
      purchaseUrl: placement.purchaseUrl ?? input.purchaseUrl ?? DEFAULT_PURCHASE_URL,
      inventoryStatus: placement.inventoryStatus ?? "Inquiry required",
      seller: placement.seller ?? "Media owner confirmation required",
      format: placement.format ?? "Static out-of-home billboard",
      dimensions: placement.dimensions ?? "Seller-provided",
      facing: placement.facing ?? "Field verification required",
      rateCard: placement.rateCard ?? "Rate card seller-confirmed",
      estimatedCpm: placement.estimatedCpm ?? "Estimated CPM seller-confirmed",
      availability: placement.availability ?? "Availability seller-confirmed",
      lighting: placement.lighting ?? "Lighting seller-confirmed",
      mediaType: placement.mediaType ?? "Static",
      restrictions: placement.restrictions ?? "Restrictions seller-confirmed",
      bookingContact: placement.bookingContact ?? "Booking contact seller-confirmed",
      details: placement.details ?? [
        "Grounded in SF GASP billboard coordinates.",
        "Pricing, availability, dimensions, and booking flow are seller-confirmed fields.",
      ],
    },
    creativePackage: {
      mockupUrl: reportMockupUrl(brief),
      angle: opportunity.creativeAngle,
      message: brief.campaign.coreMessage,
      copyGuidance: [
        "Use one remembered idea, not a feature list.",
        "Keep the headline readable in under two seconds.",
        `Keep tone ${brief.audience.tone ?? "direct and clear"} for the selected ICP.`,
      ],
    },
    agentVision: {
      verdict: vision.verdict,
      critique: vision.critique,
      metrics: [
        {
          label: "Visibility",
          value: `${vision.visibility}/100`,
          proofLevel: "modeled",
          note: "Estimated from synthetic viewer attention and scene prominence.",
        },
        {
          label: "Recall",
          value: `${vision.recall}/100`,
          proofLevel: "modeled",
          note: "Estimated from creative legibility and message comprehension.",
        },
        {
          label: "Glance capture",
          value: `${vision.glanceability}/100`,
          proofLevel: "modeled",
          note: "How well the board competes inside short exposure windows.",
        },
        {
          label: "Time to notice",
          value: vision.timeToNoticeMs == null ? "Not found" : `${(vision.timeToNoticeMs / 1000).toFixed(1)}s`,
          proofLevel: "modeled",
          note: `${vision.noticedBy ?? 0}/${vision.totalViewers ?? 4} synthetic viewers fixated on the board.`,
        },
        {
          label: "Scene attention share",
          value: vision.regionShare == null ? "Pending" : `${Math.round(vision.regionShare * 100)}%`,
          proofLevel: "modeled",
          note: "Share of predicted scene attention landing on the board region.",
        },
      ],
      attentionCompetitors: vision.attentionCompetitors ?? ["street motion", "storefront signage"],
    },
    agentReports,
    targetIcpList: targets,
    outboundSequence: buildOutboundSequence(brief, opportunity, placement, targets, window),
    proofLedger: [
      {
        label: "Billboard coordinates",
        proofLevel: "grounded",
        description: "Loaded from SF permitted billboard inventory.",
      },
      {
        label: "Hotspot and account context",
        proofLevel: "grounded",
        description: "Built from nearby business/context data and ICP keyword matching.",
      },
      {
        label: "Agent vision scores",
        proofLevel: "modeled",
        description: "Synthetic viewer and saliency estimates, not measured eye-tracking.",
      },
      {
        label: "Purchase link and pricing",
        proofLevel: placement.rateCard || placement.estimatedCpm ? "modeled" : "demo",
        description: "Rate card and CPM are estimates from permit/location metadata until seller inventory data is connected.",
      },
    ],
    nextSteps: [
      "Confirm the media owner's rate card, dimensions, availability, restrictions, and booking contact.",
      "Export the target account list into Orange Slice for enrichment and contact discovery.",
      "Generate the final board mockup after the seller confirms exact panel dimensions.",
      "Launch the pre-campaign sequence 5-7 business days before posting.",
    ],
    markdown: "",
  };

  report.markdown = renderCampaignReportMarkdown(report);
  return report;
}

export function makeSampleCampaignReport(): CampaignPackageReport {
  return makeCampaignReport({
    generatedAt: "2026-06-28T12:00:00.000Z",
    brief: SAMPLE_BRIEF,
    opportunity: SAMPLE_OPPORTUNITY,
    selectedBillboard: SAMPLE_BILLBOARD,
    vision: SAMPLE_VISION,
    targetAccounts: SAMPLE_TARGETS,
    campaignWindow: {
      preLaunchDate: "2026-07-06",
      launchDate: "2026-07-13",
      endDate: "2026-07-26",
      postCampaignDate: "2026-07-29",
    },
  });
}
