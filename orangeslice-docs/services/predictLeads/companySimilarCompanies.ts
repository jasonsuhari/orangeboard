/**
 * Retrieve company's Similar Companies
 * Returns a list of company's Similar Companies.
 * HTTP GET /companies/{company_id_or_domain}/similar_companies
 */
type companySimilarCompanies = (params: {
  /** Company's ID or domain. */
  company_id_or_domain: string;
  /** Limit the number of shown items per page. */
  limit?: number;
}) => Promise<{
  data: Array<{
  id: string;
  type: "company_similarity";
  attributes: {
  score: number;
  position: number | null;
  reason: string | null;
  refreshed_at: string;
};
  relationships: {
  company: {
  data: {
  id: string;
  type: "company";
};
};
  similar_company: {
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