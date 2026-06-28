/**
 * Retrieve company's Financing Events
 * Returns a list of company's Financing Events.
 * HTTP GET /companies/{company_id_or_domain}/financing_events
 */
type companyFinancingEvents = (params: {
  /** Company's ID or domain. */
  company_id_or_domain: string;
  /** Only return `FinancingEvents` first seen after given date (ISO 8601). */
  first_seen_at_from?: string;
  /** Only return `FinancingEvents` first seen before given date (ISO 8601). */
  first_seen_at_until?: string;
  /** Page number of shown items. **NOTE**: If the parameter is not provided, the meta property `count` will be omitted from response for performance reasons. */
  page?: number;
  /** Limit the number of shown items per page. */
  limit?: number;
}) => Promise<{
  data: Array<{
  id: string;
  type: "financing_event";
  attributes: {
  effective_date: string | null;
  found_at: string;
  categories: Array<"series" | "pre_angel" | "angel_plus" | "angel_plus_plus" | "angel" | "angel_1" | "angel_2" | "angel_3" | "pre_seed" | "seed_plus" | "seed_plus_plus" | "seed" | "seed_1" | "seed_2" | "seed_3" | "pre_series_a" | "series_a_plus" | "series_a_plus_plus" | "series_a" | "series_a1" | "series_a2" | "series_a3" | "pre_series_b" | "series_b_plus" | "series_b_plus_plus" | "series_b" | "series_b1" | "series_b2" | "series_b3" | "pre_series_c" | "series_c_plus" | "series_c_plus_plus" | "series_c" | "series_c1" | "series_c2" | "series_c3" | "pre_series_d" | "series_d_plus" | "series_d_plus_plus" | "series_d" | "series_d1" | "series_d2" | "series_d3" | "pre_series_e" | "series_e_plus" | "series_e_plus_plus" | "series_e" | "series_e1" | "series_e2" | "series_e3" | "pre_series_f" | "series_f_plus" | "series_f_plus_plus" | "series_f" | "series_f1" | "series_f2" | "series_f3" | "pre_series_g" | "series_g_plus" | "series_g_plus_plus" | "series_g" | "series_g1" | "series_g2" | "series_g3" | "pre_series_h" | "series_h_plus" | "series_h_plus_plus" | "series_h" | "series_h1" | "series_h2" | "series_h3" | "pre_series_i" | "series_i_plus" | "series_i_plus_plus" | "series_i" | "series_i1" | "series_i2" | "series_i3" | "pre_series_j" | "series_j_plus" | "series_j_plus_plus" | "series_j" | "series_j1" | "series_j2" | "series_j3" | "pre_angel_bridge" | "angel_plus_bridge" | "angel_plus_plus_bridge" | "angel_bridge" | "angel_1_bridge" | "angel_2_bridge" | "angel_3_bridge" | "pre_seed_bridge" | "seed_plus_bridge" | "seed_plus_plus_bridge" | "seed_bridge" | "seed_1_bridge" | "seed_2_bridge" | "seed_3_bridge" | "pre_series_a_bridge" | "series_a_plus_bridge" | "series_a_plus_plus_bridge" | "series_a_bridge" | "series_a1_bridge" | "series_a2_bridge" | "series_a3_bridge" | "pre_series_b_bridge" | "series_b_plus_bridge" | "series_b_plus_plus_bridge" | "series_b_bridge" | "series_b1_bridge" | "series_b2_bridge" | "series_b3_bridge" | "pre_series_c_bridge" | "series_c_plus_bridge" | "series_c_plus_plus_bridge" | "series_c_bridge" | "series_c1_bridge" | "series_c2_bridge" | "series_c3_bridge" | "pre_series_d_bridge" | "series_d_plus_bridge" | "series_d_plus_plus_bridge" | "series_d_bridge" | "series_d1_bridge" | "series_d2_bridge" | "series_d3_bridge" | "pre_series_e_bridge" | "series_e_plus_bridge" | "series_e_plus_plus_bridge" | "series_e_bridge" | "series_e1_bridge" | "series_e2_bridge" | "series_e3_bridge" | "corporate_round" | "venture" | "venture_debt" | "product_crowdfunding" | "equity_crowdfunding" | "debt" | "convertible_note" | "safe" | "pipe" | "ipo" | "ico" | "ido" | "post_ipo_debt" | "post_ipo_equity" | "post_ipo_secondary" | "private_equity" | "secondary_transaction" | "donation" | "grant" | "subsidy" | "public_funding" | "government_assistance" | "other">;
  financing_type: string | null;
  financing_type_normalized: "pre_angel" | "angel_plus" | "angel_plus_plus" | "angel" | "angel_1" | "angel_2" | "angel_3" | "pre_seed" | "seed_plus" | "seed_plus_plus" | "seed" | "seed_1" | "seed_2" | "seed_3" | "pre_series_a" | "series_a_plus" | "series_a_plus_plus" | "series_a" | "series_a1" | "series_a2" | "series_a3" | "pre_series_b" | "series_b_plus" | "series_b_plus_plus" | "series_b" | "series_b1" | "series_b2" | "series_b3" | "pre_series_c" | "series_c_plus" | "series_c_plus_plus" | "series_c" | "series_c1" | "series_c2" | "series_c3" | "pre_series_d" | "series_d_plus" | "series_d_plus_plus" | "series_d" | "series_d1" | "series_d2" | "series_d3" | "pre_series_e" | "series_e_plus" | "series_e_plus_plus" | "series_e" | "series_e1" | "series_e2" | "series_e3" | "pre_series_f" | "series_f_plus" | "series_f_plus_plus" | "series_f" | "series_f1" | "series_f2" | "series_f3" | "pre_series_g" | "series_g_plus" | "series_g_plus_plus" | "series_g" | "series_g1" | "series_g2" | "series_g3" | "pre_series_h" | "series_h_plus" | "series_h_plus_plus" | "series_h" | "series_h1" | "series_h2" | "series_h3" | "pre_series_i" | "series_i_plus" | "series_i_plus_plus" | "series_i" | "series_i1" | "series_i2" | "series_i3" | "pre_series_j" | "series_j_plus" | "series_j_plus_plus" | "series_j" | "series_j1" | "series_j2" | "series_j3" | "pre_angel_bridge" | "angel_plus_bridge" | "angel_plus_plus_bridge" | "angel_bridge" | "angel_1_bridge" | "angel_2_bridge" | "angel_3_bridge" | "pre_seed_bridge" | "seed_plus_bridge" | "seed_plus_plus_bridge" | "seed_bridge" | "seed_1_bridge" | "seed_2_bridge" | "seed_3_bridge" | "pre_series_a_bridge" | "series_a_plus_bridge" | "series_a_plus_plus_bridge" | "series_a_bridge" | "series_a1_bridge" | "series_a2_bridge" | "series_a3_bridge" | "pre_series_b_bridge" | "series_b_plus_bridge" | "series_b_plus_plus_bridge" | "series_b_bridge" | "series_b1_bridge" | "series_b2_bridge" | "series_b3_bridge" | "pre_series_c_bridge" | "series_c_plus_bridge" | "series_c_plus_plus_bridge" | "series_c_bridge" | "series_c1_bridge" | "series_c2_bridge" | "series_c3_bridge" | "pre_series_d_bridge" | "series_d_plus_bridge" | "series_d_plus_plus_bridge" | "series_d_bridge" | "series_d1_bridge" | "series_d2_bridge" | "series_d3_bridge" | "pre_series_e_bridge" | "series_e_plus_bridge" | "series_e_plus_plus_bridge" | "series_e_bridge" | "series_e1_bridge" | "series_e2_bridge" | "series_e3_bridge" | null;
  amount: string | null;
  amount_normalized: number | null;
  source_urls: Array<string>;
};
  relationships: {
  company: {
  data: {
  id: string;
  type: "company";
};
};
  investors: {
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