/**
 * Retrieve followed companies
 * Returns followed companies.
 * HTTP GET /followings
 */
type followedCompanies = (params: {
  /** Page number of shown items. **NOTE**: If the parameter is not provided, the meta property `count` will be omitted from response for performance reasons. */
  page?: number;
  /** Limit the number of shown items per page. */
  limit?: number;
}) => Promise<{
  data: Array<{
  domain: string;
  custom_company_identifier?: string;
}>;
}>;