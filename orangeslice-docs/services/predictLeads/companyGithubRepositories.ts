/**
 * Retrieve company's Github Repositories
 * Returns a list of company's Github Repositories.
 * HTTP GET /companies/{company_id_or_domain}/github_repositories
 */
type companyGithubRepositories = (params: {
  /** Company's ID or domain. */
  company_id_or_domain: string;
  /** Only return `GithubRepositories` first seen after given date (ISO 8601). */
  first_seen_at_from?: string;
  /** Only return `GithubRepositories` first seen before given date (ISO 8601). */
  first_seen_at_until?: string;
  /** Page number of shown items. **NOTE**: If the parameter is not provided, the meta property `count` will be omitted from response for performance reasons. */
  page?: number;
  /** Limit the number of shown items per page. */
  limit?: number;
}) => Promise<{
  data: Array<{
  id: string;
  type: "github_repository";
  attributes: {
  url: string;
  description: string | null;
  first_seen_at: string;
};
  relationships: {
  company: {
  data: {
  id: string;
  type: "company";
};
};
  timeseries_datapoints: {
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
} | {
  attributes?: {
  data?: {
  forks: number;
  stars: number;
  watches: number;
  last_update_at: string;
};
};
}>;
  meta?: {
  schema_version: string;
  record_state: "active";
  count?: number;
};
}>;