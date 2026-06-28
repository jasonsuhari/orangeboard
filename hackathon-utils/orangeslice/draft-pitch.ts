import { getServices } from "./_client";

export interface BillboardContext {
  location: string;           // e.g. "Market St, Financial District, SF"
  footTrafficPerHour: number; // e.g. 94
  audienceProfile: string;    // e.g. "25-40yo tech/finance professionals"
  predictedRoas: number;      // e.g. 3.8
  effectiveCpm: number;       // e.g. 6.40 (USD)
}

export interface CompanyContext {
  name: string;
  domain: string;
  industry: string | null;
  employeeCount: number | null;
  fundingSummary: string;
  description: string | null;
}

export interface ContactContext {
  name: string | null;
  title: string | null;
}

export interface OutreachPitch {
  subjectLine: string;
  openingHook: string;
  valueProposition: string;
  callToAction: string;
  fullEmail: string;
}

const pitchSchema = {
  type: "object",
  properties: {
    subjectLine: { type: "string" },
    openingHook: { type: "string" },
    valueProposition: { type: "string" },
    callToAction: { type: "string" },
    fullEmail: { type: "string" },
  },
  required: ["subjectLine", "openingHook", "valueProposition", "callToAction", "fullEmail"],
} satisfies Record<string, unknown>;

export async function draftOutreachPitch(
  billboard: BillboardContext,
  company: CompanyContext,
  contact: ContactContext
): Promise<OutreachPitch> {
  const s = getServices();

  const { object } = await s.ai.generateObject<OutreachPitch>({
    prompt: `
You are a senior growth marketer writing a cold outreach pitch to sell a premium billboard placement.

## Billboard
- Location: ${billboard.location}
- Foot traffic: ${billboard.footTrafficPerHour} qualified impressions/hour
- Audience: ${billboard.audienceProfile}
- Predicted ROAS: ${billboard.predictedRoas}× (vs Meta avg 3.1×)
- Effective CPM: $${billboard.effectiveCpm} (22% below Meta)

## Brand being pitched
- Company: ${company.name} (${company.domain})
- Industry: ${company.industry ?? "unknown"}
- Size: ${company.employeeCount ?? "unknown"} employees
- Funding: ${company.fundingSummary}
- About: ${company.description ?? "N/A"}

## Contact
- Name: ${contact.name ?? "the marketing team"}
- Title: ${contact.title ?? "unknown"}

Write a concise, confident cold email. No fluff. Lead with the ROAS angle.
Reference their specific industry and why this location's audience is their ICP.
Subject line should be specific, not generic.
Full email should be under 150 words.
`.trim(),
    schema: pitchSchema,
  });

  return object;
}

/** Quick one-liner hook for in-app UI display (no contact needed) */
export async function generateBillboardHook(
  billboard: BillboardContext,
  companyName: string,
  industry: string
): Promise<string> {
  const s = getServices();

  const { object } = await s.ai.generateObject<{ hook: string }>({
    prompt: `
Write a 1-sentence pitch hook for why ${companyName} (${industry}) should buy a billboard at ${billboard.location}.
The billboard reaches ${billboard.footTrafficPerHour} ${billboard.audienceProfile} per hour.
Predicted ROAS: ${billboard.predictedRoas}×. Be specific and punchy. Under 25 words.
`.trim(),
    schema: { type: "object", properties: { hook: { type: "string" } }, required: ["hook"] },
  });

  return object.hook;
}
