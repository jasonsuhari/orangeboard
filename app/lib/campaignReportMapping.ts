import type { AgentVisionReportInput, TargetAccountInput, VisionReportInput } from "./campaignReport";
import type { AttentionSimResult, CompanyBrief } from "./types";
import type { CampaignPedestrianContext } from "./pedestrianIcp";
import type { Billboard, CampaignLaunch } from "./billboardModel";
import type { CrowdAgent } from "../components/crowdLayers";
import type { JournalPage } from "../components/map/journalTypes";

function isReportImageUrl(url: string | undefined): url is string {
  return Boolean(url && /^(data:|https?:)/i.test(url));
}

export function withReportCreative(brief: CompanyBrief, creativeUrl: string): CompanyBrief {
  const imageUrl = isReportImageUrl(creativeUrl)
    ? creativeUrl
    : isReportImageUrl(brief.media?.imageUrl)
      ? brief.media.imageUrl
      : undefined;

  return {
    ...brief,
    media: imageUrl
      ? {
          imageUrl,
          prompt: brief.media?.prompt ?? `Billboard creative for ${brief.identity.companyName}.`,
          source: imageUrl.startsWith("data:image/svg") ? "svg" : brief.media?.source ?? "openai",
          model: brief.media?.model,
        }
      : undefined,
  };
}

export function buildFallbackCampaignBrief(
  context: CampaignPedestrianContext | null,
  billboard: Billboard,
  launch: CampaignLaunch | null,
): CompanyBrief {
  const area = context?.area ?? launch?.opportunity?.area ?? "San Francisco";
  const companyName = context?.companyName ?? "Orangeboard campaign";
  const audience = context?.icp ?? "Matched local accounts and high-fit pedestrians around the selected billboard.";
  const message = context?.title
    ? `${context.title} near ${area}.`
    : `Reach high-fit buyers near ${billboard.name}.`;

  return {
    url: "",
    identity: {
      companyName,
      industry: "B2B campaign",
      description: `${companyName} campaign package for ${billboard.name}.`,
      brandAdjectives: ["local", "targeted", "measurable"],
      tagline: message,
    },
    visualSystem: {
      primaryColor: "#111827",
      secondaryColor: "#f97316",
      styleReference: "High-contrast outdoor creative with minimal copy.",
    },
    campaign: {
      coreMessage: message,
      offerOrHook: context?.icpFit ?? `Physical ABM activation in ${area}.`,
      callToAction: "Book a walkthrough",
      campaignObjective: "awareness",
    },
    audience: {
      description: audience,
      tone: "direct and useful",
      contextWhenSeen: "walking",
    },
  };
}

export function billboardPlacementFromMapState(billboard: Billboard) {
  return {
    id: billboard.id,
    location: billboard.name,
    address: billboard.address,
    lat: billboard.lat,
    lng: billboard.lng,
    visibilityScore: 82,
    dwellSeconds: 14,
    prominenceScore: 78,
    inventoryStatus: billboard.status,
    purchaseUrl: billboard.purchaseUrl,
    seller: billboard.seller,
    format: billboard.format,
    dimensions: billboard.dimensions,
    facing: billboard.facing,
    rateCard: billboard.rateCard,
    estimatedCpm: billboard.estimatedCpm,
    availability: billboard.availability,
    lighting: billboard.lighting,
    mediaType: billboard.mediaType,
    restrictions: billboard.restrictions,
    bookingContact: billboard.bookingContact,
    details: [
      "Selected from the live Orangeboard map state.",
      "Mockup uses the current generated creative in the map preview when available.",
      "Purchase, pricing, dimensions, restrictions, and availability should be seller-confirmed before booking.",
    ],
  };
}

export function targetAccountsFromMapState(
  context: CampaignPedestrianContext | null,
  agents: CrowdAgent[],
  brief: CompanyBrief,
): TargetAccountInput[] {
  const targets: TargetAccountInput[] = [];
  const seen = new Set<string>();
  const addTarget = (company: string | undefined, category: string | undefined, whyMatched: string | undefined, localSignal: string | undefined) => {
    const cleaned = company?.trim();
    if (!cleaned || seen.has(cleaned.toLowerCase())) return;
    seen.add(cleaned.toLowerCase());
    const index = targets.length;
    targets.push({
      company: cleaned,
      category: category?.trim() || "ICP account signal",
      whyMatched: whyMatched?.trim() || `Relevant to ${brief.audience.description}`,
      suggestedContacts: index % 2 === 0
        ? ["Head of Growth", "VP Marketing", "Revenue Operations"]
        : ["Founder", "Head of Operations", "Workplace Experience"],
      localSignal: localSignal?.trim() || `${cleaned} appears in the selected campaign area.`,
      priority: index < 2 ? "A" : index < 5 ? "B" : "C",
      proofLevel: "grounded",
    });
  };

  for (const business of context?.businesses ?? []) {
    addTarget(
      business.name,
      business.type,
      business.reason,
      `${business.name} is part of the selected ${context?.area ?? "campaign"} hotspot.`,
    );
  }

  for (const agent of agents) {
    if (!agent.isIcp) continue;
    addTarget(
      agent.businessName ?? agent.profileLabel,
      "Observed ICP pedestrian",
      agent.fitScore ? `Synthetic pedestrian scored ${agent.fitScore}/100 for the ICP.` : "Synthetic pedestrian matched the ICP profile.",
      agent.businessName
        ? `${agent.businessName} generated an ICP pedestrian in the simulation.`
        : "ICP pedestrian appeared in the live simulation.",
    );
    if (targets.length >= 12) break;
  }

  return targets.slice(0, 12);
}

