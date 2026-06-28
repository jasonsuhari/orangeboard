import type { AttentionSimResult, CompanyBrief } from "./types";
import { billboardSvgDataUrl } from "./creative";

export type ProofLevel = "grounded" | "modeled" | "demo";

export interface ReportOpportunity {
  id?: string;
  title: string;
  kind: string;
  area: string;
  timing: string;
  summary: string;
  accounts: number;
  events: number;
  placements: number;
  score: number;
  creativeAngle: string;
  icpFit?: string;
  matchReasons?: string[];
  matchedBusinesses?: Array<{
    name: string;
    type: string;
    reason: string;
    website?: string | null;
  }>;
}

export interface BillboardPlacementInput {
  id: string;
  location: string;
  address: string;
  lat: number;
  lng: number;
  visibilityScore: number;
  dwellSeconds: number;
  prominenceScore?: number;
  inventoryStatus?: string;
  purchaseUrl?: string;
  seller?: string;
  format?: string;
  dimensions?: string;
  facing?: string;
  rateCard?: string;
  estimatedCpm?: string;
  availability?: string;
  lighting?: string;
  mediaType?: string;
  restrictions?: string;
  bookingContact?: string;
  weeklyImpressions?: number;
  details?: string[];
}

export interface VisionReportInput {
  visibility: number;
  recall: number;
  glanceability: number;
  shareability: number;
  timeToNoticeMs?: number | null;
  noticedBy?: number;
  totalViewers?: number;
  regionShare?: number;
  attentionCompetitors?: string[];
  verdict: string;
  critique: string;
}

export interface AgentVisionReportInput {
  id?: string;
  displayName: string;
  profile: string;
  businessName?: string;
  fitScore?: number;
  source?: string;
  distanceM?: number;
  angleOffCenterDeg?: number;
  visibility?: number;
  recall?: number;
  timeToNoticeMs?: number | null;
  verdict?: string;
  remembered?: string;
  motivation?: string;
  objection?: string;
  nextQuestion?: string;
  chatMessage?: string;
  imageUrl?: string;
  heatmapImageUrl?: string;
  eyeScanImageUrl?: string;
  proofLevel?: ProofLevel;
}

export interface TargetAccountInput {
  company: string;
  category: string;
  whyMatched: string;
  suggestedContacts: string[];
  localSignal: string;
  priority: "A" | "B" | "C";
  proofLevel?: ProofLevel;
}

export interface CampaignWindow {
  preLaunchDate: string;
  launchDate: string;
  endDate: string;
  postCampaignDate: string;
}

export interface CampaignReportInput {
  brief: CompanyBrief;
  opportunity: ReportOpportunity;
  selectedBillboard?: BillboardPlacementInput;
  vision?: AttentionSimResult | VisionReportInput;
  agentReports?: AgentVisionReportInput[];
  targetAccounts?: TargetAccountInput[];
  purchaseUrl?: string;
  generatedAt?: string;
  campaignWindow?: CampaignWindow;
}

export interface ReportMetric {
  label: string;
  value: string;
  proofLevel: ProofLevel;
  note: string;
}

export interface OutboundEmail {
  stage: "pre-campaign" | "during-campaign" | "post-campaign";
  timing: string;
  subject: string;
  preview: string;
  body: string;
  cta: string;
}

export interface CampaignPackageReport {
  reportId: string;
  generatedAt: string;
  campaignName: string;
  advertiser: {
    name: string;
    url: string;
    industry: string;
    coreMessage: string;
    creativeDirection: string;
  };
  executiveSummary: {
    headline: string;
    recommendation: string;
    whyNow: string;
    primaryRisk: string;
  };
  icp: {
    description: string;
    buyingContext: string;
    matchedSignals: string[];
  };
  hotspot: {
    title: string;
    area: string;
    timing: string;
    score: number;
    summary: string;
    reasons: string[];
  };
  placement: {
    id: string;
    location: string;
    address: string;
    coordinates: { lat: number; lng: number };
    purchaseUrl: string;
    inventoryStatus: string;
    seller: string;
    format: string;
    dimensions: string;
    facing: string;
    rateCard: string;
    estimatedCpm: string;
    availability: string;
    lighting: string;
    mediaType: string;
    restrictions: string;
    bookingContact: string;
    details: string[];
  };
  creativePackage: {
    mockupUrl: string | null;
    angle: string;
    message: string;
    copyGuidance: string[];
  };
  agentVision: {
    verdict: string;
    critique: string;
    metrics: ReportMetric[];
    attentionCompetitors: string[];
  };
  agentReports: AgentVisionReportInput[];
  targetIcpList: TargetAccountInput[];
  outboundSequence: OutboundEmail[];
  proofLedger: Array<{
    label: string;
    proofLevel: ProofLevel;
    description: string;
  }>;
  nextSteps: string[];
  markdown: string;
}

