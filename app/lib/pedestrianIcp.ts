export type LngLat = { lng: number; lat: number };

export type PedestrianRenderKind =
  | "walker"
  | "runner"
  | "tourist"
  | "cyclist"
  | "icp"
  | "employee";

export type PedestrianProfileSource = "ambient" | "icp" | "employee";

export interface CampaignBusinessContext {
  name: string;
  type?: string;
  reason?: string;
  website?: string | null;
  lng?: number;
  lat?: number;
}

export interface CampaignPedestrianContext {
  companyName?: string;
  icp?: string;
  opportunityId?: string;
  title?: string;
  area?: string;
  kind?: string;
  icpFit?: string;
  matchReasons?: string[];
  centroid?: LngLat;
  radiusM?: number;
  businesses: CampaignBusinessContext[];
}

export interface CampaignOpportunityContextInput {
  id: string;
  title?: string;
  area?: string;
  kind?: string;
  icpFit?: string;
  matchReasons?: string[];
  centroid?: LngLat;
  radiusM?: number;
  matchedBusinesses?: CampaignBusinessContext[];
}

export interface PedestrianProfile {
  kind: PedestrianRenderKind;
  source: PedestrianProfileSource;
  isIcp: boolean;
  role: string;
  label: string;
  fitScore: number;
  company?: string;
  businessName?: string;
  businessType?: string;
  reason?: string;
  distanceM?: number;
}

type NearbyBusiness = {
  business: CampaignBusinessContext;
  distanceM: number;
  closeness: number;
};

const BUSINESS_PROXIMITY_M = 150;
const BASE_ICP_CHANCE = 0.05;

export const PEDESTRIAN_CONTEXT_STORAGE_KEY = "orangeboard:campaign-context";

const AMBIENT_PROFILES: Array<{
  kind: Exclude<PedestrianRenderKind, "icp" | "employee">;
  role: string;
}> = [
  { kind: "walker", role: "Local commuter" },
  { kind: "walker", role: "Neighborhood resident" },
  { kind: "runner", role: "Runner" },
  { kind: "tourist", role: "Visitor" },
  { kind: "tourist", role: "Shopper" },
  { kind: "cyclist", role: "Bike commuter" },
  { kind: "walker", role: "Lunch crowd" },
  { kind: "walker", role: "Service worker" },
];

const DEFAULT_ICP_ROLES = [
  "Operations leader",
  "Department head",
  "Startup operator",
  "Executive buyer",
  "Business systems lead",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h / 0xffffffff;
}

function offsetPoint(center: LngLat, distM: number, angleRad: number): LngLat {
  const latDeg = distM / 111320;
  const lngDeg = distM / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return {
    lng: center.lng + Math.sin(angleRad) * lngDeg,
    lat: center.lat + Math.cos(angleRad) * latDeg,
  };
}

function haversineM(a: LngLat, b: LngLat): number {
  const radius = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function normalizedBusiness(
  business: CampaignBusinessContext,
  index: number,
  opportunity?: CampaignOpportunityContextInput,
): CampaignBusinessContext {
  if (typeof business.lng === "number" && typeof business.lat === "number") {
    return business;
  }
  if (!opportunity?.centroid) return business;

  const angle = djb2(`${opportunity.id}:${business.name}:${index}`) * Math.PI * 2;
  const radius = Math.min(95, Math.max(28, (opportunity.radiusM ?? 220) * 0.18));
  const jitter = offsetPoint(opportunity.centroid, radius, angle);
  return { ...business, lng: jitter.lng, lat: jitter.lat };
}

export function buildCampaignPedestrianContext({
  companyName,
  icp,
  opportunity,
}: {
  companyName?: string;
  icp?: string;
  opportunity: CampaignOpportunityContextInput;
}): CampaignPedestrianContext {
  const businesses = (opportunity.matchedBusinesses ?? [])
    .filter((business) => business.name)
    .map((business, index) => normalizedBusiness(business, index, opportunity));

  return {
    companyName,
    icp,
    opportunityId: opportunity.id,
    title: opportunity.title,
    area: opportunity.area,
    kind: opportunity.kind,
    icpFit: opportunity.icpFit,
    matchReasons: opportunity.matchReasons,
    centroid: opportunity.centroid,
    radiusM: opportunity.radiusM,
    businesses,
  };
}

export function normalizeCampaignPedestrianContext(value: unknown): CampaignPedestrianContext | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<CampaignPedestrianContext>;
  const businesses = Array.isArray(raw.businesses)
    ? raw.businesses
        .filter((business): business is CampaignBusinessContext =>
          Boolean(business) &&
          typeof business === "object" &&
          typeof (business as CampaignBusinessContext).name === "string"
        )
        .map((business) => ({
          name: business.name,
          type: business.type,
          reason: business.reason,
          website: business.website,
          lng: typeof business.lng === "number" ? business.lng : undefined,
          lat: typeof business.lat === "number" ? business.lat : undefined,
        }))
    : [];

  if (!businesses.length && !raw.icp && !raw.centroid) return null;

  return {
    companyName: typeof raw.companyName === "string" ? raw.companyName : undefined,
    icp: typeof raw.icp === "string" ? raw.icp : undefined,
    opportunityId: typeof raw.opportunityId === "string" ? raw.opportunityId : undefined,
    title: typeof raw.title === "string" ? raw.title : undefined,
    area: typeof raw.area === "string" ? raw.area : undefined,
    kind: typeof raw.kind === "string" ? raw.kind : undefined,
    icpFit: typeof raw.icpFit === "string" ? raw.icpFit : undefined,
    matchReasons: Array.isArray(raw.matchReasons) ? raw.matchReasons.filter((v): v is string => typeof v === "string") : undefined,
    centroid:
      raw.centroid && typeof raw.centroid.lng === "number" && typeof raw.centroid.lat === "number"
        ? { lng: raw.centroid.lng, lat: raw.centroid.lat }
        : undefined,
    radiusM: typeof raw.radiusM === "number" ? raw.radiusM : undefined,
    businesses,
  };
}

