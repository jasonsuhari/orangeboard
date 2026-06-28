import { fiberPost, type FiberCompanyResult } from "./_client";

export interface CompanySearchFilters {
  /** e.g. ["Software", "Financial Services", "Healthcare"] — see /v1/industries for full list */
  industries?: string[];
  employeeCount?: { min?: number; max?: number };
  /** ISO alpha-3 country codes e.g. ["USA", "GBR"] or regional groups ["NORTH_AMERICA"] */
  countries?: string[];
  /** Funding stages e.g. ["seed", "series_a", "series_b", "series_c"] */
  fundingStages?: string[];
  /** Total funding raised in USD */
  totalFundingUSD?: { min?: number; max?: number };
  /** Free-text keywords — all must appear */
  keywords?: string[];
  limit?: number;
}

export async function searchCompanies(filters: CompanySearchFilters): Promise<FiberCompanyResult[]> {
  const searchParams: Record<string, unknown> = {};

  if (filters.industries?.length) searchParams.industriesV2 = filters.industries;
  if (filters.countries?.length) searchParams.headquartersCountryCode = filters.countries;
  if (filters.fundingStages?.length) searchParams.stage = filters.fundingStages;
  if (filters.keywords?.length) searchParams.keywords = { containsAll: filters.keywords };

  if (filters.employeeCount) {
    searchParams.employeeCountV2 = {
      lowerBoundExclusive: filters.employeeCount.min,
      upperBoundInclusive: filters.employeeCount.max,
    };
  }

  if (filters.totalFundingUSD) {
    searchParams.totalFundingUSD = {
      lowerBoundExclusive: filters.totalFundingUSD.min,
      upperBoundInclusive: filters.totalFundingUSD.max,
    };
  }

  const data = await fiberPost<{ output?: { data?: FiberCompanyResult[] } }>(
    "/v1/company-search",
    { searchParams, limit: filters.limit ?? 10 }
  );

  return data.output?.data ?? [];
}

/** Convenience: find companies whose customer profile matches a billboard audience description */
export async function searchCompaniesByAudience(
  audienceDescription: string,
  limit = 10
): Promise<FiberCompanyResult[]> {
  const data = await fiberPost<{ output?: { data?: FiberCompanyResult[] } }>(
    "/v1/text-to-company-search",
    { text: audienceDescription, limit }
  );
  return data.output?.data ?? [];
}