const DEFAULT_PURCHASE_URL = "https://www.google.com/maps/search/?api=1&query=37.780133756,-122.39674369";

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

export function renderCampaignReportMarkdown(report: CampaignPackageReport): string {
  const topTargets = report.targetIcpList
    .map((target) => `| ${target.priority} | ${target.company} | ${target.category} | ${target.whyMatched} | ${target.suggestedContacts.join(", ")} |`)
    .join("\n");
  const metrics = report.agentVision.metrics
    .map((metric) => `| ${metric.label} | ${metric.value} | ${metric.proofLevel} | ${metric.note} |`)
    .join("\n");
  const agentReportDetails = report.agentReports
    .map((agent) => [
      `### ${agent.displayName}`,
      `Profile: ${agent.profile}${agent.businessName ? ` at ${agent.businessName}` : ""}`,
      typeof agent.fitScore === "number" ? `Fit: ${agent.fitScore}/100` : "",
      typeof agent.visibility === "number" ? `Visibility: ${agent.visibility}/100` : "",
      typeof agent.recall === "number" ? `Recall: ${agent.recall}/100` : "",
      agent.timeToNoticeMs == null ? "" : `Time to notice: ${(agent.timeToNoticeMs / 1000).toFixed(1)}s`,
      agent.verdict ? `Verdict: ${agent.verdict}` : "",
      agent.remembered ? `Remembered: ${agent.remembered}` : "",
      agent.objection ? `Objection: ${agent.objection}` : "",
      agent.nextQuestion ? `Next question: ${agent.nextQuestion}` : "",
      agent.chatMessage ? `Agent note: ${agent.chatMessage}` : "",
    ].filter(Boolean).join("\n"))
    .join("\n\n");
  const sequence = report.outboundSequence
    .map((email) => [
      `### ${titleCase(email.stage)}: ${email.subject}`,
      `Timing: ${email.timing}`,
      "",
      email.body,
      "",
      `CTA: ${email.cta}`,
    ].join("\n"))
    .join("\n\n");
  const ledger = report.proofLedger
    .map((item) => `- ${item.label} (${item.proofLevel}): ${item.description}`)
    .join("\n");
  const nextSteps = report.nextSteps.map((step) => `- ${step}`).join("\n");

  return [
    `# ${report.campaignName}`,
    "",
    `Generated: ${report.generatedAt.slice(0, 10)}  `,
    `Report ID: ${report.reportId}`,
    "",
    "## Executive summary",
    "",
    `**${report.executiveSummary.headline}**`,
    "",
    report.executiveSummary.recommendation,
    "",
    `Why now: ${report.executiveSummary.whyNow}`,
    "",
    `Risk to confirm: ${report.executiveSummary.primaryRisk}`,
    "",
    "## Creative brief and ICP",
    "",
    `Advertiser: ${report.advertiser.name} (${report.advertiser.industry})  `,
    `Core message: ${report.advertiser.coreMessage}  `,
    `Creative direction: ${report.advertiser.creativeDirection}`,
    "",
    `ICP: ${report.icp.description}`,
    "",
    `Matched signals: ${report.icp.matchedSignals.join("; ")}`,
    "",
    "## Hotspot",
    "",
    `Hotspot: ${report.hotspot.title}  `,
    `Area: ${report.hotspot.area}  `,
    `Timing: ${report.hotspot.timing}  `,
    `Fit score: ${report.hotspot.score}/100`,
    "",
    report.hotspot.summary,
    "",
    "## Billboard package",
    "",
    `Placement: ${report.placement.location}  `,
    `Address: ${report.placement.address}  `,
    `Inventory status: ${report.placement.inventoryStatus}  `,
    `Owner / seller: ${report.placement.seller}  `,
    `Format: ${report.placement.format}  `,
    `Media type: ${report.placement.mediaType}  `,
    `Dimensions: ${report.placement.dimensions}  `,
    `Facing: ${report.placement.facing}  `,
    `Lighting: ${report.placement.lighting}  `,
    `Rate card: ${report.placement.rateCard}  `,
    `Estimated CPM: ${report.placement.estimatedCpm}  `,
    `Availability: ${report.placement.availability}  `,
    `Restrictions: ${report.placement.restrictions}  `,
    `Booking contact: ${report.placement.bookingContact}  `,
    `Purchase / inquiry link: ${report.placement.purchaseUrl}`,
    "",
    report.placement.details.map((detail) => `- ${detail}`).join("\n"),
    "",
    "## Agent vision report",
    "",
    report.agentVision.verdict,
    "",
    `Creative critique: ${report.agentVision.critique}`,
    "",
    "| Metric | Value | Proof | Note |",
    "| --- | ---: | --- | --- |",
    metrics,
    "",
    `Attention competitors: ${report.agentVision.attentionCompetitors.join(", ")}`,
    "",
    agentReportDetails,
    "",
    "## Target ICP list",
    "",
    "| Priority | Account | Category | Why matched | Suggested contacts |",
    "| --- | --- | --- | --- | --- |",
    topTargets,
    "",
    "## Outbound sequence",
    "",
    sequence,
    "",
    "## Proof ledger",
    "",
    ledger,
    "",
    "## Next steps",
    "",
    nextSteps,
  ].join("\n");
}

