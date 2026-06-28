import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CompanyBrief } from "../../lib/types";
import fiberData from "../../../data/billboard-fiber-businesses.json";

// ─── types ────────────────────────────────────────────────────────────────────

type LngLat = { lng: number; lat: number };
type Ring = [number, number][];

export interface OpportunityBillboard {
  id: string;
  location: string;
  address: string;
  lat: number;
  lng: number;
  fitScore: number;
  visibility: "High" | "Medium" | "Low";
  visibilityScore: number;
  dwellSeconds: number;
  inventoryStatus: string;
  purchaseUrl: string;
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
}

export interface Opportunity {
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
  icpFit: string;
  matchReasons: string[];
  matchedBusinesses: Array<{
    name: string;
    type: string;
    reason: string;
    website?: string | null;
    lng?: number;
    lat?: number;
  }>;
  billboards?: OpportunityBillboard[];
  centroid: LngLat;
  radiusM: number;
}

// ─── ICP keyword taxonomy ─────────────────────────────────────────────────────

const TAXONOMY: Record<string, string[]> = {
  fintech:      ["financial institution", "bank", "insurance", "investment", "mortgage", "credit", "loan", "wealth", "fintech", "lending", "payments"],
  saas:         ["software", "technology", "cloud", "startup", "saas", "platform", "api", "developer", "computer", "information services"],
  healthcare:   ["medical", "health", "hospital", "pharmacy", "dental", "clinic", "wellness", "therapy", "optical"],
  consulting:   ["consulting", "business management consultant", "advisory", "professional services", "business to business", "strategy", "analyst"],
  marketing:    ["marketing", "advertising", "media agency", "marketing agency", "public relations", "internet marketing"],
  retail:       ["store", "shop", "retail", "boutique", "apparel", "clothing", "fashion", "goods"],
  realestate:   ["real estate", "property", "realty", "housing", "mortgage broker", "leasing"],
  recruiting:   ["staffing", "recruiting", "employment", "human resources", "hr", "talent", "temp agency"],
  food:         ["restaurant", "cafe", "food", "bar", "coffee", "bakery", "catering", "diner", "eatery"],
  legal:        ["law", "legal", "attorney", "lawyer", "notary", "paralegal"],
  education:    ["school", "education", "tutoring", "training", "university", "college", "academy"],
  logistics:    ["shipping", "logistics", "freight", "warehouse", "supply chain", "courier", "delivery"],
};

// Human-readable labels for the detected cluster type
const TYPE_LABELS: Record<string, string> = {
  fintech:    "Finance & Fintech",
  saas:       "Tech & SaaS",
  healthcare: "Healthcare",
  consulting: "Professional Services",
  marketing:  "Marketing & Media",
  retail:     "Retail",
  realestate: "Real Estate",
  recruiting: "Talent & HR",
  food:       "Hospitality",
  legal:      "Legal",
  education:  "Education",
  logistics:  "Logistics",
};

const KIND_LABELS: Record<string, string> = {
  fintech:    "Account concentration",
  saas:       "Account concentration",
  consulting: "Competitor corridor",
  marketing:  "Competitor corridor",
  recruiting: "Talent signal",
  food:       "High foot traffic",
  retail:     "High foot traffic",
  healthcare: "Account concentration",
  realestate: "Emerging market",
  legal:      "Professional corridor",
  education:  "Community anchor",
  logistics:  "Commercial zone",
};

// ─── scoring helpers ──────────────────────────────────────────────────────────

type BillboardRecord = {
  record_id: string;
  address: string;
  lng: number;
  lat: number;
  businesses: Array<{
    name: string;
    description?: string | null;
    website?: string | null;
    primaryType?: string | null;
    allTypes?: string[];
    rating?: number | null;
    numReviews?: number;
  }>;
};

type GaspFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    record_id?: string | null;
    record_name?: string | null;
    address?: string | null;
    record_status?: string | null;
    record_status_date?: string | null;
    record_type?: string | null;
    description?: string | null;
    planner_name?: string | null;
    planner_email?: string | null;
    planner_phone?: string | null;
    acalink?: string | null;
    PHOTOTOUSE?: string | null;
    owner_seller?: string | null;
    dimensions?: string | null;
    facing?: string | null;
    rate_card?: string | null;
    estimated_cpm?: string | null;
    availability?: string | null;
    lighting?: string | null;
    media_type?: string | null;
    restrictions?: string | null;
    booking_contact?: string | null;
    buying_data_source?: string | null;
    buying_data_confidence?: string | null;
  };
};

function loadGaspInventory(): GaspFeature[] {
  try {
    const raw = readFileSync(join(process.cwd(), "data", "sf-billboards.geojson"), "utf8");
    const parsed = JSON.parse(raw) as { features?: GaspFeature[] };
    return parsed.features ?? [];
  } catch {
    return [];
  }
}

const gaspInventoryById = new Map(
  loadGaspInventory()
    .map((feature) => [feature.properties?.record_id ?? "", feature] as const)
    .filter(([id]) => Boolean(id)),
);

const ROLE_SIGNALS: Record<string, string[]> = {
  financeOps: ["finance team", "finance leader", "finance ops", "finance operations", "cfo", "controller", "revops", "fp&a", "spend", "procurement", "accounts payable", "accounting team"],
  peopleOps: ["hr", "people ops", "talent", "recruiting", "headcount", "hiring"],
  marketingOps: ["marketing team", "growth team", "demand gen", "demand generation", "brand team", "campaign", "performance marketing"],
  engineering: ["engineering", "developer", "technical", "security", "devops"],
};

const ROLE_LABELS: Record<string, string> = {
  financeOps: "finance-ops buyer signal",
  peopleOps: "people/talent buyer signal",
  marketingOps: "growth/marketing buyer signal",
  engineering: "technical buyer signal",
};

const ROLE_ADJACENCY: Record<string, string[]> = {
  financeOps: ["accounting", "accountant", "bookkeeping", "payroll", "tax", "financial consultant", "expense", "spend", "procurement"],
  peopleOps: ["employment", "staffing", "recruiting", "human resource", "training", "coaching"],
  marketingOps: ["marketing", "advertising", "branding", "public relations", "creative", "design agency", "media"],
  engineering: ["software", "computer", "information services", "technology", "cybersecurity", "security", "developer"],
};

const GENERIC_B2B_TYPES = [
  "corporate office",
  "business to business",
  "business center",
  "business development",
  "professional services",
  "coworking",
  "office space",
  "virtual office",
];

const LOCAL_CONSUMER_TYPES = [
  "restaurant",
  "bar",
  "cafe",
  "florist",
  "clothing",
  "luggage storage",
  "passport photo",
  "notary",
  "print shop",
  "printer",
  "shredding",
  "waste",
  "shipping",
  "mailing",
  "sign shop",
  "records storage",
  "storage facility",
  "art studio",
  "metal fabricator",
  "welder",
];

const SAAS_VENDOR_NOISE_TYPES = [
  "internet marketing",
  "advertising agency",
  "marketing agency",
  "marketing consultant",
  "website designer",
  "training center",
  "educational",
  "event technology",
  "design agency",
  "industrial design",
  "3d printing",
];

type BusinessMatch = {
  name: string;
  type: string;
  website?: string | null;
  score: number;
  category?: string;
  reasons: string[];
  // Location of the billboard this business sits near — used to drop map pins.
  lng?: number;
  lat?: number;
};

type IcpProfile = {
  categories: string[];
  primaryCategories: string[];
  roleSignals: string[];
};

