import type { CompanyBrief } from "../types";
import type {
  BillboardPlacementInput,
  ReportOpportunity,
  TargetAccountInput,
  VisionReportInput,
} from "./types";
import { DEFAULT_PURCHASE_URL } from "./fallbacks";

export const SAMPLE_BRIEF: CompanyBrief = {
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
};

export const SAMPLE_OPPORTUNITY: ReportOpportunity = {
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

export const SAMPLE_BILLBOARD: BillboardPlacementInput = {
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

export const SAMPLE_VISION: VisionReportInput = {
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

export const SAMPLE_TARGETS: TargetAccountInput[] = [
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