export function findNearbyCampaignBusiness(
  lng: number,
  lat: number,
  context: CampaignPedestrianContext | null | undefined,
): NearbyBusiness | null {
  if (!context?.businesses.length) return null;

  const here = { lng, lat };
  let nearest: NearbyBusiness | null = null;

  for (const business of context.businesses) {
    if (typeof business.lng !== "number" || typeof business.lat !== "number") continue;
    const distanceM = haversineM(here, { lng: business.lng, lat: business.lat });
    if (!nearest || distanceM < nearest.distanceM) {
      nearest = {
        business,
        distanceM,
        closeness: Math.max(0, 1 - distanceM / BUSINESS_PROXIMITY_M),
      };
    }
  }

  return nearest && nearest.distanceM <= BUSINESS_PROXIMITY_M ? nearest : null;
}

function rolesForIcp(icp?: string): string[] {
  const text = (icp ?? "").toLowerCase();
  const roles: string[] = [];

  if (/\b(cfo|controller|finance|fp&a|spend|procurement|accounting|revops)\b/.test(text)) {
    roles.push("CFO", "Controller", "Finance Ops lead", "RevOps manager", "FP&A lead");
  }
  if (/\b(marketing|growth|demand|brand|campaign)\b/.test(text)) {
    roles.push("VP Marketing", "Growth lead", "Demand gen manager", "Brand marketer");
  }
  if (/\b(hr|people|talent|recruit|hiring|headcount)\b/.test(text)) {
    roles.push("Head of People", "Talent lead", "Recruiting manager", "People Ops lead");
  }
  if (/\b(engineer|developer|technical|security|devops|it)\b/.test(text)) {
    roles.push("Engineering manager", "Technical lead", "IT leader", "Security lead");
  }
  if (/\b(founder|ceo|executive|operator|startup|series)\b/.test(text)) {
    roles.push("Founder", "CEO", "COO", "Startup operator");
  }

  return roles.length ? [...new Set(roles)] : DEFAULT_ICP_ROLES;
}

function ambientProfile(): PedestrianProfile {
  const profile = pick(AMBIENT_PROFILES);
  return {
    kind: profile.kind,
    source: "ambient",
    isIcp: false,
    role: profile.role,
    label: profile.role,
    fitScore: Math.round(8 + Math.random() * 24),
  };
}

export function samplePedestrianProfile(
  lng: number,
  lat: number,
  context?: CampaignPedestrianContext | null,
): PedestrianProfile {
  if (!context) return ambientProfile();

  const nearby = findNearbyCampaignBusiness(lng, lat, context);
  const fitChance = nearby
    ? 0.42 + nearby.closeness * 0.38
    : BASE_ICP_CHANCE;

  if (Math.random() >= fitChance) return ambientProfile();

  const role = pick(rolesForIcp(context.icp));
  const source: PedestrianProfileSource =
    nearby && Math.random() < 0.34 + nearby.closeness * 0.36 ? "employee" : "icp";
  const business = nearby?.business;
  const fitScore = nearby
    ? Math.round(58 + nearby.closeness * 34 + Math.random() * 8)
    : Math.round(46 + Math.random() * 18);

  return {
    kind: source === "employee" ? "employee" : "icp",
    source,
    isIcp: true,
    role,
    label: business
      ? source === "employee"
        ? `${role} at ${business.name}`
        : `${role} near ${business.name}`
      : role,
    fitScore,
    company: context.companyName,
    businessName: business?.name,
    businessType: business?.type,
    reason: business?.reason ?? context.matchReasons?.[0] ?? context.icpFit,
    distanceM: nearby?.distanceM,
  };
}
