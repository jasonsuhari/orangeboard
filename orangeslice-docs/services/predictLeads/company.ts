/**
 * Retrieve Company
 * Returns Company.
 * HTTP GET /companies/{id_or_domain}
 */
type company = (params: {
  /** Company's ID or domain. */
  id_or_domain: string;
}) => Promise<{
  data: Array<{
  id: string;
  type: "company";
  attributes: {
  domain: string;
  company_name: string | null;
  ticker: string | null;
  friendly_company_name: string;
  meta_title: string;
  meta_description: string;
  description: string | null;
  description_short: string | null;
  language: string;
  location: string;
  location_data: Array<{
  city: unknown;
  state: unknown;
  zip_code: unknown;
  country: unknown;
  region: unknown;
  continent: unknown;
  fuzzy_match: unknown;
}>;
};
  relationships: {
  redirects_to: {
  data: {
  id: unknown;
  type: unknown;
} | null;
  meta: {
  reason: "acquisition_merger" | "locality" | "rebranding";
};
};
  parent_company: {
  data: {
  id: unknown;
  type: unknown;
} | null;
};
  subsidiary_companies: {
  data: Array<{
  id: unknown;
  type: unknown;
}>;
};
  lookalike_companies: {
  data: Array<{
  id: unknown;
  type: unknown;
}>;
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