function textIncludes(text: string, term: string): boolean {
  const escaped = term.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return false;
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function countHits(text: string, keywords: string[]): number {
  let hits = 0;
  for (const kw of keywords) {
    if (textIncludes(text, kw)) hits++;
  }
  return hits;
}

function hasFinanceBuyerLanguage(text: string): boolean {
  return ROLE_SIGNALS.financeOps.some((kw) => textIncludes(text, kw));
}

function hasFinancialServicesAccountLanguage(text: string): boolean {
  return /\b(fintech|bank|banking|insurance|lending|wealth|credit union|financial services|payments company)\b/i.test(text);
}

function detectIcpProfile(brief: CompanyBrief): IcpProfile {
  const accountText = [
    brief.identity.industry,
    brief.identity.description,
  ].join(" ").toLowerCase();
  const buyerText = [
    brief.audience.description,
    ...brief.identity.brandAdjectives,
    brief.campaign.coreMessage,
  ].join(" ").toLowerCase();
  const allText = `${accountText} ${buyerText}`;

  const matches: Array<[string, number]> = [];
  for (const [cat, keywords] of Object.entries(TAXONOMY)) {
    let score = countHits(accountText, keywords) * 4 + countHits(buyerText, keywords) * 2;

    if (cat === "fintech" && hasFinanceBuyerLanguage(allText) && !hasFinancialServicesAccountLanguage(allText)) {
      score = Math.min(score, 1);
    }

    if (cat === "saas" && /\b(series|b2b|software|saas|startup|platform|api|tech)\b/i.test(allText)) {
      score += 6;
    }

    if (score > 0) matches.push([cat, score]);
  }
  matches.sort((a, b) => b[1] - a[1]);

  const roleSignals = Object.entries(ROLE_SIGNALS)
    .filter(([, keywords]) => countHits(allText, keywords) > 0)
    .map(([role]) => role);

  let categories = matches.slice(0, 4).map(([cat]) => cat);
  if (categories.length === 0) categories = ["saas", "consulting"];
  if (roleSignals.includes("financeOps") && !categories.includes("saas") && /\b(b2b|team|company|startup|series|operator|ops)\b/i.test(allText)) {
    categories.unshift("saas");
  }

  categories = [...new Set(categories)].slice(0, 4);
  return {
    categories,
    primaryCategories: categories.slice(0, 2),
    roleSignals,
  };
}

function scoreBusinessMatch(biz: BillboardRecord["businesses"][number], profile: IcpProfile): BusinessMatch {
  const types = [...(biz.allTypes ?? []), biz.primaryType ?? ""].filter(Boolean);
  const type = types[0] ?? "Business";
  const primaryType = (biz.primaryType ?? type).toLowerCase();
  const combined = [
    biz.name,
    ...types,
  ].join(" ").toLowerCase();
  let total = 0;
  const reasons: string[] = [];
  let category: string | undefined;

  for (const cat of profile.categories) {
    const keywords = TAXONOMY[cat] ?? [];
    for (const kw of keywords) {
      if (textIncludes(combined, kw)) {
        const primary = cat === profile.categories[0];
        total += primary ? 38 : 24;
        category = category ?? cat;
        reasons.push(primary ? `primary ${TYPE_LABELS[cat] ?? cat} match` : `${TYPE_LABELS[cat] ?? cat} match`);
        break;
      }
    }
  }

  for (const role of profile.roleSignals) {
    const roleHits = countHits(combined, ROLE_ADJACENCY[role] ?? []);
    if (roleHits > 0) {
      total += Math.min(18, 8 + roleHits * 4);
      reasons.push(ROLE_LABELS[role] ?? "buyer-role adjacency");
    }
  }

  if (GENERIC_B2B_TYPES.some((kw) => textIncludes(combined, kw))) {
    total += profile.primaryCategories.includes("saas") || profile.primaryCategories.includes("consulting") ? 16 : 8;
    reasons.push("B2B office/context signal");
  }

  const lowRelevance =
    LOCAL_CONSUMER_TYPES.some((kw) => textIncludes(combined, kw)) ||
    (profile.primaryCategories.includes("saas") && SAAS_VENDOR_NOISE_TYPES.some((kw) => textIncludes(combined, kw)));
  const lowPrimary =
    LOCAL_CONSUMER_TYPES.some((kw) => textIncludes(primaryType, kw)) ||
    (profile.primaryCategories.includes("saas") && SAAS_VENDOR_NOISE_TYPES.some((kw) => textIncludes(primaryType, kw)));
  if (category || reasons.length > 0) {
    if (biz.rating != null && biz.rating >= 4.0) total += 4;
    if ((biz.numReviews ?? 0) > 20) total += 4;
    if (biz.website) total += 3;
    if (lowPrimary) total -= 42;
    else if (lowRelevance) total -= 30;
  } else if (lowRelevance) {
    total -= 8;
  }

  return {
    name: biz.name,
    type,
    website: biz.website,
    score: Math.max(0, total),
    category,
    reasons: [...new Set(reasons)].slice(0, 3),
  };
}

function scoreBillboard(billboard: BillboardRecord, profile: IcpProfile): { score: number; matches: BusinessMatch[] } {
  let total = 0;
  const matches: BusinessMatch[] = [];

  for (const biz of billboard.businesses) {
    const match = scoreBusinessMatch(biz, profile);
    // Carry the board's location so the matched business can be pinned on the map.
    match.lng = billboard.lng;
    match.lat = billboard.lat;
    if (match.score > 0) {
      total += match.score;
      matches.push(match);
    } else {
      total += 1;
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return { score: total, matches };
}

// ─── geography ────────────────────────────────────────────────────────────────

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h / 0xffffffff;
}

function offsetPoint(center: LngLat, distM: number, angleRad: number): [number, number] {
  const latDeg = distM / 111320;
  const lngDeg = distM / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return [
    center.lng + Math.sin(angleRad) * lngDeg,
    center.lat + Math.cos(angleRad) * latDeg,
  ];
}

function buildIrregularPolygon(center: LngLat, baseRadiusM: number, seed: string, rays = 28): Ring {
  const pA = djb2(seed) * Math.PI * 2;
  const pB = djb2(seed + "b") * Math.PI * 2;
  const pC = djb2(seed + "c") * Math.PI * 2;
  const pD = djb2(seed + "d") * Math.PI * 2;
  const ring: Ring = [];
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const noise =
      0.18 * Math.sin(3 * angle + pA) +
      0.10 * Math.sin(7 * angle + pB) +
      0.06 * Math.cos(5 * angle + pC) +
      0.04 * Math.sin(11 * angle + pD);
    ring.push(offsetPoint(center, baseRadiusM * (1 + noise), angle));
  }
  ring.push(ring[0]);
  return ring;
}

// ─── clustering ───────────────────────────────────────────────────────────────

interface ScoredBoard {
  id: string;
  lat: number;
  lng: number;
  score: number;
  address: string;
  inventory?: GaspFeature;
  businesses: BillboardRecord["businesses"];
  matches: BusinessMatch[];
}

function greedyCluster(boards: ScoredBoard[], radiusM = 380, maxClusters = 10): ScoredBoard[][] {
  const sorted = [...boards].sort((a, b) => b.score - a.score);
  const used = new Set<string>();
  const clusters: ScoredBoard[][] = [];

  for (const seed of sorted) {
    if (used.has(seed.id)) continue;
    const cluster: ScoredBoard[] = [seed];
    used.add(seed.id);

    for (const other of sorted) {
      if (used.has(other.id)) continue;
      if (haversineM(seed.lat, seed.lng, other.lat, other.lng) <= radiusM) {
        cluster.push(other);
        used.add(other.id);
      }
    }
    clusters.push(cluster);
    if (clusters.length >= maxClusters) break;
  }

  return clusters.sort(
    (a, b) =>
      b.reduce((s, m) => s + m.score, 0) / b.length -
      a.reduce((s, m) => s + m.score, 0) / a.length
  );
}

// ─── metadata generation ──────────────────────────────────────────────────────

const ROLE_PERSONA: Record<string, string> = {
  financeOps:   "finance ops buyers",
  peopleOps:    "people & talent leaders",
  marketingOps: "growth & marketing buyers",
  engineering:  "technical buyers",
};

const CAT_PERSONA: Record<string, string> = {
  fintech:    "fintech decision-makers",
  saas:       "B2B tech buyers",
  consulting: "professional services buyers",
  healthcare: "healthcare decision-makers",
  recruiting: "talent org leaders",
  marketing:  "agency & media buyers",
  retail:     "retail accounts",
  realestate: "real estate buyers",
  legal:      "legal professionals",
  education:  "education buyers",
  logistics:  "logistics buyers",
};

const KIND_NOUN: Record<string, string> = {
  "Account concentration": "cluster",
  "Competitor corridor":   "corridor",
  "Talent signal":         "talent hub",
  "High foot traffic":     "foot-traffic zone",
  "Emerging market":       "emerging cluster",
  "Professional corridor": "professional hub",
  "Community anchor":      "community anchor",
  "Commercial zone":       "commercial cluster",
};

function buildClusterTitle(
  street: string,
  domCat: string,
  kind: string,
  profile: IcpProfile,
): string {
  const primaryRole = profile.roleSignals[0];
  const persona =
    (primaryRole ? ROLE_PERSONA[primaryRole] : null) ??
    CAT_PERSONA[domCat] ??
    "buyer";
  const noun = KIND_NOUN[kind] ?? "cluster";
  return `${street} ${persona} ${noun}`;
}

function dominantCategory(cluster: ScoredBoard[], profile: IcpProfile): string {
  const counts: Record<string, number> = {};
  for (const board of cluster) {
    for (const match of board.matches) {
      if (match.category) counts[match.category] = (counts[match.category] ?? 0) + match.score;
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : profile.categories[0] ?? "consulting";
}

function topMatches(cluster: ScoredBoard[], limit?: number): BusinessMatch[] {
  const byName = new Map<string, BusinessMatch>();
  for (const board of cluster) {
    for (const match of board.matches) {
      const existing = byName.get(match.name);
      if (!existing || match.score > existing.score) byName.set(match.name, match);
    }
  }
  const ranked = [...byName.values()].sort((a, b) => b.score - a.score);
  return limit == null ? ranked : ranked.slice(0, limit);
}

function topReasons(matches: BusinessMatch[], fallback: string): string[] {
  const counts = new Map<string, number>();
  for (const match of matches) {
    for (const reason of match.reasons) counts.set(reason, (counts.get(reason) ?? 0) + match.score);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([reason]) => reason);
  return ranked.length ? ranked.slice(0, 3) : [fallback];
}

function extractStreet(address: string): string {
  // "1700 NORIEGA ST 94122" -> "Noriega St"
  const m = address.match(/^\d+\s+(.+?)\s+\d{5}/i);
  if (m) {
    return m[1]
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return address.split(",")[0].trim();
}

function areaFromPoint(point: LngLat): string {
  if (point.lat < 37.742) return "Bayview";
  if (point.lat < 37.767 && point.lng < -122.414) return "Mission";
  if (point.lat < 37.767 && point.lng >= -122.414) return "Mission Bay";
  if (point.lat >= 37.787 && point.lng > -122.412) return "FiDi";
  if (point.lat >= 37.778 && point.lng > -122.414) return "Market St";
  if (point.lat >= 37.768 && point.lat < 37.787 && point.lng > -122.414) return "SoMa";
  if (point.lng < -122.46 && point.lat < 37.775) return "Sunset";
  if (point.lng < -122.45 && point.lat >= 37.775) return "Richmond";
  if (point.lat > 37.79 && point.lng < -122.415) return "Marina";
  if (point.lng < -122.43) return "Western SF";
  return "Central SF";
}

function timingFromContext(context?: string): string {
  switch (context) {
    case "driving": return "Morning and evening commute";
    case "walking": return "Lunch and evening foot traffic";
    case "scrolling": return "Weekday digital hours";
    default: return "Weekday business hours";
  }
}

function titleCaseAddress(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([A-Z]{2,}|[a-z]+)\b/g, (word) => {
      const lower = word.toLowerCase();
      if (["st", "ave", "blvd", "rd", "dr", "ca", "sf"].includes(lower)) return word.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    });
}

function cleanAddress(value: string | null | undefined): string {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
  return cleaned ? titleCaseAddress(cleaned) : "San Francisco, CA";
}

function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function visibilityLabel(score: number): OpportunityBillboard["visibility"] {
  if (score >= 82) return "High";
  if (score >= 68) return "Medium";
  return "Low";
}

function textOr(value: string | null | undefined, fallback: string): string {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function boardDetails(board: ScoredBoard, matchCount: number): string[] {
  const props = board.inventory?.properties;
  return [
    `SF GASP record ${board.id}.`,
    props?.record_status_date ? `Permit status date: ${props.record_status_date}.` : "",
    props?.description ? `Inventory note: ${props.description}.` : "",
    matchCount > 0 ? `${matchCount} ICP-matched nearby businesses contributed to this board score.` : "",
    props?.PHOTOTOUSE ? `City photo reference: ${props.PHOTOTOUSE}.` : "",
    props?.buying_data_confidence ? `Buying data confidence: ${props.buying_data_confidence}.` : "",
    props?.buying_data_source ?? "Buying data is estimated from permit metadata and must be confirmed before purchase.",
  ].filter(Boolean);
}

function buildOpportunityBillboards(
  cluster: ScoredBoard[],
  opportunityScore: number,
): OpportunityBillboard[] {
  return [...cluster]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((board, index) => {
      const props = board.inventory?.properties;
      const location = cleanAddress(props?.record_name ?? board.address);
      const address = cleanAddress(props?.address ?? props?.record_name ?? board.address);
      const fitScore = Math.max(62, Math.min(99, Math.round(opportunityScore - index * 6 + board.matches.length)));
      const visibilityScore = Math.max(55, Math.min(96, fitScore - 4 + Math.min(6, board.matches.length)));
      const format = textOr(props?.record_type, "General Advertising Sign");
      const mediaType = textOr(props?.media_type, /digital/i.test(format) ? "Digital" : "Static");
      return {
        id: board.id,
        location,
        address,
        lat: board.lat,
        lng: board.lng,
        fitScore,
        visibility: visibilityLabel(visibilityScore),
        visibilityScore,
        dwellSeconds: Math.max(9, Math.min(28, Math.round(10 + visibilityScore / 7 + board.matches.length))),
        inventoryStatus: props?.record_status
          ? `SF GASP ${props.record_status}`
          : "SF GASP inventory; seller inquiry required",
        purchaseUrl: props?.acalink ?? googleMapsUrl(board.lat, board.lng),
        seller: textOr(
          props?.owner_seller,
          props?.planner_name ? `SF Planning record contact: ${props.planner_name}` : "Media owner confirmation required",
        ),
        format,
        dimensions: textOr(props?.dimensions, "Seller-provided"),
        facing: textOr(props?.facing, "Field verification required"),
        rateCard: textOr(props?.rate_card, "Rate card seller-confirmed"),
        estimatedCpm: textOr(props?.estimated_cpm, "Estimated CPM seller-confirmed"),
        availability: textOr(props?.availability, "Availability seller-confirmed"),
        lighting: textOr(props?.lighting, "Lighting seller-confirmed"),
        mediaType,
        restrictions: textOr(props?.restrictions, "Restrictions seller-confirmed"),
        bookingContact: textOr(props?.booking_contact, "Booking contact seller-confirmed"),
        details: boardDetails(board, board.matches.length),
      };
    });
}

function buildOpportunity(
  cluster: ScoredBoard[],
  brief: CompanyBrief,
  profile: IcpProfile,
  rank: number
): Opportunity {
  // Centroid weighted by score
  const totalScore = cluster.reduce((s, b) => s + b.score, 0);
  const centroid: LngLat = {
    lng: cluster.reduce((s, b) => s + b.lng * b.score, 0) / totalScore,
    lat: cluster.reduce((s, b) => s + b.lat * b.score, 0) / totalScore,
  };

  // Radius = max distance from centroid, clamped
  const maxDist = cluster.reduce(
    (mx, b) => Math.max(mx, haversineM(centroid.lat, centroid.lng, b.lat, b.lng)),
    150
  );
  const radiusM = Math.min(650, Math.max(300, maxDist + 80));

  const domCat = dominantCategory(cluster, profile);
  const typeLabel = TYPE_LABELS[domCat] ?? "Business";
  const kind = KIND_LABELS[domCat] ?? "Account concentration";

  // Use the most central billboard's address for naming
  const central = cluster.reduce((best, b) => {
    const d = haversineM(centroid.lat, centroid.lng, b.lat, b.lng);
    const bd = haversineM(centroid.lat, centroid.lng, best.lat, best.lng);
    return d < bd ? b : best;
  });
  const street = extractStreet(central.address) || areaFromPoint(centroid);

  const matches = topMatches(cluster);
  const reasons = topReasons(matches, `${typeLabel} concentration`);

  // Unique businesses across cluster
  const allBizNames = new Set<string>();
  for (const b of cluster) {
    for (const biz of b.businesses) allBizNames.add(biz.name);
  }
  const matchedNames = new Set(matches.map((m) => m.name));

  // Normalized score 0-100 (first cluster scores highest)
  const avgScore = totalScore / cluster.length;
  const normalizedScore = Math.round(Math.min(99, Math.max(52, 56 + Math.min(38, avgScore * 0.55) - rank * 2)));

  const timing = timingFromContext(brief.audience.contextWhenSeen);
  const audience = brief.audience.description;
  const companyName = brief.identity.companyName;
  const accountCount = Math.max(matchedNames.size, matches.length, Math.min(allBizNames.size, cluster.length));

  const title = buildClusterTitle(street, domCat, kind, profile);
  const icpSummary = `${accountCount} ICP-matched local signals around ${cluster.length} billboard${cluster.length > 1 ? "s" : ""}: ${reasons.join(", ")}.`;
  const icpCreativeAngle = `${brief.campaign.coreMessage.replace(/\.$/, "")} - seen daily by ${audience}.`;
  const icpFit = `${companyName} fit: ${reasons.join("; ")} near ${street}.`;
  return {
    id: `cluster-${rank}-${central.id}`,
    title,
    kind,
    area: street,
    timing,
    summary: icpSummary,
    accounts: accountCount,
    events: Math.max(0, 4 - rank),
    placements: cluster.length,
    score: normalizedScore,
    creativeAngle: icpCreativeAngle,
    icpFit,
    matchReasons: reasons,
    matchedBusinesses: matches.map((m) => ({
      name: m.name,
      type: m.type,
      reason: m.reasons[0] ?? `${typeLabel} signal`,
      website: m.website,
      lng: m.lng,
      lat: m.lat,
    })),
    billboards: buildOpportunityBillboards(cluster, normalizedScore),
    centroid,
    radiusM,
  };
}

// ─── route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let brief: CompanyBrief;
  try {
    brief = (await req.json()) as CompanyBrief;
    if (!brief?.identity?.industry) {
      return NextResponse.json({ error: "Invalid brief" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const profile = detectIcpProfile(brief);

  // Score all billboards
  const allBoards = Object.values(fiberData.billboards) as BillboardRecord[];
  const scored: ScoredBoard[] = allBoards
    .filter((b) => b.businesses.length > 0)
    .map((b) => {
      const scoredBoard = scoreBillboard(b, profile);
      const inventory = gaspInventoryById.get(b.record_id);
      return {
        id: b.record_id,
        lat: b.lat,
        lng: b.lng,
        score: scoredBoard.score,
        address: b.address || inventory?.properties?.record_name || inventory?.properties?.address || b.record_id,
        inventory,
        businesses: b.businesses,
        matches: scoredBoard.matches,
      };
    })
    .filter((b) => b.score >= 12 && b.matches.length > 0);

  // Cluster and take enough blobs to make the map feel populated without noise.
  const clusters = greedyCluster(scored, 380, 10).slice(0, 8);

  const opportunities: Opportunity[] = clusters.map((cluster, i) =>
    buildOpportunity(cluster, brief, profile, i)
  );

  return NextResponse.json({
    opportunities,
    relevantCats: profile.categories,
    roleSignals: profile.roleSignals,
  });
}
