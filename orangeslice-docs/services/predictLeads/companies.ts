/**
 * Retrieve Companies
 * Returns a list of companies filtered by their location and size, ordered by last updated date. Note: This endpoint returns an estimated count of all results.
 * HTTP GET /discover/companies
 */
type companies = (params: {
  /** The response will include only companies located in the given country name or state name/abbreviation. */
  location: string;
  /** An array of one or more valid company sizes. */
  sizes: Array<"1" | "2-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1001-5000" | "5001-10000" | "10001+">;
  /** Page number of shown items. **NOTE**: If the parameter is not provided, the meta property `count` will be omitted from response for performance reasons. */
  page?: number;
  /** Limit the number of shown items per page. */
  limit?: number;
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