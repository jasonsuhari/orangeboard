/**
 * Retrieve News Events
 * Returns a list of News Events, optionally filtered by categories and company's location, ordered by updated date.
 * HTTP GET /discover/news_events
 */
type newsEvents = (params: {
  /** Comma-separated (,) `NewsEvent` categories. */
  categories?: Array<"acquires" | "merges_with" | "sells_assets_to" | "signs_new_client" | "files_suit_against" | "has_issues_with" | "closes_offices_in" | "decreases_headcount_by" | "attends_event" | "expands_facilities" | "expands_offices_in" | "expands_offices_to" | "increases_headcount_by" | "opens_new_location" | "goes_public" | "invests_into" | "invests_into_assets" | "receives_financing" | "hires" | "leaves" | "promotes" | "retires_from" | "integrates_with" | "is_developing" | "launches" | "partners_with" | "receives_award" | "recognized_as" | "identified_as_competitor_of">;
  /** The response will include only companies located in the given country name or state name/abbreviation. */
  company_location?: string;
  /** Page number of shown items. **NOTE**: If the parameter is not provided, the meta property `count` will be omitted from response for performance reasons. */
  page?: number;
  /** Limit the number of shown items per page. */
  limit?: number;
}) => Promise<{
  data: Array<{
  id: string;
  type: "news_event";
  attributes: {
  summary: string;
  category: "acquires" | "merges_with" | "sells_assets_to" | "signs_new_client" | "files_suit_against" | "has_issues_with" | "closes_offices_in" | "decreases_headcount_by" | "attends_event" | "expands_facilities" | "expands_offices_in" | "expands_offices_to" | "increases_headcount_by" | "opens_new_location" | "goes_public" | "invests_into" | "invests_into_assets" | "receives_financing" | "hires" | "leaves" | "promotes" | "retires_from" | "integrates_with" | "is_developing" | "launches" | "partners_with" | "receives_award" | "recognized_as" | "identified_as_competitor_of";
  found_at: string;
  confidence: number;
  article_sentence: string;
  planning: boolean;
  amount: string | null;
  amount_normalized: number | null;
  assets: string | null;
  assets_tags: Array<string>;
  award: string | null;
  contact: string | null;
  event: string | null;
  effective_date: string | null;
  division: string | null;
  financing_type: string | null;
  financing_type_normalized: "pre_angel" | "angel_plus" | "angel_plus_plus" | "angel" | "angel_1" | "angel_2" | "angel_3" | "pre_seed" | "seed_plus" | "seed_plus_plus" | "seed" | "seed_1" | "seed_2" | "seed_3" | "pre_series_a" | "series_a_plus" | "series_a_plus_plus" | "series_a" | "series_a1" | "series_a2" | "series_a3" | "pre_series_b" | "series_b_plus" | "series_b_plus_plus" | "series_b" | "series_b1" | "series_b2" | "series_b3" | "pre_series_c" | "series_c_plus" | "series_c_plus_plus" | "series_c" | "series_c1" | "series_c2" | "series_c3" | "pre_series_d" | "series_d_plus" | "series_d_plus_plus" | "series_d" | "series_d1" | "series_d2" | "series_d3" | "pre_series_e" | "series_e_plus" | "series_e_plus_plus" | "series_e" | "series_e1" | "series_e2" | "series_e3" | "pre_series_f" | "series_f_plus" | "series_f_plus_plus" | "series_f" | "series_f1" | "series_f2" | "series_f3" | "pre_series_g" | "series_g_plus" | "series_g_plus_plus" | "series_g" | "series_g1" | "series_g2" | "series_g3" | "pre_series_h" | "series_h_plus" | "series_h_plus_plus" | "series_h" | "series_h1" | "series_h2" | "series_h3" | "pre_series_i" | "series_i_plus" | "series_i_plus_plus" | "series_i" | "series_i1" | "series_i2" | "series_i3" | "pre_series_j" | "series_j_plus" | "series_j_plus_plus" | "series_j" | "series_j1" | "series_j2" | "series_j3" | "pre_angel_bridge" | "angel_plus_bridge" | "angel_plus_plus_bridge" | "angel_bridge" | "angel_1_bridge" | "angel_2_bridge" | "angel_3_bridge" | "pre_seed_bridge" | "seed_plus_bridge" | "seed_plus_plus_bridge" | "seed_bridge" | "seed_1_bridge" | "seed_2_bridge" | "seed_3_bridge" | "pre_series_a_bridge" | "series_a_plus_bridge" | "series_a_plus_plus_bridge" | "series_a_bridge" | "series_a1_bridge" | "series_a2_bridge" | "series_a3_bridge" | "pre_series_b_bridge" | "series_b_plus_bridge" | "series_b_plus_plus_bridge" | "series_b_bridge" | "series_b1_bridge" | "series_b2_bridge" | "series_b3_bridge" | "pre_series_c_bridge" | "series_c_plus_bridge" | "series_c_plus_plus_bridge" | "series_c_bridge" | "series_c1_bridge" | "series_c2_bridge" | "series_c3_bridge" | "pre_series_d_bridge" | "series_d_plus_bridge" | "series_d_plus_plus_bridge" | "series_d_bridge" | "series_d1_bridge" | "series_d2_bridge" | "series_d3_bridge" | "pre_series_e_bridge" | "series_e_plus_bridge" | "series_e_plus_plus_bridge" | "series_e_bridge" | "series_e1_bridge" | "series_e2_bridge" | "series_e3_bridge" | null;
  financing_type_tags: Array<string>;
  headcount: number | null;
  job_title: string | null;
  job_title_tags: Array<string>;
  location: string | null;
  location_data: Array<{
  city: unknown;
  state: unknown;
  zip_code: unknown;
  country: unknown;
  region: unknown;
  continent: unknown;
  fuzzy_match: unknown;
}>;
  product: string | null;
  product_data: {
  full_text: string | null;
  name: string | null;
  release_type: string | null;
  release_version: string | null;
  fuzzy_match: boolean | null;
};
  product_tags: Array<string>;
  recognition: string | null;
  vulnerability: string | null;
};
  relationships: {
  company1?: {
  data: {
  id: string;
  type: "company";
};
};
  company2?: {
  data: {
  id: string;
  type: "company";
};
};
  most_relevant_source: {
  data: {
  id: string;
  type: "news_article";
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
  type: "news_article";
  attributes: {
  url: string;
  title: string;
  author: string | null;
  image_url: string | null;
  published_at: string;
  body: string;
};
}>;
  meta?: {
  schema_version: string;
  record_state: "active";
  count?: number;
};
}>;