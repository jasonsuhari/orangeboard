/**
 * Retrieve a single Product by ID
 * Returns a single Product.
 * HTTP GET /products/{id}
 */
type product = (params: {
  /** Product's ID. */
  id: string;
}) => Promise<{
  data: Array<{
  id: string;
  type: "product";
  attributes: {
  name: string;
  sources: "menu" | "pricing";
  source_url: string;
  first_seen_at: string;
  last_seen_at: string;
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