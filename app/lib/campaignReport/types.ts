import type { AttentionSimResult, CompanyBrief } from "../types";

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
