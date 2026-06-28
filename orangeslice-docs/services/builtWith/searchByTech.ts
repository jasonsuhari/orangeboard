/** Credits: 100 (standard). Charged per call regardless of result count. */

/**
 * Find companies/domains that use a specific technology.
 * The reverse lookup - input a tech, get list of companies using it.
 *
 * Great for:
 * - Lead generation ("find all companies using Salesforce")
 * - Competitive analysis ("who uses our competitor's product")
 *
 * ⚠️ LIMITATIONS:
 * - **Case-sensitive**: Use exact names like "Hubspot" not "HubSpot", "Salesforce" not "salesforce"
 * - **Ultra-popular techs blocked**: WordPress, React, Google Analytics have 3M+ sites and require enterprise tier
 * - **Works well for**: B2B SaaS (Salesforce, Hubspot, Stripe, Zendesk, Intercom, Shopify, etc.)
 *
 * TIP: Use `lookupDomain` on a site using the tech to find the exact technology name.
 */
type searchByTech = (params: {
   /** Technology name to search for (e.g., "Salesforce", "React", "Shopify") */
   tech: string;
   /** Include metadata like emails, phones, social links, addresses */
   includeMeta?: boolean;
   /** Filter by country using ISO 3166-1 alpha-2 codes (e.g., "US", "GB", "US,CA,GB") */
   country?: string;
   /** Pagination offset from previous response's nextOffset */
   offset?: string;
   /** Get sites using the tech since a date (e.g., "30 Days Ago", "Last January", "2024-01-01") */
   since?: string;
}) => Promise<{
   /** Offset for next page of results. "END" means no more results */
   nextOffset: string;
   /** Array of domains using this technology */
   results: Array<{
      /** Domain name */
      domain: string;
      /** When the technology was first detected */
      firstDetected?: string;
      /** When the technology was last detected */
      lastDetected?: string;
      /** Company name if available (requires includeMeta) */
      companyName?: string;
      /** Emails found (requires includeMeta) */
      emails?: string[];
      /** Phone numbers found (requires includeMeta) */
      telephones?: string[];
      /** Social profile URLs (requires includeMeta) */
      social?: string[];
      /** City (requires includeMeta) */
      city?: string;
      /** State (requires includeMeta) */
      state?: string;
      /** Country (requires includeMeta) */
      country?: string;
   }>;
}>;
