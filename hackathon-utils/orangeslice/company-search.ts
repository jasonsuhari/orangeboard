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
  return rows as OSCompanyRow[];
}

export interface ICPFilters {
  /** e.g. "Financial Services", "Consumer Goods", "Technology" */
  industry?: string;
  /** e.g. "San Francisco", "New York", "Los Angeles" */
  city?: string;
  /** US state e.g. "California" */
  state?: string;
  employeeCount?: { min?: number; max?: number };
  /** Minimum YoY growth ratio — e.g. 1.1 = 10% growth */
  minGrowthYoY?: number;
  limit?: number;
}

/** Find companies whose ICP matches a billboard's audience profile */
export async function searchCompaniesByICP(filters: ICPFilters): Promise<OSCompanyRow[]> {
  const clauses: string[] = [];

  if (filters.industry) {
    clauses.push(`lc.industry ILIKE '%${filters.industry}%'`);
  }
  if (filters.city) {
    clauses.push(`lc.locality ILIKE '%${filters.city}%'`);
  }
  if (filters.state) {
    clauses.push(`co.region ILIKE '%${filters.state}%'`);
  }
  if (filters.employeeCount?.min) {
    clauses.push(`co.employee_count >= ${filters.employeeCount.min}`);
  }
  if (filters.employeeCount?.max) {
    clauses.push(`co.employee_count <= ${filters.employeeCount.max}`);
  }
  if (filters.minGrowthYoY) {
    clauses.push(`co.employee_growth_12mo >= ${filters.minGrowthYoY}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filters.limit ?? 10;

  const sql = `
    SELECT
      lc.id, lc.name, lc.slug, lc.domain, lc.website, lc.description,
      lc.industry, lc.employee_count, lc.linkedin_url, lc.locality,
      lc.region, lc.country_code,
      co.employee_growth_12mo, co.employee_growth_03mo
    FROM linkedin_company lc
    LEFT JOIN company co ON co.linkedin_id = lc.id
    ${where}
    ORDER BY co.employee_count DESC NULLS LAST
    LIMIT ${limit}
  `.trim();

  return searchCompaniesSQL(sql);
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

  const { rows } = await s.crunchbase.search({
    sql: `SELECT * FROM public.crunchbase_scraper_lean ${where} LIMIT ${opts.limit ?? 10}`,
  });
  return rows as Record<string, unknown>[];
}
