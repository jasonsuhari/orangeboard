/**
 * Retrieve all tracked Technologies
 * Returns a list of all tracked Technologies.
 * HTTP GET /technologies
 */
type technologies = (params: {
  /** Filter results based on Technology's fuzzy name. */
  fuzzy_name?: string;
  /** Order of `TechnologiesDatasets`. */
  order_by?: "created_at_asc" | "created_at_desc" | "fuzzy_score_desc";
  /** Page number of shown items. **NOTE**: If the parameter is not provided, the meta property `count` will be omitted from response for performance reasons. */
  page?: number;
  /** Limit the number of shown items per page. */
  limit?: number;
}) => Promise<{
  data: Array<{
  id: string;
  type: "technology";
  attributes: {
  name: string;
  description: string | null;
  categories: Array<string>;
  parent_categories: Array<"Accounting and Finance" | "Advertising" | "Audio, Video, Graphics" | "Communication and Collaboration" | "Customer Service" | "Data Management" | "DevOps" | "E-Commerce" | "Human Resources" | "Intelligence and Analytics" | "IT Infrastructure" | "Marketing" | "Operations" | "Programming" | "Sales" | "Security" | "Software Development" | "Web Tools and Plugins" | "Hardware" | "Certificates">;
  domain: string | null;
  url: string | null;
  pricing_data: {
  min_usd: number | null;
  max_usd: number | null;
  average_spend: number | null;
  interval: string | null;
  tags: Array<"poa" | "b2b" | "enterprise" | "free" | "freemium" | "high" | "low" | "mid" | "onetime" | "payg" | "recurring" | "trial" | "b2c">;
};
  created_at: string;
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