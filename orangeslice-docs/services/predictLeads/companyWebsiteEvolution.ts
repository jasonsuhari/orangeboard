/**
 * Retrieve company's Website Evolution
 * Returns a list of company's Website Evolution.
 * HTTP GET /companies/{company_id_or_domain}/website_evolution
 */
type companyWebsiteEvolution = (params: {
  /** Company's ID or domain. */
  company_id_or_domain: string;
  /** Only return `Subpages` first seen after given date (ISO 8601). */
  first_seen_at_from?: string;
  /** Only return `Subpages` first seen before given date (ISO 8601). */
  first_seen_at_until?: string;
  /** Page number of shown items. **NOTE**: If the parameter is not provided, the meta property `count` will be omitted from response for performance reasons. */
  page?: number;
  /** Limit the number of shown items per page. */
  limit?: number;
}) => Promise<{
  data: Array<{
  id: string;
  type: "subpage";
  attributes: {
  category: string;
  url: string;
  text_content: string | null;
  first_seen_at: string;
  last_seen_at: string;
  last_extraction_states: Array<{
  attributes: unknown;
}>;
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