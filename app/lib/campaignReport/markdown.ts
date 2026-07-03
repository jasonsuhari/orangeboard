import type { CampaignPackageReport } from "./types";
import { titleCase } from "./format";

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
