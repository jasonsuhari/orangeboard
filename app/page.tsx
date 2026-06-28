"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Opportunity as ApiOpportunity } from "./api/opportunities/route";
import type { OutboundBrand, OutboundResponse } from "./api/outbound/route";
import OutboundWorkflow, { type OutboundSeedRow } from "./components/OutboundWorkflow";
import type { CompanyBrief } from "./lib/types";
import { buildCampaignPedestrianContext, PEDESTRIAN_CONTEXT_STORAGE_KEY } from "./lib/pedestrianIcp";

type Stage = "accounts" | "boards" | "creative" | "outbound";
type FlowStep = "blob" | "billboard" | "creative" | "preview";
type CreativeGenerationStatus = "idle" | "generating" | "done" | "error";

type GeneratedCreative = {
  imageUrl: string;
  source: string;
  prompt?: string;
  model?: string;
};

const CREATIVE_KEY = "vs:creative";
const CAMPAIGN_BLOB_KEY = "orangeboard:campaign-blob";
const CAMPAIGN_LAUNCH_KEY = "orangeboard:campaign-launch";

type BoardOption = {
  id: string;
  location: string;
  address: string;
  lat: number;
  lng: number;
  visibility: "High" | "Medium" | "Low";
  visibilityScore: number;
  dwell: string;
  dwellSeconds: number;
  note: string;
  x: string;
  y: string;
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
  fitScore?: number;
};

type RankedBoardOption = BoardOption & {
  fit: number;
  accounts: number;
};

type CampaignOpportunity = {
  id: string;
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
  outboundHook: string;
  icpFit?: string;
  matchReasons?: string[];
  matchedBusinesses?: Array<{
    name: string;
    type: string;
    reason: string;
    website?: string | null;
    lng?: number;
    lat?: number;
  }>;
  billboards?: BoardOption[];
  centroid?: {
    lng: number;
    lat: number;
  };
  radiusM?: number;
  blob: {
    left: string;
    top: string;
    width: number;
    height: number;
    rotate: string;
    radius: string;
  };
};

const stages: Array<{ id: Stage; label: string }> = [
  { id: "accounts", label: "Accounts" },
  { id: "boards", label: "Boards" },
  { id: "creative", label: "Creative" },
  { id: "outbound", label: "Outbound" },
];

const BASE_BUYING_FIELDS: Pick<
  BoardOption,
  "rateCard" | "estimatedCpm" | "availability" | "lighting" | "mediaType" | "restrictions" | "bookingContact"
> = {
  rateCard: "Est. $7.5k-$18k / 4 weeks",
  estimatedCpm: "Est. $8-$18 CPM",
  availability: "Inquire - permitted inventory; open flight dates seller-confirmed",
  lighting: "Static face; lighting seller-confirmed",
  mediaType: "Static",
  restrictions: "SF GASP permit terms, owner approval, creative specs, and regulated-category restrictions must be verified before booking",
  bookingContact: "Seller inquiry required via SF GASP permit record",
};

const opportunities: CampaignOpportunity[] = [
  {
    id: "soma-finance",
    title: "SoMa SaaS Finance Cluster",
    kind: "Account concentration",
    area: "4th St near Caltrain",
    timing: "Morning commute",
    summary: "Dense SaaS and fintech office cluster with repeat commute exposure.",
    accounts: 31,
    events: 2,
    placements: 4,
    score: 96,
    creativeAngle: "Finance teams should close month before the ride home.",
    outboundHook: "We are running a local finance-ops campaign around your SoMa team.",
    matchReasons: ["primary Tech & SaaS match", "finance-ops buyer signal", "commute density"],
    matchedBusinesses: [
      { name: "Northstar Ledger", type: "Series B SaaS", reason: "finance ops hiring signal" },
      { name: "Atlas Workflow", type: "B2B software", reason: "controller and ops adjacency" },
      { name: "Mergebase", type: "API platform", reason: "scaling technical team" },
      { name: "Pillar Systems", type: "Enterprise SaaS", reason: "operations expansion" },
    ],
    blob: {
      left: "51%",
      top: "48%",
      width: 168,
      height: 112,
      rotate: "-8deg",
      radius: "54% 46% 58% 42% / 48% 55% 45% 52%",
    },
  },
  {
    id: "dreamforce-cfo",
    title: "Dreamforce CFO Blitz",
    kind: "Local event",
    area: "Moscone Center",
    timing: "Event week",
    summary: "Finance leaders and RevOps teams cluster around Moscone during sessions.",
    accounts: 47,
    events: 5,
    placements: 8,
    score: 92,
    creativeAngle: "Built for finance leaders scaling on Salesforce.",
    outboundHook: "We are activating around Dreamforce for finance leaders in your segment.",
    matchReasons: ["event-week finance audience", "RevOps buyer signal", "SaaS concentration"],
    matchedBusinesses: [
      { name: "Moscone SaaS Attendees", type: "Event audience", reason: "Salesforce ecosystem density" },
      { name: "CFO Roundtable", type: "Finance leaders", reason: "finance executive event signal" },
      { name: "Cloud GTM Teams", type: "SaaS operators", reason: "RevOps and revenue teams nearby" },
    ],
    blob: {
      left: "36%",
      top: "34%",
      width: 154,
      height: 126,
      rotate: "11deg",
      radius: "45% 55% 43% 57% / 58% 43% 57% 42%",
    },
  },
  {
    id: "fidi-conquest",
    title: "FiDi Competitor Conquest",
    kind: "Competitor corridor",
    area: "Market St and FiDi",
    timing: "Weekday lunch",
    summary: "Target accounts and competitor offices overlap near high-footfall corridors.",
    accounts: 24,
    events: 1,
    placements: 5,
    score: 88,
    creativeAngle: "Outgrow the spend stack your competitor still uses.",
    outboundHook: "We noticed your team is in the FiDi corridor we are activating this week.",
    matchReasons: ["competitor corridor", "B2B office/context signal", "weekday lunch traffic"],
    matchedBusinesses: [
      { name: "Pillar Systems", type: "Enterprise SaaS", reason: "target account office signal" },
      { name: "Apex Spend", type: "Finance software", reason: "competitive category adjacency" },
      { name: "Meridian Ops", type: "Professional services", reason: "B2B operator density" },
    ],
    blob: {
      left: "63%",
      top: "31%",
      width: 146,
      height: 104,
      rotate: "6deg",
      radius: "60% 40% 50% 50% / 42% 50% 50% 58%",
    },
  },
  {
    id: "mission-hiring",
    title: "Mission Hiring Signal",
    kind: "Talent and recruiting",
    area: "Mission corridor",
    timing: "Evening foot traffic",
    summary: "Startup employees and engineering candidates concentrate near transit and venues.",
    accounts: 18,
    events: 3,
    placements: 3,
    score: 81,
    creativeAngle: "Build the finance stack before the team doubles.",
    outboundHook: "Your hiring motion suggests this local expansion campaign may be relevant.",
    matchReasons: ["people/talent buyer signal", "startup hiring context", "evening foot traffic"],
    matchedBusinesses: [
      { name: "Forge Talent", type: "Recruiting", reason: "people-ops adjacency" },
      { name: "Atlas Workflow", type: "B2B software", reason: "headcount growth signal" },
      { name: "Mission Startup Offices", type: "Startup cluster", reason: "engineering and ops audience" },
    ],
    blob: {
      left: "67%",
      top: "66%",
      width: 134,
      height: 98,
      rotate: "-15deg",
      radius: "48% 52% 59% 41% / 51% 45% 55% 49%",
    },
  },
];

