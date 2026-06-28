interface OceanCompaniesFilters {
   /** Array of domains to find lookalike companies for (e.g., ["stripe.com", "shopify.com"]) */
   lookalikeDomains?: string[];
   /** Company size ranges to filter by */
   companySizes?: Array<
      "0-1" | "2-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1001-5000" | "5001-10000" | "10001+"
   >;
   /** Two-letter country codes to filter by (e.g., ["us", "gb"]) */
   countries?: string[];
   /** Industry names to filter by */
   industries?: string[];
   /** Filter for e-commerce companies */
   ecommerce?: boolean;
}

interface OceanPeopleFilters {
   /** Seniority levels to filter by (e.g., ["C-Level", "VP", "Director", "Manager"]) */
   seniorities?: string[];
   /** Departments to filter by (e.g., ["Engineering", "Sales", "Marketing"]) */
   departments?: string[];
   /** Job title keywords to search for */
   jobTitleKeywords?: string[];
   /** Two-letter country codes to filter by */
   countries?: string[];
   /** Array of Ocean.io people IDs to find lookalikes for */
   lookalikePeopleIds?: string[];
}

interface OceanCompanyResult {
   /** Company domain */
   domain: string;
   /** Company name */
   name?: string;
   /** Legal company name */
   legalName?: string;
   /** Company description */
   description?: string;
   /** Two-letter country codes where the company operates */
   countries?: string[];
   /** Primary country code */
   primaryCountry?: string;
   /** Company size range (e.g., "51-200") */
   companySize?: string;
   /** Industry categories */
   industryCategories?: string[];
   /** Industries */
   industries?: string[];
   /** LinkedIn industry classification */
   linkedinIndustry?: string;
   /** Whether the company is an e-commerce business */
   ecommerce?: boolean;
   /** Company keywords */
   keywords?: string[];
   /** Ocean.io employee count estimate */
   employeeCountOcean?: number;
   /** LinkedIn employee count */
   employeeCountLinkedin?: number;
   /** Revenue range (e.g., "1M-10M") */
   revenue?: string;
   /** Year founded */
   yearFounded?: number;
   /** Company email addresses */
   emails?: string[];
   /** Phone numbers with country and primary flag */
   phones?: Array<{ country?: string; number: string; primary?: boolean }>;
   /** Company logo URL */
   logo?: string;
   /** Technologies used */
   technologies?: string[];
   /** Technology categories */
   technologyCategories?: string[];
   /** Company website root URL */
   rootUrl?: string;
   /** Social media profiles */
   medias?: Record<string, { url?: string; handle?: string; name?: string }>;
   /** Office locations */
   locations?: Array<{
      primary?: boolean;
      latitude?: number;
      longitude?: number;
      country?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
      streetAddress?: string;
      state?: string;
   }>;
   /** Department sizes */
   departmentSizes?: Array<{ department: string; size: number }>;
   /** Headcount growth metrics */
   headcountGrowth?: {
      threeMonths?: number;
      threeMonthsPercentage?: number;
      sixMonths?: number;
      sixMonthsPercentage?: number;
      twelveMonths?: number;
      twelveMonthsPercentage?: number;
   };
   /** Last update timestamp */
   updatedAt?: string;
}

/**
 * Search for lookalike companies using Ocean.io.
 * Provide seed domains via companiesFilters.lookalikeDomains to find similar companies.
 * Verified v3 filters: companySizes, countries, industries, ecommerce, and top-level peopleFilters.
 * Use `searchAfter` for pagination. Do not send `from`, `includeDomains`, `excludeDomains`, or `minScore` because Ocean v3 rejects them with 422 errors.
 */
type companies = (params: {
   /** Filters for company search (lookalike domains, size, country, industry, ecommerce) */
   companiesFilters?: OceanCompaniesFilters;
   /** Optional people filters. Returns companies that have at least one matching person. */
   peopleFilters?: OceanPeopleFilters;
   /** Number of results to return (default 10, max 100) */
   size?: number;
   /** Cursor token from a previous response for efficient pagination */
   searchAfter?: string;
}) => Promise<{
   /** Ocean.io status detail (typically "OK") */
   detail?: string;
   /** Total matching companies */
   total: number;
   /** Cursor for next page (pass as searchAfter) */
   searchAfter?: string;
   /** Matched companies with relevance scores */
   companies: Array<{
      company: OceanCompanyResult;
      /** Relevance grade (A = best match) */
      relevance?: string;
   }>;
   /** Domains that were redirected to canonical domains */
   redirectMap?: Record<string, string>;
}>;
