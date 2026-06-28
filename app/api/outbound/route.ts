import { NextRequest, NextResponse } from "next/server";
import {
  matchBrandsToBillboard,
  type BillboardAudienceProfile,
} from "../../../hackathon-utils/pipelines/match-brands-to-billboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ─── request / response shapes ──────────────────────────────────────────────

interface OutboundRequest {
  companyName?: string;
  icp?: string;
  opportunity?: {
    title?: string;
    area?: string;
    kind?: string;
    accounts?: number;
    audienceIndustry?: string;
  };
  board?: {
    location?: string;
    address?: string;
    lat?: number;
    lng?: number;
    visibilityScore?: number;
    dwellSeconds?: number;
  };
  limit?: number;
  includePitch?: boolean;
}

/** Trimmed, JSON-safe row the Outbound Queue renders. */
export interface OutboundBrand {
  name: string;
  domain: string | null;
  industry: string | null;
  employeeCount: number | null;
  fundingSummary: string;
  hook: string;
  bestEmail: string | null;
  contact: { name: string | null; title: string | null; linkedinUrl: string | null } | null;
  pitch: { subjectLine: string; fullEmail: string } | null;
}

export interface OutboundResponse {
  configured: boolean;
  matched: OutboundBrand[];
  error?: string;
}

// ─── ICP → industry inference ───────────────────────────────────────────────
// searchCompaniesByICP does `industry ILIKE '%term%'`, so we need one keyword.

const INDUSTRY_KEYWORDS: Array<[string, string[]]> = [
  ["Financial Services", ["fintech", "finance", "bank", "payment", "lending", "insurance", "wealth"]],
  ["Software", ["saas", "software", "api", "developer", "platform", "cloud", "b2b"]],
  ["Hospital & Health Care", ["health", "medical", "clinic", "wellness", "therapy", "pharma"]],
  ["Marketing & Advertising", ["marketing", "advertising", "growth", "demand gen", "brand"]],
  ["Staffing & Recruiting", ["recruit", "talent", "staffing", "hiring", "people ops"]],
  ["Real Estate", ["real estate", "property", "realty", "leasing"]],
  ["Legal Services", ["legal", "law", "attorney", "compliance"]],
];

function inferIndustry(icp: string, fallback?: string): string {
  if (fallback?.trim()) return fallback;
  const lower = icp.toLowerCase();
  for (const [industry, terms] of INDUSTRY_KEYWORDS) {
    if (terms.some((t) => lower.includes(t))) return industry;
  }
  return "Software";
}

// A coarse foot-traffic estimate from the board's visibility + dwell, so the
// pitch copy has a concrete (if approximate) impressions number to lead with.
function estimateFootTraffic(visibilityScore = 75, dwellSeconds = 12): number {
  return Math.round(40 + visibilityScore * 0.8 + dwellSeconds * 2);
}

export async function POST(req: NextRequest) {
  let body: OutboundRequest;
  try {
    body = (await req.json()) as OutboundRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Keys are required for the live pipeline. Without them, report `configured:
  // false` so the UI keeps its staged/mock queue instead of erroring.
  if (!process.env.ORANGESLICE_API_KEY || !process.env.FIBER_API_KEY) {
    return NextResponse.json<OutboundResponse>({
      configured: false,
      matched: [],
      error: "ORANGESLICE_API_KEY and FIBER_API_KEY are required for live outbound.",
    });
  }

  const icp = body.icp ?? "";
  const opp = body.opportunity ?? {};
  const board = body.board ?? {};

  const profile: BillboardAudienceProfile = {
    location: board.address ?? board.location ?? `${opp.area ?? "San Francisco"}, San Francisco`,
    lat: board.lat ?? 37.7775,
    lng: board.lng ?? -122.3964,
    footTrafficPerHour: estimateFootTraffic(board.visibilityScore, board.dwellSeconds),
    audienceDescription: icp || "Scaling B2B operators in San Francisco",
    audienceIndustry: inferIndustry(icp, opp.audienceIndustry),
    city: "San Francisco",
    state: "California",
    predictedRoas: 3.8,
    effectiveCpm: 6.4,
  };

  try {
    const matched = await matchBrandsToBillboard(profile, {
      limit: body.limit ?? 3,
      includePitch: body.includePitch ?? true,
    });

    const rows: OutboundBrand[] = matched.map((m) => {
      const top = m.contacts[0] ?? null;
      return {
        name: m.company.name ?? "Unknown company",
        domain: m.company.domain,
        industry: m.company.industry,
        employeeCount: m.company.employee_count,
        fundingSummary: m.fundingSummary,
        hook: m.hook,
        bestEmail: m.bestEmail,
        contact: top
          ? { name: top.name, title: top.title, linkedinUrl: top.linkedin_url }
          : null,
        pitch: m.pitch ? { subjectLine: m.pitch.subjectLine, fullEmail: m.pitch.fullEmail } : null,
      };
    });

    return NextResponse.json<OutboundResponse>({ configured: true, matched: rows });
  } catch (err) {
    return NextResponse.json<OutboundResponse>(
      { configured: true, matched: [], error: (err as Error).message },
      { status: 502 },
    );
  }
}
