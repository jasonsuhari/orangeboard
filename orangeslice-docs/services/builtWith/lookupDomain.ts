/** Credits: 75 (standard). */

/**
 * Get the full technology stack for a domain.
 * Returns all technologies detected on the website including:
 * - Analytics (Google Analytics, Mixpanel, etc.)
 * - CRM (Salesforce, HubSpot, etc.)
 * - E-commerce (Shopify, WooCommerce, etc.)
 * - Frameworks (React, Next.js, etc.)
 * - Hosting (AWS, Vercel, etc.)
 * - Marketing automation, CDNs, payment processors, and more
 *
 * Great for technographic targeting and competitive analysis.
 */
type lookupDomain = (params: {
   /** Root domain to look up (e.g., "stripe.com") */
   domain: string;
   /** Only return technologies that are currently live/active */
   liveOnly?: boolean;
}) => Promise<{
   /** Domain that was looked up */
   domain: string;
   /** Array of technologies detected */
   technologies: Array<{
      /** Technology name (e.g., "React", "Salesforce") */
      name: string;
      /** Technology category (e.g., "JavaScript Frameworks", "CRM") */
      category: string;
      /** Subcategory if available */
      tag?: string;
      /** Description of the technology */
      description?: string;
      /** Link to more info */
      link?: string;
      /** When this technology was first detected */
      firstDetected?: string;
      /** When this technology was last detected */
      lastDetected?: string;
   }>;
   /** Meta information about the domain */
   meta?: {
      /** Vertical/industry */
      vertical?: string;
      /** Social profile URLs */
      social?: string[];
      /** Company name if detected */
      companyName?: string;
      /** Telephones found */
      telephones?: string[];
      /** Emails found */
      emails?: string[];
      /** City */
      city?: string;
      /** State */
      state?: string;
      /** Country */
      country?: string;
   };
}>;
