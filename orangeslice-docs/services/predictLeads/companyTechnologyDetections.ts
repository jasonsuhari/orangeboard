/**
 * Retrieve Technologies used by specific Company
 * Returns Technologies used by a specific Company as a list of Technology Detections.
 * HTTP GET /companies/{company_id_or_domain}/technology_detections
 */
type companyTechnologyDetections = (params: {
  /** Company's ID or domain. */
  company_id_or_domain: string;
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
  type: "technology_detection";
  attributes: {
  first_seen_at: string;
  last_seen_at: string;
  behind_firewall: boolean;
  score: number;
};
  relationships: {
  company: {
  data: {
  id: string;
  type: "company";
};
};
  seen_on_job_openings: {
  data: Array<{
  id: unknown;
  type: unknown;
}>;
};
  seen_on_subpages: {
  data: Array<{
  id: unknown;
  type: unknown;
}>;
};
  seen_on_dns_records: {
  data: Array<{
  id: unknown;
  type: unknown;
}>;
};
  seen_on_connection: {
  data: {
  id: string;
  type: "connection";
};
};
  technology: {
  data: {
  id: string;
  type: "technology";
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
} | {
  id: string;
  type: "technology";
  attributes: {
  name: string;
};
} | {
  id: string;
  type: "detection_on_subpage";
  attributes: {
  first_seen_at: string;
  last_seen_at: string;
  subpage_url: string;
};
} | {
  id: string;
  type: "job_opening";
  attributes: {
  first_seen_at: string;
  last_seen_at: string;
  url: string;
};
} | {
  id: string;
  type: "dns_record";
  attributes: {
  first_seen_at: string;
  last_seen_at: string;
  record_type: "TXT" | "MX" | "NS" | "CNAME" | "SOA_MNAME" | "SOA_RNAME";
};
} | {
  id: string;
  type: "connection";
  attributes: {
  first_seen_at: string;
  last_seen_at: string;
  source_url: string | null;
};
}>;
  meta?: {
  schema_version: string;
  record_state: "active";
  count?: number;
};
}>;