const baseBoards: BoardOption[] = [
  {
    id: "ORIG787",
    location: "539 Bryant St",
    address: "539 Bryant St, San Francisco, CA",
    lat: 37.780133756000055,
    lng: -122.39674369,
    visibility: "High",
    visibilityScore: 86,
    dwell: "18s",
    dwellSeconds: 18,
    note: "Permitted SF GASP sign near the 4th and Brannan tech corridor.",
    x: "54%",
    y: "47%",
    purchaseUrl: accelaUrl("00DS0"),
    inventoryStatus: "SF GASP Permitted",
    seller: "SF Planning inventory record; media owner to confirm",
    format: "General Advertising Signs (GAS)",
    dimensions: "Seller-provided",
    facing: "Field verification required",
    ...BASE_BUYING_FIELDS,
    details: [
      "SF GASP record ORIG787.",
      "City photo reference: ORIG787_03.JPG.",
      "Buying fields are estimated from permit metadata and must be confirmed before purchase.",
    ],
  },
  {
    id: "ORIG764",
    location: "425 04th St",
    address: "425 04th St, San Francisco, CA",
    lat: 37.78093914400006,
    lng: -122.39883562899996,
    visibility: "Medium",
    visibilityScore: 80,
    dwell: "14s",
    dwellSeconds: 14,
    note: "Permitted 4th Street sign inside the SoMa office and commute cluster.",
    x: "53%",
    y: "46%",
    purchaseUrl: accelaUrl("00DRM"),
    inventoryStatus: "SF GASP Permitted",
    seller: "SF Planning inventory record; media owner to confirm",
    format: "General Advertising Signs (GAS)",
    dimensions: "Seller-provided",
    facing: "Field verification required",
    ...BASE_BUYING_FIELDS,
    details: [
      "SF GASP record ORIG764.",
      "Inventory note: GA Sign located at 425 04th St.",
      "Buying fields are estimated from permit metadata and must be confirmed before purchase.",
    ],
  },
  {
    id: "ORIG790",
    location: "560 Brannan St",
    address: "560 Brannan St, San Francisco, CA",
    lat: 37.77747872900005,
    lng: -122.39818992399995,
    visibility: "Medium",
    visibilityScore: 76,
    dwell: "11s",
    dwellSeconds: 11,
    note: "Permitted Brannan Street sign with strong local B2B proximity.",
    x: "53%",
    y: "49%",
    purchaseUrl: accelaUrl("00DS3"),
    inventoryStatus: "SF GASP Permitted",
    seller: "SF Planning inventory record; media owner to confirm",
    format: "General Advertising Signs (GAS)",
    dimensions: "Seller-provided",
    facing: "Field verification required",
    ...BASE_BUYING_FIELDS,
    details: [
      "SF GASP record ORIG790.",
      "Closest fallback board for Brannan Street activation planning.",
      "Buying fields are estimated from permit metadata and must be confirmed before purchase.",
    ],
  },
];

const accounts = [
  {
    name: "Northstar Ledger",
    segment: "Series B SaaS",
    area: "SoMa",
    fit: 94,
    signal: "Hiring finance ops",
  },
  {
    name: "Atlas Workflow",
    segment: "B2B software",
    area: "4th & King",
    fit: 91,
    signal: "New controller role",
  },
  {
    name: "Mergebase",
    segment: "API platform",
    area: "Caltrain",
    fit: 88,
    signal: "Headcount growth",
  },
  {
    name: "Pillar Systems",
    segment: "Enterprise SaaS",
    area: "FiDi",
    fit: 84,
    signal: "Ops expansion",
  },
];

type BlobBusiness = NonNullable<CampaignOpportunity["matchedBusinesses"]>[number];

function blobBusinesses(opportunity: CampaignOpportunity, limit: number | null = 4): BlobBusiness[] {
  const businesses = opportunity.matchedBusinesses?.length
    ? opportunity.matchedBusinesses
    : accounts.map((account) => ({
        name: account.name,
        type: account.segment,
        reason: account.signal,
      }));

  return limit == null ? businesses : businesses.slice(0, limit);
}

function blobSignals(opportunity: CampaignOpportunity, limit = 3): string[] {
  const signals = opportunity.matchReasons?.length
    ? opportunity.matchReasons
    : [opportunity.kind, opportunity.timing, opportunity.icpFit].filter((value): value is string => Boolean(value));
  return signals.slice(0, limit);
}

const defaultBriefText =
  "Ramp-style finance operations platform with a direct, high-trust voice. Use crisp copy, strong contrast, and proof-driven language. The outdoor creative should feel native to the local commute context, not like a generic brand ad.";

const defaultIcpText =
  "Series B-C SaaS finance teams in San Francisco. Prioritize CFOs, controllers, RevOps, and finance operations leaders at 50-500 person companies with hiring, headcount growth, or spend-management complexity.";

const SF_BOUNDS = {
  west: -122.515,
  east: -122.355,
  south: 37.708,
  north: 37.815,
};

const blobRadii = [
  "54% 46% 58% 42% / 48% 55% 45% 52%",
  "45% 55% 43% 57% / 58% 43% 57% 42%",
  "60% 40% 50% 50% / 42% 50% 50% 58%",
  "48% 52% 59% 41% / 51% 45% 55% 49%",
  "56% 44% 47% 53% / 46% 59% 41% 54%",
  "43% 57% 55% 45% / 54% 47% 53% 46%",
  "52% 48% 42% 58% / 50% 44% 56% 50%",
  "47% 53% 61% 39% / 44% 56% 49% 51%",
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function accelaUrl(capID3: string): string {
  return `https://aca-prod.accela.com/ccsf/Cap/CapDetail.aspx?Module=Planning&TabName=Planning&capID1=15CAP&capID2=00000&capID3=${capID3}&agencyCode=CCSF`;
}

function mapPoint(lng: number, lat: number): { x: string; y: string } {
  const x = ((lng - SF_BOUNDS.west) / (SF_BOUNDS.east - SF_BOUNDS.west)) * 100;
  const y = (1 - (lat - SF_BOUNDS.south) / (SF_BOUNDS.north - SF_BOUNDS.south)) * 100;
  return {
    x: `${clamp(x, 8, 92).toFixed(1)}%`,
    y: `${clamp(y, 10, 88).toFixed(1)}%`,
  };
}

function percentNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hashUnit(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    hash >>>= 0;
  }
  return hash / 0xffffffff;
}

function accountPinPoint(
  opportunity: CampaignOpportunity,
  account: BlobBusiness,
  index: number,
  total: number,
): { x: string; y: string } {
  const key = `${account.name}-${account.type}-${index}`;
  const angle = hashUnit(key) * Math.PI * 2;
  const ring = 1 + (index % 4) * 0.45;

  if (typeof account.lng === "number" && typeof account.lat === "number") {
    const point = mapPoint(account.lng, account.lat);
    const x = percentNumber(point.x, 50);
    const y = percentNumber(point.y, 50);
    return {
      x: `${clamp(x + Math.cos(angle) * ring, 8, 92).toFixed(1)}%`,
      y: `${clamp(y + Math.sin(angle) * ring, 10, 88).toFixed(1)}%`,
    };
  }

  const centerX = percentNumber(opportunity.blob.left, 50);
  const centerY = percentNumber(opportunity.blob.top, 50);
  const spreadX = clamp(opportunity.blob.width / 28, 3, 7);
  const spreadY = clamp(opportunity.blob.height / 28, 2.5, 5.5);
  const radiusScale = total > 1 ? 0.45 + (index % 5) * 0.14 : 0;

  return {
    x: `${clamp(centerX + Math.cos(angle) * spreadX * radiusScale, 8, 92).toFixed(1)}%`,
    y: `${clamp(centerY + Math.sin(angle) * spreadY * radiusScale, 10, 88).toFixed(1)}%`,
  };
}

function downloadFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  if (match?.[1]) return match[1];
  const slug = fallback
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `${slug || "campaign-package"}.pdf`;
}

function toBoardOption(
  board: NonNullable<ApiOpportunity["billboards"]>[number],
): BoardOption {
  const point = mapPoint(board.lng, board.lat);
  return {
    id: board.id,
    location: board.location,
    address: board.address,
    lat: board.lat,
    lng: board.lng,
    visibility: board.visibility,
    visibilityScore: board.visibilityScore,
    dwell: `${board.dwellSeconds}s`,
    dwellSeconds: board.dwellSeconds,
    note: board.details[0] ?? `${board.location} matched this opportunity cluster.`,
    x: point.x,
    y: point.y,
    purchaseUrl: board.purchaseUrl,
    inventoryStatus: board.inventoryStatus,
    seller: board.seller,
    format: board.format,
    dimensions: board.dimensions,
    facing: board.facing,
    rateCard: board.rateCard,
    estimatedCpm: board.estimatedCpm,
    availability: board.availability,
    lighting: board.lighting,
    mediaType: board.mediaType,
    restrictions: board.restrictions,
    bookingContact: board.bookingContact,
    details: board.details,
    fitScore: board.fitScore,
  };
}

function campaignPolygonFor(opportunity: CampaignOpportunity, board: BoardOption): [number, number][] {
  const center = opportunity.centroid ?? { lng: board.lng, lat: board.lat };
  const radiusM = opportunity.radiusM ?? 360;
  const latMeters = 111320;
  const lngMeters = 111320 * Math.cos((center.lat * Math.PI) / 180);
  const points: [number, number][] = [];
  const segments = 28;

  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const eastM = Math.cos(angle) * radiusM * 1.15;
    const northM = Math.sin(angle) * radiusM * 0.82;
    points.push([
      center.lng + eastM / lngMeters,
      center.lat + northM / latMeters,
    ]);
  }

  points.push(points[0]);
  return points;
}

function buildBrief(companyName: string, creativeBrief: string, icp: string): CompanyBrief {
  return {
    url: "orangeboard://homepage",
    identity: {
      companyName,
      industry: "B2B software",
      description: creativeBrief,
      brandAdjectives: ["direct", "credible", "modern"],
      tagline: "Built for teams ready to scale",
    },
    visualSystem: {
      primaryColor: "#f97316",
      styleReference: "Clean enterprise campaign with strong contrast and minimal copy.",
    },
    campaign: {
      coreMessage: "Help scaling teams control spend before operational drag compounds.",
      offerOrHook: "Local campaign for high-intent accounts clustered nearby.",
      callToAction: "Book a demo",
      campaignObjective: "awareness",
    },
    audience: {
      description: icp,
      tone: "sharp and practical",
      contextWhenSeen: "mixed",
    },
  };
}

function toBlobOpportunity(api: ApiOpportunity, index: number): CampaignOpportunity {
  const x = ((api.centroid.lng - SF_BOUNDS.west) / (SF_BOUNDS.east - SF_BOUNDS.west)) * 100;
  const y = (1 - (api.centroid.lat - SF_BOUNDS.south) / (SF_BOUNDS.north - SF_BOUNDS.south)) * 100;
  const width = clamp(104 + (api.score - 60) * 1.2 + api.placements * 3, 100, 178);
  return {
    id: api.id,
    title: api.title,
    kind: api.kind,
    area: api.area,
    timing: api.timing,
    summary: api.summary,
    accounts: api.accounts,
    events: api.events,
    placements: api.placements,
    score: api.score,
    creativeAngle: api.creativeAngle,
    outboundHook: api.icpFit,
    icpFit: api.icpFit,
    matchReasons: api.matchReasons,
    matchedBusinesses: api.matchedBusinesses,
    billboards: api.billboards?.map(toBoardOption),
    centroid: api.centroid,
    radiusM: api.radiusM,
    blob: {
      left: `${clamp(x, 10, 90).toFixed(1)}%`,
      top: `${clamp(y, 12, 86).toFixed(1)}%`,
      width,
      height: Math.round(width * 0.68),
      rotate: `${((index * 17) % 31) - 15}deg`,
      radius: blobRadii[index % blobRadii.length],
    },
  };
}

