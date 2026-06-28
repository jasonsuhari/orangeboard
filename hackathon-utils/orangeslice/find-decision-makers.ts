import { getServices } from "./_client";

export interface DecisionMaker {
  name: string | null;
  title: string | null;
  linkedin_url: string | null;
  headline: string | null;
}

const MARKETING_TITLE_FILTER = `
  pos.title ~* '\\mCMO\\M|\\mVP\\M|Chief Marketing|Head of Marketing|Head of Growth|Director of Marketing|Director of Growth|Growth|Brand|Demand Generation|Performance Marketing'
`.trim();

const C_SUITE_FILTER = `
  pos.title ~* '\\mCEO\\M|\\mCOO\\M|\\mCFO\\M|\\mCMO\\M|Chief|President|Founder|Co-Founder'
`.trim();

/** Find marketing / growth decision makers at a company via LinkedIn */
export async function findMarketingLeads(
  companyLinkedinUrl: string,
  limit = 5
): Promise<DecisionMaker[]> {
  const s = getServices();
  const { employees } = await s.company.getEmployeesFromLinkedin({
    linkedinUrl: companyLinkedinUrl,
    titleSqlFilter: MARKETING_TITLE_FILTER,
    limit,
  });
  return (employees ?? []).map((e) => ({
    name: e.lp_formatted_name,
    title: e.lp_title,
    linkedin_url: e.lp_public_profile_url,
    headline: e.lp_headline,
  }));
}

/** Find C-suite at a company */
export async function findCSuite(
  companyLinkedinUrl: string,
  limit = 5
): Promise<DecisionMaker[]> {
  const s = getServices();
  const { employees } = await s.company.getEmployeesFromLinkedin({
    linkedinUrl: companyLinkedinUrl,
    titleSqlFilter: C_SUITE_FILTER,
    limit,
  });
  return (employees ?? []).map((e) => ({
    name: e.lp_formatted_name,
    title: e.lp_title,
    linkedin_url: e.lp_public_profile_url,
    headline: e.lp_headline,
  }));
}

/** Find both marketing leads and C-suite in parallel, deduplicated */
export async function findBestContacts(
  companyLinkedinUrl: string
): Promise<DecisionMaker[]> {
  const [marketing, cSuite] = await Promise.all([
    findMarketingLeads(companyLinkedinUrl, 3),
    findCSuite(companyLinkedinUrl, 2),
  ]);

  const seen = new Set<string>();
  return [...marketing, ...cSuite].filter((p) => {
    const key = p.linkedin_url ?? p.name ?? "";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