export function renderCampaignReportHtml(report: CampaignPackageReport): string {
  const metricCards = report.agentVision.metrics
    .map(
      (metric) => `
        <article class="metric-card">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(metric.value)}</strong>
          <p>${escapeHtml(metric.note)}</p>
        </article>
      `,
    )
    .join("");
  const targetRows = report.targetIcpList
    .map(
      (target) => `
        <tr>
          <td><span class="priority priority-${target.priority.toLowerCase()}">${escapeHtml(target.priority)}</span></td>
          <td>
            <strong>${escapeHtml(target.company)}</strong>
            <small>${escapeHtml(target.category)}</small>
          </td>
          <td>${escapeHtml(target.whyMatched)}</td>
          <td>${escapeHtml(target.suggestedContacts.join(", "))}</td>
        </tr>
      `,
    )
    .join("");
  const outbound = report.outboundSequence
    .map(
      (email) => `
        <article class="email-card">
          <div>
            <span class="stage">${escapeHtml(titleCase(email.stage))}</span>
            <span class="timing">${escapeHtml(email.timing)}</span>
          </div>
          <h3>${escapeHtml(email.subject)}</h3>
          <p class="preview">${escapeHtml(email.preview)}</p>
          <pre>${escapeHtml(email.body)}</pre>
          <p class="cta">CTA: ${escapeHtml(email.cta)}</p>
        </article>
      `,
    )
    .join("");
  const agentReports = report.agentReports
    .map((agent) => {
      const image = agent.heatmapImageUrl ?? agent.imageUrl ?? agent.eyeScanImageUrl;
      const stats = [
        typeof agent.fitScore === "number" ? `<span>Fit <strong>${agent.fitScore}/100</strong></span>` : "",
        typeof agent.visibility === "number" ? `<span>Visibility <strong>${agent.visibility}/100</strong></span>` : "",
        typeof agent.recall === "number" ? `<span>Recall <strong>${agent.recall}/100</strong></span>` : "",
        agent.timeToNoticeMs == null ? "" : `<span>Notice <strong>${(agent.timeToNoticeMs / 1000).toFixed(1)}s</strong></span>`,
      ].filter(Boolean).join("");
      const context = [
        agent.businessName ? `Business: ${agent.businessName}` : "",
        typeof agent.distanceM === "number" ? `Distance: ${Math.round(agent.distanceM)}m` : "",
        typeof agent.angleOffCenterDeg === "number" ? `Angle: ${agent.angleOffCenterDeg.toFixed(0)} deg off-center` : "",
      ].filter(Boolean).join(" / ");

      return `
        <article class="agent-report-card">
          ${image ? `<img class="agent-report-media" src="${escapeAttr(image)}" alt="Agent vision heatmap" />` : ""}
          <div class="agent-report-body">
            <div class="agent-report-head">
              <div>
                <span class="stage">${escapeHtml(agent.proofLevel ?? "modeled")}</span>
                <h3>${escapeHtml(agent.displayName)}</h3>
              </div>
              <small>${escapeHtml(agent.profile)}</small>
            </div>
            ${context ? `<p class="agent-context">${escapeHtml(context)}</p>` : ""}
            ${stats ? `<div class="agent-stats">${stats}</div>` : ""}
            ${agent.verdict ? `<p><strong>Verdict:</strong> ${escapeHtml(agent.verdict)}</p>` : ""}
            ${agent.remembered ? `<p><strong>Remembered:</strong> ${escapeHtml(agent.remembered)}</p>` : ""}
            ${agent.motivation ? `<p><strong>Motivation:</strong> ${escapeHtml(agent.motivation)}</p>` : ""}
            ${agent.objection ? `<p><strong>Objection:</strong> ${escapeHtml(agent.objection)}</p>` : ""}
            ${agent.nextQuestion ? `<p><strong>Next question:</strong> ${escapeHtml(agent.nextQuestion)}</p>` : ""}
            ${agent.chatMessage ? `<blockquote>${escapeHtml(agent.chatMessage)}</blockquote>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
  const details = report.placement.details
    .map((detail) => `<li>${escapeHtml(detail)}</li>`)
    .join("");
  const signals = report.icp.matchedSignals
    .map((signal) => `<span>${escapeHtml(signal)}</span>`)
    .join("");
  const reasons = report.hotspot.reasons
    .map((reason) => `<li>${escapeHtml(reason)}</li>`)
    .join("");
  const proof = report.proofLedger
    .map(
      (item) => `
        <li>
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.proofLevel)}</span>
          <p>${escapeHtml(item.description)}</p>
        </li>
      `,
    )
    .join("");
  const nextSteps = report.nextSteps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.campaignName)}</title>
  <style>
    @page { size: Letter; margin: 0.35in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f3f0e8;
      color: #111111;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.35;
    }
    a { color: #c2410c; text-decoration: none; word-break: break-all; }
    .doc { max-width: 8.5in; margin: 0 auto; }
    .sheet {
      min-height: 10.3in;
      padding: 0.16in 0.08in 0.04in;
      break-after: page;
    }
    .sheet:last-child { break-after: auto; }
    .hero {
      overflow: hidden;
      border: 1px solid #1f1f1f;
      border-radius: 22px;
      background: #0f1115;
      color: #ffffff;
      box-shadow: 0 24px 60px rgba(17, 17, 17, 0.18);
    }
    .hero-top {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      min-height: 390px;
    }
    .hero-copy {
      padding: 34px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background:
        linear-gradient(135deg, rgba(249, 115, 22, 0.2), transparent 45%),
        #111111;
    }
    .eyebrow, .stage {
      color: #f97316;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    h1 {
      margin: 12px 0 0;
      font-size: 40px;
      line-height: 0.95;
      letter-spacing: 0;
    }
    .hero-copy p { color: rgba(255, 255, 255, 0.74); font-size: 13px; }
    .report-id { color: rgba(255, 255, 255, 0.48); font-size: 11px; }
    .mockup-wrap {
      padding: 34px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0)),
        radial-gradient(circle at 90% 10%, rgba(249,115,22,0.28), transparent 34%);
    }
    .mockup-frame {
      border-radius: 16px;
      padding: 16px 16px 34px;
      background: linear-gradient(180deg, #2a2a2a, #151515);
      box-shadow: 0 18px 36px rgba(0,0,0,0.38);
      position: relative;
    }
    .mockup-frame:before, .mockup-frame:after {
      content: "";
      position: absolute;
      bottom: -78px;
      width: 16px;
      height: 80px;
      background: #2d2d2d;
    }
    .mockup-frame:before { left: 26%; }
    .mockup-frame:after { right: 26%; }
    .mockup-frame img {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: 10px;
      background: #f97316;
    }
    .mockup-caption {
      margin-top: 14px;
      color: rgba(255,255,255,0.7);
      font-size: 12px;
    }
    .hero-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-top: 1px solid rgba(255,255,255,0.12);
    }
    .hero-stats div { padding: 18px 22px; border-right: 1px solid rgba(255,255,255,0.12); }
    .hero-stats div:last-child { border-right: 0; }
    .hero-stats span { color: rgba(255,255,255,0.45); display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; }
    .hero-stats strong { display: block; margin-top: 6px; font-size: 22px; }
    .grid { display: grid; gap: 16px; }
    .grid-two { grid-template-columns: 1.1fr 0.9fr; }
    .panel {
      border: 1px solid #ded8ce;
      border-radius: 16px;
      background: rgba(255,255,255,0.88);
      padding: 20px;
      box-shadow: 0 12px 30px rgba(44, 39, 32, 0.06);
    }
    .panel.dark { background: #111111; color: #ffffff; border-color: #111111; }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
      letter-spacing: 0;
    }
    h3 { margin: 0; font-size: 15px; }
    p { margin: 0; }
    .summary {
      margin-top: 10px;
      color: #4f4a44;
      font-size: 13px;
    }
    .recommendation {
      padding: 16px;
      border-radius: 12px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      font-size: 13px;
      color: #43230b;
    }
    .pill-row { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
    .pill-row span {
      border-radius: 999px;
      background: #f4f4f5;
      border: 1px solid #e4e4e7;
      padding: 5px 8px;
      color: #3f3f46;
      font-size: 10px;
      font-weight: 700;
    }
    .placement-grid { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 16px; }
    .map-card {
      min-height: 240px;
      border-radius: 14px;
      background:
        linear-gradient(90deg, transparent 0 46%, rgba(255,255,255,0.65) 46% 53%, transparent 53%),
        linear-gradient(22deg, transparent 0 42%, rgba(255,255,255,0.7) 42% 49%, transparent 49%),
        linear-gradient(155deg, transparent 0 54%, rgba(255,255,255,0.58) 54% 60%, transparent 60%),
        #dfe5dc;
      border: 1px solid #cbd5c0;
      position: relative;
      overflow: hidden;
    }
    .map-card:after {
      content: "";
      position: absolute;
      left: 50%;
      top: 48%;
      width: 88px;
      height: 56px;
      transform: translate(-50%, -50%) rotate(-8deg);
      border-radius: 52% 48% 57% 43%;
      background: rgba(249,115,22,0.28);
      border: 1px solid rgba(249,115,22,0.7);
      box-shadow: 0 0 0 16px rgba(249,115,22,0.08);
    }
    .pin {
      position: absolute;
      left: 50%;
      top: 48%;
      transform: translate(-50%, -50%);
      z-index: 2;
      border-radius: 999px;
      background: #f97316;
      color: white;
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 900;
      border: 3px solid white;
      box-shadow: 0 10px 22px rgba(0,0,0,0.2);
    }
    .fact-list { display: grid; gap: 8px; margin-top: 12px; }
    .fact-list div {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 10px;
      padding: 9px 0;
      border-bottom: 1px solid #ece7df;
      font-size: 12px;
    }
    .fact-list span { color: #706b65; }
    ul.clean { margin: 12px 0 0; padding: 0 0 0 18px; color: #4f4a44; font-size: 12px; }
    ul.clean li { margin-bottom: 6px; }
    .dark ul.clean { color: rgba(255,255,255,0.78); }
    .metric-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .metric-card {
      border: 1px solid #e3ded6;
      border-radius: 14px;
      background: #ffffff;
      padding: 12px;
      min-height: 126px;
    }
    .metric-card span { color: #6b6258; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .metric-card strong { display: block; margin-top: 8px; font-size: 23px; color: #111111; }
    .metric-card p { margin-top: 8px; color: #5c5650; font-size: 10.5px; }
    .agent-report-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .agent-report-card {
      break-inside: avoid;
      border: 1px solid #e3ded6;
      border-radius: 16px;
      background: #ffffff;
      overflow: hidden;
    }
    .agent-report-media {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      background: #f4f4f5;
      border-bottom: 1px solid #ece7df;
    }
    .agent-report-body { padding: 14px; display: grid; gap: 8px; }
    .agent-report-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .agent-report-head small { color: #706b65; font-size: 10px; text-align: right; max-width: 42%; }
    .agent-context { color: #706b65; font-size: 10.5px; }
    .agent-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .agent-stats span { border-radius: 10px; background: #f7f4ef; padding: 7px; color: #706b65; font-size: 9px; text-transform: uppercase; font-weight: 800; }
    .agent-stats strong { display: block; margin-top: 2px; color: #111111; font-size: 13px; }
    .agent-report-body p { color: #3d3935; font-size: 11px; }
    .agent-report-body blockquote { margin: 0; border-left: 3px solid #f97316; padding-left: 10px; color: #4f4a44; font-size: 11px; }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border-radius: 14px;
      border: 1px solid #e3ded6;
      background: white;
      font-size: 11px;
    }
    th {
      background: #111111;
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    td {
      border-top: 1px solid #ece7df;
      padding: 10px;
      vertical-align: top;
      color: #3d3935;
    }
    td strong { display: block; color: #111111; font-size: 12px; }
    td small { display: block; margin-top: 2px; color: #766f68; }
    .priority {
      display: inline-grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 900;
      color: white;
    }
    .priority-a { background: #f97316; }
    .priority-b { background: #2563eb; }
    .priority-c { background: #52525b; }
    .email-grid { display: grid; gap: 14px; }
    .email-card {
      break-inside: avoid;
      border: 1px solid #e3ded6;
      border-radius: 16px;
      background: #ffffff;
      padding: 16px;
    }
    .email-card > div {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
    }
    .timing { color: #706b65; font-size: 10px; font-weight: 700; }
    .preview { margin-top: 5px; color: #706b65; font-size: 11px; }
    pre {
      margin: 12px 0 0;
      white-space: pre-wrap;
      font-family: inherit;
      color: #2b2926;
      font-size: 11.5px;
      line-height: 1.42;
    }
    .cta {
      margin-top: 12px;
      padding: 8px 10px;
      border-radius: 10px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 11px;
      font-weight: 800;
    }
    .proof-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; list-style: none; margin: 0; padding: 0; }
    .proof-list li { border: 1px solid #e3ded6; border-radius: 12px; padding: 12px; background: white; }
    .proof-list strong { display: block; font-size: 12px; }
    .proof-list span { display: inline-block; margin-top: 5px; color: #047857; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .proof-list p { margin-top: 6px; color: #5f5952; font-size: 10.5px; }
    .footer-note { margin-top: 12px; color: #746c63; font-size: 10px; }
  </style>
</head>
<body>
  <main class="doc">
    <section class="sheet">
      <div class="hero">
        <div class="hero-top">
          <div class="hero-copy">
            <div>
              <span class="eyebrow">Orangeboard Campaign Package</span>
              <h1>${escapeHtml(report.campaignName)}</h1>
              <p>${escapeHtml(report.executiveSummary.headline)}</p>
            </div>
            <div>
              <p class="report-id">Generated ${escapeHtml(formatDate(report.generatedAt))} / ${escapeHtml(report.reportId)}</p>
            </div>
          </div>
          <div class="mockup-wrap">
            <div class="mockup-frame">
              ${report.creativePackage.mockupUrl ? `<img src="${escapeAttr(report.creativePackage.mockupUrl)}" alt="Campaign billboard mockup" />` : ""}
            </div>
            <p class="mockup-caption">${escapeHtml(report.creativePackage.angle)}</p>
          </div>
        </div>
        <div class="hero-stats">
          <div><span>Hotspot score</span><strong>${report.hotspot.score}/100</strong></div>
          <div><span>Placement</span><strong>${escapeHtml(report.placement.id)}</strong></div>
          <div><span>Targets</span><strong>${report.targetIcpList.length}</strong></div>
          <div><span>Sequence</span><strong>${report.outboundSequence.length} emails</strong></div>
        </div>
      </div>
    </section>

    <section class="sheet grid">
      <div class="grid grid-two">
        <article class="panel">
          <h2>Executive Summary</h2>
          <div class="recommendation">${escapeHtml(report.executiveSummary.recommendation)}</div>
          <p class="summary">${escapeHtml(report.executiveSummary.whyNow)}</p>
          <p class="summary"><strong>Risk to confirm:</strong> ${escapeHtml(report.executiveSummary.primaryRisk)}</p>
        </article>
        <article class="panel">
          <h2>ICP Fit</h2>
          <p class="summary">${escapeHtml(report.icp.description)}</p>
          <div class="pill-row">${signals}</div>
        </article>
      </div>

      <div class="placement-grid">
        <article class="map-card">
          <span class="pin">${escapeHtml(report.placement.id.slice(0, 4))}</span>
        </article>
        <article class="panel">
          <h2>Billboard Package</h2>
          <div class="fact-list">
            <div><span>Location</span><strong>${escapeHtml(report.placement.location)}</strong></div>
            <div><span>Address</span><strong>${escapeHtml(report.placement.address)}</strong></div>
            <div><span>Status</span><strong>${escapeHtml(report.placement.inventoryStatus)}</strong></div>
            <div><span>Coordinates</span><strong>${report.placement.coordinates.lat.toFixed(6)}, ${report.placement.coordinates.lng.toFixed(6)}</strong></div>
            <div><span>Owner / seller</span><strong>${escapeHtml(report.placement.seller)}</strong></div>
            <div><span>Format</span><strong>${escapeHtml(report.placement.format)}</strong></div>
            <div><span>Media type</span><strong>${escapeHtml(report.placement.mediaType)}</strong></div>
            <div><span>Dimensions</span><strong>${escapeHtml(report.placement.dimensions)}</strong></div>
            <div><span>Facing</span><strong>${escapeHtml(report.placement.facing)}</strong></div>
            <div><span>Lighting</span><strong>${escapeHtml(report.placement.lighting)}</strong></div>
            <div><span>Rate card</span><strong>${escapeHtml(report.placement.rateCard)}</strong></div>
            <div><span>Estimated CPM</span><strong>${escapeHtml(report.placement.estimatedCpm)}</strong></div>
            <div><span>Availability</span><strong>${escapeHtml(report.placement.availability)}</strong></div>
            <div><span>Restrictions</span><strong>${escapeHtml(report.placement.restrictions)}</strong></div>
            <div><span>Booking contact</span><strong>${escapeHtml(report.placement.bookingContact)}</strong></div>
            <div><span>Purchase link</span><strong><a href="${escapeAttr(report.placement.purchaseUrl)}">${escapeHtml(report.placement.purchaseUrl)}</a></strong></div>
          </div>
          <ul class="clean">${details}</ul>
        </article>
      </div>

      <article class="panel">
        <h2>Hotspot Rationale</h2>
        <p class="summary">${escapeHtml(report.hotspot.summary)}</p>
        <ul class="clean">${reasons}</ul>
      </article>
    </section>

    <section class="sheet grid">
      <article class="panel">
        <h2>Agent Vision Reports</h2>
        <p class="summary">${escapeHtml(report.agentVision.verdict)}</p>
        <p class="summary"><strong>Creative critique:</strong> ${escapeHtml(report.agentVision.critique)}</p>
      </article>
      <div class="agent-report-grid">${agentReports}</div>
      <div class="metric-grid">${metricCards}</div>
      <article class="panel">
        <h2>Target ICP List</h2>
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Account</th>
              <th>Why matched</th>
              <th>Suggested contacts</th>
            </tr>
          </thead>
          <tbody>${targetRows}</tbody>
        </table>
      </article>
    </section>

    <section class="sheet grid">
      <article class="panel">
        <h2>Outbound Sequence</h2>
        <div class="email-grid">${outbound}</div>
      </article>
      <div class="grid grid-two">
        <article class="panel">
          <h2>Proof Ledger</h2>
          <ul class="proof-list">${proof}</ul>
        </article>
        <article class="panel dark">
          <h2>Next Steps</h2>
          <ul class="clean">${nextSteps}</ul>
          <p class="footer-note">All claims are carried with proof levels in the structured campaign package.</p>
        </article>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function normalizeVision(
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

function normalizeAgentReports(
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

function buildOutboundSequence(
  brief: CompanyBrief,
  opportunity: ReportOpportunity,
  placement: BillboardPlacementInput,
  targets: TargetAccountInput[],
  window: CampaignWindow,
): OutboundEmail[] {
  const topTarget = targets[0]?.company ?? "your team";
  const area = opportunity.area;
  const brand = brief.identity.companyName;
  const message = brief.campaign.coreMessage.replace(/\.$/, "");
  const role = targets[0]?.suggestedContacts[0] ?? "growth lead";

  return [
    {
      stage: "pre-campaign",
      timing: `${window.preLaunchDate}, 5-7 business days before posting`,
      subject: `${brand} is going up near ${area}`,
      preview: `A heads-up before the local activation starts near ${topTarget}.`,
      body: [
        `Hi {{first_name}},`,
        "",
        `Next week, ${brand} is testing a physical campaign around ${area} because the surrounding account mix lines up with teams like ${topTarget}.`,
        "",
        `The board is built around one message: "${message}." We are using the placement as a local signal for teams already working near this corridor, not as a generic brand splash.`,
        "",
        `Worth comparing notes with the ${role} on your side before it goes live?`,
      ].join("\n"),
      cta: "Book a 15-minute pre-launch walkthrough",
    },
    {
      stage: "during-campaign",
      timing: `${window.launchDate} through ${window.endDate}`,
      subject: `You may see this on ${placement.location}`,
      preview: `The campaign is live in the corridor we mapped to your ICP.`,
      body: [
        `Hi {{first_name}},`,
        "",
        `${brand}'s ${area} activation is now live. The placement was selected because the hotspot showed ${opportunity.accounts} matched account or context signals and a strong visibility profile for short commuter exposures.`,
        "",
        `If you pass through ${placement.location}, the creative should land quickly: ${message}.`,
        "",
        `I can send the board mockup and the agent vision report if that would be useful.`,
      ].join("\n"),
      cta: "Send the mockup and visibility report",
    },
    {
      stage: "post-campaign",
      timing: `${window.postCampaignDate}, 2-3 business days after the run`,
      subject: `What the ${area} test showed`,
      preview: `A concise recap with mockup, visibility read, and next corridor options.`,
      body: [
        `Hi {{first_name}},`,
        "",
        `We wrapped the ${brand} activation around ${area} and packaged the placement proof: board mockup, agent vision read, account-context list, and the next corridors worth testing.`,
        "",
        `The useful takeaway is not vanity impressions. It is whether a physical touchpoint can warm the exact accounts your team wants to reach before sales follows up.`,
        "",
        `Should I send the recap and the next two recommended placements?`,
      ].join("\n"),
      cta: "Send the campaign recap",
    },
  ];
}

function defaultBillboard(opportunity: ReportOpportunity, purchaseUrl?: string): BillboardPlacementInput {
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

function defaultTargets(opportunity: ReportOpportunity, brief: CompanyBrief): TargetAccountInput[] {
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

function defaultCampaignWindow(generatedAt: string): CampaignWindow {
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

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampOptionalScore(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? clampScore(value) : undefined;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function stableId(parts: string[]): string {
  const input = parts.join("|").toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `obr-${(hash >>> 0).toString(36)}`;
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stripFinalPunctuation(value: string): string {
  return value.trim().replace(/[.!?]+$/, "");
}

function reportMockupUrl(brief: CompanyBrief): string {
  const url = brief.media?.imageUrl;
  if (url && (/^(data:|https?:)/i.test(url))) return url;
  return billboardSvgDataUrl(brief);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

const SAMPLE_BRIEF: CompanyBrief = {
  url: "https://getfluent.tech/",
  identity: {
    companyName: "Fluent",
    industry: "Accessibility Technology",
    description: "Fluent is an AI agent that lets people operate a computer through flexible input methods.",
    brandAdjectives: ["inclusive", "practical", "empowering"],
    tagline: "Your computer, your way.",
  },
  visualSystem: {
    primaryColor: "#070708",
    fonts: ["Helvetica Neue"],
    styleReference: "quiet enterprise accessibility with Microsoft Surface restraint",
    avoidList: ["busy UI collages", "tiny text", "medicalized accessibility tropes"],
  },
  campaign: {
    coreMessage: "Transform how you interact with technology.",
    offerOrHook: "Accessible AI control for every workflow.",
    callToAction: "Book a demo",
    campaignObjective: "awareness",
  },
  audience: {
    description: "Operations, product, workplace, and accessibility leaders at technology companies with distributed teams.",
    tone: "clear, useful, and human",
    contextWhenSeen: "walking",
  },
  media: {
    imageUrl: "/brief-cache/getfluent.tech.png",
    prompt: "Cached demo creative for Fluent.",
    source: "cache",
    model: "gpt-image-2",
  },
};

const SAMPLE_OPPORTUNITY: ReportOpportunity = {
  id: "cluster-yc-soma",
  title: "4th & Brannan Tech Access Cluster",
  kind: "Account concentration",
  area: "SoMa / 4th Street",
  timing: "Lunch and evening foot traffic",
  summary: "A dense technology and professional-services corridor near YC, Brannan, Townsend, and Caltrain approaches.",
  accounts: 18,
  events: 2,
  placements: 4,
  score: 91,
  creativeAngle: "Your computer, your way - seen by the teams building the next generation of work tools.",
  icpFit: "Strong fit for workplace, product, accessibility, and operations leaders inside a walkable SoMa tech cluster.",
  matchReasons: [
    "B2B technology office signal",
    "workplace/accessibility buyer adjacency",
    "commute and lunch-path repeat exposure",
  ],
  matchedBusinesses: [
    { name: "Quantcast", type: "Advertising technology", reason: "B2B technology office signal", website: "https://www.quantcast.com/" },
    { name: "Cobalt AI", type: "AI security", reason: "technical buyer signal", website: "https://www.cobaltai.com/" },
    { name: "Sapling", type: "HR software", reason: "people-ops buyer adjacency", website: "https://www.saplinghr.com/" },
    { name: "Casetext", type: "Legal technology", reason: "knowledge-work automation signal", website: "https://casetext.com/" },
    { name: "Upwork", type: "Marketplace software", reason: "distributed-work relevance", website: "https://www.upwork.com/" },
    { name: "HoneyBook", type: "Business software", reason: "operations workflow relevance", website: "https://www.honeybook.com/" },
  ],
};

const SAMPLE_BILLBOARD: BillboardPlacementInput = {
  id: "ORIG787",
  location: "4th Street near Brannan",
  address: "Near 548 4th St, San Francisco, CA",
  lat: 37.780133756,
  lng: -122.39674369,
  visibilityScore: 86,
  dwellSeconds: 18,
  prominenceScore: 81,
  inventoryStatus: "Permitted inventory; seller inquiry required",
  purchaseUrl: DEFAULT_PURCHASE_URL,
  seller: "OOH seller / owner to confirm",
  format: "Static roadside billboard",
  dimensions: "Seller-provided",
  facing: "Field verification required",
  rateCard: "Est. $7.5k-$18k / 4 weeks",
  estimatedCpm: "Est. $8-$18 CPM",
  availability: "Inquire - permitted inventory; open flight dates seller-confirmed",
  lighting: "Static face; lighting seller-confirmed",
  mediaType: "Static",
  restrictions: "SF GASP permit terms, owner approval, creative specs, and regulated-category restrictions must be verified before booking",
  bookingContact: "Seller inquiry required via SF GASP permit record",
  weeklyImpressions: undefined,
  details: [
    "Closest demo board to the YC / 4th Street tech corridor.",
    "Good fit for pedestrian and vehicle approaches through SoMa.",
    "Use as an inquiry-ready placement until marketplace booking metadata is connected.",
  ],
};

const SAMPLE_VISION: VisionReportInput = {
  visibility: 86,
  recall: 78,
  glanceability: 82,
  shareability: 64,
  timeToNoticeMs: 1100,
  noticedBy: 3,
  totalViewers: 4,
  regionShare: 0.22,
  attentionCompetitors: ["turning vehicles", "storefront signage", "intersection movement"],
  verdict: "The board is strong enough for a proof campaign: the panel sits in a busy field of view but still wins early attention for most synthetic viewers.",
  critique: "Use a single high-contrast headline and leave the product explanation for the landing page or follow-up email.",
};

const SAMPLE_TARGETS: TargetAccountInput[] = [
  {
    company: "Quantcast",
    category: "Advertising technology",
    whyMatched: "Large local tech office with marketing, product, and workplace leaders who understand workflow tooling.",
    suggestedContacts: ["VP People", "Head of Product", "Workplace Experience"],
    localSignal: "Office appears inside the selected SoMa hotspot.",
    priority: "A",
    proofLevel: "grounded",
  },
  {
    company: "Cobalt AI",
    category: "AI security",
    whyMatched: "AI-native company with operational teams likely to care about human-computer workflows.",
    suggestedContacts: ["COO", "Head of People", "Product Lead"],
    localSignal: "AI company signal near the board.",
    priority: "A",
    proofLevel: "grounded",
  },
  {
    company: "Sapling",
    category: "HR software",
    whyMatched: "People-ops adjacency makes accessibility and workplace productivity messaging relevant.",
    suggestedContacts: ["Head of People", "Partnerships", "Growth"],
    localSignal: "People-ops software context near the activation area.",
    priority: "B",
    proofLevel: "grounded",
  },
  {
    company: "Upwork",
    category: "Work marketplace",
    whyMatched: "Distributed-work audience with a natural need for flexible computer interaction.",
    suggestedContacts: ["Workplace", "Product Marketing", "Accessibility Program Lead"],
    localSignal: "Distributed-work company appears in the hotspot data.",
    priority: "B",
    proofLevel: "grounded",
  },
];
