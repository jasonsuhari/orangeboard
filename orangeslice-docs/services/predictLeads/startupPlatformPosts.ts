/**
 * Retrieve latest posts
 * Returns a list of latest posts on popular startup platforms by companies that are hiring or launching new products.
 * HTTP GET /discover/startup_platform_posts
 */
type startupPlatformPosts = (params: {
   /** Only return `StartupPlatformPosts` published after given date (ISO 8601). */
   published_at_from?: string;
   /** Only return `StartupPlatformPosts` published before given date (ISO 8601). */
   published_at_until?: string;
   /** Comma-separated (,) `StartupPlatformPost` post types. */
   post_types?: Array<"show_hn" | "job_hn">;
   /** Page number of shown items. **NOTE**: If the parameter is not provided, the meta property `count` will be omitted from response for performance reasons. */
   page?: number;
   /** Limit the number of shown items per page. */
   limit?: number;
}) => Promise<{
   data: Array<{
      id: string;
      type: "startup_platform_post";
      attributes: {
         published_at: string;
         post_type: "show_hn" | "job_hn";
         post_url: string;
         company_domain: string;
         company_name: string | null;
         fuzzy_match: boolean;
      };
   }>;
   meta?: {
      schema_version: string;
      record_state: "active";
      count?: number;
   };
}>;
