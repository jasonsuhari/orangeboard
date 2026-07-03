/* Facade for the campaign package report. The implementation lives in
   `app/lib/campaignReport/`; this file keeps the existing import path and
   public API stable. */

export type {
  ProofLevel,
  ReportOpportunity,
  BillboardPlacementInput,
  VisionReportInput,
  AgentVisionReportInput,
  TargetAccountInput,
  CampaignWindow,
  CampaignReportInput,
  ReportMetric,
  OutboundEmail,
  CampaignPackageReport,
} from "./campaignReport/types";
export { makeCampaignReport, makeSampleCampaignReport } from "./campaignReport/report";
export { renderCampaignReportMarkdown } from "./campaignReport/markdown";
export { renderCampaignReportHtml } from "./campaignReport/html";
