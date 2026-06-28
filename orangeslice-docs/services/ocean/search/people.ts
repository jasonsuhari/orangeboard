interface OceanCompaniesFilters {
  /** Array of domains to find lookalike companies for (e.g., ["stripe.com", "shopify.com"]) */
  lookalikeDomains?: string[];
  /** Minimum similarity score (0-1) for lookalike matching */
  minScore?: number;
  /** Company size ranges to filter by */
  companySizes?: Array<"0-1" | "2-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1001-5000" | "5001-10000" | "10001+">;
  /** Two-letter country codes to filter by (e.g., ["us", "gb"]) */
  countries?: string[];
  /** Industry categories to filter by */
  industries?: string[];
  /** Technology names to filter by (e.g., ["React", "Salesforce"]) */
  technologies?: string[];
  /** Technology category names to filter by */
  technologyCategories?: string[];
  /** Keywords to search for */
  keywords?: string[];
  /** Revenue ranges to filter by (e.g., ["0-1M", "1M-10M"]) */
  revenueRanges?: string[];
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

interface OceanPersonResult {
  /** Ocean.io person ID */
  id: string;
  /** Company domain */
  domain?: string;
  /** Full name */
  name?: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Two-letter country code */
  country?: string;
  /** State/region */
  state?: string;
  /** Location string */
  location?: string;
  /** LinkedIn profile URL */
  linkedinUrl?: string;
  /** Seniority levels (e.g., ["C-Level", "Manager"]) */
  seniorities?: string[];
  /** Departments (e.g., ["Engineering", "Management"]) */
  departments?: string[];
  /** Profile photo URL */
  photo?: string;
  /** Job title in original language */
  jobTitle?: string;
  /** Job title translated to English */
  jobTitleEnglish?: string;
  /** Current job description */
  currentJobDescription?: string;
  /** Work experience history */
  experiences?: Array<{
    dateFrom?: string;
    dateTo?: string;
    description?: string;
    domain?: string;
    jobTitle?: string;
  }>;
  /** Profile summary */
  summary?: string;
  /** Skills */
  skills?: string[];
  /** Phone numbers with verification status */
  phone?: { numbers?: string[]; status?: string };
  /** Email with verification status */
  email?: { address?: string; status?: string };
  /** Last update timestamp */
  updatedAt?: string;
  /** Company info snapshot */
  company?: { companySize?: string; logo?: string; name?: string };
}

/**
 * Search for people at companies using Ocean.io.
 * Combine companiesFilters (to target companies) with peopleFilters (to target roles/departments).
 * Can request verified emails and phone numbers via enableEmailSearch / enablePhoneSearch.
 * Returns up to `size` people per call (default 10). Use `searchAfter` for pagination.
 */
type people = (params: {
    /** Filters to target companies (lookalike domains, size, country, etc.) */
    companiesFilters?: OceanCompaniesFilters;
    /** Filters to target people (seniority, department, title keywords, etc.) */
    peopleFilters?: OceanPeopleFilters;
    /** Number of results to return (default 10, max 100) */
    size?: number;
    /** Pagination offset */
    from?: number;
    /** Cursor token from a previous response for efficient pagination */
    searchAfter?: string;
    /** Request verified email addresses (uses additional credits) */
    enableEmailSearch?: boolean;
    /** Request verified phone numbers (uses additional credits) */
    enablePhoneSearch?: boolean;
  }) => Promise<{
  /** Total matching people */
  total: number;
  /** Cursor for next page (pass as searchAfter) */
  searchAfter?: string;
  /** Matched people */
  people: OceanPersonResult[];
  /** Domains that were redirected to canonical domains */
  redirectMap?: Record<string, string>;
}>;