export function reportOpportunityFromMapState(
  context: CampaignPedestrianContext | null,
  launch: CampaignLaunch | null,
  billboard: Billboard,
  brief: CompanyBrief,
  targets: TargetAccountInput[],
) {
  const area = (context?.area ?? launch?.opportunity?.area ?? billboard.address) || "San Francisco";
  const title = context?.title ?? launch?.opportunity?.title ?? `${billboard.name} campaign`;
  const matchedBusinesses = (context?.businesses ?? []).map((business) => ({
    name: business.name,
    type: business.type ?? "ICP account signal",
    reason: business.reason ?? `Relevant to ${brief.audience.description}`,
    website: business.website,
  }));

  return {
    id: context?.opportunityId ?? launch?.opportunity?.id ?? billboard.id,
    title,
    kind: context?.kind ?? "Map-selected campaign",
    area,
    timing: "Current map simulation window",
    summary: context?.icpFit ?? `${billboard.name} is packaged for a local physical ABM campaign around ${area}.`,
    accounts: Math.max(targets.length, matchedBusinesses.length, 1),
    events: 0,
    placements: 1,
    score: Math.max(72, Math.min(96, Math.round((targets.length ? 80 + Math.min(targets.length, 8) * 2 : 82)))),
    creativeAngle: brief.campaign.coreMessage,
    icpFit: context?.icpFit,
    matchReasons: context?.matchReasons?.length
      ? context.matchReasons
      : [
          `${targets.length || matchedBusinesses.length || 1} target ICP/account signals in the campaign context`,
          `Selected board: ${billboard.name}`,
        ],
    matchedBusinesses,
  };
}

export function visionReportFromJournalPages(pages: JournalPage[], billboard: Billboard): VisionReportInput {
  const results = pages.map((page) => page.result).filter((result): result is AttentionSimResult => Boolean(result));
  if (!results.length) {
    return {
      visibility: 82,
      recall: 72,
      glanceability: 78,
      shareability: 62,
      timeToNoticeMs: null,
      noticedBy: 0,
      totalViewers: 0,
      regionShare: undefined,
      verdict: `Agent vision reports are pending for ${billboard.name}.`,
      critique: "Run the pedestrian vision journal to capture modeled pedestrian-level observations.",
      attentionCompetitors: ["street motion", "nearby signage", "traffic"],
    };
  }

  const avg = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1));
  const streetResults = results.map((result) => result.street).filter(Boolean);
  const noticeTimes = streetResults
    .map((street) => street?.timeToNoticeMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const regionShares = streetResults
    .map((street) => street?.regionShare)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    visibility: avg(results.map((result) => result.scores.visibility)),
    recall: avg(results.map((result) => result.scores.recall)),
    glanceability: avg(results.map((result) => result.scores.glanceability)),
    shareability: avg(results.map((result) => result.scores.shareability)),
    timeToNoticeMs: noticeTimes.length ? Math.round(noticeTimes.reduce((sum, value) => sum + value, 0) / noticeTimes.length) : null,
    noticedBy: streetResults.reduce((sum, street) => sum + (street?.noticedBy ?? 0), 0),
    totalViewers: streetResults.reduce((sum, street) => sum + (street?.total ?? 0), 0),
    regionShare: regionShares.length ? regionShares.reduce((sum, value) => sum + value, 0) / regionShares.length : undefined,
    verdict: results[0]?.verdict ?? `Agent vision report generated for ${billboard.name}.`,
    critique: results[0]?.perception.critique ?? "Modeled pedestrian attention from the current map journal.",
    attentionCompetitors: dedupeStrings(
      pages.flatMap((page) =>
        (page.elements ?? [])
          .filter((element) => !element.isBillboard)
          .map((element) => element.label),
      ),
    ).slice(0, 5),
  };
}

export function agentReportsFromJournalPages(pages: JournalPage[]): AgentVisionReportInput[] {
  return pages
    .filter((page) => page.result || page.agent || page.agentError)
    .slice(0, 8)
    .map((page, index) => ({
      id: page.id,
      displayName: page.agent?.displayName ?? page.profile.label ?? `Pedestrian agent ${index + 1}`,
      profile: [page.profile.role, page.profile.company ?? page.profile.businessType].filter(Boolean).join(" / ") || page.profile.label,
      businessName: page.profile.businessName ?? page.profile.company,
      fitScore: page.profile.fitScore,
      source: page.profile.source,
      distanceM: page.capture.distanceM,
      angleOffCenterDeg: page.capture.angleOffCenterDeg,
      visibility: page.result?.scores.visibility,
      recall: page.result?.scores.recall,
      timeToNoticeMs: page.result?.street?.timeToNoticeMs ?? null,
      verdict: page.result?.verdict ?? page.error ?? page.agentError,
      remembered: page.agent?.remembered ?? page.result?.perception.fiveSecondMemory,
      motivation: page.agent?.motivation,
      objection: page.agent?.objection,
      nextQuestion: page.agent?.nextQuestion,
      chatMessage: page.agent?.chatMessage,
      imageUrl: page.cleanImageUrl,
      heatmapImageUrl: page.heatmapImageUrl ?? page.imageUrl,
      eyeScanImageUrl: page.eyeScanImageUrl,
      proofLevel: "modeled",
    }));
}

export function campaignReportDownloadName(response: Response, fallback: string): string {
  const disposition = response.headers.get("content-disposition");
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  if (match?.[1]) return match[1];
  const slug = fallback
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "campaign-package"}.pdf`;
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
