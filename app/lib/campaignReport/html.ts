import type { CampaignPackageReport } from "./types";
import { escapeAttr, escapeHtml, formatDate, titleCase } from "./format";
import { REPORT_STYLES } from "./reportStyles";

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
${REPORT_STYLES}
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
