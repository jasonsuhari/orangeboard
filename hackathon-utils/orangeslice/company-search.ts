import { getServices } from "./_client";

export interface OSCompanyRow {
  id: number;
  name: string | null;
  slug: string | null;
  domain: string | null;
  website: string | null;
  description: string | null;
  industry: string | null;
  employee_count: number | null;
  linkedin_url: string | null;
  locality: string | null;
  region: string | null;
  country_code: string | null;
  // from `company` join
  employee_growth_12mo?: number | null;
  employee_growth_03mo?: number | null;
}

/** Raw SQL over linkedin_company + company tables. Most flexible option. */
export async function searchCompaniesSQL(sql: string): Promise<OSCompanyRow[]> {
  const s = getServices();
  const { rows } = await s.company.linkedin.search({ sql });
  return rows as unknown as OSCompanyRow[];
}

export interface ICPFilters {
  /** e.g. "Financial Services", "Software", "Technology" — mapped to industry_code when known */
  industry?: string;
  /** e.g. "San Francisco", "New York", "Los Angeles" */
  city?: string;
  /** US state e.g. "California" */
  state?: string;
  employeeCount?: { min?: number; max?: number };
  limit?: number;
}

// LinkedIn `industry_code` values for the ICP buckets we can map confidently.
// (Codes from the orangeslice search docs.) Unknown industries fall back to a
// geo + size query — ILIKE on the industry/description text is a banned seq-scan.
const INDUSTRY_CODES: Record<string, number[]> = {
  software: [4],
  saas: [4],
  technology: [4, 6, 96],
  tech: [4, 6, 96],
  "it services": [6],
  "it consulting": [96],
  consulting: [96],
};

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function industryCodesFor(industry?: string): number[] | null {
  if (!industry) return null;
  const lower = industry.toLowerCase();
  for (const [key, codes] of Object.entries(INDUSTRY_CODES)) {
    if (lower.includes(key)) return codes;
  }
  return null;
}

/**
 * Find companies whose ICP matches a billboard's audience profile.
 *
 * Uses only the documented fast single-table path on `linkedin_company`
 * (indexed filters, no banned ORDER BY / ILIKE-on-rare-terms). Results are
 * sorted by employee_count in application code, since `ORDER BY employee_count`
 * is a documented full-table-sort timeout.
 */
export async function searchCompaniesByICP(filters: ICPFilters): Promise<OSCompanyRow[]> {
  const clauses: string[] = ["lc.country_code = 'US'"];

  const industryCodes = industryCodesFor(filters.industry);
  if (industryCodes) {
    clauses.push(`lc.industry_code IN (${industryCodes.join(", ")})`);
  }
  if (filters.city) {
    clauses.push(`lc.locality ILIKE '%${escapeSqlLiteral(filters.city)}%'`);
  }
  if (filters.state) {
    clauses.push(`lc.region = '${escapeSqlLiteral(filters.state)}'`);
  }
  if (filters.employeeCount?.min) {
    clauses.push(`lc.employee_count >= ${Math.floor(filters.employeeCount.min)}`);
  }
  if (filters.employeeCount?.max) {
    clauses.push(`lc.employee_count <= ${Math.floor(filters.employeeCount.max)}`);
  }

  const limit = filters.limit ?? 10;

  const sql = `
    SELECT
      lc.id,
      lc.company_name AS name,
      lc.universal_name AS slug,
      lc.domain, lc.website, lc.description, lc.industry,
      lc.employee_count, lc.locality, lc.region, lc.country_code,
      'https://www.linkedin.com/company/' || lc.universal_name AS linkedin_url
    FROM linkedin_company lc
    WHERE ${clauses.join(" AND ")}
    LIMIT ${limit}
  `.trim();

  const rows = await searchCompaniesSQL(sql);
  // ORDER BY employee_count is banned (20s) — sort the small result set here.
  return rows.sort((a, b) => (b.employee_count ?? 0) - (a.employee_count ?? 0));
}

/** Search Crunchbase for startups by funding stage and industry */
export async function searchStartupsByFunding(opts: {
  industry?: string;
  minFundingUSD?: number;
  maxFundingUSD?: number;
  limit?: number;
}): Promise<Record<string, unknown>[]> {
  const s = getServices();
  const clauses: string[] = [];
  if (opts.industry) clauses.push(`industry ILIKE '%${opts.industry}%'`);
  if (opts.minFundingUSD) clauses.push(`total_funding_usd >= ${opts.minFundingUSD}`);
  if (opts.maxFundingUSD) clauses.push(`total_funding_usd <= ${opts.maxFundingUSD}`);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  return s.crunchbase.search({
    sql: `SELECT * FROM public.crunchbase_scraper_lean ${where} LIMIT ${opts.limit ?? 10}`,
  });
}
