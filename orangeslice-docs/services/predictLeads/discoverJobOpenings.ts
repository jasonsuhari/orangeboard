/**
 * Retrieve a list of Job Openings
 * Returns a list of Job Openings filtered by a given profession (e.g. "Sales Engineers" or "Marketing Managers") using O*NET occupation codes and/or location of the company. Note: This endpoint returns an estimated count of all results.
 * HTTP GET /discover/job_openings
 */
type discoverJobOpenings = (params: {
  /** Comma-separated O\*NET codes to filter by, such as "17-2071.00" for "Electrical Engineers" or "15-1254.00" for "Web Developers". For full list of possible codes see: https://www.onetonline.org/find/all */
  onet_codes?: string;
  /** The response will include only companies located in the given country name or state name/abbreviation. */
  location?: string;
  /** Page number of shown items. **NOTE**: If the parameter is not provided, the meta property `count` will be omitted from response for performance reasons. */
  page?: number;
  /** Limit the number of shown items per page. */
  limit?: number;
}) => Promise<{
  data: Array<{
  id: string;
  type: "job_opening";
  attributes: {
  title: string;
  description: string | null;
  url: string;
  first_seen_at: string;
  last_seen_at: string;
  last_processed_at: string;
  contract_types: Array<Record<string, unknown>>;
  categories: Array<"administration" | "consulting" | "data_analysis" | "design" | "directors" | "education" | "engineering" | "finance" | "healthcare_services" | "human_resources" | "information_technology" | "internship" | "legal" | "management" | "marketing" | "military_and_protective_services" | "operations" | "purchasing" | "product_management" | "quality_assurance" | "real_estate" | "research" | "sales" | "software_development" | "support" | "manual_work" | "food">;
  onet_data: {
  code: string | null;
  family: string | null;
  occupation_name: string | null;
};
  posted_at: string | null;
  recruiter_data: {
  name: string | null;
  title: string | null;
  contact: string | null;
};
  salary: string | null;
  salary_data: {
  salary_low: number | null;
  salary_high: number | null;
  salary_currency: string | null;
  salary_low_usd: number | null;
  salary_high_usd: number | null;
  salary_time_unit: "hour" | "day" | "week" | "month" | "year" | null;
};
  seniority: "not_set" | "founder" | "c_level" | "partner" | "president" | "vice_president" | "head" | "director" | "manager" | "mid_senior" | "junior" | "non_manager";
  status: "closed" | null;
  language: string | null;
  location: string | null;
  location_data: Array<{
  city: unknown;
  state: unknown;
  zip_code: unknown;
  country: unknown;
  region: unknown;
  continent: unknown;
  fuzzy_match: unknown;
}>;
  tags: Array<Record<string, unknown>>;
};
  relationships: {
  company: {
  data: {
  id: string;
  type: "company";
};
};
};
}>;
  included: Array<{
  id: string;
  type: "company";
  attributes: {
  domain: string;
  company_name: string | null;
  ticker: string | null;
};
}>;
  meta?: {
  schema_version: string;
  record_state: "active";
  count?: number;
};
}>;