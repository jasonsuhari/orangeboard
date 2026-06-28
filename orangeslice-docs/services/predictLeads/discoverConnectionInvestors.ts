/**
 * Retrieve Portfolio Companies
 * Returns the Portfolio Companies found on the portfolio pages of thousands of VCs, accelerators, and incubators, as a list of Connections categorized as `investor`, ordered by the `first_seen_at`, descending.
 * HTTP GET /discover/portfolio_companies/connections
 */
type discoverConnectionInvestors = (params: {
  /** Only return `TechnologyDetections` first seen after given date (ISO 8601). */
  first_seen_at_from?: string;
  /** Only return `TechnologyDetections` first seen before given date (ISO 8601). */
  first_seen_at_until?: string;
  /** Only return `TechnologyDetections` last seen after given date (ISO 8601). */
  last_seen_at_from?: string;
  /** Only return `TechnologyDetections` last seen before given date (ISO 8601). */
  last_seen_at_until?: string;
  /** Page number of shown items. **NOTE**: If the parameter is not provided, the meta property `count` will be omitted from response for performance reasons. */
  page?: number;
  /** Limit the number of shown items per page. */
  limit?: number;
}) => Promise<{
  data: Array<{
  id: string;
  type: "connection";
  attributes: {
  category: "partner" | "vendor" | "integration" | "investor" | "parent" | "rebranding" | "published_in" | "badge" | "other";
  source_category: "undefined" | "partner_page" | "vendor_page" | "integration_page" | "investor_page" | "about_page" | "parent_page" | "case_study_page" | "testimonial_page" | "manual_input" | "domain_redirect" | "same_subpage" | "partner_section" | "vendor_section" | "integration_section" | "investor_section" | "parent_section" | "case_study_section" | "testimonial_section" | "social_section" | "published_in_section" | "vendor_inverse_section" | "investor_inverse_section" | "parent_inverse_section" | "footer" | "header" | "vendor_inverse_page" | "cookie_section" | "badge_section";
  source_url: string | null;
  individual_source_url: string | null;
  context: string | null;
  first_seen_at: string;
  last_seen_at: string;
};
  relationships: {
  company1: {
  data: {
  id: string;
  type: "company";
};
};
  company2: {
  data: {
  id: string;
  type: "company";
};
};
  technology: {
  data: {
  id: unknown;
  type: unknown;
} | null;
};
};
}>;
  included: Array<Record<string, unknown>>;
  meta?: {
  schema_version: string;
  record_state: "active";
  count?: number;
};
}>;