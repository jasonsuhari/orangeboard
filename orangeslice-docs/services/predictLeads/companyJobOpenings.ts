/**
 * Retrieve company's Job Openings
 * Returns a list of company's Job Openings.
 *
 * Use this as a prospecting/enrichment signal, not as source-of-truth validation
 * that a known company is currently hiring. For current validation, prefer the
 *
 * company's official careers page / ATS via services.company.findCareersPage and
 * services.company.scrapeCareersPage.
 * HTTP GET /companies/{company_id_or_domain}/job_openings
 */
type companyJobOpenings = (params: {
   /** Company's ID or domain. */
   company_id_or_domain: string;
   /** Set to true if you'd like to receive JobOpenings that are not closed, have last_seen_at more recent than 5 days and were found in the last year. */
   active_only?: boolean;
   /** Similar to `active_only`, but without considering `last_seen_at` timestamp. */
   not_closed?: boolean;
   /** Only return `JobOpenings` first seen after given date (ISO 8601). */
   first_seen_at_from?: string;
   /** Only return `JobOpenings` first seen before given date (ISO 8601). */
   first_seen_at_until?: string;
   /** Only return `JobOpenings` last seen after given date (ISO 8601). */
   last_seen_at_from?: string;
   /** Only return `JobOpenings` last seen before given date (ISO 8601). */
   last_seen_at_until?: string;
   /** Only return JobOpenings that have description. */
   with_description_only?: boolean;
   /** Only return JobOpenings that have location. */
   with_location_only?: boolean;
   /** Comma-separated (,) `JobOpening` categories. */
   categories?: Array<
      | "administration"
      | "consulting"
      | "data_analysis"
      | "design"
      | "directors"
      | "education"
      | "engineering"
      | "finance"
      | "healthcare_services"
      | "human_resources"
      | "information_technology"
      | "internship"
      | "legal"
      | "management"
      | "marketing"
      | "military_and_protective_services"
      | "operations"
      | "purchasing"
      | "product_management"
      | "quality_assurance"
      | "real_estate"
      | "research"
      | "sales"
      | "software_development"
      | "support"
      | "manual_work"
      | "food"
   >;
   /** Page number of shown items. **NOTE**: If the parameter is not provided, the meta property `count` will be omitted from response for performance reasons. */
   page?: number;
   /** Limit the number of shown items per page. */
   limit?: number;
}) => Promise<{
   data: Array<{
      id: string;
      type: "job_opening";
      attributes: {
         title: string;
         description: string | null;
         url: string;
         first_seen_at: string;
         last_seen_at: string;
         last_processed_at: string;
         contract_types: Array<Record<string, unknown>>;
         categories: Array<
            | "administration"
            | "consulting"
            | "data_analysis"
            | "design"
            | "directors"
            | "education"
            | "engineering"
            | "finance"
            | "healthcare_services"
            | "human_resources"
            | "information_technology"
            | "internship"
            | "legal"
            | "management"
            | "marketing"
            | "military_and_protective_services"
            | "operations"
            | "purchasing"
            | "product_management"
            | "quality_assurance"
            | "real_estate"
            | "research"
            | "sales"
            | "software_development"
            | "support"
            | "manual_work"
            | "food"
         >;
         onet_data: {
            code: string | null;
            family: string | null;
            occupation_name: string | null;
         };
         posted_at: string | null;
         recruiter_data: {
            name: string | null;
            title: string | null;
            contact: string | null;
         };
         salary: string | null;
         salary_data: {
            salary_low: number | null;
            salary_high: number | null;
            salary_currency: string | null;
            salary_low_usd: number | null;
            salary_high_usd: number | null;
            salary_time_unit: "hour" | "day" | "week" | "month" | "year" | null;
         };
         seniority:
            | "not_set"
            | "founder"
            | "c_level"
            | "partner"
            | "president"
            | "vice_president"
            | "head"
            | "director"
            | "manager"
            | "mid_senior"
            | "junior"
            | "non_manager";
         status: "closed" | null;
         language: string | null;
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
         tags: Array<Record<string, unknown>>;
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
