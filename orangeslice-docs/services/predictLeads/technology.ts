/**
 * Retrieve a single Technology by ID or fuzzy name
 * Returns a single Technology.
 * HTTP GET /technologies/{id_or_fuzzy_name}
 */
type technology = (params: {
  /** Technology's ID or fuzzy name. */
  id_or_fuzzy_name: string;
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