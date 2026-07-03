import type { AttentionSimResult, CompanyBrief } from "../types";
import type {
  AgentVisionReportInput,
  BillboardPlacementInput,
  CampaignWindow,
  ReportOpportunity,
  TargetAccountInput,
  VisionReportInput,
} from "./types";
import { clampOptionalScore, clampScore } from "./format";

export const DEFAULT_PURCHASE_URL = "https://www.google.com/maps/search/?api=1&query=37.780133756,-122.39674369";

export function normalizeVision(
  input: AttentionSimResult | VisionReportInput | undefined,
  placement: BillboardPlacementInput,
): VisionReportInput {
  if (!input) {
    return {
      visibility: clampScore(placement.visibilityScore),
      recall: 72,
      glanceability: 78,
      shareability: 62,
      timeToNoticeMs: Math.round(Math.max(0.7, 3.2 - placement.visibilityScore / 40) * 1000),
      noticedBy: 3,
      totalViewers: 4,
      regionShare: 0.18,
      attentionCompetitors: ["moving vehicles", "storefront signs", "intersection clutter"],
      verdict: "Strong placement for a proof campaign if the final creative remains high contrast and short.",
      critique: "The board should use one dominant headline and avoid small secondary copy.",
    };
  }

  if ("scores" in input) {
    return {
      visibility: clampScore(input.scores.visibility),
      recall: clampScore(input.scores.recall),
      glanceability: clampScore(input.scores.glanceability),
      shareability: clampScore(input.scores.shareability),
      timeToNoticeMs: input.street?.timeToNoticeMs ?? null,
      noticedBy: input.street?.noticedBy,
      totalViewers: input.street?.total,
      regionShare: input.street?.regionShare,
      attentionCompetitors: ["street motion", "vehicle bodies", "bright signage"],
      verdict: input.verdict,
      critique: input.perception.critique,
    };
  }

  return {
    ...input,
    visibility: clampScore(input.visibility),
    recall: clampScore(input.recall),
    glanceability: clampScore(input.glanceability),
    shareability: clampScore(input.shareability),
    attentionCompetitors: input.attentionCompetitors?.length
      ? input.attentionCompetitors
      : ["street motion", "storefront signage"],
  };
}

export function normalizeAgentReports(
  input: AgentVisionReportInput[] | undefined,
  vision: VisionReportInput,
): AgentVisionReportInput[] {
  const reports = (input ?? [])
    .filter((report) => report.displayName || report.profile || report.verdict || report.remembered)
    .slice(0, 8)
    .map((report, index) => ({
      id: report.id ?? `agent-${index + 1}`,
      displayName: report.displayName || `Agent ${index + 1}`,
      profile: report.profile || "Synthetic pedestrian",
      businessName: report.businessName,
      fitScore: clampOptionalScore(report.fitScore),
      source: report.source,
      distanceM: Number.isFinite(report.distanceM) ? report.distanceM : undefined,
      angleOffCenterDeg: Number.isFinite(report.angleOffCenterDeg) ? report.angleOffCenterDeg : undefined,
      visibility: clampOptionalScore(report.visibility),
      recall: clampOptionalScore(report.recall),
      timeToNoticeMs: Number.isFinite(report.timeToNoticeMs) ? report.timeToNoticeMs : report.timeToNoticeMs ?? null,
      verdict: report.verdict,
      remembered: report.remembered,
      motivation: report.motivation,
      objection: report.objection,
      nextQuestion: report.nextQuestion,
      chatMessage: report.chatMessage,
      imageUrl: report.imageUrl,
      heatmapImageUrl: report.heatmapImageUrl,
      eyeScanImageUrl: report.eyeScanImageUrl,
      proofLevel: report.proofLevel ?? "modeled",
    }));

  if (reports.length) return reports;

  return [
    {
      id: "aggregate-agent-vision",
      displayName: "Aggregate pedestrian model",
      profile: "Synthetic viewer group",
      visibility: vision.visibility,
      recall: vision.recall,
      timeToNoticeMs: vision.timeToNoticeMs,
      verdict: vision.verdict,
      remembered: vision.critique,
      proofLevel: "modeled",
    },
  ];
}

export function defaultBillboard(opportunity: ReportOpportunity, purchaseUrl?: string): BillboardPlacementInput {
  return {
    id: "OB-DEMO-001",
    location: `${opportunity.area} primary board`,
    address: `${opportunity.area}, San Francisco, CA`,
    lat: 37.780133756,
    lng: -122.39674369,
    visibilityScore: Math.max(68, clampScore(opportunity.score) - 7),
    dwellSeconds: 14,
    prominenceScore: Math.max(60, clampScore(opportunity.score) - 12),
    inventoryStatus: "Inquiry required",
    purchaseUrl,
    seller: "Seller connection pending",
    format: "Static out-of-home billboard",
    dimensions: "Seller-provided",
    facing: "Field verification required",
    rateCard: "Rate card seller-confirmed",
    estimatedCpm: "Estimated CPM seller-confirmed",
    availability: "Availability seller-confirmed",
    lighting: "Lighting seller-confirmed",
    mediaType: "Static",
    restrictions: "Restrictions seller-confirmed",
    bookingContact: "Booking contact seller-confirmed",
    details: [
      "Selected as the top board inside the hotspot for demo packaging.",
      "Availability, price, dimensions, and seller booking link must be confirmed before purchase.",
    ],
  };
}

export function defaultTargets(opportunity: ReportOpportunity, brief: CompanyBrief): TargetAccountInput[] {
  const matched = opportunity.matchedBusinesses?.length
    ? opportunity.matchedBusinesses.slice(0, 6)
    : [
        { name: "Quantcast", type: "Advertising technology", reason: "B2B technology office signal" },
        { name: "Cobalt AI", type: "AI security", reason: "technical buyer signal" },
        { name: "Upwork", type: "Marketplace software", reason: "large local tech workforce" },
      ];

  return matched.map((business, index) => ({
    company: business.name,
    category: business.type,
    whyMatched: `${business.reason}; relevant to ${brief.audience.description}`,
    suggestedContacts: index % 2 === 0
      ? ["Head of Growth", "VP Marketing", "Workplace Experience"]
      : ["Founder", "Head of People", "Product Lead"],
    localSignal: `${business.name} appears in the selected hotspot context.`,
    priority: index < 2 ? "A" : index < 5 ? "B" : "C",
    proofLevel: "grounded",
  }));
}

export function defaultCampaignWindow(generatedAt: string): CampaignWindow {
  const base = new Date(generatedAt);
  const day = Number.isFinite(base.getTime()) ? base : new Date();
  return {
    preLaunchDate: addDays(day, 7),
    launchDate: addDays(day, 14),
    endDate: addDays(day, 28),
    postCampaignDate: addDays(day, 31),
  };
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
