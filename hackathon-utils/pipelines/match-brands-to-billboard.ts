import { searchCompaniesByICP, type OSCompanyRow } from "../orangeslice/company-search";
import { enrichCompanyExtended, formatFunding } from "../orangeslice/company-enrich";
import { findMarketingLeads, type DecisionMaker } from "../orangeslice/find-decision-makers";
import { draftOutreachPitch, generateBillboardHook, type BillboardContext } from "../orangeslice/draft-pitch";
import { getBestEmail } from "../fiber/contact-reveal";

export interface BillboardAudienceProfile {
  /** Human-readable location e.g. "Market St, Financial District, SF" */
  location: string;
  /** Lat/long for geo filtering */
  lat: number;
  lng: number;
  footTrafficPerHour: number;
  /** Plain-English audience description e.g. "25-40yo fintech professionals" */
  audienceDescription: string;
  /** Primary industry category of the audience */
  audienceIndustry: string;
  /** City for ICP matching */
  city: string;
  state: string;
  predictedRoas: number;
  effectiveCpm: number;
}

export interface MatchedBrand {
  company: OSCompanyRow;
  contacts: DecisionMaker[];
  bestEmail: string | null;
  hook: string;
  pitch: Awaited<ReturnType<typeof draftOutreachPitch>> | null;
  fundingSummary: string;
}

/**
 * Core Orangeboard pipeline: audience profile → matched brands + outreach.
 * Runs Fiber AI contact reveal in parallel with Orange Slice company + people lookup.
 */
export async function matchBrandsToBillboard(
  billboard: BillboardAudienceProfile,
  opts: { limit?: number; includePitch?: boolean } = {}
): Promise<MatchedBrand[]> {
  const limit = opts.limit ?? 5;
  const includePitch = opts.includePitch ?? true;

  // 1. Find companies whose ICP matches the billboard audience
  const companies = await searchCompaniesByICP({
    industry: billboard.audienceIndustry,
    city: billboard.city,
    state: billboard.state,
    employeeCount: { min: 20, max: 2000 },
    limit,
  });

  if (!companies.length) return [];

  // 2. For each company: enrich, find contacts, get email, draft pitch — all in parallel
  const billboardCtx: BillboardContext = {
    location: billboard.location,
    footTrafficPerHour: billboard.footTrafficPerHour,
    audienceProfile: billboard.audienceDescription,
    predictedRoas: billboard.predictedRoas,
    effectiveCpm: billboard.effectiveCpm,
  };

  const results = await Promise.all(
    companies.map(async (company): Promise<MatchedBrand> => {
      const linkedinUrl = company.linkedin_url;

      // Enrich + find contacts in parallel (contacts need linkedinUrl).
      // Both are external enrichments — degrade gracefully so one provider
      // failing (e.g. Fiber/funding lookup) doesn't drop the whole match.
      const [extended, contacts] = await Promise.all([
        company.domain || linkedinUrl
          ? enrichCompanyExtended({ url: linkedinUrl ?? undefined, domain: company.domain ?? undefined }).catch(() => null)
          : Promise.resolve(null),
        linkedinUrl ? findMarketingLeads(linkedinUrl, 2).catch(() => []) : Promise.resolve([]),
      ]);

      const extEnriched = extended as { crunchbase_funding?: Parameters<typeof formatFunding>[0] } | null;
      const fundingSummary = formatFunding(extEnriched?.crunchbase_funding);

      const companyCtx = {
        name: company.name ?? "Unknown",
        domain: company.domain ?? "",
        industry: company.industry,
        employeeCount: company.employee_count,
        fundingSummary,
        description: company.description,
      };

      // Get best email + pitch in parallel
      const topContact = contacts[0] ?? null;

      const [bestEmail, hook, pitch] = await Promise.all([
        // Fiber contact reveal is optional — never let it fail the match.
        topContact?.linkedin_url ? getBestEmail(topContact.linkedin_url).catch(() => null) : Promise.resolve(null),
        generateBillboardHook(billboardCtx, companyCtx.name, companyCtx.industry ?? billboard.audienceIndustry),
        includePitch && topContact
          ? draftOutreachPitch(billboardCtx, companyCtx, {
              name: topContact.name,
              title: topContact.title,
            })
          : Promise.resolve(null),
      ]);

      return { company, contacts, bestEmail, hook, pitch, fundingSummary };
    })
  );

  return results;
}