export default function Home() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("boards");
  const [flowStep, setFlowStep] = useState<FlowStep>("blob");
  const [companyName] = useState("Ramp");
  const [creativeBrief] = useState(defaultBriefText);
  const [icp, setIcp] = useState(defaultIcpText);
  const [icpEditMode, setIcpEditMode] = useState(false);
  const [opportunityList, setOpportunityList] = useState<CampaignOpportunity[]>(opportunities);
  const [selectedOpportunity, setSelectedOpportunity] = useState(opportunities[0]);
  const [selectedBoardId, setSelectedBoardId] = useState(baseBoards[0].id);
  const [boardTouched, setBoardTouched] = useState(false);
  const [creativeDialogOpen, setCreativeDialogOpen] = useState(false);
  const [creativeStatus, setCreativeStatus] = useState<CreativeGenerationStatus>("idle");
  const [creativeResult, setCreativeResult] = useState<GeneratedCreative | null>(null);
  const [creativeError, setCreativeError] = useState<string | null>(null);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [outboundBrands, setOutboundBrands] = useState<OutboundBrand[] | null>(null);
  const [outboundLoading, setOutboundLoading] = useState(false);
  const [outboundError, setOutboundError] = useState<string | null>(null);
  const [outboundUnconfigured, setOutboundUnconfigured] = useState(false);

  const campaignBrief = useMemo(
    () => buildBrief(companyName, creativeBrief, icp),
    [companyName, creativeBrief, icp],
  );

  useEffect(() => {
    if (icpEditMode) {
      setOpportunitiesLoading(false);
      return;
    }
    const controller = new AbortController();
    setOpportunitiesLoading(true);

    fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(campaignBrief),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { opportunities?: ApiOpportunity[] } | null) => {
        if (!data?.opportunities?.length) return;
        const hydrated = data.opportunities.map(toBlobOpportunity);
        setOpportunityList(hydrated);
        setSelectedOpportunity(hydrated[0]);
        setSelectedBoardId(hydrated[0].billboards?.[0]?.id ?? baseBoards[0].id);
        setBoardTouched(false);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setOpportunityList(opportunities);
          setSelectedOpportunity(opportunities[0]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setOpportunitiesLoading(false);
      });

    return () => controller.abort();
  }, [campaignBrief, icpEditMode]);

  const stageIndex = useMemo(
    () => stages.findIndex((item) => item.id === stage),
    [stage]
  );

  const selectedOpportunityIndex = useMemo(() => {
    const index = opportunityList.findIndex((opportunity) => opportunity.id === selectedOpportunity.id);
    return index >= 0 ? index : 0;
  }, [opportunityList, selectedOpportunity.id]);

  function selectOpportunity(opportunity: CampaignOpportunity) {
    setSelectedOpportunity(opportunity);
    setSelectedBoardId(opportunity.billboards?.[0]?.id ?? baseBoards[0].id);
    setBoardTouched(false);
    setCreativeResult(null);
    setCreativeError(null);
    setFlowStep("billboard");
    setStage("boards");
  }

  function selectBoard(boardId: string) {
    setSelectedBoardId(boardId);
    setBoardTouched(true);
    setCreativeResult(null);
    setCreativeError(null);
    if (flowStep === "blob") setFlowStep("billboard");
    setStage("boards");
  }

  function stepOpportunity(direction: -1 | 1) {
    if (!opportunityList.length) return;

    const nextIndex = (selectedOpportunityIndex + direction + opportunityList.length) % opportunityList.length;
    selectOpportunity(opportunityList[nextIndex]);
  }

  function persistCampaignContext(opportunity: CampaignOpportunity) {
    try {
      localStorage.setItem(
        PEDESTRIAN_CONTEXT_STORAGE_KEY,
        JSON.stringify(buildCampaignPedestrianContext({ companyName, icp, opportunity })),
      );
    } catch {
      /* storage may be unavailable; the map falls back to ambient pedestrians */
    }
  }

  useEffect(() => {
    persistCampaignContext(selectedOpportunity);
  }, [companyName, icp, selectedOpportunity]);

  const boards = useMemo<RankedBoardOption[]>(
    () => {
      const source = selectedOpportunity.billboards?.length
        ? selectedOpportunity.billboards
        : baseBoards;
      return source.map((board, index) => ({
        ...board,
        fit: "fitScore" in board && typeof board.fitScore === "number"
          ? board.fitScore
          : Math.max(72, selectedOpportunity.score - index * 8),
        accounts: Math.max(3, selectedOpportunity.accounts - index * 3),
      }));
    },
    [selectedOpportunity]
  );

  const selectedBoard = boards.find((board) => board.id === selectedBoardId) ?? boards[0];

  const creativeVariants = useMemo(
    () => [
      selectedOpportunity.creativeAngle,
      `A local campaign for ${selectedOpportunity.area}.`,
      "Make the physical touchpoint feel familiar before sales follows up.",
    ],
    [selectedOpportunity]
  );

  const launchBrief = useMemo<CompanyBrief>(
    () => ({
      ...campaignBrief,
      identity: {
        ...campaignBrief.identity,
        description: `${creativeBrief} Place the message for ${selectedOpportunity.area} near ${selectedBoard.location}.`,
      },
      visualSystem: {
        ...campaignBrief.visualSystem,
        styleReference: `${campaignBrief.visualSystem.styleReference ?? ""} Billboard creative for ${selectedBoard.location}; readable from street view with minimal copy.`.trim(),
      },
      campaign: {
        ...campaignBrief.campaign,
        coreMessage: selectedOpportunity.creativeAngle,
        offerOrHook: selectedOpportunity.outboundHook,
        callToAction: campaignBrief.campaign.callToAction ?? "Book a demo",
      },
      audience: {
        ...campaignBrief.audience,
        description: `${icp} Local context: ${selectedOpportunity.timing} around ${selectedOpportunity.area}.`,
        contextWhenSeen: "mixed",
      },
    }),
    [campaignBrief, creativeBrief, icp, selectedOpportunity, selectedBoard],
  );

  const stagedOutboundRows = useMemo<OutboundSeedRow[]>(
    () =>
      blobBusinesses(selectedOpportunity, 3).map((account, index) => {
        const contactTitle = index === 0 ? "VP Finance" : index === 1 ? "Controller" : "Head of Ops";
        const hook =
          index === 0
            ? selectedOpportunity.outboundHook
            : `Your team is near our ${selectedOpportunity.area} activation.`;
        return {
          id: `${selectedOpportunity.id}:${account.name}`,
          account: account.name,
          domain: account.website ?? null,
          industry: account.type,
          contactTitle,
          hook,
          subject: `${companyName} near ${selectedOpportunity.area}`,
          pitch: [
            "Hi {{first_name}},",
            "",
            hook,
            "",
            `We selected ${selectedBoard.location} because the board sits in a cluster of ${selectedBoard.accounts} nearby ICP signals.`,
            "",
            "Worth seeing the mockup and visibility read?",
          ].join("\n"),
          source: "staged",
        };
      }),
    [companyName, selectedBoard.accounts, selectedBoard.location, selectedOpportunity],
  );

  const outboundSeedRows = useMemo<OutboundSeedRow[]>(
    () =>
      outboundBrands?.length
        ? outboundBrands.map((brand) => ({
            id: `${selectedOpportunity.id}:${brand.domain ?? brand.name}`,
            account: brand.name,
            domain: brand.domain,
            industry: brand.industry,
            employeeCount: brand.employeeCount,
            fundingSummary: brand.fundingSummary,
            contactName: brand.contact?.name,
            contactTitle: brand.contact?.title,
            email: brand.bestEmail,
            hook: brand.hook,
            subject: brand.pitch?.subjectLine,
            pitch: brand.pitch?.fullEmail,
            source: "live",
          }))
        : stagedOutboundRows,
    [outboundBrands, selectedOpportunity.id, stagedOutboundRows],
  );

  const outboundCampaignKey = useMemo(
    () => [companyName, selectedOpportunity.id, selectedBoard.id, icp.slice(0, 96)].join("|"),
    [companyName, icp, selectedBoard.id, selectedOpportunity.id],
  );

  const accountPins = useMemo(
    () => blobBusinesses(selectedOpportunity, null),
    [selectedOpportunity],
  );
  const boardsUnlocked = flowStep !== "blob";
  const canConfirmBoard = boardsUnlocked && boardTouched && !opportunitiesLoading && creativeStatus !== "generating";
  const generatedCreativeUrl = creativeResult?.imageUrl;

  // Fetched outbound is specific to one blob + board + ICP; clear it when any
  // of those change so the queue never shows stale matches.
  useEffect(() => {
    setOutboundBrands(null);
    setOutboundError(null);
    setOutboundUnconfigured(false);
  }, [selectedOpportunity.id, selectedBoardId, icp]);

  async function generateOutbound() {
    if (outboundLoading) return;
    setOutboundLoading(true);
    setOutboundError(null);
    setOutboundUnconfigured(false);

    try {
      const response = await fetch("/api/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          icp,
          opportunity: {
            title: selectedOpportunity.title,
            area: selectedOpportunity.area,
            kind: selectedOpportunity.kind,
            accounts: selectedOpportunity.accounts,
          },
          board: {
            location: selectedBoard.location,
            address: selectedBoard.address,
            lat: selectedBoard.lat,
            lng: selectedBoard.lng,
            visibilityScore: selectedBoard.visibilityScore,
            dwellSeconds: selectedBoard.dwellSeconds,
          },
        }),
      });

      const data = (await response.json()) as OutboundResponse;
      if (!data.configured) {
        setOutboundUnconfigured(true);
        return;
      }
      if (!response.ok || data.error) {
        throw new Error(data.error ?? `Outbound failed (${response.status})`);
      }
      setOutboundBrands(data.matched);
    } catch (err) {
      setOutboundError(err instanceof Error ? err.message : "Outbound failed");
    } finally {
      setOutboundLoading(false);
    }
  }

  function persistCampaignLaunch(creative: GeneratedCreative) {
    persistCampaignContext(selectedOpportunity);

    try {
      localStorage.setItem(
        CREATIVE_KEY,
        JSON.stringify({
          imageUrl: creative.imageUrl,
          company: companyName,
          source: creative.source,
        }),
      );
      localStorage.setItem(
        CAMPAIGN_BLOB_KEY,
        JSON.stringify(campaignPolygonFor(selectedOpportunity, selectedBoard)),
      );
      localStorage.setItem(
        CAMPAIGN_LAUNCH_KEY,
        JSON.stringify({
          mode: "preview",
          creativeUrl: creative.imageUrl,
          opportunity: {
            id: selectedOpportunity.id,
            title: selectedOpportunity.title,
            area: selectedOpportunity.area,
          },
          board: {
            id: selectedBoard.id,
            name: selectedBoard.location,
            address: selectedBoard.address,
            status: selectedBoard.inventoryStatus,
            lng: selectedBoard.lng,
            lat: selectedBoard.lat,
            seller: selectedBoard.seller,
            format: selectedBoard.format,
            dimensions: selectedBoard.dimensions,
            facing: selectedBoard.facing,
            rateCard: selectedBoard.rateCard,
            estimatedCpm: selectedBoard.estimatedCpm,
            availability: selectedBoard.availability,
            lighting: selectedBoard.lighting,
            mediaType: selectedBoard.mediaType,
            restrictions: selectedBoard.restrictions,
            bookingContact: selectedBoard.bookingContact,
            purchaseUrl: selectedBoard.purchaseUrl,
          },
        }),
      );
    } catch {
      /* storage may be unavailable; the map falls back to its default state */
    }
  }

  function openStreetPreview(creative: GeneratedCreative | null = creativeResult) {
    if (!creative) return;
    persistCampaignLaunch(creative);
    setFlowStep("preview");
    router.push("/map?mode=preview");
  }

  async function confirmBillboardSelection() {
    if (!boardTouched || creativeStatus === "generating") return;

    setFlowStep("creative");
    setStage("creative");
    setCreativeDialogOpen(true);
    setCreativeStatus("generating");
    setCreativeError(null);
    setCreativeResult(null);

    try {
      const response = await fetch("/api/generate-creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: launchBrief }),
      });
      const data = (await response.json()) as {
        imageUrl?: string;
        source?: string;
        prompt?: string;
        model?: string;
        error?: string;
      };
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error ?? "Could not generate creative");
      }

      const nextCreative: GeneratedCreative = {
        imageUrl: data.imageUrl,
        source: data.source ?? "svg",
        prompt: data.prompt,
        model: data.model,
      };
      setCreativeResult(nextCreative);
      setCreativeStatus("done");
      setFlowStep("preview");
      persistCampaignLaunch(nextCreative);
      window.setTimeout(() => openStreetPreview(nextCreative), 650);
    } catch (err) {
      setCreativeStatus("error");
      setCreativeError(err instanceof Error ? err.message : "Creative generation failed");
    }
  }

  async function exportCampaignPackage() {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    persistCampaignContext(selectedOpportunity);

    const targetAccounts = blobBusinesses(selectedOpportunity, 8).map((business, index) => ({
      company: business.name,
      category: business.type,
      whyMatched: `${business.reason}; relevant to ${icp}`,
      suggestedContacts: index % 2 === 0
        ? ["CFO", "VP Finance", "Controller"]
        : ["Head of Growth", "RevOps", "Founder"],
      localSignal: `${business.name} is part of the selected ${selectedOpportunity.area} hotspot context.`,
      priority: index < 2 ? "A" : index < 5 ? "B" : "C",
      proofLevel: "grounded",
    }));

    const details = [
      ...(selectedBoard.details ?? []),
      `Selected opportunity: ${selectedOpportunity.title}.`,
      `${selectedBoard.accounts} ICP-matched account signals near this board in the current export.`,
    ];

    try {
      const response = await fetch("/api/campaign-report?format=pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/pdf" },
        body: JSON.stringify({
          brief: campaignBrief,
          opportunity: {
            id: selectedOpportunity.id,
            title: selectedOpportunity.title,
            kind: selectedOpportunity.kind,
            area: selectedOpportunity.area,
            timing: selectedOpportunity.timing,
            summary: selectedOpportunity.summary,
            accounts: selectedOpportunity.accounts,
            events: selectedOpportunity.events,
            placements: selectedOpportunity.placements,
            score: selectedOpportunity.score,
            creativeAngle: selectedOpportunity.creativeAngle,
            icpFit: selectedOpportunity.icpFit,
            matchReasons: selectedOpportunity.matchReasons,
            matchedBusinesses: selectedOpportunity.matchedBusinesses,
          },
          selectedBillboard: {
            id: selectedBoard.id,
            location: selectedBoard.location,
            address: selectedBoard.address,
            lat: selectedBoard.lat,
            lng: selectedBoard.lng,
            visibilityScore: selectedBoard.visibilityScore,
            dwellSeconds: selectedBoard.dwellSeconds,
            prominenceScore: selectedBoard.fit,
            inventoryStatus: selectedBoard.inventoryStatus,
            purchaseUrl: selectedBoard.purchaseUrl,
            seller: selectedBoard.seller,
            format: selectedBoard.format,
            dimensions: selectedBoard.dimensions,
            facing: selectedBoard.facing,
            rateCard: selectedBoard.rateCard,
            estimatedCpm: selectedBoard.estimatedCpm,
            availability: selectedBoard.availability,
            lighting: selectedBoard.lighting,
            mediaType: selectedBoard.mediaType,
            restrictions: selectedBoard.restrictions,
            bookingContact: selectedBoard.bookingContact,
            details,
          },
          targetAccounts,
        }),
      });

      if (!response.ok) {
        let message = "Export failed";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          message = `${message} (${response.status})`;
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFilename(response, `${companyName}-${selectedOpportunity.area}-campaign-package`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-ink">
      <TopBar />

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Passive outbound for physical ABM
            </p>
            <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Find where your ICP gathers, then launch the physical play.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
              Orangeboard infers your creative brief and ICP, discovers physical-world
              opportunity blobs, and turns one into placement, creative, proof, and outbound.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              href="/map"
              onClick={() => {
                persistCampaignContext(selectedOpportunity);
                try {
                  localStorage.removeItem(CAMPAIGN_LAUNCH_KEY);
                } catch {
                  /* ignore storage failures */
                }
              }}
              className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Open Map
            </Link>
            <Link
              href="/vision"
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-neutral-400"
            >
              Vision Studio
            </Link>
          </div>
        </div>
      </section>

      <section id="accounts" className="mx-auto max-w-7xl px-5 py-5">
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold">Campaign Setup</h2>
            </div>
            <div className="space-y-5 p-4">
              <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  Selected opportunity
                </p>
                <p className="mt-1 text-sm font-semibold text-orange-950">
                  {selectedOpportunity.title}
                </p>
                {opportunitiesLoading && (
                  <p className="mt-1 text-[11px] font-medium text-orange-700">
                    Re-scoring blobs against ICP...
                  </p>
                )}
                <p className="mt-1 text-xs leading-relaxed text-orange-800">
                  {selectedOpportunity.summary}
                </p>
                <div className="mt-3 border-t border-orange-200/75 pt-3">
                  <BlobSignals opportunity={selectedOpportunity} tone="warm" />
                </div>
              </div>

              {icpEditMode ? (
                <label className="block">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">ICP</span>
                    <button
                      type="button"
                      onClick={() => setIcpEditMode(false)}
                      className="text-[11px] font-medium text-orange-500 transition hover:text-orange-600"
                    >
                      Done
                    </button>
                  </div>
                  <textarea
                    value={icp}
                    onChange={(event) => setIcp(event.target.value)}
                    rows={6}
                    className="w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    autoFocus
                  />
                </label>
              ) : (
                <ICPProfileCard
                  matchedAccounts={selectedOpportunity.accounts}
                  icp={icp}
                  onEdit={() => setIcpEditMode(true)}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Territory" value="San Francisco" />
                <Field label="Motion" value={selectedOpportunity.kind} />
                <Field label="Goal" value="Pipeline" />
                <Field label="Channel" value="Physical ABM" />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Workflow
                  </span>
                  <span className="text-xs text-neutral-400">Step {stageIndex + 1}/4</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {stages.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStage(item.id)}
                      className={
                        "h-9 rounded-md border px-3 text-left text-xs font-semibold transition " +
                        (stage === item.id
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300")
                      }
                    >
                      {index + 1}. {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Data Sources
                </p>
                <div className="mt-3 space-y-2 text-sm text-neutral-700">
                  <SourceRow label="Website" value={companyName} />
                  <SourceRow label="Fiber AI" value="Account enrichment" />
                  <SourceRow label="Mapbox" value="3D visibility scene" />
                  <SourceRow label="Orange Slice" value="Outbound workflow" />
                </div>
              </div>
            </div>
          </aside>

          <section id="boards" className="rounded-lg border border-neutral-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Opportunity Map + Billboard Inventory</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  ICP concentration, events, and physical placements in one workspace.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Legend color="bg-orange-500" label="Boards" />
                <Legend color="bg-ink" label="Accounts" />
              </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="relative min-h-[520px] overflow-hidden bg-[#e9ece7]">
                <MapTexture />

                <BlobContentsPanel opportunity={selectedOpportunity} />

                {opportunityList.map((opportunity) => (
                  <OpportunityBlob
                    key={opportunity.id}
                    opportunity={opportunity}
                    selected={selectedOpportunity.id === opportunity.id}
                    compact
                    onSelect={() => selectOpportunity(opportunity)}
                    elevate={selectedOpportunity.id === opportunity.id}
                  />
                ))}
                {boardsUnlocked && boards.map((board) => (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => selectBoard(board.id)}
                    className={
                      "absolute z-20 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-xs font-bold shadow-sm transition " +
                      (boardTouched && selectedBoard.id === board.id
                        ? "border-ink bg-orange-500 text-white"
                        : "border-white bg-orange-500 text-white hover:scale-105")
                    }
                    style={{ left: board.x, top: board.y }}
                    aria-label={`Select ${board.id}`}
                  >
                    {board.id.includes("-") ? board.id.split("-")[1] : board.id.replace(/\D/g, "").slice(-3) || board.id.slice(-3)}
                  </button>
                ))}

                {accountPins.map((account, index) => {
                  const point = accountPinPoint(selectedOpportunity, account, index, accountPins.length);
                  return (
                    <span
                      key={`${account.name}-${account.type}-${index}`}
                      className="group absolute grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-ink shadow-md"
                      style={{ left: point.x, top: point.y, zIndex: 26 }}
                      aria-label={account.name}
                      title={account.name}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                      <span className="pointer-events-none absolute left-1/2 top-[-1.9rem] hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-neutral-200 bg-white/95 px-2 py-1 text-[10px] font-semibold text-ink shadow-sm group-hover:block">
                        {account.name}
                      </span>
                    </span>
                  );
                })}

                {opportunityList.length > 0 && (
                  <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-neutral-200 bg-white/95 px-2 py-1 shadow-lg backdrop-blur">
                    <button
                      type="button"
                      onClick={() => stepOpportunity(-1)}
                      disabled={opportunityList.length < 2}
                      className="grid h-7 w-7 place-items-center rounded-full text-sm font-bold text-neutral-600 transition hover:bg-neutral-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-600"
                      aria-label="Previous blob"
                    >
                      {"<"}
                    </button>
                    <span className="min-w-12 text-center text-xs font-bold tabular-nums text-ink">
                      {selectedOpportunityIndex + 1}/{opportunityList.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => stepOpportunity(1)}
                      disabled={opportunityList.length < 2}
                      className="grid h-7 w-7 place-items-center rounded-full text-sm font-bold text-neutral-600 transition hover:bg-neutral-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-600"
                      aria-label="Next blob"
                    >
                      {">"}
                    </button>
                  </div>
                )}

                <div className="absolute bottom-16 left-4 z-30 w-[min(390px,calc(100%-2rem))] rounded-md border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                  {!boardsUnlocked ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                        Step 1: select a blob
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">{selectedOpportunity.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                        Click one of the opportunity blobs to lock the account cluster, then choose a billboard inside it.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                            Step 2: select a billboard
                          </p>
                          <h3 className="mt-1 text-lg font-semibold">{selectedBoard.location}</h3>
                        </div>
                        <span className="rounded-md bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-700">
                          {selectedBoard.fit}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                        {boardTouched
                          ? selectedBoard.note
                          : "Pick a billboard marker or ranked board, then confirm it to generate the creative."}
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <Metric label="Accounts" value={selectedBoard.accounts.toString()} />
                        <Metric label="Visibility" value={selectedBoard.visibility} />
                        <Metric label="Dwell" value={selectedBoard.dwell} />
                      </div>
                      {boardTouched && <BoardBuyingFacts board={selectedBoard} />}
                      <button
                        type="button"
                        onClick={confirmBillboardSelection}
                        disabled={!canConfirmBoard}
                        className="mt-3 h-9 w-full rounded-md bg-orange-500 text-sm font-semibold text-white transition hover:bg-orange-600 active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600"
                      >
                        {creativeStatus === "generating"
                          ? "Generating creative..."
                          : boardTouched
                            ? "Confirm board and generate"
                            : "Select a board to continue"}
                      </button>
                      <button
                        type="button"
                        onClick={exportCampaignPackage}
                        disabled={exporting || opportunitiesLoading}
                        className="mt-2 h-8 w-full rounded-md border border-neutral-200 bg-white text-xs font-semibold text-ink transition hover:bg-neutral-50 disabled:cursor-wait disabled:bg-neutral-100 disabled:text-neutral-400"
                      >
                        {exporting ? "Exporting..." : "Export package"}
                      </button>
                      {exportError && (
                        <p className="mt-2 text-xs font-medium text-red-600">{exportError}</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-200 xl:border-l xl:border-t-0">
                <div className="border-b border-neutral-200 px-4 py-3">
                  <h3 className="text-sm font-semibold">Ranked Boards</h3>
                </div>
                <div className="divide-y divide-neutral-100">
                  {!boardsUnlocked ? (
                    <div className="px-4 py-5 text-sm leading-relaxed text-neutral-500">
                      Select an opportunity blob first to unlock billboard inventory.
                    </div>
                  ) : boards.map((board) => (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => selectBoard(board.id)}
                      className={
                        "block w-full px-4 py-3 text-left transition " +
                        (boardTouched && selectedBoard.id === board.id ? "bg-orange-50" : "bg-white hover:bg-neutral-50")
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{board.location}</p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {board.accounts} target accounts nearby
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-neutral-500">
                            {board.mediaType} | {board.rateCard} | {board.estimatedCpm}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-orange-600">{board.fit}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside id="outbound" className="space-y-4">
            <OutputPanel
              title="Campaign Output"
              subtitle="What the growth team gets from this physical play."
            >
              <div className="space-y-3">
                <OutputRow label="Creative brief" value={creativeBrief} />
                <OutputRow label="Selected blob" value={selectedOpportunity.title} />
                <OutputRow label="Selected board" value={selectedBoard.location} />
                <OutputRow
                  label="Why it fits"
                  value={`${selectedBoard.accounts} nearby accounts, ${selectedBoard.visibility.toLowerCase()} visibility, ${selectedBoard.dwell} dwell`}
                />
                <OutputRow label="Owner / seller" value={selectedBoard.seller} />
                <OutputRow label="Rate / CPM" value={`${selectedBoard.rateCard} / ${selectedBoard.estimatedCpm}`} />
                <OutputRow label="Availability" value={selectedBoard.availability} />
                <OutputRow label="Booking contact" value={selectedBoard.bookingContact} />
              </div>
            </OutputPanel>

            <OutputPanel title="Local Creative" subtitle="Generated for this street and account cluster.">
              {generatedCreativeUrl ? (
                <div className="aspect-[16/9] overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={generatedCreativeUrl} alt="Generated billboard creative" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[16/9] rounded-md border border-neutral-200 bg-ink p-4 text-white">
                  <div className="flex h-full flex-col justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                      {companyName} near {selectedOpportunity.area}
                    </p>
                    <p className="text-2xl font-semibold leading-tight">
                      {creativeVariants[0]}
                    </p>
                    <p className="text-sm text-neutral-300">
                      Built for {selectedOpportunity.kind.toLowerCase()} in {selectedOpportunity.area}.
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-3 space-y-2">
                {creativeVariants.slice(1).map((variant) => (
                  <p key={variant} className="rounded-md border border-neutral-200 px-3 py-2 text-xs text-neutral-600">
                    {variant}
                  </p>
                ))}
              </div>
            </OutputPanel>

            <OutputPanel title="Outbound Queue" subtitle="Orange Slice + Fiber outbound for coordinated follow-up.">
              <OutboundWorkflow
                campaignKey={outboundCampaignKey}
                campaignName={`${companyName} - ${selectedOpportunity.area}`}
                companyName={companyName}
                opportunityTitle={selectedOpportunity.title}
                opportunityArea={selectedOpportunity.area}
                boardLocation={selectedBoard.location}
                boardAddress={selectedBoard.address}
                seedRows={outboundSeedRows}
                loading={outboundLoading}
                error={outboundError}
                unconfigured={outboundUnconfigured}
                onGenerate={generateOutbound}
              />
            </OutputPanel>
          </aside>
        </div>
      </section>

      {creativeDialogOpen && (
        <CreativeGenerationDialog
          status={creativeStatus}
          error={creativeError}
          creative={creativeResult}
          opportunity={selectedOpportunity}
          board={selectedBoard}
          onRetry={confirmBillboardSelection}
          onPreview={() => openStreetPreview()}
          onClose={() => {
            if (creativeStatus !== "generating") setCreativeDialogOpen(false);
          }}
        />
      )}
    </main>
  );
}

function CreativeGenerationDialog({
  status,
  error,
  creative,
  opportunity,
  board,
  onRetry,
  onPreview,
  onClose,
}: {
  status: CreativeGenerationStatus;
  error: string | null;
  creative: GeneratedCreative | null;
  opportunity: CampaignOpportunity;
  board: RankedBoardOption;
  onRetry: () => void;
  onPreview: () => void;
  onClose: () => void;
}) {
  const busy = status === "generating";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl shadow-ink/25">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Step 3: generate creative
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{board.location}</h2>
            <p className="mt-1 text-sm text-neutral-500">{opportunity.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close creative generation dialog"
          >
            x
          </button>
        </div>

        <div className="px-5 py-5">
          {status === "generating" && (
            <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600" />
                <div>
                  <p className="text-sm font-semibold text-orange-950">Generating billboard creative</p>
                  <p className="mt-1 text-xs leading-relaxed text-orange-800">
                    Locking copy to the selected board, local audience, and street context.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "done" && creative && (
            <>
              <div className="aspect-[16/9] overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={creative.imageUrl} alt="Generated billboard creative" className="h-full w-full object-cover" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                Creative is ready. Opening the street-view projection for final approval.
              </p>
            </>
          )}

          {status === "error" && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-700">Creative generation failed</p>
              <p className="mt-1 text-xs leading-relaxed text-red-700">{error ?? "Try again."}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4">
          {status === "error" && (
            <button
              type="button"
              onClick={onRetry}
              className="h-9 rounded-md bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Retry
            </button>
          )}
          {status === "done" && (
            <button
              type="button"
              onClick={onPreview}
              className="h-9 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Open street preview
            </button>
          )}
          {status === "generating" && (
            <span className="text-xs font-medium text-neutral-500">This usually takes a few seconds.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function OpportunityBlob({
  opportunity,
  selected,
  compact = false,
  onSelect,
  elevate = false,
}: {
  opportunity: CampaignOpportunity;
  selected: boolean;
  compact?: boolean;
  onSelect: () => void;
  elevate?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "absolute z-20 -translate-x-1/2 -translate-y-1/2 text-left transition " +
        (selected ? "scale-105" : "hover:scale-[1.03]")
      }
      style={{ left: opportunity.blob.left, top: opportunity.blob.top, zIndex: elevate ? 30 : selected ? 24 : undefined }}
      aria-label={`Focus ${opportunity.title}`}
    >
      <span
        className={
          "block border shadow-lg backdrop-blur " +
          (selected
            ? "border-orange-600 bg-orange-500/35 ring-4 ring-orange-500/15"
            : "border-orange-300/70 bg-orange-400/20")
        }
        style={{
          width: compact ? opportunity.blob.width * 0.72 : opportunity.blob.width,
          height: compact ? opportunity.blob.height * 0.72 : opportunity.blob.height,
          transform: `rotate(${opportunity.blob.rotate})`,
          borderRadius: opportunity.blob.radius,
        }}
      />
      {compact && selected && (
        <span className="pointer-events-none absolute bottom-[calc(100%+0.55rem)] left-1/2 z-40 w-max max-w-56 -translate-x-1/2 rounded-md border border-orange-200 bg-white/95 px-3 py-2 text-center shadow-md backdrop-blur">
          <span className="block truncate text-[11px] font-bold text-ink">
            {opportunity.title}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-semibold text-orange-600">
            {opportunity.area}
          </span>
        </span>
      )}
      {compact && (
        <span
          className={
            "absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-center shadow-sm backdrop-blur " +
            (selected
              ? "w-36 border-orange-200 bg-white/95 text-ink"
              : "border-white/70 bg-white/70 text-orange-700")
          }
        >
          <span className="block text-[10px] font-bold tabular-nums">{opportunity.score}</span>
          {selected && (
            <span className="mt-0.5 block truncate text-[10px] font-semibold">
              {opportunity.area}
            </span>
          )}
        </span>
      )}
      {!compact && (
        <span className="absolute left-1/2 top-1/2 z-30 w-44 -translate-x-1/2 -translate-y-1/2 rounded-md border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-orange-600">
            {opportunity.kind}
          </span>
          <span className="mt-1 block text-sm font-semibold text-ink">
            {opportunity.title}
          </span>
          <span className="mt-1 block text-xs text-neutral-500">
            {opportunity.accounts} accounts, {opportunity.placements} placements
          </span>
        </span>
      )}
    </button>
  );
}

function BlobContentsPanel({ opportunity }: { opportunity: CampaignOpportunity }) {
  const businesses = blobBusinesses(opportunity, 4);

  return (
    <div className="absolute left-4 top-4 z-30 w-[min(360px,calc(100%-2rem))] rounded-md border border-neutral-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-600">
            Companies in this blob
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold text-ink">{opportunity.area}</h3>
        </div>
        <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">
          {opportunity.accounts}
        </span>
      </div>

      <div className="mt-2">
        <BlobSignals opportunity={opportunity} />
      </div>

      <div className="mt-3 space-y-1.5">
        {businesses.map((business) => (
          <div key={`${business.name}-${business.type}`} className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-xs font-semibold text-neutral-900">{business.name}</p>
              <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-neutral-500">
                ICP
              </span>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-neutral-500">{business.type}</p>
            <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-neutral-600">{business.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlobSignals({
  opportunity,
  tone = "neutral",
}: {
  opportunity: CampaignOpportunity;
  tone?: "neutral" | "warm";
}) {
  const signals = blobSignals(opportunity);
  const pillClass =
    tone === "warm"
      ? "bg-white/70 text-orange-800 ring-1 ring-orange-200"
      : "bg-orange-50 text-orange-700";

  return (
    <div>
      <p className={
        "text-[10px] font-bold uppercase tracking-[0.12em] " +
        (tone === "warm" ? "text-orange-700" : "text-neutral-400")
      }>
        ICP signals
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {signals.map((signal) => (
          <span key={signal} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pillClass}`}>
            {signal}
          </span>
        ))}
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-orange-500 text-white">
            <BoardIcon />
          </span>
          <span className="text-base font-semibold tracking-tight">Orangeboard</span>
        </Link>
        <div className="hidden items-center gap-6 text-sm font-medium text-neutral-600 md:flex">
          <a href="#accounts" className="transition hover:text-ink">
            Accounts
          </a>
          <a href="#boards" className="transition hover:text-ink">
            Boards
          </a>
          <a href="#outbound" className="transition hover:text-ink">
            Outbound
          </a>
        </div>
        <div className="text-xs font-medium text-neutral-500">
          YC AI Growth Hackathon
        </div>
      </nav>
    </header>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-800">{value}</p>
    </div>
  );
}

function SourceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-medium">{label}</span>
      <span className="text-right text-xs text-neutral-500">{value}</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-neutral-500">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-2 py-2 text-center">
      <p className="font-semibold text-neutral-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}

function BoardBuyingFacts({ board }: { board: BoardOption }) {
  const facts = [
    ["Owner / seller", board.seller],
    ["Dimensions", board.dimensions],
    ["Facing", board.facing],
    ["Rate card", board.rateCard],
    ["Estimated CPM", board.estimatedCpm],
    ["Availability", board.availability],
    ["Media", `${board.mediaType}; ${board.lighting}`],
    ["Restrictions", board.restrictions],
    ["Booking contact", board.bookingContact],
  ];

  return (
    <dl className="mt-3 grid gap-2 rounded-md border border-neutral-200 bg-white px-3 py-3 text-left">
      {facts.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[96px,1fr] gap-2 text-[11px] leading-snug">
          <dt className="font-semibold uppercase tracking-wide text-neutral-400">{label}</dt>
          <dd className="text-neutral-700">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function OutputPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function OutputRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
        {value}
      </p>
    </div>
  );
}

function MapTexture() {
  return (
    <>
      <div className="absolute left-[8%] top-[18%] h-[72%] w-[12%] rotate-12 bg-white/60" />
      <div className="absolute left-[26%] top-[-8%] h-[118%] w-[9%] -rotate-12 bg-white/70" />
      <div className="absolute left-[48%] top-[-4%] h-[108%] w-[11%] rotate-6 bg-white/60" />
      <div className="absolute left-[71%] top-[8%] h-[92%] w-[10%] -rotate-6 bg-white/70" />
      <div className="absolute left-0 top-[36%] h-[10%] w-full -rotate-3 bg-white/55" />
      <div className="absolute left-0 top-[62%] h-[8%] w-full rotate-2 bg-white/60" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(10,10,10,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(10,10,10,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="absolute right-4 top-4 rounded-md border border-neutral-200 bg-white/90 px-3 py-2 text-xs font-medium text-neutral-600 shadow-sm">
        San Francisco signal map
      </div>
    </>
  );
}

function BoardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="10" rx="2" fill="currentColor" />
      <path
        d="M12 15v5M8.5 20h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ICPProfileCard({
  matchedAccounts,
  icp,
  onEdit,
}: {
  matchedAccounts: number;
  icp: string;
  onEdit: () => void;
}) {
  const icpLower = icp.toLowerCase();
  const roles = [
    icpLower.includes("cfo") ? "CFO" : null,
    icpLower.includes("controller") ? "Controller" : null,
    icpLower.includes("revops") ? "RevOps" : null,
    icpLower.includes("finance") ? "Finance Ops" : null,
    icpLower.includes("engineer") ? "Engineering" : null,
    icpLower.includes("marketing") || icpLower.includes("growth") ? "Growth" : null,
    icpLower.includes("hr") || icpLower.includes("talent") || icpLower.includes("recruit") ? "People Ops" : null,
  ].filter(Boolean) as string[];
  const signals = [
    icpLower.includes("hiring") || icpLower.includes("headcount") ? "Headcount growth" : null,
    icpLower.includes("spend") ? "Spend management" : null,
    icpLower.includes("series") ? "Company stage" : null,
    icpLower.includes("san francisco") ? "SF concentration" : null,
  ].filter(Boolean) as string[];
  const displayRoles = roles.length ? roles.slice(0, 4) : ["Buyer", "Operator", "Decision maker"];
  const displaySignals = signals.length ? signals.slice(0, 4) : ["Local density", "Account proximity"];

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {/* Cover strip */}
      <div className="relative h-[52px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-neutral-800 to-ink" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 18px,rgba(255,255,255,0.05) 18px,rgba(255,255,255,0.05) 19px),repeating-linear-gradient(90deg,transparent,transparent 18px,rgba(255,255,255,0.05) 18px,rgba(255,255,255,0.05) 19px)",
          }}
        />
        <span className="absolute bottom-2 right-3 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
          ICP Profile
        </span>
      </div>

      {/* Avatar row */}
      <div className="-mt-6 flex items-end px-3.5 pb-2">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-orange-500 shadow-md">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="8" r="4" fill="white" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="white" />
          </svg>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="mb-0.5 ml-auto text-[11px] font-medium text-neutral-400 transition hover:text-orange-500"
        >
          Edit
        </button>
      </div>

      {/* Identity */}
      <div className="px-3.5 pb-3 [&>p:nth-of-type(2)]:hidden">
        <h3 className="text-sm font-semibold text-ink">Target ICP</h3>
        <p className="mt-1 max-h-16 overflow-y-auto text-[11px] leading-relaxed text-neutral-500">{icp}</p>
        <p className="mt-0.5 text-[11px] text-neutral-500">Series B-C &middot; SaaS &middot; San Francisco</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {displayRoles.map((r) => (
            <span key={r} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100">
        <div className="py-2.5 text-center">
          <p className="text-sm font-bold text-ink">B-C</p>
          <p className="text-[9px] text-neutral-400">Stage</p>
        </div>
        <div className="py-2.5 text-center">
          <p className="text-sm font-bold text-ink">500</p>
          <p className="text-[9px] text-neutral-400">Max emp.</p>
        </div>
        <div className="py-2.5 text-center">
          <p className="text-sm font-bold text-orange-500">{matchedAccounts}</p>
          <p className="text-[9px] text-neutral-400">Matched</p>
        </div>
      </div>

      {/* Intent signals */}
      <div className="border-t border-neutral-100 px-3.5 py-3">
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">
          Intent signals
        </p>
        <div className="flex flex-wrap gap-1.5">
          {displaySignals.map((s) => (
            <span key={s} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
