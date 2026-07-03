/* Shared opportunity-blob geometry — the irregular polygon "blobs" drawn on the
   sightline map and the /map onboarding step, plus the static fallback
   opportunities used when /api/opportunities is unavailable. */

import type { Opportunity } from "../api/opportunities/route";

export type Ring = [number, number][];
export type LngLat = { lng: number; lat: number };
export type OpportunityWithPolygon = Opportunity & { polygon: Ring };

export function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h / 0xffffffff;
}

export function offsetPoint(center: LngLat, distM: number, angleRad: number): [number, number] {
  const latDeg = distM / 111320;
  const lngDeg = distM / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return [
    center.lng + Math.sin(angleRad) * lngDeg,
    center.lat + Math.cos(angleRad) * latDeg,
  ];
}

export function buildIrregularPolygon(center: LngLat, baseRadiusM: number, seed: string, rays = 28): Ring {
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

export function withPolygons(raw: Opportunity[]): OpportunityWithPolygon[] {
  return raw.map((o) => ({ ...o, polygon: buildIrregularPolygon(o.centroid, o.radiusM, o.id) }));
}

/** Zoom level that frames a blob of the given radius (sightline focus behavior). */
export function focusZoom(radiusM: number): number {
  const radius = Math.max(260, radiusM);
  return Math.max(13.8, Math.min(15.35, 15.25 - Math.log2(radius / 320) * 0.62));
}

export const STATIC_OPPORTUNITY_FALLBACK: Opportunity[] = [
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
    icpFit: "Ramp fit: primary Tech & SaaS match; finance-ops buyer signal near 4th St.",
    matchReasons: ["primary Tech & SaaS match", "finance-ops buyer signal"],
    matchedBusinesses: [
      { name: "SaaS offices near Caltrain", type: "Software company", reason: "primary Tech & SaaS match" },
      { name: "Finance ops teams", type: "Corporate office", reason: "finance-ops buyer signal" },
    ],
    billboards: [],
    centroid: { lng: -122.3964, lat: 37.7775 },
    radiusM: 520,
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
    icpFit: "Ramp fit: event-week SaaS and finance-ops density near Moscone Center.",
    matchReasons: ["primary Tech & SaaS match", "finance-ops buyer signal"],
    matchedBusinesses: [
      { name: "Moscone SaaS attendees", type: "Software company", reason: "primary Tech & SaaS match" },
      { name: "Finance leaders", type: "Corporate office", reason: "finance-ops buyer signal" },
    ],
    billboards: [],
    centroid: { lng: -122.4019, lat: 37.7843 },
    radiusM: 480,
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
    icpFit: "Ramp fit: Tech & SaaS offices and B2B office context along Market St.",
    matchReasons: ["primary Tech & SaaS match", "B2B office/context signal"],
    matchedBusinesses: [
      { name: "Market St software offices", type: "Software company", reason: "primary Tech & SaaS match" },
      { name: "FiDi corporate offices", type: "Corporate office", reason: "B2B office/context signal" },
    ],
    billboards: [],
    centroid: { lng: -122.4000, lat: 37.7909 },
    radiusM: 420,
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
    icpFit: "Ramp fit: startup and hiring signals around the Mission corridor.",
    matchReasons: ["primary Tech & SaaS match", "people/talent buyer signal"],
    matchedBusinesses: [
      { name: "Mission startup offices", type: "Software company", reason: "primary Tech & SaaS match" },
      { name: "Hiring signal cluster", type: "Employment agency", reason: "people/talent buyer signal" },
    ],
    billboards: [],
    centroid: { lng: -122.4194, lat: 37.7599 },
    radiusM: 460,
  },
];

export const STATIC_OPPORTUNITIES: OpportunityWithPolygon[] = withPolygons(STATIC_OPPORTUNITY_FALLBACK);
